/* Portfolio interactions: nav, filter, PDF/image lightbox, copy, reveal, gauges.
   Works with your current index.html as-is (no HTML edits needed). */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const isPdf = u => /\.pdf(?:[?#].*)?$/i.test(u);

  /* Styles for PDF thumbnails and the viewer (injected so style.css stays untouched) */
  const css = document.createElement('style');
  css.textContent = `
    .frame{position:relative}
    .pdf-thumb{width:100%;height:100%;border:0;background:#fff;pointer-events:none}
    .badge{position:absolute;top:10px;left:10px;z-index:1;background:var(--ink);color:var(--bg);font:500 .7rem var(--mono);padding:3px 8px;border-radius:var(--r)}
    .m-img{align-items:start!important}
    .viewer{width:100%;display:grid;gap:0}
    .viewer iframe{width:100%;height:75vh;border:0;background:#fff}
    .viewer img{width:100%;max-height:75vh;object-fit:contain}
    .v-bar{display:flex;gap:8px;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--line);background:var(--surface);font:.78rem var(--mono)}
    .v-bar button,.v-bar a{font:inherit;color:var(--ink);background:var(--chip);border:1px solid var(--chip-line);border-radius:var(--r);padding:5px 10px;cursor:pointer;text-decoration:none}
    .v-bar button:disabled{opacity:.4;cursor:default}
    @media (max-width:860px){.viewer iframe{height:60vh}}`;
  document.head.appendChild(css);

  /* ---------- 1. Mobile menu ---------- */
  const burger = $('#burger'), menu = $('#menu');
  const setMenu = open => { menu.classList.toggle('open', open); burger.setAttribute('aria-expanded', open); };
  burger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));

  /* ---------- 2. Project filter ---------- */
  const chips = $$('.chip'), cards = $$('.project'), empty = $('#empty');
  chips.forEach(chip => chip.addEventListener('click', () => {
    const f = chip.dataset.filter;
    chips.forEach(c => { const on = c === chip; c.classList.toggle('active', on); c.setAttribute('aria-selected', on); });
    let shown = 0;
    cards.forEach(card => {
      const match = f === 'all' || card.dataset.cat === f;
      card.classList.toggle('hide', !match);
      if (match) { shown++; card.classList.remove('fade'); void card.offsetWidth; card.classList.add('fade'); }
    });
    empty.hidden = shown > 0;
  }));

  /* ---------- 3. Card thumbnails: PNG/JPG, PDF, or several files ----------
     Files come from the optional data-files="a.png,b.pdf" attribute on the card,
     otherwise from the card's <img src>. Optional data-thumb="x.png" = preview image. */
  cards.forEach(card => {
    const frame = $('.frame', card), img = $('img', frame);
    const files = (card.dataset.files || img.getAttribute('src') || '').split(',').map(s => s.trim()).filter(Boolean);
    card._files = files;
    card.dataset.files = files.join(',');   // kept on the element so carousel clones inherit it
    const first = files[0];
    if (card.dataset.thumb) img.src = card.dataset.thumb;
    else if (first && isPdf(first)) {
      // Browsers can't show a PDF inside <img>, so use its first page as a live preview
      const f = document.createElement('iframe');
      f.className = 'pdf-thumb'; f.tabIndex = -1; f.loading = 'lazy';
      f.title = img.alt; f.src = first + '#toolbar=0&navpanes=0&view=FitH';
      img.replaceWith(f);
    } else {
      if (first) img.src = first;
      img.addEventListener('error', () => { img.style.display = 'none'; frame.classList.add('noimg'); });
    }
    const label = files.length > 1 ? files.length + ' files' : (isPdf(first || '') ? 'PDF' : '');
    if (label) { const b = document.createElement('span'); b.className = 'badge'; b.textContent = label; frame.appendChild(b); }
  });

  /* ---------- 4. Lightbox (PDF + multi-file viewer) ---------- */
  const modal = $('#modal'), holder = $('.m-img'), oldImg = $('#m-img');
  oldImg.style.display = 'none';
  const viewer = document.createElement('div');
  viewer.className = 'viewer';
  holder.appendChild(viewer);
  let lastFocus = null, files = [], idx = 0, title = '';

  const render = () => {
    const url = files[idx];
    viewer.replaceChildren();
    const bar = document.createElement('div'); bar.className = 'v-bar';
    const prev = document.createElement('button'); prev.textContent = 'Prev'; prev.disabled = idx === 0;
    const next = document.createElement('button'); next.textContent = 'Next'; next.disabled = idx === files.length - 1;
    const count = document.createElement('span'); count.textContent = (idx + 1) + ' / ' + files.length;
    const open = document.createElement('a'); open.href = url; open.target = '_blank'; open.rel = 'noopener'; open.textContent = 'Open in new tab';
    prev.onclick = () => { idx--; render(); };
    next.onclick = () => { idx++; render(); };
    if (files.length > 1) bar.append(prev, count, next);
    bar.append(open);
    let view;
    if (isPdf(url)) { view = document.createElement('iframe'); view.src = url + '#view=FitH'; view.title = title; }
    else { view = document.createElement('img'); view.src = url; view.alt = title; }
    viewer.append(bar, view);
  };
  const openModal = card => {
    files = (card.dataset.files || '').split(',').filter(Boolean); idx = 0;
    title = $('h3', card).textContent;
    $('#m-tag').textContent = $('.tag', card).textContent;
    $('#m-title').textContent = title;
    $('#m-loc').textContent = $('[data-loc]', card).textContent;
    $('#m-role').textContent = $('[data-role]', card).textContent;
    $('#m-scope').textContent = $('[data-scope]', card).textContent;
    render();
    lastFocus = document.activeElement;
    modal.hidden = false; document.body.style.overflow = 'hidden';
    $('#m-close').focus();
  };
  const closeModal = () => {
    modal.hidden = true; document.body.style.overflow = '';
    viewer.replaceChildren();
    if (lastFocus) lastFocus.focus();
  };
  $('#m-close').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => {
    if (modal.hidden) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowRight' && idx < files.length - 1) { idx++; render(); }
    if (e.key === 'ArrowLeft' && idx > 0) { idx--; render(); }
  });

  /* ---------- 5. Copy to clipboard + toast ---------- */
  const toast = $('#toast'); let timer;
  const showToast = msg => {
    toast.textContent = msg; toast.classList.add('show');
    clearTimeout(timer); timer = setTimeout(() => toast.classList.remove('show'), 1800);
  };
  const copyText = async text => {
    try { await navigator.clipboard.writeText(text); }
    catch { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }
  };
  $$('.copy').forEach(b => b.addEventListener('click', async () => { await copyText(b.dataset.copy); showToast('Copied!'); }));

  /* ---------- 6. Scroll reveal ---------- */
  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: .12 })
    : null;
  $$('.reveal').forEach(el => io ? io.observe(el) : el.classList.add('in'));

  /* ---------- Skill gauges ---------- */
  $$('.gauge').forEach(g => {
    for (let i = 0; i < 10; i++) { const s = document.createElement('i'); if (i < +g.dataset.level) s.className = 'on'; g.appendChild(s); }
  });

  /* ---------- 8. Infinite swipe carousel ----------
     Cards sit on an endless ring: drag/swipe, flick, use the arrows or the
     keyboard arrow keys and the feed keeps going in both directions. */
  const track = $('#grid'), prevB = $('#prev'), nextB = $('#next'), count = $('#count');
  const src = cards.slice();            // original cards act as templates
  src.forEach(c => c.remove());
  const PAD = 40, GAP = 20;
  let items = [], n = 0, step = 360, L = 360, off = -PAD, vel = 0, snap = null, vw = 800;
  let running = false, dragging = false, lastIdx = -1, currentFilter = 'all';
  const mod = (a, b) => ((a % b) + b) % b;
  const snapNear = o => Math.round((o + PAD) / step) * step - PAD;

  const draw = () => {
    const cw = step - GAP, mid = vw / 2;
    for (let j = 0; j < items.length; j++) {
      const x = mod(j * step - off + step, L) - step;   // wraps cards around the ring
      const d = (x + cw / 2 - mid) / step;              // 0 = card in the centre
      const ad = Math.abs(d), it = items[j];
      const rot = Math.max(-32, Math.min(32, -d * 14)); // side cards turn toward the centre
      const sc = 1 - Math.min(0.14, ad * 0.05);
      it.style.transform = 'translate3d(' + x + 'px,0,' + (-ad * 40) + 'px) rotateY(' + rot + 'deg) scale(' + sc + ')';
      it.style.opacity = Math.max(0, Math.min(1, Math.min(x + cw, vw - x) / (cw * 0.55)));   // soft fade at the edges
      it.style.zIndex = 100 - Math.round(ad * 10);
    }
    if (!n) { count.textContent = '0 / 0'; return; }
    const idx = mod(Math.round((off + PAD) / step), n);
    if (idx !== lastIdx) { lastIdx = idx; count.textContent = (idx + 1) + ' / ' + n; }
  };

  const tick = () => {
    if (!dragging) {
      if (Math.abs(vel) > 0.6) { off += vel; vel *= 0.93; snap = null; }      // momentum after a flick
      else {
        vel = 0;
        if (snap === null) snap = snapNear(off);
        const d = snap - off;
        off += d * 0.18;                                                       // ease into place
        if (Math.abs(d) < 0.4) { off = snap; snap = null; running = false; }
      }
    }
    draw();
    if (running) requestAnimationFrame(tick);
  };
  const kick = () => { if (!running) { running = true; requestAnimationFrame(tick); } };

  const build = () => {
    track.replaceChildren(); items = []; vw = track.clientWidth;
    const list = src.filter(c => currentFilter === 'all' || c.dataset.cat === currentFilter);
    n = list.length; vel = 0; snap = null; off = -PAD; lastIdx = -1;
    if (!n) { draw(); return; }
    const add = () => list.forEach(c => {
      const k = c.cloneNode(true); k.classList.remove('hide');
      track.appendChild(k); items.push(k);
    });
    add();
    step = items[0].offsetWidth + GAP;
    const reps = Math.max(1, Math.ceil((track.clientWidth + step) / (n * step)));
    for (let r = 1; r < reps; r++) add();                 // enough copies to fill the screen
    L = items.length * step;
    items.forEach(k => { k.style.height = 'auto'; });
    const H = Math.max(...items.map(k => k.offsetHeight));
    items.forEach(k => { k.style.height = H + 'px'; });   // equal-height cards
    track.style.height = (H + 44) + 'px';
    draw();
  };

  const go = d => { vel = 0; snap = (snap !== null ? snap : snapNear(off)) + d * step; kick(); };
  prevB.addEventListener('click', () => go(-1));
  nextB.addEventListener('click', () => go(1));
  track.tabIndex = 0;
  track.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  });
  chips.forEach(ch => ch.addEventListener('click', () => { currentFilter = ch.dataset.filter; build(); }));

  // Drag / swipe (mouse, touch and pen)
  let sx = 0, so = 0, lastO = 0, lastT = 0, moved = 0;
  track.addEventListener('pointerdown', e => {
    if (e.button !== 0 || !n) return;
    dragging = true; moved = 0; sx = e.clientX; so = off; lastO = off; lastT = performance.now(); vel = 0; snap = null; kick();
  });
  window.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - sx;
    moved = Math.max(moved, Math.abs(dx));
    off = so - dx; vel = off - lastO; lastO = off; lastT = performance.now();
    if (moved > 5) track.classList.add('drag');
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false; track.classList.remove('drag');
    if (performance.now() - lastT > 80) vel = 0;          // held still before letting go: no fling
    kick();
  };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  // A drag must not count as a click on "Inspect"; clones need delegated clicks
  track.addEventListener('click', e => { if (moved > 5) { e.preventDefault(); e.stopPropagation(); moved = 0; } }, true);
  track.addEventListener('click', e => {
    const b = e.target.closest('.inspect');
    if (b) openModal(b.closest('.project'));
  });
  track.addEventListener('error', e => {                  // missing image inside a cloned card
    if (e.target.tagName === 'IMG') { e.target.style.display = 'none'; e.target.parentElement.classList.add('noimg'); }
  }, true);
  track.addEventListener('dragstart', e => e.preventDefault());

  let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(build, 200); });
  build();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);

  /* ---------- 9. Floating island nav: stronger shadow once scrolled ---------- */
  const navEl = $('.nav');
  const onScroll = () => navEl.classList.toggle('scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- 10. Interactive portrait (3D tilt + parallax + glare) ---------- */
  const stage = $('.stage');
  if (stage && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const setVars = (v) => Object.entries(v).forEach(([k, val]) => stage.style.setProperty(k, val));
    stage.addEventListener('pointermove', e => {
      const r = stage.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width - .5) * 2;    // -1 .. 1
      const ny = ((e.clientY - r.top) / r.height - .5) * 2;
      setVars({ '--px': nx.toFixed(3), '--py': ny.toFixed(3), '--rx': (-ny * 10).toFixed(2) + 'deg', '--ry': (nx * 12).toFixed(2) + 'deg',
                '--gx': ((nx + 1) * 50).toFixed(1) + '%', '--gy': ((ny + 1) * 50).toFixed(1) + '%' });
    });
    stage.addEventListener('pointerleave', () => setVars({ '--px': 0, '--py': 0, '--rx': '0deg', '--ry': '0deg', '--gx': '50%', '--gy': '25%' }));
  }

  /* ---------- 11. 3D animated triangle-mosaic background ----------
     A wave-like grid of triangles, lit by a moving light and drawn in greys,
     so it works in both light and dark mode. Reacts to the mouse and to scrolling. */
  (() => {
    const cv = $('#bg'); if (!cv) return;
    const ctx = cv.getContext('2d');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const TILT = 0.85, SIN = Math.sin(TILT), COS = Math.cos(TILT), CAM = 2400;
    let W, H, S, cols, rows, WX, WY, WZ, SX, SY, mx = 0, my = 0, tx = 0, ty = 0;

    const size = () => {
      const dpr = window.innerWidth > 1400 ? 0.75 : 1;   // background is soft, so a lower resolution keeps it fast
      W = window.innerWidth; H = window.innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      S = Math.max(70, Math.min(150, W / 12));
      rows = 30; cols = Math.ceil(W / (S * 0.35)) + 4;
      const n = (cols + 1) * (rows + 1);
      WX = new Float32Array(n); WY = new Float32Array(n); WZ = new Float32Array(n);
      SX = new Float32Array(n); SY = new Float32Array(n);
      for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
        WX[j * (cols + 1) + i] = (i - cols / 2) * S;
        WY[j * (cols + 1) + i] = (j - rows / 2) * S;
      }
      draw(performance.now());
    };

    const draw = (now) => {
      const T = now * 0.001 + window.scrollY * 0.0012;       // scrolling also moves the terrain
      mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
      const edge = 'rgba(255,255,255,0.07)';
      const cx = W / 2 + mx * 30, cy = H * 0.5 + my * 20, AMP = S * 1.1, w1 = cols + 1;
      for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
        const k = j * w1 + i;
        const z = (Math.sin(i * 0.5 + T * 0.7) * Math.cos(j * 0.42 - T * 0.6) + 0.5 * Math.sin((i + j) * 0.33 + T * 0.4)) * AMP;
        WZ[k] = z;
        const sc = CAM / Math.max(500, CAM - WY[k] * SIN - z * COS);   // never divide by ~0
        SX[k] = cx + WX[k] * sc;
        SY[k] = cy + (WY[k] * COS - z * SIN) * sc;
      }
      let lx = Math.cos(T * 0.5) * 0.7 + mx * 0.5, ly = Math.sin(T * 0.4) * 0.6 + my * 0.5 - 0.3, lz = 0.5;
      const ll = Math.hypot(lx, ly, lz); lx /= ll; ly /= ll; lz /= ll;
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1; ctx.strokeStyle = edge;
      const tri = (a, b, c) => {
        // skip triangles that are completely off-screen (big speed-up)
        const x1 = SX[a], x2 = SX[b], x3 = SX[c], y1 = SY[a], y2 = SY[b], y3 = SY[c];
        if ((x1 < 0 && x2 < 0 && x3 < 0) || (x1 > W && x2 > W && x3 > W) || (y1 < 0 && y2 < 0 && y3 < 0) || (y1 > H && y2 > H && y3 > H)) return;
        const ux = WX[b] - WX[a], uy = WY[b] - WY[a], uz = WZ[b] - WZ[a];
        const vx = WX[c] - WX[a], vy = WY[c] - WY[a], vz = WZ[c] - WZ[a];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        const nl = Math.hypot(nx, ny, nz) || 1;
        if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
        const shade = Math.max(0, (nx * lx + ny * ly + nz * lz) / nl);
        // see-through white facets (alpha, not solid grey) so the stars show through the mosaic
        ctx.fillStyle = 'rgba(255,255,255,' + (0.012 + 0.11 * shade).toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(SX[a], SY[a]); ctx.lineTo(SX[b], SY[b]); ctx.lineTo(SX[c], SY[c]); ctx.closePath();
        ctx.fill(); ctx.stroke();
      };
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {   // far rows first
        const a = j * w1 + i, b = a + 1, c = a + w1, d = c + 1;
        tri(a, b, c); tri(b, d, c);
      }
    };

    let last = 0;   // ~30 fps is plenty for a slow background and saves battery
    const loop = (t) => { if (!document.hidden && t - last >= 32) { draw(t); last = t; } requestAnimationFrame(loop); };
    window.addEventListener('resize', size);
    window.addEventListener('pointermove', e => { tx = (e.clientX / W - 0.5) * 2; ty = (e.clientY / H - 0.5) * 2; }, { passive: true });
    size();
    if (reduce) {                       // no motion: draw once, redraw when the theme changes
      new MutationObserver(() => draw(0)).observe(document.documentElement, { attributes: true });
    } else requestAnimationFrame(loop);
  })();

  /* ---------- 12. Skills: logo fallback + cursor light on the bento cards ---------- */
  const logoFail = img => {
    if (!img.dataset.tried && /\.svg$/i.test(img.src)) { img.dataset.tried = 1; img.src = img.src.replace(/\.svg$/i, '.png'); }   // try .png if .svg is missing
    else img.parentElement.classList.add('nologo');                                                                             // else show letters
  };
  $$('.logo img').forEach(img => {
    img.addEventListener('error', () => logoFail(img));
    if (img.complete && img.naturalWidth === 0) logoFail(img);
  });
  $$('.beam').forEach(el => el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    el.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }));

  /* ---------- 13. Certificates: photo placeholder + enlarge popup ---------- */
  const certModal = $('#cert-modal'), cImg = $('#c-img');
  let certFocus = null;
  const certFail = img => img.parentElement.classList.add('noimg');
  $$('.cred-preview img').forEach(img => {
    img.addEventListener('error', () => certFail(img));
    if (img.complete && img.naturalWidth === 0) certFail(img);
  });
  const openCert = card => {
    const img = $('.cred-preview img', card);
    if (!img) return;                                   // card without a photo
    if (!img.complete || img.naturalWidth === 0) { showToast('Certificate photo coming soon'); return; }
    cImg.src = img.getAttribute('src'); cImg.alt = img.alt;
    $('#c-title').textContent = card.dataset.title;
    $('#c-sub').textContent = card.dataset.sub;
    certFocus = document.activeElement;
    certModal.hidden = false; document.body.style.overflow = 'hidden';
    $('#c-close').focus();
  };
  const closeCert = () => {
    certModal.hidden = true; document.body.style.overflow = '';
    if (certFocus) certFocus.focus();
  };
  $('#c-close').addEventListener('click', closeCert);
  certModal.addEventListener('click', e => { if (e.target === certModal) closeCert(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !certModal.hidden) closeCert(); });

  /* ---------- 14. Twinkling starfield (with parallax and the odd shooting star) ---------- */
  (() => {
    const cv = $('#stars'); if (!cv) return;
    const ctx = cv.getContext('2d');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W, H, stars = [], mx = 0, my = 0, tx = 0, ty = 0, shoot = null, nextShoot = 4000, last = 0;
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(300, Math.round(W * H / 6500));
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.pow(Math.random(), 3) * 1.4 + 0.3,       // mostly tiny, a few bigger
        z: 0.2 + Math.random() * 0.8,                    // depth: nearer stars move more
        p: Math.random() * 6.28, sp: 0.5 + Math.random() * 1.6, a: 0.35 + Math.random() * 0.65
      }));
      draw(0);
    };
    const draw = (now) => {
      ctx.clearRect(0, 0, W, H);
      mx += (tx - mx) * 0.04; my += (ty - my) * 0.04;
      const sy = window.scrollY;
      for (const s of stars) {
        const tw = 0.55 + 0.45 * Math.sin(now * 0.001 * s.sp + s.p);             // twinkle
        const x = s.x + mx * s.z * 16;
        const y = (((s.y - sy * s.z * 0.1 + my * s.z * 10) % H) + H) % H;       // slow scroll parallax, wraps around
        ctx.globalAlpha = s.a * tw;
        ctx.fillStyle = '#fff';
        if (s.r > 1.1) { ctx.shadowColor = 'rgba(255,255,255,.9)'; ctx.shadowBlur = 8; }
        ctx.beginPath(); ctx.arc(x, y, s.r, 0, 6.283); ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
      if (shoot) {                                                                 // shooting star
        const g = ctx.createLinearGradient(shoot.x, shoot.y, shoot.x - shoot.vx * 14, shoot.y - shoot.vy * 14);
        g.addColorStop(0, 'rgba(255,255,255,' + shoot.life + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(shoot.x, shoot.y); ctx.lineTo(shoot.x - shoot.vx * 14, shoot.y - shoot.vy * 14); ctx.stroke();
        shoot.x += shoot.vx; shoot.y += shoot.vy; shoot.life -= 0.012;
        if (shoot.life <= 0 || shoot.x < -100 || shoot.y > H + 100) shoot = null;
      }
    };
    const loop = (t) => {
      if (!document.hidden && t - last >= 32) {
        if (!shoot && t > nextShoot) {
          shoot = { x: W * (0.45 + Math.random() * 0.55), y: Math.random() * H * 0.35, vx: -(9 + Math.random() * 5), vy: 4 + Math.random() * 3, life: 1 };
          nextShoot = t + 7000 + Math.random() * 8000;
        }
        draw(t); last = t;
      }
      requestAnimationFrame(loop);
    };
    window.addEventListener('resize', size);
    window.addEventListener('pointermove', e => { tx = (e.clientX / W - 0.5) * 2; ty = (e.clientY / H - 0.5) * 2; }, { passive: true });
    size();
    if (!reduce) requestAnimationFrame(loop);
  })();


  /* ---------- 15. Certifications: open popup + sliding row ---------- */
  (() => {
    const track = $('#cred-track'); if (!track) return;
    // newest first: cards sort themselves by the year in each card, so new ones can be added anywhere
    const yr = c => parseInt(($('.cred-year', c) || {}).textContent, 10) || 0;
    const cards = $$('.cred', track).sort((a, b) => yr(b) - yr(a));
    cards.forEach(c => track.appendChild(c));
    const nav = $('#cred-nav'), prevB = $('#cred-prev'), nextB = $('#cred-next'), count = $('#cred-count');
    track.style.setProperty('--n', cards.length);                       // lets the CSS share the width between 1-3 cards
    count.textContent = String(cards.length).padStart(2, '0') + ' credentials';

    cards.forEach(card => {                                             // click / Enter opens the certificate popup
      if (!card.dataset.img) return;
      card.addEventListener('click', () => openCert(card));
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCert(card); } });
    });

    const step = () => (cards[0] ? cards[0].offsetWidth : 300) + 24;
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      nav.hidden = max < 4;                                             // arrows only when there is more to slide to
      prevB.disabled = track.scrollLeft < 4;
      nextB.disabled = track.scrollLeft > max - 4;
    };
    prevB.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    nextB.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
    track.addEventListener('scroll', update, { passive: true });
    track.addEventListener('keydown', e => {
      if (e.target !== track) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); track.scrollBy({ left: step(), behavior: 'smooth' }); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); track.scrollBy({ left: -step(), behavior: 'smooth' }); }
    });
    window.addEventListener('resize', update);
    if ('ResizeObserver' in window) new ResizeObserver(update).observe(track);

    // click-and-drag sliding for mouse users (touch uses the browser's own swipe)
    let down = false, sx = 0, sl = 0, moved = 0;
    track.addEventListener('pointerdown', e => {
      moved = 0;
      if (e.pointerType !== 'mouse' || e.button !== 0 || track.scrollWidth - track.clientWidth < 4) return;
      down = true; sx = e.clientX; sl = track.scrollLeft;
    });
    window.addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx));
      if (moved > 5) { track.classList.add('drag'); track.scrollLeft = sl - dx; }
    });
    window.addEventListener('pointerup', () => { if (down) { down = false; track.classList.remove('drag'); } });
    track.addEventListener('click', e => { if (moved > 5) { e.preventDefault(); e.stopPropagation(); moved = 0; } }, true);
    track.addEventListener('dragstart', e => e.preventDefault());
    update();
  })();
})();
