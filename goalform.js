/* ── Goal window: shared by the Offline Centres page (Make it a goal) and the Goals page (Edit) ──
   GoalForm.open({goal, init:{id,n,path,dept}, line, centres, staff, lineCentres, onSaved}) */
(function(){
  const CENTRES=['Alwarpet','Thoraipakkam','Borewell Road'];
  /* ── Goal description: headings, bold, italics, underline and bullet points. Kept as a small set of HTML tags. ── */
  const OK_TAGS=['p','br','b','strong','i','em','u','ul','li','h3','div'];
  // Only these tags survive, with no attributes; any other < or > becomes plain text
  function clean(html){
    html=String(html||'');let out='',last=0;const re=/<\/?([a-z0-9]+)[^<>]*>/gi;let m;
    const txt=t=>t.replace(/</g,'&lt;').replace(/>/g,'&gt;');
    while((m=re.exec(html))){out+=txt(html.slice(last,m.index));last=re.lastIndex;let t=m[1].toLowerCase();if(t==='div')t='p';if(t==='strong')t='b';if(t==='em')t='i';
      if(OK_TAGS.includes(t))out+=t==='br'?'<br>':'<'+(m[0][1]==='/'?'/':'')+t+'>';}
    out+=txt(html.slice(last));
    out=out.replace(/<p>\s*(<br>)?\s*<\/p>/g,'').replace(/(<br>\s*)+(<\/(p|li|h3)>)/g,'$2').trim();
    return out;
  }
  const plain=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
  // Older descriptions are plain text: lines starting "- " become bullets, the rest paragraphs
  function toHtml(desc){
    desc=String(desc||'');if(/<(p|ul|h3|b|i|u|br)\b/i.test(desc))return clean(desc);
    const e=t=>t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');let out='',inL=false;
    desc.split(/\r?\n/).forEach(l=>{const m=l.match(/^\s*[-•*]\s+(.*)$/);if(m){if(!inL){out+='<ul>';inL=true;}out+='<li>'+e(m[1])+'</li>';return;}
      if(inL){out+='</ul>';inL=false;}if(l.trim())out+='<p>'+e(l)+'</p>';});
    return out+(inL?'</ul>':'');
  }
  const TOOLS=[['h3','Heading','<span style="font:700 13px Poppins,sans-serif">H</span>'],['b','Bold (Ctrl+B)','<b>B</b>'],['i','Italics (Ctrl+I)','<i style="font-family:Georgia,serif">I</i>'],['u','Underline (Ctrl+U)','<u>U</u>'],['ul','Bullet points (type "- " at the start of a line)','<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4" cy="6" r="1.3" fill="currentColor"/><circle cx="4" cy="12" r="1.3" fill="currentColor"/><circle cx="4" cy="18" r="1.3" fill="currentColor"/></svg>']];
  const editorHtml=(val,ph)=>`<div class="gf-rt"><div class="gf-tb" role="toolbar" aria-label="Formatting">${TOOLS.map(([k,t,i])=>`<button type="button" data-fmt="${k}" title="${t}" aria-label="${t}" aria-pressed="false">${i}</button>`).join('')}</div>
    <div class="gf-ed" contenteditable="true" role="textbox" aria-multiline="true" data-ph="${ph}">${toHtml(val)}</div></div>`;
  function fmt(ed,k){
    ed.focus();
    if(k==='h3'){const cur=(document.queryCommandValue('formatBlock')||'').toLowerCase();document.execCommand('formatBlock',false,cur==='h3'?'p':'h3');}
    else if(k==='ul')toggleList(ed);
    else document.execCommand({b:'bold',i:'italic',u:'underline'}[k]);
  }
  function syncTools(root){
    const ed=root.querySelector('.gf-ed');if(!ed)return;const sel=getSelection();const inside=sel.rangeCount&&ed.contains(sel.anchorNode);
    root.querySelectorAll('[data-fmt]').forEach(b=>{const k=b.dataset.fmt;let on=false;
      if(inside){if(k==='h3')on=(document.queryCommandValue('formatBlock')||'').toLowerCase()==='h3';else if(k==='ul'){let x=sel.anchorNode;while(x&&x!==ed&&x.nodeName!=='LI')x=x.parentNode;on=!!x&&x!==ed;}else on=document.queryCommandState({b:'bold',i:'italic',u:'underline'}[k]);}
      b.setAttribute('aria-pressed',on);});
  }
  // The bullet button: the line the cursor is on becomes a bullet point, or stops being one
  function toggleList(ed){
    const sel=getSelection();if(!sel.rangeCount)return;const an=sel.anchorNode,ao=sel.anchorOffset;
    let b=an;while(b&&b!==ed&&!/^(P|DIV|LI|H3)$/.test(b.nodeName))b=b.parentNode;
    if(b&&b.nodeName==='LI'){const ul=b.parentNode,p=document.createElement('p');while(b.firstChild)p.appendChild(b.firstChild);
      const after=[];let x=b.nextSibling;while(x){after.push(x);x=x.nextSibling;}
      ul.parentNode.insertBefore(p,ul.nextSibling);if(after.length){const u2=document.createElement('ul');after.forEach(z=>u2.appendChild(z));p.after(u2);}
      b.remove();if(!ul.children.length)ul.remove();if(!p.textContent)p.innerHTML='<br>';}
    else{const ul=document.createElement('ul'),li=document.createElement('li');ul.appendChild(li);
      if(!b||b===ed){let st=an;while(st&&st.parentNode!==ed)st=st.parentNode;
        if(!st){li.innerHTML='<br>';ed.appendChild(ul);}else{const nodes=[];let x=st;while(x&&x.previousSibling&&!(x.previousSibling.nodeType===1&&/^(P|DIV|UL|H3)$/.test(x.previousSibling.nodeName)))x=x.previousSibling;
          while(x&&!(x.nodeType===1&&/^(P|DIV|UL|H3)$/.test(x.nodeName))){nodes.push(x);x=x.nextSibling;}ed.insertBefore(ul,nodes[0]);nodes.forEach(z=>li.appendChild(z));}}
      else{while(b.firstChild)li.appendChild(b.firstChild);b.parentNode.replaceChild(ul,b);}
      if(!li.textContent&&!li.querySelector('br'))li.innerHTML='<br>';
      const pv=ul.previousElementSibling;if(pv&&pv.nodeName==='UL'){while(ul.firstChild)pv.appendChild(ul.firstChild);ul.remove();}}
    try{const c=document.createRange();if(an&&ed.contains(an)){c.setStart(an,Math.min(ao,an.nodeType===3?an.length:an.childNodes.length));}else{c.selectNodeContents(ed);c.collapse(false);}
      c.collapse(true);sel.removeAllRanges();sel.addRange(c);}catch(e){}
  }
  // "- " at the start of a line turns it into a bullet point, as in the Claude chat
  function autoBullet(e,ed){
    if(e.key!==' ')return;const sel=getSelection();if(!sel.rangeCount||!sel.isCollapsed)return;
    const r=sel.getRangeAt(0),n=r.startContainer;if(n.nodeType!==3)return;
    let block=n.parentNode;while(block&&block!==ed&&!/^(P|DIV|LI|H3)$/.test(block.nodeName))block=block.parentNode;
    const pre=document.createRange();pre.setStart(block===ed?ed:block,0);pre.setEnd(n,r.startOffset);
    if(pre.toString().replace(/ /g,' ')!=='-'||(block&&block.nodeName==='LI'))return;
    e.preventDefault();
    // the line becomes a bullet point: the dash goes, the rest of the line moves into the bullet
    const ul=document.createElement('ul'),li=document.createElement('li');ul.appendChild(li);
    n.textContent=n.textContent.slice(r.startOffset);
    if(block===ed){const nodes=[];let x=n;while(x&&!(x.nodeType===1&&/^(P|DIV|UL|H3|BR)$/.test(x.nodeName))){nodes.push(x);x=x.nextSibling;}ed.insertBefore(ul,n);nodes.forEach(z=>li.appendChild(z));}
    else{while(block.firstChild)li.appendChild(block.firstChild);block.parentNode.replaceChild(ul,block);}
    if(!li.textContent)li.innerHTML='<br>';
    const prev=ul.previousElementSibling;if(prev&&prev.nodeName==='UL'){while(ul.firstChild)prev.appendChild(ul.firstChild);ul.remove();}
    const c=document.createRange();c.setStart(li.firstChild&&li.firstChild.nodeType===3?li.firstChild:li,0);c.collapse(true);sel.removeAllRanges();sel.addRange(c);
  }
  // Pasted text comes in plain; lines starting "- " become bullets
  function onPaste(e){
    const t=(e.clipboardData||window.clipboardData).getData('text/plain');if(t==null)return;e.preventDefault();
    if(/^\s*[-•*]\s/m.test(t)||t.includes('\n'))document.execCommand('insertHTML',false,toHtml(t));else document.execCommand('insertText',false,t);
  }
  const TAGS=['Academics','Learner Experience','Finance','Hiring','Marketing','Operations','People Management','Product / Tech','Social Media','Design & Content','Teacher Experience'];
  const css=`
  .gf-bg{position:fixed;inset:0;z-index:60;background:rgba(29,27,34,.42);display:grid;place-items:center;padding:20px}
  .gf-bg[hidden]{display:none}
  .gf{width:100%;max-width:860px;max-height:calc(100vh - 40px);display:flex;flex-direction:column;background:#fff;border-radius:22px;box-shadow:inset 0 3px 0 #A8844F,0 30px 60px -20px rgba(29,27,34,.45);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#3B3742}
  .gf-hd{display:flex;justify-content:space-between;gap:12px;padding:20px 24px 12px;border-bottom:1px solid #EFEDF2}
  .gf-hd h2{font:600 20px 'Poppins',sans-serif;color:#1D1B22}
  .gf-from{font-size:12.5px;color:#6B6774;margin-top:6px}.gf-from b{color:#5B2A86;font-weight:600}
  .gf-x{border:0;background:none;font-size:26px;line-height:1;color:#6B6774;cursor:pointer}
  .gf-bd{padding:16px 24px;overflow:auto;display:flex;flex-direction:column;gap:16px}
  .gf-rt{border:1px solid #E4E1EA;border-radius:11px;background:#F6F5F2;overflow:hidden}
  .gf-rt:focus-within{border-color:#5B2A86;box-shadow:0 0 0 3px rgba(91,42,134,.12);background:#fff}
  .gf-tb{display:flex;gap:2px;padding:5px 6px;border-bottom:1px solid #EFEDF2;background:#fff}
  .gf-tb button{min-width:32px;height:30px;border:0;border-radius:8px;background:none;color:#3B3742;font-size:14px;cursor:pointer;display:grid;place-items:center;padding:0 8px}
  .gf-tb button:hover{background:#F2ECF8;color:#5B2A86}.gf-tb button[aria-pressed="true"]{background:#5B2A86;color:#fff}
  .gf-tb button:first-child{margin-right:6px;position:relative}.gf-tb button:first-child::after{content:"";position:absolute;right:-5px;top:6px;bottom:6px;width:1px;background:#E4E1EA}
  .gf-ed{min-height:150px;max-height:360px;overflow:auto;padding:10px 14px;font:400 14px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1D1B22;outline:none}
  .gf-ed:empty::before{content:attr(data-ph);color:#9A96A3}
  .gf-ed p{margin:0 0 8px}.gf-ed h3{font:600 18px/1.35 'Poppins',sans-serif;color:#1D1B22;margin:10px 0 6px}.gf-ed h3:first-child{margin-top:0}
  .gf-ed ul{margin:0 0 8px;padding-left:22px}.gf-ed li{margin:2px 0}
  .gf-l{display:block;font:700 10.5px var(--body,sans-serif);letter-spacing:.12em;text-transform:uppercase;color:#A8844F;margin-bottom:7px}
  .gf-in{border:1px solid #E4E1EA;border-radius:11px;background:#F6F5F2;padding:10px 12px;font:400 14px/1.55 inherit;font-family:inherit;color:#1D1B22;width:100%}
  .gf-in:focus{outline:none;border-color:#5B2A86;box-shadow:0 0 0 3px rgba(91,42,134,.12);background:#fff}
  textarea.gf-in{resize:vertical;min-height:130px}
  .gf-tags{display:flex;flex-wrap:wrap;gap:6px}
  .gf-tag{border:1px solid #E4E1EA;background:#fff;border-radius:999px;padding:5px 12px;font:600 12.5px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#3B3742;cursor:pointer}
  .gf-tag:hover{border-color:#CDBFE0}.gf-tag[aria-pressed="true"]{background:#5B2A86;border-color:#5B2A86;color:#fff}
  .gf-hint{font-size:12px;color:#9A96A3;margin-top:6px}
  .gf-box{border:1px solid #E4E1EA;border-radius:14px;overflow:hidden}
  .gf-row{display:grid;grid-template-columns:22px 150px 1fr 120px;gap:10px;align-items:center;padding:10px 12px;border-bottom:1px solid #EFEDF2}
  .gf-row:last-child{border-bottom:0}.gf-row.off{opacity:.5}
  .gf-row b{font:600 14px 'Poppins',sans-serif;color:#1D1B22}
  .gf-row input[type=checkbox]{width:17px;height:17px;accent-color:#5B2A86}
  .gf-ppl{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
  .gf-p{display:inline-flex;align-items:center;gap:5px;background:#F2ECF8;color:#5B2A86;border-radius:999px;padding:4px 5px 4px 11px;font:600 12.5px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif}
  .gf-p button{width:18px;height:18px;border-radius:50%;border:0;background:rgba(91,42,134,.12);color:#5B2A86;cursor:pointer;font-size:10px}
  .gf-ppl select{border:1px solid #E4E1EA;border-radius:999px;padding:4px 8px;font-size:12.5px;background:#fff;max-width:220px}
  .gf-st{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:4px 10px 4px 8px;font:600 12px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;white-space:nowrap;justify-self:start}
  .gf-st i{width:7px;height:7px;border-radius:50%;background:currentColor}
  .gf-st.tbp{background:#FDECEB;color:#B42318}.gf-st.inp{background:#FBF1DC;color:#9A6200}.gf-st.cmp{background:#E5F4EC;color:#1F7A4D}
  .gf-task{display:grid;grid-template-columns:24px 1fr 160px 28px;gap:10px;align-items:center;padding:8px 12px;border-bottom:1px solid #EFEDF2}
  .gf-task .n{width:22px;height:22px;border-radius:50%;background:#F2ECF8;color:#5B2A86;font:700 11px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;display:grid;place-items:center}
  .gf-task .gf-in{padding:7px 10px}
  .gf-rm{width:28px;height:28px;border-radius:50%;border:0;background:none;color:#9A96A3;cursor:pointer;font-size:14px}.gf-rm:hover{background:#FDECEB;color:#B42318}
  .gf-add{display:block;width:100%;text-align:left;border:0;background:#FCFBFD;padding:10px 12px;color:#5B2A86;font:600 13px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;cursor:pointer}
  .gf-note{background:#F8F4FC;border-radius:12px;padding:12px 14px;font-size:13px;line-height:1.55}.gf-note b{color:#5B2A86}
  .gf-ft{display:flex;align-items:center;gap:10px;padding:14px 24px 18px;border-top:1px solid #EFEDF2}
  .gf-ft .sp{flex:1}.gf-msg{font-size:13px;color:#B42318}
  .gf-btn{height:40px;padding:0 16px;border:1px solid #E4E1EA;border-radius:12px;background:#fff;color:#3B3742;font:600 13.5px 'Poppins',sans-serif;cursor:pointer;white-space:nowrap}
  .gf-btn.pri{background:#5B2A86;border-color:#5B2A86;color:#fff}.gf-btn:disabled{opacity:.55;cursor:default}
  @media (max-width:700px){.gf-row{grid-template-columns:22px 1fr;}.gf-row .gf-ppl,.gf-row .gf-st{grid-column:2}}`;
  const esc=t=>String(t==null?'':t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid=()=>Math.random().toString(36).slice(2,8);
  const ST={tbp:'To be picked',inp:'In progress',cmp:'Completed'};
  let F=null,O=null,el=null;
  function mount(){
    if(el)return;document.head.appendChild(Object.assign(document.createElement('style'),{textContent:css}));
    el=document.createElement('div');el.className='gf-bg';el.hidden=true;document.body.appendChild(el);
    el.addEventListener('click',onClick);el.addEventListener('change',onChange);el.addEventListener('input',onInput);
    el.addEventListener('keydown',e=>{const ed=e.target.closest&&e.target.closest('.gf-ed');if(ed){autoBullet(e,ed);setTimeout(()=>{F.desc=clean(ed.innerHTML);syncTools(el);},0);}});
    el.addEventListener('paste',e=>{const ed=e.target.closest&&e.target.closest('.gf-ed');if(ed){onPaste(e);F.desc=clean(ed.innerHTML);}});
    el.addEventListener('mousedown',e=>{if(e.target.closest('[data-fmt]'))e.preventDefault();});   // keep the selection in the text
    document.addEventListener('selectionchange',()=>{if(el&&!el.hidden)syncTools(el);});
    try{document.execCommand('defaultParagraphSeparator',false,'p');}catch(e){}
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!el.hidden)close();});
  }
  function open(opts){
    mount();O=opts;const g=opts.goal;
    F=g?JSON.parse(JSON.stringify(g)):{tags:[],id:'',init:opts.init&&opts.init.id||'',line:opts.line||'',title:opts.line||'',desc:'',target:'',draft:true,centres:{},tasks:[]};
    if(!g)((opts.lineCentres&&opts.lineCentres.length)?opts.lineCentres:CENTRES).forEach(c=>F.centres[c]={owners:[],s:'tbp'});
    F.tasks=(F.tasks||[]).map(t=>({...t}));render();el.hidden=false;
    setTimeout(()=>{const t=el.querySelector('[data-f=title]');t&&t.focus();},50);
  }
  function close(){el.hidden=true;F=null;}
  const people=(list,c)=>`<div class="gf-ppl">${list.map((p,i)=>`<span class="gf-p">${esc(p.name||p.email)}<button type="button" data-rmp="${esc(c)}|${i}" aria-label="Remove">✕</button></span>`).join('')}
    <select data-addp="${esc(c)}"><option value="">+ ${list.length?'Add':'Choose'} owner</option>${(O.staff||[]).filter(s=>!list.some(p=>p.email===s.email)).sort((a,b)=>(b.centre===c)-(a.centre===c)||a.name.localeCompare(b.name)).map(s=>`<option value="${esc(s.email)}">${esc(s.name)} · ${esc(s.role)}${s.centre?', '+esc(s.centre):''}</option>`).join('')}<option value="@">Someone else (type an email)…</option></select></div>`;
  function render(){
    const live=O.goal&&!O.goal.draft,i=O.init;
    el.innerHTML=`<div class="gf" role="dialog" aria-modal="true"><div class="gf-hd"><div><h2>${O.goal?'Edit goal':i?'Make it a goal':'New goal'}</h2>${i?`<div class="gf-from">From <b>${esc(i.dept||'')}</b> › <b>${esc(i.path||'')}</b> › <b>${esc(i.n||'')}</b></div>`:''}</div><button class="gf-x" type="button" data-close aria-label="Close">×</button></div>
      <div class="gf-bd">
        <div><span class="gf-l">Goal</span><input class="gf-in" data-f="title" value="${esc(F.title)}" maxlength="200"></div>
        <div><span class="gf-l">Goal description</span>${editorHtml(F.desc,'Why it matters, what to do, and what &quot;done&quot; looks like.')}<div class="gf-hint">This is what the owners read in their email, so write it the way you'd brief them.</div></div>
        <div><span class="gf-l">Centres and owners</span><div class="gf-box">${CENTRES.map(c=>{const C=F.centres[c];return`<div class="gf-row${C?'':' off'}"><input type="checkbox" data-c="${esc(c)}"${C?' checked':''} aria-label="${esc(c)}"><b>${esc(c)}</b>${C?people(C.owners,c):'<span style="font-size:12.5px;color:#9A96A3">Not part of this goal</span>'}${C?`<span class="gf-st ${C.s||'tbp'}"><i></i>${ST[C.s||'tbp']}</span>`:'<span></span>'}</div>`;}).join('')}</div>
          <div class="gf-hint">Untick a centre this goal doesn't apply to. Each centre has its own status, and the goal is Completed when every chosen centre is.</div></div>
        <div><span class="gf-l">Tags</span><div class="gf-tags">${TAGS.map(t=>`<button type="button" class="gf-tag" data-tag="${esc(t)}" aria-pressed="${(F.tags||[]).includes(t)}">${esc(t)}</button>`).join('')}</div></div>
        <div style="max-width:260px"><span class="gf-l">Target date</span><input class="gf-in" type="date" data-f="target" value="${esc(F.target)}"></div>
        <div><span class="gf-l">Subtasks</span><div class="gf-box">${F.tasks.map((t,k)=>`<div class="gf-task"><span class="n">${k+1}</span><input class="gf-in" data-t="${k}|title" value="${esc(t.title)}" placeholder="e.g. Shortlist 3 vendors and get quotes"><input class="gf-in" type="date" data-t="${k}|due" value="${esc(t.due)}" aria-label="Due date"><button type="button" class="gf-rm" data-rt="${k}" aria-label="Remove subtask">✕</button></div>`).join('')}
          <button type="button" class="gf-add" data-addt>+ Add a subtask</button></div><div class="gf-hint">Every chosen centre works through the same subtasks; each centre's owner updates their own.</div></div>
        ${live?'':'<div class="gf-note"><b>Email to the stakeholders</b> goes out when you choose to send it — now, or later with <b>Email stakeholders</b> on the Goals page. Until then the goal is tagged <b>Yet to email</b> and only you can see it. The email has the goal, your description, the target date and the subtasks, plus a link to the goal. You\'re copied.</div>'}
      </div>
      <div class="gf-ft"><span class="gf-msg" id="gf-msg"></span><span class="sp"></span><button class="gf-btn" type="button" data-close>Cancel</button>
        ${live?'<button class="gf-btn pri" type="button" data-save="live">Save changes</button>':`<button class="gf-btn" type="button" data-save="draft">${O.goal?'Save':'Save goal'} — email later</button><button class="gf-btn pri" type="button" data-save="live">${O.goal?'Save &amp; email stakeholders':'Create &amp; email stakeholders'}</button>`}</div></div>`;
  }
  function onInput(e){if(e.target.classList&&e.target.classList.contains('gf-ed')){F.desc=clean(e.target.innerHTML);return;}const d=e.target.dataset;if(d.f==='title'||d.f==='desc')F[d.f]=e.target.value;else if(d.t){const[k,f]=d.t.split('|');if(f==='title')F.tasks[+k].title=e.target.value;}}
  function onChange(e){
    const x=e.target,d=x.dataset;
    if(d.f){F[d.f]=x.value;return;}
    if(d.t){const[k,f]=d.t.split('|');F.tasks[+k][f]=x.value;return;}
    if(d.c){if(x.checked)F.centres[d.c]={owners:[],s:'tbp'};else delete F.centres[d.c];render();return;}
    if(d.addp!=null){let v=x.value;if(!v)return;const L=F.centres[d.addp].owners;
      if(v==='@'){v=(prompt('Email address')||'').trim().toLowerCase();if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)){render();return;}if(!L.some(p=>p.email===v))L.push({name:'',email:v});}
      else{const s=(O.staff||[]).find(z=>z.email===v);if(s&&!L.some(p=>p.email===s.email))L.push({name:s.name,email:s.email});}
      render();}
  }
  async function onClick(e){
    const b=e.target.closest('button');if(!b){if(e.target===el)close();return;}const d=b.dataset;
    if(d.fmt){const ed=el.querySelector('.gf-ed');fmt(ed,d.fmt);F.desc=clean(ed.innerHTML);syncTools(el);return;}
    if('close' in d)return close();
    if(d.rmp){const[c,i]=d.rmp.split('|');F.centres[c].owners.splice(+i,1);return render();}
    if('addt' in d){F.tasks.push({id:uid(),title:'',due:''});render();const ins=el.querySelectorAll('[data-t$="|title"]');ins[ins.length-1].focus();return;}
    if(d.rt){F.tasks.splice(+d.rt,1);return render();}
    if(d.tag){F.tags=F.tags||[];F.tags=F.tags.includes(d.tag)?F.tags.filter(x=>x!==d.tag):F.tags.concat(d.tag);b.setAttribute('aria-pressed',F.tags.includes(d.tag));return;}
    if(d.save){
      const draft=d.save==='draft',cs=Object.keys(F.centres),m=el.querySelector('#gf-msg');
      const miss=!F.title.trim()?'Give the goal a name.':!cs.length?'Choose at least one centre.':!draft&&!plain(F.desc)?'Write the goal description — it goes into the email.':
        !draft&&cs.some(c=>!F.centres[c].owners.length)?'Every chosen centre needs an owner.':F.tasks.some(t=>!t.title.trim())?'Every subtask needs a name, or remove it.':'';
      if(miss){m.textContent=miss;return;}
      el.querySelectorAll('[data-save]').forEach(x=>x.disabled=true);m.textContent='';
      try{const j=await ArtiumAuth.call('saveGoal',{goal:{...F,draft:O.goal&&!O.goal.draft?false:draft}});if(j.error)throw new Error(j.error);close();O.onSaved&&O.onSaved(j);}
      catch(err){m.textContent='Couldn\'t save: '+(err.message||err);el.querySelectorAll('[data-save]').forEach(x=>x.disabled=false);}
    }
  }
  window.GoalForm={open,close,descHtml:toHtml,descText:plain};
})();
