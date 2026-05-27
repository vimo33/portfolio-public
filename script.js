/* =========================================================
   Vikas Mohan — Portfolio
   ========================================================= */

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Header scroll + active link ------------ */
const header = document.getElementById('siteHeader');
const navLinks = document.querySelectorAll('.nav-desktop a[data-section]');
const sections = ['method','work','timeline','about','contact']
  .map(id => document.getElementById(id))
  .filter(Boolean);

function onScroll(){
  const y = window.scrollY;
  header.classList.toggle('scrolled', y > 30);

  // active link
  let activeId = null;
  const mid = y + window.innerHeight*0.35;
  for (const s of sections){
    if (s.offsetTop <= mid && (s.offsetTop + s.offsetHeight) > mid){
      activeId = s.id; break;
    }
  }
  navLinks.forEach(a => a.classList.toggle('active', a.dataset.section === activeId));
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- Mobile menu ------------ */
const menuBtn = document.getElementById('menuBtn');
const closeMenu = document.getElementById('closeMenu');
const menuOverlay = document.getElementById('menuOverlay');
function setMenu(open){
  if (!menuOverlay) return;
  menuOverlay.classList.toggle('open', open);
  menuOverlay.setAttribute('aria-hidden', String(!open));
  menuBtn?.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
}
menuBtn?.addEventListener('click', () => setMenu(true));
closeMenu?.addEventListener('click', () => setMenu(false));
menuOverlay?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));

/* ---------- Smooth scroll on internal links ------------ */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href').slice(1);
    if (!id) return;
    const tgt = document.getElementById(id);
    if (!tgt) return;
    e.preventDefault();
    window.scrollTo({ top: tgt.getBoundingClientRect().top + window.scrollY - 16, behavior: prefersReduced ? 'auto' : 'smooth' });
  });
});

/* ---------- Hero orb parallax (mouse + scroll) ------------ */
const orbStage = document.getElementById('orbStage');
if (orbStage && !prefersReduced){
  let raf = null;
  let mx = 0, my = 0, sy = 0, rot = 0;
  let tmx = 0, tmy = 0, trot = 0;
  window.addEventListener('mousemove', (e) => {
    const cx = window.innerWidth/2, cy = window.innerHeight/2;
    tmx = (e.clientX - cx) / cx * 14;
    tmy = (e.clientY - cy) / cy * 14;
    trot = (e.clientX - cx) / cx * 2;
    if (!raf) raf = requestAnimationFrame(apply);
  });
  window.addEventListener('scroll', () => {
    sy = Math.min(window.scrollY * 0.18, 180);
    if (!raf) raf = requestAnimationFrame(apply);
  }, { passive: true });
  function apply(){
    // ease toward target for smooth parallax
    mx += (tmx - mx) * 0.08;
    my += (tmy - my) * 0.08;
    rot += (trot - rot) * 0.08;
    orbStage.style.transform = `translate3d(${mx.toFixed(2)}px, ${(my - sy).toFixed(2)}px, 0) rotate(${rot.toFixed(3)}deg)`;
    orbStage.style.opacity = Math.max(0, 1 - window.scrollY / 900);
    if (Math.abs(tmx - mx) > 0.05 || Math.abs(tmy - my) > 0.05 || Math.abs(trot - rot) > 0.005){
      raf = requestAnimationFrame(apply);
    } else {
      raf = null;
    }
  }
}

/* ---------- Hero orb: orbiting planets, particles, stars ----- */
(function orbLife(){
  if (!orbStage) return;

  // 1) Twinkling background stars
  const stars = document.getElementById('orbStars');
  if (stars){
    const N = 28;
    for (let i = 0; i < N; i++){
      // place randomly within the viewBox but skip the inner eclipse area
      let r, theta;
      do {
        r = 60 + Math.random() * 160;
        theta = Math.random() * Math.PI * 2;
      } while (r < 90); // keep clear of the ring
      const x = Math.cos(theta) * r;
      const y = Math.sin(theta) * r;
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', x.toFixed(1));
      c.setAttribute('cy', y.toFixed(1));
      c.setAttribute('r', (Math.random() * 0.9 + 0.3).toFixed(2));
      c.setAttribute('class', 'orb-star');
      c.style.animationDelay = (Math.random() * 4).toFixed(2) + 's';
      c.style.animationDuration = (3 + Math.random() * 4).toFixed(2) + 's';
      stars.appendChild(c);
    }
  }

  // 2) Orbiting planets along their respective ellipses
  if (!prefersReduced){
    const orbits = [
      { id: 'planet0', trail: 'trail0', rx: 190, ry: 55,  speed: 0.045, phase: 0.0 },
      { id: 'planet1', trail: 'trail1', rx: 170, ry: 80,  speed: -0.07, phase: 1.8 },
      { id: 'planet2', trail: 'trail2', rx: 195, ry: 35,  speed: 0.06,  phase: 3.2 },
      { id: 'planet3', trail: null,     rx: 155, ry: 100, speed: -0.025, phase: 4.5 },
    ];
    const refs = orbits.map(o => ({
      o,
      el: document.getElementById(o.id),
      tr: o.trail ? document.getElementById(o.trail) : null
    })).filter(r => r.el);

    const t0 = performance.now();
    function tick(){
      const t = (performance.now() - t0) * 0.001;
      for (const r of refs){
        const a = t * r.o.speed * Math.PI * 2 + r.o.phase;
        const x = r.o.rx * Math.cos(a);
        const y = r.o.ry * Math.sin(a);
        r.el.setAttribute('cx', x.toFixed(2));
        r.el.setAttribute('cy', y.toFixed(2));
        if (r.tr){
          // Trail trails slightly behind
          const at = a - Math.sign(r.o.speed) * 0.18;
          const tx = r.o.rx * Math.cos(at);
          const ty = r.o.ry * Math.sin(at);
          r.tr.setAttribute('cx', tx.toFixed(2));
          r.tr.setAttribute('cy', ty.toFixed(2));
        }
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // 3) Drifting particles (sparks emitted outward from the ring)
  if (!prefersReduced){
    const layer = document.getElementById('orbParticles');
    if (layer){
      const max = 9;
      const pool = [];
      for (let i = 0; i < max; i++){
        const d = document.createElement('div');
        d.className = 'pcl';
        layer.appendChild(d);
        pool.push({ el: d, alive: false });
      }
      function spawn(p){
        const rect = layer.getBoundingClientRect();
        if (!rect.width) return;
        // start near the ring (~32% of width from center)
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const startR = rect.width * (0.30 + Math.random() * 0.04);
        const endR   = rect.width * (0.46 + Math.random() * 0.16);
        const theta = Math.random() * Math.PI * 2;
        const sx = cx + Math.cos(theta) * startR;
        const sy = cy + Math.sin(theta) * startR;
        const ex = cx + Math.cos(theta) * endR;
        const ey = cy + Math.sin(theta) * endR;
        const dur = 2200 + Math.random() * 2600;
        const size = 1.4 + Math.random() * 1.6;
        p.el.style.width = p.el.style.height = size.toFixed(2) + 'px';
        p.el.style.left = sx + 'px';
        p.el.style.top  = sy + 'px';
        p.el.style.opacity = '0';
        p.el.style.transform = 'translate3d(-50%,-50%,0)';
        p.el.style.transition = 'none';
        p.alive = true;
        // force reflow
        void p.el.offsetWidth;
        p.el.style.transition = `transform ${dur}ms cubic-bezier(.2,.7,.2,1), opacity ${dur}ms ease-out`;
        p.el.style.transform = `translate3d(calc(-50% + ${ex-sx}px), calc(-50% + ${ey-sy}px), 0)`;
        p.el.style.opacity = '0.85';
        setTimeout(() => {
          p.el.style.opacity = '0';
        }, dur * 0.55);
        setTimeout(() => { p.alive = false; }, dur + 100);
      }
      function loop(){
        for (const p of pool){
          if (!p.alive && Math.random() < 0.025) spawn(p);
        }
        setTimeout(loop, 220);
      }
      loop();
    }
  }
})();

/* ---------- Word-by-word hero headline reveal ------------ */
(function heroWords(){
  const h1 = document.querySelector('.hero-copy h1');
  if (!h1) return;
  // Split children carefully — preserve <span class="accent"> wrappers
  const split = (node) => {
    const out = [];
    node.childNodes.forEach((n) => {
      if (n.nodeType === Node.TEXT_NODE){
        n.textContent.split(/(\s+)/).forEach((tok) => {
          if (!tok) return;
          if (/^\s+$/.test(tok)) out.push(document.createTextNode(tok));
          else {
            const s = document.createElement('span');
            s.className = 'w';
            s.textContent = tok;
            out.push(s);
          }
        });
      } else if (n.nodeType === Node.ELEMENT_NODE){
        // wrap inner text in word spans, keep tag for styling
        const inner = split(n);
        const wrapper = n.cloneNode(false);
        inner.forEach(c => wrapper.appendChild(c));
        out.push(wrapper);
      }
    });
    return out;
  };
  const newNodes = split(h1);
  h1.innerHTML = '';
  newNodes.forEach(n => h1.appendChild(n));

  // Stagger via inline transition-delay
  const words = h1.querySelectorAll('.w');
  words.forEach((w, i) => { w.style.transitionDelay = `${0.10 + i*0.06}s`; });
  // Reveal after a short beat (after splash lifts)
  setTimeout(() => h1.classList.add('in'), 350);
})();

/* ---------- Magnetic CTA ------------ */
(function magnetic(){
  if (prefersReduced) return;
  document.querySelectorAll('.btn.primary').forEach(btn => {
    const strength = 8;
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      const cx = r.left + r.width/2, cy = r.top + r.height/2;
      const dx = (e.clientX - cx) / (r.width/2);
      const dy = (e.clientY - cy) / (r.height/2);
      btn.style.transform = `translate(${dx*strength}px, ${dy*strength}px)`;
      btn.style.setProperty('--mx', `${((e.clientX - r.left)/r.width)*100}%`);
      btn.style.setProperty('--my', `${((e.clientY - r.top)/r.height)*100}%`);
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });
})();

/* ---------- Custom cursor ------------ */
(function customCursor(){
  if (prefersReduced) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;
  if (window.innerWidth < 1025) return;

  const dot = document.createElement('div'); dot.className = 'cursor-dot';
  const ring = document.createElement('div'); ring.className = 'cursor-ring';
  document.body.appendChild(dot); document.body.appendChild(ring);
  document.documentElement.classList.add('has-custom-cursor');

  let dx = -50, dy = -50, rx = -50, ry = -50;
  window.addEventListener('mousemove', (e) => { dx = e.clientX; dy = e.clientY; });
  function loop(){
    rx += (dx - rx) * 0.18;
    ry += (dy - ry) * 0.18;
    dot.style.transform = `translate3d(${dx}px, ${dy}px, 0) translate(-50%,-50%)`;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%,-50%)`;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Hover state on interactive elements
  const hoverSel = 'a, button, .project-row, .collab-card, .artifact-card, .btn';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(hoverSel)) ring.classList.add('hover');
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(hoverSel)) ring.classList.remove('hover');
  });
  document.addEventListener('mousedown', () => ring.classList.add('click'));
  document.addEventListener('mouseup', () => ring.classList.remove('click'));
})();

/* ---------- Page splash + transitions ------------ */
(function pageTransitions(){
  // Splash lift on load
  const splash = document.createElement('div');
  splash.className = 'page-splash';
  splash.innerHTML = '<div class="pt-orb"></div>';
  document.body.appendChild(splash);
  window.addEventListener('load', () => {
    setTimeout(() => splash.classList.add('lift'), 220);
    setTimeout(() => splash.remove(), 1200);
  });
  // Belt-and-braces: also fire after a max of 800ms even if load is slow
  setTimeout(() => splash.classList.add('lift'), 1100);

  // Transition overlay on internal navigation
  if (prefersReduced) return;
  const overlay = document.createElement('div');
  overlay.className = 'page-transition';
  overlay.innerHTML = '<div class="pt-orb"></div>';
  document.body.appendChild(overlay);

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    // only intercept internal navigations to .html
    if (!/\.html(\?|#|$)/.test(href)) return;
    if (a.target === '_blank') return;
    if (href.startsWith('http') && !href.includes(location.host)) return;

    e.preventDefault();
    overlay.classList.add('entering');
    setTimeout(() => { window.location.href = href; }, 480);
  });
})();

/* ---------- Reveal on scroll ------------ */
const io = new IntersectionObserver((entries) => {
  for (const e of entries){
    if (e.isIntersecting){
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  }
}, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

/* =========================================================
   METHOD — 3D helix spiral
   ========================================================= */
function buildMethod(){
  const svg = document.getElementById('methodSvg');
  if (!svg) return;
  const backG = document.getElementById('methodBack');
  const frontG = document.getElementById('methodFront');
  const anchorG = document.getElementById('methodAnchors');
  const connG = document.getElementById('methodConnectors');
  const travelerG = document.getElementById('methodTraveler');
  const labels = document.getElementById('methodLabels');

  const steps = window.METHOD_STEPS;
  const N = steps.length; // 7 turns
  // Geometry inside viewBox 0 0 400 760
  const cx = 198;
  const rx = 108;
  const B = 38;             // bobbing amplitude
  const topY = 50;
  const totalY = 640;       // vertical descent over N turns

  // Helix point at turn-parameter t (t=0 at top, t=N at bottom)
  function pt(t){
    const a = 2 * Math.PI * t;
    return {
      x: cx + rx * Math.cos(a),
      y: topY + (t / N) * totalY - B * Math.sin(a),
      a
    };
  }

  function arcPath(t0, t1, steps=42){
    let d = '';
    for (let s = 0; s <= steps; s++){
      const t = t0 + (t1 - t0) * (s / steps);
      const p = pt(t);
      d += (s === 0 ? 'M ' : ' L ') + p.x.toFixed(2) + ' ' + p.y.toFixed(2);
    }
    return d;
  }

  // Build per-loop back and front arcs.
  // Loop i covers t in [i, i+1]:
  //   - back half: t in [i, i+0.5]  (top arc, behind axis)
  //   - front half: t in [i+0.5, i+1] (bottom arc, in front)
  // We draw all backs first, then all fronts (so fronts paint over backs of below loops).
  const arcs = []; // {el, kind, idx}
  for (let i = 0; i < N; i++){
    const back = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    back.setAttribute('class', 'spiral-arc back');
    back.setAttribute('d', arcPath(i, i + 0.5));
    back.dataset.idx = i;
    backG.appendChild(back);
    arcs.push({ el: back, kind: 'back', idx: i });
  }
  for (let i = 0; i < N; i++){
    const front = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    front.setAttribute('class', 'spiral-arc front');
    front.setAttribute('d', arcPath(i + 0.5, i + 1));
    front.dataset.idx = i;
    frontG.appendChild(front);
    arcs.push({ el: front, kind: 'front', idx: i });
  }

  // Anchor + connector + label per step
  // Anchor is at the bottom-front of each loop (most visible point), t = i + 0.75
  const labelRailX = 360;     // x position where connector ends (just inside labels column edge)
  const anchorPts = [];
  const anchorEls = [];
  const connEls = [];
  const stepEls = [];

  for (let i = 0; i < N; i++){
    const tA = i + 0.75;
    const p = pt(tA);
    anchorPts.push(p);

    // anchor dot
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', p.x.toFixed(2));
    dot.setAttribute('cy', p.y.toFixed(2));
    dot.setAttribute('r', 3.2);
    dot.setAttribute('class', 'spiral-anchor');
    dot.dataset.idx = i;
    anchorG.appendChild(dot);
    anchorEls.push(dot);

    // connector: from anchor (cx, p.y + B) gently curves out to the right rail
    // Use a small curve so it doesn't look like a hard L
    const sx = p.x, sy = p.y;
    const ex = labelRailX, ey = p.y;
    const cxC = (sx + ex) / 2 + 20;
    const cyC = sy;
    const d = `M ${sx.toFixed(2)} ${sy.toFixed(2)} Q ${cxC.toFixed(2)} ${cyC.toFixed(2)} ${ex.toFixed(2)} ${ey.toFixed(2)}`;
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    c.setAttribute('class', 'spiral-connector');
    c.setAttribute('d', d);
    c.dataset.idx = i;
    connG.appendChild(c);
    connEls.push(c);

    // label row positioned by absolute top (in % of vis height)
    const visH = 760;
    const yPct = (p.y / visH) * 100;
    const div = document.createElement('div');
    div.className = 'm-step';
    div.dataset.idx = i;
    div.style.top = `calc(${yPct}% - 12px)`;
    div.innerHTML = `<span class="num">${steps[i].num}</span><span class="ttl">${steps[i].title}</span>`;
    labels.appendChild(div);
    stepEls.push(div);
  }

  // Travelling dot orbits the active loop continuously
  const traveler = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  traveler.setAttribute('r', 2.6);
  traveler.setAttribute('class', 'spiral-traveler');
  travelerG.appendChild(traveler);

  let activeIdx = -1;

  function setActive(idx){
    if (idx === activeIdx) return;
    activeIdx = idx;
    arcs.forEach(a => {
      a.el.classList.remove('active', 'near');
      if (a.idx === idx) a.el.classList.add('active');
      else if (Math.abs(a.idx - idx) === 1) a.el.classList.add('near');
    });
    anchorEls.forEach((el, i) => {
      el.classList.remove('active', 'near');
      if (i === idx) el.classList.add('active');
      else if (Math.abs(i - idx) === 1) el.classList.add('near');
    });
    connEls.forEach((el, i) => {
      el.classList.remove('active', 'near');
      if (i === idx) el.classList.add('active');
      else if (Math.abs(i - idx) === 1) el.classList.add('near');
    });
    stepEls.forEach((el, i) => {
      el.classList.remove('active', 'near');
      if (i === idx) el.classList.add('active');
      else if (Math.abs(i - idx) === 1) el.classList.add('near');
    });
    if (idx >= 0) traveler.classList.add('on');
    else traveler.classList.remove('on');
  }

  // Scroll-driven active step.
  // The section is a tall scroll track (see CSS .method-diagram height) with the
  // spiral pinned (sticky). We map the *pinned scroll distance* evenly across the
  // 7 steps, so each step holds for a comfortable, reading-paced chunk of scroll
  // instead of flicking past in a fraction of a viewport.
  const section = document.getElementById('method');
  function update(){
    if (!section) return;
    const r = section.getBoundingClientRect();
    const vh = window.innerHeight;
    // Distance the pinned spiral travels while the section passes the viewport.
    const total = r.height - vh;
    // How far we've scrolled into the section (0 when its top hits the viewport top).
    const scrolled = -r.top;
    let progress = total > 0 ? scrolled / total : 0;
    progress = Math.max(0, Math.min(1, progress));
    // Even buckets across N steps; 0.9999 keeps the last step reachable at the bottom.
    const idx = Math.max(0, Math.min(N - 1, Math.floor(progress * N * 0.9999)));
    setActive(idx);
  }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();

  // Animate the traveler around the active loop
  if (!prefersReduced){
    const t0 = performance.now();
    function loop(){
      if (activeIdx >= 0){
        const phase = ((performance.now() - t0) * 0.0006) % 1; // 1 revolution / ~1.67s
        const tT = activeIdx + phase;
        const p = pt(tT);
        traveler.setAttribute('cx', p.x.toFixed(2));
        traveler.setAttribute('cy', p.y.toFixed(2));
        // Slightly dim on back half
        const opacity = Math.sin(p.a) < 0 ? 1 : 0.5;
        traveler.style.opacity = String(opacity);
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }
}
buildMethod();

/* =========================================================
   PROJECTS — selected work rows
   ========================================================= */
function buildProjects(){
  const list = document.getElementById('projectList');
  if (!list) return;

  list.innerHTML = window.PROJECTS.map((p, i) => `
    <a class="project-row reveal" href="${p.href}" data-delay="${Math.min(i, 5)}">
      <span class="idx">${p.n}</span>
      <div class="meta">
        <h3 class="ttl">${p.title}</h3>
        <div class="sub">${p.sub}${p.tag ? `<span class="row-tag">${p.tag}</span>` : ''}</div>
      </div>
      <div class="thumb">
        ${projectArt(p.art)}
      </div>
      <div class="arrow">
        <svg viewBox="0 0 40 12" fill="none" aria-hidden="true"><path d="M0 6h36M30 1l6 5-6 5" stroke="currentColor" stroke-width="1"/></svg>
      </div>
    </a>
  `).join('');

  // observe newly created reveal nodes
  list.querySelectorAll('.reveal').forEach(el => io.observe(el));
}

function projectArt(kind){
  switch(kind){
    case 'portal':
      return `<div class="thumb-art"><svg viewBox="0 0 200 110" fill="none">
        <defs>
          <radialGradient id="pa1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#000"/>
            <stop offset="62%" stop-color="#000"/>
            <stop offset="70%" stop-color="#E3C982" stop-opacity="0.9"/>
            <stop offset="85%" stop-color="#7a5d2a" stop-opacity="0.4"/>
            <stop offset="100%" stop-color="transparent"/>
          </radialGradient>
        </defs>
        <rect width="200" height="110" fill="#0a0b0d"/>
        <circle cx="100" cy="62" r="22" fill="url(#pa1)"/>
        <path d="M52 100 L100 64 L148 100 Z" stroke="rgba(255,235,200,0.15)" fill="none" stroke-width="0.5"/>
      </svg></div>`;
    case 'brain':
      return `<div class="thumb-art"><svg viewBox="0 0 200 110" fill="none">
        <rect width="200" height="110" fill="#0a0b0d"/>
        <g stroke="rgba(227,201,130,0.5)" fill="none" stroke-width="0.6">
          <circle cx="100" cy="55" r="30"/><circle cx="100" cy="55" r="20"/><circle cx="100" cy="55" r="12"/>
          <line x1="20" y1="55" x2="80" y2="55"/><line x1="180" y1="55" x2="120" y2="55"/>
          <line x1="100" y1="10" x2="100" y2="30"/><line x1="100" y1="100" x2="100" y2="80"/>
        </g>
        <circle cx="100" cy="55" r="2.5" fill="#FCEFC9"/>
      </svg></div>`;
    case 'globe':
      return `<div class="thumb-art"><svg viewBox="0 0 200 110" fill="none">
        <rect width="200" height="110" fill="#0a0b0d"/>
        <g stroke="rgba(120,180,220,0.4)" fill="none" stroke-width="0.6">
          <circle cx="100" cy="55" r="34"/>
          <ellipse cx="100" cy="55" rx="34" ry="14"/>
          <ellipse cx="100" cy="55" rx="20" ry="34"/>
          <ellipse cx="100" cy="55" rx="10" ry="34"/>
          <path d="M66 55h68M100 21v68"/>
        </g>
      </svg></div>`;
    case 'network':
      return `<div class="thumb-art"><svg viewBox="0 0 200 110" fill="none">
        <rect width="200" height="110" fill="#0a0b0d"/>
        <g stroke="rgba(227,201,130,0.4)" fill="none">
          <path d="M20 90 Q60 30, 100 55 T180 30"/>
          <path d="M20 30 Q60 80, 100 55 T180 80"/>
        </g>
        <g fill="#FCEFC9">
          <circle cx="20" cy="90" r="2"/><circle cx="180" cy="30" r="2"/>
          <circle cx="20" cy="30" r="2"/><circle cx="180" cy="80" r="2"/>
          <circle cx="100" cy="55" r="2.5"/>
        </g>
      </svg></div>`;
    case 'helios':
      return `<div class="thumb-art" style="background:radial-gradient(60% 70% at 50% 60%, rgba(216,100,60,0.25), transparent 60%), linear-gradient(180deg,#15100c, #08090b);"><svg viewBox="0 0 200 110" fill="none">
        <defs>
          <radialGradient id="he1" cx="50%" cy="55%" r="45%">
            <stop offset="0%" stop-color="#000"/>
            <stop offset="65%" stop-color="#000"/>
            <stop offset="72%" stop-color="#E89060" stop-opacity="0.95"/>
            <stop offset="100%" stop-color="transparent"/>
          </radialGradient>
        </defs>
        <circle cx="100" cy="58" r="26" fill="url(#he1)"/>
        <text x="100" y="62" text-anchor="middle" fill="rgba(255,220,180,0.7)" font-family="Bricolage Grotesque" font-size="11">Helios</text>
      </svg></div>`;
    case 'inventory':
      return `<div class="thumb-art"><svg viewBox="0 0 200 110" fill="none">
        <rect width="200" height="110" fill="#0a0b0d"/>
        <g stroke="rgba(255,255,255,0.18)" fill="none" stroke-width="0.6">
          <rect x="20" y="20" width="38" height="70"/>
          <rect x="68" y="20" width="38" height="70"/>
          <rect x="116" y="20" width="64" height="70"/>
        </g>
        <g fill="rgba(227,201,130,0.4)">
          <rect x="124" y="32" width="48" height="8"/>
          <rect x="124" y="48" width="32" height="6"/>
          <rect x="124" y="62" width="40" height="6"/>
          <rect x="76" y="36" width="22" height="22"/>
        </g>
      </svg></div>`;
    case 'led':
      return `<div class="thumb-art"><svg viewBox="0 0 200 110" fill="none">
        <rect width="200" height="110" fill="#0a0b0d"/>
        <g stroke-linecap="round">
          <line x1="40"  y1="22" x2="40"  y2="88" stroke="rgba(227,201,130,0.85)" stroke-width="3"/>
          <line x1="64"  y1="22" x2="64"  y2="88" stroke="rgba(227,201,130,0.32)" stroke-width="3"/>
          <line x1="88"  y1="22" x2="88"  y2="88" stroke="rgba(255,238,195,1)"    stroke-width="3"/>
          <line x1="112" y1="22" x2="112" y2="88" stroke="rgba(227,201,130,0.5)"  stroke-width="3"/>
          <line x1="136" y1="22" x2="136" y2="88" stroke="rgba(227,201,130,0.24)" stroke-width="3"/>
          <line x1="160" y1="22" x2="160" y2="88" stroke="rgba(227,201,130,0.7)"  stroke-width="3"/>
        </g>
        <g fill="#FCEFC9"><circle cx="88" cy="40" r="2"/><circle cx="160" cy="64" r="1.6"/><circle cx="40" cy="72" r="1.6"/></g>
      </svg></div>`;
    case 'mesh':
      return `<div class="thumb-art"><svg viewBox="0 0 200 110" fill="none">
        <rect width="200" height="110" fill="#0a0b0d"/>
        <g stroke="rgba(227,201,130,0.4)" stroke-width="0.6">
          <line x1="100" y1="55" x2="60" y2="34"/><line x1="100" y1="55" x2="62" y2="78"/>
          <line x1="100" y1="55" x2="142" y2="38"/><line x1="100" y1="55" x2="146" y2="74"/>
          <line x1="100" y1="55" x2="100" y2="22"/><line x1="60" y1="34" x2="62" y2="78"/>
        </g>
        <g fill="#FCEFC9">
          <circle cx="100" cy="55" r="3"/>
          <circle cx="60" cy="34" r="2"/><circle cx="62" cy="78" r="2"/>
          <circle cx="142" cy="38" r="2"/><circle cx="146" cy="74" r="2"/><circle cx="100" cy="22" r="1.6"/>
        </g>
      </svg></div>`;
    case 'vine':
      return `<div class="thumb-art"><svg viewBox="0 0 200 110" fill="none">
        <rect width="200" height="110" fill="#0a0b0d"/>
        <path d="M40 92 C 70 80, 70 50, 100 44 C 130 38, 132 24, 162 18" stroke="rgba(227,201,130,0.55)" stroke-width="1" fill="none"/>
        <g stroke="rgba(120,200,150,0.4)" stroke-width="0.8" fill="none">
          <path d="M70 66 q -12 -6 -18 -1"/><path d="M100 44 q 12 -7 18 -2"/>
        </g>
        <g fill="rgba(227,201,130,0.55)">
          <circle cx="70" cy="66" r="3"/><circle cx="100" cy="44" r="3.6"/><circle cx="130" cy="34" r="3"/>
        </g>
        <path d="M150 84 l9 -13 9 13" stroke="rgba(255,238,195,0.85)" stroke-width="1" fill="none"/>
      </svg></div>`;
    case 'share':
      return `<div class="thumb-art"><svg viewBox="0 0 200 110" fill="none">
        <rect width="200" height="110" fill="#0a0b0d"/>
        <g stroke="rgba(227,201,130,0.6)" stroke-width="1" fill="none">
          <path d="M76 44 A 28 28 0 0 1 128 40"/>
          <path d="M124 66 A 28 28 0 0 1 72 70"/>
        </g>
        <g fill="rgba(255,238,195,0.9)">
          <path d="M128 40 l 5 -8 -10 0 z"/>
          <path d="M72 70 l -5 8 10 0 z"/>
        </g>
        <g fill="#FCEFC9"><circle cx="70" cy="55" r="3"/><circle cx="130" cy="55" r="3"/></g>
      </svg></div>`;
    case 'ftros':
      return `<div class="thumb-art"><svg viewBox="0 0 200 110" fill="none">
        <rect width="200" height="110" fill="#0a0b0d"/>
        <rect x="52" y="26" width="96" height="58" rx="6" stroke="rgba(227,201,130,0.4)" stroke-width="0.8" fill="none"/>
        <line x1="52" y1="39" x2="148" y2="39" stroke="rgba(227,201,130,0.3)" stroke-width="0.6"/>
        <g fill="rgba(255,238,195,0.8)"><circle cx="60" cy="33" r="1.4"/><circle cx="66" cy="33" r="1.4"/><circle cx="72" cy="33" r="1.4"/></g>
        <g stroke="rgba(227,201,130,0.5)" stroke-width="0.6" fill="none"><circle cx="100" cy="60" r="14"/><circle cx="100" cy="60" r="7"/></g>
        <circle cx="100" cy="60" r="2" fill="#FCEFC9"/>
      </svg></div>`;
    case 'teach':
      return `<div class="thumb-art"><svg viewBox="0 0 200 110" fill="none">
        <rect width="200" height="110" fill="#0a0b0d"/>
        <path d="M100 30 L152 50 L100 70 L48 50 Z" stroke="rgba(227,201,130,0.6)" stroke-width="1" fill="none"/>
        <path d="M70 59 L70 76 C 70 84, 130 84, 130 76 L130 59" stroke="rgba(227,201,130,0.32)" stroke-width="0.8" fill="none"/>
        <line x1="152" y1="50" x2="152" y2="76" stroke="rgba(227,201,130,0.5)" stroke-width="0.8"/>
        <circle cx="152" cy="78" r="2" fill="#FCEFC9"/>
      </svg></div>`;
    case 'risk':
      return `<div class="thumb-art"><svg viewBox="0 0 200 110" fill="none">
        <rect width="200" height="110" fill="#0a0b0d"/>
        <g stroke="rgba(120,180,220,0.4)" stroke-width="0.6" fill="none">
          <circle cx="100" cy="55" r="32"/>
          <ellipse cx="100" cy="55" rx="32" ry="13"/>
          <path d="M68 55h64M100 23v64"/>
        </g>
        <path d="M100 55 L100 23 A 32 32 0 0 1 128 40 Z" fill="rgba(227,201,130,0.16)" stroke="rgba(227,201,130,0.5)" stroke-width="0.6"/>
        <circle cx="128" cy="40" r="2.4" fill="#FFE6A0"/>
      </svg></div>`;
    case 'stack':
      return `<div class="thumb-art"><svg viewBox="0 0 200 110" fill="none">
        <rect width="200" height="110" fill="#0a0b0d"/>
        <rect x="64" y="30" width="72" height="14" rx="3" stroke="rgba(227,201,130,0.3)"  stroke-width="0.8" fill="none"/>
        <rect x="58" y="48" width="84" height="14" rx="3" stroke="rgba(227,201,130,0.55)" stroke-width="0.8" fill="none"/>
        <rect x="64" y="66" width="72" height="14" rx="3" stroke="rgba(255,238,195,0.9)"  stroke-width="0.9" fill="none"/>
        <circle cx="100" cy="55" r="1.8" fill="#FCEFC9"/>
      </svg></div>`;
    case 'live':
      return `<div class="thumb-art"><svg viewBox="0 0 200 110" fill="none">
        <rect width="200" height="110" fill="#0a0b0d"/>
        <g fill="none" stroke="rgba(227,201,130,0.6)">
          <circle cx="100" cy="55" r="12" stroke-opacity="0.75"/>
          <circle cx="100" cy="55" r="22" stroke-opacity="0.4"/>
          <circle cx="100" cy="55" r="32" stroke-opacity="0.2"/>
        </g>
        <circle cx="100" cy="55" r="4.5" fill="#FFE6A0"/>
      </svg></div>`;
    case 'sage':
      return `<div class="thumb-art" style="background:radial-gradient(60% 70% at 50% 52%, rgba(120,170,140,0.18), transparent 62%), linear-gradient(180deg,#0c100d,#08090b);"><svg viewBox="0 0 200 110" fill="none">
        <defs>
          <radialGradient id="sg1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#F2F7E9"/>
            <stop offset="55%" stop-color="#CFE3B8" stop-opacity="0.6"/>
            <stop offset="100%" stop-color="transparent"/>
          </radialGradient>
        </defs>
        <circle cx="100" cy="55" r="16" fill="url(#sg1)"/>
        <ellipse cx="100" cy="55" rx="34" ry="14" stroke="rgba(207,227,184,0.4)" stroke-width="0.6" fill="none"/>
        <circle cx="134" cy="55" r="2" fill="#E8F2D8"/>
      </svg></div>`;
    default:
      return `<div class="thumb-art"></div>`;
  }
}
buildProjects();

/* =========================================================
   TIMELINE — arc with milestone dots
   ========================================================= */
function buildTimeline(){
  const svg = document.getElementById('timelineSvg');
  if (!svg) return;
  const NS = 'http://www.w3.org/2000/svg';
  const arcBg = document.getElementById('arcBg');
  const arcVis = document.getElementById('arcVis');
  const points = document.getElementById('tlPoints');

  // Arc: bottom-left → top-right, bulging upper-left. viewBox is 0 0 920 760.
  // Kept on the left half so the right half is a clean rail for labels.
  const start = {x: 86,  y: 700};
  const end   = {x: 560, y: 86};
  const c1 = {x: 86,  y: 300};
  const c2 = {x: 210, y: 92};
  const d = `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`;
  arcBg.setAttribute('d', d);
  arcVis.setAttribute('d', d);

  // Sample the path to position dots.
  const tmp = document.createElementNS(NS, 'path');
  tmp.setAttribute('d', d);
  svg.appendChild(tmp);
  const len = tmp.getTotalLength();

  const items = window.TIMELINE;
  const N = items.length;
  const tMin = 0.04, tMax = 0.96;

  // Dot positions on the arc (oldest at bottom-left → newest at top-right).
  const pts = items.map((it, i) => {
    const t = tMin + (tMax - tMin) * (i / (N - 1));
    const p = tmp.getPointAtLength(t * len);
    return { it, x: p.x, y: p.y };
  });
  svg.removeChild(tmp);

  // Collision-free label rows on a fixed rail. Each title+desc block is ~58px
  // tall; enforce a minimum vertical gap so blocks never overlap, then shift the
  // stack down if the top row would run off the canvas. This is the core fix for
  // the overlapping / clipped timeline text.
  const RAIL_X = 470, GAP = 94, TOP = 72, BOTTOM = 706;
  const order = pts.map((_, i) => i).sort((a, b) => pts[b].y - pts[a].y); // bottom-first
  const labelY = new Array(N);
  let cursor = BOTTOM;
  order.forEach(i => {
    const y = Math.min(pts[i].y, cursor);
    labelY[i] = y;
    cursor = y - GAP;
  });
  const minY = Math.min.apply(null, labelY);
  if (minY < TOP){
    const shift = TOP - minY;
    for (let i = 0; i < N; i++) labelY[i] += shift;
  }

  pts.forEach((p, i) => {
    const ly = labelY[i];
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'tl-point');

    // Curved connector from the arc dot out to the label rail.
    const midX = (p.x + RAIL_X) / 2;
    const conn = document.createElementNS(NS, 'path');
    conn.setAttribute('d',
      `M ${p.x.toFixed(1)} ${p.y.toFixed(1)} ` +
      `C ${midX.toFixed(1)} ${p.y.toFixed(1)}, ${(RAIL_X - 46).toFixed(1)} ${ly}, ${RAIL_X - 12} ${ly}`);
    conn.setAttribute('class', 'tl-conn');

    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('cx', p.x.toFixed(1));
    dot.setAttribute('cy', p.y.toFixed(1));
    dot.setAttribute('r', 3.4);
    dot.setAttribute('class', 'tl-dot');

    const month = document.createElementNS(NS, 'text');
    month.setAttribute('x', RAIL_X);
    month.setAttribute('y', ly - 15);
    month.setAttribute('class', 'tl-month');
    month.textContent = p.it.month;

    const title = document.createElementNS(NS, 'text');
    title.setAttribute('x', RAIL_X);
    title.setAttribute('y', ly + 7);
    title.setAttribute('class', 'tl-title');
    title.textContent = p.it.title;

    const desc = document.createElementNS(NS, 'text');
    desc.setAttribute('x', RAIL_X);
    desc.setAttribute('y', ly + 29);
    desc.setAttribute('class', 'tl-desc');
    desc.textContent = p.it.desc;

    g.appendChild(conn);
    g.appendChild(dot);
    g.appendChild(month);
    g.appendChild(title);
    g.appendChild(desc);
    points.appendChild(g);
  });

  // Reveal: arc draws first, then rows fade + slide in oldest→newest.
  const section = document.getElementById('timeline');
  let drawn = false;
  function maybeDraw(){
    if (drawn) return;
    const r = section.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.8){
      drawn = true;
      arcVis.style.transition = prefersReduced ? 'none' : 'stroke-dashoffset 2.2s cubic-bezier(.5,.1,.2,1)';
      requestAnimationFrame(() => arcVis.style.strokeDashoffset = '0');
      const groups = points.querySelectorAll('.tl-point');
      groups.forEach((g, i) => {
        g.style.opacity = '0';
        if (!prefersReduced){
          g.style.transform = 'translateX(12px)';
          g.style.transition = 'opacity .6s ease, transform .6s cubic-bezier(.2,.7,.2,1)';
          g.style.transitionDelay = `${0.5 + i * 0.16}s`;
        }
        requestAnimationFrame(() => {
          g.style.opacity = '1';
          g.style.transform = 'translateX(0)';
        });
      });
    }
  }
  window.addEventListener('scroll', maybeDraw, { passive: true });
  maybeDraw();
}
buildTimeline();

/* =========================================================
   FILMS — cinematic cards + lightbox playback
   ========================================================= */
function buildFilms(){
  const grid = document.getElementById('filmGrid');
  if (!grid || !window.FILMS) return;

  grid.innerHTML = window.FILMS.map((f, i) => {
    const thumb = f.type === 'youtube'
      ? `<img class="film-poster" src="${f.poster}" alt="" loading="lazy" />`
      : `<video class="film-poster" src="${f.src}#t=0.6" preload="metadata" muted playsinline></video>`;
    return `
      <button class="film-card reveal" data-delay="${i + 1}" data-index="${i}" type="button" aria-label="Play ${f.title}">
        <div class="film-media">
          ${thumb}
          <span class="film-play" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
          </span>
        </div>
        <div class="film-meta">
          <span class="film-sub">${f.sub}</span>
          <h3 class="film-title">${f.title}</h3>
          <p class="film-desc">${f.desc || ''}</p>
        </div>
      </button>`;
  }).join('');

  grid.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // Lightbox (built once)
  const lb = document.createElement('div');
  lb.className = 'film-lightbox';
  lb.setAttribute('aria-hidden', 'true');
  lb.innerHTML = '<button class="film-close" type="button" aria-label="Close">Close</button><div class="film-stage" id="filmStage"></div>';
  document.body.appendChild(lb);
  const stage = lb.querySelector('#filmStage');

  function open(f){
    stage.innerHTML = f.type === 'youtube'
      ? `<iframe src="https://www.youtube.com/embed/${f.id}?autoplay=1&rel=0&modestbranding=1" title="${f.title}" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`
      : `<video src="${f.src}" controls autoplay playsinline></video>`;
    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function close(){
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    stage.innerHTML = '';           // stops playback (iframe + video)
    document.body.style.overflow = '';
  }

  grid.querySelectorAll('.film-card').forEach(card => {
    card.addEventListener('click', () => open(window.FILMS[+card.dataset.index]));
  });
  lb.addEventListener('click', (e) => {
    if (e.target === lb || e.target.classList.contains('film-close')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lb.classList.contains('open')) close();
  });
}
buildFilms();
