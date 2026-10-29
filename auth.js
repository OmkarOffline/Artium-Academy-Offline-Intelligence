/* ── Artium Offline Intelligence: Google sign-in ──
   The landing page (index.html) shows the sign-in screen and holds the Google access token.
   The pages inside it (Lead to Purchase, Monthly Performance) borrow that token to ask the
   data service (an Apps Script in the Basic Information sheet) for the receipts data. The service
   checks who is signed in and which pages they may open, so nobody needs access to the receipts
   sheets themselves. A page opened on its own is sent back to the landing page. */
(function(){
  const CLIENT_ID='526840950585-1g8kglcltlh6geqhrnnsdnp74v35fa7t.apps.googleusercontent.com';
  const DOMAIN='artiumacademy.com';
  // Data service: Apps Script web app in the Basic Information sheet. Who can open which page is
  // read from that sheet's "Pages Sign-in" columns, so editing the sheet updates access.
  const SERVICE_URL='https://script.google.com/macros/s/AKfycbxl_MEjNx6vUGGM_Id9ALfdcUqcXJUjw8q4qmfUbiDJmuxO1xP6zlCytPd1fkD6qFI24A/exec';
  const SCOPES='openid email profile';
  const KEY='artium_oi_auth';
  // Each page file and the name used for it in the access list
  const PAGE_OF={'start.html':'start','home.html':'home','daily.html':'daily','pipeline.html':'pipeline','targets.html':'targets','dfd.html':'centres','dashboard.html':'dashboard','performance.html':'performance','learners.html':'learners','teachers.html':'teachers','stats.html':'stats','analysis.html':'analysis','focus.html':'focus','calendar.html':'calendar','planner.html':'planner'};

  /* ── Inside the landing page: borrow its sign-in ── */
  if(window.parent!==window){
    try{ if(window.parent.ArtiumAuth){
      window.ArtiumAuth=window.parent.ArtiumAuth;
      const pg=PAGE_OF[location.pathname.split('/').pop()];
      if(pg&&!window.ArtiumAuth.pages.includes(pg)){ document.documentElement.innerHTML='<body style="font:15px sans-serif;padding:48px;color:#6B6774">You don\'t have access to this page.</body>'; throw new Error('no access'); }
      return;
    } }catch(e){ if(e.message==='no access') throw e; }
  }
  /* ── A page opened on its own: go to the landing page ── */
  const here=location.pathname.split('/').pop();
  if(here&&here!=='index.html'){
    const tab=PAGE_OF[here]||'dashboard';
    location.replace('index.html#'+tab);
    return;
  }

  /* ── Landing page: sign-in ── */
  let session=null, tokenClient=null, pending=null;
  const listeners=[];
  try{ const s=JSON.parse(sessionStorage.getItem(KEY)||'null'); if(s&&s.exp>Date.now()+60000) session=s; }catch(e){}

  async function service(body){
    const r=await fetch(SERVICE_URL,{method:'POST',body:JSON.stringify(Object.assign({token:session&&session.token},body))});
    if(!r.ok) throw new Error('Could not reach the data service ('+r.status+')');
    return r.json();
  }
  function save(s){ session=s; try{ s?sessionStorage.setItem(KEY,JSON.stringify(s)):sessionStorage.removeItem(KEY); }catch(e){} }

  function loadGis(){
    return new Promise((res,rej)=>{
      if(window.google&&google.accounts&&google.accounts.oauth2) return res();
      const sc=document.createElement('script');sc.src='https://accounts.google.com/gsi/client';sc.async=true;
      sc.onload=()=>res();sc.onerror=()=>rej(new Error('Could not reach Google sign-in'));
      document.head.appendChild(sc);
    });
  }
  async function initClient(){
    await loadGis();
    if(tokenClient) return;
    tokenClient=google.accounts.oauth2.initTokenClient({
      client_id:CLIENT_ID, scope:SCOPES, hosted_domain:DOMAIN,
      callback:async resp=>{
        const p=pending;pending=null;
        if(resp.error){ p&&p.reject(new Error(resp.error_description||resp.error)); return; }
        try{
          const info=await fetch('https://www.googleapis.com/oauth2/v3/userinfo',{headers:{Authorization:'Bearer '+resp.access_token}}).then(r=>r.json());
          const exp=Date.now()+(resp.expires_in||3600)*1000;
          session={token:resp.access_token,exp};
          const me=await service({action:'me'});
          if(me.error||!me.pages||!me.pages.length){
            session=null; google.accounts.oauth2.revoke(resp.access_token,()=>{});
            throw Object.assign(new Error(me.error&&me.error!=='not-allowed'?me.error:'not-allowed'),{email:me.email||info.email});
          }
          save({token:resp.access_token, exp, email:me.email, pages:me.pages, name:info.name||'', picture:info.picture||''});
          p&&p.resolve(session);
        }catch(e){ p&&p.reject(e); }
      },
      error_callback:err=>{ const p=pending;pending=null; p&&p.reject(new Error(err.type==='popup_closed'?'popup_closed':(err.message||'Sign-in failed'))); }
    });
  }
  // Must be called from a click (Google opens a pop-up)
  function signIn(prompt){
    return new Promise((resolve,reject)=>{
      pending={resolve,reject};
      tokenClient.requestAccessToken({prompt:prompt||'', hint:session&&session.email||undefined});
    });
  }
  function signOut(){
    if(session&&window.google&&google.accounts) google.accounts.oauth2.revoke(session.token,()=>{});
    save(null); location.reload();
  }

  /* Read a whole tab of a centre's receipts sheet as rows of text, the same way it looks in the sheet */
  async function fetchRows(centre,tab){
    if(!session||session.exp<Date.now()+30000){ save(null); showGate('expired'); throw new Error('Your session has expired — sign in again'); }
    const j=await service({action:'rows',centre,tab});
    if(j.error==='expired'){ save(null); showGate('expired'); throw new Error('Your session has expired — sign in again'); }
    if(j.error==='not-allowed') throw new Error("You don't have access to this data");
    if(j.error) throw new Error(j.error);
    return (j.rows||[]).map(row=>row.map(v=>String(v).trim()));
  }

  window.ArtiumAuth={
    get user(){return session;},
    get pages(){return session&&session.pages||[];},
    fetchRows, signOut,
    // Any other request to the data service, e.g. call('initiatives') or call('saveInitiative',{item})
    async call(action,body){
      if(!session||session.exp<Date.now()+30000){ save(null); showGate('expired'); throw new Error('Your session has expired — sign in again'); }
      const j=await service(Object.assign({action},body||{}));
      if(j.error==='expired'){ save(null); showGate('expired'); throw new Error('Your session has expired — sign in again'); }
      if(j.error==='not-allowed') throw new Error("You don't have access to this");
      if(j.error) throw new Error(j.error);
      return j;
    },
    // Teachers per centre and course (counts only), from the Basic Information sheet
    async teachers(){ const j=await service({action:'teachers'}); if(j.error) throw new Error(j.error==='expired'?'Your session has expired — sign in again':j.error); return j.teachers||{}; },
    onReady(fn){ session?fn(session):listeners.push(fn); }
  };

  /* ── Sign-in screen ── */
  const G='<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
  const css=`
  .ag{position:fixed;inset:0;z-index:50;display:grid;place-items:center;padding:24px;background:#F6F5F2;
    background-image:radial-gradient(1200px 600px at 50% -10%,#EFE6F7 0%,rgba(239,230,247,0) 60%);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
  .ag[hidden]{display:none}
  .tab[hidden]{display:none!important}
  .ag-card{width:100%;max-width:420px;background:#fff;border:1px solid #E4E1EA;border-radius:24px;padding:40px 36px 32px;text-align:center;
    box-shadow:inset 0 3px 0 #A8844F,0 1px 2px rgba(31,26,36,.04),0 24px 48px -28px rgba(75,31,111,.35)}
  .ag-eyebrow{font:700 11px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#A8844F}
  .ag-title{font:600 30px/1.2 'Poppins',sans-serif;letter-spacing:-.015em;color:#1D1B22;margin:10px 0 8px}
  .ag-sub{font-size:15px;line-height:1.5;color:#6B6774;margin:0 auto 28px;max-width:300px}
  .ag-btn{display:inline-flex;align-items:center;justify-content:center;gap:12px;width:100%;height:48px;border:1px solid #DADCE0;border-radius:999px;background:#fff;
    font:500 15px 'Poppins',sans-serif;color:#1F1F1F;cursor:pointer;transition:background .15s,box-shadow .15s}
  .ag-btn:hover{background:#F8F7FA;box-shadow:0 2px 8px rgba(31,26,36,.08)}
  .ag-btn:disabled{opacity:.6;cursor:default}
  .ag-msg{min-height:20px;margin-top:16px;font-size:13.5px;line-height:1.45;color:#B42318}
  .ag-foot{margin-top:18px;padding-top:18px;border-top:1px solid #EFEDF2;font-size:12.5px;color:#9A96A3}
  .ag-foot b{color:#6B6774;font-weight:600}
  .user-menu{margin-left:auto;position:relative;flex-shrink:0}
  .um-av{display:grid;place-items:center;width:34px;height:34px;padding:0;border:0;border-radius:50%;background:#E8762E;color:#fff;font:600 14px 'Poppins',sans-serif;cursor:pointer;overflow:hidden;
    box-shadow:0 0 0 2px rgba(255,255,255,.14);transition:box-shadow .2s}
  .um-av img{width:100%;height:100%;object-fit:cover}
  .um-av:hover{box-shadow:0 0 0 2px rgba(226,196,138,.6)}
  .um-av[aria-expanded="true"]{box-shadow:0 0 0 2px #E2C48A}
  .um-av:focus-visible{outline:2px solid #E2C48A;outline-offset:2px}
  .um-pop{position:absolute;right:-6px;top:calc(100% + 14px);z-index:60;width:290px;background:#fff;border:1px solid #E4E1EA;border-radius:16px;padding:18px;
    box-shadow:0 24px 50px -20px rgba(40,20,60,.45);opacity:0;transform:translateY(-6px);pointer-events:none;transition:opacity .18s,transform .18s}
  .um-pop.open{opacity:1;transform:none;pointer-events:auto}
  .um-pop::before{content:"";position:absolute;top:-7px;right:17px;width:12px;height:12px;background:#fff;border-left:1px solid #E4E1EA;border-top:1px solid #E4E1EA;transform:rotate(45deg)}
  .um-who{display:flex;gap:12px;align-items:center;min-width:0}
  .um-who .um-av{width:44px;height:44px;font-size:18px;flex:none;cursor:default;box-shadow:none}
  .um-n{font:600 15px 'Poppins',sans-serif;color:#1D1B22;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .um-e{font:400 12.5px 'Poppins',sans-serif;color:#6B6774;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .um-pop hr{border:0;border-top:1px solid #EFEDF2;margin:14px 0}
  .um-out{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;height:40px;border-radius:11px;border:1px solid #E4E1EA;background:#FAF9F7;
    font:600 13px 'Poppins',sans-serif;color:#B42318;cursor:pointer;transition:background .15s,border-color .15s}
  .um-out:hover{background:#FDECEB;border-color:#F5C6C2}`;
  function el(html){const d=document.createElement('div');d.innerHTML=html.trim();return d.firstChild;}

  let gate;
  function showGate(reason){
    if(!gate){
      if(!document.querySelector('link[href*="Poppins"]'))document.head.appendChild(el('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600&display=swap">'));
      gate=el(`<div class="ag" role="dialog" aria-labelledby="ag-title">
        <div class="ag-card">
          <div class="ag-eyebrow">Artium Academy</div>
          <h1 class="ag-title" id="ag-title">Offline Intelligence</h1>
          <p class="ag-sub">Sign in to view the centre dashboards.</p>
          <button class="ag-btn" id="ag-btn">${G}<span>Sign in with Google</span></button>
          <div class="ag-msg" id="ag-msg" role="alert"></div>
          <div class="ag-foot">Access is limited to approved <b>@${DOMAIN}</b> accounts.</div>
        </div></div>`);
      document.body.appendChild(gate);
      const btn=gate.querySelector('#ag-btn'),msg=gate.querySelector('#ag-msg');
      initClient().catch(e=>{msg.textContent=e.message;});
      btn.onclick=async()=>{
        msg.textContent='';btn.disabled=true;
        try{ await initClient(); await signIn(session?'':'select_account'); hideGate(); }
        catch(e){
          if(e.message==='not-allowed') msg.textContent=(e.email||'This account')+" doesn't have access.";
          else if(e.message!=='popup_closed') msg.textContent=e.message;
        }
        btn.disabled=false;
      };
    }
    gate.querySelector('#ag-msg').textContent=reason==='expired'?'Your session has expired. Please sign in again.':'';
    gate.hidden=false;
  }
  function hideGate(){
    if(gate) gate.hidden=true;
    const pages=session.pages||[];
    document.querySelectorAll('.tab[data-tab]').forEach(t=>{ t.hidden=!pages.includes(t.dataset.tab); });
    showUser();
    listeners.splice(0).forEach(fn=>fn(session));
  }
  function showUser(){
    const bar=document.querySelector('.shell-bar');if(!bar||!session||bar.querySelector('.user-menu'))return;
    const esc=t=>String(t||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const initial=esc((session.name||session.email||'?').trim().charAt(0).toUpperCase());
    const face=session.picture?`<img src="${esc(session.picture)}" alt="" referrerpolicy="no-referrer">`:initial;
    const menu=el(`<div class="user-menu">
      <button class="um-av" type="button" aria-haspopup="dialog" aria-expanded="false" aria-label="Account">${face}</button>
      <div class="um-pop" role="dialog" aria-label="Account">
        <div class="um-who"><span class="um-av">${face}</span><div style="min-width:0">${session.name?`<div class="um-n">${esc(session.name)}</div>`:''}<div class="um-e">${esc(session.email)}</div></div></div>
        <hr><button class="um-out" type="button"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11"/></svg>Sign out</button>
      </div></div>`);
    const btn=menu.querySelector('.um-av'),pop=menu.querySelector('.um-pop');
    const set=open=>{pop.classList.toggle('open',open);btn.setAttribute('aria-expanded',open);};
    btn.onclick=e=>{e.stopPropagation();set(!pop.classList.contains('open'));};
    menu.querySelector('.um-out').onclick=signOut;
    document.addEventListener('click',e=>{if(!menu.contains(e.target))set(false);});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')set(false);});
    window.addEventListener('blur',()=>set(false));   // a click inside a page (iframe) also closes it
    bar.appendChild(menu);
  }
  async function start(){
    // Styles for the sign-in screen and the name in the top bar (needed even when already signed in)
    document.head.appendChild(Object.assign(document.createElement('style'),{textContent:css}));
    if(!session) return showGate();
    // Already signed in this session: re-check which pages this person may open, so changes in the
    // Basic Information sheet (e.g. a newly added page) apply without signing out
    try{
      const me=await service({action:'me'});
      if(me.error==='expired'){ save(null); return showGate('expired'); }
      if(me.error||!me.pages||!me.pages.length){ save(null); return showGate(); }
      save(Object.assign({},session,{pages:me.pages}));
    }catch(e){ /* service unreachable: keep the pages from sign-in */ }
    hideGate();
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start):start();
})();
