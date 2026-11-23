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
      ['teach', 'practice', 'Practice plans issued', { off: 1 }], ['teach', 'aha', 'Aha moments created', { off: 1 }], ['teach', 'curric', 'Curriculum progress', { off: 1 }],
      ['teacher', 'teacher_talk', 'Talk to a teacher for 5 to 10 minutes', { i: 'A different teacher each day, so every teacher is covered within the week. Ask how it’s going and whether they need help.' }],
      ['parent', 'parents', 'Meet 2 parents in the reception', { n: 2, i: 'Ask about their child’s progress and build rapport.' }],
      ['parent', 'catchup', 'Make catch-up calls', { n: 7, sub: 'Up to 7, based on how many are due.' }]],
    W: [
      ['hyg', 'class_hyg', 'Review classroom hygiene', { i: 'Every classroom in order, instruments and requirements up to date, and teachers have what they need.' }],
      ['teach', 'audits', 'Audit 4 classes', { n: 4 }],
      ['admin', 'batch_opt', 'Optimise batches', { i: 'Make sure no teacher has dead hours or cold slots where the average batch size is low.' }],
      ['data', 'loose', 'Fix this week’s Loose Ends', { link: 'loose' }]],
    M: [['teacher', 'teacher_rr', 'Conduct Teacher R&R', { i: 'Rewards and recognition for the teachers.' }]]
  };
  /* My Riyaz (the site's editor): worked Monday to Friday, with the week starting on Monday. */
  const MEAREAS = {
    sales: ['📞', '#DD30B1', 'Sales operations'], cm: ['🧭', '#2F4DB8', 'Centre Managers'], ppl: ['🎙️', '#E58BD8', 'People management'],
    prod: ['🛠️', '#6A6488', 'Product and Tech'], num: ['📊', '#6601FD', 'Numbers review'], eng: ['🎶', '#8C7BD9', 'Engagement'], mkt: ['📣', '#F5906F', 'Marketing']
  };
  const ME = {
    D: [
      ['sales', 'm_daily', 'Review the Daily Tracker', { link: 'daily' }],
      ['sales', 'm_adm', 'Review the Admissions Pipeline', { link: 'admissions' }],
      ['sales', 'm_ren', 'Review the Renewal Pipeline', { link: 'pipeline' }],
      ['sales', 'm_pkg', 'Review Package completion', { link: 'pipeline', i: 'In the Renewal Pipeline, under the Package completion tab.' }],
      ['cm', 'm_chk', 'Go through the day’s Check-ins', { link: 'checkins', i: 'The check-ins punched in by the Centre Managers for the day.' }],
      ['num', 'm_pulse', 'Review the Business Pulse page', { link: 'home' }],
      ['num', 'm_ins', 'Add insights to the Execs Call and Weekly Offline Review pages', { links: [['Execs Call', 'execs'], ['Weekly Offline Review', 'review']] }],
      ['ppl', 'm_teach', 'Speak to one teacher', {}],
      ['eng', 'm_learn', 'Speak to 5 learners', { n: 5 }]],
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
  const wkKey = o => (isMe(o) && ST.periods.WM) || ST.periods.W;
  const PTS = { D: 10, W: 25, M: 50 }, UNIT = 2, STEP_PTS = 20, LAUNCH_PTS = 100;
  const STEPS = ['Initial idea', 'Establish communication', 'Meet the committee', 'Pitch the initial idea', 'Final idea after the recce', 'Determine the logistics', 'Launch'];
  /* Monthly leagues: everyone starts the month at zero. The share of the month's maximum points decides the league. */
  const LEAGUES = [[0, 'Rookie', '🌱'], [.125, 'Apprentice', '🎵'], [.25, 'Skilled', '🎯'], [.375, 'Contender', '🔥'], [.5, 'Pro', '⚡'], [.625, 'Elite', '💎'], [.75, 'Master', '🏆'], [.875, 'Legend', '👑']];   // a new league every 12.5%
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
  .rzg span{display:inline-flex;align-items:center;gap:7px}.rzg b{color:#01073C;font-weight:700}.rzg .lv{font:700 12.5px var(--body,'Onest');color:#fff;border-radius:999px;padding:5px 12px;background:linear-gradient(135deg,#8A83A6,#B7B0CC)}
  .rzg .rzi{display:inline-grid;gap:0}.rzg .rzq .qr>span:not(.qc),.rzg .rzq .qp>span{display:block}.rzg .rzi>.rzq{left:auto;right:-12px;width:330px}
  .rzg .lv1{background:linear-gradient(135deg,#8C7BD9,#B9AEDB)}.rzg .lv2{background:linear-gradient(135deg,#6B3FC7,#9B6BFF)}.rzg .lv3{background:linear-gradient(135deg,#6601FD,#B98BFF)}
  .rzg .lv4{background:linear-gradient(135deg,#4101F7,#6601FD)}.rzg .lv5{background:linear-gradient(135deg,#4101F7,#DD30B1)}.rzg .lv6{background:linear-gradient(135deg,#2B0256,#6601FD 55%,#DD30B1)}
  .rzg .lv7{background:linear-gradient(135deg,#01064C,#4101F7 40%,#DD30B1 75%,#F5906F);box-shadow:0 8px 20px -10px rgba(221,48,177,.7)}
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
  const per = (s, o) => s + ':' + (s === 'W' ? wkKey(o == null ? OWN : o) : ST.periods[s]);
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
    const ctr = o.n ? `<div class="rzn"><button data-rzc="${k}" data-d="-1"${!ed || n <= 0 ? ' disabled' : ''} aria-label="One less">−</button><span class="seg">${Array.from({ length: o.n }, (_, i) => `<i class="${i < n ? 'f' : ''}"></i>`).join('')}</span><button data-rzc="${k}" data-d="1"${!ed || n >= o.n ? ' disabled' : ''} aria-label="One more">+</button><span>${n} of ${o.n}</span></div>` : '';
    return `<div class="rzk${d ? ' dn' : ''}" data-k="${k}"><button class="rzx" role="checkbox" aria-checked="${d}" data-rzt="${k}"${ed ? '' : ' disabled'} aria-label="${esc(t)}"></button>
      <div class="tx"><span class="tl">${esc(t)}</span>${info(o.i, t, o.list)}${o.sub ? `<small>${esc(o.sub)}</small>` : ''}${ctr}${o.link ? `<button class="rzl" data-rzgo="${o.link}">Open →</button>` : ''}${(o.links || []).map(l => `<button class="rzl" data-rzgo="${l[1]}">Open ${esc(l[0])} →</button>`).join('')}</div></div>`;
  }
  function board(s, ed) {
    const groups = {}; setOf(OWN)[s].forEach(x => (groups[x[0]] = groups[x[0]] || []).push(x));
    const cols = Object.keys(groups).map(a => { const L = groups[a], lv = L.filter(x => !x[3].off), dn = lv.filter(x => val(OWN, per(s), x[1]) > 0);
      const open = L.filter(x => x[3].off || !(val(OWN, per(s), x[1]) > 0)), A = areaOf(OWN, a);
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
    const cnt = { D: [done('D', OWN), live('D').length], W: [done('W', OWN), live('W').length], M: me ? [done('M', OWN), live('M').length] : [launched + done('M', OWN), 1 + live('M').length] };
    const [d, t] = cnt[TAB], name = { D: 'Daily', W: 'Weekly', M: 'Monthly' }[TAB];
    const sub = me ? (TAB === 'D' ? 'Your own Riyaz, Monday to Friday.' : TAB === 'W' ? `This week, ${wk()}. Starts again on Monday.` : 'Planned by you, executed through the Centre Managers.') : TAB === 'D' ? `Small habits that keep ${O.label} in tune.` : TAB === 'W' ? `This week, ${wk()}. Starts again on Tuesday.` : 'Society activation. Progress is checked every week.';
    const lg = league(OWN), sk = streak(OWN), pToday = points(OWN, 'D:' + ST.periods.D), lu = last(OWN, per(TAB === 'M' ? 'D' : TAB));
    const pick = ST.owners.length > 1 ? `<select class="rzo" id="rzown" aria-label="Whose Riyaz">${ST.owners.map(o => `<option value="${esc(o.key)}"${o.key === OWN ? ' selected' : ''}>${esc(o.kind === 'me' ? 'My Riyaz' : o.label + (o.edit ? '' : ' · view only'))}</option>`).join('')}</select>` : '';
    const wd = new Date(...ST.periods.D.split('-').map((x, i) => i === 1 ? x - 1 : +x)).getDay(), offToday = TAB === 'D' && offDay(OWN, wd);
    const offNote = offToday ? `<div class="rzempty" style="margin-top:14px;padding:18px 24px"><b>${me ? 'It’s the weekend.' : 'Monday is the weekly off.'}</b>${me ? 'The Daily Riyaz is off today. Rest well.' : 'The Daily Riyaz is off today. It starts again tomorrow.'}</div>` : '';
    const body = offNote + (TAB === 'M' && !me ? board('M', ed) + societies(ed) : board(TAB, ed && !offToday));
    box.innerHTML = `<div class="rzb"><div class="rzt"><b>${name} Riyaz</b><span>${esc(sub)}</span></div>
      <div class="rzs" role="group" aria-label="Riyaz">${['D', 'W', 'M'].map(s => `<button type="button" data-rztab="${s}" aria-pressed="${s === TAB}">${{ D: 'Daily', W: 'Weekly', M: 'Monthly' }[s]}<i>${cnt[s][0]} of ${cnt[s][1]}</i></button>`).join('')}</div>${pick}
      ${`<div class="rzp"><div class="a"><b>${d}<small>of ${t} done</small></b><em>${TAB === 'M' && !me && !launched && d < t ? 'Move a society along this week.' : cheer(d, t, me)}</em></div><div class="rzbar"><i style="width:${t ? Math.min(100, d / t * 100) : 0}%"></i></div></div>`}</div>
      ${`<div class="rzg"><span class="lv lv${lg.i}">${lg.cur[2]} ${lg.cur[1]}</span><span>⭐ <b>${lg.pts.toLocaleString('en-IN')}</b> of ${lg.max.toLocaleString('en-IN')} points this month</span>${lg.next ? `<span>🎯 <b>${lg.next.need.toLocaleString('en-IN')}</b> to ${lg.next.name}</span>` : '<span>👑 The top league. Take a bow.</span>'}<span>✨ <b>+${pToday}</b> today</span>${sk ? `<span>🔥 <b>${sk}-day</b> streak</span>` : ''}${lg.j > lg.i ? `<span>📈 On pace for <b>${lg.pace[1]}</b></span>` : ''}${LGPOP()}</div>`}
      ${!ed && !me ? `<div class="rzro">Viewing ${esc(O.label)}’s Riyaz. Only its Centre Manager can tick it.${lu ? ` Last update ${esc(lu[5].slice(11))} by ${esc(lu[4])}.` : ' Nothing ticked yet today.'}</div>` : ''}
      ${body}${err ? `<div class="rzerr">${esc(err)}</div>` : ''}`;
    if (window.rzStory) window.rzStory();
  }
  function wk() { const p = wkKey(OWN).split('-').map(Number), a = new Date(p[0], p[1] - 1, p[2]), b = new Date(a); b.setDate(b.getDate() + (isMe(OWN) ? 4 : 6));
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
    if (b.dataset.rzc) { const k = b.dataset.rzc, x = setOf(OWN)[TAB].find(y => y[1] === k), n = Math.max(0, Math.min(x[3].n, val(OWN, per(TAB), k + '_n') + (+b.dataset.d)));
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
        OWN = ST.owners.some(o => o.key === k) ? k : (ST.owners.find(o => o.edit && o.kind === 'centre') || ST.owners.find(o => o.kind === 'me') || ST.owners[0]).key; draw(); }).catch(() => {});
    },
    // for the one-line story in the Delight view
    summary() { if (!ST || !ST.owners || !ST.owners.length) return null; const C = ST.owners.filter(o => o.kind === 'centre');
      const mine = C.find(o => o.edit); const N = live('D', 'x').length;
      if (mine) return { mine: true, centre: mine.key, done: done('D', mine.key), total: N };
      const t = C.reduce((s, o) => s + done('D', o.key), 0); return { mine: false, pct: C.length ? Math.round(t / (C.length * N) * 100) : 0 }; }
  };
})();
