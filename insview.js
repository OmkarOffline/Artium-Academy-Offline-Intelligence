/* InsView: how a recorded conversation looks, and the "Copy as image" card for WhatsApp.
   Shared by Check-ins and Focus Groups. Notes are bullets: every new line in a note box starts with a bullet. */
(function () {
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const ord = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] || 'th'));
  const dShort = d => { const p = String(d || '').split('-').map(Number); return p.length === 3 && p[0] ? ord(p[2]) + ' ' + MON[p[1] - 1] + ' ’' + String(p[0]).slice(2) : ''; };
  const title = e => { const m = String(e.src || '').match(/Check-in Day (\d+)/i); return m ? 'D' + m[1] + ' Check-in Call' : (e.items || []).some(i => i.type === 'Reason') ? 'Win-back call' : 'Learner conversation'; };
  const byOf = e => e.byName || String(e.by || '').split('@')[0];
  const WHO = { Parent: 'Parent', Learner: 'Learner', Both: 'Parent and Learner' };
  /* "Logged by Omkar on 24th Nov ’26 via phone call with the Parent." as parts: [text, isBold] */
  function sentence(e) {
    const how = e.how === 'Call' ? ['via ', 'phone call'] : e.how === 'WhatsApp' ? ['via ', 'WhatsApp'] : ['', 'in person'];
    return [['Logged by ', 0], [byOf(e), 1], [' on ', 0], [dShort(e.date), 1], [how[0] ? ' ' + how[0] : ', ', 0], [how[1], 1], [' with the ', 0], [WHO[e.with] || e.with || 'Parent', 1], ['.', 0]];
  }
  const sentHTML = e => sentence(e).map(([t, b]) => b ? `<b>${esc(t)}</b>` : esc(t)).join('');
  /* Notes: one point per line. A leading bullet is dropped. */
  const lines = n => String(n || '').split('\n').map(x => x.replace(/^\s*[•\-*]\s*/, '').trim()).filter(Boolean);
  const tidy = n => String(n || '').split('\n').map(x => x.trim()).filter(x => x && !/^[•\-*]$/.test(x)).join('\n');
  const plain = n => { const L = lines(n); return L.length > 1 ? L.map(x => '• ' + esc(x)).join('<br>') : esc(L[0] || ''); };
  const noteHTML = n => { const L = lines(n); return !L.length ? '' : L.length === 1 ? `<p>${esc(L[0])}</p>` : `<ul class="iv-bl">${L.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`; };
  const TYPE = { Positive: ['pos', '#1F7A4D'], Concern: ['neg', '#B42318'], Request: ['req', '#C58A00'], Reason: ['rsn', '#4101F7'] };
  const split = items => { const its = (items || []).filter(i => i), happy = its.filter(i => i.type === 'Positive' && !lines(i.note).length);
    return { happy, rows: its.filter(i => happy.indexOf(i) < 0).sort((a, b) => (b.type === 'Reason') - (a.type === 'Reason')) }; };
  function body(items, o) {
    const { happy, rows } = split(items); o = o || {};
    return `<div class="iv-bd${o.compact ? ' c' : ''}">` +
      (happy.length ? `<div><div class="iv-l">Happy with</div><div class="iv-hp">${happy.map(i => `<span><em>✓</em>${esc(i.theme)}</span>`).join('')}</div></div>` : '') +
      (rows.length ? `<div>${happy.length || o.label ? '<div class="iv-l">What they said</div>' : ''}${rows.map(i => { const t = TYPE[i.type] || TYPE.Concern, reason = i.type === 'Reason';
        return `<div class="iv-rw"><i style="background:${t[1]}"></i><div><b>${reason ? 'Reason for discontinuing' : esc(i.theme)}</b><span class="iv-t ${t[0]}">${esc(i.type)}</span>` +
          (reason ? `<ul class="iv-bl">${String(i.theme).split(';').map(x => x.trim()).filter(Boolean).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '') + noteHTML(i.note) + '</div></div>'; }).join('')}</div>` : '') + '</div>';
  }
  const REG = {};
  /* A recorded conversation as a card. info: { name, bits: [id, centre, age group, course, teacher] } for the image. actions: extra buttons. */
  function card(e, info, actions, cls) {
    REG[e.id] = { e, info: info || {} };
    const fu = e.follow ? `<div class="iv-fu"><b>Follow-up</b> · ${esc(e.follow.action)}${e.follow.owner ? ' · ' + esc(e.follow.owner) : ''}${e.follow.due ? ' · by ' + esc(dShort(e.follow.due)) : ''}</div>` : '';
    return `<article class="iv${cls ? ' ' + cls : ''}"><div class="iv-h"><b><i></i>${esc(title(e))}</b><small>${sentHTML(e)}</small></div>${body(e.items)}${fu}` +
      `<div class="iv-a"><button type="button" class="iv-btn pri" data-ivcopy="${esc(e.id)}">Copy as image</button>${actions || ''}</div></article>`;
  }

  /* ── The image ── */
  async function render(e, info) {
    const F = 'Onest, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', S = 2, W = 640, PAD = 32, CW = W - PAD * 2;
    try { await Promise.all(['500 14px Onest', '600 14px Onest', '700 14px Onest', '800 14px Onest', '400 14px Onest'].map(f => document.fonts.load(f))); } catch (x) {}
    const m = document.createElement('canvas').getContext('2d'), fn = (w, s) => `${w} ${s}px ${F}`;
    const ls = (c, v) => { try { c.letterSpacing = v; } catch (x) {} };
    const ops = []; let y = 0;
    const wrap = (text, w, f) => { m.font = f; ls(m, '0px'); const out = []; let cur = '';
      String(text).split(/\s+/).filter(Boolean).forEach(word => { const t = cur ? cur + ' ' + word : word; if (cur && m.measureText(t).width > w) { out.push(cur); cur = word; } else cur = t; }); if (cur) out.push(cur); return out; };
    const text = (x, by, s, f, col, sp, al) => ops.push(c => { c.font = f; c.fillStyle = col; c.textAlign = al || 'left'; ls(c, sp || '0px'); c.fillText(s, x, by); });
    const rr = (x, t, w, h, r, fill) => ops.push(c => { c.fillStyle = fill; c.beginPath(); c.roundRect ? c.roundRect(x, t, w, h, r) : c.rect(x, t, w, h); c.fill(); });
    const circle = (cx, cy, r, fill) => ops.push(c => { c.fillStyle = fill; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill(); });
    const hdr = { h: 0 }; ops.push(c => { const g = c.createLinearGradient(0, 0, W, hdr.h); g.addColorStop(0, '#F1E8FF'); g.addColorStop(1, '#FDEBF8'); c.fillStyle = g; c.fillRect(0, 0, W, hdr.h);
      const b = c.createLinearGradient(0, 0, W, 0); b.addColorStop(0, '#4101F7'); b.addColorStop(.5, '#6601FD'); b.addColorStop(1, '#DD30B1'); c.fillStyle = b; c.fillRect(0, 0, W, 5); });
    // header
    y = 5 + 28; text(PAD, y + 10, title(e).toUpperCase(), fn(800, 11), '#4101F7', '1.8px'); y += 10 + 34;
    wrap(info.name || e.name || '', CW, fn(700, 27)).forEach((l, i, a) => { text(PAD, y, l, fn(700, 27), '#01073C'); y += i < a.length - 1 ? 32 : 0; }); y += 24;
    const bits = (info.bits || []).filter(Boolean).join(' · ');
    if (bits) wrap(bits, CW, fn(500, 12.5)).forEach(l => { text(PAD, y, l, fn(500, 12.5), '#6A6488'); y += 18; }); else y -= 0;
    y += bits ? 14 : 4;
    // the sentence: rich text, wrapped
    const words = []; sentence(e).forEach(([t, b]) => t.split(/(\s+)/).forEach(w => { if (w) words.push({ w, b }); }));
    let line = [], lw = 0; const rows = [];
    words.forEach(o => { m.font = fn(o.b ? 700 : 500, 15); const w = m.measureText(o.w).width; if (lw + w > CW && !/^\s+$/.test(o.w) && line.length) { rows.push(line); line = []; lw = 0; } if (!(line.length === 0 && /^\s+$/.test(o.w))) { line.push({ ...o, width: w }); lw += w; } });
    if (line.length) rows.push(line);
    rows.forEach(r => { const yy = y; let x = PAD; r.forEach(o => { text(x, yy, o.w, fn(o.b ? 700 : 500, 15), o.b ? '#4101F7' : '#3B3550'); x += o.width; }); y += 23; });
    hdr.h = y + 4; y = hdr.h + 26;
    // body
    const { happy, rows: R } = split(e.items), label = s => { text(PAD, y + 10, s.toUpperCase(), fn(700, 10), '#6A6488', '1.4px'); y += 26; };
    if (happy.length) { label('Happy with'); let x = PAD, ry = y;
      happy.forEach(i => { m.font = fn(600, 13); const tw = m.measureText(i.theme).width, cw = 18 + 8 + tw + 18; if (x > PAD && x + cw - 18 > W - PAD) { x = PAD; ry += 28; }
        const cx = x, cy = ry + 9; circle(cx + 9, cy, 9, '#E5F4EC'); ops.push(c => { c.strokeStyle = '#1F7A4D'; c.lineWidth = 2; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(cx + 5, cy + .5); c.lineTo(cx + 8, cy + 3.5); c.lineTo(cx + 13, cy - 3); c.stroke(); });
        text(cx + 26, cy + 4.5, i.theme, fn(600, 13), '#01073C'); x += cw; });
      y = ry + 18 + 22; }
    if (R.length) { if (happy.length) label('What they said'); else y += 0;
      R.forEach((i, k) => { const t = TYPE[i.type] || TYPE.Concern, reason = i.type === 'Reason', head = reason ? 'Reason for discontinuing' : i.theme, TX = PAD + 22, TW = CW - 22;
        if (k > 0 || happy.length) { const yy = y; ops.push(c => { c.fillStyle = '#F1EDF9'; c.fillRect(PAD, yy, CW, 1); }); }
        y += 22; circle(PAD + 4, y - 5, 4, t[1]); text(TX, y, head, fn(700, 15.5), '#01073C');
        m.font = fn(700, 15.5); const hw = m.measureText(head).width; m.font = fn(700, 10); ls(m, '0.7px'); const tw = m.measureText(i.type.toUpperCase()).width, tg = { Positive: ['#E5F4EC', '#1F7A4D'], Concern: ['#FDECEB', '#B42318'], Request: ['#FBF1DC', '#8A5A00'], Reason: ['#EFE7F8', '#4101F7'] }[i.type] || ['#FDECEB', '#B42318'];
        const px = TX + hw + 10, py = y - 12; rr(px, py, tw + 14, 18, 6, tg[0]); text(px + 7, py + 12.5, i.type.toUpperCase(), fn(700, 10), tg[1], '0.7px'); y += 8;
        const pts = reason ? String(i.theme).split(';').map(x => x.trim()).filter(Boolean).concat(lines(i.note)) : lines(i.note), bullets = reason || pts.length > 1;
        pts.forEach(p => { wrap(p, TW - (bullets ? 16 : 0), fn(400, 14.5)).forEach((l, n) => { y += 22; if (bullets && n === 0) circle(TX + 4, y - 5, 2.5, '#4101F7'); text(TX + (bullets ? 16 : 0), y, l, fn(400, 14.5), '#4A4466'); }); y += bullets ? 5 : 0; });
        y += 16; }); }
    y += 6; text(W - PAD, y + 8, 'Artium Offline', fn(600, 11.5), '#8A83A6', '0px', 'right'); y += 34;
    const cv = document.createElement('canvas'); cv.width = W * S; cv.height = Math.ceil(y * S); const c = cv.getContext('2d'); c.scale(S, S); c.fillStyle = '#fff'; c.fillRect(0, 0, W, y);
    ops.forEach(op => op(c));
    return new Promise((res, rej) => cv.toBlob(b => b ? res(b) : rej(new Error('Could not make the image')), 'image/png'));
  }
  function toast(msg) { let t = document.getElementById('iv-toast'); if (!t) { t = document.createElement('div'); t.id = 'iv-toast'; document.body.appendChild(t); } t.textContent = msg; t.className = 'on'; clearTimeout(t._h); t._h = setTimeout(() => t.className = '', 2600); }
  async function copy(id, btn) {
    const r = REG[id]; if (!r) return; const old = btn.textContent; btn.disabled = true; btn.textContent = 'Making the image…';
    const p = render(r.e, r.info);
    try {
      if (!(navigator.clipboard && window.ClipboardItem)) throw new Error('no clipboard');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': p })]); toast('Copied. Paste it into WhatsApp.');
    } catch (x) {
      try { const b = await p, a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = (r.info.name || 'Learner') + ' - ' + title(r.e) + '.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast('Your browser could not copy it, so the image was saved instead.'); }
      catch (y) { toast('Could not make the image. Please try again.'); }
    }
    btn.disabled = false; btn.textContent = old;
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-ivcopy]'); if (b) copy(b.dataset.ivcopy, b); });

  /* ── Notes as bullets: every new line starts with a bullet ── */
  function bullets(ta, onchange) {
    const fire = () => { if (onchange) onchange(); };
    ta.addEventListener('focus', () => { if (!ta.value.trim()) { ta.value = '• '; ta.setSelectionRange(2, 2); fire(); } });
    ta.addEventListener('blur', () => { if (/^[•\-*]?\s*$/.test(ta.value)) { ta.value = ''; fire(); } });
    ta.addEventListener('keydown', ev => {
      if (ev.key !== 'Enter' || ev.shiftKey || ev.isComposing) return; ev.preventDefault();
      const v = ta.value, s = ta.selectionStart, en = ta.selectionEnd, st = v.lastIndexOf('\n', s - 1) + 1, ln = v.slice(st, s);
      if (/^•\s*$/.test(ln) && s === en) { const head = v.slice(0, st).replace(/\n$/, ''); ta.value = head + v.slice(s); ta.setSelectionRange(head.length, head.length); }
      else { const ins = '\n• '; ta.value = v.slice(0, s) + ins + v.slice(en); ta.setSelectionRange(s + ins.length, s + ins.length); }
      fire();
    });
    ta.addEventListener('input', fire);
  }

  const css = `
  .iv{background:#fff;border-radius:18px;overflow:hidden;margin-bottom:14px;box-shadow:0 0 0 1px #E6E0F3,0 18px 36px -24px rgba(1,7,60,.35);font-family:var(--body,'Onest',system-ui,sans-serif)}
  .iv.hl{box-shadow:0 0 0 2px #4101F7,0 18px 36px -24px rgba(65,1,247,.5)}
  .iv-h{padding:14px 18px 12px;background:linear-gradient(135deg,#F4EEFF,#FCEFFA)}
  .iv-h b{display:flex;align-items:center;gap:8px;font:700 15px var(--display,'Onest',sans-serif);color:#01073C}.iv-h b i{width:9px;height:9px;border-radius:3px;background:#4101F7;flex:none}
  .iv-h small{display:block;margin-top:4px;font:500 13px/1.5 var(--body,'Onest',sans-serif);color:#4A4466}.iv-h small b{display:inline;font:700 13px var(--body,'Onest',sans-serif);color:#4101F7}
  .iv-bd{padding:14px 18px 4px;display:flex;flex-direction:column;gap:14px}.iv-bd.c{padding:0;gap:10px}
  .iv-l{font:700 10px var(--body,'Onest',sans-serif);letter-spacing:.12em;text-transform:uppercase;color:#6A6488;margin-bottom:8px}
  .iv-hp{display:flex;flex-wrap:wrap;gap:8px 14px}.iv-hp span{display:inline-flex;align-items:center;gap:7px;font:600 13px var(--body,'Onest',sans-serif);color:#01073C}
  .iv-hp em{font-style:normal;width:18px;height:18px;border-radius:9px;background:#E5F4EC;color:#1F7A4D;display:grid;place-items:center;font:800 10px var(--body,'Onest',sans-serif);flex:none}
  .iv-rw{display:grid;grid-template-columns:8px 1fr;gap:12px;padding:12px 0;border-top:1px solid #F1EDF9}.iv-rw:first-child{border-top:0;padding-top:2px}
  .iv-rw>i{width:8px;height:8px;border-radius:50%;margin-top:6px}
  .iv-rw b{font:700 14px var(--body,'Onest',sans-serif);color:#01073C}
  .iv-t{display:inline-block;margin-left:8px;font:700 10px var(--body,'Onest',sans-serif);letter-spacing:.07em;text-transform:uppercase;border-radius:6px;padding:2px 7px;vertical-align:1px}
  .iv-t.pos{background:#E5F4EC;color:#1F7A4D}.iv-t.neg{background:#FDECEB;color:#B42318}.iv-t.req{background:#FBF1DC;color:#8A5A00}.iv-t.rsn{background:#EFE7F8;color:#4101F7}
  .iv-rw p{margin:5px 0 0;font:400 13.5px/1.55 var(--body,'Onest',sans-serif);color:#4A4466;overflow-wrap:anywhere}
  .iv-bl{margin:6px 0 0;padding-left:18px;font:400 13.5px/1.55 var(--body,'Onest',sans-serif);color:#4A4466;overflow-wrap:anywhere}.iv-bl li{margin-top:4px}.iv-bl li::marker{color:#4101F7}
  .iv-fu{margin:4px 18px 0;padding:10px 14px;border-radius:12px;background:#F7F3FF;font:500 13px/1.5 var(--body,'Onest',sans-serif);color:#01073C}
  .iv-a{display:flex;gap:8px;align-items:center;padding:12px 18px 16px}
  .iv-btn{border:0;cursor:pointer;font:700 12.5px var(--body,'Onest',sans-serif);border-radius:10px;padding:8px 13px;background:#F4F1F9;color:#4A4466}.iv-btn:hover{background:#EAE4F7}
  .iv-btn.pri{background:linear-gradient(135deg,#4101F7,#6601FD);color:#fff}.iv-btn:disabled{opacity:.6;cursor:default}
  .iv-bd.c .iv-rw{padding:8px 0;gap:9px}.iv-bd.c .iv-rw b,.iv-bd.c .iv-hp span{font-size:12.5px}.iv-bd.c .iv-rw p,.iv-bd.c .iv-bl{font-size:12.5px}.iv-bd.c .iv-l{margin-bottom:6px}
  #iv-toast{position:fixed;left:50%;bottom:28px;transform:translate(-50%,20px);opacity:0;pointer-events:none;background:#01073C;color:#fff;font:600 13px var(--body,'Onest',sans-serif);padding:11px 18px;border-radius:12px;z-index:9999;transition:all .25s}#iv-toast.on{opacity:1;transform:translate(-50%,0)}
  .ins textarea[data-k="note"]{line-height:1.5}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  window.InsView = { render, card, body, tidy, bullets, noteHTML, plain, lines, title, sentHTML };
})();
