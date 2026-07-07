/* =========================================================
   Vikas Mohan — Portfolio
   "Seed of Light" — WebGL narrative layer

   One luminous particle cloud, born from the hero eclipse, that travels the
   entire page. At each section ("station") it resolves into that section's
   signature form; between stations it collapses into a compact comet gliding
   down the page — so the visitor always sees the same light moving, never a
   fade-out/fade-in. The story closes at Contact, where the seed converges
   into the rising sun: born from an eclipse, ends as a sunrise.

   Stations:
     0 Hero      — annulus on the eclipse rim (origin form)
     1 Method    — the helix (sampled from window.METHOD_GEOMETRY)
     2 Work      — sparks seated at each project row marker + underline
     3 Timeline  — rides the arc as it draws (same cubic as buildTimeline)
     4 Films     — projector-beam cone aimed at the film grid
     5 About     — halo behind the rim-lit profile
     6 Contact   — converges into the rising sun and fades into it

   Design notes:
   - Orthographic camera in CSS-pixel units (0..W, 0..H, y-down) so DOM
     getBoundingClientRect() maps 1:1 to particle world coordinates.
   - Every form is baked in *element-local px* (origin = the anchor element's
     rect top-left) at measure time; per frame only the rect's live top-left
     is passed as a uniform, so parallax + sticky + resize all work for free.
   - Only two forms live on the GPU at once (aFrom/aTo); buffers are swapped
     when the scroll crosses into a new segment window. Windows never overlap
     and a resting form is byte-identical as "to" of one segment and "from"
     of the next, so swaps are invisible.
   - Graceful no-op under reduced motion, coarse pointer, narrow viewports,
     or missing WebGL/three. Render loop parks when settled and idle.
   ========================================================= */

import * as THREE from 'three';

(function initSeedOfLight(){
  // ---- Gates: respect motion prefs, keep mobile light, fail soft ----------
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;
  if (window.innerWidth < 900) return;

  const geo = window.METHOD_GEOMETRY;
  const $   = (sel) => document.querySelector(sel);

  const orbStage     = $('#orbStage');
  const orbParticles = $('#orbParticles');
  if (!orbStage || !geo) return;

  const COUNT = 3200;
  const PI = Math.PI;

  // ---- Station definitions --------------------------------------------------
  // Each station: an anchor element (form coordinate frame), the section whose
  // top defines the arrival scroll window, and a form builder returning
  // Float32Array(COUNT*2) of element-local px. Order of particles (index/COUNT)
  // doubles as the stagger order, so builders lay points out in draw order.

  function buildOrbForm(w, h, out){
    const cx = w / 2, cy = h / 2;
    const R = Math.min(w, h) * 0.42;
    for (let i = 0; i < COUNT; i++){
      const ang = Math.random() * PI * 2;
      const r = (Math.random() < 0.75)
        ? 0.62 + Math.random() * 0.40          // rim
        : Math.random() * 0.55;                // interior
      out[i*2]     = cx + Math.cos(ang) * r * R;
      out[i*2 + 1] = cy + Math.sin(ang) * r * R;
    }
  }

  function svgFit(w, h, vbW, vbH){
    // preserveAspectRatio="xMidYMid meet": uniform scale, centred.
    const s = Math.min(w / vbW, h / vbH);
    return { s, ox: (w - vbW * s) / 2, oy: (h - vbH * s) / 2 };
  }

  function buildHelixForm(w, h, out){
    const VB = geo.viewBox || { w: 400, h: 760 };
    const { s, ox, oy } = svgFit(w, h, VB.w, VB.h);
    for (let i = 0; i < COUNT; i++){
      const f = i / (COUNT - 1);
      const t = f * geo.N;                     // top of helix forms first
      const p = geo.pt(t);
      const tangentY = Math.cos(2 * PI * t);
      const jit = (Math.random() - 0.5) * 8;
      out[i*2]     = ox + (p.x + jit) * s;
      out[i*2 + 1] = oy + (p.y + jit * 0.4 * Math.sign(tangentY || 1)) * s;
    }
  }

  function buildSparksForm(w, h, out, el){
    // Sparks seat at each project row's index marker, plus a faint line of
    // light along the row's bottom hairline — the seed "ignites" the work.
    const listRect = el.getBoundingClientRect();
    const rows = Array.from(el.querySelectorAll('.project-row'));
    if (!rows.length){ buildOrbForm(w, h, out); return; }
    const rects = rows.map(r => {
      const q = r.getBoundingClientRect();
      return { x: q.left - listRect.left, y: q.top - listRect.top, w: q.width, h: q.height };
    });
    const perRow = COUNT / rects.length;
    for (let i = 0; i < COUNT; i++){
      const row = rects[Math.min(rects.length - 1, Math.floor(i / perRow))];
      if (Math.random() < 0.55){
        // cluster around the row's index marker (left edge, vertically centred)
        const ang = Math.random() * PI * 2;
        const r = Math.pow(Math.random(), 0.6) * 16;
        out[i*2]     = row.x + 30 + Math.cos(ang) * r;
        out[i*2 + 1] = row.y + row.h / 2 + Math.sin(ang) * r * 0.8;
      } else {
        // sparse underline along the row's bottom hairline
        out[i*2]     = row.x + Math.random() * row.w;
        out[i*2 + 1] = row.y + row.h - 1 + (Math.random() - 0.5) * 3;
      }
    }
  }

  function buildArcForm(w, h, out){
    // The exact cubic from buildTimeline() (viewBox 0 0 920 760), particles
    // ordered start→end so they ride along as arcVis draws.
    const { s, ox, oy } = svgFit(w, h, 920, 760);
    const P0 = {x: 86, y: 700}, C1 = {x: 86, y: 300}, C2 = {x: 210, y: 92}, P1 = {x: 560, y: 86};
    for (let i = 0; i < COUNT; i++){
      const t = i / (COUNT - 1), u = 1 - t;
      const bx = u*u*u*P0.x + 3*u*u*t*C1.x + 3*u*t*t*C2.x + t*t*t*P1.x;
      const by = u*u*u*P0.y + 3*u*u*t*C1.y + 3*u*t*t*C2.y + t*t*t*P1.y;
      const jit = (Math.random() - 0.5) * 7;
      out[i*2]     = ox + (bx + jit) * s;
      out[i*2 + 1] = oy + (by + jit) * s;
    }
  }

  function buildBeamForm(w, h, out){
    // Projector beam: apex above the film grid, cone widening onto it.
    const apexX = w * 0.5, apexY = -h * 0.20;
    for (let i = 0; i < COUNT; i++){
      const f = i / (COUNT - 1);                     // apex forms first
      const u = Math.sqrt(f);                        // even area coverage
      const halfW = u * w * 0.46;
      out[i*2]     = apexX + (Math.random() * 2 - 1) * halfW;
      out[i*2 + 1] = apexY + u * (h * 0.62) + (Math.random() - 0.5) * 6;
    }
  }

  function buildHaloForm(w, h, out){
    // Halo behind the profile's head — matches .about-portrait .halo
    // (left 54% / top 33%). Starts at 12 o'clock and closes clockwise.
    const cx = w * 0.54, cy = h * 0.33;
    const R = Math.min(w, h) * 0.34;
    for (let i = 0; i < COUNT; i++){
      const f = i / (COUNT - 1);
      const ang = -PI / 2 + f * PI * 2;
      const r = R * (0.94 + Math.random() * 0.12);
      out[i*2]     = cx + Math.cos(ang) * r;
      out[i*2 + 1] = cy + Math.sin(ang) * r * 0.96;
    }
  }

  function buildSunForm(w, h, out){
    // Rising-sun dome over the contact glow orb: a crest arc left→right with
    // a soft interior glow. The seed becomes the sun.
    const R = Math.min(w * 0.30, h * 0.60);
    const cx = w * 0.5, cy = h * 0.62;
    for (let i = 0; i < COUNT; i++){
      const f = i / (COUNT - 1);
      const ang = PI - f * PI;                       // left → right along the crest
      if (Math.random() < 0.7){
        const r = R * (0.97 + Math.random() * 0.06);
        out[i*2]     = cx + Math.cos(ang) * r;
        out[i*2 + 1] = cy - Math.sin(ang) * r;
      } else {
        const r = R * Math.sqrt(Math.random());
        out[i*2]     = cx + Math.cos(ang) * r;
        out[i*2 + 1] = cy - Math.abs(Math.sin(ang)) * r;
      }
    }
  }

  const stations = [
    { el: orbStage,           section: $('#top'),      build: buildOrbForm    },
    { el: $('#methodSvg'),    section: $('#method'),   build: buildHelixForm  },
    { el: $('#projectList'),  section: $('#work'),     build: buildSparksForm },
    { el: $('#timelineSvg'),  section: $('#timeline'), build: buildArcForm    },
    { el: $('#filmGrid'),     section: $('#films'),    build: buildBeamForm   },
    { el: $('.about-portrait'), section: $('#about'),  build: buildHaloForm   },
    { el: $('.contact-left .glow-orb'), section: $('#contact'), build: buildSunForm },
  ].filter(st => st.el && st.section);
  if (stations.length < 2) return;
  const LAST = stations.length - 1;

  // ---- Renderer (feature-detect WebGL) -------------------------------------
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    if (!renderer.getContext()) return;
  } catch (e){ return; }

  const canvas = renderer.domElement;
  canvas.id = 'seedCanvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(canvas, document.body.firstChild);

  const PR = () => Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(PR());
  renderer.setClearColor(0x000000, 0); // transparent — body bg shows through

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, window.innerWidth, 0, window.innerHeight, 0.1, 100);
  camera.position.z = 10;

  // ---- Particle geometry ----------------------------------------------------
  const aFrom  = new Float32Array(COUNT * 2);
  const aTo    = new Float32Array(COUNT * 2);
  const aDelay = new Float32Array(COUNT);
  const aArc   = new Float32Array(COUNT);
  const aRand  = new Float32Array(COUNT);

  for (let i = 0; i < COUNT; i++){
    aDelay[i] = i / (COUNT - 1);
    aArc[i]   = (Math.random() * 40 + 14) * (Math.random() < 0.5 ? -1 : 1);
    aRand[i]  = Math.random();
  }

  const g = new THREE.BufferGeometry();
  // position is unused for placement (computed in shader) but three needs it.
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
  const attrFrom = new THREE.BufferAttribute(aFrom, 2);
  const attrTo   = new THREE.BufferAttribute(aTo, 2);
  attrFrom.setUsage(THREE.DynamicDrawUsage);
  attrTo.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('aFrom',  attrFrom);
  g.setAttribute('aTo',    attrTo);
  g.setAttribute('aDelay', new THREE.BufferAttribute(aDelay, 1));
  g.setAttribute('aArc',   new THREE.BufferAttribute(aArc, 1));
  g.setAttribute('aRand',  new THREE.BufferAttribute(aRand, 1));

  const uniforms = {
    uFromOff:    { value: new THREE.Vector2(0, 0) }, // anchor rect top-left, screen px
    uToOff:      { value: new THREE.Vector2(0, 0) },
    uFromCenter: { value: new THREE.Vector2(0, 0) }, // form centroid, screen px
    uToCenter:   { value: new THREE.Vector2(0, 0) },
    uProgress:   { value: 0 },
    uOpacity:    { value: 0 },
    uTime:       { value: 0 },
    uSize:       { value: 2.4 },
    uPixelRatio: { value: PR() },
    uStagger:    { value: 0.45 },
    uArcAmp:     { value: 70 },     // comet path bow (px, sign alternates per leg)
    uTail:       { value: 95 },     // comet tail length (px)
    uCometR:     { value: 15 },     // comet body radius (px)
    uPinch:      { value: 0.92 },   // how tightly the swarm condenses in flight
    uColorCore:  { value: new THREE.Color(0xFFFBE9) }, // matches planetG core
    uColorEdge:  { value: new THREE.Color(0xC69A4A) }, // matches --gold
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec2  aFrom;
      attribute vec2  aTo;
      attribute float aDelay;
      attribute float aArc;
      attribute float aRand;

      uniform vec2  uFromOff;
      uniform vec2  uToOff;
      uniform vec2  uFromCenter;
      uniform vec2  uToCenter;
      uniform float uProgress;
      uniform float uOpacity;
      uniform float uTime;
      uniform float uSize;
      uniform float uPixelRatio;
      uniform float uStagger;
      uniform float uArcAmp;
      uniform float uTail;
      uniform float uCometR;
      uniform float uPinch;

      varying float vAlpha;
      varying float vMix;

      const float PI = 3.14159265;

      void main(){
        // staggered, eased progress per particle -> streaming, not teleporting
        float e = clamp(uProgress * (1.0 + uStagger) - aDelay * uStagger, 0.0, 1.0);
        e = e * e * (3.0 - 2.0 * e); // smoothstep

        vec2 from = uFromOff + aFrom;
        vec2 to   = uToOff + aTo;

        vec2 span = uToCenter - uFromCenter;
        vec2 dir  = normalize(span + vec2(0.0001));
        vec2 nrm  = vec2(-dir.y, dir.x);

        float g = sin(e * PI); // 0 at both endpoints, 1 mid-flight

        // base morph between resting forms, with a gentle per-particle bow
        vec2 pos = mix(from, to, e) + nrm * aArc * 0.35 * g;

        // comet: swarm condenses onto a bowed path between form centroids,
        // elongated backwards along the travel direction (the tail)
        vec2 comet = mix(uFromCenter, uToCenter, e)
                   + nrm * uArcAmp * g
                   - dir * aDelay * uTail
                   + nrm * (aRand - 0.5) * 2.0 * uCometR;
        float pinch = pow(g, 1.4) * uPinch;
        pos = mix(pos, comet, pinch);

        // faint in-flight shimmer (dies out at both ends)
        pos += nrm * sin(uTime * 2.0 + aDelay * 28.0) * 1.6 * g;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 0.0, 1.0);
        gl_PointSize = (uSize * (0.6 + aRand * 0.9)) * uPixelRatio;

        // full brightness at rest on either form, dimmer while condensed in
        // flight (additive blending re-densifies the comet anyway)
        vAlpha = uOpacity * (1.0 - 0.45 * g);
        vMix = aRand;
      }
    `,
    fragmentShader: /* glsl */`
      precision mediump float;
      uniform vec3 uColorCore;
      uniform vec3 uColorEdge;
      varying float vAlpha;
      varying float vMix;

      void main(){
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float soft = smoothstep(0.5, 0.0, d);
        vec3 col = mix(uColorCore, uColorEdge, vMix * 0.85);
        gl_FragColor = vec4(col, soft * vAlpha);
      }
    `,
  });

  const points = new THREE.Points(g, material);
  points.frustumCulled = false;
  scene.add(points);

  // ---- Layout / measurement -------------------------------------------------
  let vw = window.innerWidth, vh = window.innerHeight;
  const windows = []; // windows[i] = arrival window for stations[i], i >= 1

  function measure(){
    vw = window.innerWidth;
    vh = window.innerHeight;
    renderer.setPixelRatio(PR());
    renderer.setSize(vw, vh, false);
    camera.left = 0; camera.right = vw;
    camera.top = 0;  camera.bottom = vh; // y-down so screen px map directly
    camera.updateProjectionMatrix();
    uniforms.uPixelRatio.value = PR();

    const sy = window.scrollY;
    stations.forEach(st => {
      const r = st.el.getBoundingClientRect();
      if (!st.local) st.local = new Float32Array(COUNT * 2);
      st.build(r.width, r.height, st.local, st.el);
      // Comet path endpoint: the form's *entry point* — the centroid of its
      // first-forming particles (draw order), not the whole-form centroid.
      // Tall forms (the project list) have centroids far below the fold; the
      // comet must aim where the form visibly begins, then cascade down.
      const EN = Math.floor(COUNT * 0.12);
      let cx = 0, cy = 0;
      for (let i = 0; i < EN; i++){ cx += st.local[i*2]; cy += st.local[i*2+1]; }
      st.center = { x: cx / EN, y: cy / EN };
      st.secTop = st.section.getBoundingClientRect().top + sy;
    });

    // Arrival window for station i: begins ~0.85 viewport before its section
    // top and completes once the visitor is 35% of a viewport INTO the
    // section — so the form resolves while its section is on screen. Clamped
    // monotonic so consecutive windows never overlap (forms rest between legs).
    for (let i = 1; i < stations.length; i++){
      let start = stations[i].secTop - vh * 0.85;
      let end   = stations[i].secTop + vh * 0.35;
      // Guarantee a dwell at the previous station (~30% of a viewport) even
      // when consecutive sections sit closer than a viewport apart.
      if (i > 1) start = Math.max(start, windows[i - 1].end + vh * 0.3);
      end = Math.max(end, start + 1);
      windows[i] = { start, end };
    }
  }

  // ---- Segment machine -------------------------------------------------------
  let seg = 0; // index of the target station currently loaded into aTo

  function loadSegment(i){
    seg = i;
    aFrom.set(stations[i - 1].local);
    aTo.set(stations[i].local);
    attrFrom.needsUpdate = true;
    attrTo.needsUpdate = true;
    // alternate the comet's bow per leg for a gentle S-path down the page
    uniforms.uArcAmp.value = (i % 2 ? 70 : -70);
  }

  function currentSegment(sy){
    let i = 1;
    for (let k = windows.length - 1; k >= 1; k--){
      if (sy >= windows[k].start){ i = k; break; }
    }
    return i;
  }

  // ---- Render loop with gating -----------------------------------------------
  const clock = new THREE.Clock();
  let running = false;
  let lastKick = 0;
  let particlesDimmed = false;

  function frame(){
    if (!running) return;
    const sy = window.scrollY;

    const want = currentSegment(sy);
    if (want !== seg) loadSegment(want);

    const w = windows[seg];
    const p = Math.max(0, Math.min(1, (sy - w.start) / (w.end - w.start)));
    uniforms.uProgress.value = p;

    // Opacity envelope: fade in as the seed first leaves the hero (the DOM orb
    // owns the resting hero), hold through the journey, and sink into the
    // contact sun at the end (the DOM glow takes over — seed becomes sun).
    let op = 1;
    if (seg === 1) op = Math.max(0, Math.min(1, (p - 0.04) / 0.16));
    if (seg === LAST){
      const fade = Math.max(0, Math.min(1, (p - 0.78) / 0.20));
      op *= 1 - fade * fade;
    }
    uniforms.uOpacity.value = op;
    uniforms.uTime.value = clock.getElapsedTime();

    // Live anchors: rect top-left per frame (sticky/parallax-safe)
    const fromSt = stations[seg - 1], toSt = stations[seg];
    const fr = fromSt.el.getBoundingClientRect();
    const tr = toSt.el.getBoundingClientRect();
    uniforms.uFromOff.value.set(fr.left, fr.top);
    uniforms.uToOff.value.set(tr.left, tr.top);
    uniforms.uFromCenter.value.set(fr.left + fromSt.center.x, fr.top + fromSt.center.y);
    uniforms.uToCenter.value.set(tr.left + toSt.center.x, tr.top + toSt.center.y);

    // Hand the hero's DOM spark pool off to the WebGL light once in flight.
    if (orbParticles){
      const dim = seg > 1 || p > 0.1;
      if (dim !== particlesDimmed){
        orbParticles.classList.toggle('dimmed', dim);
        particlesDimmed = dim;
      }
    }

    renderer.render(scene, camera);

    // Park once settled (p pinned at 0 or 1 — shimmer dies there anyway) and
    // the user has stopped scrolling; any scroll/resize kicks it back on.
    const inFlight = p > 0.001 && p < 0.999;
    if (inFlight || performance.now() - lastKick < 900) requestAnimationFrame(frame);
    else running = false;
  }

  function kick(){
    lastKick = performance.now();
    if (!running){
      running = true;
      requestAnimationFrame(frame);
    }
  }

  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', () => { measure(); loadSegment(seg || 1); kick(); });
  // Recompute layout whenever the document reflows (fonts, images, lazy
  // media) — section tops shift as posters load, and stale scroll windows
  // would desync the narrative from the sections.
  window.addEventListener('load', () => { measure(); loadSegment(seg || 1); kick(); });
  if ('ResizeObserver' in window){
    let reflowT = 0;
    new ResizeObserver(() => {
      clearTimeout(reflowT);
      reflowT = setTimeout(() => { measure(); loadSegment(seg || 1); kick(); }, 120);
    }).observe(document.body);
  }

  measure();
  loadSegment(1);
  kick();
})();
