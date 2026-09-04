let presChannel=null,chatChannel=null,mpChannel=null,chatCon=null,presenciaState={};
function iniciarPresencia(){
  if(presChannel)sb.removeChannel(presChannel);
  presChannel=sb.channel('presencia',{config:{presence:{key:usuario.id}}});
  presChannel.on('presence',{event:'sync'},()=>{presenciaState=presChannel.presenceState();});
  presChannel.subscribe(s=>{if(s==='SUBSCRIBED')presChannel.track({uid:usuario.id});});
  if(chatChannel)sb.removeChannel(chatChannel);
  chatChannel=sb.channel('chat-typing');
  chatChannel.on('broadcast',{event:'typing'},p=>{
    if(p.payload.destino===usuario.id&&chatCon===p.payload.de){
      const el=$('#chat-escribiendo');if(el){el.textContent='✍️ escribiendo…';clearTimeout(window._ty);window._ty=setTimeout(()=>el.textContent='',2500);}
    }
  }).subscribe();
}
function estaOnline(uid){return Object.keys(presenciaState||{}).includes(uid);}
function iniciarChatRealtime(){
  if(mpChannel)sb.removeChannel(mpChannel);
  mpChannel=sb.channel('rt-mp')
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'mensajes_privados',filter:`receptor=eq.${usuario.id}`},p=>{
      if(chatCon===p.new.emisor){appendMsg(p.new);marcarLeidos(chatCon);}
      renderChats();
    }).subscribe();
}
function detenerChatRealtime(){if(mpChannel){sb.removeChannel(mpChannel);mpChannel=null;}}
async function renderChats(){
  const miembros=lastPers.length?lastPers:(await sb.from('perfiles_publicos').select('*')).data||[];
  if(!lastPers.length)lastPers=miembros;
  const {data:msgs}=await sb.from('mensajes_privados').select('*').or(`emisor.eq.${usuario.id},receptor.eq.${usuario.id}`).order('creado_en',{ascending:false}).limit(200);
  const ult={};(msgs||[]).forEach(m=>{const otro=m.emisor===usuario.id?m.receptor:m.emisor;if(!ult[otro])ult[otro]=m;});
  const noLeidos={};(msgs||[]).forEach(m=>{if(m.receptor===usuario.id&&!m.leido)noLeidos[m.emisor]=(noLeidos[m.emisor]||0)+1;});
  $('#chat-lista').innerHTML='<h3 style="margin-bottom:10px;color:var(--neon)">💬 Mensajes</h3>'+miembros.filter(p=>p.id!==usuario.id).map(p=>`
    <div class="chat-item ${chatCon===p.id?'act':''}" onclick="abrirChatCon('${p.id}')">
      <img class="foto-mini" src="${esc(p.foto_url)||AVATAR}">
      <div style="flex:1"><b>${esc(p.criadero||p.nombre||'')}</b><div class="detalle">${ult[p.id]?esc(ult[p.id].texto).slice(0,30):'Nueva conversación'}</div></div>
      <div style="text-align:right"><span class="dot ${estaOnline(p.id)?'on':''}"></span>${noLeidos[p.id]?`<div class="cuenta">${noLeidos[p.id]}</div>`:''}</div>
    </div>`).join('')||'<div class="detalle">Sin miembros aún.</div>';
  if(chatCon)renderVentana(chatCon);
}
async function abrirChatCon(otro){chatCon=otro;await renderChats();marcarLeidos(otro);}
async function renderVentana(otro){
  const p=lastPers.find(x=>x.id===otro)||{};
  const {data:msgs}=await sb.from('mensajes_privados').select('*').or(`and(emisor.eq.${usuario.id},receptor.eq.${otro}),and(emisor.eq.${otro},receptor.eq.${usuario.id})`).order('creado_en');
  $('#chat-ventana').innerHTML=`
    <div style="display:flex;gap:10px;align-items:center;border-bottom:1px solid var(--borde);padding-bottom:10px;margin-bottom:10px">
      <img class="foto-mini" src="${esc(p.foto_url)||AVATAR}"><div><b>${esc(p.criadero||p.nombre||'')}</b><div class="detalle" id="chat-escribiendo">${estaOnline(otro)?'🟢 En línea':''}</div></div></div>
    <div class="chat-msgs" id="chat-msgs">${(msgs||[]).map(m=>burbuja(m)).join('')||'<div class="detalle" style="text-align:center">Escribe el primer mensaje 👋</div>'}</div>
    <div style="display:flex;gap:8px;margin-top:10px">
      <input id="chat-input" placeholder="Escribe tu mensaje…" onkeyup="enviarTyping('${otro}')">
      <button class="btn btn-prim" onclick="enviarMsg()">➤</button></div>`;
  const sc=$('#chat-msgs');sc.scrollTop=sc.scrollHeight;
  $('#chat-input').addEventListener('keydown',e=>{if(e.key==='Enter')enviarMsg();});
}
function burbuja(m){return `<div class="burbuja ${m.emisor===usuario.id?'mia':'otra'}">${esc(m.texto)}<div class="detalle" style="font-size:.68rem">${fechaTS(m.creado_en)}</div></div>`;}
function appendMsg(m){const sc=$('#chat-msgs');if(!sc)return;sc.insertAdjacentHTML('beforeend',burbuja(m));sc.scrollTop=sc.scrollHeight;}
async function marcarLeidos(otro){await sb.from('mensajes_privados').update({leido:true}).eq('receptor',usuario.id).eq('emisor',otro).eq('leido',false);}
async function enviarMsg(){
  const inp=$('#chat-input'),txt=inp.value.trim();if(!txt||!chatCon)return;
  const {data}=await sb.from('mensajes_privados').insert({emisor:usuario.id,receptor:chatCon,texto:txt}).select().single();
  if(data)appendMsg(data);
  inp.value='';
}
let _tyT=null;
function enviarTyping(dest){
  clearTimeout(_tyT);_tyT=setTimeout(()=>{
    if(chatChannel)chatChannel.send({type:'broadcast',event:'typing',payload:{de:usuario.id,destino:dest}});
  },600);
}
