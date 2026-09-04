function setComTab(t){comTab=t;renderComunidad();}
function textoConMenciones(txt){
  let h=esc(txt);
  (lastPers||[]).forEach(p=>{const tag=p.username||p.criadero||p.nombre;if(tag)h=h.replaceAll('@'+tag,`<span class="mencion">@${esc(tag)}</span>`);});
  return h;
}
function mencionesDe(txt){return (lastPers||[]).filter(p=>{const t=p.username||p.criadero||p.nombre;return t&&txt.includes('@'+t);}).map(p=>p.id);}
function adjuntarMenciones(taId,listId){
  const ta=$('#'+taId);if(!ta)return;
  ta.addEventListener('input',()=>{
    const v=ta.value,m=v.match(/@([\w.-]{0,20})$/),box=$('#'+listId);
    if(!m){box.style.display='none';box.innerHTML='';return;}
    const q=m[1].toLowerCase();
    const opts=lastPers.filter(p=>(p.username||p.criadero||p.nombre||'').toLowerCase().includes(q)).slice(0,5);
    box.innerHTML=opts.map(p=>`<div class="m-item" data-tag="@${esc(p.username||p.criadero||p.nombre)}">${esc(p.username||p.criadero||p.nombre)}</div>`).join('');
    box.style.display=opts.length?'block':'none';
    box.querySelectorAll('.m-item').forEach(el=>el.onclick=()=>{ta.value=v.replace(/@([\w.-]{0,20})$/,el.dataset.tag+' ');box.style.display='none';ta.focus();});
  });
}
let replyA=null;
function responderA(id,autor){replyA={id,autor};$('#reply-info').style.display='block';$('#reply-autor').textContent=autor;}
function cancelarReply(){replyA=null;$('#reply-info').style.display='none';}
document.addEventListener('touchstart',e=>{const c=e.target.closest('.coment');if(!c||!c.dataset.id)return;window._press=setTimeout(()=>responderA(c.dataset.id,c.dataset.autor),500);});
document.addEventListener('touchend',()=>clearTimeout(window._press));
document.addEventListener('touchmove',()=>clearTimeout(window._press));

async function renderComunidad(){
  const cont=$('#comunidad-cont');
  if(!['admin','activo','prueba'].includes(estadoUsuario())){cont.innerHTML='<div class="vacio">🔒 Solo usuarios con suscripción activa.</div>';return;}
  if(!puedeUsarComunidad()){
    if(perfil.verificado!==true&&perfil.role!=='admin'){
      const v=verifPropia;
      cont.innerHTML=`<div class="panel" style="max-width:600px;margin:0 auto;text-align:center">
        <h3>🪪 Verificación para entrar a la comunidad</h3>
        <p class="detalle" style="margin-bottom:14px">Envía foto de tu cédula, tu teléfono y completa la verificación por llamada de WhatsApp.</p>
        <div class="campo"><label>Tu teléfono (WhatsApp)</label><input id="v-tel" value="${esc(v?.telefono||'')}" placeholder="+58 412..."></div>
        <div class="campo"><label>Foto de tu cédula</label><input type="file" id="v-cedula" accept="image/*"></div>
        <button class="btn btn-prim" onclick="enviarVerificacion()">📤 Enviar y solicitar llamada</button>
        <div style="margin-top:14px">${v?`<span class="badge ${v.estado==='verificado'?'badge-activo':v.estado==='rechazado'?'badge-vencido':'badge-pendiente'}">${v.estado}</span>`:''}</div>
        <a class="btn btn-sec" style="margin-top:12px" target="_blank" href="${waLink('Hola, quiero verificar mi cuenta para la comunidad.')}">💬 Abrir WhatsApp</a></div>`;
      return;
    }
    cont.innerHTML=`<div class="vacio">🔒 La comunidad es exclusiva para suscripciones de pago activas. ${perfil.es_prueba?'Tu cuenta es de prueba.':'Contacta al administrador.'}</div>`;
    return;
  }
  const [{data:posts},{data:pers},{data:coms}]=await Promise.all([
    sb.from('social_posts').select('*').order('creado_en',{ascending:false}).limit(60),
    sb.from('perfiles_publicos').select('*'),
    sb.from('social_comentarios').select('*').order('creado_en')]);
  lastPers=pers||[];
  const mapa=Object.fromEntries(lastPers.map(p=>[p.id,p]));
  const tabs=`<div class="com-tabs">
    <button class="chip ${comTab==='feed'?'activa':''}" onclick="setComTab('feed')">💬 Feed</button>
    <button class="chip ${comTab==='miembros'?'activa':''}" onclick="setComTab('miembros')">👥 Miembros (${lastPers.length})</button></div>`;
  if(comTab==='miembros'){
    cont.innerHTML=tabs+`<div class="miembros-grid">`+lastPers.map(p=>`
      <div class="miembro-card glass">
        <img src="${esc(p.foto_url)||AVATAR}" class="foto-miembro">
        <b>${esc(p.criadero||p.nombre||'Criador')}</b>
        <span class="detalle"><span class="dot ${estaOnline(p.id)?'on':''}"></span> 📍 ${esc(p.ciudad||p.pais||'')}</span>
        ${p.instagram?`<span class="detalle">📸 ${esc(p.instagram)}</span>`:''}
        <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center"><button class="btn btn-prim" onclick="openMiembro('${p.id}')">Ver perfil</button><button class="btn btn-sec" onclick="abrirChatCon('${p.id}')">💬</button></div>
      </div>`).join('')+`</div>`;
    return;
  }
  cont.innerHTML=tabs+`<div class="panel" style="position:relative"><div style="display:flex;gap:10px">
    <img class="foto-mini" src="${esc(perfil.foto_url)||AVATAR}">
    <div style="flex:1">
      <select id="post-tipo" style="margin-bottom:8px"><option value="post">💬 Compartir</option><option value="venta">🏷️ Venta de animales</option></select>
      <textarea id="post-texto" rows="2" placeholder="Comparte con la comunidad… usa @ para etiquetar"></textarea>
      <div class="m-list" id="post-ment" style="display:none"></div>
      <div style="display:flex;gap:8px;margin-top:8px;align-items:center">
        <label class="btn btn-sec">📷<input type="file" id="post-file" accept="image/*" style="display:none"></label>
        <img id="post-prev" style="height:40px;border-radius:8px;display:none">
        <button class="btn btn-prim" style="margin-left:auto" onclick="publicarPost()">Publicar</button>
      </div></div></div></div>
  <div id="reply-info" style="display:none" class="sexo-box">↩️ Respondiendo a <b id="reply-autor"></b> <button class="linkbtn" onclick="cancelarReply()">Cancelar</button></div>
  <div id="feed">${(posts||[]).map(p=>{
    const a=mapa[p.user_id]||{};
    return `<div class="post"><div class="post-head"><img class="foto-mini" src="${esc(a.foto_url)||AVATAR}"><div style="flex:1"><b>${esc(a.criadero||a.nombre||'Criador')}</b><span>${esc(a.ciudad||'')} · ${fechaTS(p.creado_en)}</span></div>${p.tipo==='venta'?'<span class="tag-venta">VENTA</span>':''}${(p.user_id===usuario.id||perfil.role==='admin')?`<button class="borrar" onclick="borrarPost('${p.id}')">🗑️</button>`:''}</div>
    <div>${textoConMenciones(p.texto)}</div>${p.media_url?`<img src="${esc(p.media_url)}" onclick="abrirLightbox('${esc(p.media_url)}')">`:''}
    <div style="margin-top:10px">${(coms||[]).filter(c=>c.post_id===p.id).map(c=>{const ca=mapa[c.user_id]||{};const padre=(coms||[]).find(x=>x.id===c.responde_a);return `<div class="coment" data-id="${c.id}" data-autor="${esc(ca.nombre||'Usuario')}">${padre?`<div class="resp-de">↩️ a ${esc((mapa[padre.user_id]||{}).nombre||'alguien')}</div>`:''}<b>${esc(ca.nombre||'Usuario')}:</b> ${textoConMenciones(c.texto)} <button class="linkbtn" onclick="responderA('${c.id}','${esc(ca.nombre||'')}')">↩️</button></div>`;}).join('')}
    <div style="display:flex;gap:8px;margin-top:8px"><input id="com-${p.id}" placeholder="Comentar… @ para etiquetar"><button class="btn btn-sec" onclick="comentar('${p.id}')">➤</button></div>
    <div class="m-list" id="ment-${p.id}" style="display:none"></div></div></div>`;
  }).join('')||'<div class="vacio">Sé el primero en publicar 🎉</div>'}</div>`;
  adjuntarMenciones('post-texto','post-ment');
  (posts||[]).forEach(p=>adjuntarMenciones('com-'+p.id,'ment-'+p.id));
}
document.addEventListener('change',e=>{if(e.target.id==='post-file'){const f=e.target.files[0];if(f){const r=new FileReader();r.onload=()=>{const i=$('#post-prev');if(i){i.src=r.result;i.style.display='block';}};r.readAsDataURL(f);}}});
async function publicarPost(){
  const txt=$('#post-texto').value.trim();if(!txt)return alert('Escribe algo');
  let media='';const f=$('#post-file').files[0];
  if(f)media=await subirArchivo(f,'posts');
  await sb.from('social_posts').insert({user_id:usuario.id,tipo:$('#post-tipo').value,texto:txt,media_url:media,menciones:mencionesDe(txt)});
  log('🌐','Publicación en comunidad');renderComunidad();
}
async function comentar(pid){
  const inp=$('#com-'+pid),txt=inp.value.trim();if(!txt)return;
  await sb.from('social_comentarios').insert({post_id:pid,user_id:usuario.id,texto:txt,responde_a:replyA?replyA.id:null,menciones:mencionesDe(txt)});
  replyA=null;renderComunidad();
}
function borrarPost(id){confirmar('¿Eliminar publicación?','','Eliminar',async()=>{await sb.from('social_posts').delete().eq('id',id);renderComunidad();},'danger');}
async function enviarVerificacion(){
  const tel=$('#v-tel').value.trim(),f=$('#v-cedula').files[0];
  if(!tel)return alert('Escribe tu teléfono');if(!f)return alert('Sube la foto de tu cédula');
  const url=await subirArchivo(f,'cedulas');
  await sb.from('verificaciones').upsert({user_id:usuario.id,telefono:tel,cedula_url:url,estado:'pendiente'},{onConflict:'user_id'});
  alert('✅ Enviado. El administrador te contactará por WhatsApp para la llamada de verificación.');
  window.open(waLink('Hola, soy '+(perfil.nombre||'')+'. Acabo de enviar mi cédula para verificación. Mi teléfono: '+tel),'_blank');
  renderComunidad();
}
function socialURL(val,base){if(!val)return'';return val.startsWith('http')?val:base+String(val).replace(/^@/,'');}
function openMiembro(id){
  const p=lastPers.find(x=>x.id===id);if(!p)return;
  const wa=p.contacto?'https://wa.me/'+String(p.contacto).replace(/\D/g,''):'';
  $('#miembro-cont').innerHTML=`
    <div class="m-head"><img src="${esc(p.foto_url)||AVATAR}"><h3 style="margin-top:10px">${esc(p.criadero||p.nombre||'Criador')}</h3>
      <div class="detalle">👤 ${esc(p.nombre||'')} · 📍 ${esc(p.ciudad||p.pais||'')} · <span class="dot ${estaOnline(p.id)?'on':''}"></span> ${estaOnline(p.id)?'En línea':'Desconectado'}</div>
      <span class="badge badge-activo" style="margin-top:6px;display:inline-block">✅ Miembro verificado</span></div>
    ${p.bio?`<p style="text-align:center;margin:14px 0;color:var(--txt2)">${esc(p.bio)}</p>`:''}
    <div class="m-social">
      ${p.instagram?`<a class="btn btn-sec" target="_blank" href="${esc(socialURL(p.instagram,'https://instagram.com/'))}">📸 Instagram</a>`:''}
      ${p.tiktok?`<a class="btn btn-sec" target="_blank" href="${esc(socialURL(p.tiktok,'https://tiktok.com/@'))}">🎵 TikTok</a>`:''}
      ${wa?`<a class="btn btn-prim" target="_blank" href="${wa}">💬 WhatsApp</a>`:''}
      <button class="btn btn-prim" onclick="abrirChatCon('${p.id}');document.getElementById('overlay-miembro').classList.remove('abierto');irA('mensajes')">📨 Mensaje privado</button>
    </div>
    <div class="botones"><button class="btn btn-sec" onclick="document.getElementById('overlay-miembro').classList.remove('abierto')">Cerrar</button></div>`;
  $('#overlay-miembro').classList.add('abierto');
}
$('#overlay-miembro').addEventListener('click',e=>{if(e.target.id==='overlay-miembro')e.target.classList.remove('abierto');});

let canalSocial=null;
function iniciarRealtime(){
  detenerRealtime();
  canalSocial=sb.channel('rt-social')
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'social_posts'},()=>refrescarSocial())
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'social_comentarios'},()=>refrescarSocial())
    .subscribe();
  iniciarChatRealtime();
}
function detenerRealtime(){if(canalSocial){sb.removeChannel(canalSocial);canalSocial=null;}detenerChatRealtime();}
async function refrescarSocial(){
  if($('#vista-comunidad').style.display==='block'&&comTab==='feed'){
    const t=$('#post-texto')?$('#post-texto').value:'';
    await renderComunidad();
    if($('#post-texto'))$('#post-texto').value=t;
  }
  if($('#vista-mensajes').style.display==='block')renderChats();
}
