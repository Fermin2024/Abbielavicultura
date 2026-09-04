function abrirAuth(m){$('#pantalla-auth').classList.add('abierto');$$('.auth-tab').forEach(x=>x.classList.toggle('activa',x.dataset.m===m));$('#campos-registro').style.display=m==='register'?'block':'none';$('#btn-auth').textContent=m==='register'?'Crear cuenta':'Entrar';$('#form-auth').dataset.modo=m;$('#auth-msg').className='mensaje';}
$$('.auth-tab').forEach(t=>t.addEventListener('click',()=>abrirAuth(t.dataset.m)));
function mostrarRecuperar(){const b=$('#recuperar-box');b.style.display=b.style.display==='none'?'block':'none';}
async function recuperarCorreo(){
  const id=$('#rec-id').value.trim();if(!id)return alert('Escribe tu correo o teléfono');
  let email=id;
  if(!id.includes('@')){const {data}=await sb.rpc('buscar_email_login',{identificador:id});if(!data)return alert('No encontramos una cuenta con ese dato.');email=data;}
  const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
  if(error)return alert('Error: '+error.message);
  $('#auth-msg').className='mensaje ok';$('#auth-msg').textContent='📧 Revisa tu correo para restablecer tu contraseña.';
}
function recuperarWA(){
  const id=$('#rec-id').value.trim();
  window.open(waLink('Hola, necesito recuperar mi contraseña. Mi correo/teléfono es: '+id),'_blank');
}
$('#form-auth').addEventListener('submit',async e=>{
  e.preventDefault();
  const id=$('#a-email').value.trim(),pass=$('#a-pass').value,modo=$('#form-auth').dataset.modo||'login';
  const btn=$('#btn-auth');btn.disabled=true;const orig=btn.textContent;btn.innerHTML='<span class="loader"></span> Procesando…';
  try{
    if(modo==='register'){
      const nombre=$('#a-nombre').value.trim();if(!nombre)throw new Error('El nombre es obligatorio');
      const uname=($('#a-username').value||'').trim().replace(/\s/g,'').replace(/^@/,'');
      const {error}=await sb.auth.signUp({email:id.includes('@')?id:id,password:pass,options:{data:{nombre,pais:$('#a-pais').value.trim(),username:uname}}});
      if(error)throw error;
      if(!id.includes('@')){const {data}=await sb.rpc('buscar_email_login',{identificador:id});}
      $('#auth-msg').className='mensaje ok';$('#auth-msg').textContent='✅ Cuenta creada. Espera la activación del administrador.';
    }else{
      let email=id;
      if(!id.includes('@')){
        const {data}=await sb.rpc('buscar_email_login',{identificador:id});
        if(!data)throw new Error('No encontramos cuenta con ese usuario o teléfono.');
        email=data;
      }
      const {error}=await sb.auth.signInWithPassword({email,password:pass});
      if(error)throw error;
    }
  }catch(err){$('#auth-msg').className='mensaje error';$('#auth-msg').textContent='❌ '+err.message;}
  btn.disabled=false;btn.textContent=orig;
});
async function cerrarSesion(){confirmar('¿Cerrar sesión?','Se cerrará tu sesión en este dispositivo.','Salir',async()=>{await sb.auth.signOut();location.reload();});}
