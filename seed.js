/* =========================================================
   Vikas Mohan — Portfolio
   "Seed of Light" — WebGL narrative layer (prototype)

   One luminous particle cloud, born from the hero eclipse, that streams
   down and resolves into the Method helix as the user scrolls. This is the
   first transition of a planned page-long narrative; the morph engine here
   (form-buffers + a single scroll-driven progress value) is reused per
   section when the rest is built.

   Design notes:
   - Orthographic camera in CSS-pixel units (0..W, 0..H, y-down) so DOM
     getBoundingClientRect() maps 1:1 to particle world coordinates.
   - Particle targets are stored as *normalized local* attributes; the live
     on-screen anchors (orb centre/radius, helix offset/scale) are passed as
     uniforms recomputed every frame, so parallax + sticky + resize all work
     for free.
   - Helix sampled from window.METHOD_GEOMETRY (single source of truth set in
     script.js) so the particles land exactly on the SVG spiral.
   ========================================================= */

import * as THREE from 'three';

(function initSeedOfLight(){
  // ---- Gates: respect motion prefs, keep mobile light, fail soft ----------
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;
  if (window.innerWidth < 900) return;

  const orbStage  = document.getElementById('orbStage');
  const methodSvg = document.getElementById('methodSvg');
  const hero      = document.getElementById('top');
  const method    = document.getElementById('method');
  const orbParticles = document.getElementById('orbParticles');
  const geo = window.METHOD_GEOMETRY;
  if (!orbStage || !methodSvg || !hero || !method || !geo) return;

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

  // ---- Particle geometry ---------------------------------------------------
  const COUNT = 3200;
  const aOrbLocal   = new Float32Array(COUNT * 2); // ring offset, in orb-radius units
  const aHelixLocal = new Float32Array(COUNT * 2); // SVG-local px (viewBox 0..400 x 0..760)
  const aDelay      = new Float32Array(COUNT);     // stagger 0..1 (top of helix forms first)
  const aArc        = new Float32Array(COUNT);     // perpendicular bulge of flight path (px)
  const aRand       = new Float32Array(COUNT);     // per-particle colour / size variation

  const N  = geo.N;
  const VB = geo.viewBox || { w: 400, h: 760 };

  for (let i = 0; i < COUNT; i++){
    const f = i / (COUNT - 1);

    // Helix-form: sample the exact Method curve, with a little perpendicular
    // jitter for thickness/glow. Particles ordered along t so the spiral
    // appears to "draw" from the top down as progress increases (via aDelay).
    const t = f * N;
    const p = geo.pt(t);
    const tangentY = Math.cos(2 * Math.PI * t); // rough vertical sway of the curve
    const jitter = (Math.random() - 0.5) * 8;
    aHelixLocal[i*2]     = p.x + jitter;
    aHelixLocal[i*2 + 1] = p.y + jitter * 0.4 * Math.sign(tangentY || 1);

    // Orb-form: an annulus echoing the eclipse rim, with some interior fill.
    const ang = Math.random() * Math.PI * 2;
    const r   = (Math.random() < 0.75)
      ? 0.62 + Math.random() * 0.40           // rim
      : Math.random() * 0.55;                 // interior
    aOrbLocal[i*2]     = Math.cos(ang) * r;
    aOrbLocal[i*2 + 1] = Math.sin(ang) * r;

    aDelay[i] = f;                                  // top-of-helix particles arrive first
    aArc[i]   = (Math.random() * 55 + 25) * (Math.random() < 0.5 ? -1 : 1);
    aRand[i]  = Math.random();
  }

  const g = new THREE.BufferGeometry();
  // position is unused for placement (computed in shader) but three needs it.
  g.setAttribute('position',   new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
  g.setAttribute('aOrbLocal',  new THREE.BufferAttribute(aOrbLocal, 2));
  g.setAttribute('aHelixLocal',new THREE.BufferAttribute(aHelixLocal, 2));
  g.setAttribute('aDelay',     new THREE.BufferAttribute(aDelay, 1));
  g.setAttribute('aArc',       new THREE.BufferAttribute(aArc, 1));
  g.setAttribute('aRand',      new THREE.BufferAttribute(aRand, 1));

  const uniforms = {
    uOrbCenter:  { value: new THREE.Vector2(0, 0) },
    uOrbRadius:  { value: 160 },
    uHelixOffset:{ value: new THREE.Vector2(0, 0) },
    uHelixScale: { value: 1 },
    uProgress:   { value: 0 },
    uOpacity:    { value: 0 },
    uTime:       { value: 0 },
    uSize:       { value: 2.4 },
    uPixelRatio: { value: PR() },
    uStagger:    { value: 0.45 },
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
      attribute vec2  aOrbLocal;
      attribute vec2  aHelixLocal;
      attribute float aDelay;
      attribute float aArc;
      attribute float aRand;

      uniform vec2  uOrbCenter;
      uniform float uOrbRadius;
      uniform vec2  uHelixOffset;
      uniform float uHelixScale;
      uniform float uProgress;
      uniform float uOpacity;
      uniform float uTime;
      uniform float uSize;
      uniform float uPixelRatio;
      uniform float uStagger;

      varying float vAlpha;
      varying float vMix;

      void main(){
        // staggered, eased progress per particle -> streaming, not teleporting
        float e = clamp(uProgress * (1.0 + uStagger) - aDelay * uStagger, 0.0, 1.0);
        e = e * e * (3.0 - 2.0 * e); // smoothstep

        vec2 orb   = uOrbCenter + aOrbLocal * uOrbRadius;
        vec2 helix = uHelixOffset + aHelixLocal * uHelixScale;

        vec2 pos = mix(orb, helix, e);

        // arc the flight path: perpendicular bulge that peaks mid-transit
        vec2 dir = normalize(helix - orb + vec2(0.0001));
        vec2 nrm = vec2(-dir.y, dir.x);
        pos += nrm * aArc * sin(e * 3.14159265);

        // faint in-flight shimmer (dies out at both ends)
        pos += nrm * sin(uTime * 2.0 + aDelay * 28.0) * 1.6 * (e * (1.0 - e));

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 0.0, 1.0);
        gl_PointSize = (uSize * (0.6 + aRand * 0.9)) * uPixelRatio;

        // dim near the orb, bright once formed on the helix
        vAlpha = uOpacity * (0.35 + 0.65 * e);
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

  // ---- Layout / sizing -----------------------------------------------------
  let vw = window.innerWidth, vh = window.innerHeight;
  let methodTop = 0;

  function measure(){
    vw = window.innerWidth;
    vh = window.innerHeight;
    methodTop = method.getBoundingClientRect().top + window.scrollY;
    renderer.setPixelRatio(PR());
    renderer.setSize(vw, vh, false);
    camera.left = 0; camera.right = vw;
    camera.top = 0;  camera.bottom = vh; // y-down so screen px map directly
    camera.updateProjectionMatrix();
    uniforms.uPixelRatio.value = PR();
  }
  measure();

  // Map the Method SVG's local viewBox coords -> screen px, honouring its
  // preserveAspectRatio="xMidYMid meet" (uniform scale, centred).
  function updateHelixAnchor(){
    const r = methodSvg.getBoundingClientRect();
    const scale = Math.min(r.width / VB.w, r.height / VB.h);
    const offX = r.left + (r.width  - VB.w * scale) / 2;
    const offY = r.top  + (r.height - VB.h * scale) / 2;
    uniforms.uHelixScale.value = scale;
    uniforms.uHelixOffset.value.set(offX, offY);
  }

  function updateOrbAnchor(){
    const r = orbStage.getBoundingClientRect();
    uniforms.uOrbCenter.value.set(r.left + r.width / 2, r.top + r.height / 2);
    uniforms.uOrbRadius.value = Math.min(r.width, r.height) * 0.42;
  }

  // ---- Scroll-driven progress (the handoff window) -------------------------
  // 0 while the hero rests; ramps to 1 over the last viewport of scroll before
  // the Method section pins (its top reaches the viewport top).
  function computeProgress(){
    const sy = window.scrollY;
    // window: [methodTop - vh, methodTop]
    const p = (sy - (methodTop - vh)) / vh;
    return Math.max(0, Math.min(1, p));
  }

  // ---- Render loop with gating ---------------------------------------------
  const clock = new THREE.Clock();
  let running = false;
  let particlesDimmed = false;

  function active(){
    // Render while the hero→Method band is anywhere near the viewport.
    const sy = window.scrollY;
    return sy < methodTop + method.offsetHeight;
  }

  function frame(){
    if (!running) return;
    const progress = computeProgress();
    uniforms.uProgress.value = progress;
    // Global fade-in so we never compete with the visible DOM orb at rest.
    uniforms.uOpacity.value = Math.max(0, Math.min(1, (progress - 0.04) / 0.16));
    uniforms.uTime.value = clock.getElapsedTime();

    updateOrbAnchor();
    updateHelixAnchor();

    // Hand the hero's DOM spark pool off to the WebGL light once in flight.
    if (orbParticles){
      const want = progress > 0.1;
      if (want !== particlesDimmed){
        orbParticles.classList.toggle('dimmed', want);
        particlesDimmed = want;
      }
    }

    renderer.render(scene, camera);

    if (active()) requestAnimationFrame(frame);
    else running = false; // park until next scroll into the band
  }

  function kick(){
    if (!running && active()){
      running = true;
      requestAnimationFrame(frame);
    }
  }

  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', () => { measure(); kick(); });
  // Recompute layout once fonts/images settle (hero height can shift).
  window.addEventListener('load', () => { measure(); kick(); });

  kick();
})();
