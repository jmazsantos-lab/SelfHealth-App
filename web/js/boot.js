/* Self · arranque: animación, modo (demo o real), inicio de sesión y carga de datos */
(function(){
  const t0=performance.now();
  const splash=document.getElementById('splash');
  splash.innerHTML=spine(84,true)+'<span class="wm">Self</span>';
  /* La animación dura un segundo; la app se muestra cuando además hay datos */
  window.__selfReady=()=>{const wait=Math.max(0,860-(performance.now()-t0));setTimeout(()=>{splash.classList.add('out');setTimeout(()=>splash.remove(),260)},wait)};

  if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
  try{const c=JSON.parse(localStorage.getItem('self.colors'));if(c)Object.entries(c).forEach(([k,v])=>document.documentElement.style.setProperty('--'+k,v))}catch(e){}

  const cfg=window.SELF_CONFIG||{};
  const wantsDemo=cfg.demo||sessionStorage.getItem('self.demo')==='1'||!cfg.supabaseUrl||!cfg.supabaseAnonKey;
  const fail=msg=>{window.__selfReady();document.getElementById('main').innerHTML=`<div class="login"><div class="lbrand">${spine(56)}<span class="wm">Self</span></div><p class="lead" style="margin:18px 0">${msg}</p><button class="primary" onclick="location.reload()">Reintentar</button><button class="linkbtn" id="demoBtn">Probar en modo demostración</button></div>`;document.getElementById('demoBtn').onclick=()=>{sessionStorage.setItem('self.demo','1');location.reload()}};

  async function run(){
    if(wantsDemo){startSelf(Object.assign(buildDemo(),{name:cfg.name,initials:cfg.initials}));return}
    if(!window.supabase){
      /* Sin conexión y sin la librería de Supabase: usa la copia local si existe */
      try{const rows=JSON.parse(localStorage.getItem(SELF_CACHE));if(rows){const DS=assemble(rows,startOfDay(new Date()),cfg);Object.assign(DS,{mode:'live',offline:true,actDetail:async()=>{throw new Error('offline')},save:async()=>{throw new Error('Sin conexión')},saveSettings:async()=>{},signOut:null});startSelf(DS);return}}catch(e){}
      fail('No hay conexión para cargar tus datos y todavía no existe una copia guardada en este dispositivo.');return;
    }
    const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true}});
    const {data:{session}}=await sb.auth.getSession();
    if(!session){showLogin(sb);return}
    try{startSelf(await loadLive(sb,session.user,cfg))}
    catch(err){console.error(err);fail('No se han podido cargar tus datos. Comprueba la conexión o la configuración de Supabase.')}
  }

  function showLogin(sb){
    window.__selfReady();
    document.getElementById('nav').style.display='none';
    const main=document.getElementById('main');
    main.innerHTML=`<form class="login" id="loginForm">
      <div class="lbrand">${spine(56)}<span class="wm">Self</span></div>
      <h1 style="margin-top:22px">Inicia sesión</h1>
      <p class="lead" style="margin:8px 0 18px">Tus datos de salud están protegidos y solo tú puedes verlos.</p>
      <label class="fld"><span>Correo</span><input name="email" type="email" autocomplete="username" required></label>
      <label class="fld"><span>Contraseña</span><input name="password" type="password" autocomplete="current-password" required></label>
      <p class="err" id="loginErr" role="alert"></p>
      <button class="primary" type="submit">Entrar</button>
      <button class="linkbtn" type="button" id="demoBtn">Probar en modo demostración</button>
    </form>`;
    document.getElementById('demoBtn').onclick=()=>{sessionStorage.setItem('self.demo','1');location.reload()};
    document.getElementById('loginForm').onsubmit=async e=>{
      e.preventDefault();const f=new FormData(e.target),err=document.getElementById('loginErr');err.textContent='';
      const {error}=await sb.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});
      if(error){err.textContent='Correo o contraseña incorrectos.';return}
      location.reload();
    };
  }
  run().catch(err=>{console.error(err);fail('Ha ocurrido un error al iniciar la app.')});
})();
