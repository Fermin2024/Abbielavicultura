async function cargarDatos(){
  const [a,c,r,cfg,p,v,rd,cd]=await Promise.all([
    sb.from('animales').select('*').order('creado_en',{ascending:false}),
    sb.from('cruces').select('*').order('creado_en',{ascending:false}),
    sb.from('registro').select('*').order('t',{ascending:false}).limit(300),
    sb.from('config').select('*').single(),
    sb.from('profiles').select('*').eq('id',usuario.id).single(),
    sb.from('verificaciones').select('*').eq('user_id',usuario.id).maybeSingle(),
    sb.from('razas_db').select('*').eq('activa',true),
    sb.from('cruces_db').select('*')]);
  animales=a.data||[];cruces=c.data||[];registro=r.data||[];
  config=cfg.data||{precio_mes:5,precio_anual:48,horas_prueba:24,moneda:'$',banco_info:'Contacta al administrador.'};
  perfil=p.data||{role:'user',estado:'pendiente'};verifPropia=v.data||null;
  razasDB=rd.data||[];crucesDB=cd.data||[];
}
function mostrarApp(){
  $('#landing').style.display='none';$('#pantalla-auth').classList.remove('abierto');$('#app').style.display='block';
  const est=estadoUsuario();
  const badges={admin:['badge badge-admin','👑 Admin'],activo:['badge badge-activo','✅ Activa'],prueba:['badge badge-prueba','🧪 Prueba'],prueba_expirada:['badge badge-vencido','⏰ Prueba vencida'],vencido:['badge badge-vencido','🔒 Vencida'],pendiente:['badge badge-pendiente','⏳ Pendiente'],baneado:['badge badge-baneado','🚫 Baneada']};
  const [cls,txt]=badges[est]||badges.pendiente;
  $('#user-badge').className=cls;$('#user-badge').textContent=txt;
  const f=$('#user-foto');if(perfil.foto_url){f.src=perfil.foto_url;f.style.display='block';}else f.style.display='none';
  $('#user-datos').innerHTML=`${esc(perfil.criadero||perfil.nombre||usuario.email)}${perfil.vence_en?' · vence '+fechaTS(perfil.vence_en):''}`;
  $('#menu-admin').style.display=perfil.role==='admin'?'':'none';
  if(['admin','activo','prueba'].includes(est)){
    $('#vista-bloqueado').style.display='none';irA('animales');
    render();renderRazas();poblarCruces();renderCruces();renderRegistro();cargarPerfilUI();
    if(est==='admin')renderAdmin();
  }else mostrarBloqueo();
}
function mostrarBloqueo(){
  const est=estadoUsuario(),mon=config.moneda||'$',banco=esc(config.banco_info||'');
  let h='';
  if(est==='baneado')h=`<h2>🚫 Cuenta suspendida</h2><p>Razón: ${esc(perfil.razon_baneo||'No especificada')}</p>`;
  else if(est==='pendiente')h=`<h2>⏳ Cuenta pendiente de activación</h2><p>Realiza una transferencia y envía el comprobante por WhatsApp.</p><div class="planes"><div class="plan"><h3>Mensual</h3><div class="precio">${mon}${config.precio_mes}</div><div class="detalle">30 días</div></div><div class="plan destacado"><h3>Anual</h3><div class="precio">${mon}${config.precio_anual}</div><div class="detalle">365 días</div></div></div><div class="plan-box"><b>💳 Banco:</b><pre style="white-space:pre-wrap;font-family:inherit">${banco}</pre></div><a class="btn btn-prim" target="_blank" href="${waLink('Hola, ya me registré y quiero activar mi cuenta.')}">💬 Enviar comprobante</a>`;
  else if(est==='vencido')h=`<h2>🔒 Suscripción vencida</h2><p>Expiró el ${fechaTS(perfil.vence_en)}. <b>Tus datos siguen guardados.</b></p><div class="planes"><div class="plan"><h3>1 mes</h3><div class="precio">${mon}${config.precio_mes}</div></div><div class="plan destacado"><h3>1 año</h3><div class="precio">${mon}${config.precio_anual}</div></div></div><a class="btn btn-prim" target="_blank" href="${waLink('Hola, quiero renovar mi suscripción.')}">💬 Renovar por WhatsApp</a>`;
  else h=`<h2>⏰ Prueba finalizada</h2><p>Tu prueba terminó. <b>Tus datos siguen guardados.</b></p><div class="planes"><div class="plan"><h3>Mensual</h3><div class="precio">${mon}${config.precio_mes}</div></div><div class="plan destacado"><h3>Anual</h3><div class="precio">${mon}${config.precio_anual}</div></div></div><a class="btn btn-prim" target="_blank" href="${waLink('Hola, mi prueba terminó y quiero suscribirme.')}">💬 Suscribirme</a>`;
  $('#estado-bloqueado').innerHTML=h;
  $$('.vista').forEach(v=>v.style.display='none');$('#vista-bloqueado').style.display='block';
}
const TITULOS={animales:'🐣 Animales',razas:'📖 Razas',cruces:'🧮 Cruces',comunidad:'🌐 Comunidad',mensajes:'💬 Mensajes',perfil:'👤 Mi perfil',galeria:'🖼️ Galería',registro:'📋 Registro',admin:'⚙️ Administración'};
function irA(v){
  $$('.side-link').forEach(x=>x.classList.toggle('activa',x.dataset.v===v));
  $$('.vista').forEach(x=>x.style.display='none');
  const el=$('#vista-'+v);if(el)el.style.display='block';
  $('#titulo-vista').textContent=TITULOS[v]||'🐔';
  $('#menu-drop').style.display='none';$('#sidebar').classList.remove('abierto');
  if(v==='galeria')renderGaleria();
  if(v==='comunidad')renderComunidad();
  if(v==='mensajes')renderChats();
  if(v==='admin')renderAdmin();
  if(v==='perfil')cargarPerfilUI();
}
$$('.side-link').forEach(t=>t.addEventListener('click',()=>irA(t.dataset.v)));
$('#btn-menu').addEventListener('click',e=>{e.stopPropagation();const d=$('#menu-drop');d.style.display=d.style.display==='none'?'flex':'none';});
document.addEventListener('click',e=>{if(!e.target.closest('.menu-wrap'))$('#menu-drop').style.display='none';});
$('#btn-hamb').addEventListener('click',()=>$('#sidebar').classList.toggle('abierto'));

function razasDe(esp){return razasDB.filter(r=>r.especie===esp);}
function infoDe(esp,n){const r=razasDB.find(x=>x.especie===esp&&x.nombre===n);if(!r)return null;return{huevos:[r.huevos_min,r.huevos_max],alim:r.alim,temp:r.temp,mad:r.mad,pico:[r.pico_ini,r.pico_fin],rent:r.rent,vida:[r.vida_min,r.vida_max],ventajas:r.ventajas||[],desventajas:r.desventajas||[]};}
const INFO_DEF={gallina:{huevos:[150,200],alim:110,temp:'Sin datos',mad:22,pico:[3,12],rent:26,vida:[6,8],ventajas:['Genética propia'],desventajas:['Sin verificar']},codorniz:{huevos:[150,220],alim:25,temp:'Sin datos',mad:7,pico:[2,8],rent:10,vida:[2,3],ventajas:['Genética propia'],desventajas:['Sin verificar']}};
function llenarSelectRaza(sel,esp){sel.innerHTML='<option value="">Selecciona…</option>'+razasDe(esp).map(r=>`<option>${esc(r.nombre)}</option>`).join('')+'<option value="__otra__">✍️ Escribir otra…</option>';}

const stat=(l,v)=>`<div class="stat"><span class="sv">${v}</span><span class="sl">${l}</span></div>`;
function renderStats(){$('#stats').innerHTML=stat('🐣 Total',animales.length)+stat('🐔 Gallinas',animales.filter(a=>a.especie==='gallina').length)+stat('🐦 Codornices',animales.filter(a=>a.especie==='codorniz').length)+stat('♀ Hembras',animales.filter(a=>a.sexo==='hembra').length)+stat('♂ Machos',animales.filter(a=>a.sexo==='macho').length);}
function tarjetaHTML(a){
  const r=razasDB.find(x=>x.especie===a.especie&&x.nombre===a.raza);
  const s=a.sexo==='macho'?'<span class="sexo-m">♂ Macho</span>':'<span class="sexo-f">♀ Hembra</span>';
  return `<div class="tarjeta"><div class="card-btns"><button class="mini" onclick="editarAnimal('${a.id}')">✏️</button><button class="mini" onclick="confirmarEliminarAnimal('${a.id}')">🗑️</button></div>
  <div class="num">${a.especie==='gallina'?'🐔':'🐦'} Nº ${esc(a.numero)}</div>
  <div class="nombre">${s} · ${esc(a.raza||'Sin raza')}</div>
  ${r&&r.foto_url?`<img src="${esc(r.foto_url)}" class="foto-raza" style="margin:6px 0" onclick="abrirLightbox('${esc(r.foto_url)}')">`:''}
  <div class="detalle">📅 ${a.nacimiento?fechaBonita(a.nacimiento)+' · '+edad(a.nacimiento):'Sin fecha'}</div>
  ${a.color?`<div class="detalle">🎨 ${esc(a.color)}</div>`:''}${a.notas?`<div class="detalle">📝 ${esc(a.notas)}</div>`:''}</div>`;
}
function actualizarChips(){const n={todos:animales.length,gallina:animales.filter(a=>a.especie==='gallina').length,codorniz:animales.filter(a=>a.especie==='codorniz').length};$('#chip-todos').textContent=`Todos (${n.todos})`;$('#chip-gallinas').textContent=`🐔 Gallinas (${n.gallina})`;$('#chip-codornices').textContent=`🐦 Codornices (${n.codorniz})`;$$('.chip').forEach(c=>c.classList.toggle('activa',c.dataset.f===filtro));}
function render(){renderStats();actualizarChips();let l=animales.filter(a=>filtro==='todos'||a.especie===filtro);if(busqueda)l=l.filter(a=>[a.numero,a.color,a.raza,a.notas].join(' ').toLowerCase().includes(busqueda));$('#lista-animales').innerHTML=l.length?l.map(tarjetaHTML).join(''):`<div class="vacio">🪺 ${busqueda?'Sin resultados.':'No hay animales. Pulsa <b>+ Nuevo animal</b>.'}</div>`;}
function confirmarEliminarAnimal(id){const a=animales.find(x=>x.id===id);if(!a)return;confirmar(`¿Eliminar Nº ${a.numero}?`,'Se eliminará permanentemente.','Eliminar',async()=>{await sb.from('animales').delete().eq('id',id);animales=animales.filter(x=>x.id!==id);log('🗑️',`Animal Nº ${a.numero} eliminado`);render();},'danger');}
function abrirModal(){editandoId=null;$('#form-animal').reset();$('#f-raza-otra').style.display='none';$('#f-raza-foto').style.display='none';$('#f-raza-sexo').textContent='';llenarSelectRaza($('#f-raza'),$('#f-especie').value);$('#modal-titulo').textContent='+ Nuevo animal';$('#btn-guardar-animal').textContent='Guardar animal';$('#overlay').classList.add('abierto');}
function editarAnimal(id){const a=animales.find(x=>x.id===id);if(!a)return;editandoId=id;$('#f-especie').value=a.especie;llenarSelectRaza($('#f-raza'),a.especie);$('#f-sexo').value=a.sexo;$('#f-numero').value=a.numero;$('#f-color').value=a.color;$('#f-fecha').value=a.nacimiento;$('#f-notas').value=a.notas;
  const existe=razasDe(a.especie).some(r=>r.nombre===a.raza);
  if(existe){$('#f-raza').value=a.raza;$('#f-raza-otra').style.display='none';}else{$('#f-raza').value='__otra__';$('#f-raza-otra').style.display='block';$('#f-raza-otra').value=a.raza;}
  previewRazaModal();$('#modal-titulo').textContent='✏️ Editar Nº '+a.numero;$('#btn-guardar-animal').textContent='Guardar cambios';$('#overlay').classList.add('abierto');}
function cerrarModal(){$('#overlay').classList.remove('abierto');}
function previewRazaModal(){
  const esp=$('#f-especie').value,v=$('#f-raza').value;
  const nombre=v==='__otra__'?$('#f-raza-otra').value:v;
  const r=razasDB.find(x=>x.especie===esp&&x.nombre===nombre);
  const img=$('#f-raza-foto');
  if(r&&r.foto_url){img.src=r.foto_url;img.style.display='block';}else img.style.display='none';
  $('#f-raza-sexo').textContent=($('#f-sexo').value==='macho'?'♂ Macho':'♀ Hembra')+(r?` · ${esc(r.nombre)}`:'');
}
$('#f-especie').addEventListener('change',()=>llenarSelectRaza($('#f-raza'),$('#f-especie').value));
$('#f-raza').addEventListener('change',e=>{$('#f-raza-otra').style.display=e.target.value==='__otra__'?'block':'none';previewRazaModal();});
$('#f-raza-otra').addEventListener('input',previewRazaModal);
$('#f-sexo').addEventListener('change',previewRazaModal);
$('#form-animal').addEventListener('submit',async e=>{
  e.preventDefault();
  const raza=$('#f-raza').value==='__otra__'?$('#f-raza-otra').value.trim():$('#f-raza').value;
  const datos={user_id:usuario.id,especie:$('#f-especie').value,sexo:$('#f-sexo').value,numero:$('#f-numero').value.trim(),color:$('#f-color').value.trim(),raza,nacimiento:$('#f-fecha').value||null,notas:$('#f-notas').value.trim()};
  if(!datos.numero)return alert('El número es obligatorio');
  if(editandoId){const {error}=await sb.from('animales').update(datos).eq('id',editandoId);if(error)return alert('Error: '+error.message);log('✏️',`Animal Nº ${datos.numero} editado`);}
  else{const {error}=await sb.from('animales').insert({id:String(Date.now()),...datos});if(error)return alert('Error: '+error.message);log('➕',`Animal Nº ${datos.numero} agregado`);}
  cerrarModal();render();renderRazas();
});
function renderRazas(){
  $('#lista-razas').innerHTML=['gallina','codorniz'].map(esp=>{
    return `<div class="panel"><h3>${esp==='gallina'?'🐔 Gallinas':'🐦 Codornices'}</h3>`+razasDe(esp).map(r=>{
      const n=animales.filter(a=>a.especie===esp&&a.raza===r.nombre).length;
      return `<div class="item-raza"><div style="display:flex;gap:10px;align-items:center">${r.foto_url?`<img src="${esc(r.foto_url)}" class="foto-raza" onclick="abrirLightbox('${esc(r.foto_url)}')">`:'<span style="font-size:1.6rem">🐔</span>'}<div><b>${esc(r.nombre)}</b><div class="detalle">${r.huevos_min}–${r.huevos_max} huevos/año · ${esc(r.temp)}</div></div></div><span class="cuenta">${n}</span></div>`;
    }).join('')+`</div>`;}).join('');
}
function poblarCruces(){llenarSelectRaza($('#raza-macho'),$('#cruce-especie').value);$('#raza-macho').lastElementChild.remove();llenarSelectRaza($('#raza-hembra'),$('#cruce-especie').value);$('#raza-hembra').lastElementChild.remove();}
$('#cruce-especie').addEventListener('change',()=>{poblarCruces();$('#foto-macho').style.display='none';$('#foto-hembra').style.display='none';});
function prevPadre(sel,img){const r=razasDB.find(x=>x.especie===$('#cruce-especie').value&&x.nombre===sel.value);if(r&&r.foto_url){img.src=r.foto_url;img.style.display='block';}else img.style.display='none';}
$('#raza-macho').addEventListener('change',e=>prevPadre(e.target,$('#foto-macho')));
$('#raza-hembra').addEventListener('change',e=>prevPadre(e.target,$('#foto-hembra')));
function buscarNombresDB(esp,m,h){
  const ex=crucesDB.find(c=>c.especie===esp&&c.raza_macho===m&&c.raza_hembra===h);
  if(ex)return{sexlink:ex.sexlink,nombres:ex.nombres||[]};
  const ap=crucesDB.find(c=>c.especie===esp&&m.toLowerCase().includes(c.raza_macho.toLowerCase())&&h.toLowerCase().includes(c.raza_hembra.toLowerCase()));
  if(ap)return{sexlink:ap.sexlink,nombres:ap.nombres||[]};
  return{sexlink:'',nombres:[`Híbrido ${m}×${h}`,'Mestiza 50/50','Cruce F1']};
}
function curvaPostura(d){
  const W=380,H=175,L=34,R=370,T=14,B=132,X=m=>L+(m/36)*(R-L),Y=p=>B-(p/100)*(B-T);
  const pts=[];for(let m=0;m<=36;m+=.5){let v;if(m<d.madMeses)v=0;else if(m<d.pi)v=25+(m-d.madMeses)/((d.pi-d.madMeses)||1)*(d.peak-25);else if(m<=d.pf)v=d.peak;else v=Math.max(15,d.peak-2.2*(m-d.pf));pts.push([m,v]);}
  const lin=pts.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%"><rect x="${X(d.madMeses)}" y="${T}" width="${X(Math.min(36,d.rent))-X(d.madMeses)}" height="${B-T}" fill="rgba(124,252,155,.08)"/>${[0,25,50,75,100].map(p=>`<line x1="${L}" y1="${Y(p)}" x2="${R}" y2="${Y(p)}" stroke="rgba(255,255,255,.12)"/><text x="${L-4}" y="${Y(p)+2}" font-size="7" text-anchor="end" fill="#9fbfa9">${p}</text>`).join('')}<path d="${lin} L ${X(36)} ${B} L ${X(0)} ${B} Z" fill="rgba(124,252,155,.15)"/><path d="${lin}" fill="none" stroke="#7CFC9B" stroke-width="2.5"/><line x1="${X(d.rent)}" y1="${T}" x2="${X(d.rent)}" y2="${B}" stroke="#f87171" stroke-dasharray="3 3"/><circle cx="${X(d.pi)}" cy="${Y(d.peak)}" r="3.5" fill="#d99a2b"/><text x="${X(d.pi)}" y="${Y(d.peak)-7}" font-size="7.5" text-anchor="middle" fill="#f0b545" font-weight="bold">PICO ${d.peak}%</text>${[0,6,12,18,24,30,36].map(m=>`<text x="${X(m)}" y="${B+12}" font-size="7" text-anchor="middle" fill="#9fbfa9">${m}</text>`).join('')}<text x="${(L+R)/2}" y="${H-4}" font-size="7.5" text-anchor="middle" fill="#9fbfa9">Edad (meses) · verde = rentable</text></svg>`;
}
const tile=(l,v)=>`<div class="tile"><span class="tl">${l}</span><span class="tv">${v}</span></div>`;
$('#btn-calcular').addEventListener('click',()=>{
  const esp=$('#cruce-especie').value,m=$('#raza-macho').value,h=$('#raza-hembra').value;
  if(!m||!h)return alert('Selecciona las razas del macho y de la hembra.');
  const nom=buscarNombresDB(esp,m,h);
  const ia=infoDe(esp,m)||INFO_DEF[esp],ib=infoDe(esp,h)||INFO_DEF[esp];
  const p=(x,y)=>Math.round((x+y)/2),pr=(x,y)=>[p(x[0],y[0]),p(x[1],y[1])];
  const d={huevos:pr(ia.huevos,ib.huevos),alim:p(ia.alim,ib.alim),mad:p(ia.mad,ib.mad),pico:pr(ia.pico,ib.pico),rent:p(ia.rent,ib.rent),vida:pr(ia.vida,ib.vida),ventajas:[ia.ventajas[0],ib.ventajas[0],'💪 Vigor híbrido'].filter(Boolean),desventajas:[ia.desventajas[0],ib.desventajas[0]].filter(Boolean)};
  const sx=nom.sexlink==='color'?{ok:true,txt:'✅ Sexable al nacer por color del plumón. 100% confiable.'}:{ok:false,txt:esp==='codorniz'?'No al nacer. Por color de plumaje a las 3–4 semanas o cloaca en adultos.':'No sexable por color al nacer. Opciones: cloaca (día 1), crecimiento de plumas, cresta desde 6–10 semanas.'};
  const avgH=(d.huevos[0]+d.huevos[1])/2,peak=Math.min(96,Math.round(avgH/365*100*1.35));
  $('#resultado-cruce').innerHTML=`
   <div style="display:flex;gap:10px;align-items:center"><span class="gen-badge">F1</span><div><h3>${esc(nom.nombres[0])}</h3><div class="detalle">También: ${nom.nombres.slice(1).map(esc).join(' · ')}</div></div></div>
   <div class="sexo-box ${sx.ok?'sexo-si':''}">🚼 <b>Sexado:</b> ${esc(sx.txt)}</div>
   <div class="tiles">${tile('🥚 Huevos/año',d.huevos[0]+'–'+d.huevos[1])}${tile('🌾 Alimento','≈'+d.alim+' g/día')}${tile('📦 Consumo anual',(d.alim*365/1000).toFixed(1)+' kg')}${tile('🍽️ Por huevo','≈'+Math.round(d.alim*365/avgH)+' g')}${tile('⏱️ Madurez','≈'+d.mad+' sem')}${tile('📈 Pico','M'+d.pico[0]+'–'+d.pico[1])}${tile('💰 Rentable hasta','M'+d.rent)}${tile('❤️ Vida',d.vida[0]+'–'+d.vida[1]+' años')}</div>
   <div class="svgwrap"><b>Curva de postura</b>${curvaPostura({madMeses:d.mad/4.33,pi:d.pico[0],pf:d.pico[1],peak,rent:d.rent})}</div>
   <div class="proscons"><div class="col pros"><b>✅ Ventajas</b><ul>${d.ventajas.map(v=>'<li>'+esc(v)+'</li>').join('')}</ul></div><div class="col cons"><b>⚠️ Desventajas</b><ul>${d.desventajas.map(v=>'<li>'+esc(v)+'</li>').join('')}</ul></div></div>`;
  $('#resultado-cruce').classList.add('visible');$('#btn-guardar-cruce').style.display='inline-block';
  ultimoCruce={esp,m,h,gen:'F1',nombre:nom.nombres[0]};
});
$('#btn-guardar-cruce').addEventListener('click',()=>{if(!ultimoCruce)return;confirmar('¿Guardar cruce?',`Se guardará <b>${esc(ultimoCruce.nombre)}</b> en tu historial.`,'Guardar',async()=>{const id=String(Date.now());await sb.from('cruces').insert({id,user_id:usuario.id,...ultimoCruce,fecha:new Date().toISOString().slice(0,10)});cruces.unshift({id,...ultimoCruce});log('🧮','Cruce: '+ultimoCruce.nombre);renderCruces();$('#btn-guardar-cruce').style.display='none';});});
function eliminarCruce(id){confirmar('¿Eliminar cruce?','Se quitará del historial.','Eliminar',async()=>{await sb.from('cruces').delete().eq('id',id);cruces=cruces.filter(c=>c.id!==id);renderCruces();},'danger');}
function renderCruces(){$('#historial-cruces').innerHTML=cruces.length?cruces.map(x=>`<div class="item-cruce"><div><b>${esc(x.nombre)}</b><div class="detalle">♂ ${esc(x.m)} × ♀ ${esc(x.h)} · ${fechaBonita(x.fecha)}</div></div><button class="borrar" onclick="eliminarCruce('${x.id}')">🗑️</button></div>`).join(''):'<div class="detalle" style="text-align:center;padding:14px">Sin cruces guardados.</div>';}

$('#g-file').addEventListener('change',async e=>{
  const files=[...e.target.files];if(!files.length)return;
  for(const f of files){const tipo=f.type.startsWith('video')?'video':'foto';const url=await subirArchivo(f,'galeria');await sb.from('galeria').insert({user_id:usuario.id,tipo,url,titulo:f.name});}
  log('🖼️',files.length+' archivo(s) a galería');renderGaleria();e.target.value='';
});
async function renderGaleria(){
  const {data}=await sb.from('galeria').select('*').eq('user_id',usuario.id).order('creado_en',{ascending:false});
  $('#galeria-grid').innerHTML=(data||[]).length?(data||[]).map(g=>`<div class="g-item">${g.tipo==='video'?`<video src="${esc(g.url)}" controls></video>`:`<img src="${esc(g.url)}" onclick="abrirLightbox('${esc(g.url)}')">`}<button class="mini" onclick="borrarGaleria('${g.id}')">🗑️</button></div>`).join(''):'<div class="vacio">📷 Sube fotos y videos de tus animales.</div>';
}
function borrarGaleria(id){confirmar('¿Eliminar archivo?','Se quitará de tu galería.','Eliminar',async()=>{await sb.from('galeria').delete().eq('id',id);renderGaleria();},'danger');}

function cargarPerfilUI(){
  $('#p-nombre').value=perfil.nombre||'';$('#p-criadero').value=perfil.criadero||'';$('#p-ciudad').value=perfil.ciudad||'';$('#p-pais').value=perfil.pais||'';
  $('#p-username').value=perfil.username||'';$('#p-telefono').value=perfil.telefono||'';
  $('#p-instagram').value=perfil.instagram||'';$('#p-tiktok').value=perfil.tiktok||'';$('#p-contacto').value=perfil.contacto||'';$('#p-bio').value=perfil.bio||'';
  $('#p-foto').src=perfil.foto_url||AVATAR;$('#p-foto').dataset.nueva='';
}
$('#p-foto-file').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{const url=await subirArchivo(f,'perfiles');$('#p-foto').src=url;$('#p-foto').dataset.nueva=url;}catch(err){alert('Error al subir foto: '+err.message);}});
function confirmarGuardarPerfil(){confirmar('¿Guardar perfil?','Tu información será visible para los miembros aprobados.','Guardar',async()=>{
  const upd={nombre:$('#p-nombre').value.trim(),criadero:$('#p-criadero').value.trim(),ciudad:$('#p-ciudad').value.trim(),pais:$('#p-pais').value.trim(),username:($('#p-username').value||'').trim().replace(/\s/g,'').replace(/^@/,''),telefono:$('#p-telefono').value.trim(),instagram:$('#p-instagram').value.trim(),tiktok:$('#p-tiktok').value.trim(),contacto:$('#p-contacto').value.trim(),bio:$('#p-bio').value.trim()};
  if($('#p-foto').dataset.nueva)upd.foto_url=$('#p-foto').dataset.nueva;
  const {data,error}=await sb.from('profiles').update(upd).eq('id',usuario.id).select().single();
  if(error){alert('Error al guardar perfil: '+error.message);return;}
  perfil={...perfil,...data};
  const f=$('#user-foto');if(perfil.foto_url){f.src=perfil.foto_url;f.style.display='block';}
  $('#user-datos').innerHTML=esc(perfil.criadero||perfil.nombre||usuario.email);
  log('👤','Perfil actualizado');
  alert('✅ Perfil guardado correctamente');
});}
function renderRegistro(){$('#lista-registro').innerHTML=registro.length?registro.map(r=>`<div class="reg-item"><span style="font-size:1.2rem">${r.icono}</span><div><div>${esc(r.txt)}</div><div class="detalle">${fechaTS(r.t)}</div></div></div>`).join(''):'<div class="detalle" style="text-align:center;padding:20px">Sin movimientos.</div>';}
function confirmarExportar(){confirmar('¿Exportar copia?','Se descargará un JSON con tus datos.','Exportar',()=>{const blob=new Blob([JSON.stringify({animales,cruces,registro},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='aves-backup.json';a.click();});}
function renderPlanes(){
  const mon=config.moneda||'$';
  $('#planes-landing').innerHTML=`
   <div class="plan-g glass"><h3>🧪 Prueba</h3><div class="precio">${config.horas_prueba}h</div><ul><li>Acceso completo</li><li>Solicítala por WhatsApp</li></ul><button class="btn btn-ghost" onclick="abrirAuth('register')">Probar</button></div>
   <div class="plan-g glass"><h3>Mensual</h3><div class="precio">${mon}${config.precio_mes}</div><ul><li>30 días</li><li>Animales ilimitados</li><li>Todos los módulos</li></ul><button class="btn btn-gold" onclick="abrirAuth('register')">Elegir</button></div>
   <div class="plan-g glass dest"><span class="tag">MÁS POPULAR</span><h3>Anual</h3><div class="precio">${mon}${config.precio_anual}</div><ul><li>365 días</li><li>Mejor precio</li><li>Comunidad verificada</li></ul><button class="btn btn-gold" onclick="abrirAuth('register')">Elegir</button></div>`;
}
$$('.chip').forEach(c=>c.addEventListener('click',()=>{if(c.dataset.f){filtro=c.dataset.f;render();}}));
$('#buscador').addEventListener('input',e=>{busqueda=e.target.value.trim().toLowerCase();render();});
$('#overlay').addEventListener('click',e=>{if(e.target.id==='overlay')cerrarModal();});

(async()=>{
  const {data:cfg}=await sb.from('config').select('*').single();
  if(cfg){config=cfg;renderPlanes();}
  $('#wa-float').href=waLink('Hola, necesito soporte con Control de Aves.');
  $('#wa-landing').href=waLink('Hola, quiero información sobre Control de Aves.');
  sb.auth.onAuthStateChange(async(ev,ses)=>{
    if(ev==='SIGNED_OUT'||!ses){usuario=null;$('#app').style.display='none';$('#landing').style.display='block';detenerRealtime();return;}
    if(['SIGNED_IN','TOKEN_REFRESHED','INITIAL_SESSION'].includes(ev)){
      usuario=ses.user;
      try{await cargarDatos();mostrarApp();iniciarPresencia();iniciarRealtime();}catch(err){alert('Error: '+err.message);}
    }
  });
})();
