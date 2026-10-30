/* ── Goal window: shared by the Offline Centres page (Make it a goal) and the Goals page (Edit) ──
   GoalForm.open({goal, init:{id,n,path,dept}, line, centres, staff, lineCentres, onSaved}) */
(function(){
  const CENTRES=['Alwarpet','Thoraipakkam','Borewell Road'];
  const css=`
  .gf-bg{position:fixed;inset:0;z-index:60;background:rgba(29,27,34,.42);display:grid;place-items:center;padding:20px}
  .gf-bg[hidden]{display:none}
  .gf{width:100%;max-width:860px;max-height:calc(100vh - 40px);display:flex;flex-direction:column;background:#fff;border-radius:22px;box-shadow:inset 0 3px 0 #A8844F,0 30px 60px -20px rgba(29,27,34,.45);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#3B3742}
  .gf-hd{display:flex;justify-content:space-between;gap:12px;padding:20px 24px 12px;border-bottom:1px solid #EFEDF2}
  .gf-hd h2{font:600 20px 'Poppins',sans-serif;color:#1D1B22}
  .gf-from{font-size:12.5px;color:#6B6774;margin-top:6px}.gf-from b{color:#5B2A86;font-weight:600}
  .gf-x{border:0;background:none;font-size:26px;line-height:1;color:#6B6774;cursor:pointer}
  .gf-bd{padding:16px 24px;overflow:auto;display:flex;flex-direction:column;gap:16px}
  .gf-l{display:block;font:700 10.5px var(--body,sans-serif);letter-spacing:.12em;text-transform:uppercase;color:#A8844F;margin-bottom:7px}
  .gf-in{border:1px solid #E4E1EA;border-radius:11px;background:#F6F5F2;padding:10px 12px;font:400 14px/1.55 inherit;font-family:inherit;color:#1D1B22;width:100%}
  .gf-in:focus{outline:none;border-color:#5B2A86;box-shadow:0 0 0 3px rgba(91,42,134,.12);background:#fff}
  textarea.gf-in{resize:vertical;min-height:130px}
  .gf-hint{font-size:12px;color:#9A96A3;margin-top:6px}
  .gf-box{border:1px solid #E4E1EA;border-radius:14px;overflow:hidden}
  .gf-row{display:grid;grid-template-columns:22px 150px 1fr 120px;gap:10px;align-items:center;padding:10px 12px;border-bottom:1px solid #EFEDF2}
  .gf-row:last-child{border-bottom:0}.gf-row.off{opacity:.5}
  .gf-row b{font:600 14px 'Poppins',sans-serif;color:#1D1B22}
  .gf-row input[type=checkbox]{width:17px;height:17px;accent-color:#5B2A86}
  .gf-ppl{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
  .gf-p{display:inline-flex;align-items:center;gap:5px;background:#F2ECF8;color:#5B2A86;border-radius:999px;padding:4px 5px 4px 11px;font:600 12.5px inherit;font-family:inherit}
  .gf-p button{width:18px;height:18px;border-radius:50%;border:0;background:rgba(91,42,134,.12);color:#5B2A86;cursor:pointer;font-size:10px}
  .gf-ppl select{border:1px solid #E4E1EA;border-radius:999px;padding:4px 8px;font-size:12.5px;background:#fff;max-width:220px}
  .gf-st{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:4px 10px 4px 8px;font:600 12px inherit;font-family:inherit;justify-self:start}
  .gf-st i{width:7px;height:7px;border-radius:50%;background:currentColor}
  .gf-st.tbp{background:#FDECEB;color:#B42318}.gf-st.inp{background:#FBF1DC;color:#9A6200}.gf-st.cmp{background:#E5F4EC;color:#1F7A4D}
  .gf-task{display:grid;grid-template-columns:24px 1fr 160px 28px;gap:10px;align-items:center;padding:8px 12px;border-bottom:1px solid #EFEDF2}
  .gf-task .n{width:22px;height:22px;border-radius:50%;background:#F2ECF8;color:#5B2A86;font:700 11px inherit;font-family:inherit;display:grid;place-items:center}
  .gf-task .gf-in{padding:7px 10px}
  .gf-rm{width:28px;height:28px;border-radius:50%;border:0;background:none;color:#9A96A3;cursor:pointer;font-size:14px}.gf-rm:hover{background:#FDECEB;color:#B42318}
  .gf-add{display:block;width:100%;text-align:left;border:0;background:#FCFBFD;padding:10px 12px;color:#5B2A86;font:600 13px inherit;font-family:inherit;cursor:pointer}
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
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!el.hidden)close();});
  }
  function open(opts){
    mount();O=opts;const g=opts.goal;
    F=g?JSON.parse(JSON.stringify(g)):{id:'',init:opts.init&&opts.init.id||'',line:opts.line||'',title:opts.line||'',desc:'',target:'',draft:true,centres:{},tasks:[]};
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
        <div><span class="gf-l">Goal description</span><textarea class="gf-in" data-f="desc" placeholder="Why it matters, what to do, and what &quot;done&quot; looks like.">${esc(F.desc)}</textarea><div class="gf-hint">This is what the owners read in their email, so write it the way you'd brief them.</div></div>
        <div><span class="gf-l">Centres and owners</span><div class="gf-box">${CENTRES.map(c=>{const C=F.centres[c];return`<div class="gf-row${C?'':' off'}"><input type="checkbox" data-c="${esc(c)}"${C?' checked':''} aria-label="${esc(c)}"><b>${esc(c)}</b>${C?people(C.owners,c):'<span style="font-size:12.5px;color:#9A96A3">Not part of this goal</span>'}${C?`<span class="gf-st ${C.s||'tbp'}"><i></i>${ST[C.s||'tbp']}</span>`:'<span></span>'}</div>`;}).join('')}</div>
          <div class="gf-hint">Untick a centre this goal doesn't apply to. Each centre has its own status, and the goal is Completed when every chosen centre is.</div></div>
        <div style="max-width:260px"><span class="gf-l">Target date</span><input class="gf-in" type="date" data-f="target" value="${esc(F.target)}"></div>
        <div><span class="gf-l">Subtasks</span><div class="gf-box">${F.tasks.map((t,k)=>`<div class="gf-task"><span class="n">${k+1}</span><input class="gf-in" data-t="${k}|title" value="${esc(t.title)}" placeholder="e.g. Shortlist 3 vendors and get quotes"><input class="gf-in" type="date" data-t="${k}|due" value="${esc(t.due)}" aria-label="Due date"><button type="button" class="gf-rm" data-rt="${k}" aria-label="Remove subtask">✕</button></div>`).join('')}
          <button type="button" class="gf-add" data-addt>+ Add a subtask</button></div><div class="gf-hint">Every chosen centre works through the same subtasks; each centre's owner updates their own.</div></div>
        ${live?'':'<div class="gf-note"><b>Email to the owners</b> goes out when you create the goal. It contains the goal, your description, the target date and the subtasks, plus a link to the goal. You\'re copied.</div>'}
      </div>
      <div class="gf-ft"><span class="gf-msg" id="gf-msg"></span><span class="sp"></span><button class="gf-btn" type="button" data-close>Cancel</button>
        ${live?'<button class="gf-btn pri" type="button" data-save="live">Save changes</button>':'<button class="gf-btn" type="button" data-save="draft">Save as draft</button><button class="gf-btn pri" type="button" data-save="live">Create goal &amp; email owners</button>'}</div></div>`;
  }
  function onInput(e){const d=e.target.dataset;if(d.f==='title'||d.f==='desc')F[d.f]=e.target.value;else if(d.t){const[k,f]=d.t.split('|');if(f==='title')F.tasks[+k].title=e.target.value;}}
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
    if('close' in d)return close();
    if(d.rmp){const[c,i]=d.rmp.split('|');F.centres[c].owners.splice(+i,1);return render();}
    if('addt' in d){F.tasks.push({id:uid(),title:'',due:''});render();const ins=el.querySelectorAll('[data-t$="|title"]');ins[ins.length-1].focus();return;}
    if(d.rt){F.tasks.splice(+d.rt,1);return render();}
    if(d.save){
      const draft=d.save==='draft',cs=Object.keys(F.centres),m=el.querySelector('#gf-msg');
      const miss=!F.title.trim()?'Give the goal a name.':!cs.length?'Choose at least one centre.':!draft&&!F.desc.trim()?'Write the goal description — it goes into the email.':
        !draft&&cs.some(c=>!F.centres[c].owners.length)?'Every chosen centre needs an owner.':F.tasks.some(t=>!t.title.trim())?'Every subtask needs a name, or remove it.':'';
      if(miss){m.textContent=miss;return;}
      el.querySelectorAll('[data-save]').forEach(x=>x.disabled=true);m.textContent='';
      try{const j=await ArtiumAuth.call('saveGoal',{goal:{...F,draft:O.goal&&!O.goal.draft?false:draft}});if(j.error)throw new Error(j.error);close();O.onSaved&&O.onSaved(j);}
      catch(err){m.textContent='Couldn\'t save: '+(err.message||err);el.querySelectorAll('[data-save]').forEach(x=>x.disabled=false);}
    }
  }
  window.GoalForm={open,close};
})();
