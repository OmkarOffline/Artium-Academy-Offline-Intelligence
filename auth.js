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
  const PAGE_OF={'start.html':'start','home.html':'home','daily.html':'daily','pipeline.html':'pipeline','admissions.html':'admissions','targets.html':'targets','dfd.html':'centres','dashboard.html':'dashboard','performance.html':'performance','mom.html':'mom','review.html':'review','learners.html':'learners','teachers.html':'teachers','courses.html':'courses','stats.html':'stats','analysis.html':'analysis','focus.html':'focus','calendar.html':'calendar','planner.html':'planner','goals.html':'goals','checkins.html':'checkins','collections.html':'collections','updates.html':'updates','spotlight.html':'spotlight','texp.html':'texp'};

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
  let session=null, tokenClient=null, pending=null, ready=false;
  const listeners=[];
  // Signed in for 8 hours since the last use of the site (the data service renews the pass on every request).
  // Kept in this browser (localStorage), so new tabs and restarts stay signed in.
  const stored=()=>{ try{ const s=JSON.parse(localStorage.getItem(KEY)||'null'); return s&&s.exp>Date.now()+60000?s:null; }catch(e){ return null; } };
  session=stored();
  // Another tab may have renewed the pass: use the newest one
  function fresh(){ const s=stored(); if(s&&(!session||s.exp>session.exp)) session=s; return session&&session.exp>Date.now()+30000; }

  async function service(body){
    const fresh=window.ArtiumAuth&&ArtiumAuth.freshUntil>Date.now();   // just after the refresh button: skip the data service's short-term copy
    const r=await fetch(SERVICE_URL,{method:'POST',body:JSON.stringify(Object.assign({token:session&&session.token},fresh?{fresh:true}:{},body))});
    if(!r.ok) throw new Error('Could not reach the data service ('+r.status+')');
    const j=await r.json();
    if(j&&j.session&&j.session.token&&session){ session=Object.assign({},session,{token:j.session.token,exp:+j.session.exp}); if(session.email) save(session); }
    return j;
  }
  function save(s){ session=s; try{ s?localStorage.setItem(KEY,JSON.stringify(s)):localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); }catch(e){} }

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
          save({token:session.token, exp:session.exp, email:me.email, pages:me.pages, name:info.name||'', picture:info.picture||''});   // session now holds the 8-hour pass from the data service
          google.accounts.oauth2.revoke(resp.access_token,()=>{});   // Google's token isn't needed any more
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
    save(null); location.reload();
  }

  /* Read a whole tab of a centre's receipts sheet as rows of text, the same way it looks in the sheet */
  async function fetchRows(centre,tab){
    if(!fresh()){ save(null); showGate('expired'); throw new Error('Your session has expired — sign in again'); }
    const j=await service({action:'rows',centre,tab});
    if(j.error==='expired'){ save(null); showGate('expired'); throw new Error('Your session has expired — sign in again'); }
    if(j.error==='not-allowed') throw new Error("You don't have access to this data");
    if(j.error) throw new Error(j.error);
    return (j.rows||[]).map(row=>row.map(v=>String(v).trim()));
  }

  // Profile photos: the ones people upload (kept by the data service), then any kept in the photos folder.
  // Used for the signed-in person and wherever someone appears as an owner.
  const PHOTOS={'omkar@artiumacademy.com':'photos/omkar.jpg'};
  const PKEY='artium_photos';
  let UP=(()=>{try{return JSON.parse(localStorage.getItem(PKEY)||'{}')||{};}catch(e){return{};}})();
  const photoOf=e=>{e=String(e||'').trim().toLowerCase();return UP[e]||PHOTOS[e]||'';};
  function setPhotos(p){
    UP=p||{};try{localStorage.setItem(PKEY,JSON.stringify(UP));}catch(e){}
    paintMe();
    // let the open pages redraw their owner pictures
    document.querySelectorAll('iframe').forEach(f=>{try{f.contentWindow.dispatchEvent(new Event('artium-photos'));}catch(e){}});
  }
  async function loadPhotos(){ try{ const j=await service({action:'photos'}); if(j&&j.photos) setPhotos(j.photos); }catch(e){} }
  window.ArtiumAuth={
    photo:photoOf,
    freshUntil:0,
    get user(){return session;},
    get pages(){return session&&session.pages||[];},
    fetchRows, signOut,
    // Any other request to the data service, e.g. call('initiatives') or call('saveInitiative',{item})
    async call(action,body){
      if(!fresh()){ save(null); showGate('expired'); throw new Error('Your session has expired — sign in again'); }
      const j=await service(Object.assign({action},body||{}));
      if(j.error==='expired'){ save(null); showGate('expired'); throw new Error('Your session has expired — sign in again'); }
      if(j.error==='not-allowed') throw new Error("You don't have access to this");
      if(j.error) throw new Error(j.error);
      return j;
    },
    // Teachers per centre and course (counts only), from the Basic Information sheet
    async teachers(){ const j=await service({action:'teachers'}); if(j.error) throw new Error(j.error==='expired'?'Your session has expired — sign in again':j.error); return j.teachers||{}; },
    // Runs once sign-in is confirmed and the page list is fresh from the access sheet (not the copy saved at the last sign-in)
    onReady(fn){ ready?fn(session):listeners.push(fn); }
  };

  /* ── Sign-in screen ── */
  const G='<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
  const IUP='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H8l1.5-2h5L16 6h1.5A2.5 2.5 0 0 1 20 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5z"/><circle cx="12" cy="12.5" r="3.5"/></svg>';
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
  .um-out:hover{background:#FDECEB;border-color:#F5C6C2}
  .um-ph{display:flex;gap:8px;margin-top:14px}
  .um-ph button{flex:1;display:flex;align-items:center;justify-content:center;gap:7px;height:36px;border-radius:10px;border:1px solid #E4E1EA;background:#fff;font:600 12.5px 'Poppins',sans-serif;color:#3B3742;cursor:pointer;transition:background .15s,color .15s,border-color .15s}
  .um-ph button:hover{background:#F2ECF8;border-color:#DCCDEE;color:#5B2A86}
  .um-ph button[hidden]{display:none}
  .um-who .um-av{position:relative}
  .pc{position:fixed;inset:0;z-index:80;display:grid;place-items:center;padding:20px;background:rgba(29,20,40,.55);backdrop-filter:blur(3px);font-family:'Poppins',sans-serif}
  .pc-card{width:100%;max-width:380px;background:#fff;border-radius:22px;padding:24px 24px 20px;box-shadow:0 30px 70px -20px rgba(30,15,45,.6)}
  .pc-card h3{margin:0;font:600 19px 'Poppins',sans-serif;color:#1D1B22}
  .pc-card p{margin:4px 0 16px;font:400 13px/1.45 'Poppins',sans-serif;color:#6B6774}
  .pc-stage{position:relative;width:280px;height:280px;margin:0 auto;border-radius:16px;overflow:hidden;background:#1D1B22;touch-action:none;cursor:grab;user-select:none}
  .pc-stage.drag{cursor:grabbing}
  .pc-stage img{position:absolute;left:0;top:0;transform-origin:0 0;max-width:none;pointer-events:none}
  .pc-ring{position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 50%,rgba(0,0,0,0) 119px,rgba(255,255,255,.9) 120px,rgba(255,255,255,.9) 121.5px,rgba(20,12,30,.6) 122px)}
  .pc-zoom{display:flex;align-items:center;gap:10px;margin:16px 4px 0;color:#9A96A3}
  .pc-zoom input{flex:1;accent-color:#5B2A86}
  .pc-msg{min-height:18px;margin-top:10px;font-size:12.5px;color:#B42318;text-align:center}
  .pc-btns{display:flex;justify-content:flex-end;gap:8px;margin-top:8px}
  .pc-btns button{height:40px;padding:0 18px;border-radius:11px;border:1px solid #E4E1EA;background:#fff;font:600 13px 'Poppins',sans-serif;color:#3B3742;cursor:pointer}
  .pc-btns .go{background:#5B2A86;border-color:#5B2A86;color:#fff}.pc-btns .go:disabled{opacity:.6;cursor:default}
  .um-avw{position:relative;display:inline-block}
  .um-cam{position:absolute;right:-4px;bottom:-3px;width:18px;height:18px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#6601fd,#4101f7);color:#fff;box-shadow:0 0 0 2px #fff;pointer-events:none}
  .um-cam svg{width:10px;height:10px}
  .um-bigw{position:relative;flex:none;padding:0;border:0;background:none;border-radius:50%;cursor:pointer}
  .um-who .um-big{width:56px;height:56px;font-size:22px;box-shadow:0 0 0 3px #fff,0 0 0 4.5px #d9c9fb;cursor:pointer}
  .um-ov{position:absolute;inset:0;border-radius:50%;display:grid;place-items:center;background:rgba(18,14,43,.45);color:#fff;opacity:0;transition:opacity .15s}
  .um-ov svg{width:20px;height:20px}
  .um-bigw:hover .um-ov,.um-bigw:focus-visible .um-ov{opacity:1}
  .um-ph{flex-direction:column;gap:6px}.um-ph button{flex:none}
  .um-ph .um-up{height:40px;border:0;background:linear-gradient(135deg,#6601fd,#4101f7);color:#fff;box-shadow:0 10px 20px -12px rgba(65,1,247,.9)}
  .um-ph .um-up svg{width:15px;height:15px}
  .um-ph .um-up:hover{background:linear-gradient(135deg,#7414ff,#4a0dff);color:#fff;border-color:transparent}
  .um-ph .um-rm{flex:none;height:30px;border:0;background:none;color:#6a6488;font-size:12px}.um-ph .um-rm:hover{background:#F4F1FB;color:#4101f7}`;
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
    loadPhotos();
    ready=true;
    listeners.splice(0).forEach(fn=>fn(session));
  }
  function showUser(){
    const bar=document.querySelector('.shell-bar');if(!bar||!session||bar.querySelector('.user-menu'))return;
    const esc=t=>String(t||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const face='';
    const menu=el(`<div class="user-menu">
      <span class="um-avw"><button class="um-av" type="button" aria-haspopup="dialog" aria-expanded="false" aria-label="Account and profile photo">${face}</button><span class="um-cam" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h3l2-3h8l2 3h3v11H3z"/><circle cx="12" cy="13" r="3.5"/></svg></span></span>
      <div class="um-pop" role="dialog" aria-label="Account">
        <div class="um-who"><button type="button" class="um-bigw" title="Change profile photo"><span class="um-av um-big">${face}</span><span class="um-ov"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h3l2-3h8l2 3h3v11H3z"/><circle cx="12" cy="13" r="3.5"/></svg></span></button><div style="min-width:0">${session.name?`<div class="um-n">${esc(session.name)}</div>`:''}<div class="um-e">${esc(session.email)}</div></div></div>
        <div class="um-ph"><button type="button" class="um-up"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h3l2-3h8l2 3h3v11H3z"/><circle cx="12" cy="13" r="3.5"/></svg><span>Upload a photo</span></button><button type="button" class="um-rm" hidden>Remove photo</button></div>
        <input type="file" accept="image/*" class="um-file" hidden>
        <hr><button class="um-out" type="button"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11"/></svg>Sign out</button>
      </div></div>`);
    const btn=menu.querySelector('.um-av'),pop=menu.querySelector('.um-pop');
    const set=open=>{pop.classList.toggle('open',open);btn.setAttribute('aria-expanded',open);};
    btn.onclick=e=>{e.stopPropagation();set(!pop.classList.contains('open'));};
    bar.classList.add('um-bar');bar.insertAdjacentHTML('beforeend','<span class="um-chev" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg></span>');
    bar.addEventListener('click',e=>{if(pop.contains(e.target)||e.target.closest('.um-av'))return;e.stopPropagation();set(!pop.classList.contains('open'));});
    menu.querySelector('.um-out').onclick=signOut;
    const file=menu.querySelector('.um-file');
    menu.querySelector('.um-up').onclick=()=>{file.value='';file.click();};
    menu.querySelector('.um-bigw').onclick=()=>{file.value='';file.click();};
    file.onchange=()=>{const f=file.files&&file.files[0];if(f){set(false);cropPhoto(f);}};
    menu.querySelector('.um-rm').onclick=async e=>{const b=e.currentTarget;b.disabled=true;
      try{const j=await service({action:'savePhoto',photo:''});if(j.error)throw new Error(j.error);setPhotos(j.photos);}catch(err){alert(err.message);}b.disabled=false;};
    document.addEventListener('click',e=>{if(!menu.contains(e.target))set(false);});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')set(false);});
    window.addEventListener('blur',()=>set(false));   // a click inside a page (iframe) also closes it
    bar.appendChild(menu);
    paintMe();
  }
  // The signed-in person's picture: their uploaded photo, else one in the photos folder, else Google's, else their initial
  function paintMe(){
    const menu=document.querySelector('.shell-bar .user-menu');if(!menu||!session)return;
    const e=String(session.email||'').toLowerCase(),pic=photoOf(e)||session.picture;
    const initial=String(session.name||session.email||'?').trim().charAt(0).toUpperCase();
    menu.querySelectorAll('.um-av').forEach(a=>{a.textContent='';if(pic){const i=document.createElement('img');i.alt='';i.referrerPolicy='no-referrer';i.src=pic;a.appendChild(i);}else a.textContent=initial;});
    menu.querySelector('.um-up span').textContent=UP[e]?'Change profile photo':'Upload a profile photo';
    menu.querySelector('.um-rm').hidden=!UP[e];
  }
  /* Crop a chosen photo to a circle: drag to place the face, slide to zoom, then save a small square JPEG */
  function cropPhoto(f){
    const url=URL.createObjectURL(f);
    const box=el(`<div class="pc" role="dialog" aria-label="Your photo"><div class="pc-card">
      <h3>Your photo</h3><p>Drag to place your face inside the circle, and zoom if you need to.</p>
      <div class="pc-stage"><img alt=""><div class="pc-ring"></div></div>
      <div class="pc-zoom"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/></svg><input type="range" min="1" max="4" step="0.01" value="1" aria-label="Zoom"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/></svg></div>
      <div class="pc-msg" role="alert"></div>
      <div class="pc-btns"><button type="button" class="no">Cancel</button><button type="button" class="go" disabled>Save photo</button></div></div></div>`);
    document.body.appendChild(box);
    const st=box.querySelector('.pc-stage'),img=st.querySelector('img'),zoom=box.querySelector('input'),msg=box.querySelector('.pc-msg'),go=box.querySelector('.go');
    const S=280,R=20,D=S-2*R;   // stage, ring inset, circle size
    let base=1,z=1,x=0,y=0,w=0,h=0;
    const close=()=>{URL.revokeObjectURL(url);box.remove();document.removeEventListener('keydown',key);};
    const key=e=>{if(e.key==='Escape')close();};document.addEventListener('keydown',key);
    box.querySelector('.no').onclick=close;box.onclick=e=>{if(e.target===box)close();};
    // keep the circle covered by the photo
    const clamp=()=>{const k=base*z;x=Math.min(R,Math.max(R+D-w*k,x));y=Math.min(R,Math.max(R+D-h*k,y));img.style.transform=`translate(${x}px,${y}px) scale(${k})`;};
    img.onload=()=>{w=img.naturalWidth;h=img.naturalHeight;base=D/Math.min(w,h);x=R+(D-w*base)/2;y=R+(D-h*base)/2;clamp();go.disabled=false;};
    img.onerror=()=>{msg.textContent='This photo could not be opened. Please try a JPG or PNG.';};
    img.src=url;
    zoom.oninput=()=>{const k0=base*z,cx=S/2,cy=S/2;z=+zoom.value;const k=base*z;x=cx-(cx-x)*k/k0;y=cy-(cy-y)*k/k0;clamp();};
    let drag=null;
    st.addEventListener('pointerdown',e=>{if(!w)return;drag={px:e.clientX,py:e.clientY,x,y};st.setPointerCapture(e.pointerId);st.classList.add('drag');});
    st.addEventListener('pointermove',e=>{if(!drag)return;x=drag.x+e.clientX-drag.px;y=drag.y+e.clientY-drag.py;clamp();});
    const up=()=>{drag=null;st.classList.remove('drag');};st.addEventListener('pointerup',up);st.addEventListener('pointercancel',up);
    st.addEventListener('wheel',e=>{if(!w)return;e.preventDefault();zoom.value=Math.min(4,Math.max(1,z-e.deltaY/400));zoom.oninput();},{passive:false});
    go.onclick=async()=>{
      go.disabled=true;msg.textContent='';go.textContent='Saving…';
      try{
        const k=base*z,out=256,c=document.createElement('canvas');c.width=c.height=out;
        const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,out,out);g.imageSmoothingQuality='high';
        g.drawImage(img,(R-x)/k,(R-y)/k,D/k,D/k,0,0,out,out);
        let q=.88,data=c.toDataURL('image/jpeg',q);
        while(data.length>46000&&q>.4){q-=.08;data=c.toDataURL('image/jpeg',q);}
        const j=await service({action:'savePhoto',photo:data});
        if(j.error) throw new Error(j.error==='expired'?'Your session has expired. Please sign in again.':j.error);
        setPhotos(j.photos);close();
      }catch(err){msg.textContent=err.message;go.disabled=false;go.textContent='Save photo';}
    };
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
