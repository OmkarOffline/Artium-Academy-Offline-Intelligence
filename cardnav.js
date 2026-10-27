/* ── Card landing for pages with several sections (Statistics, Monthly Active Learners) ──
   The page lands on one 3:4 card per section, each with a short preview. Clicking a card opens
   that section on its own, with "All sections" to go back (the browser's back button works too).
   Usage: CardNav.init({cards:[{id:'sec-x', k:'Kicker', short:'One line', icon:'<path…/>', preview:()=>[[label,value],…]}]})
   and call CardNav.refresh() at the end of the page's render(). */
(function(){
  const css=`
  .cn-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,300px));gap:24px}
  .cn-card{position:relative;aspect-ratio:3/4;display:flex;flex-direction:column;border:1px solid #E6E1EC;border-radius:24px;padding:24px;cursor:pointer;text-align:left;overflow:hidden;
    background:linear-gradient(180deg,#fff 0%,#FBF9FD 100%);box-shadow:0 1px 0 rgba(255,255,255,.9) inset,0 24px 44px -32px rgba(75,31,111,.35);transition:transform .2s,box-shadow .2s,border-color .2s;font:inherit;color:inherit}
  .cn-card:hover{transform:translateY(-3px);border-color:#D8CBE8;box-shadow:0 30px 50px -30px rgba(75,31,111,.45)}
  .cn-card:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
  .cn-card::before{content:"";position:absolute;inset:0 0 auto 0;height:4px;background:linear-gradient(90deg,#C9A66B,var(--gold))}
  .cn-card .art{position:absolute;right:-30px;top:-30px;width:170px;height:170px;opacity:.55;pointer-events:none}
  .cn-card .ic{position:relative;flex:none;width:46px;height:46px;border-radius:14px;display:grid;place-items:center;background:var(--accent);color:#fff;box-shadow:0 10px 20px -10px rgba(91,42,134,.7)}
  .cn-card .ic svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
  .cn-card .k{position:relative;margin-top:22px;font:700 10.5px/1 var(--body);letter-spacing:.16em;text-transform:uppercase;color:var(--gold)}
  .cn-card h3{position:relative;margin-top:8px;font:600 21px/1.25 var(--display);letter-spacing:-.01em;color:var(--ink)}
  .cn-card p{position:relative;margin-top:8px;font-size:13px;line-height:1.5;color:var(--muted)}
  .cn-card .pv{position:relative;margin-top:auto;display:flex;flex-direction:column;gap:9px;padding-top:18px;border-top:1px dashed #E4DEEB}
  .cn-card .pr{display:flex;align-items:baseline;gap:10px;font-size:13px}
  .cn-card .pr span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ink2)}
  .cn-card .pr b{font:600 13px var(--display);color:var(--accent);font-variant-numeric:tabular-nums;white-space:nowrap}
  .cn-card .go{position:relative;display:flex;align-items:center;justify-content:space-between;margin-top:16px;font:600 13px var(--body);color:var(--accent)}
  .cn-card .go span{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:var(--accent-soft);transition:background .2s,color .2s}
  .cn-card:hover .go span{background:var(--accent);color:#fff}
  .cn-back{display:flex;width:max-content;align-items:center;gap:8px;border:1px solid var(--border);background:#fff;border-radius:999px;padding:7px 14px 7px 10px;font:600 13px var(--body);color:var(--ink2);cursor:pointer;margin-bottom:18px;box-shadow:var(--shadow)}
  .cn-back:hover{background:var(--accent-soft);color:var(--accent);border-color:#E0D4EE}
  body.cn-landing section.tray[data-cn]{display:none}
  body.cn-sub section.tray[data-cn]:not(.cn-on){display:none}
  body.cn-sub section.tray.cn-on .tray-body{display:block!important}
  body.cn-sub section.tray.cn-on .chev{display:none}
  body.cn-sub section.tray.cn-on .tray-head{cursor:default}
  body.cn-sub section.tray.cn-on .tray-title{font-size:26px}
  body.cn-sub .cn-cards,body.cn-landing .cn-back{display:none}
  @media (max-width:900px){.cn-cards{grid-template-columns:1fr 1fr;gap:14px}.cn-card{padding:18px;border-radius:20px}.cn-card h3{font-size:17px}.cn-card p{display:none}}
  @media (max-width:520px){.cn-cards{grid-template-columns:1fr}.cn-card{aspect-ratio:auto;min-height:340px}}`;
  const ART='<svg class="art" viewBox="0 0 170 170" aria-hidden="true"><g fill="none" stroke="#C9A66B" stroke-width=".8">'+[...Array(9)].map((_,i)=>`<circle cx="120" cy="50" r="${14+i*11}" opacity="${(0.9-i*0.08).toFixed(2)}"/>`).join('')+'</g><g fill="#B79BD6">'+[...Array(7)].map((_,i)=>`<circle cx="${40+i*16}" cy="${150-i*13}" r="2"/>`).join('')+'</g></svg>';
  const ARROW='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const esc=t=>String(t==null?'':t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let CARDS=[],box=null,back=null,openId=null;

  function show(){
    document.body.classList.toggle('cn-landing',!openId);
    document.body.classList.toggle('cn-sub',!!openId);
    CARDS.forEach(c=>{const s=document.getElementById(c.id);if(s)s.classList.toggle('cn-on',c.id===openId);});
    if(openId){const s=document.getElementById(openId);if(s){s.classList.remove('closed');s.parentNode.insertBefore(back,s);}}
    if(typeof window.navState==='function')requestAnimationFrame(window.navState);   // Statistics: record arrows need the section visible
  }
  function go(id){openId=id;history.pushState(null,'',id?'#'+id.replace(/^sec-/,''):location.pathname+location.search);show();window.scrollTo(0,0);}
  function fromHash(){const h=location.hash.slice(1);const c=CARDS.find(c=>c.id==='sec-'+h||c.id===h);openId=c?c.id:null;}

  function refresh(){
    if(!box)return;
    box.innerHTML=CARDS.map(c=>{
      const s=document.getElementById(c.id),title=c.title||(s&&s.querySelector('.tray-title')||{}).textContent||'';
      let rows=null;try{rows=c.preview&&c.preview();}catch(e){rows=null;}
      const pv=!rows?'<div class="pr"><span style="color:var(--faint)">Loading…</span></div>':!rows.length?'<div class="pr"><span style="color:var(--faint)">No entries yet</span></div>'
        :rows.slice(0,3).map(([l,v])=>`<div class="pr"><span>${esc(l)}</span><b>${esc(v)}</b></div>`).join('');
      return `<button type="button" class="cn-card" data-id="${c.id}" aria-label="${esc(title)}">${ART}
        <div class="ic"><svg viewBox="0 0 24 24">${c.icon}</svg></div>
        <div class="k">${esc(c.k)}</div><h3>${esc(title)}</h3><p>${esc(c.short)}</p>
        <div class="pv">${pv}</div>
        <div class="go">${esc(c.go||'Open')}<span>${ARROW}</span></div></button>`;}).join('');
    box.querySelectorAll('.cn-card').forEach(b=>b.onclick=()=>go(b.dataset.id));
  }

  function init(opts){
    CARDS=opts.cards;
    document.head.appendChild(Object.assign(document.createElement('style'),{textContent:css}));
    CARDS.forEach(c=>{const s=document.getElementById(c.id);if(s)s.setAttribute('data-cn','');});
    const first=document.getElementById(CARDS[0].id);
    box=document.createElement('div');box.className='cn-cards';first.parentNode.insertBefore(box,first);
    back=document.createElement('button');back.type='button';back.className='cn-back';
    back.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>'+esc(opts.back||'All sections');
    back.onclick=()=>{if(location.hash&&history.length>1)history.back();else go(null);};
    window.addEventListener('popstate',()=>{fromHash();show();});
    fromHash();refresh();show();
  }
  window.CardNav={init,refresh};
})();
