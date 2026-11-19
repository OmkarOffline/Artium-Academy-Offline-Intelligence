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
    return `<td class="re-c"><b>${esc(n)}</b><small>${T.sheet(x)}</small>${ln ? `<a class="re-go" href="${ln}" target="artium_sheet" rel="noopener" title="Opens in one Google Sheets tab, reused for every row">Open row<svg viewBox="0 0 24 24"><path d="M7 17L17 7M8 7h9v9"/></svg></a>` : ''}${CAN.includes(x.centre) ? `<button type="button" class="re-ed" data-re="${esc(k)}">Edit</button>` : ''}</td>`;
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
    cell: cellHTML
  };
})();
