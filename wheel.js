/* Analysis wheel — a floating "Analyse" button that opens a wheel of breakdowns (by course, teacher, course level, age group, gender…).
   Picking a slice slides a table in at the top of the page: this month so far and last month side by side, then the last 3, 6 and 12 months and lifetime.
   Each page tells the wheel which slices it has and how to fill each table:
     ArtiumWheel.mount({hub:'Renewals', anchor:()=>element the table appears above, slices:['course','teacher',…], table:k=>spec or null});
   and calls ArtiumWheel.refresh() whenever its centre or period changes. Used on Renewal Pipeline, Admissions Pipeline, Daily Tracker and Monthly Active Learners. */
(function(){
const CSS=`
.aw-fab{position:fixed;right:30px;bottom:30px;width:60px;height:60px;border-radius:50%;border:0;cursor:pointer;z-index:940;color:#fff;padding:0;
  background:radial-gradient(circle at 30% 25%,#8B5CFF,#4101F7 60%,#2D0B9E);box-shadow:0 18px 36px -14px rgba(65,1,247,.8),0 0 0 6px rgba(65,1,247,.08);transition:transform .3s}
.aw-fab:hover{transform:scale(1.06)}
.aw-fab svg{position:absolute;left:16px;top:16px;width:28px;height:28px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;transition:transform .4s cubic-bezier(.2,.9,.25,1.2),opacity .25s}
.aw-fab .ix{opacity:0;transform:rotate(-90deg) scale(.6)}.aw-fab.on .ia{opacity:0;transform:rotate(90deg) scale(.6)}.aw-fab.on .ix{opacity:1;transform:none}
.aw-fab .lb{position:absolute;right:72px;top:50%;transform:translateY(-50%);background:#01073C;color:#fff;font:600 12.5px 'Onest',system-ui,sans-serif;padding:7px 11px;border-radius:10px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .2s}
.aw-fab:hover .lb{opacity:1}.aw-fab.on .lb{opacity:0}
.aw-veil{position:fixed;inset:0;background:rgba(251,250,255,.55);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);opacity:0;pointer-events:none;transition:opacity .3s;z-index:920}
.aw-veil.on{opacity:1;pointer-events:auto}
.aw-wheel{position:fixed;left:50%;top:50%;width:560px;height:560px;margin:-280px 0 0 -280px;z-index:930;pointer-events:none;transform:scale(.15) rotate(-70deg);opacity:0;transform-origin:center;transition:transform .55s cubic-bezier(.2,.9,.25,1.12),opacity .25s}
.aw-wheel.on{transform:none;opacity:1;pointer-events:auto}
@media (max-width:620px),(max-height:620px){.aw-wheel.on{transform:scale(.62)}}
.aw-wheel svg.w{width:100%;height:100%;overflow:visible;filter:drop-shadow(0 34px 60px rgba(1,7,60,.22))}
.aw-wheel .seg-p{fill:#fff;stroke:#EDE7FA;stroke-width:3;cursor:pointer;transition:fill .2s}
.aw-wheel .wedge:hover .seg-p,.aw-wheel .wedge.sel .seg-p{fill:url(#aw-wv)}
.aw-wheel .art{pointer-events:none;transition:transform .35s cubic-bezier(.2,.9,.25,1.3);transform-box:fill-box;transform-origin:50% 100%}
.aw-wheel .wedge:hover .art{transform:translateY(-4px) scale(1.06)}
.aw-wheel text.t1{pointer-events:none;font-family:'Onest',system-ui,sans-serif;text-anchor:middle;font-size:14.5px;font-weight:700;fill:#01073C;transition:fill .2s}
.aw-wheel .wedge:hover .t1,.aw-wheel .wedge.sel .t1{fill:#fff}
.aw-wheel .hub{fill:#fff;cursor:pointer}
.aw-wheel .hubr{fill:none;stroke:#C9B8FF;stroke-width:1.6;stroke-dasharray:2 7;transform-origin:280px 280px;animation:aw-spin 30s linear infinite}
.aw-wheel .hubt{font-family:'Onest',system-ui,sans-serif;text-anchor:middle;pointer-events:none;transition:opacity .25s}
.aw-wheel .hubScene{pointer-events:none}.aw-wheel .hubScene .in{animation:aw-pop .45s cubic-bezier(.2,.9,.25,1.3) both}
@keyframes aw-spin{to{transform:rotate(360deg)}}
@keyframes aw-pop{from{opacity:0;transform:translateY(8px) scale(.9)}to{opacity:1;transform:none}}
.aw-bob{animation:aw-bob 1.6s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}@keyframes aw-bob{50%{transform:translateY(-4px)}}
.aw-note{animation:aw-rise 2.2s ease-in infinite;opacity:0}@keyframes aw-rise{0%{opacity:0;transform:translateY(0)}20%{opacity:1}100%{opacity:0;transform:translateY(-34px)}}
.aw-climb{animation:aw-climb 2.8s ease-in-out infinite}@keyframes aw-climb{0%,15%{transform:translate(0,0)}35%,50%{transform:translate(20px,-13px)}70%,100%{transform:translate(40px,-26px)}}
.aw-spk{animation:aw-spk 2.8s ease-in-out infinite;opacity:0;transform-box:fill-box;transform-origin:center}@keyframes aw-spk{0%,20%{opacity:0;transform:scale(.3)}35%{opacity:1;transform:scale(1)}60%,100%{opacity:0;transform:scale(.6)}}
.aw-lite{animation:aw-lite 2.8s ease-in-out infinite;opacity:0}@keyframes aw-lite{0%,62%{opacity:0}75%,95%{opacity:1}100%{opacity:0}}
.aw-strum{animation:aw-strum .25s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:center}@keyframes aw-strum{to{transform:scaleY(1.6)}}
.aw-pulse{animation:aw-pulse 1.6s ease-out infinite;opacity:0;transform-box:fill-box;transform-origin:center}@keyframes aw-pulse{0%{opacity:0;transform:scale(.6)}25%{opacity:1}100%{opacity:0;transform:scale(1.25)}}
/* the table that slides in */
.aw-slot{display:grid;grid-template-rows:0fr;transition:grid-template-rows .55s cubic-bezier(.2,.8,.2,1),margin .55s;margin:0}
.aw-slot.open{grid-template-rows:1fr;margin:0 0 22px}
.aw-slot>div{overflow:hidden;min-height:0}.aw-slot.done>div{overflow:visible}
.aw-slot .aw-an{font-family:'Onest',system-ui,sans-serif;background:#fff;border-radius:24px;box-shadow:0 0 0 2px #E2D6FF,0 40px 80px -40px rgba(65,1,247,.45);opacity:0;transform:translateY(-18px) scale(.985);transition:opacity .4s .12s,transform .5s .1s cubic-bezier(.2,.8,.2,1);font-variant-numeric:tabular-nums}
.aw-slot.open .aw-an{opacity:1;transform:none}
.aw-slot .aw-an .hd{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:20px 26px;border-bottom:1px solid #F1EDF9;border-radius:24px 24px 0 0;background:radial-gradient(60% 160% at 0% 0%,#F4EEFF,rgba(244,238,255,0) 70%)}
.aw-slot .aw-an .tg{font:700 10.5px 'Onest',system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6A6488;display:block;margin-bottom:3px}
.aw-slot .aw-an .hd b.tt{font:700 21px 'Onest',system-ui,sans-serif;color:#01073C;display:block}
.aw-slot .aw-an .sub{display:block;font-size:13px;color:#6A6488;margin-top:3px}
.aw-slot .aw-an .hd>div:first-child{margin-right:auto}.aw-slot .aw-an .pod{display:flex;gap:10px;flex-wrap:wrap}
.aw-slot .aw-an .pod>div{display:flex;align-items:center;gap:9px;background:#fff;border-radius:14px;padding:7px 14px 7px 8px;box-shadow:0 0 0 1px #E9E4F5,0 6px 16px -10px rgba(65,1,247,.35)}
.aw-slot .aw-an .pod svg{width:28px;height:34px;flex:none}
.aw-slot .aw-an .pod b{display:block;font:700 13.5px 'Onest',system-ui,sans-serif;color:#01073C}.aw-slot .aw-an .pod em{font:600 11.5px 'Onest',system-ui,sans-serif;font-style:normal;color:#6A6488}
.aw-slot .aw-an .x{margin-left:14px;display:flex;gap:8px}
.aw-slot .aw-an .x button{height:34px;border:0;border-radius:12px;background:#F4EFFE;color:#4101F7;font:600 13px 'Onest',system-ui,sans-serif;padding:0 14px;cursor:pointer;display:flex;align-items:center;gap:7px}
.aw-slot .aw-an .x button svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.aw-slot .aw-an .tw{margin:16px 26px 24px;border-radius:18px;box-shadow:inset 0 0 0 1px #F1EDF9;overflow:auto}
.aw-slot .aw-an table{border-collapse:collapse;width:100%;min-width:760px}
.aw-slot .aw-an th{font:700 10.5px 'Onest',system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#6A6488;background:#F7F5FC;padding:13px 10px;text-align:center;border:0}
.aw-slot .aw-an th small{display:block;font:500 11px 'Onest',system-ui,sans-serif;letter-spacing:0;text-transform:none;margin-top:2px}
.aw-slot .aw-an th:first-child,.aw-slot .aw-an td:first-child{text-align:left;padding-left:22px}
.aw-slot .aw-an td{padding:11px 10px;text-align:center;border:0;border-top:1px solid #F1EDF9;font-size:12px;color:#6A6488;background:#fff}
.aw-slot .aw-an td:first-child{font:600 14.5px 'Onest',system-ui,sans-serif;color:#01073C}
.aw-slot .aw-an th.now,.aw-slot .aw-an th.cmp{background:#F1EAFE;color:#4101F7}.aw-slot .aw-an th.cmp{color:#7B6BB0}
.aw-slot .aw-an td.now,.aw-slot .aw-an td.cmp{background:#FAF7FF}
.aw-slot .aw-an th.cmp,.aw-slot .aw-an td.cmp{border-left:1px dashed #DCD0FA;border-right:6px solid #fff;box-shadow:inset -1px 0 0 #E2D6FF}
.aw-slot .aw-an td i{display:block;width:fit-content;margin:0 auto 3px;font:700 13px 'Onest',system-ui,sans-serif;font-style:normal;border-radius:99px;padding:3px 11px}
.aw-slot .aw-an td i.n{background:none;color:#01073C;font-size:15px;padding:0}
.aw-slot .aw-an .bd-r{background:#FFEDF2;color:#B0204F}.aw-slot .aw-an .bd-a{background:#FFF3D6;color:#8A5A00}.aw-slot .aw-an .bd-g{background:#E3F7EE;color:#137A4F}.aw-slot .aw-an .bd-b{background:#EEF1FF;color:#2F4DB8}.aw-slot .aw-an .bd-{background:#F4F2F8;color:#6A6488}
.aw-slot .aw-an td .dl{display:block;margin-top:3px;font:700 11px 'Onest',system-ui,sans-serif}.aw-slot .aw-an .dup{color:#137A4F}.aw-slot .aw-an .ddn{color:#B0204F}.aw-slot .aw-an .dz{color:#6A6488}
.aw-slot .aw-an tr.tot td{background:#F4EFFE;color:#4101F7;font-weight:700}.aw-slot .aw-an tr.tot td:first-child{color:#4101F7}
.aw-slot .aw-an tr.row{opacity:0;transform:translateY(8px);transition:opacity .35s,transform .35s}.aw-slot.open .aw-an tr.row{opacity:1;transform:none}
.aw-slot .aw-an .emp{padding:30px 26px;color:#6A6488;font-size:14px}
.aw-slot .aw-an .nt{padding:0 26px 20px;margin-top:-10px;font-size:12px;color:#6A6488}
.aw-slot .aw-an tr.row:hover td{background:#FBF9FF}.aw-slot .aw-an tr.row:hover td.now,.aw-slot .aw-an tr.row:hover td.cmp{background:#F6F1FF}
`;
const SK={a:'#C98E66',b:'#B07650',c:'#9A6444',d:'#D6A07A'};
const CAST={kid:{kind:'boy',skin:SK.d,hair:'#2B1D16',hs:'short',top:'#6F7FD9',bottom:'#2E3A59',shoe:'#F2F2F2',s:.62},
  teen:{kind:'woman',skin:SK.b,hair:'#2A1A14',hs:'pony',top:'#5A6478',trim:'#DDE3EA',bottom:'#2D2F45',shoe:'#F2F2F2',s:.8},
  woman:{kind:'woman',skin:SK.a,hair:'#2A1A14',hs:'bun',top:'#B0628C',trim:'#F4DCE8',bottom:'#EFE6DA',shoe:'#6B4B3A',s:.95,bindi:true},
  man:{kind:'man',skin:SK.b,hair:'#231713',hs:'short',top:'#5C7CB0',bottom:'#3A3F55',shoe:'#3B2A22',s:1,beard:true},
  elder:{kind:'man',skin:SK.a,hair:'#CFCBC6',hs:'neat',top:'#8A7A63',bottom:'#4A4F60',shoe:'#3B2A22',s:.95,glasses:true},
  teacher:{kind:'man',skin:SK.a,hair:'#2B1D16',hs:'curly',top:'#5A3FA6',trim:'#E9E2FA',bottom:'#F4EFE6',shoe:'#6B4B3A',s:1,kurta:true}};
function hairPath(p){const c=p.hair;switch(p.hs){
  case 'bun':return `<circle cx="0" cy="-172" r="9" fill="${c}"/><path d="M-18-150a18 19 0 0136 0c0-6-4-12-9-14-6 3-14 4-27 14z" fill="${c}"/>`;
  case 'pony':return `<path d="M15-160c10 6 12 26 4 40-2-14-6-24-10-30z" fill="${c}"/><path d="M-18-149a18 19 0 0136 0c-2-8-10-14-20-12-7 1-12 6-16 12z" fill="${c}"/>`;
  case 'curly':return [[-14,-160],[-6,-167],[4,-168],[13,-162],[17,-152],[-17,-151]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="7.5" fill="${c}"/>`).join('');
  case 'neat':return `<path d="M-18-151a18 18 0 0136 0c-5-6-14-8-22-6-6 1-10 4-14 6z" fill="${c}"/>`;
  default:return `<path d="M-18-150a18 18 0 0136-1c-3-4-9-7-16-7-9 0-15 3-20 8z" fill="${c}"/>`;}}
function arm(side,pose,p,w){const sx=side*19,sy=-126,sw=p.kind==='boy'?8:9;let ex,ey,hx,hy;
  if(Array.isArray(pose)){[ex,ey,hx,hy]=pose;}
  else if(pose==='wave'){ex=sx+side*14;ey=-146;hx=sx+side*18;hy=-170;}
  else if(pose==='hi'){ex=sx+side*18;ey=-136;hx=sx+side*28;hy=-156;}
  else if(pose==='out'){ex=sx+side*12;ey=-100;hx=sx+side*26;hy=-86;}
  else if(pose==='reach'){ex=sx+side*14;ey=-118;hx=sx+side*26;hy=-126;}
  else if(pose==='mic'){ex=sx+side*8;ey=-104;hx=sx+side*2;hy=-118;}
  else if(pose==='strum'){ex=sx+side*4;ey=-100;hx=sx-side*12;hy=-92;}
  else if(pose==='keys'){ex=sx+side*6;ey=-104;hx=sx+side*10;hy=-92;}
  else{ex=sx+side*5;ey=-102;hx=sx+side*6;hy=-78;}
  if(w&&w[3]==='e'){const st=`stroke="${p.top}" stroke-width="${sw}" stroke-linecap="round" fill="none"`;
    return `<g><path d="M${sx} ${sy}L${ex} ${ey}" ${st}/><g><path d="M${ex} ${ey}L${hx} ${hy}" ${st}/><circle cx="${hx}" cy="${hy}" r="${sw*.62}" fill="${p.skin}"/><animateTransform attributeName="transform" type="rotate" values="${-w[1]} ${ex} ${ey};${w[1]} ${ex} ${ey};${-w[1]} ${ex} ${ey}" dur="${w[0]}s" repeatCount="indefinite"/></g><circle cx="${ex}" cy="${ey}" r="${sw/2}" fill="${p.top}"/></g>`;}
  const an=w?`<animateTransform attributeName="transform" type="rotate" values="0 ${sx} ${sy};${w[1]*-side} ${sx} ${sy};0 ${sx} ${sy}" dur="${w[0]}s" begin="${w[2]||0}s" repeatCount="indefinite"/>`:'';
  return `<g><path d="M${sx} ${sy}L${ex} ${ey}L${hx} ${hy}" fill="none" stroke="${p.top}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${hx}" cy="${hy}" r="${sw*.62}" fill="${p.skin}"/>${an}</g>`;}
function person(key,x,y,o={}){const p=Object.assign({},CAST[key],o),s=(o.sc||1)*p.s,fl=o.flip?-1:1;
  const lt=p.kind==='woman'||p.kurta?-60:-72,tb=p.kind==='woman'||p.kurta?-50:-70;let g='';
  g+=`<rect x="-14" y="${lt}" width="12" height="${-lt-6}" rx="5" fill="${p.bottom}"/><rect x="2" y="${lt}" width="12" height="${-lt-6}" rx="5" fill="${p.bottom}"/><ellipse cx="-8" cy="-4" rx="10" ry="5" fill="${p.shoe}"/><ellipse cx="8" cy="-4" rx="10" ry="5" fill="${p.shoe}"/>`;
  if(!o.inst)g+=arm(-1,o.armL||'down',p,o.wL);
  g+=`<path d="M-21 -124q0-8 10-8h22q10 0 10 8v${tb+124}q0 6-6 6h-30q-6 0-6-6z" fill="${p.top}"/>`;
  if(p.kurta||p.kind==='woman')g+=`<path d="M-5-132q5 10 10 0" fill="none" stroke="${p.trim||'#fff'}" stroke-width="2.5"/>`;
  g+=`<rect x="-5" y="-140" width="10" height="10" fill="${p.skin}"/><circle cx="0" cy="-152" r="17" fill="${p.skin}"/>`+hairPath(p);
  g+=`<circle cx="-6" cy="-152" r="1.9" fill="#2A1E1A"/><circle cx="6" cy="-152" r="1.9" fill="#2A1E1A"/><path d="M-5-144q5 4 10 0" fill="none" stroke="#7A3B2E" stroke-width="1.8" stroke-linecap="round"/>`;
  g+=`<circle cx="-11" cy="-146" r="3" fill="#E58C7A" opacity=".35"/><circle cx="11" cy="-146" r="3" fill="#E58C7A" opacity=".35"/>`;
  if(p.bindi)g+=`<circle cx="0" cy="-160" r="1.6" fill="#B23A48"/>`;
  if(p.beard)g+=`<path d="M-14-150q2 16 14 18 12-2 14-18-4 8-14 8t-14-8z" fill="${p.hair}"/>`;
  if(p.glasses)g+=`<g fill="none" stroke="#1E1A1A" stroke-width="1.6"><circle cx="-6.5" cy="-152" r="5"/><circle cx="6.5" cy="-152" r="5"/><path d="M-1.5-152h3"/></g>`;
  g+=o.inst?o.inst+arm(-1,o.armL,p,o.wL)+arm(1,o.armR,p,o.wR):(o.mid||'')+arm(1,o.armR||'down',p,o.wR);
  return `<g transform="translate(${x} ${y}) scale(${s*fl} ${s})"><g class="${o.anim?'aw-bob':''}" style="animation-delay:${o.d||0}s">${g}</g></g>`;}
const guitar=(x,y,k,anim,rot)=>`<g transform="translate(${x} ${y}) scale(${k}) rotate(${rot??-28})"><rect x="-4" y="-118" width="8" height="70" rx="3" fill="#6B4B3A"/><rect x="-7" y="-128" width="14" height="14" rx="3" fill="#4A3328"/>
  <circle cx="0" cy="-36" r="21" fill="#C98E4A"/><circle cx="0" cy="-8" r="27" fill="#C98E4A"/><circle cx="0" cy="-26" r="7" fill="#3B2A22"/><rect x="-10" y="6" width="20" height="5" rx="2" fill="#3B2A22"/>
  <g class="${anim?'aw-strum':''}"><path d="M-2-120V8M2-120V8" stroke="#F4EFE6" stroke-width="1"/></g></g>`;
const keys=(x,y,k)=>`<g transform="translate(${x} ${y}) scale(${k})"><rect x="-58" y="-30" width="116" height="34" rx="6" fill="#2D2F45"/><rect x="-52" y="-18" width="104" height="18" rx="2" fill="#fff"/>
  ${[...Array(12)].map((_,i)=>`<line x1="${-52+i*8.7}" y1="-18" x2="${-52+i*8.7}" y2="0" stroke="#C9C2E0" stroke-width="1"/>`).join('')}${[0,1,3,4,5,7,8,10].map(i=>`<rect x="${-47+i*8.7}" y="-18" width="5" height="11" fill="#2D2F45"/>`).join('')}<circle cx="-40" cy="-24" r="2.5" fill="#8B7BE0"/><circle cx="-32" cy="-24" r="2.5" fill="#8B7BE0"/></g>`;
const kbStand=()=>`<path d="M-30 0L30-78M30 0L-30-78" stroke="#5A6478" stroke-width="5" stroke-linecap="round"/><rect x="-50" y="-94" width="100" height="18" rx="3" fill="#2D2F45"/><rect x="-45" y="-92" width="90" height="9" rx="1.5" fill="#fff"/>${[...Array(11)].map((_,i)=>`<line x1="${-45+i*9}" y1="-92" x2="${-45+i*9}" y2="-83" stroke="#C9C2E0" stroke-width="1"/>`).join('')}${[0,1,3,4,5,7,8].map(i=>`<rect x="${-39+i*9}" y="-92" width="4.5" height="5" fill="#2D2F45"/>`).join('')}`;
const mic=(x,y,k)=>`<g transform="translate(${x} ${y}) scale(${k})"><path d="M-14 0h28M0 0v-70" stroke="#2D2F45" stroke-width="4" stroke-linecap="round"/><path d="M0-70l-8-14" stroke="#2D2F45" stroke-width="4" stroke-linecap="round"/><rect x="-15" y="-104" width="14" height="24" rx="7" transform="rotate(-30 -8 -92)" fill="#5A6478"/><path d="M-17-100l9 16" stroke="#C9C2E0" stroke-width="1.5" transform="rotate(-30 -8 -92)"/></g>`;
const bulb=(x,y,k,cls)=>`<g class="${cls||''}" transform="translate(${x} ${y}) scale(${k})"><circle cx="0" cy="0" r="16" fill="#FFE9A8" opacity=".55"/><path d="M-7 4q-7-6-7-13a14 14 0 0128 0q0 7-7 13v5h-14z" fill="#F6C945"/><rect x="-6" y="10" width="12" height="5" rx="2" fill="#8A80AA"/><path d="M0-30v-6M-20-20l-4-4M20-20l4-4M-26 -6h-6M26-6h6" stroke="#F6C945" stroke-width="3" stroke-linecap="round"/></g>`;
const spark=(x,y,k,d)=>`<g class="aw-spk" style="animation-delay:${d}s"><path transform="translate(${x} ${y}) scale(${k})" d="M0-10l2.5 7.5L10 0l-7.5 2.5L0 10l-2.5-7.5L-10 0l7.5-2.5z" fill="#A58BEF"/></g>`;
const steps=(x,y,k)=>`<g transform="translate(${x} ${y}) scale(${k})"><rect x="-60" y="-26" width="40" height="26" rx="3" fill="#E7DEFB"/><rect x="-20" y="-52" width="40" height="52" rx="3" fill="#CDBDF7"/><rect x="20" y="-78" width="40" height="78" rx="3" fill="#A58BEF"/></g>`;
const noteG=(x,y,d)=>`<g class="aw-note" style="animation-delay:${d}s"><path transform="translate(${x} ${y})" d="M0 0v-14l8-2v12" fill="none" stroke="#8B7BE0" stroke-width="2" stroke-linecap="round"/><circle cx="${x-2}" cy="${y}" r="3" fill="#8B7BE0"/><circle cx="${x+6}" cy="${y-4}" r="3" fill="#8B7BE0"/></g>`;
// Each slice: a small still picture on the wheel, and a slightly livelier one in the hub when you point at it
const ART={
  course:{still:(x,y)=>guitar(x-30,y,.36)+keys(x+4,y-2,.36)+mic(x+40,y,.42),
          live:(x,y)=>person('man',x-42,y,{sc:.42,inst:kbStand(),armL:[-30,-104,-20,-90],armR:[30,-104,22,-90],wL:[.5,-9,0],wR:[.42,9,.15],anim:1,d:.1})
            +person('teen',x+6,y+4,{sc:.42,inst:guitar(6,-74,.62,1,-50),armL:[-38,-100,-32,-108],armR:[30,-98,2,-82],wR:[.2,9,0,'e'],anim:1,d:.35})
            +person('woman',x+42,y,{sc:.42,armR:'mic',wL:[.9,16,.2],armL:'hi',anim:1,d:.6})+mic(x+50,y,.5)
            +noteG(x+54,y-64,0)+noteG(x+22,y-74,.8)+noteG(x-20,y-70,1.5)},
  teacher:{still:(x,y)=>person('teacher',x-10,y,{sc:.5,armR:'wave'})+guitar(x+22,y,.32),
          live:(x,y)=>person('teacher',x-16,y,{sc:.5,armR:'out',armL:'wave',wL:[.7,18,0],anim:1})+person('kid',x+24,y,{sc:.62,flip:1,armR:'reach',anim:1,d:.4})+noteG(x+40,y-64,.5)},
  level:{still:(x,y)=>steps(x,y,.55)+person('kid',x+22,y-43,{sc:.4}),
          live:(x,y)=>steps(x,y,.6)+spark(x-24,y-30,.6,.5)+spark(x+2,y-52,.8,1.2)+bulb(x+30,y-92,.55,'aw-lite')+`<g class="aw-climb">${person('kid',x-26,y-16,{sc:.44})}</g>`},
  age:{still:(x,y)=>person('kid',x-34,y,{sc:.45})+person('teen',x-11,y,{sc:.45})+person('woman',x+12,y,{sc:.45})+person('elder',x+36,y,{sc:.45}),
          live:(x,y)=>person('kid',x-39,y,{sc:.46,armR:'wave',wR:[.35,26,0],anim:1})+person('teen',x-13,y,{sc:.46,armR:'hi',wR:[.6,18,.2],anim:1,d:.2})
            +person('woman',x+13,y,{sc:.46,armL:'hi',wL:[.8,14,.1],anim:1,d:.4})+person('elder',x+39,y,{sc:.46,armR:'hi',wR:[1.2,8,.5],anim:1,d:.6})},
  gender:{still:(x,y)=>person('woman',x-15,y,{sc:.48})+person('man',x+15,y,{sc:.48,flip:1}),
          live:(x,y)=>person('woman',x-17,y,{sc:.52,armR:'wave',wR:[.55,22,0],anim:1})+person('man',x+17,y,{sc:.52,flip:1,armR:'hi',wR:[.85,14,.25],anim:1,d:.3})}};
// Lead source: a phone ringing with messages coming in
const phone=(x,y,k)=>`<g transform="translate(${x} ${y}) scale(${k})"><rect x="-17" y="-62" width="34" height="62" rx="7" fill="#2D2F45"/><rect x="-13" y="-55" width="26" height="45" rx="3" fill="#EEF1FF"/><circle cx="0" cy="-5" r="2.6" fill="#8A80AA"/></g>`;
const bubble=(x,y,k,c,cls,d)=>`<g class="${cls||''}" style="animation-delay:${d||0}s"><g transform="translate(${x} ${y}) scale(${k})"><path d="M-16-12h32a6 6 0 016 6v12a6 6 0 01-6 6h-20l-8 7v-7h-4a6 6 0 01-6-6v-12a6 6 0 016-6z" fill="${c}"/><path d="M-10-2h20M-10 4h12" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></g></g>`;
ART.source={still:(x,y)=>phone(x-14,y,.62)+bubble(x+16,y-36,.62,'#A58BEF')+bubble(x+24,y-14,.5,'#DD30B1'),
  live:(x,y)=>person('woman',x-26,y,{sc:.5,armR:'mic',anim:1})+phone(x-12,y-50,.42)+bubble(x+22,y-74,.7,'#A58BEF','aw-pulse',0)+bubble(x+34,y-44,.6,'#DD30B1','aw-pulse',.5)+bubble(x+18,y-18,.55,'#6F7FD9','aw-pulse',1)};

const SL={course:['By course','Course'],teacher:['By teacher','Teacher'],level:['By course level','Course level'],age:['By age group','Age group'],gender:['By gender','Gender'],source:['By lead source','Lead source']};
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],MF=['January','February','March','April','May','June','July','August','September','October','November','December'];
const esc=t=>String(t==null?'':t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ICON='<circle cx="10.5" cy="10.5" r="7"/><path d="M15.6 15.6L21 21"/><path d="M7.5 13v-2M10.5 13V8M13.5 13v-3.5"/>';
const MED=[['#E9B949','#C8932A','#F7DC8A'],['#C3CAD6','#98A2B3','#E6EAF0'],['#D08B5B','#A8653B','#EBB892']];
const medal=i=>{const [c,d,l]=MED[i];return`<svg viewBox="0 0 28 34" aria-hidden="true"><path d="M7 0h6l3 12h-6zM21 0h-6l-3 12h6z" fill="#7B61D9"/><path d="M13 0h2l1 12h-4z" fill="#A58BEF"/><circle cx="14" cy="22" r="11" fill="${d}"/><circle cx="14" cy="22" r="8.5" fill="${c}"/><path d="M8.5 19a7 7 0 0 1 8-4.5" stroke="${l}" stroke-width="2" fill="none" stroke-linecap="round"/><text x="14" y="26" text-anchor="middle" font-size="10" font-weight="800" fill="#fff" font-family="system-ui">${i+1}</text></svg>`;};
/* Colour bands, as on the rest of the site: 0 to 40% red, 41 to 60% amber, 61 to 75% green, above 75% blue */
const band=(a,b)=>{if(!b)return'';const r=Math.round(a/b*100);return r<=40?'r':r<=60?'a':r<=75?'g':'b';};
const pct=(a,b)=>b?Math.round(a/b*100):null;
const n=v=>Math.round(v).toLocaleString('en-IN');

let cfg=null,wheel,fab,veil,slot,an,opts=[],CUR=null,HK=null;
function css(){if(document.getElementById('aw-css'))return;const s=document.createElement('style');s.id='aw-css';s.textContent=CSS;document.head.appendChild(s);}
function draw(){const C=280,R=255,r=96,S=cfg.slices,m=S.length,P=(a,rad)=>[C+rad*Math.cos(a),C+rad*Math.sin(a)];
  let h=`<svg class="w" viewBox="0 0 560 560"><defs><linearGradient id="aw-wv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4101F7"/><stop offset="1" stop-color="#6601FD"/></linearGradient></defs>`;
  S.forEach((k,i)=>{const g=.014,a0=(-90-180/m+i*360/m)*Math.PI/180+g,a1=(-90+180/m+i*360/m)*Math.PI/180-g,am=(a0+a1)/2;
    const [x0,y0]=P(a0,R),[x1,y1]=P(a1,R),[x2,y2]=P(a1,r),[x3,y3]=P(a0,r),[cx,cy]=P(am,(R+r)/2+6);
    h+=`<g class="wedge" data-k="${k}" role="button" aria-label="${esc(lab(k))}"><path class="seg-p" d="M${x0} ${y0}A${R} ${R} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${r} ${r} 0 0 0 ${x3} ${y3}Z"/>
      <g class="art">${ART[k].still(cx,cy+8)}</g><text class="t1" x="${cx}" y="${cy+30}">${esc(lab(k))}</text></g>`;});
  h+=`<circle cx="${C}" cy="${C}" r="${r-6}" fill="#F4EFFE"/><circle class="hub" cx="${C}" cy="${C}" r="${r-12}"/><circle class="hubr" cx="${C}" cy="${C}" r="${r-21}"/>
    <g class="hubIdle"><text class="hubt" x="${C}" y="${C-6}" style="font-size:10px;font-weight:700;letter-spacing:2.4px;fill:#8A80AA">ANALYSE</text>
    <text class="hubt" x="${C}" y="${C+15}" style="font-size:16px;font-weight:700;fill:#01073C">${esc(cfg.hub||'')}</text></g><g class="hubScene"></g></svg>`;
  wheel.innerHTML=h;opts=[...wheel.querySelectorAll('.wedge')];}
const lab=k=>(cfg.labels&&cfg.labels[k]||SL[k])[0],nm=k=>(cfg.labels&&cfg.labels[k]||SL[k])[1];
function openW(){HK=null;peek(null);wheel.classList.add('on');fab.classList.add('on');veil.classList.add('on');}
function closeW(){wheel.classList.remove('on');fab.classList.remove('on');veil.classList.remove('on');}
function peek(k){if(k===HK)return;HK=k;const sc=wheel.querySelector('.hubScene'),idle=wheel.querySelector('.hubIdle');if(!sc)return;
  if(!k){sc.innerHTML='';idle.style.opacity=1;return;}
  idle.style.opacity=0;sc.innerHTML=`<g class="in" style="transform-origin:280px 300px"><g transform="translate(280 300) scale(.82) translate(-280 -300)">${ART[k].live(280,316)}</g><text class="hubt" x="280" y="334" style="font-size:12.5px;font-weight:700;fill:#4101F7">${esc(nm(k))}</text></g>`;}

/* A cell: {a,b} collected of due (a percentage in its colour band, then "a of b"), or {v} a count, with an optional sub-line and change (d, in points or as a count). */
function cell(c,cls){if(!c)return`<td class="${cls||''}">–</td>`;
  let top,sub='';
  if('b' in c){const p=pct(c.a,c.b);top=`<i class="bd-${band(c.a,c.b)}">${p==null?'–':p+'%'}</i>`;sub=c.b?`${n(c.a)} of ${n(c.b)}`:(c.a?`${n(c.a)} collected`:'');}
  else{top=`<i class="n">${n(c.v||0)}</i>`;sub=c.s||'';}
  let dl='';if(c.d!=null){const u=c.u!=null?c.u:' pts';dl=c.d===0?`<span class="dl dz">No change</span>`:`<span class="dl ${c.d>0?'dup':'ddn'}">${c.d>0?'▲':'▼'} ${n(Math.abs(c.d))}${u}</span>`;}
  return`<td class="${cls||''}">${top}${sub}${dl}</td>`;}
/* spec: {title, sub, cols:[{h,sm,title}], rows:[{name,cells,rank,tie,skip}], total:{cells}, note, empty} — the first two columns are this period and the one before it */
function render(k,anim){const spec=cfg.table(k);CUR=k;opts.forEach(b=>b.classList.toggle('sel',b.dataset.k===k));
  const head=`<div class="hd"><div><span class="tg">Analysis</span><b class="tt">${esc(spec&&spec.title||nm(k))}</b>${spec&&spec.sub?`<span class="sub">${esc(spec.sub)}</span>`:''}</div>`;
  let pod='',body='';
  if(!spec||spec.empty||!spec.rows||!spec.rows.length){body=`<div class="emp">${esc(spec&&spec.empty||(spec?'Nothing to show for this period.':'Loading…'))}</div>`;}
  else{
    const rk=spec.rows.map((r,i)=>[i,r.rank,r.tie||0]).filter(x=>x[1]!=null&&!spec.rows[x[0]].skip).sort((a,b)=>b[1]-a[1]||b[2]-a[2]).slice(0,3);
    pod=rk.length?`<div class="pod">${rk.map(([i],m)=>`<div>${medal(m)}<span><b>${esc(spec.rows[i].name)}</b><em>${esc(spec.rows[i].line||'')}</em></span></div>`).join('')}</div>`:'';
    const cls=j=>j===0?'now':j===1?'cmp':'';
    const tr=(r,j,t)=>`<tr class="row${t?' tot':''}" style="transition-delay:${anim?200+j*50:0}ms"><td>${esc(r.name)}</td>${r.cells.map((c,i)=>cell(c,cls(i))).join('')}</tr>`;
    body=`<div class="tw"><table><thead><tr><th>${esc(nm(k))}</th>${spec.cols.map((c,i)=>`<th class="${cls(i)}"${c.title?` title="${esc(c.title)}"`:''}>${esc(c.h)}${c.sm?`<small>${esc(c.sm)}</small>`:''}</th>`).join('')}</tr></thead>
      <tbody>${spec.rows.map((r,j)=>tr(r,j)).join('')}${spec.total?tr({name:'Total',cells:spec.total.cells},spec.rows.length,1):''}</tbody></table></div>${spec.note?`<div class="nt">${esc(spec.note)}</div>`:''}`;}
  an.innerHTML=head+pod+`<div class="x"><button type="button" data-aw="switch"><svg viewBox="0 0 24 24">${ICON}</svg>Switch</button><button type="button" data-aw="hide"><svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>Collapse</button></div></div>`+body;
  if(anim){slot.classList.remove('open','done');void slot.offsetWidth;slot.classList.add('open');setTimeout(()=>slot.classList.contains('open')&&slot.classList.add('done'),600);
    const t=slot.getBoundingClientRect().top+window.scrollY-20;window.scrollTo({top:Math.max(0,t),behavior:'smooth'});}
}
function show(k){closeW();render(k,true);}
function hide(){CUR=null;slot.classList.remove('done');void slot.offsetWidth;slot.classList.remove('open');opts.forEach(b=>b.classList.remove('sel'));}
function place(){const a=cfg.anchor&&cfg.anchor();if(a&&a.parentNode&&slot.nextSibling!==a)a.parentNode.insertBefore(slot,a);}

function mount(c){cfg=Object.assign({slices:['course','teacher','level','age','gender']},c);css();
  slot=document.createElement('div');slot.className='aw-slot';slot.innerHTML='<div><section class="aw-an" aria-live="polite"></section></div>';an=slot.querySelector('.aw-an');
  veil=document.createElement('div');veil.className='aw-veil';wheel=document.createElement('div');wheel.className='aw-wheel';
  fab=document.createElement('button');fab.type='button';fab.className='aw-fab';fab.setAttribute('aria-label','Analyse');
  fab.innerHTML=`<span class="lb">Analyse</span><svg class="ia" viewBox="0 0 24 24">${ICON}</svg><svg class="ix" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
  document.body.append(veil,wheel,fab);place();draw();
  fab.onclick=()=>wheel.classList.contains('on')?closeW():openW();veil.onclick=closeW;
  wheel.addEventListener('click',e=>{const b=e.target.closest('.wedge');if(b)show(b.dataset.k);else if(e.target.closest('.hub'))closeW();});
  wheel.addEventListener('mouseover',e=>{const w=e.target.closest('.wedge');peek(w?w.dataset.k:null);});
  wheel.addEventListener('mouseleave',()=>peek(null));
  an.addEventListener('click',e=>{const b=e.target.closest('[data-aw]');if(!b)return;if(b.dataset.aw==='switch')openW();else hide();});
  document.addEventListener('keydown',e=>{if(!wheel.classList.contains('on'))return;if(e.key==='Escape'){closeW();return;}const i=+e.key-1;if(cfg.slices[i])show(cfg.slices[i]);});
}
function refresh(){if(!cfg)return;place();if(CUR)render(CUR,false);}

/* ── Helpers the pages share ── */
const mi=d=>d.getFullYear()*12+d.getMonth(),mStart=k=>new Date(Math.floor(k/12),k%12,1),mEnd=k=>new Date(Math.floor(k/12),k%12+1,0,23,59,59);
const ml=k=>MON[k%12]+' '+String(Math.floor(k/12)).slice(2);
/* The windows: the period shown on the page, the month before it, the 3, 6 and 12 months before that, and lifetime. */
function windows(a,b,o={}){const k=mi(a),mon=o.month!==false;
  const cur={h:mon?ml(k):'Selected',sm:o.soFar?'so far':'',a,b,title:mon?MF[k%12]+' '+Math.floor(k/12):''};
  let prev;if(mon)prev={h:ml(k-1),a:mStart(k-1),b:mEnd(k-1),title:MF[(k+11)%12]+' '+Math.floor((k-1)/12)};
  else{const len=b-a;prev={h:'Before',sm:'same length',a:new Date(a-len-864e5),b:new Date(a-1)};}
  const last=nn=>({h:'Last '+nn+'M',a:mStart(k-nn),b:mEnd(k-1),title:MF[(k-nn+1200)%12]+' '+Math.floor((k-nn)/12)+' to '+MF[(k+1199)%12]+' '+Math.floor((k-1)/12)});
  return[cur,prev,last(3),last(6),last(12),{h:'Lifetime',a:null,b:null}];}
const inW=(d,w)=>!!d&&(!w.a||(d>=w.a&&d<=w.b));
const ORDER={level:['Preparatory','Intermediate','Proficient','Advanced'],age:['0 to 5','6 to 12','13 to 21','22 to 30','31 to 40','40+'],gender:['Female','Male']};
const BLANK={teacher:'Unassigned',source:'Not given'};
/* Groups items by a label, matching case-insensitively; blanks become "Not given" (or "Unassigned" for teachers) */
function grouper(k){const seen=new Map(),blank=BLANK[k]||'Not given';
  return v=>{v=String(v==null?'':v).trim().replace(/\s+/g,' ');if(!v)return blank;const l=v.toLowerCase();if(!seen.has(l))seen.set(l,v);return seen.get(l);};}
function sortRows(k,rows,by){const o=ORDER[k];return rows.sort((x,y)=>{if(x.blank!==y.blank)return x.blank?1:-1;
  if(o){const i=(o.indexOf(x.name)+1||99)-(o.indexOf(y.name)+1||99);if(i)return i;}return by(y)-by(x)||x.name.localeCompare(y.name);});}
/* Collected of due, per label and window: den = the "due" items, num = the "collected" items. */
function ratio(k,W,den,dDate,num,nDate,key){const g=grouper(k),M=new Map(),blank=BLANK[k]||'Not given';
  const get=l=>M.get(l)||M.set(l,W.map(()=>({a:0,b:0}))).get(l);
  den.forEach(x=>{const d=dDate(x);W.forEach((w,i)=>{if(inW(d,w))get(g(key(x)))[i].b++;});});
  num.forEach(x=>{const d=nDate(x);W.forEach((w,i)=>{if(inW(d,w))get(g(key(x)))[i].a++;});});
  const T=W.map((w,i)=>({a:0,b:0}));M.forEach(v=>v.forEach((c,i)=>{T[i].a+=c.a;T[i].b+=c.b;}));
  const delta=v=>{const p0=pct(v[0].a,v[0].b),p1=pct(v[1].a,v[1].b);return Object.assign({},v[1],{d:p0!=null&&p1!=null?p0-p1:null});};
  let rows=[...M].filter(([l,v])=>v.slice(0,5).some(c=>c.a||c.b)).map(([l,v])=>({name:l,blank:l===blank,skip:l===blank,cells:[v[0],delta(v),...v.slice(2)],
    rank:v[0].b?pct(v[0].a,v[0].b):null,tie:v[0].a,line:v[0].b?pct(v[0].a,v[0].b)+'% · '+n(v[0].a)+' of '+n(v[0].b):''}));
  rows=sortRows(k,rows,r=>r.cells[0].b*1e4+r.cells[4].b);
  return{rows,total:{cells:[T[0],delta(T),...T.slice(2)]}};}
/* Counts (and an optional amount) per label and window */
function count(k,W,items,date,key,amt){const g=grouper(k),M=new Map(),blank=BLANK[k]||'Not given';
  const get=l=>M.get(l)||M.set(l,W.map(()=>({v:0,m:0}))).get(l);
  items.forEach(x=>{const d=date(x);W.forEach((w,i)=>{if(inW(d,w)){const c=get(g(key(x)))[i];c.v++;if(amt)c.m+=amt(x)||0;}});});
  const T=W.map(()=>({v:0,m:0}));M.forEach(v=>v.forEach((c,i)=>{T[i].v+=c.v;T[i].m+=c.m;}));
  const inr=x=>'₹'+n(x);
  const fin=v=>v.map((c,i)=>Object.assign({v:c.v,s:amt?inr(c.m):''},i===1?{d:v[0].v-v[1].v,u:''}:{}));
  let rows=[...M].filter(([l,v])=>v.slice(0,5).some(c=>c.v)).map(([l,v])=>({name:l,blank:l===blank,skip:l===blank,cells:fin(v),rank:v[0].v||null,tie:v[0].m,line:n(v[0].v)+(amt?' · '+inr(v[0].m):'')}));
  rows=sortRows(k,rows,r=>r.cells[0].v*1e4+r.cells[4].v);
  return{rows,total:{cells:fin(T)}};}

window.ArtiumWheel={mount,refresh,open:openW,close:closeW,windows,ratio,count,grouper,sortRows,pct,band,mi,ml,MF};
})();
