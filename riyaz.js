/* Riyaz: the daily, weekly and monthly checklist on Home (Productivity view).
   A Centre Manager ticks their own centre's Riyaz; the site's editors have their own (My Riyaz) and can look at every centre's without ticking.
   Ticks are saved through the data service (riyaz, riyazTick, riyazSociety). Points add up as items are done; nothing is compared between centres. */
(function () {
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const go = k => { try { window.parent.location.hash = k; } catch (e) { location.hash = k; } };
  /* The items. pts: points for ticking it. n: a counter (target), each unit worth 2 points. link: a page on the site. off: not available yet. */
  const AREAS = {
    basics: ['✅', '#4101F7', 'Daily basics'], hyg: ['🌅', '#F5906F', 'Centre hygiene and vibe'], num: ['📊', '#6601FD', 'Numbers review'], sales: ['📞', '#DD30B1', 'Sales operations'],
    admin: ['🗂️', '#2F4DB8', 'Admin operations'], teach: ['🎼', '#8C7BD9', 'Teaching quality and in-class experience'],
    teacher: ['🎙️', '#E58BD8', 'Teacher relationships and experience'], parent: ['🤝', '#4101F7', 'Parent and learner relationships'], data: ['🧹', '#6A6488', 'Data hygiene']
  };
  const ITEMS = {
    D: [
      ['basics', 'tasks_done', 'Visit the Tasks page and finish the assigned tasks', { link: 'goals', i: 'Under Tasks on the Goals page. If no tasks are assigned to you today, tick it anyway.', sub: 'No tasks assigned today? Tick it anyway.' }],
      ['hyg', 'setup', 'Set up the centre as per SOP', { i: 'Waiting in the reception should feel musical and calm.', list: ['TV on, with a video playing.', 'Air fresheners on.', 'Reception lights on.', 'Soft music playing, at a low volume.'] }],
      ['num', 'rp_review', 'Review the Renewal Pipeline', { link: 'pipeline' }],
      ['num', 'ap_review', 'Review the Admissions Pipeline', { link: 'admissions' }],
      ['num', 'dt_review', 'Review the Daily Tracker', { link: 'daily', i: 'Including the lead-to-visit and visit-to-conversion funnels.' }],
      ['num', 'insights', 'Add insights to the Weekly Offline Review', { i: 'Note what the numbers are saying, so the weekly review is ready.' }],
      ['sales', 'ren_calls', 'Make renewal calls', { i: 'And update the Renewal Pipeline as you go.' }],
      ['sales', 'vis_calls', 'Call visitors who didn’t join', { i: 'And update the Admissions Pipeline as you go.' }],
      ['admin', 'attendance', 'Check daily attendance', {}],
      ['admin', 'batches', 'Check scheduled vs completed batches', {}],
      ['teach', 'observe', 'Observe a class for 30 minutes', { i: 'Keep in touch with what each teacher does in class, every day.' }],
      ['teach', 'aha_watch', 'Watch the Aha moments shot today', { i: 'The Aha moment videos shot at your centre today.' }],
      ['teach', 'practice', 'Practice plans issued', { off: 1 }], ['teach', 'aha', 'Aha moments created', { off: 1 }], ['teach', 'curric', 'Curriculum progress', { off: 1 }],
      ['teacher', 'teacher_talk', 'Talk to a teacher for 5 to 10 minutes', { i: 'A different teacher each day, so every teacher is covered within the week. Ask how it’s going and whether they need help.' }],
      ['parent', 'parents', 'Meet 2 parents in the reception', { n: 2, i: 'Ask about their child’s progress and build rapport.' }],
      ['parent', 'catchup', 'Make catch-up calls', { n: 7, auto: 1, sub: 'Up to 7, based on how many are due. Check-ins you record are counted automatically.' }]],
    W: [
      ['hyg', 'class_hyg', 'Review classroom hygiene', { i: 'Every classroom in order, instruments and requirements up to date, and teachers have what they need.' }],
      ['teach', 'audits', 'Audit 4 classes', { n: 4 }],
      ['admin', 'batch_opt', 'Optimise batches', { i: 'Make sure no teacher has dead hours or cold slots where the average batch size is low.' }],
      ['data', 'loose', 'Fix this week’s Loose Ends', { link: 'loose' }]],
    M: [['teacher', 'teacher_rr', 'Conduct Teacher R&R', { i: 'Rewards and recognition for the teachers.' }]]
  };
  /* My Riyaz (the site's editor): worked Monday to Friday, with the week starting on Monday. */
  const MEAREAS = {
    basics: ['✅', '#4101F7', 'Daily basics'], sales: ['📞', '#DD30B1', 'Sales operations'], cm: ['🧭', '#2F4DB8', 'Centre Managers'], ppl: ['🎙️', '#E58BD8', 'People management'],
    prod: ['🛠️', '#6A6488', 'Product and Tech'], num: ['📊', '#6601FD', 'Numbers review'], eng: ['🎶', '#8C7BD9', 'Engagement'], mkt: ['📣', '#F5906F', 'Marketing']
  };
  const ME = {
    D: [
      ['basics', 'm_tasks', 'Visit the Tasks page and finish the assigned tasks', { link: 'goals', i: 'Under Tasks on the Goals page. If no tasks are assigned to you today, tick it anyway.', sub: 'No tasks assigned today? Tick it anyway.' }],
      ['sales', 'm_daily', 'Review the Daily Tracker', { link: 'daily' }],
      ['sales', 'm_adm', 'Review the Admissions Pipeline', { link: 'admissions' }],
      ['sales', 'm_ren', 'Review the Renewal Pipeline', { link: 'pipeline' }],
      ['sales', 'm_pkg', 'Review Package completion', { link: 'pipeline', i: 'In the Renewal Pipeline, under the Package completion tab.' }],
      ['cm', 'm_chk', 'Go through the day’s Check-ins', { links: [['Check-ins', 'checkins']], i: 'The check-ins punched in by the Centre Managers for the day.' }],
      ['num', 'm_pulse', 'Review the Business Pulse page', { link: 'home' }],
      ['num', 'm_ins', 'Add insights to the Execs Call and Weekly Offline Review pages', { links: [['Execs Call', 'execs'], ['Weekly Offline Review', 'review']] }],
      ['eng', 'm_aha', 'Watch the Aha moments shot today', { i: 'The Aha moment videos shot at the centres today.' }],
      ['ppl', 'm_teach', 'Speak to one teacher', {}],
      ['eng', 'm_learn', 'Speak to 5 learners', { n: 5, auto: 1, sub: 'Conversations you record are counted automatically.' }]],
    W: [
      ['ppl', 'm_tp', 'Review Teacher performance', { link: 'teachers', i: 'Demo conversion, renewal performance and the like.' }],
      ['prod', 'm_road', 'Review Product roadmap progress', { n: 2, sub: 'Twice a week.' }],
      ['eng', 'm_mal', 'Review Monthly Active Learners', { link: 'stats' }],
      ['sales', 'm_req', 'Admissions against the requirement, course-wise', { link: 'admissions', i: 'Compare the admissions actually received with the requirement set at the start of the month.' }],
      ['sales', 'm_stat', 'Review admission statistics', { link: 'stats', i: 'Discount %, age-group-wise and subscription-wise admissions.' }]],
    M: [
      ['eng', 'm_eng', 'Learner engagement activity', { i: 'Plan at least one, and have it executed through the Centre Managers.', sub: 'Plan at least 1, executed through the Centre Managers.' }],
      ['ppl', 'm_121', 'Conduct a 1:1 meeting with each staff member', { sub: 'Every staff member, once this month.' }],
      ['mkt', 'm_act', 'Offline activation or promotional activity', { i: 'Plan at least one offline activation event or promotional activity, and have it executed through the Centre Managers.', sub: 'Plan at least 1, executed through the Centre Managers.' }]]
  };
  const isMe = o => String(o).indexOf('me:') === 0;
  const setOf = o => isMe(o) ? ME : ITEMS;
  const areaOf = (o, a) => (isMe(o) ? MEAREAS : AREAS)[a];
  // the weekly off: Monday for the centres, Saturday and Sunday for My Riyaz
  const offDay = (o, w) => isMe(o) ? (w === 0 || w === 6) : w === 1;
  const curDay = () => DAY || ST.periods.D;
  const NEWSRV = () => !!(ST && ST.periods && ST.periods.WM);   // the data service that can save a past day and the Monday week
  const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const dateOf = t => { const p = t.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  // the start of the week a day falls in: Monday for My Riyaz, Tuesday for the centres
  const wkKey = o => { if (isMe(o) && !NEWSRV()) return ST.periods.W; const d = dateOf(curDay()), back = (d.getDay() - (isMe(o) ? 1 : 2) + 7) % 7; d.setDate(d.getDate() - back); return ymd(d); };
  const PTS = { D: 10, W: 25, M: 50 }, UNIT = 2, STEP_PTS = 20, LAUNCH_PTS = 100;
  const STEPS = ['Initial idea', 'Establish communication', 'Meet the committee', 'Pitch the initial idea', 'Final idea after the recce', 'Determine the logistics', 'Launch'];
  /* Monthly leagues: everyone starts the month at zero. The share of the month's maximum points decides the league. */
  const LEAGUES = [[0, 'Rookie', '🌱'], [.125, 'Apprentice', '🎵'], [.25, 'Skilled', '🎯'], [.375, 'Contender', '🔥'], [.5, 'Pro', '⚡'], [.625, 'Elite', '💎'], [.75, 'Master', '🏆'], [.875, 'Legend', '👑']];   // a new league every 12.5%
  const ICO = {
    basics: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/>', hyg: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"/>',
    num: '<path d="M5 20v-8M12 20V5M19 20V9"/>', sales: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    admin: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h4"/>', teach: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    teacher: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>', parent: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.5-3.5 3-5 6-5s5.5 1.5 6 5"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.5c3 0 4.6 1.4 5 4.5"/>',
    data: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    cm: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>', ppl: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    prod: '<path d="M14.7 6.3a4 4 0 0 0 5 5L11 20a2.1 2.1 0 0 1-3-3z"/><path d="M14.7 6.3a4 4 0 0 1 5 5"/>', eng: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    mkt: '<path d="M3 11v2a1 1 0 0 0 1 1h3l8 4V6L7 10H4a1 1 0 0 0-1 1zM18 9a4 4 0 0 1 0 6"/>'
  };
  const ico = a => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICO[a] || ICO.basics}</svg>`;
  const EXP = {};   // areas whose finished items are shown
  let ST = null, OWN = null, TAB = 'D', BUSY = false, ADD = false, DAY = '';
  try { TAB = localStorage.getItem('artium_rz_tab') || 'D'; if (!/^[DWM]$/.test(TAB)) TAB = 'D'; } catch (e) {}

  const css = `
  .rz{position:relative;z-index:2}
  .rzb{display:flex;align-items:center;gap:22px;flex-wrap:wrap;padding:22px 28px;border-radius:26px;background:linear-gradient(135deg,#F4EEFF 0%,#FCEFFA 100%);box-shadow:0 1px 2px rgba(1,7,60,.05),0 30px 60px -42px rgba(1,7,60,.4)}
  .rzt b{display:block;font:800 25px var(--display,'Onest');letter-spacing:-.5px;color:#01073C}.rzt span{font:400 14px var(--body,'Onest');color:#4A4466}
  .rzs{display:inline-flex;gap:3px;background:rgba(255,255,255,.7);border-radius:16px;padding:4px}
  .rzs button{all:unset;cursor:pointer;display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:12px;font:600 13.5px var(--body,'Onest');color:#4A4466}
  .rzs button i{font-style:normal;font-weight:700;font-size:11.5px;color:#6A6488}.rzs button[aria-pressed="true"]{background:#fff;color:#01073C;box-shadow:0 10px 22px -14px rgba(1,7,60,.4)}.rzs button[aria-pressed="true"] i{color:#4101F7}
  .rzdt{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.75);border-radius:12px;padding:5px 8px 5px 12px;font:600 13.5px var(--body,'Onest');color:#01073C}
  .rzdt input{border:0;background:none;font:600 13.5px var(--body,'Onest');color:#01073C;outline:0;cursor:pointer}.rzdt.past{background:#fff;box-shadow:0 0 0 2px #B9AEDB}
  .rzdt button{all:unset;cursor:pointer;font:700 12px var(--body,'Onest');color:#fff;background:linear-gradient(135deg,#4101F7,#6601FD);border-radius:8px;padding:5px 9px}
  .rzo{all:unset;cursor:pointer;font:600 13.5px var(--body,'Onest');color:#01073C;background:rgba(255,255,255,.75);border-radius:12px;padding:8px 34px 8px 12px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234A4466' stroke-width='3'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center}
  .rzp{margin-left:auto;min-width:200px;flex:1;max-width:420px}
  .rzp .a{display:flex;justify-content:space-between;align-items:baseline;gap:12px}.rzp .a b{font:800 28px var(--display,'Onest');color:#01073C;white-space:nowrap}.rzp .a b small{font:600 14px var(--body,'Onest');color:#6A6488;margin-left:5px}
  .rzp .a em{font:600 13.5px var(--body,'Onest');font-style:normal;color:#4101F7;text-align:right}
  .rzbar{height:10px;border-radius:6px;background:rgba(255,255,255,.9);margin-top:9px;overflow:hidden}.rzbar i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,#4101F7,#6601FD 50%,#DD30B1);transition:width .5s cubic-bezier(.2,.8,.2,1)}
  .rzg{display:flex;gap:18px;flex-wrap:wrap;margin:14px 2px 0;font:500 13px var(--body,'Onest');color:#4A4466;align-items:center}
  .rzg span{display:inline-flex;align-items:center;gap:7px}.rzg b{color:#01073C;font-weight:700}.rzg .lv{font:700 12.5px var(--body,'Onest');color:#fff;border-radius:999px;padding:5px 12px;background:linear-gradient(135deg,#8A83A6,#B7B0CC)}
  .rzg .rzi{display:inline-grid;gap:0}.rzg .rzq .qr>span:not(.qc),.rzg .rzq .qp>span{display:block}.rzg .rzi>.rzq{left:auto;right:-12px;width:330px}
  .rzg .lv1{background:linear-gradient(135deg,#8C7BD9,#B9AEDB)}.rzg .lv2{background:linear-gradient(135deg,#6B3FC7,#9B6BFF)}.rzg .lv3{background:linear-gradient(135deg,#6601FD,#B98BFF)}
  .rzg .lv4{background:linear-gradient(135deg,#4101F7,#6601FD)}.rzg .lv5{background:linear-gradient(135deg,#4101F7,#DD30B1)}.rzg .lv6{background:linear-gradient(135deg,#2B0256,#6601FD 55%,#DD30B1)}
  .rzg .lv7{background:linear-gradient(135deg,#01064C,#4101F7 40%,#DD30B1 75%,#F5906F);box-shadow:0 8px 20px -10px rgba(221,48,177,.7)}
  .rzro{margin:12px 2px 0;font:500 13px var(--body,'Onest');color:#6A6488}
  .rzw{position:relative;margin-top:18px}
  .rzbd{display:grid;grid-template-columns:repeat(auto-fill,minmax(252px,1fr));gap:22px 16px;align-items:start;padding:2px 2px 14px}
  .rzc{min-width:0;display:flex;flex-direction:column;gap:10px}
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
  /* Explainers: a card with a tinted header (name and one-line meaning), then ticked or numbered rows and dot hints */
  .rzi>.rzq{display:none;position:absolute;left:-12px;top:24px;z-index:40;width:300px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 0 0 1px #E6E0F3,0 24px 48px -22px rgba(1,7,60,.45);font:400 13px/1.45 var(--body,'Onest');font-style:normal;color:#4A4466;text-align:left;cursor:default;letter-spacing:0;text-transform:none}
  .rzi:hover>.rzq,.rzi:focus>.rzq{display:block}
  .rzq .qh{padding:13px 15px 11px;background:linear-gradient(135deg,#F4EEFF,#FCEFFA)}.rzq .qt{display:flex;align-items:center;gap:8px;font:700 14.5px var(--body,'Onest');color:#01073C}.rzq .qt i{width:9px;height:9px;border-radius:3px;background:#4101F7;flex:none}
  .rzq .qd{margin-top:3px;font:400 12.5px/1.45 var(--body,'Onest');color:#4A4466}
  .rzq .qb{padding:11px 15px 14px;display:flex;flex-direction:column;gap:7px}.rzq .ql{font:700 10px var(--body,'Onest');letter-spacing:.12em;text-transform:uppercase;color:#6A6488;margin-top:3px}
  .rzq .qr{display:flex;gap:9px;align-items:flex-start;font:400 12.5px/1.4 var(--body,'Onest')}.rzq .qr b{color:#01073C;font-weight:700}
  .rzq .qc{flex:none;min-width:18px;height:18px;padding:0 5px;box-sizing:border-box;border-radius:9px;display:grid;place-items:center;font:700 10.5px var(--body,'Onest');background:#EFEAF9;color:#4101F7}
  .rzq .qg{display:grid;grid-template-columns:1fr 1fr;gap:5px 12px}.rzq .qg div{font:500 12.5px var(--body,'Onest');color:#4A4466}.rzq .qg b{color:#01073C}
  .rzq .qp{display:flex;gap:9px;align-items:flex-start;font:400 12.5px/1.45 var(--body,'Onest')}.rzq .qp>i{flex:none;width:8px;height:8px;border-radius:50%;margin-top:5px}
  .rzl{all:unset;cursor:pointer;display:block;width:fit-content;margin-top:5px;font:600 12px var(--body,'Onest');color:#4101F7}
  .rzn{display:flex;align-items:center;gap:7px;margin-top:9px;flex-wrap:wrap}
  .rzn button.rzu{all:unset;cursor:pointer;width:20px;height:20px;border-radius:6px;border:2px solid #CFC6EA;background:#fff;box-sizing:border-box;display:grid;place-items:center;transition:all .15s}.rzn button.rzu:hover{border-color:#4101F7}.rzn button.rzu:disabled{cursor:default}.rzn button.rzu.au[aria-checked="true"]{background:linear-gradient(135deg,#6601FD,#DD30B1)}.rzn button.rzu[aria-checked="true"]{border:0;background:linear-gradient(135deg,#4101F7,#6601FD)}.rzn button.rzu[aria-checked="true"]::after{content:"";width:9px;height:5px;border:2.5px solid #fff;border-top:0;border-right:0;transform:rotate(-45deg) translate(1px,-1px)}
  .rzn span{font:700 12px var(--body,'Onest');color:#4101F7;margin-left:2px}
  .rzd{font:700 10px var(--body,'Onest');letter-spacing:.14em;text-transform:uppercase;color:#8A83A6;margin:6px 4px 0}
  .rzpop{position:absolute;right:12px;top:8px;font:800 13px var(--body,'Onest');color:#4101F7;pointer-events:none;animation:rzup 1s ease-out forwards}
  @keyframes rzup{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-26px)}}
  .rzhint{margin-top:2px;font:600 12.5px var(--body,'Onest');color:#6A6488;text-align:right}
  .rzm{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:22px 14px;align-items:start;padding:2px 2px 14px}
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

  /* the calmer, playful look: big headline, league hero, white area cards */
  .rzh2{position:relative;display:flex;flex-wrap:wrap;align-items:flex-start;gap:14px 18px;padding:2px 2px 54px}
  .rzh2 .rzt{flex:1 1 360px;min-width:0}
  .rzh2 .rzt b{font:800 clamp(44px,6vw,76px)/.98 var(--display,'Onest');letter-spacing:-.045em;color:#01073C;padding-bottom:6px}
  .rzh2 .rzt b em{font-style:normal;background:linear-gradient(90deg,#4101F7,#DD30B1 60%,#F5906F);-webkit-background-clip:text;background-clip:text;color:transparent;padding-right:6px}
  .rzh2 .rzt span{display:block;margin-top:8px;font:500 18px/1.4 var(--body,'Onest');color:#4A4466}
  .rzct{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end;align-items:center}
  .rzh2 .rzs{background:rgba(255,255,255,.6);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
  .rzst{position:absolute;right:4px;bottom:-4px;width:330px;height:100px;pointer-events:none;z-index:3}
  .rzst i{position:absolute;display:grid;place-items:center;border-radius:24px;box-shadow:0 30px 50px -26px rgba(1,7,60,.45);animation:rzbob 7s ease-in-out infinite alternate}
  .rzst svg{width:52%;height:52%;fill:none;stroke:#fff;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
  .rzst .a{right:230px;top:0;width:86px;height:86px;background:linear-gradient(135deg,#DD30B1,#F17AD0);--r:12deg}
  .rzst .b{right:130px;top:20px;width:66px;height:66px;border-radius:50%;background:linear-gradient(135deg,#4101F7,#6601FD);--r:-10deg;animation-delay:-2s}
  .rzst .c{right:6px;top:30px;width:80px;height:80px;background:linear-gradient(135deg,#C9502A,#F5906F);--r:-7deg;animation-delay:-4s}
  @keyframes rzbob{from{transform:translateY(0) rotate(var(--r))}to{transform:translateY(-10px) rotate(calc(var(--r) + 3deg))}}
  .rzlg{position:relative;z-index:1;display:grid;grid-template-columns:340px 1fr;border-radius:32px;overflow:hidden;background:rgba(255,255,255,.82);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 2px 4px rgba(1,7,60,.04),0 40px 80px -40px rgba(65,1,247,.45)}
  .rzlp{position:relative;overflow:hidden;color:#fff;padding:24px 26px;background:linear-gradient(140deg,#4101F7 0%,#6601FD 55%,#DD30B1 125%)}
  .rzlp::after{content:"";position:absolute;right:-60px;top:-60px;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(241,182,250,.5),rgba(241,182,250,0) 70%)}
  .rzlb{position:relative;z-index:1;display:flex;align-items:center;gap:13px}
  .rzbg{width:62px;height:62px;border-radius:50%;display:grid;place-items:center;background:#fff;font-size:30px;transform:rotate(-8deg);box-shadow:0 14px 26px -12px rgba(1,7,60,.6)}
  .rzlb small{display:block;font:700 10.5px var(--body,'Onest');letter-spacing:.16em;text-transform:uppercase;color:#DCD2FF}.rzlb b{font:800 28px var(--display,'Onest');letter-spacing:-.02em}
  .rzpt{position:relative;z-index:1;margin-top:18px}.rzpt b{display:block;font:800 clamp(44px,5vw,64px)/1 var(--display,'Onest');letter-spacing:-.05em}.rzpt span{display:block;margin-top:6px;font:500 13px var(--body,'Onest');color:#E4DCFF}
  .rzlr{padding:22px 28px;display:flex;flex-direction:column;justify-content:center;gap:14px;min-width:0}
  .rzlt{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font:700 clamp(19px,2.2vw,26px) var(--display,'Onest');letter-spacing:-.02em;color:#01073C}
  .rzlt em{font-style:normal;background:linear-gradient(90deg,#4101F7,#DD30B1);-webkit-background-clip:text;background-clip:text;color:transparent}
  .rzlt .rzi{margin-left:2px}
  .rzlbar{height:14px;border-radius:9px;background:#EEE9F8;overflow:hidden}.rzlbar i{display:block;height:100%;border-radius:9px;background:linear-gradient(90deg,#4101F7,#DD30B1);min-width:14px}
  .rzlbl{display:flex;justify-content:space-between;margin-top:-6px;font:600 12.5px var(--body,'Onest');color:#8A84A3}.rzlbl span:first-child{color:#4101F7;font-weight:700}
  .rzcp{display:flex;gap:12px;flex-wrap:wrap}
  .rzch{display:flex;align-items:center;gap:12px;background:#fff;border-radius:20px;padding:10px 16px;box-shadow:0 12px 26px -18px rgba(1,7,60,.4)}
  .rzch b{display:block;font:800 19px var(--display,'Onest');letter-spacing:-.02em;color:#01073C}.rzch span.s{display:block;font:500 12.5px var(--body,'Onest');color:#6A6488;margin-top:2px}
  .rzch.fl{background:#FFF1EA}.rzch.fl b{color:#A8431E}
  .rzrg{width:38px;height:38px;flex:none}.rzrg svg{width:38px;height:38px;transform:rotate(-90deg)}.rzrg circle{fill:none;stroke-width:5}.rzrg .t{stroke:#E6E0F7}.rzrg .p{stroke:url(#rzgr);stroke-linecap:round;transition:stroke-dashoffset .5s}
  .rzfl{flex:none;width:34px;height:34px;border-radius:12px;background:linear-gradient(135deg,#C9502A,#F5906F);display:grid;place-items:center;transform:rotate(-8deg)}.rzfl svg{width:18px;height:18px;fill:none;stroke:#fff;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
  .rzgd{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:20px;align-items:stretch;margin-top:22px}
  .rzcd{position:relative;display:flex;flex-direction:column;background:#fff;border-radius:28px;padding:18px 18px 10px;box-shadow:0 2px 4px rgba(1,7,60,.04),0 30px 60px -44px rgba(1,7,60,.35)}
  .rzcd header{display:flex;align-items:center;gap:12px;padding:0 2px 10px}
  .rzic{flex:none;width:46px;height:46px;border-radius:16px;display:grid;place-items:center;background:var(--c);color:#fff;transform:rotate(-7deg);box-shadow:0 14px 22px -12px var(--c)}.rzcd:nth-child(even) .rzic{transform:rotate(7deg)}
  .rzic svg{width:23px;height:23px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
  .rzcd header b{flex:1;font:700 15.5px/1.25 var(--display,'Onest');color:#01073C}.rzcd header em{font:700 13px var(--body,'Onest');font-style:normal;color:#4101F7;flex:none}
  .rzcd .rzk{background:none;box-shadow:none;border-radius:0;border-top:1px solid #F1EDF9;padding:13px 6px;position:relative}.rzcd .rzk:first-of-type{border-top:0}
  .rzcd .rzx{border-radius:50%;border-color:#BFB2F2}.rzcd .rzx:hover{border-color:#4101F7}
  .rzcd .rzx[aria-checked="true"]{animation:rzck .35s cubic-bezier(.3,1.6,.5,1)}
  @keyframes rzck{from{transform:scale(.5)}to{transform:scale(1)}}
  .rzcd .rzk .tl{font:600 14.5px/1.4 var(--body,'Onest')}
  .rzcd .rzk .rzi{opacity:0;margin-left:7px;vertical-align:1px}.rzcd .rzk:hover .rzi,.rzcd .rzk:focus-within .rzi{opacity:1}
  @media (hover:none){.rzcd .rzk .rzi{opacity:1}}
  .rzcd .rzn button.rzu{border-radius:50%;border-color:#BFB2F2}
  .rzar{all:unset;cursor:pointer;flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;margin-top:-3px;color:#9C8FD0}.rzar:hover{background:#F1EBFF;color:#4101F7}
  .rzar svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
  .rzfo{all:unset;cursor:pointer;box-sizing:border-box;margin-top:auto;display:flex;align-items:center;justify-content:space-between;width:100%;padding:11px 6px 7px;border-top:1px solid #F1EDF9;font:600 12.5px var(--body,'Onest');color:#8A84A3}
  .rzfo svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;transition:transform .2s}.rzfo.o svg{transform:rotate(180deg)}
  .rzsoon{padding:0 6px 8px;font:500 12px var(--body,'Onest');color:#8A84A3}
  .rzdv{margin:2px 0 0;opacity:.7}.rzdv .rzk{padding:10px 6px}.rzdv .tl{color:#8A83A6;text-decoration:line-through;text-decoration-color:#C9C2E0;font-weight:500}
  .rzfn{all:unset;cursor:pointer;box-sizing:border-box;grid-column:1/-1;display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.7);border-radius:22px;padding:11px 18px}
  .rzfn .t{width:30px;height:30px;border-radius:11px;background:var(--c);display:grid;place-items:center;color:#fff}.rzfn .t svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}
  .rzfn b{font:600 14px var(--body,'Onest');color:#4A4466}.rzfn em{font:700 12px var(--body,'Onest');font-style:normal;color:#137A4F;background:#E3F7EE;border-radius:8px;padding:3px 9px}
  .rzcd .rzpop{right:56px;top:26px}
  @media (max-width:900px){.rzlg{grid-template-columns:1fr}.rzst{display:none}.rzh2{padding-bottom:14px}.rzlr{padding:20px}}
  @media (prefers-reduced-motion:reduce){.rzst i{animation:none;transform:rotate(var(--r))}.rzcd .rzx[aria-checked="true"]{animation:none}}
  @media (max-width:760px){.rzb{padding:18px}.rzp{min-width:0;max-width:none;flex-basis:100%}.rzc{flex-basis:78vw}}`;

  /* Recorded conversations (Check-ins and Focus Groups) tick the items marked auto. ST.auto: { owner: { 'YYYY-MM-DD': learners spoken to } } */
  const autoN = (o, day, x) => Math.min(x[3].n || 0, (((ST && ST.auto || {})[o] || {})[day]) || 0);
  function setRow(o, p, k, v) { const r = ST.rows.find(x => x[0] === o && x[1] === p && x[2] === k); if (r) { if (r[3] < v) { r[3] = v; r[4] = r[4] || 'auto'; } } else ST.rows.push([o, p, k, v, 'auto', '']); }
  function prep(j) {
    if (j && !j.auto && ST) j.auto = ST.auto;
    ST = j; if (!ST || !ST.auto) return;
    Object.keys(ST.auto).forEach(o => setOf(o).D.filter(x => x[3].auto).forEach(x => Object.keys(ST.auto[o]).forEach(d => { const e = autoN(o, d, x); if (!e) return; setRow(o, 'D:' + d, x[1] + '_n', e); if (e >= x[3].n) setRow(o, 'D:' + d, x[1], 1); })));
  }
  const $ = id => document.getElementById(id);
  const own = () => ST && ST.owners.find(o => o.key === OWN);
  const per = (s, o) => s + ':' + (s === 'W' ? wkKey(o == null ? OWN : o) : s === 'D' ? curDay() : curDay().slice(0, 7));
  const val = (o, p, k) => { const r = ST.rows.find(x => x[0] === o && x[1] === p && x[2] === k); return r ? r[3] : 0; };
  const last = (o, p) => ST.rows.filter(x => x[0] === o && x[1] === p).sort((a, b) => a[5] < b[5] ? 1 : -1)[0];
  const live = (s, o) => setOf(o == null ? OWN : o)[s].filter(x => !x[3].off);
  function done(s, o, p) { return live(s, o).filter(x => val(o, p || per(s, o), x[1]) > 0).length; }
  /* Points: every tick, every counted unit, and every society step on the day it was taken.
     pref picks the periods: 'D:2026-11-23' for a day; 'M' for the month (its days, the weeks that start in it, and society steps taken in it). */
  function points(o, pref) {
    const M = ST.periods.M, inM = r => pref === 'M' ? (r[1].slice(2, 9) === M) : r[1].startsWith(pref);
    let p = 0; ST.rows.filter(r => r[0] === o && inM(r)).forEach(r => { const s = r[1][0];
      if (/_n$/.test(r[2])) p += r[3] * UNIT; else if (r[3] > 0) p += PTS[s] || 0; });
    const day = pref === 'M' ? M : pref.slice(2);
    ST.soc.filter(x => x.owner === o).forEach(x => x.dates.forEach((d, i) => { if (i > 0 && String(d || '').startsWith(day)) p += STEP_PTS + (i === 6 ? LAUNCH_PTS : 0); }));
    return p;
  }
  /* The most a centre can earn this month: every working day (Mondays off) of Daily Riyaz, every week that starts in the month,
     and one society taken from idea to launch. */
  function monthMax(o) {
    const me = isMe(o), [y, m] = ST.periods.M.split('-').map(Number), last = new Date(y, m, 0).getDate(), unit = s => live(s, o).reduce((a, x) => a + PTS[s] + (x[3].n || 0) * UNIT, 0);
    let days = 0, gone = 0, weeks = 0; const t = +ST.periods.D.slice(8);
    for (let d = 1; d <= last; d++) { const w = new Date(y, m - 1, d).getDay(); if (!offDay(o, w)) { days++; if (d <= t) gone++; } if (w === (me ? 1 : 2)) weeks++; }
    return { max: days * unit('D') + weeks * unit('W') + unit('M') + (me ? 0 : 6 * STEP_PTS + LAUNCH_PTS), days, gone };
  }
  function league(o) {
    const pts = points(o, 'M'), mm = monthMax(o), f = mm.max ? pts / mm.max : 0, proj = mm.gone ? pts / mm.gone * mm.days / mm.max : 0;
    let i = 0; LEAGUES.forEach((l, k) => { if (f >= l[0]) i = k; });
    let j = 0; LEAGUES.forEach((l, k) => { if (proj >= l[0]) j = k; });
    const nx = LEAGUES[i + 1];
    return { pts, max: mm.max, cur: LEAGUES[i], i, next: nx ? { name: nx[1], need: Math.ceil(nx[0] * mm.max) - pts } : null, pace: LEAGUES[j], j };
  }
  // a streak: days in a row (Mondays are off) with at least 80% of the Daily Riyaz done
  function streak(o) {
    const N = live('D', o).length, ok = d => done('D', o, 'D:' + d) >= Math.ceil(N * 0.8);
    const t = ST.periods.D.split('-').map(Number), day = new Date(t[0], t[1] - 1, t[2]);
    const key = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    let n = 0; if (!ok(key(day))) day.setDate(day.getDate() - 1);
    for (let i = 0; i < 400; i++) { if (offDay(o, day.getDay())) { day.setDate(day.getDate() - 1); continue; } if (!ok(key(day))) break; n++; day.setDate(day.getDate() - 1); }
    return n;
  }
  function cheer(d, t, me) {
    const p = t ? d / t : 0;
    return p >= 1 ? 'Riyaz complete. Beautifully played! 🎉' : p >= .75 ? 'Almost there. Just a few to go.' : p >= .5 ? 'Past halfway. The finish is in sight.'
      : p >= .25 ? 'Good rhythm. Keep it going.' : p > 0 ? 'Nice start. One at a time.' : me ? 'A fresh page. Start with the Daily Tracker.' : 'A fresh page. Start with the centre setup.';
  }
  const dlong = t => dateOf(t).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const dm = d => { const p = String(d || '').split('-').map(Number); return p.length === 3 ? p[2] + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][p[1] - 1] : ''; };
  const card2 = (title, meaning, body) => `<span class="rzi" tabindex="0" aria-label="About ${esc(title)}">i<div class="rzq"><div class="qh"><div class="qt"><i></i>${esc(title)}</div>${meaning ? `<div class="qd">${meaning}</div>` : ''}</div>${body ? `<div class="qb">${body}</div>` : ''}</div></span>`;
  const info = (t, title, list) => t ? card2(title || 'About this', esc(t), list ? '<div class="ql">Check that</div>' + list.map(x => `<div class="qr"><span class="qc">✓</span><span>${esc(x)}</span></div>`).join('') : '') : '';
  // How leagues work, in the same card style
  const LGPOP = () => card2('How leagues work', 'Every month starts at zero. Your share of the most you can earn this month decides your league.',
    '<div class="ql">Points</div>' + [['10', 'Each daily item.'], ['25', 'Each weekly item.'], ['2', 'Each call, parent or audit counted.'], ['20', 'Each step a society moves forward.'], ['+100', 'A society launch, on top.']]
      .map(([n, t]) => `<div class="qr"><span class="qc">${n}</span><span>${t}</span></div>`).join('')
    + '<div class="ql">Leagues</div><div class="qg">' + LEAGUES.map(l => `<div>${l[2]} <b>${l[1]}</b> · ${Math.round(l[0] * 1000) / 10}%</div>`).join('') + '</div>'
    + '<div class="qp"><i style="background:#4101F7"></i><span><b>On pace for:</b> where the month is heading if today’s rate holds.</span></div>');

  function card(s, x, ed) {
    const [a, k, t, o] = x, v = val(OWN, per(s), k), n = o.n ? val(OWN, per(s), k + '_n') : 0, d = v > 0;
    if (o.off) return `<div class="rzk off"><button class="rzx" disabled aria-label="Not available yet"></button><div class="tx"><span class="tl">${esc(t)}</span><span class="soon">PostHog · soon</span></div></div>`;
    const au = o.auto ? autoN(OWN, curDay(), x) : 0;
    const ctr = o.n ? `<div class="rzn">${Array.from({ length: o.n }, (_, i) => `<button class="rzu${i < au ? ' au' : ''}" role="checkbox" aria-checked="${i < n}" data-rzu="${k}" data-i="${i}"${ed && i >= au ? '' : ' disabled'}${i < au ? ' title="Counted from a recorded conversation"' : ''} aria-label="${esc(t)}, ${i + 1} of ${o.n}"></button>`).join('')}<span>${n} of ${o.n}${au ? ` · ${au} from recorded conversations` : ''}</span></div>` : '';
    return `<div class="rzk${d ? ' dn' : ''}" data-k="${k}"><button class="rzx" role="checkbox" aria-checked="${d}" data-rzt="${k}"${ed && !(o.auto && o.n && au >= o.n) ? '' : ' disabled'} aria-label="${esc(t)}"></button>
      <div class="tx"><span class="tl">${esc(t)}</span>${info(o.i, t, o.list)}${o.sub ? `<small>${esc(o.sub)}</small>` : ''}${ctr}${(o.links || []).map(l => `<button class="rzl" data-rzgo="${l[1]}">Open ${esc(l[0])} →</button>`).join('')}</div>${o.link ? `<button class="rzar" data-rzgo="${o.link}" aria-label="Open ${esc(t)}"><svg viewBox="0 0 24 24"><path d="M7 17L17 7M9 7h8v8"/></svg></button>` : ''}</div>`;
  }
  function board(s, ed) {
    const groups = {}; setOf(OWN)[s].forEach(x => (groups[x[0]] = groups[x[0]] || []).push(x));
    const info = a => { const L = groups[a], lv = L.filter(x => !x[3].off), dn = lv.filter(x => val(OWN, per(s), x[1]) > 0), key = s + a;
      return { a, L, lv, dn, key, soon: L.filter(x => x[3].off), full: !!lv.length && dn.length === lv.length, open: lv.filter(x => !(val(OWN, per(s), x[1]) > 0)), A: areaOf(OWN, a) }; };
    const all = Object.keys(groups).map(info), cards = all.filter(g => !g.full || EXP[g.key]), strips = all.filter(g => g.full && !EXP[g.key]);
    const one = g => `<section class="rzcd" data-a="${g.a}" style="--c:${g.A[1]}"><header><span class="rzic">${ico(g.a)}</span><b>${esc(g.A[2])}</b><em>${g.dn.length} of ${g.lv.length}</em></header>
      ${g.open.map(x => card(s, x, ed)).join('')}
      ${g.soon.length ? `<div class="rzsoon">${g.soon.length} more coming with PostHog.</div>` : ''}
      ${g.dn.length ? `<button class="rzfo${EXP[g.key] ? ' o' : ''}" data-rzx="${g.key}" aria-expanded="${!!EXP[g.key]}"><span>${g.dn.length} done</span><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button>${EXP[g.key] ? `<div class="rzdv">${g.dn.map(x => card(s, x, ed)).join('')}</div>` : ''}` : ''}</section>`;
    const strip = g => `<button class="rzfn" style="--c:${g.A[1]}" data-rzx="${g.key}" aria-label="Show ${esc(g.A[2])}"><span class="t"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><b>${esc(g.A[2])}</b><em>All done</em></button>`;
    return `<div class="rzw"><div class="rzgd">${cards.map(one).join('')}${strips.map(strip).join('')}</div></div>`;
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
    const cnt = { D: [done('D', OWN), live('D').length], W: [done('W', OWN), live('W').length], M: me ? [done('M', OWN), live('M').length] : [launched + done('M', OWN), 1 + live('M').length] };
    const [d, t] = cnt[TAB], name = { D: 'Daily', W: 'Weekly', M: 'Monthly' }[TAB];
    const sub = me ? (TAB === 'D' ? (DAY && DAY !== ST.periods.D ? 'Editing ' + dlong(DAY) + '.' : 'Your own Riyaz, Monday to Friday.') : TAB === 'W' ? `This week, ${wk()}. Starts again on Monday.` : 'Planned by you, executed through the Centre Managers.') : TAB === 'D' ? (DAY && DAY !== ST.periods.D ? 'Editing ' + dlong(DAY) + '.' : `Small habits that keep ${O.label} in tune.`) : TAB === 'W' ? `This week, ${wk()}. Starts again on Tuesday.` : 'Society activation. Progress is checked every week.';
    const lg = league(OWN), sk = streak(OWN), pToday = points(OWN, 'D:' + curDay()), lu = last(OWN, per(TAB === 'M' ? 'D' : TAB));
    const pick = ST.owners.length > 1 ? `<select class="rzo" id="rzown" aria-label="Whose Riyaz">${ST.owners.map(o => `<option value="${esc(o.key)}"${o.key === OWN ? ' selected' : ''}>${esc(o.kind === 'me' ? 'My Riyaz' : o.label + (o.edit ? '' : ' · view only'))}</option>`).join('')}</select>` : '';
    const wd = dateOf(curDay()).getDay(), offToday = TAB === 'D' && offDay(OWN, wd);
    const offNote = offToday ? `<div class="rzempty" style="margin-top:14px;padding:18px 24px"><b>${me ? 'It’s the weekend.' : 'Monday is the weekly off.'}</b>${me ? 'The Daily Riyaz is off today. Rest well.' : 'The Daily Riyaz is off today. It starts again tomorrow.'}</div>` : '';
    const body = offNote + (TAB === 'M' && !me ? board('M', ed) + societies(ed) : board(TAB, ed && !offToday));
    const frac = lg.next ? Math.max(0, Math.min(1, (lg.pts - lg.cur[0] * lg.max) / (((LEAGUES[lg.i + 1][0]) - lg.cur[0]) * lg.max || 1))) : 1, per2 = TAB === 'D' ? 'today' : TAB === 'W' ? 'this week' : 'this month';
    box.innerHTML = `<div class="rzh2"><div class="rzt"><b>${{ D: 'Daily', W: 'Weekly', M: 'Monthly' }[TAB]} <em>Riyaz</em></b><span>${esc(sub)}</span></div>
      <div class="rzct"><div class="rzs" role="group" aria-label="Riyaz">${['D', 'W', 'M'].map(s => `<button type="button" data-rztab="${s}" aria-pressed="${s === TAB}">${{ D: 'Daily', W: 'Weekly', M: 'Monthly' }[s]}<i>${cnt[s][0]} of ${cnt[s][1]}</i></button>`).join('')}</div>${pick}${picker()}</div>
      <div class="rzst" aria-hidden="true"><i class="a"><svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></i><i class="b"><svg viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5"/></svg></i><i class="c"><svg viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 6v7M10 6v7M14 6v7M18 6v7"/></svg></i></div></div>
      <div class="rzlg"><div class="rzlp"><div class="rzlb"><span class="rzbg">${lg.cur[2]}</span><div><small>Your league</small><b>${lg.cur[1]}</b></div></div><div class="rzpt"><b>${lg.pts.toLocaleString('en-IN')}</b><span>of ${lg.max.toLocaleString('en-IN')} points this month</span></div></div>
      <div class="rzlr"><div class="rzlt">${lg.next ? `<span><em>${lg.next.need.toLocaleString('en-IN')} points</em> to ${lg.next.name}</span>` : '<span>The top league. Take a bow.</span>'}${LGPOP()}</div>
      <div class="rzlbar"><i style="width:${Math.round(frac * 100)}%"></i></div><div class="rzlbl"><span>${lg.cur[1]}</span><span>${lg.next ? lg.next.name : ''}</span></div>
      <div class="rzcp"><div class="rzch"><div class="rzrg"><svg viewBox="0 0 38 38"><defs><linearGradient id="rzgr"><stop offset="0" stop-color="#4101F7"/><stop offset="1" stop-color="#DD30B1"/></linearGradient></defs><circle class="t" cx="19" cy="19" r="15"/><circle class="p" cx="19" cy="19" r="15" stroke-dasharray="94.25" stroke-dashoffset="${(94.25 * (1 - (t ? Math.min(1, d / t) : 0))).toFixed(2)}"/></svg></div><div><b>${d} of ${t}</b><span class="s">done ${per2}</span></div></div>
      ${sk ? `<div class="rzch fl"><span class="rzfl"><svg viewBox="0 0 24 24"><path d="M12 22c4 0 7-2.8 7-7 0-3-2-5-3.5-7-.4 1.5-1.3 2.4-2.5 3 .3-3-1-6-4-8 .2 3-3 5-3 9 0 5.5 2.5 10 6 10z"/></svg></span><div><b>${sk} ${sk === 1 ? 'day' : 'days'}</b><span class="s">streak</span></div></div>` : ''}</div></div></div>
      ${!ed && !me ? `<div class="rzro">Viewing ${esc(O.label)}’s Riyaz. Only its Centre Manager can tick it.${lu ? ` Last update ${esc(lu[5].slice(11))} by ${esc(lu[4])}.` : ' Nothing ticked yet today.'}</div>` : ''}
      ${body}${err ? `<div class="rzerr">${esc(err)}</div>` : ''}`;
    if (window.rzStory) window.rzStory();
  }
  function picker() {
    if (!NEWSRV() || !own().edit) return '';
    const t = ST.periods.D, lo = dateOf(t), past = DAY && DAY !== t; lo.setDate(lo.getDate() - 45);
    return `<label class="rzdt${past ? ' past' : ''}"><input type="date" id="rzday" value="${curDay()}" min="${ymd(lo)}" max="${t}" aria-label="Choose a day">${past ? '<button type="button" data-rztoday="1">Today</button>' : ''}</label>`;
  }
  function wk() { const p = wkKey(OWN).split('-').map(Number), a = new Date(p[0], p[1] - 1, p[2]), b = new Date(a); b.setDate(b.getDate() + (isMe(OWN) ? 4 : 6));
    const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; return `${a.getDate()} ${M[a.getMonth()]} to ${b.getDate()} ${M[b.getMonth()]}`; }
  function confetti() {
    const c = document.createElement('div'); c.className = 'rzcf'; const C = ['#4101F7', '#6601FD', '#DD30B1', '#F1B6FA', '#F5906F', '#9BB6FF'];
    c.innerHTML = Array.from({ length: 70 }, () => `<i style="left:${Math.random() * 100}%;background:${C[Math.floor(Math.random() * C.length)]};animation-delay:${Math.random() * .5}s;animation-duration:${1.2 + Math.random() * 1.2}s"></i>`).join('');
    document.body.appendChild(c); setTimeout(() => c.remove(), 3000);
  }
  function pop(k, n) { const it = setOf(OWN)[TAB].find(x => x[1] === k), el = document.querySelector(`.rzk[data-k="${k}"]`) || (it && document.querySelector(`.rzcd[data-a="${it[0]}"]`)); if (!el) return; const p = document.createElement('span'); p.className = 'rzpop'; p.textContent = '+' + n; el.appendChild(p); }
  async function call(action, args) {
    if (BUSY) return; BUSY = true;
    try { const j = await ArtiumAuth.call(action, args); if (j && j.error) throw new Error(j.error === 'not-allowed' ? 'Only this centre’s Centre Manager can change it.' : j.error);
      prep(j); draw(); return true; }
    catch (e) { draw(e.message || String(e)); return false; } finally { BUSY = false; }
  }
  // tick locally first, then save
  async function tick(item, value, s) {
    const p = per(s), r = ST.rows.find(x => x[0] === OWN && x[1] === p && x[2] === item), before = r ? r[3] : 0;
    const wasFull = done(s, OWN) === live(s).length, it0 = setOf(OWN)[s].find(x => x[1] === item.replace(/_n$/, '')), arFull = () => { const L = live(s).filter(x => it0 && x[0] === it0[0]); return L.length && L.every(x => val(OWN, p, x[1]) > 0); }, wasAr = arFull(), lgi = league(OWN).i;
    if (r) r[3] = value; else ST.rows.push([OWN, p, item, value, '', '']);
    draw(); if (value > before) pop(item.replace(/_n$/, ''), /_n$/.test(item) ? UNIT : PTS[s]);
    if (!wasFull && done(s, OWN) === live(s).length) setTimeout(confetti, 150); else if (it0 && !wasAr && arFull() || league(OWN).i > lgi) setTimeout(confetti, 150);
    const ok = await call('riyazTick', { owner: OWN, scope: s, item, value, day: DAY || '' });
    if (ok === false) { const q = ST.rows.find(x => x[0] === OWN && x[1] === p && x[2] === item); if (q) q[3] = before; }
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-rzx],[data-rztab],[data-rzt],[data-rzu],[data-rztoday],[data-rzgo],[data-rzs],[data-rzadd]'); if (!b || !ST) return;
    const O = own();
    if (b.dataset.rzx) { EXP[b.dataset.rzx] = !EXP[b.dataset.rzx]; draw(); return; }
    if (b.dataset.rztab) { TAB = b.dataset.rztab; ADD = false; try { localStorage.setItem('artium_rz_tab', TAB); } catch (x) {} draw(); return; }
    if (b.dataset.rzgo) { go(b.dataset.rzgo); return; }
    if (b.dataset.rztoday) { DAY = ''; draw(); return; }
    if (!O || !O.edit) return;
    if (b.dataset.rzt) { const k = b.dataset.rzt; tick(k, val(OWN, per(TAB), k) > 0 ? 0 : 1, TAB); return; }
    if (b.dataset.rzu) { const k = b.dataset.rzu, i = +b.dataset.i, x = setOf(OWN)[TAB].find(y => y[1] === k), cur = val(OWN, per(TAB), k + '_n'), n = i < cur ? i : i + 1;
      if (x[3].auto && i < autoN(OWN, curDay(), x)) return;
      tick(k + '_n', n, TAB); const t = val(OWN, per(TAB), k) > 0;
      if (n >= x[3].n && !t) setTimeout(() => tick(k, 1, TAB), 400); else if (n < x[3].n && t) setTimeout(() => tick(k, 0, TAB), 400); return; }
    if (b.dataset.rzs) { const x = ST.soc.find(y => y.id === b.dataset.rzs); call('riyazSociety', { op: 'step', id: b.dataset.rzs, dir: +b.dataset.d }).then(ok => { if (ok && x && +b.dataset.d > 0 && x.step === 5) confetti(); }); return; }
    if (b.dataset.rzadd === 'open') { ADD = true; draw(); const i = $('rzsn'); if (i) i.focus(); return; }
    if (b.dataset.rzadd === 'cancel') { ADD = false; draw(); return; }
    if (b.dataset.rzadd === 'save') { const nm = ($('rzsn') || {}).value || '', no = ($('rzsno') || {}).value || ''; if (!nm.trim()) { $('rzsn').focus(); return; }
      ADD = false; call('riyazSociety', { op: 'add', owner: OWN, name: nm, note: no }); }
  });
  document.addEventListener('change', e => { if (e.target.id === 'rzday') { const v = e.target.value; DAY = !v || v >= ST.periods.D ? '' : v; draw(); return; } if (e.target.id === 'rzown') { OWN = e.target.value; try { localStorage.setItem('artium_rz_owner', OWN); } catch (x) {} ADD = false; draw(); } });
  /* Pick up conversations recorded elsewhere: when the Home page is showing again, and every minute while it is open */
  let lastRef = 0;
  function refresh(force) {
    if (!ST || BUSY || (!force && (!window.innerWidth || Date.now() - lastRef < 20000))) return; lastRef = Date.now();
    const sig = x => JSON.stringify([x.rows, x.auto, x.periods.D]);
    ArtiumAuth.call('riyaz', {}).then(j => { if (!j || j.error || BUSY || !ST) return; const old = sig(ST), a = document.activeElement; prep(j); if (sig(ST) !== old && !(a && a.closest && a.closest('.rzf'))) draw(); }).catch(() => {});
  }
  window.addEventListener('storage', e => { if (e.key === 'artium_ins_saved') refresh(true); });   // a conversation was just recorded in Check-ins or Focus Groups
  window.addEventListener('resize', () => refresh()); document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); }); setInterval(() => refresh(), 60000);
  window.Riyaz = {
    start() {
      const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
      ArtiumAuth.call('riyaz', {}).then(j => { if (!j || j.error) return; prep(j); if (!ST.owners.length) return draw();
        let k = ''; try { k = localStorage.getItem('artium_rz_owner') || ''; } catch (e) {}
        OWN = ST.owners.some(o => o.key === k) ? k : (ST.owners.find(o => o.edit && o.kind === 'centre') || ST.owners.find(o => o.kind === 'me') || ST.owners[0]).key; draw(); }).catch(() => {});
    },
    // for the one-line story in the Delight view
    summary() { if (!ST || !ST.owners || !ST.owners.length) return null; const C = ST.owners.filter(o => o.kind === 'centre');
      const mine = C.find(o => o.edit); const N = live('D', 'x').length;
      if (mine) return { mine: true, centre: mine.key, done: done('D', mine.key), total: N };
      const t = C.reduce((s, o) => s + done('D', o.key), 0); return { mine: false, pct: C.length ? Math.round(t / (C.length * N) * 100) : 0 }; }
  };
})();
