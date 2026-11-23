/* Riyaz: the daily, weekly and monthly checklist on Home (Productivity view).
   A Centre Manager ticks their own centre's Riyaz; the site's editors have their own (My Riyaz) and can look at every centre's without ticking.
   Ticks are saved through the data service (riyaz, riyazTick, riyazSociety). Points add up as items are done; nothing is compared between centres. */
(function () {
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const go = k => { try { window.parent.location.hash = k; } catch (e) { location.hash = k; } };
  /* The items. pts: points for ticking it. n: a counter (target), each unit worth 2 points. link: a page on the site. off: not available yet. */
  const AREAS = {
    hyg: ['🌅', '#F5906F', 'Centre hygiene and vibe'], num: ['📊', '#6601FD', 'Numbers review'], sales: ['📞', '#DD30B1', 'Sales operations'],
    admin: ['🗂️', '#2F4DB8', 'Admin operations'], teach: ['🎼', '#8C7BD9', 'Teaching quality and in-class experience'],
    teacher: ['🎙️', '#E58BD8', 'Teacher relationships and experience'], parent: ['🤝', '#4101F7', 'Parent and learner relationships'], data: ['🧹', '#6A6488', 'Data hygiene']
  };
  const ITEMS = {
    D: [
      ['hyg', 'setup', 'Set up the centre as per SOP', { i: 'TV on with a video playing, air fresheners on, reception lights on, and soft music playing at a low volume. Waiting in the reception should feel musical and calm.' }],
      ['num', 'rp_review', 'Review the Renewal Pipeline', { link: 'pipeline' }],
      ['num', 'ap_review', 'Review the Admissions Pipeline', { link: 'admissions' }],
      ['num', 'dt_review', 'Review the Daily Tracker', { link: 'daily', i: 'Including the lead-to-visit and visit-to-conversion funnels.' }],
      ['num', 'insights', 'Add insights to the Weekly Offline Review', { i: 'Note what the numbers are saying, so the weekly review is ready.' }],
      ['sales', 'ren_calls', 'Make renewal calls', { i: 'And update the Renewal Pipeline as you go.' }],
      ['sales', 'vis_calls', 'Call visitors who didn’t join', { i: 'And update the Admissions Pipeline as you go.' }],
      ['admin', 'attendance', 'Check daily attendance', {}],
      ['admin', 'batches', 'Check scheduled vs completed batches', {}],
      ['teach', 'observe', 'Observe a class for 30 minutes', { i: 'Keep in touch with what each teacher does in class, every day.' }],
      ['teach', 'practice', 'Practice plans issued', { off: 1 }], ['teach', 'aha', 'Aha moments created', { off: 1 }], ['teach', 'curric', 'Curriculum progress', { off: 1 }],
      ['teacher', 'teacher_talk', 'Talk to a teacher for 5 to 10 minutes', { i: 'A different teacher each day, so every teacher is covered within the week. Ask how it’s going and whether they need help.' }],
      ['parent', 'parents', 'Meet 2 parents in the reception', { n: 2, i: 'Ask about their child’s progress and build rapport.' }],
      ['parent', 'catchup', 'Make catch-up calls', { n: 7, sub: 'Up to 7, based on how many are due.' }]],
    W: [
      ['hyg', 'class_hyg', 'Review classroom hygiene', { i: 'Every classroom in order, instruments and requirements up to date, and teachers have what they need.' }],
      ['teach', 'audits', 'Audit 4 classes', { n: 4 }],
      ['admin', 'batch_opt', 'Optimise batches', { i: 'Make sure no teacher has dead hours or cold slots where the average batch size is low.' }],
      ['data', 'loose', 'Fix this week’s Loose Ends', { link: 'loose' }]]
  };
  const PTS = { D: 10, W: 25 }, UNIT = 2, STEP_PTS = 20, LAUNCH_PTS = 100;
  const STEPS = ['Initial idea', 'Establish communication', 'Meet the committee', 'Pitch the initial idea', 'Final idea after the recce', 'Determine the logistics', 'Launch'];
  const LEVELS = [[0, 'Beginner'], [200, 'Preparatory'], [600, 'Intermediate'], [1500, 'Proficient'], [3000, 'Advanced'], [6000, 'Maestro']];
  let ST = null, OWN = null, TAB = 'D', BUSY = false, ADD = false;
  try { TAB = localStorage.getItem('artium_rz_tab') || 'D'; if (!/^[DWM]$/.test(TAB)) TAB = 'D'; } catch (e) {}

  const css = `
  .rz{position:relative;z-index:2}
  .rzb{display:flex;align-items:center;gap:22px;flex-wrap:wrap;padding:22px 28px;border-radius:26px;background:linear-gradient(135deg,#F4EEFF 0%,#FCEFFA 100%);box-shadow:0 1px 2px rgba(1,7,60,.05),0 30px 60px -42px rgba(1,7,60,.4)}
  .rzt b{display:block;font:800 25px var(--display,'Onest');letter-spacing:-.5px;color:#01073C}.rzt span{font:400 14px var(--body,'Onest');color:#4A4466}
  .rzs{display:inline-flex;gap:3px;background:rgba(255,255,255,.7);border-radius:16px;padding:4px}
  .rzs button{all:unset;cursor:pointer;display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:12px;font:600 13.5px var(--body,'Onest');color:#4A4466}
  .rzs button i{font-style:normal;font-weight:700;font-size:11.5px;color:#6A6488}.rzs button[aria-pressed="true"]{background:#fff;color:#01073C;box-shadow:0 10px 22px -14px rgba(1,7,60,.4)}.rzs button[aria-pressed="true"] i{color:#4101F7}
  .rzo{all:unset;cursor:pointer;font:600 13.5px var(--body,'Onest');color:#01073C;background:rgba(255,255,255,.75);border-radius:12px;padding:8px 34px 8px 12px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234A4466' stroke-width='3'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center}
  .rzp{margin-left:auto;min-width:240px;flex:1;max-width:420px}
  .rzp .a{display:flex;justify-content:space-between;align-items:baseline;gap:12px}.rzp .a b{font:800 28px var(--display,'Onest');color:#01073C;white-space:nowrap}.rzp .a b small{font:600 14px var(--body,'Onest');color:#6A6488;margin-left:5px}
  .rzp .a em{font:600 13.5px var(--body,'Onest');font-style:normal;color:#4101F7;text-align:right}
  .rzbar{height:10px;border-radius:6px;background:rgba(255,255,255,.9);margin-top:9px;overflow:hidden}.rzbar i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,#4101F7,#6601FD 50%,#DD30B1);transition:width .5s cubic-bezier(.2,.8,.2,1)}
  .rzg{display:flex;gap:18px;flex-wrap:wrap;margin:14px 2px 0;font:500 13px var(--body,'Onest');color:#4A4466;align-items:center}
  .rzg span{display:inline-flex;align-items:center;gap:7px}.rzg b{color:#01073C;font-weight:700}.rzg .lv{font:700 12px var(--body,'Onest');color:#fff;background:linear-gradient(135deg,#4101F7,#DD30B1);border-radius:999px;padding:4px 11px}
  .rzro{margin:12px 2px 0;font:500 13px var(--body,'Onest');color:#6A6488}
  .rzw{position:relative;margin-top:18px}
  .rzbd{display:flex;gap:16px;overflow-x:auto;padding:2px 2px 14px;scroll-snap-type:x proximity;scrollbar-width:thin}
  .rzc{flex:0 0 252px;display:flex;flex-direction:column;gap:10px;scroll-snap-align:start}
  .rzh{display:flex;align-items:center;gap:9px;padding:2px 4px 8px;border-bottom:3px solid var(--c)}.rzh .e{font-size:16px}.rzh b{font:700 14px/1.25 var(--body,'Onest');color:#01073C}.rzh .n{margin-left:auto;font:700 12px var(--body,'Onest');color:#4101F7;white-space:nowrap}
  .rzh.full{border-bottom-color:#3DDC97}.rzh.full .n{color:#137A4F}
  .rzk{display:flex;gap:11px;align-items:flex-start;background:#fff;border-radius:16px;padding:13px 14px;box-shadow:0 0 0 1px #EEE9F8,0 14px 28px -22px rgba(1,7,60,.4);position:relative;transition:transform .15s}
  .rzk.dn{background:rgba(255,255,255,.55);box-shadow:0 0 0 1px #F1EDF9}.rzk.dn .tl{color:#8A83A6;text-decoration:line-through;text-decoration-color:#C9C2E0}
  .rzk.off{background:transparent;box-shadow:inset 0 0 0 1.5px #E6E0F3;opacity:.65}
  .rzx{all:unset;flex:none;width:22px;height:22px;border-radius:7px;border:2px solid #CFC6EA;box-sizing:border-box;display:grid;place-items:center;cursor:pointer;transition:all .15s}
  .rzx:hover{border-color:#4101F7}.rzx[aria-checked="true"]{border:0;background:linear-gradient(135deg,#4101F7,#6601FD)}
  .rzx[aria-checked="true"]::after{content:"";width:10px;height:6px;border:2.5px solid #fff;border-top:0;border-right:0;transform:rotate(-45deg) translate(1px,-1px)}
  .rzx:disabled{cursor:default}.rzk.off .rzx{border-style:dashed}
  .rzk .tx{flex:1;min-width:0}.rzk .tl{font:600 13.5px/1.4 var(--body,'Onest');color:#01073C}.rzk small{display:block;font:400 12px/1.4 var(--body,'Onest');color:#6A6488;margin-top:3px}
  .rzk .soon{display:block;font:700 10px var(--body,'Onest');letter-spacing:.1em;text-transform:uppercase;color:#6A6488;margin-top:4px}
  .rzi{position:relative;display:inline-grid;place-items:center;width:16px;height:16px;border-radius:50%;border:1.5px solid #B9AEDB;color:#6B3FC7;font:800 9.5px Georgia,serif;font-style:italic;margin-left:6px;vertical-align:1px;cursor:help}
  .rzi span{display:none;position:absolute;left:-10px;top:22px;z-index:30;width:250px;background:#fff;border-radius:14px;padding:11px 13px;box-shadow:0 0 0 1px #E6E0F3,0 20px 40px -20px rgba(1,7,60,.45);font:400 12.5px/1.45 var(--body,'Onest');font-style:normal;color:#4A4466;text-align:left}
  .rzi:hover span,.rzi:focus span{display:block}
  .rzl{all:unset;cursor:pointer;display:block;width:fit-content;margin-top:5px;font:600 12px var(--body,'Onest');color:#4101F7}
  .rzn{display:flex;align-items:center;gap:6px;margin-top:8px}.rzn .seg{display:flex;gap:4px}.rzn .seg i{width:14px;height:6px;border-radius:3px;background:#EFEAF9}.rzn .seg i.f{background:#4101F7}
  .rzn button{all:unset;cursor:pointer;width:22px;height:22px;border-radius:7px;background:#F4EEFF;color:#4101F7;font:700 14px/22px var(--body,'Onest');text-align:center}.rzn button:disabled{opacity:.35;cursor:default}
  .rzn span{font:700 12px var(--body,'Onest');color:#4101F7;margin-left:2px}
  .rzd{font:700 10px var(--body,'Onest');letter-spacing:.14em;text-transform:uppercase;color:#8A83A6;margin:6px 4px 0}
  .rzpop{position:absolute;right:12px;top:8px;font:800 13px var(--body,'Onest');color:#4101F7;pointer-events:none;animation:rzup 1s ease-out forwards}
  @keyframes rzup{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-26px)}}
  .rzhint{margin-top:2px;font:600 12.5px var(--body,'Onest');color:#6A6488;text-align:right}
  .rzm{display:grid;grid-template-columns:repeat(7,minmax(160px,1fr));gap:14px;overflow-x:auto;padding:2px 2px 14px}
  .rzm .rzc{flex:none}.rzsn{font:800 11px var(--body,'Onest');color:#fff;background:linear-gradient(135deg,#4101F7,#6601FD);width:20px;height:20px;border-radius:7px;display:grid;place-items:center;flex:none}
  .rzsc{background:#fff;border-radius:16px;padding:13px 14px;box-shadow:0 0 0 1px #EEE9F8,0 14px 28px -22px rgba(1,7,60,.4)}
  .rzsc b{display:block;font:700 14px var(--body,'Onest');color:#01073C}.rzsc small{display:block;font:400 12px/1.4 var(--body,'Onest');color:#6A6488;margin-top:3px}
  .rzsc .pg{display:flex;gap:3px;margin-top:10px}.rzsc .pg i{flex:1;height:5px;border-radius:3px;background:#EFEAF9}.rzsc .pg i.f{background:linear-gradient(90deg,#4101F7,#6601FD)}
  .rzsc .ac{display:flex;gap:6px;margin-top:10px}.rzsc .ac button{all:unset;cursor:pointer;font:700 12px var(--body,'Onest');border-radius:9px;padding:6px 10px}
  .rzsc .ac .nx{background:linear-gradient(135deg,#4101F7,#6601FD);color:#fff}.rzsc .ac .bk{color:#6A6488;background:#F4F1F9}
  .rzsc.ln{background:linear-gradient(135deg,#F4EEFF,#FCEFFA)}
  .rzop{display:inline-block;font:600 11px var(--body,'Onest');color:#A8431E;background:#FFF1EA;border-radius:6px;padding:2px 7px;align-self:flex-start}
  .rzemp{font:500 12.5px var(--body,'Onest');color:#B7B0CC;padding:8px 4px}
  .rzadd{all:unset;cursor:pointer;font:700 13px var(--body,'Onest');color:#4101F7;padding:6px 4px}
  .rzf{display:flex;flex-direction:column;gap:8px;background:#fff;border-radius:16px;padding:12px;box-shadow:0 0 0 1px #DCD0FB}
  .rzf input{border:1px solid #E6E0F3;border-radius:10px;padding:8px 10px;font:500 13px var(--body,'Onest');color:#01073C}.rzf .r{display:flex;gap:6px}
  .rzf button{all:unset;cursor:pointer;font:700 12px var(--body,'Onest');border-radius:9px;padding:7px 11px}.rzf .s{background:linear-gradient(135deg,#4101F7,#6601FD);color:#fff}.rzf .c{color:#6A6488;background:#F4F1F9}
  .rzempty{margin-top:18px;padding:34px 30px;border-radius:22px;background:rgba(255,255,255,.7);text-align:center;font:500 15px/1.6 var(--body,'Onest');color:#4A4466}.rzempty b{display:block;font:800 20px var(--display,'Onest');color:#01073C;margin-bottom:4px}
  .rzerr{margin-top:10px;font:500 13px var(--body,'Onest');color:#B0204F}
  .rzcf{position:fixed;inset:0;pointer-events:none;z-index:99;overflow:hidden}.rzcf i{position:absolute;top:-12px;width:9px;height:14px;border-radius:2px;animation:rzfall 1.6s ease-in forwards}
  @keyframes rzfall{to{transform:translateY(105vh) rotate(540deg);opacity:.9}}
  @media (prefers-reduced-motion:reduce){.rzpop,.rzcf i{animation:none;display:none}}
  @media (max-width:760px){.rzb{padding:18px}.rzp{min-width:0;max-width:none;flex-basis:100%}.rzc{flex-basis:78vw}}`;

  const $ = id => document.getElementById(id);
  const own = () => ST && ST.owners.find(o => o.key === OWN);
  const per = s => s + ':' + ST.periods[s];
  const val = (o, p, k) => { const r = ST.rows.find(x => x[0] === o && x[1] === p && x[2] === k); return r ? r[3] : 0; };
  const last = (o, p) => ST.rows.filter(x => x[0] === o && x[1] === p).sort((a, b) => a[5] < b[5] ? 1 : -1)[0];
  const live = s => ITEMS[s].filter(x => !x[3].off);
  function done(s, o, p) { return live(s).filter(x => val(o, p || per(s), x[1]) > 0).length; }
  // points: every tick, every counted unit and every society step, all time
  function points(o, pref) {
    let p = 0; ST.rows.filter(r => r[0] === o && (!pref || r[1].startsWith(pref))).forEach(r => { const s = r[1][0];
      if (/_n$/.test(r[2])) p += r[3] * UNIT; else if (r[3] > 0) p += PTS[s] || 0; });
    if (!pref || pref === 'M:') ST.soc.filter(x => x.owner === o).forEach(x => { p += Math.min(x.step, 6) * STEP_PTS + (x.step >= 6 ? LAUNCH_PTS : 0); });
    return p;
  }
  // a streak: days in a row (Mondays are off) with at least 80% of the Daily Riyaz done
  function streak(o) {
    const N = live('D').length, ok = d => done('D', o, 'D:' + d) >= Math.ceil(N * 0.8);
    const t = ST.periods.D.split('-').map(Number), day = new Date(t[0], t[1] - 1, t[2]);
    const key = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    let n = 0; if (!ok(key(day))) day.setDate(day.getDate() - 1);
    for (let i = 0; i < 400; i++) { if (day.getDay() === 1) { day.setDate(day.getDate() - 1); continue; } if (!ok(key(day))) break; n++; day.setDate(day.getDate() - 1); }
    return n;
  }
  const level = p => { let i = 0; LEVELS.forEach((l, k) => { if (p >= l[0]) i = k; }); return { name: LEVELS[i][1], next: LEVELS[i + 1] }; };
  function cheer(d, t) {
    const p = t ? d / t : 0;
    return p >= 1 ? 'Riyaz complete. Beautifully played! 🎉' : p >= .75 ? 'Almost there. Just a few to go.' : p >= .5 ? 'Past halfway. The finish is in sight.'
      : p >= .25 ? 'Good rhythm. Keep it going.' : p > 0 ? 'Nice start. One at a time.' : 'A fresh page. Start with the centre setup.';
  }
  const dm = d => { const p = String(d || '').split('-').map(Number); return p.length === 3 ? p[2] + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][p[1] - 1] : ''; };
  const info = t => t ? `<span class="rzi" tabindex="0" aria-label="More">i<span>${esc(t)}</span></span>` : '';

  function card(s, x, ed) {
    const [a, k, t, o] = x, v = val(OWN, per(s), k), n = o.n ? val(OWN, per(s), k + '_n') : 0, d = v > 0;
    if (o.off) return `<div class="rzk off"><button class="rzx" disabled aria-label="Not available yet"></button><div class="tx"><span class="tl">${esc(t)}</span><span class="soon">PostHog · soon</span></div></div>`;
    const ctr = o.n ? `<div class="rzn"><button data-rzc="${k}" data-d="-1"${!ed || n <= 0 ? ' disabled' : ''} aria-label="One less">−</button><span class="seg">${Array.from({ length: o.n }, (_, i) => `<i class="${i < n ? 'f' : ''}"></i>`).join('')}</span><button data-rzc="${k}" data-d="1"${!ed || n >= o.n ? ' disabled' : ''} aria-label="One more">+</button><span>${n} of ${o.n}</span></div>` : '';
    return `<div class="rzk${d ? ' dn' : ''}" data-k="${k}"><button class="rzx" role="checkbox" aria-checked="${d}" data-rzt="${k}"${ed ? '' : ' disabled'} aria-label="${esc(t)}"></button>
      <div class="tx"><span class="tl">${esc(t)}</span>${info(o.i)}${o.sub ? `<small>${esc(o.sub)}</small>` : ''}${ctr}${o.link ? `<button class="rzl" data-rzgo="${o.link}">Open →</button>` : ''}</div></div>`;
  }
  function board(s, ed) {
    const groups = {}; ITEMS[s].forEach(x => (groups[x[0]] = groups[x[0]] || []).push(x));
    const cols = Object.keys(groups).map(a => { const L = groups[a], lv = L.filter(x => !x[3].off), dn = lv.filter(x => val(OWN, per(s), x[1]) > 0);
      const open = L.filter(x => x[3].off || !(val(OWN, per(s), x[1]) > 0)), A = AREAS[a];
      return `<div class="rzc" style="--c:${A[1]}"><div class="rzh${lv.length && dn.length === lv.length ? ' full' : ''}"><span class="e">${A[0]}</span><b>${esc(A[2])}</b><span class="n">${dn.length === lv.length && lv.length ? '✓ ' : ''}${dn.length} of ${lv.length}</span></div>
        ${open.map(x => card(s, x, ed)).join('')}${dn.length ? `<div class="rzd">Done</div>${dn.map(x => card(s, x, ed)).join('')}` : ''}</div>`; }).join('');
    return `<div class="rzw"><div class="rzbd">${cols}</div>${Object.keys(groups).length > 4 ? '<div class="rzhint">Scroll sideways for more →</div>' : ''}</div>`;
  }
  function societies(ed) {
    const M = ST.periods.M, L = ST.soc.filter(x => x.owner === OWN && (x.step < 6 || String(x.dates[6] || '').slice(0, 7) === M));
    const cols = STEPS.map((nm, i) => { const C = L.filter(x => x.step === i);
      return `<div class="rzc" style="--c:${i === 6 ? '#DD30B1' : '#4101F7'}"><div class="rzh"><span class="rzsn">${i + 1}</span><b>${nm}</b><span class="n">${C.length}</span></div>
        ${i === 4 || i === 5 ? '<span class="rzop">With Offline Ops</span>' : ''}
        ${C.map(x => `<div class="rzsc${i === 6 ? ' ln' : ''}"><b>${esc(x.name)}</b>${x.note ? `<small>${esc(x.note)}</small>` : ''}<small>${x.dates[i] ? (i === 6 ? 'Launched on ' : 'Here since ') + dm(x.dates[i]) + '.' : ''}</small>
          <div class="pg">${STEPS.map((_, j) => `<i class="${j <= x.step ? 'f' : ''}"></i>`).join('')}</div>
          ${ed ? `<div class="ac">${i < 6 ? `<button class="nx" data-rzs="${x.id}" data-d="1">${i === 5 ? 'Launch 🚀' : 'Next step →'}</button>` : ''}${i > 0 ? `<button class="bk" data-rzs="${x.id}" data-d="-1">← Back</button>` : ''}</div>` : ''}</div>`).join('') || '<div class="rzemp">None yet.</div>'}
        ${i === 0 && ed ? (ADD ? `<div class="rzf"><input id="rzsn" placeholder="Society name" maxlength="80"><input id="rzsno" placeholder="The initial idea, in a line" maxlength="200"><div class="r"><button class="s" data-rzadd="save">Add</button><button class="c" data-rzadd="cancel">Cancel</button></div></div>` : '<button class="rzadd" data-rzadd="open">+ Add a society</button>') : ''}</div>`; }).join('');
    return `<div class="rzw"><div class="rzm">${cols}</div></div>`;
  }
  function draw(err) {
    const box = $('riyaz'); if (!box) return;
    if (!ST || !ST.owners || !ST.owners.length) { box.hidden = true; return; }
    box.hidden = false; const O = own(), ed = O.edit, me = O.kind === 'me';
    const M = ST.periods.M, launched = ST.soc.filter(x => x.owner === OWN && x.step >= 6 && String(x.dates[6] || '').slice(0, 7) === M).length;
    const cnt = { D: [done('D', OWN), live('D').length], W: [done('W', OWN), live('W').length], M: [launched, 1] };
    const [d, t] = cnt[TAB], name = { D: 'Daily', W: 'Weekly', M: 'Monthly' }[TAB];
    const sub = me ? 'Your own Riyaz.' : TAB === 'D' ? `Small habits that keep ${O.label} in tune.` : TAB === 'W' ? `This week, ${wk()}. Starts again on Tuesday.` : 'Society activation. Progress is checked every week.';
    const pts = points(OWN), lv = level(pts), sk = streak(OWN), pToday = points(OWN, 'D:' + ST.periods.D), lu = last(OWN, per(TAB === 'M' ? 'D' : TAB));
    const pick = ST.owners.length > 1 ? `<select class="rzo" id="rzown" aria-label="Whose Riyaz">${ST.owners.map(o => `<option value="${esc(o.key)}"${o.key === OWN ? ' selected' : ''}>${esc(o.kind === 'me' ? 'My Riyaz' : o.label + (o.edit ? '' : ' · view only'))}</option>`).join('')}</select>` : '';
    let body;
    if (me) body = `<div class="rzempty"><b>Your Riyaz is being written.</b>Your own daily, weekly and monthly habits will appear here once they are set. Meanwhile, pick a centre above to follow its Riyaz through the day.</div>`;
    else body = TAB === 'M' ? societies(ed) : board(TAB, ed);
    box.innerHTML = `<div class="rzb"><div class="rzt"><b>${name} Riyaz</b><span>${esc(sub)}</span></div>
      <div class="rzs" role="group" aria-label="Riyaz">${['D', 'W', 'M'].map(s => `<button type="button" data-rztab="${s}" aria-pressed="${s === TAB}">${{ D: 'Daily', W: 'Weekly', M: 'Monthly' }[s]}${me ? '' : `<i>${cnt[s][0]} of ${cnt[s][1]}</i>`}</button>`).join('')}</div>${pick}
      ${me ? '' : `<div class="rzp"><div class="a"><b>${d}<small>of ${t} ${TAB === 'M' ? 'launched' : 'done'}</small></b><em>${TAB === 'M' ? (launched ? 'Launched this month. Brilliant! 🎉' : 'Move a society along this week.') : cheer(d, t)}</em></div><div class="rzbar"><i style="width:${t ? Math.min(100, d / t * 100) : 0}%"></i></div></div>`}</div>
      ${me ? '' : `<div class="rzg"><span class="lv">${lv.name}</span><span>⭐ <b>${pts.toLocaleString('en-IN')}</b> Riyaz points${lv.next ? ` · ${(lv.next[0] - pts).toLocaleString('en-IN')} to ${lv.next[1]}` : ''}</span><span>✨ <b>+${pToday}</b> today</span>${sk ? `<span>🔥 <b>${sk}-day</b> streak</span>` : ''}</div>`}
      ${!ed && !me ? `<div class="rzro">Viewing ${esc(O.label)}’s Riyaz. Only its Centre Manager can tick it.${lu ? ` Last update ${esc(lu[5].slice(11))} by ${esc(lu[4])}.` : ' Nothing ticked yet today.'}</div>` : ''}
      ${body}${err ? `<div class="rzerr">${esc(err)}</div>` : ''}`;
    if (window.rzStory) window.rzStory();
  }
  function wk() { const p = ST.periods.W.split('-').map(Number), a = new Date(p[0], p[1] - 1, p[2]), b = new Date(a); b.setDate(b.getDate() + 6);
    const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; return `${a.getDate()} ${M[a.getMonth()]} to ${b.getDate()} ${M[b.getMonth()]}`; }
  function confetti() {
    const c = document.createElement('div'); c.className = 'rzcf'; const C = ['#4101F7', '#6601FD', '#DD30B1', '#F1B6FA', '#F5906F', '#9BB6FF'];
    c.innerHTML = Array.from({ length: 70 }, () => `<i style="left:${Math.random() * 100}%;background:${C[Math.floor(Math.random() * C.length)]};animation-delay:${Math.random() * .5}s;animation-duration:${1.2 + Math.random() * 1.2}s"></i>`).join('');
    document.body.appendChild(c); setTimeout(() => c.remove(), 3000);
  }
  function pop(k, n) { const el = document.querySelector(`.rzk[data-k="${k}"]`); if (!el) return; const p = document.createElement('span'); p.className = 'rzpop'; p.textContent = '+' + n; el.appendChild(p); }
  async function call(action, args) {
    if (BUSY) return; BUSY = true;
    try { const j = await ArtiumAuth.call(action, args); if (j && j.error) throw new Error(j.error === 'not-allowed' ? 'Only this centre’s Centre Manager can change it.' : j.error);
      ST = j; draw(); return true; }
    catch (e) { draw(e.message || String(e)); return false; } finally { BUSY = false; }
  }
  // tick locally first, then save
  async function tick(item, value, s) {
    const p = per(s), r = ST.rows.find(x => x[0] === OWN && x[1] === p && x[2] === item), before = r ? r[3] : 0;
    const wasFull = done(s, OWN) === live(s).length;
    if (r) r[3] = value; else ST.rows.push([OWN, p, item, value, '', '']);
    draw(); if (value > before) pop(item.replace(/_n$/, ''), /_n$/.test(item) ? UNIT : PTS[s]);
    if (!wasFull && done(s, OWN) === live(s).length) setTimeout(confetti, 150);
    const ok = await call('riyazTick', { owner: OWN, scope: s, item, value });
    if (ok === false) { const q = ST.rows.find(x => x[0] === OWN && x[1] === p && x[2] === item); if (q) q[3] = before; }
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-rztab],[data-rzt],[data-rzc],[data-rzgo],[data-rzs],[data-rzadd]'); if (!b || !ST) return;
    const O = own();
    if (b.dataset.rztab) { TAB = b.dataset.rztab; ADD = false; try { localStorage.setItem('artium_rz_tab', TAB); } catch (x) {} draw(); return; }
    if (b.dataset.rzgo) { go(b.dataset.rzgo); return; }
    if (!O || !O.edit) return;
    if (b.dataset.rzt) { const k = b.dataset.rzt; tick(k, val(OWN, per(TAB), k) > 0 ? 0 : 1, TAB); return; }
    if (b.dataset.rzc) { const k = b.dataset.rzc, x = ITEMS[TAB].find(y => y[1] === k), n = Math.max(0, Math.min(x[3].n, val(OWN, per(TAB), k + '_n') + (+b.dataset.d)));
      tick(k + '_n', n, TAB); if (n >= x[3].n && !(val(OWN, per(TAB), k) > 0)) setTimeout(() => tick(k, 1, TAB), 400); return; }
    if (b.dataset.rzs) { const x = ST.soc.find(y => y.id === b.dataset.rzs); call('riyazSociety', { op: 'step', id: b.dataset.rzs, dir: +b.dataset.d }).then(ok => { if (ok && x && +b.dataset.d > 0 && x.step === 5) confetti(); }); return; }
    if (b.dataset.rzadd === 'open') { ADD = true; draw(); const i = $('rzsn'); if (i) i.focus(); return; }
    if (b.dataset.rzadd === 'cancel') { ADD = false; draw(); return; }
    if (b.dataset.rzadd === 'save') { const nm = ($('rzsn') || {}).value || '', no = ($('rzsno') || {}).value || ''; if (!nm.trim()) { $('rzsn').focus(); return; }
      ADD = false; call('riyazSociety', { op: 'add', owner: OWN, name: nm, note: no }); }
  });
  document.addEventListener('change', e => { if (e.target.id === 'rzown') { OWN = e.target.value; try { localStorage.setItem('artium_rz_owner', OWN); } catch (x) {} ADD = false; draw(); } });
  window.Riyaz = {
    start() {
      const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
      ArtiumAuth.call('riyaz', {}).then(j => { if (!j || j.error) return; ST = j; if (!ST.owners.length) return draw();
        let k = ''; try { k = localStorage.getItem('artium_rz_owner') || ''; } catch (e) {}
        OWN = ST.owners.some(o => o.key === k) ? k : (ST.owners.find(o => o.edit && o.kind === 'centre') || ST.owners.find(o => o.kind === 'centre') || ST.owners[0]).key; draw(); }).catch(() => {});
    },
    // for the one-line story in the Delight view
    summary() { if (!ST || !ST.owners || !ST.owners.length) return null; const C = ST.owners.filter(o => o.kind === 'centre');
      const mine = C.find(o => o.edit); const N = live('D').length;
      if (mine) return { mine: true, centre: mine.key, done: done('D', mine.key), total: N };
      const t = C.reduce((s, o) => s + done('D', o.key), 0); return { mine: false, pct: C.length ? Math.round(t / (C.length * N) * 100) : 0 }; }
  };
})();
