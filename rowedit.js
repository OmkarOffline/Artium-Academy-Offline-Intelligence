/* Row tools for learner lists: the Row number, Open row (one Google Sheets tab, reused) and Edit (a small form that writes to the sheet).
   Used by Renewal Pipeline and Admissions Pipeline. A page calls RowEdit.start(onSaved) once, then RowEdit.cell(x) for each learner row,
   where x = {centre, tab: 'fs' | 'rn', r: the row as sent by the data service (r[40] = its row number in the tab)}.
   Editing is checked again by the data service: the learner's Student ID, name, phone and package expiry must match exactly one row,
   a cell is only written if it still says what the form showed, formulas are never written, and every change is logged. */
(function () {
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cell = (r, i) => String(r && r[i] != null ? r[i] : '').trim();
  const parse = s => { s = String(s || '').trim(); let a = s.match(/^(\d{1,2})-([A-Za-z]+)-(\d{2,4})$/);
    if (a) { const m = MON.findIndex(x => x.toLowerCase() === a[2].slice(0, 3).toLowerCase()); const y = a[3].length === 2 ? 2000 + +a[3] : +a[3]; if (m >= 0) return new Date(y, m, +a[1]); }
    a = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/); if (a) { const y = a[3].length === 2 ? 2000 + +a[3] : +a[3]; return new Date(y, +a[2] - 1, +a[1]); } return null; };
  const iso = s => { const d = parse(s); return d && d.getFullYear() >= 2020 ? d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') : ''; };
  const today = () => { const d = new Date(); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); };
  const TABN = t => t === 'rn' ? 'Renewals' : 'Fresh Sales';
  const STATUS = ['Renewed', 'Due', 'Not Yet Due', 'Will Not Renew', 'Extended', 'Paused', 'May Resume Later', 'Inactive', 'Dormant', 'Course Completed', 'Refund', 'Transfer to Other centre', 'Transfer to Online'];
  let LINKS = null, VISITS = null, CAN = [], onSaved = null, OPEN = null;
  const REG = {};
  /* Two kinds of row. A learner (Fresh Sales / Renewals): x = {centre, tab, r}. A visitor (Centre Visits): x = {centre, kind: 'visit', r}. */
  const K = {
    learner: {
      row: r => r[40], sheet: x => TABN(x.tab), title: r => cell(r, 4), action: 'learnerUpdate',
      checks: r => ['ID ' + cell(r, 3), cell(r, 4), cell(r, 7).replace(/\D/g, '').slice(-10), 'Expiry ' + cell(r, 23)],
      params: (x, r) => ({ centre: x.centre, tab: TABN(x.tab), id: cell(r, 3), name: cell(r, 4), phone: cell(r, 7), end: cell(r, 23) }),
      link: x => { const L = LINKS && LINKS[x.centre]; return L ? `https://docs.google.com/spreadsheets/d/${encodeURIComponent(L.id)}/edit#gid=${L.gids[TABN(x.tab)]}&range=A${x.r[40]}` : ''; },
      fields: x => [['desc', 'note', 32, 'Latest discussion'], ['pay', 'date', 33, 'Expected payment date'], ['coll', 'money', 34, 'Expected collections'],
        ['status', 'select', 25, 'Renewal status', (() => { const L = LINKS && LINKS[x.centre], o = (L && L.status && L.status[TABN(x.tab)]) || STATUS, c = cell(x.r, 25); return c && !o.includes(c) ? [c].concat(o) : o; })()],
        ['renDate', 'date', 26, 'Actual renewal date'], ['done', 'date', 39, 'Actual package completion date'], ['comp', 'int', 38, 'No. of compensations due'], ['ext', 'int', 37, 'Extension · no. of days']]
    },
    visit: {
      row: r => r[18], sheet: () => 'Centre Visits', title: r => cell(r, 1), action: 'visitUpdate',
      checks: r => ['Visited ' + cell(r, 0), cell(r, 1), cell(r, 2).replace(/\D/g, '').slice(-10)],
      params: (x, r) => ({ centre: x.centre, date: cell(r, 0), name: cell(r, 1), phone: cell(r, 2) }),
      link: x => { const L = VISITS && VISITS[x.centre]; return L ? `https://docs.google.com/spreadsheets/d/${encodeURIComponent(L.id)}/edit#gid=${L.gid}&range=A${x.r[18]}` : ''; },
      fields: x => { const L = (VISITS && VISITS[x.centre]) || { opts: {} }, o = (k, i) => { const a = L.opts[k] || [], c = cell(x.r, i); return c && !a.includes(c) ? [c].concat(a) : a; };
        return [['note', 'note', 11, 'Call progress / feedback'], ['ncd', 'date', 10, 'Next call date'], ['prob', o('prob', 12).length ? 'select' : 'text', 12, 'Probability of conversion', o('prob', 12)],
          ['ed', 'date', 13, 'Expected date of conversion'], ['amt', 'money', 14, 'Expected amount']]
          .concat(L.status ? [['status', o('status', 9).length ? 'select' : 'text', 9, 'Conversion status', o('status', 9)]] : []); }
    }
  };
  const kind = x => K[x.kind === 'visit' ? 'visit' : 'learner'];
  const key = x => [x.kind || 'l', x.centre, x.tab || '', kind(x).row(x.r), kind(x).title(x.r)].join('|');
  const num = s => String(s || '').replace(/[,\s₹]/g, '');
  const shown = (t, v) => t === 'date' ? iso(v) : t === 'int' ? (/^\d+$/.test(v) ? v : '') : t === 'money' ? (/^\d+(\.\d+)?$/.test(num(v)) ? String(Math.round(+num(v))) : '') : v;
  const css = `.re-c{white-space:nowrap}.re-c b{display:block;font-size:15px;font-weight:800;color:#01073C;font-variant-numeric:tabular-nums}.re-c small{display:block;font-size:11.5px;color:#6A6488;margin:2px 0 6px}
  .re-go{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700;color:#4101F7;text-decoration:none;border:1px solid #DCD0FB;border-radius:9px;padding:5px 9px}
  .re-go:hover{background:#F4EEFF}.re-go svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
  .re-ed{margin-left:5px;font-size:12px;font-weight:700;color:#A3187F;background:#FCEAF7;border:0;border-radius:9px;padding:6px 10px;cursor:pointer}.re-ed:hover{background:#F8D5EF}
  .re-pk{display:block;margin-top:6px;font-size:12px;font-weight:700;color:#2433B8;background:#EEF1FF;border:0;border-radius:9px;padding:6px 10px;cursor:pointer}.re-pk:hover{background:#DDE3FF}
  .re-fu{display:block;margin-top:6px;font-size:12px;font-weight:700;color:#A8431E;background:#FFF1EA;border:0;border-radius:9px;padding:6px 10px;cursor:pointer}.re-fu:hover{background:#FFE2D3}
  .re-bg{position:fixed;inset:0;z-index:80;background:rgba(1,6,76,.32);backdrop-filter:blur(3px);display:grid;place-items:center;padding:20px}
  .re-bx{width:min(880px,100%);max-height:calc(100vh - 40px);overflow:auto;background:#fff;border-radius:24px;box-shadow:0 40px 80px -30px rgba(1,7,60,.6);padding:22px 24px;font-family:inherit;color:#4A4466}
  .re-h{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:flex-start}.re-h b{font-size:17px;color:#01073C}.re-h span{display:block;font-size:12.5px;color:#6A6488;margin-top:3px}
  .re-k{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px;color:#6A6488}.re-k i{font-style:normal;font-weight:600;background:#E3FAF0;color:#137A4F;border-radius:7px;padding:3px 8px}
  .re-g{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px 18px;margin-top:14px}.re-f{display:flex;flex-direction:column;gap:6px;min-width:0}.re-f.w{grid-column:span 3}
  .re-l{font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#6A6488}
  .re-f select,.re-f input{height:40px;border:1px solid #E6E0F3;border-radius:12px;padding:0 12px;font:inherit;font-size:14px;color:#01073C;background:#fff}
  .re-f small{font-size:12px;color:#6A6488}.re-f small em{font-style:normal;color:#B7B0CC}
  .re-n{display:flex;gap:10px;align-items:flex-start;background:#F7F5FC;border-radius:14px;padding:10px 12px}.re-n span{font-weight:700;font-size:13.5px;color:#4101F7;padding-top:3px;white-space:nowrap}
  .re-n textarea{flex:1;border:0;background:none;resize:vertical;font:inherit;font-size:14px;line-height:1.5;color:#01073C;outline:0;min-height:44px}
  .re-p{font-size:13px;line-height:1.5;color:#4A4466;background:#FBFAFF;border-left:3px solid #E6E0F3;border-radius:6px;padding:8px 12px;white-space:pre-line;max-height:90px;overflow:auto}
  .re-a{display:flex;align-items:center;gap:10px;margin-top:14px}.re-a span{flex:1;font-size:12.5px;color:#6A6488}
  .re-x{border:1px solid #E6E0F3;background:#fff;border-radius:10px;padding:8px 14px;font:inherit;font-size:13px;font-weight:600;color:#4A4466;cursor:pointer}
  .re-s{border:0;background:linear-gradient(135deg,#4101F7,#6601FD);color:#fff;border-radius:10px;padding:9px 16px;font:inherit;font-size:13px;font-weight:700;cursor:pointer}.re-s:disabled{opacity:.6}
  .re-e{margin-top:10px;font-size:13px;color:#B0204F;background:#FFEDF2;border-radius:10px;padding:8px 12px}
  #re-t{position:fixed;left:50%;bottom:28px;transform:translate(-50%,20px);opacity:0;background:#01064C;color:#fff;font-size:14px;font-weight:600;border-radius:14px;padding:12px 18px;transition:all .25s;z-index:90;pointer-events:none}#re-t.on{opacity:1;transform:translate(-50%,0)}
  @media (max-width:760px){.re-g{grid-template-columns:1fr}.re-f.w{grid-column:auto}}`;
  function toast(t) { let el = document.getElementById('re-t'); if (!el) { el = document.createElement('div'); el.id = 're-t'; document.body.appendChild(el); }
    el.textContent = t; el.className = 'on'; clearTimeout(el._t); el._t = setTimeout(() => el.className = '', 3200); }
  function cellHTML(x) {
    const T = x && x.r && kind(x), n = T && T.row(x.r);
    if (!n) return '<td class="re-c"><span style="color:#B7B0CC">—</span></td>';
    const k = key(x), ln = T.link(x); REG[k] = x;
    return `<td class="re-c"><b>${esc(n)}</b><small>${T.sheet(x)}</small>${ln ? `<a class="re-go" href="${ln}" target="artium_sheet" rel="noopener" title="Opens in one Google Sheets tab, reused for every row">Open row<svg viewBox="0 0 24 24"><path d="M7 17L17 7M8 7h9v9"/></svg></a>` : ''}${CAN.includes(x.centre) ? `<button type="button" class="re-ed" data-re="${esc(k)}">Edit</button><button type="button" class="re-pk" data-pkg="${esc(k)}">Create package</button><button type="button" class="re-fu" data-fu="${esc(k)}">Follow-up message</button>` : ''}</td>`;
  }
  function draw() {
    let bg = document.getElementById('re-bg'); if (!OPEN) { if (bg) bg.remove(); return; }
    const x = REG[OPEN.k], r = x.r, T = kind(x), F = T.fields(x), keep = OPEN.form || {};
    const now = i => esc(cell(r, i)) || '<em>Empty</em>';
    if (!bg) { bg = document.createElement('div'); bg.id = 're-bg'; bg.className = 're-bg'; document.body.appendChild(bg); bg.addEventListener('click', e => { if (e.target === bg) close(); }); }
    const inp = ([f, t, i, lab, o]) => {
      const val = keep[f] != null ? keep[f] : shown(t, cell(r, i));
      if (t === 'note') return `<div class="re-f w"><span class="re-l">${lab} · add a note</span><div class="re-n"><span>${today()}:</span><textarea id="re-${f}" rows="2" placeholder="What was discussed?">${esc(keep[f] || '')}</textarea></div>
        <small>Goes on top with today's date, then a line break, then what's already there:</small><div class="re-p">${cell(r, i) ? esc(cell(r, i)) : '<em>Nothing yet</em>'}</div></div>`;
      const field = t === 'select' ? `<select id="re-${f}">${cell(r, i) ? '' : '<option value="">Not set</option>'}${o.map(v => `<option${v === val ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select>`
        : t === 'date' ? `<input type="date" id="re-${f}" value="${val}">` : t === 'text' ? `<input type="text" id="re-${f}" value="${esc(val)}">`
        : `<input type="number" min="0" step="1" id="re-${f}" value="${esc(val)}" placeholder="${t === 'money' ? '₹' : '0'}">`;
      return `<label class="re-f"><span class="re-l">${lab}</span>${field}<small>In the sheet now: ${now(i)}</small></label>`;
    };
    bg.innerHTML = `<div class="re-bx" role="dialog" aria-label="Update">
      <div class="re-h"><div><b>Update ${esc(T.title(r))}</b><span>${esc(x.centre)} · ${T.sheet(x)} · row ${esc(T.row(r))}</span></div>
        <div class="re-k">Checked before saving: ${T.checks(r).map(c => `<i>${esc(c)}</i>`).join('')}</div></div>
      <div class="re-g">${F.map(inp).join('')}</div>
      <div class="re-a"><span>Only the details you change are written. If anyone has changed one of these cells since you opened this, nothing is saved and you'll see the newer value.</span>
        <button type="button" class="re-x" data-rex>Cancel</button><button type="button" class="re-s" data-res${OPEN.busy ? ' disabled' : ''}>${OPEN.busy ? 'Saving…' : 'Save to sheet'}</button></div>
      ${OPEN.err ? `<div class="re-e">${esc(OPEN.err)}</div>` : ''}</div>`;
    if (!OPEN.busy && !OPEN.form) { const t = bg.querySelector('textarea'); if (t) t.focus(); }
  }
  function close() { OPEN = null; draw(); }
  async function save() {
    const x = REG[OPEN.k], r = x.r, T = kind(x), F = T.fields(x), form = {}, changes = {}, before = {}, LAB = {};
    F.forEach(([f, t, i, lab]) => { LAB[f] = lab; const el = document.getElementById('re-' + f), v = el ? String(el.value || '').trim() : ''; form[f] = v;
      if (t === 'note' ? v : v !== shown(t, cell(r, i))) { changes[f] = t === 'money' ? num(v) : v; before[f] = cell(r, i); } });
    OPEN.form = form;
    if (!Object.keys(changes).length) { OPEN.err = 'Nothing has changed yet.'; draw(); return; }
    OPEN.busy = true; OPEN.err = ''; draw();
    const IDX = {}; F.forEach(([f, , i]) => IDX[f] = i);
    try {
      const j = await ArtiumAuth.call(T.action, Object.assign(T.params(x, r), { changes, before }));
      if (j && j.error === 'changed') { Object.keys(j.current || {}).forEach(f => r[IDX[f]] = j.current[f]); j.fields.forEach(f => delete OPEN.form[f]);
        throw new Error('Someone changed ' + j.fields.map(f => LAB[f]).join(', ') + ' in the sheet after you opened this. The newer value is shown now. Nothing was saved, so please check and save again.'); }
      if (j && j.error) throw new Error(j.error === 'not-found' ? 'Couldn’t find exactly this row in the sheet (one of the checked details has changed). Nothing was saved. Please use Open row.'
        : j.error === 'many' ? 'More than one row matches these details, so nothing was saved. Please use Open row.' : j.error === 'not-allowed' ? 'You can only edit rows for your own centre.' : j.error);
      Object.keys(j.values || {}).forEach(f => r[IDX[f]] = j.values[f]);
      const nm = T.title(r); close(); toast('Saved to the sheet · ' + nm); if (onSaved) onSaved(x);
    } catch (e) { if (OPEN) { OPEN.busy = false; OPEN.err = e.message || String(e); draw(); } }
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-re]'); if (b) { e.preventDefault(); e.stopPropagation(); OPEN = { k: b.dataset.re }; draw(); return; }
    if (e.target.closest('[data-rex]')) { close(); return; }
    if (e.target.closest('[data-res]')) { save(); }
  }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && OPEN) close(); });
  window.RowEdit = {
    start(cb) { onSaved = cb; const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
      ArtiumAuth.call('sheetLinks', {}).then(j => { if (j && j.links) { LINKS = j.links; VISITS = j.visits || null; CAN = j.canEdit || []; if (onSaved) onSaved(null); } }).catch(() => {}); },
    cell: cellHTML,
    // for pages with their own row cells (Teacher Performance): the Create package button, and the row behind a button
    pkgButton(x) { if (!x || !x.r || !CAN.includes(x.centre)) return ''; const k = key(x); REG[k] = x; return `<button type="button" class="re-pk" data-pkg="${esc(k)}">Create package</button><button type="button" class="re-fu" data-fu="${esc(k)}">Follow-up message</button>`; },
    _reg: k => REG[k],
    // can this person edit rows of that centre?
    canEdit: c => CAN.includes(c),
    /* Save a few learner fields straight from a list (no form): vals = {ext: '7', done: '2026-11-12'}. Same checks as Edit:
       the row must match, each cell must still say what the page showed, nothing else is written. Resolves with the saved values. */
    async quickSave(x, vals) {
      const r = x.r, T = kind(x), F = T.fields(x), IDX = {}, TY = {}, LAB = {}, changes = {}, before = {};
      F.forEach(([f, t, i, lab]) => { IDX[f] = i; TY[f] = t; LAB[f] = lab; });
      Object.keys(vals).forEach(f => { const v = String(vals[f] == null ? '' : vals[f]).trim(); if (!(f in IDX)) return;
        if (v !== shown(TY[f], cell(r, IDX[f]))) { changes[f] = v; before[f] = cell(r, IDX[f]); } });
      if (!Object.keys(changes).length) return {};
      const j = await ArtiumAuth.call(T.action, Object.assign(T.params(x, r), { changes, before }));
      if (j && j.error === 'changed') { Object.keys(j.current || {}).forEach(f => r[IDX[f]] = j.current[f]);
        throw new Error('Someone changed ' + j.fields.map(f => LAB[f]).join(', ') + ' in the sheet. The newer value is shown now. Nothing was saved.'); }
      if (j && j.error) throw new Error(j.error === 'not-found' ? 'Couldn’t find exactly this row in the sheet. Nothing was saved. Please use Open row.'
        : j.error === 'many' ? 'More than one row matches, so nothing was saved. Please use Open row.' : j.error === 'not-allowed' ? 'You can only edit rows for your own centre.' : j.error);
      Object.keys(j.values || {}).forEach(f => r[IDX[f]] = j.values[f]);
      toast('Saved to the sheet · ' + T.title(r));
      return j.values || {};
    },
    toast
  };
})();

/* ── Create package: build one or more fee options for a learner or visitor, and a WhatsApp message to copy ──
   Fees, discounts and classes per level come from the Basic Information sheet (feeData). Nothing is written anywhere.
   Rules: fee = classes × fee per class of each level. Discount: Standard (Fresh Sales or Renewals column, by duration), or Special / Launch
   (replaces Standard, no family discount), or Custom % (typed). Family / sibling adds its own % as a separate line.
   Each level can hold at most its number of classes (Max Classes tab). A package bigger than the level is split across levels by the
   person creating it: the builder only suggests a split; every part can be changed. */
(function () {
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cell = (r, i) => String(r && r[i] != null ? r[i] : '').trim();
  const inr = v => '₹' + Math.round(v).toLocaleString('en-IN');
  const pcs = v => (Math.round(v * 100) / 100) + '%';
  let FEE = null, LOAD = null, P = null;
  const norm = s => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const find = (obj, k) => obj ? Object.keys(obj).find(x => norm(x) === norm(k)) : undefined;
  function load() { if (!LOAD) LOAD = ArtiumAuth.call('feeData', {}).then(j => { FEE = j; return j; }).catch(e => { LOAD = null; throw e; }); return LOAD; }
  const css = `.pk-bg{position:fixed;inset:0;z-index:80;background:rgba(1,6,76,.32);backdrop-filter:blur(3px);display:grid;place-items:center;padding:20px}
  .pk-bx{width:min(1240px,100%);max-height:calc(100vh - 40px);overflow:auto;background:#fff;border-radius:26px;box-shadow:0 40px 80px -30px rgba(1,7,60,.6);padding:22px 24px;display:grid;grid-template-columns:minmax(0,1fr) 420px;gap:24px;color:#4A4466;font-size:14px}
  .pk-bx h2{font-size:19px;color:#01073C}.pk-sub{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:13px;color:#6A6488;margin-top:6px}
  .pk-sub select,.pk-op select,.pk-op input{height:36px;border:1px solid #E6E0F3;border-radius:11px;padding:0 10px;font:inherit;font-size:13.5px;color:#01073C;background:#fff}
  .pk-k{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 14px}.pk-k i{font-style:normal;font-size:12px;font-weight:600;background:#F4EEFF;color:#4101F7;border-radius:7px;padding:4px 9px}.pk-k i.w{background:#FFF4DC;color:#8A5A00}
  .pk-op{border:1px solid #E6E0F3;border-radius:20px;padding:16px 18px;margin-bottom:12px}.pk-oh{display:flex;justify-content:space-between;align-items:center}.pk-oh b{font-size:15px;color:#01073C}
  .pk-rm{border:0;background:none;font:inherit;font-size:12px;color:#B0204F;font-weight:700;cursor:pointer}
  .pk-row{display:grid;grid-template-columns:1.25fr 1.4fr .7fr;gap:14px;margin-top:12px}.pk-l{font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#6A6488;display:block;margin-bottom:6px}
  .pk-seg{display:flex;gap:3px;background:#EFEAF9;border-radius:13px;padding:4px}.pk-seg button{flex:1;border:0;background:none;padding:7px 0;border-radius:10px;font:inherit;font-size:13px;font-weight:600;color:#4A4466;cursor:pointer;position:relative}
  .pk-seg button[aria-pressed="true"]{background:#fff;color:#01073C;box-shadow:0 1px 2px rgba(1,7,60,.06),0 8px 18px -12px rgba(201,80,42,.6)}.pk-seg button[aria-pressed="true"]::after{content:"";position:absolute;left:10px;right:10px;bottom:0;height:3px;border-radius:3px 3px 0 0;background:linear-gradient(90deg,#C9502A,#F5906F)}
  .pk-tk{display:flex;align-items:center;gap:8px;font-size:13.5px;color:#01073C;margin-top:8px;cursor:pointer}.pk-tk input{width:17px;height:17px;accent-color:#4101F7}.pk-tk.off{color:#B7B0CC;cursor:default}
  .pk-cl{height:36px;border:1px solid #E6E0F3;border-radius:11px;display:flex;align-items:center;padding:0 12px;color:#01073C;font-weight:700}
  .pk-sp{margin-top:12px;border-radius:14px;background:#F4EEFF;padding:10px 12px}.pk-sp .pk-pr{display:flex;gap:8px;align-items:center;margin-top:6px;font-size:13px}.pk-sp .pk-pr select{flex:1}.pk-sp .pk-pr input{width:80px}
  .pk-sp small{font-size:12px;color:#4101F7}
  .pk-sum{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:12px;background:#F7F5FC;border-radius:14px;padding:12px 14px}.pk-sum small{display:block;font-size:11px;color:#6A6488;font-weight:600}.pk-sum b{font-size:16px;color:#01073C}.pk-sum .pay b{color:#4101F7;font-size:18px}
  .pk-err{font-size:12.5px;color:#B0204F;background:#FFEDF2;border-radius:10px;padding:8px 12px;margin-top:10px}.pk-note{font-size:12px;color:#8A5A00;background:#FFF4DC;border-radius:10px;padding:8px 12px;margin-top:10px}
  .pk-add{border:1.5px dashed #C9B5FA;background:none;border-radius:14px;padding:10px 16px;font:inherit;font-size:13.5px;font-weight:700;color:#4101F7;cursor:pointer}
  .pk-mh{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.pk-mh b{font-size:14px;color:#01073C}.pk-mh span{display:flex;gap:14px}.pk-mh button{border:0;background:none;font:inherit;font-size:12.5px;font-weight:700;color:#4101F7;cursor:pointer}
  .pk-wa{background:#EFEAE2 radial-gradient(rgba(0,0,0,.04) 1px,transparent 1px) 0 0/14px 14px;border-radius:18px;padding:0 0 16px;overflow:hidden}
  .pk-wt{display:flex;align-items:center;gap:10px;background:#F0F2F5;padding:10px 14px;margin-bottom:12px}.pk-wt i{width:34px;height:34px;border-radius:50%;background:#DFE5E7}.pk-wt b{display:block;font-size:14px;color:#111B21}.pk-wt small{font-size:12px;color:#667781}
  .pk-wb{position:relative;margin:0 14px 0 30px;background:#D9FDD3;border-radius:10px 0 10px 10px;padding:9px 11px 20px;font:400 13.6px/1.42 'Segoe UI',Helvetica,Arial,sans-serif;color:#111B21;box-shadow:0 1px .5px rgba(11,20,26,.13);white-space:pre-wrap;word-wrap:break-word}
  .pk-wb .t{position:absolute;right:9px;bottom:4px;font-size:11px;color:#667781}
  .pk-ta{width:100%;min-height:420px;border:1px solid #E6E0F3;border-radius:14px;padding:12px;font:13.5px/1.5 'Segoe UI',Helvetica,Arial,sans-serif;color:#111B21;resize:vertical}
  .pk-cp{width:100%;margin-top:14px;border:0;border-radius:12px;padding:12px;font:inherit;font-size:14px;font-weight:700;color:#fff;background:linear-gradient(135deg,#4101F7,#6601FD);cursor:pointer}.pk-cp:disabled{opacity:.5;cursor:default}
  .pk-x{position:absolute;top:14px;right:16px}
  .fu-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.fu-cd{text-align:left;border:1px solid #E6E0F3;background:#fff;border-radius:16px;padding:14px;font:inherit;cursor:pointer}
  .fu-cd b{display:block;font-size:14.5px;color:#01073C}.fu-cd small{display:block;font-size:12.5px;color:#6A6488;margin-top:4px;line-height:1.4}.fu-cd.on{border-color:#C9502A;box-shadow:0 0 0 3px rgba(245,144,111,.25)}
  .fu-n{display:inline-block;margin-bottom:6px;font-size:11px;font-weight:700;color:#A8431E;background:#FFF1EA;border-radius:6px;padding:2px 7px}
  .fu-seg button{padding:7px 18px}
  #fu-bg select{height:36px;border:1px solid #E6E0F3;border-radius:11px;padding:0 10px;font:inherit;font-size:13.5px;color:#01073C;background:#fff}
  .fu-hint{margin-top:18px;font-size:12.5px;color:#6A6488;background:#F7F5FC;border-radius:12px;padding:10px 12px;line-height:1.5}
  @media (max-width:980px){.fu-cards{grid-template-columns:1fr}}
  @media (max-width:980px){.pk-bx{grid-template-columns:1fr}.pk-row{grid-template-columns:1fr}.pk-sum{grid-template-columns:repeat(2,1fr)}}`;
  let styled = false;
  /* The person, from a learner row (Fresh Sales / Renewals) or a visitor row (Centre Visits) */
  function person(x) {
    if (x.kind === 'visit') return { name: cell(x.r, 1), phone: cell(x.r, 2).replace(/\D/g, '').slice(-10), age: cell(x.r, 3), gender: '', course: cell(x.r, 6), level: '', type: 'admission', centre: x.centre };
    return { name: cell(x.r, 4), phone: cell(x.r, 7).replace(/\D/g, '').slice(-10), age: cell(x.r, 6), gender: cell(x.r, 5), course: cell(x.r, 8), level: cell(x.r, 9), type: 'renewal', centre: x.centre };
  }
  const kidAge = a => /^(0 to 5|6 to 12)$/i.test(String(a).trim());
  const defSal = p => kidAge(p.age) ? '' : /^m/i.test(p.gender) ? 'Mr.' : /^f/i.test(p.gender) ? 'Ms.' : '';
  const levelsOf = () => (FEE && FEE.levels && FEE.levels.length ? FEE.levels : ['Preparatory', 'Intermediate', 'Proficient', 'Advanced']);
  const rateOf = (lv) => { const c = FEE.fees[P.p.centre] || {}, k = find(c, P.course); const L = k ? c[k] : null, lk = L ? find(L, lv) : null; return lk ? L[lk] : 0; };
  const maxOf = (lv) => { const k = find(FEE.max, P.course), L = k ? FEE.max[k] : null, lk = L ? find(L, lv) : null; return lk ? L[lk] : Infinity; };
  function suggest(o) {   // fill the current level, then the next ones (only as a starting point)
    const D = FEE.disc[o.d], L = levelsOf(), parts = []; let left = D.classes, i = Math.max(0, L.findIndex(l => norm(l) === norm(P.level)));
    while (left > 0 && i < L.length) { const n = Math.min(left, maxOf(L[i])); if (n > 0) parts.push({ lv: L[i], n }); left -= n; i++; }
    if (left > 0) parts.push({ lv: L[L.length - 1], n: left });
    return parts;
  }
  function calc(o) {
    const D = FEE.disc[o.d]; if (!D) return { err: 'Pick a duration.' };
    const parts = o.split ? o.parts : [{ lv: P.level, n: D.classes }], tot = parts.reduce((s, x) => s + (+x.n || 0), 0);
    if (!P.level) return { err: 'Pick the course level.' };
    for (const x of parts) {
      if (!rateOf(x.lv)) return { err: `${P.course || 'This course'} at ${x.lv} isn't offered at ${P.p.centre} (no fee in the Fee Structure tab).` };
      if (x.n > maxOf(x.lv)) return { err: o.split ? `${x.lv} has ${maxOf(x.lv)} classes, so it can't take ${x.n}.` : `${x.lv} has ${maxOf(x.lv)} classes, so ${D.classes} classes don't fit in it. Turn on “Split across levels” to choose how many go into each level.` };
    }
    if (tot !== D.classes) return { err: `The levels add up to ${tot} classes. A ${D.label.toLowerCase()} package has ${D.classes}.` };
    const gross = parts.reduce((s, x) => s + x.n * rateOf(x.lv), 0);
    const base = o.t === 'spl' ? D.spl : o.t === 'cus' ? Math.max(0, Math.min(100, +o.cus || 0)) : (P.p.type === 'admission' ? D.fs : D.rn);
    const fam = o.fam && o.t !== 'spl' ? D.fam : 0, bAmt = Math.round(gross * base / 100), fAmt = Math.round(gross * fam / 100), pay = gross - bAmt - fAmt;
    const std = P.p.type === 'admission' ? D.fs : D.rn;
    return { D, parts, gross, base, fam, bAmt, fAmt, pay, pm: pay / (D.months || 1), custom: o.t === 'cus' && base !== std, std };
  }
  const clsText = c => c.parts.length === 1 ? `${c.D.classes} ${c.parts[0].lv}` : `${c.D.classes} (${c.parts.map(x => x.n + ' ' + x.lv).join(' + ')})`;
  function message() {
    const C = P.opts.map(calc); if (C.some(c => c.err)) return '';
    const best = C.length > 1 ? C.reduce((b, c, i) => c.pm < C[b].pm ? i : b, 0) : -1, p = P.p, nm = (P.sal ? P.sal + ' ' : '') + p.name;
    const one = C.length === 1, kind = p.type === 'admission' ? 'admission' : 'renewal';
    let t = `Hi ${nm},\n\n` + (p.type === 'admission' ? `Thank you for choosing to learn ${P.course} with us at Artium Academy, ${p.centre}. We're so happy you're joining us.`
      : `Thank you for learning ${P.course} with us at Artium Academy, ${p.centre}. It's been lovely to see your progress.`)
      + `\n\nHere ${one ? 'is the ' + kind + ' option' : 'are the ' + kind + ' options'} we've put together for you:\n`;
    C.forEach((c, i) => {
      t += `\n*${one ? '' : 'Option ' + (i + 1) + ': '}${c.D.label}*${i === best ? ' ⭐ Best value' : ''}\n• Classes: ${clsText(c)}\n• Gross fee: ${inr(c.gross)}\n`
        + (c.base ? `• Discount: ${pcs(c.base)} (${inr(c.bAmt)})\n` : '') + (c.fam ? `• Family / sibling discount: ${pcs(c.fam)} (${inr(c.fAmt)})\n` : '') + `• *Fee payable: ${inr(c.pay)}*\n`;
    });
    t += `\n${one ? 'Please take a look and let me know if you would like to go ahead.' : 'Please take a look and let me know which option works best for you.'} Once you confirm, I'll share the payment link right away.\n\nWarm regards,\n${FEE.me || ''}\nArtium Academy, ${p.centre}`;
    return t;
  }
  const waHTML = t => esc(t).replace(/\*([^*\n]+)\*/g, '<b>$1</b>');
  function draw() {
    let bg = document.getElementById('pk-bg'); if (!P) { if (bg) bg.remove(); return; }
    if (!bg) { bg = document.createElement('div'); bg.id = 'pk-bg'; bg.className = 'pk-bg'; document.body.appendChild(bg); bg.addEventListener('click', e => { if (e.target === bg) close(); }); }
    if (!FEE) { bg.innerHTML = `<div class="pk-bx" style="display:block"><b>${P.err ? esc(P.err) : 'Loading the fee structure…'}</b>${P.err ? '<p style="margin-top:12px"><button class="pk-add" data-pkx>Close</button></p>' : ''}</div>`; return; }
    const p = P.p, L = levelsOf(), courses = Object.keys(FEE.fees[p.centre] || {});
    const opt = (o, i) => { const c = calc(o), D = FEE.disc;
      return `<div class="pk-op"><div class="pk-oh"><b>Option ${i + 1}</b>${P.opts.length > 1 ? `<button class="pk-rm" data-pkrm="${i}">Remove</button>` : ''}</div>
      <div class="pk-row"><div><span class="pk-l">Duration</span><div class="pk-seg">${D.map((d, j) => `<button type="button" data-pkd="${i}|${j}" aria-pressed="${o.d === j}">${d.months}M</button>`).join('')}</div></div>
        <div><span class="pk-l">Discount</span><select data-pkt="${i}"><option value="std"${o.t === 'std' ? ' selected' : ''}>Standard ${p.type === 'admission' ? 'fresh sale' : 'renewal'} · ${pcs(p.type === 'admission' ? D[o.d].fs : D[o.d].rn)}</option>
          <option value="spl"${o.t === 'spl' ? ' selected' : ''}>Special / Launch · ${pcs(D[o.d].spl)}</option><option value="cus"${o.t === 'cus' ? ' selected' : ''}>Custom %</option></select>
          ${o.t === 'cus' ? `<input type="number" min="0" max="100" step="0.5" data-pkc="${i}" value="${esc(o.cus)}" placeholder="%" style="width:90px;margin-left:6px">` : ''}
          ${D[o.d].fam ? `<label class="pk-tk${o.t === 'spl' ? ' off' : ''}"><input type="checkbox" data-pkf="${i}"${o.fam && o.t !== 'spl' ? ' checked' : ''}${o.t === 'spl' ? ' disabled' : ''}>Family / sibling discount · +${pcs(D[o.d].fam)}${o.t === 'spl' ? ' (not with Special / Launch)' : ''}</label>` : `<span class="pk-tk off">No family / sibling discount for ${esc(D[o.d].label.toLowerCase())}</span>`}</div>
        <div><span class="pk-l">Classes</span><div class="pk-cl">${D[o.d].classes}</div></div></div>
      <label class="pk-tk"><input type="checkbox" data-pks="${i}"${o.split ? ' checked' : ''}>Split across levels</label>
      ${o.split ? `<div class="pk-sp"><small>Choose how many classes go into each level. They must add up to ${D[o.d].classes}.</small>${o.parts.map((x, k) => `<div class="pk-pr"><select data-pkpl="${i}|${k}">${L.map(l => `<option${norm(l) === norm(x.lv) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>
        <input type="number" min="1" step="1" data-pkpn="${i}|${k}" value="${x.n}"> classes${rateOf(x.lv) ? ` × ${inr(rateOf(x.lv))} = ${inr(x.n * rateOf(x.lv))}` : ''}${o.parts.length > 1 ? ` <button class="pk-rm" data-pkpr="${i}|${k}">Remove</button>` : ''}</div>`).join('')}
        <button class="pk-rm" style="color:#4101F7;margin-top:6px" data-pkpa="${i}">+ Add a level</button></div>` : ''}
      ${c.err ? `<div class="pk-err">${esc(c.err)}</div>` : `<div class="pk-sum"><div><small>Gross fee</small><b>${inr(c.gross)}</b></div><div><small>Discount ${pcs(c.base)}</small><b>${c.base ? inr(c.bAmt) : '–'}</b></div><div><small>Family ${c.fam ? pcs(c.fam) : ''}</small><b>${c.fam ? inr(c.fAmt) : '–'}</b></div><div><small>Per month</small><b>${inr(c.pm)}</b></div><div class="pay"><small>Fee payable</small><b>${inr(c.pay)}</b></div></div>
        ${c.custom ? `<div class="pk-note">Custom discount: the table gives ${pcs(c.std)} for ${c.D.label.toLowerCase()}.</div>` : ''}`}</div>`; };
    const gen = message(), text = P.edit != null ? P.edit : gen;
    bg.innerHTML = `<div class="pk-bx"><div>
      <h2>Create package · ${esc(p.name)}</h2>
      <div class="pk-sub"><select data-pksal>${['', 'Mr.', 'Ms.', 'Mrs.'].map(s => `<option value="${s}"${P.sal === s ? ' selected' : ''}>${s ? 'Address as ' + s : 'No salutation'}</option>`).join('')}</select>
        <select data-pkty><option value="renewal"${p.type === 'renewal' ? ' selected' : ''}>Renewal</option><option value="admission"${p.type === 'admission' ? ' selected' : ''}>Admission</option></select>
        <select data-pkco>${(courses.length ? courses : [P.course]).map(c => `<option${norm(c) === norm(P.course) ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select>
        <select data-pklv><option value="">Course level</option>${L.map(l => `<option${norm(l) === norm(P.level) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>
        <span>${esc(p.centre)}${P.level && rateOf(P.level) ? ' · ' + inr(rateOf(P.level)) + ' a class' : ''}</span></div>
      <div class="pk-k">${P.level && isFinite(maxOf(P.level)) ? `<i class="w">${esc(P.level)} has ${maxOf(P.level)} classes</i>` : ''}${p.phone ? `<i>${esc(p.phone.replace(/(\d{5})(\d{5})/, '$1 $2'))}</i>` : ''}</div>
      ${P.opts.map(opt).join('')}
      ${P.opts.length < 3 ? '<button class="pk-add" data-pkadd>+ Add another option</button>' : ''}</div>
      <div><div class="pk-mh"><b>Preview · as it will look on WhatsApp</b><span>${P.edit != null ? '<button data-pkrs>Back to the generated text</button>' : '<button data-pked>Edit the text</button>'} <button data-pkx>Close</button></span></div>
        ${P.edit != null ? `<textarea class="pk-ta" data-pkta>${esc(text)}</textarea>` : `<div class="pk-wa"><div class="pk-wt"><i></i><div><b>${esc((P.sal ? P.sal + ' ' : '') + p.name)}</b><small>${p.phone ? '+91 ' + esc(p.phone.replace(/(\d{5})(\d{5})/, '$1 $2')) : ''}</small></div></div>
          ${text ? `<div class="pk-wb">${waHTML(text)}<span class="t">now</span></div>` : '<div class="pk-wb">Fix the options on the left to see the message.</div>'}</div>`}
        <button class="pk-cp" data-pkcp${text ? '' : ' disabled'}>Copy message</button>
        <div class="pk-sub">Paste it into the learner's WhatsApp chat. The bold comes through exactly as shown.</div></div></div>`;
  }
  function close() { P = null; draw(); }
  function open(x) {
    if (!styled) { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); styled = true; }
    const p = person(x); P = { p, sal: defSal(p), course: p.course, level: p.level, opts: [], edit: null };
    draw();
    load().then(() => { if (!P) return; const D = FEE.disc, i3 = Math.max(0, D.findIndex(d => d.months === 3));
      const ck = find(FEE.fees[p.centre], P.course); if (ck) P.course = ck; const lk = levelsOf().find(l => norm(l) === norm(P.level)); P.level = lk || (p.type === 'admission' ? levelsOf()[0] : P.level);
      P.opts = [{ d: i3, t: 'std', cus: '', fam: false, split: false, parts: [] }]; draw(); })
      .catch(e => { if (P) { P.err = 'Couldn’t load the fee structure: ' + (e.message || e); draw(); } });
  }
  const O = el => P.opts[+String(el).split('|')[0]];
  document.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b && b.dataset.pkg !== undefined) { e.preventDefault(); e.stopPropagation(); const x = window.RowEdit && RowEdit._reg(b.dataset.pkg); if (x) open(x); return; }
    if (!P || !b) return;
    const d = b.dataset;
    if (d.pkx !== undefined) close();
    else if (d.pkd) { const [i, j] = d.pkd.split('|').map(Number), o = P.opts[i]; o.d = j; if (o.split) o.parts = suggest(o); P.edit = null; draw(); }
    else if (d.pkrm) { P.opts.splice(+d.pkrm, 1); P.edit = null; draw(); }
    else if (d.pkadd !== undefined) { const last = P.opts[P.opts.length - 1]; P.opts.push({ d: Math.min(FEE.disc.length - 1, (last ? last.d : 0) + 1), t: 'std', cus: '', fam: last ? last.fam : false, split: false, parts: [] }); P.edit = null; draw(); }
    else if (d.pkpa) { const o = O(d.pkpa), L = levelsOf(), lastLv = o.parts.length ? o.parts[o.parts.length - 1].lv : P.level; o.parts.push({ lv: L[Math.min(L.length - 1, L.findIndex(l => norm(l) === norm(lastLv)) + 1)], n: 8 }); P.edit = null; draw(); }
    else if (d.pkpr) { const [i, k] = d.pkpr.split('|').map(Number); P.opts[i].parts.splice(k, 1); P.edit = null; draw(); }
    else if (d.pked !== undefined) { P.edit = message(); draw(); }
    else if (d.pkrs !== undefined) { P.edit = null; draw(); }
    else if (d.pkcp !== undefined) { const t = P.edit != null ? P.edit : message(); if (!t) return;
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { b.textContent = 'Copied ✓'; setTimeout(() => { if (b.isConnected) b.textContent = 'Copy message'; }, 1800); })
        .catch(() => { P.edit = t; draw(); const ta = document.querySelector('[data-pkta]'); if (ta) { ta.focus(); ta.select(); } }); }
  }, true);
  document.addEventListener('change', e => {
    if (!P) return; const el = e.target, d = el.dataset;
    if (d.pksal !== undefined) P.sal = el.value;
    else if (d.pkty !== undefined) P.p.type = el.value;
    else if (d.pkco !== undefined) P.course = el.value;
    else if (d.pklv !== undefined) P.level = el.value;
    else if (d.pkt) O(d.pkt).t = el.value;
    else if (d.pkf) O(d.pkf).fam = el.checked;
    else if (d.pks) { const o = O(d.pks); o.split = el.checked; if (o.split) o.parts = suggest(o); }
    else if (d.pkpl) { const [i, k] = d.pkpl.split('|').map(Number); P.opts[i].parts[k].lv = el.value; }
    else if (d.pkpn) { const [i, k] = d.pkpn.split('|').map(Number); P.opts[i].parts[k].n = Math.max(0, parseInt(el.value, 10) || 0); }
    else if (d.pkc) O(d.pkc).cus = el.value;
    else if (d.pkta !== undefined) { P.edit = el.value; return; }
    else return;
    if (d.pkta === undefined) P.edit = null;
    clearTimeout(window.__pkT); window.__pkT = setTimeout(draw, 0);   // after the browser has finished with the field (avoids redrawing during blur)
  });
  document.addEventListener('input', e => { if (P && e.target.dataset.pkta !== undefined) P.edit = e.target.value; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && P) close(); });
  /* ── Follow-up message (Admissions Pipeline): three locked templates for visitors, written to the visitor or, for children, to the parent ── */
  let F = null;
  const WDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const pd = s => { const m = String(s || '').trim().match(/^(\d{1,2})-([A-Za-z]{3})[A-Za-z]*-(\d{2,4})$/); if (!m) return null; const k = MON3.findIndex(x => x.toLowerCase() === m[2].toLowerCase()); return k < 0 ? null : new Date(m[3].length === 2 ? 2000 + +m[3] : +m[3], k, +m[1]); };
  function whenOpts(d) {
    if (!d) return ['recently'];
    const t = new Date(); t.setHours(0, 0, 0, 0); const g = Math.round((t - d) / 864e5);
    const on = g >= 2 && g <= 6 ? 'on ' + WDAY[d.getDay()] : 'on ' + d.getDate() + ' ' + MON3[d.getMonth()];
    return g === 0 ? ['today', 'yesterday', on] : g === 1 ? ['yesterday', 'today', on] : [on, 'recently'];
  }
  /* Admissions: five templates in three groups */
  const AD_T = [['First message', [['Thank you for visiting', 'Same day or the next day, when they need time to think.']]],
    ['Called, but couldn’t connect', [['First follow-up', 'A few days later, after a call that didn’t connect.'], ['Second follow-up', 'Another attempt that didn’t connect.']]],
    ['Message only, no call', [['First message', 'A friendly check-in, without calling.'], ['Second message', 'Following up on the first message.']]]];
  const MONF = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  /* Renewals: six templates in three groups. The date is the package end (the New Package Expiry Date when extended). */
  const RN_T = [['First messages', [['Experience and renewal', 'Ask how classes are going, and mention when the package ends.'], ['Renewal intention', 'They replied about their experience but not about renewing.']]],
    ['Called, but couldn’t connect', [['First follow-up', 'After a call that didn’t connect.'], ['Second follow-up', 'Another attempt that didn’t connect.']]],
    ['Message only, no call', [['First reminder', 'A gentle note that the package is ending.'], ['Second reminder', 'Following up on the first reminder.']]]];
  // the course, with its emoji: 🎸 Guitar, 🎹 Keyboard, 🎤 vocals, 🎶 anything else
  const withEmoji = c => { const e = /guitar/i.test(c) ? '🎸' : /keyboard|piano/i.test(c) ? '🎹' : /vocal|pfm|carnatic|hindustani|sing/i.test(c) ? '🎤' : '🎶'; return (c || 'music') + ' ' + e; };
  function rnText() {
    const r = F.x.r, nm = cell(r, 4), course = withEmoji(cell(r, 8)), c = F.x.centre, me = (FEE && FEE.me) || '';
    const e = F.end, ds = e ? e.getDate() + ' ' + MONF[e.getMonth()] : 'soon', past = F.past, ends = past ? 'ended' : 'ends';
    const your = F.par ? nm + "'s" : 'your', Your = F.par ? nm + "'s" : 'Your', you = F.par ? nm : 'you';
    const keep = past ? `so ${you} can pick up right where ${F.par ? 'they' : 'you'} left off 🎶` : `so ${you} can keep the music going without a break 🎶`;
    const name = (F.sal ? F.sal + ' ' : '') + nm, hi = F.par ? 'Hi 😊' : `Hi ${name} 😊`, hiW = F.par ? "Hi, I hope you're having a lovely week 🌸" : `Hi ${name}, I hope you're having a lovely week 🌸`;
    const sign = `\n\nWarm regards,\n${me}\nArtium Academy, ${c}`;
    const T = [
      `${hi}\n\nI hope you're doing well! I wanted to check in and see how ${your} ${course} classes at Artium Academy, ${c}, have been going. We'd love to hear how ${F.par ? nm + ' is' : "you're"} enjoying them, and if there's anything we can do to make them even better.\n\nAlso, just a quick heads-up that ${your} current package ${ends} on ${ds}. Whenever you're ready, I'll happily share the renewal options with you.`,
      `${hi}\n\nThank you so much for sharing your thoughts with us. It truly means a lot 🙏\n\nI also wanted to check if you've had a chance to think about renewing ${your} ${course} classes. ${Your} current package ${ends} on ${ds}, and I'd be glad to share the options ${keep}`,
      `${hi}\n\nI tried giving you a call a little while ago but couldn't get through. I was calling about renewing ${your} ${course} classes at Artium Academy, ${c}, as ${your} current package ${ends} on ${ds}.\n\nPlease let me know a good time to chat, or simply reply here and I'll send the renewal options across.`,
      `${hiW}\n\nI tried reaching you again today but couldn't connect, so I thought I'd drop you a quick message.\n\n${Your} ${course} package ${ends} on ${ds}. We'd really love for ${you} to keep learning with us, so just reply here whenever you can and I'll help you with the renewal 🙏`,
      `${hi}\n\nJust a gentle reminder that ${your} current ${course} package at Artium Academy, ${c}, ${ends} on ${ds}.\n\nIf you'd like, I can share the renewal options ${past ? `so ${you} can pick up right where ${F.par ? 'they' : 'you'} left off 🎶` : `so ${your} classes continue without a break 🎶`} Just reply here and I'll send them right over.`,
      `${hi}\n\nJust following up on my earlier message about renewing ${your} ${course} classes. ${Your} package ${ends} on ${ds}.\n\nIf you have any questions, or would like to talk it over, I'm always happy to help. Just reply here whenever it suits you 🙏`];
    return T[F.t] + sign;
  }
  function fuText() {
    if (F.rn) return rnText();
    const r = F.x.r, nm = cell(r, 1), course = withEmoji(cell(r, 6)), c = F.x.centre, me = (FEE && FEE.me) || '', P = F.par;
    const name = (F.sal ? F.sal + ' ' : '') + nm, hi = P ? 'Hi 😊' : `Hi ${name} 😊`, hiW = P ? "Hi, I hope you're having a lovely week 🌸" : `Hi ${name}, I hope you're having a lovely week 🌸`;
    const sign = `\n\nWarm regards,\n${me}\nArtium Academy, ${c}`;
    const T = [
      `${hi}\n\nThank you so much for visiting Artium Academy, ${c}, ${P ? 'with ' + nm + ' ' : ''}${F.when}! It was lovely meeting ${P ? 'you both' : 'you'}, and we hope ${P ? nm : 'you'} enjoyed ${F.trial ? 'the ' + course + ' trial class' : (P ? 'the' : 'your') + ' visit'}.\n\nWe'd be truly delighted to have ${P ? nm : 'you'} join our music family. If you have any questions about the course, batch timings or fees, just message me here. I'm always happy to help.`,
      `${hi}\n\nI tried giving you a call a little while ago but couldn't get through. I just wanted to check in and see if you've had a chance to think about ${P ? nm + ' starting' : 'starting'} ${course} classes with us at Artium Academy, ${c}.\n\nIf you'd like more details, or would love to drop by again, just let me know. You can reply here or call me whenever it suits you.`,
      `${hiW}\n\nI tried reaching you again today but couldn't connect, so I thought I'd send you a quick note.\n\nWe'd love to have ${P ? nm : 'you'} begin ${P ? 'their' : 'your'} ${course} journey with us at Artium Academy, ${c}. Whenever you're ready, or if anything's on your mind about batches, timings or fees, just reply here. I'm here to help 🙏`,
      `${hi}\n\nI hope you're doing well! I just wanted to check in after your visit to Artium Academy, ${c}${P ? ', with ' + nm : ''}, and see if you've had a chance to think about ${P ? nm + ' starting' : 'starting'} ${course} classes with us.\n\nIf you have any questions about the course, batch timings or fees, just reply here. I'm always happy to help.`,
      `${hi}\n\nJust following up on my earlier message about ${P ? nm + ' joining' : 'joining'} ${course} classes at Artium Academy, ${c}.\n\nWhenever you're ready, or if you'd like to visit us again, just reply here and I'll take care of the rest 🙏`];
    return T[F.t] + sign;
  }
  function fuDraw() {
    let bg = document.getElementById('fu-bg'); if (!F) { if (bg) bg.remove(); return; }
    if (!bg) { bg = document.createElement('div'); bg.id = 'fu-bg'; bg.className = 'pk-bg'; document.body.appendChild(bg); bg.addEventListener('click', e => { if (e.target === bg) { F = null; fuDraw(); } }); }
    const r = F.x.r, RN = F.rn, nm = cell(r, RN ? 4 : 1), age = cell(r, RN ? 6 : 3), ph = cell(r, RN ? 7 : 2).replace(/\D/g, '').slice(-10), phs = ph.replace(/(\d{5})(\d{5})/, '$1 $2'), text = F.edit != null ? F.edit : fuText();
    const seg = (k, v, l) => `<button type="button" data-fu${k}="${v}" aria-pressed="${String(F[k === 'par' ? 'par' : k]) === String(v)}">${l}</button>`;
    bg.innerHTML = `<div class="pk-bx" style="grid-template-columns:minmax(0,1fr) 430px"><div>
      <h2>Follow-up message · ${esc(nm)}</h2><div class="pk-sub">${esc(F.x.centre)} · ${RN ? (F.x.tab === 'rn' ? 'Renewals' : 'Fresh Sales') + ' · row ' + esc(r[40] || '') : 'Centre Visits · row ' + esc(r[18] || '')}</div>
      <div class="pk-k">${RN ? `<i>Package ${F.past ? 'ended' : 'ends'} ${F.end ? F.end.getDate() + ' ' + MON3[F.end.getMonth()] : '–'}</i><i>${esc(cell(r, 8))}${cell(r, 9) ? ' · ' + esc(cell(r, 9)) : ''}</i>` : `<i>Visited ${esc(cell(r, 0))}</i>${/^y/i.test(cell(r, 7)) ? `<i>${esc(cell(r, 6))} trial class taken</i>` : ''}`}${age ? `<i>Age group ${esc(age)}</i>` : ''}${ph ? `<i>${esc(phs)}</i>` : ''}</div>
      ${(() => { let n = 0; return (RN ? RN_T : AD_T).map(([g, L]) => `<span class="pk-l" style="margin-top:12px">${g}</span><div class="fu-cards" style="grid-template-columns:repeat(2,1fr)">${L.map(t => { const i = n++; return `<button type="button" class="fu-cd${F.t === i ? ' on' : ''}" data-fut="${i}">${F.sug === i ? '<span class="fu-n">Suggested</span>' : ''}<b>${t[0]}</b><small>${t[1]}</small></button>`; }).join('')}</div>`).join(''); })()}
      <span class="pk-l" style="margin-top:16px">Speak to</span>
      <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><div class="pk-seg fu-seg" style="display:inline-flex">${seg('par', 'false', RN ? 'Learner' : 'Visitor')}${seg('par', 'true', 'Parent')}</div>
        ${F.par ? `<span class="pk-sub" style="margin:0">${F.kid ? 'Parent, because the age group is ' + esc(age) + '.' : ''}</span>` : `<select data-fusal>${['', 'Mr.', 'Ms.', 'Mrs.'].map(s => `<option value="${s}"${F.sal === s ? ' selected' : ''}>${s ? 'Address as ' + s : 'No salutation'}</option>`).join('')}</select>`}</div>
      ${F.t === 0 && !RN ? `<span class="pk-l" style="margin-top:16px">Details</span><div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap">
        <label class="pk-tk" style="margin:0"><input type="checkbox" data-futr${F.trial ? ' checked' : ''}>Mention the trial class</label>
        <select data-fuwh>${whenOpts(pd(cell(r, 0))).map(w => `<option${w === F.when ? ' selected' : ''}>${w}</option>`).join('')}</select></div>` : ''}
      <div class="fu-hint">${RN ? '“Experience and renewal” is suggested while the package is still running, and “First reminder” once it has ended. The end date is the New Package Expiry Date when the package was extended. Everything fills in from the learner’s row, and you can edit the text before copying.' : `“Thank you for visiting” is suggested on the day of the visit and the day after. From the third day, the first follow-up after a call is suggested. Everything fills in from the visitor's row, and you can edit the text before copying.`}</div></div>
      <div><div class="pk-mh"><b>Preview · as it will look on WhatsApp</b><span>${F.edit != null ? '<button data-fure>Back to the template</button>' : '<button data-fued>Edit the text</button>'} <button data-fux>Close</button></span></div>
        ${F.edit != null ? `<textarea class="pk-ta" data-futa>${esc(text)}</textarea>` : `<div class="pk-wa"><div class="pk-wt"><i></i><div><b>${esc(F.par ? nm + '’s parent' : (F.sal ? F.sal + ' ' : '') + nm)}</b><small>${ph ? '+91 ' + esc(phs) : ''}</small></div></div><div class="pk-wb">${esc(text)}<span class="t">now</span></div></div>`}
        <button class="pk-cp" data-fucp>Copy message</button></div></div>`;
  }
  function fuOpen(x) {
    if (!styled) { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); styled = true; }
    if (x.kind !== 'visit') {   // a learner: the renewal templates
      const r = x.r, end = pd(cell(r, 36)) || pd(cell(r, 23)), t0 = new Date(); t0.setHours(0, 0, 0, 0); const kid = /^(0 to 5|6 to 12)$/i.test(cell(r, 6));
      const past = !!end && end < t0, sal = kid ? '' : /^m/i.test(cell(r, 5)) ? 'Mr.' : /^f/i.test(cell(r, 5)) ? 'Ms.' : '';
      F = { x, rn: true, end, past, t: past ? 4 : 0, sug: past ? 4 : 0, kid, par: kid, sal, edit: null };
      fuDraw(); load().then(() => { if (F) fuDraw(); }).catch(() => {}); return;
    }
    const r = x.r, d = pd(cell(r, 0)), t = new Date(); t.setHours(0, 0, 0, 0); const g = d ? Math.round((t - d) / 864e5) : 9, kid = /^(0 to 5|6 to 12)$/i.test(cell(r, 3));
    F = { x, t: g <= 1 ? 0 : 1, sug: g <= 1 ? 0 : 1, kid, par: kid, sal: '', trial: /^y/i.test(cell(r, 7)), when: whenOpts(d)[0], edit: null };
    fuDraw(); load().then(() => { if (F) fuDraw(); }).catch(() => {});   // the sender's name comes with the fee data
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b && b.dataset.fu !== undefined) { e.preventDefault(); e.stopPropagation(); const x = window.RowEdit && RowEdit._reg(b.dataset.fu); if (x) fuOpen(x); return; }
    if (!F || !b) return; const d = b.dataset;
    if (d.fux !== undefined) { F = null; fuDraw(); }
    else if (d.fut) { F.t = +d.fut; F.edit = null; fuDraw(); }
    else if (d.fupar) { F.par = d.fupar === 'true'; F.edit = null; fuDraw(); }
    else if (d.fued !== undefined) { F.edit = fuText(); fuDraw(); }
    else if (d.fure !== undefined) { F.edit = null; fuDraw(); }
    else if (d.fucp !== undefined) { const t = F.edit != null ? F.edit : fuText();
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { b.textContent = 'Copied ✓'; setTimeout(() => { if (b.isConnected) b.textContent = 'Copy message'; }, 1800); })
        .catch(() => { F.edit = t; fuDraw(); const ta = document.querySelector('[data-futa]'); if (ta) { ta.focus(); ta.select(); } }); }
  }, true);
  document.addEventListener('change', e => {
    if (!F) return; const el = e.target, d = el.dataset;
    if (d.fusal !== undefined) F.sal = el.value; else if (d.futr !== undefined) F.trial = el.checked; else if (d.fuwh !== undefined) F.when = el.value;
    else if (d.futa !== undefined) { F.edit = el.value; return; } else return;
    F.edit = null; clearTimeout(window.__fuT); window.__fuT = setTimeout(fuDraw, 0);
  });
  document.addEventListener('input', e => { if (F && e.target.dataset.futa !== undefined) F.edit = e.target.value; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && F) { F = null; fuDraw(); } });
  window.FollowUp = { open: fuOpen };
  window.Package = { open };
})();
