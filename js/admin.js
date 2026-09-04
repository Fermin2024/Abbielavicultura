async function renderAdmin(){
  const {data:cfg}=await sb.from('config').select('*').single();config=cfg||config;
  $('#cfg-mes').value=config.precio_mes;$('#cfg-anual').value=config.precio_anual;$('#cfg-prueba').value=config.horas_prueba;$('#cfg-moneda').value=config.moneda;$('#cfg-banco').value=config.banco_info;
  const {data:perfiles}=await sb.from('profiles').select('*').order('creado_en',{ascending:false});
  $('#lista-usuarios').innerHTML=(perfiles||[]).map(p=>{
    let estado=p.baneado?'<span class="badge badge-baneado">baneado</span>':p.estado==='activo'?'<span class="badge badge-activo">activo</span>':p.es_prueba?'<span class="badge badge-prueba">prueba</span>':'<span class="badge badge-pendiente">pendiente</span>';
    return `<div class="usuario-row ${p.baneado?'baneado':''}"><div class="usuario-info"><b>${esc(p.nombre||'Sin nombre')} ${p.role==='admin'?'<span class="badge badge-admin">admin</span>':''}</b><span>${esc(p.email)} · ${estado} ${p.comunidad_activa===false?'· 🚫 comunidad':''}</span><span>Vence: ${p.vence_en?fechaTS(p.vence_en):'—'}</span></div>
    <div class="usuario-actions">${p.role!=='admin'?`<button onclick="activarUsuario('${p.id}',30)">+30d</button><button onclick="activarUsuario('${p.id}',90)">+90d</button><button onclick="activarUsuario('${p.id}',365)">+1 año</button><button onclick="activarUsuario('${p.id}',3650)">♾️</button><button class="warn" onclick="activarPrueba('${p.id}')">🧪</button><button onclick="toggleComunidad('${p.id}',${p.comunidad_activa===false})">${p.comunidad_activa===false?'🌐':'🚫'}</button><button class="warn" onclick="cambiarPass('${p.id}')">🔑</button><button class="block" onclick="deshabilitarUsuario('${p.id}')">🔒</button><button class="danger" onclick="banearUsuario('${p.id}')">🚫</button><button class="danger" onclick="borrarUsuario('${p.id}')">🗑️</button>`:'Raíz'}</div></div>`;
  }).join('')||'<p>Sin usuarios.</p>';
  const {data:vers}=await sb.from('verificaciones').select('*').eq('estado','pendiente');
  $('#lista-verificaciones').innerHTML=(vers||[]).length?(vers||[]).map(v=>{
    const p=(perfiles||[]).find(x=>x.id===v.user_id)||{};
    return `<div class="usuario-row"><div class="usuario-info"><b>${esc(p.nombre||'')}</b><span>${esc(p.email)} · ${esc(v.telefono)}</span><a href="${esc(v.cedula_url)}" target="_blank" class="detalle">🪪 Ver cédula</a></div>
    <div class="usuario-actions"><button onclick="resolverVerif('${v.user_id}',true)">✅ Verificar</button><button class="danger" onclick="resolverVerif('${v.user_id}',false)">❌ Rechazar</button><a class="btn btn-sec" target="_blank" href="${waLink('Hola '+(p.nombre||'')+', te llamaremos para verificar tu cuenta.')}" style="text-decoration:none">💬 Llamar</a></div></div>`;
  }).join(''):'<p class="detalle">Sin verificaciones pendientes.</p>';
  renderRazasAdmin();renderCrucesAdmin();
  const {data:ban}=await sb.from('correos_baneados').select('*');
  $('#lista-baneados').innerHTML=(ban||[]).map(b=>`<div class="item-raza"><div><b>${esc(b.email)}</b><div class="detalle">${esc(b.razon||'')}</div></div><button class="mini" onclick="quitarBaneo('${b.id}')">Quitar</button></div>`).join('')||'<p class="detalle">Sin correos baneados.</p>';
  const {data:aud}=await sb.from('mensajes_privados').select('*').order('creado_en',{ascending:false}).limit(60);
  $('#lista-auditoria').innerHTML=(aud||[]).map(m=>{
    const de=(perfiles||[]).find(x=>x.id===m.emisor)||{},para=(perfiles||[]).find(x=>x.id===m.receptor)||{};
    return `<div class="reg-item"><div><b>${esc(de.nombre||'?')} → ${esc(para.nombre||'?')}</b><div class="detalle">${esc(m.texto)} · ${fechaTS(m.creado_en)}</div></div></div>`;
  }).join('')||'<p class="detalle">Sin mensajes aún.</p>';
}
async function resolverVerif(uid,ok){
  if(ok){await sb.from('profiles').update({verificado:true}).eq('id',uid);await sb.from('verificaciones').update({estado:'verificado'}).eq('user_id',uid);}
  else await sb.from('verificaciones').update({estado:'rechazado'}).eq('user_id',uid);
  renderAdmin();
}
function toggleComunidad(id,activar){confirmar(activar?'¿Activar comunidad a este usuario?':'¿Desactivar comunidad a este usuario?','Podrás cambiarlo cuando quieras.',activar?'🌐 Activar':'🚫 Desactivar',async()=>{await sb.from('profiles').update({comunidad_activa:activar}).eq('id',id);renderAdmin();});}
function cambiarPass(id){
  const p=prompt('Nueva contraseña (mínimo 6 caracteres):');if(!p)return;
  if(p.length<6)return alert('Mínimo 6 caracteres');
  confirmar('¿Cambiar contraseña del usuario?','Se actualizará de inmediato.','🔑 Cambiar',async()=>{
    const {error}=await sb.functions.invoke('admin-reset-password',{body:{user_id:id,nueva:p}});
    if(error)alert('Error: '+error.message);else alert('✅ Contraseña actualizada');
  });
}
function activarUsuario(id,dias){confirmar(`¿Activar ${dias===3650?'ILIMITADO':dias+' días'}?`,'Acceso inmediato.','Activar',async()=>{const v=new Date();v.setDate(v.getDate()+dias);await sb.from('profiles').update({estado:'activo',es_prueba:false,baneado:false,vence_en:v.toISOString()}).eq('id',id);renderAdmin();});}
function activarPrueba(id){const h=prompt('Horas de prueba:',config.horas_prueba||24);if(!h)return;confirmar('¿Asignar prueba?',h+' horas (sin acceso a comunidad).','Asignar',async()=>{const v=new Date();v.setHours(v.getHours()+parseInt(h));await sb.from('profiles').update({estado:'activo',es_prueba:true,vence_en:v.toISOString()}).eq('id',id);renderAdmin();});}
function deshabilitarUsuario(id){confirmar('¿Deshabilitar cuenta?','Pierde acceso pero conserva sus datos.','Deshabilitar',async()=>{await sb.from('profiles').update({estado:'pendiente',es_prueba:false,vence_en:null}).eq('id',id);renderAdmin();});}
function banearUsuario(id){const r=prompt('Razón del baneo:');if(r===null)return;confirmar('⚠️ ¿Banear permanentemente?','El correo quedará en lista negra.','Banear',async()=>{const {data:p}=await sb.from('profiles').select('email').eq('id',id).single();await sb.from('profiles').update({baneado:true,razon_baneo:r||''}).eq('id',id);await sb.from('correos_baneados').insert({email:p.email,razon:r||''});renderAdmin();},'danger','<div class="warn">⚠️ Irreversible.</div>');}
function quitarBaneo(id){confirmar('¿Quitar de lista negra?','','Quitar',async()=>{await sb.from('correos_baneados').delete().eq('id',id);renderAdmin();});}
function borrarUsuario(id){confirmar('⚠️ ¿Borrar TODO?','Se pierden todos sus datos.','Borrar',async()=>{await sb.from('animales').delete().eq('user_id',id);await sb.from('cruces').delete().eq('user_id',id);await sb.from('registro').delete().eq('user_id',id);await sb.from('profiles').delete().eq('id',id);renderAdmin();},'danger');}
function confirmarGuardarConfig(){confirmar('¿Guardar configuración?','','Guardar',async()=>{await sb.from('config').update({precio_mes:parseFloat($('#cfg-mes').value)||5,precio_anual:parseFloat($('#cfg-anual').value)||48,horas_prueba:parseInt($('#cfg-prueba').value)||24,moneda:$('#cfg-moneda').value||'$',banco_info:$('#cfg-banco').value||''}).eq('id',1);const {data}=await sb.from('config').select('*').single();config=data;renderPlanes();alert('✅ Guardado');});}
function confirmarCrearPrueba(){const email=$('#pr-email').value.trim(),pass=$('#pr-pass').value,h=parseInt($('#pr-horas').value)||24;if(!email||!pass)return alert('Correo y contraseña obligatorios');confirmar('¿Crear prueba?',email+' por '+h+'h.','Crear',async()=>{const v=new Date();v.setHours(v.getHours()+h);const {data,error}=await sb.auth.admin.createUser({email,password:pass,email_confirm:true,user_metadata:{nombre:$('#pr-nombre').value.trim()}});if(error)return alert(error.message);await sb.from('profiles').update({estado:'activo',es_prueba:true,vence_en:v.toISOString()}).eq('id',data.user.id);renderAdmin();});}
function renderRazasAdmin(){
  const esp=$('#adm-raza-esp').value;
  $('#lista-razas-admin').innerHTML=razasDe(esp).map(r=>`<div class="item-raza"><div style="display:flex;gap:10px;align-items:center">${r.foto_url?`<img src="${esc(r.foto_url)}" class="foto-raza">`:'🐔'}<div><b>${esc(r.nombre)}</b><div class="detalle">${r.huevos_min}–${r.huevos_max} huevos/año</div></div></div><div class="usuario-actions"><button onclick="editarRaza('${r.id}')">✏️</button><button class="danger" onclick="eliminarRaza('${r.id}')">🗑️</button></div></div>`).join('')||'<p class="detalle">Sin razas.</p>';
}
$('#adm-raza-esp').addEventListener('change',renderRazasAdmin);
function abrirRazaModal(){editRazaId=null;['r-nombre','r-temp','r-vent','r-desv'].forEach(i=>$('#'+i).value='');$('#r-hmin').value=150;$('#r-hmax').value=200;$('#r-alim').value=110;$('#r-mad').value=22;$('#r-pini').value=3;$('#r-pfin').value=12;$('#r-rent').value=26;$('#r-vida').value='6-8';$('#r-foto-prev').style.display='none';$('#r-foto-prev').dataset.url='';$('#overlay-raza').classList.add('abierto');}
function editarRaza(id){const r=razasDB.find(x=>x.id===id);if(!r)return;editRazaId=id;$('#r-especie').value=r.especie;$('#r-nombre').value=r.nombre;$('#r-hmin').value=r.huevos_min;$('#r-hmax').value=r.huevos_max;$('#r-alim').value=r.alim;$('#r-mad').value=r.mad;$('#r-pini').value=r.pico_ini;$('#r-pfin').value=r.pico_fin;$('#r-rent').value=r.rent;$('#r-vida').value=r.vida_min+'-'+r.vida_max;$('#r-temp').value=r.temp;$('#r-sexo').value=r.sexo_metodo;$('#r-vent').value=(r.ventajas||[]).join(', ');$('#r-desv').value=(r.desventajas||[]).join(', ');const p=$('#r-foto-prev');p.dataset.url=r.foto_url||'';if(r.foto_url){p.src=r.foto_url;p.style.display='block';}else p.style.display='none';$('#overlay-raza').classList.add('abierto');}
function cerrarRazaModal(){$('#overlay-raza').classList.remove('abierto');}
$('#r-foto').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;const url=await subirArchivo(f,'razas');const p=$('#r-foto-prev');p.src=url;p.dataset.url=url;p.style.display='block';});
async function guardarRazaAdmin(){
  const nombre=$('#r-nombre').value.trim();if(!nombre)return alert('Nombre obligatorio');
  const vida=($('#r-vida').value||'6-8').split('-');
  const datos={especie:$('#r-especie').value,nombre,foto_url:$('#r-foto-prev').dataset.url||'',huevos_min:parseInt($('#r-hmin').value)||150,huevos_max:parseInt($('#r-hmax').value)||200,alim:parseInt($('#r-alim').value)||110,temp:$('#r-temp').value,mad:parseInt($('#r-mad').value)||22,pico_ini:parseInt($('#r-pini').value)||3,pico_fin:parseInt($('#r-pfin').value)||12,rent:parseInt($('#r-rent').value)||26,vida_min:parseInt(vida[0])||6,vida_max:parseInt(vida[1])||8,sexo_metodo:$('#r-sexo').value,ventajas:$('#r-vent').value.split(',').map(s=>s.trim()).filter(Boolean),desventajas:$('#r-desv').value.split(',').map(s=>s.trim()).filter(Boolean),activa:true};
  if(editRazaId)await sb.from('razas_db').update(datos).eq('id',editRazaId);
  else await sb.from('razas_db').insert({...datos,custom:true});
  cerrarRazaModal();const {data}=await sb.from('razas_db').select('*').eq('activa',true);razasDB=data;renderRazasAdmin();renderRazas();poblarCruces();alert('✅ Raza guardada');
}
function eliminarRaza(id){confirmar('¿Eliminar raza?','Dejará de aparecer en selectores.','Eliminar',async()=>{await sb.from('razas_db').update({activa:false}).eq('id',id);const {data}=await sb.from('razas_db').select('*').eq('activa',true);razasDB=data;renderRazasAdmin();renderRazas();},'danger');}
function renderCrucesAdmin(){$('#lista-cruces-admin').innerHTML=crucesDB.map(c=>`<div class="item-raza"><div><b>${esc(c.raza_macho)} × ${esc(c.raza_hembra)}</b><div class="detalle">${(c.nombres||[]).join(', ')}${c.sexlink?' · sexable por color':''}</div></div><button class="mini danger" onclick="eliminarCruceDB('${c.id}')">🗑️</button></div>`).join('')||'<p class="detalle">Sin cruces.</p>';}
function abrirCruceModal(){['c-macho','c-hembra','c-nombres'].forEach(i=>$('#'+i).value='');$('#overlay-cruce').classList.add('abierto');}
function cerrarCruceModal(){$('#overlay-cruce').classList.remove('abierto');}
async function guardarCruceAdmin(){
  const m=$('#c-macho').value.trim(),h=$('#c-hembra').value.trim();if(!m||!h)return alert('Faltan razas');
  await sb.from('cruces_db').insert({especie:$('#c-especie').value,raza_macho:m,raza_hembra:h,sexlink:$('#c-sexlink').value,nombres:$('#c-nombres').value.split(',').map(s=>s.trim()).filter(Boolean),custom:true});
  cerrarCruceModal();const {data}=await sb.from('cruces_db').select('*');crucesDB=data;renderCrucesAdmin();alert('✅ Cruce guardado');
}
function eliminarCruceDB(id){confirmar('¿Eliminar cruce conocido?','','Eliminar',async()=>{await sb.from('cruces_db').delete().eq('id',id);const {data}=await sb.from('cruces_db').select('*');crucesDB=data;renderCrucesAdmin();},'danger');}
