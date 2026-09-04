const SUPABASE_URL='https://qukhoixqnocycqjlqpbt.supabase.co';
const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1a2hvaXhxbm9jeWNxamxxcGJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIzMDEsImV4cCI6MjEwNDAyODMwMX0.QhM8_dCjbIGF-1EPRfSgLOTuCUvpk-xHkWwtHFCd0rU';
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const WA_NUM='584227174309';
const waLink=m=>'https://wa.me/'+WA_NUM+'?text='+encodeURIComponent(m);
const AVATAR='data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" rx="40" fill="%232f6b3a"/><text x="40" y="54" font-size="38" text-anchor="middle">🐔</text></svg>';
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let usuario=null,perfil=null,config={},verifPropia=null;
let animales=[],cruces=[],registro=[],razasDB=[],crucesDB=[],lastPers=[];
let filtro='todos',busqueda='',editandoId=null,ultimoCruce=null,editRazaId=null,comTab='feed';

function togglePass(id,btn){const i=$('#'+id);if(i.type==='password'){i.type='text';btn.textContent='🙈';}else{i.type='password';btn.textContent='👁️';}}
function fechaBonita(f){if(!f)return'';const p=f.split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:f;}
function fechaTS(ts){if(!ts)return'—';const d=new Date(ts);return d.toLocaleDateString('es',{day:'2-digit',month:'2-digit',year:'2-digit'})+' '+d.toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'});}
function edad(f){const n=new Date(f),h=new Date();let m=(h.getFullYear()-n.getFullYear())*12+(h.getMonth()-n.getMonth());if(h.getDate()<n.getDate())m--;if(m<0)m=0;if(m<1)return Math.max(0,Math.floor((h-n)/864e5))+' días';if(m<12)return m+' meses';const a=Math.floor(m/12),r=m%12;return a+' años'+(r?' y '+r+' m':'');}
async function subirArchivo(file,carpeta){const ext=file.name.split('.').pop();const path=carpeta+'/'+Date.now()+'-'+Math.random().toString(36).slice(2)+'.'+ext;const {error}=await sb.storage.from('media').upload(path,file);if(error)throw error;return sb.storage.from('media').getPublicUrl(path).data.publicUrl;}
async function log(i,t){if(!usuario)return;const {data}=await sb.from('registro').insert({user_id:usuario.id,icono:i,txt:t}).select().single();if(data)registro.unshift(data);renderRegistro();}

let confirmCb=null;
function confirmar(t,m,ok,cb,tipo='prim',extra=''){
  $('#confirm-title').textContent=t;$('#confirm-msg').innerHTML=m;$('#confirm-extra').innerHTML=extra||'';
  const b=$('#confirm-ok');b.textContent=ok;b.className='btn btn-'+tipo;confirmCb=cb;$('#overlay-confirm').classList.add('abierto');
}
function cerrarConfirm(){$('#overlay-confirm').classList.remove('abierto');confirmCb=null;}
$('#confirm-ok').addEventListener('click',()=>{if(confirmCb)confirmCb();cerrarConfirm();});
$('#overlay-confirm').addEventListener('click',e=>{if(e.target.id==='overlay-confirm')cerrarConfirm();});

function abrirLightbox(src){$('#lightbox-img').src=src;$('#lightbox').classList.add('abierto');}
function cerrarLightbox(){$('#lightbox').classList.remove('abierto');}
$('#lightbox').addEventListener('click',e=>{if(e.target.id==='lightbox')cerrarLightbox();});

function estadoUsuario(){
  if(!perfil)return'pendiente';
  if(perfil.baneado)return'baneado';
  if(perfil.role==='admin')return'admin';
  if(perfil.estado==='activo'){if(perfil.vence_en&&new Date(perfil.vence_en)<new Date())return'vencido';return'activo';}
  if(perfil.es_prueba&&perfil.vence_en){if(new Date(perfil.vence_en)<new Date())return'prueba_expirada';return'prueba';}
  return perfil.estado||'pendiente';
}
function puedeUsarComunidad(){
  if(!perfil)return false;
  if(perfil.role==='admin')return true;
  if(perfil.estado!=='activo')return false;
  if(perfil.es_prueba===true)return false;
  if(perfil.comunidad_activa===false)return false;
  if(perfil.verificado!==true)return false;
  if(perfil.vence_en&&new Date(perfil.vence_en)<new Date())return false;
  return true;
}
