import * as THREE from './assets/vendor/three/three.module.min.js';

// One material and one sample lattice are shared by the gallery and the page.
// The seven poses use the same vertices: phase never dissolves into random noise.
const TAU = Math.PI * 2;
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
function fitReadingRegions(rects, width, height, feather) {
  if (rects.length <= 48) return rects;
  // Under unusually dense text, coalesce into two columns of 24 horizontal
  // cells. Every visible line keeps protection; no lower-page tail is dropped.
  const cellWidth = (width + feather * 2) / 2;
  const cellHeight = (height + feather * 2) / 24;
  const cells = new Map();
  for (const rect of rects) {
    const left = Math.max(-feather, rect.left), right = Math.min(width + feather, rect.left + rect.width);
    const top = Math.max(-feather, rect.top), bottom = Math.min(height + feather, rect.top + rect.height);
    if (right <= left || bottom <= top) continue;
    const firstRow = clamp(Math.floor((top + feather) / cellHeight), 0, 23);
    const lastRow = clamp(Math.floor((bottom + feather) / cellHeight), 0, 23);
    for (let row = firstRow; row <= lastRow; row++) {
      for (let column = 0; column < 2; column++) {
        const x0 = Math.max(left, column * cellWidth - feather);
        const x1 = Math.min(right, (column + 1) * cellWidth - feather);
        const y0 = Math.max(top, row * cellHeight - feather);
        const y1 = Math.min(bottom, (row + 1) * cellHeight - feather);
        if (x1 <= x0 || y1 <= y0) continue;
        const key = row * 2 + column, existing = cells.get(key);
        if (existing) {
          existing.left = Math.min(existing.left, x0); existing.right = Math.max(existing.right, x1);
          existing.top = Math.min(existing.top, y0); existing.bottom = Math.max(existing.bottom, y1);
        } else cells.set(key, { left: x0, right: x1, top: y0, bottom: y1 });
      }
    }
  }
  return [...cells.values()].map(rect => ({ left: rect.left, top: rect.top,
    width: rect.right - rect.left, height: rect.bottom - rect.top }));
}
const palettes = {
  light: { core: '#b87338', light: '#dfb173', edge: '#258b99', shade: '#244c51' },
  dark: { core: '#edaa5c', light: '#fff0ce', edge: '#72d8e8', shade: '#164c59' },
};

function poseAt(phase, u, v, sheet) {
  const side = sheet % 2 ? 1 : -1;
  const tier = Math.floor(sheet / 2);
  const taper = Math.pow(Math.sin(Math.PI * u), .68);
  const spread = v * taper;
  const fold = Math.sin(v * Math.PI * .8 + tier * .48);
  let x, y, z;
  if (phase === 0) {
    // Nested, open folded shells; enough hollow space to coexist with project cards.
    const angle = (u - .5) * 4.7 + side * .45;
    const radius = 2.65 + v * .85 + tier * .22;
    x = Math.sin(angle) * radius;
    y = Math.cos(angle) * radius * .8 + (tier - 1.5) * .28;
    z = side * (.5 + fold * .9) + Math.sin(angle * 1.6) * .65;
  } else if (phase === 1) {
    // Pleated structural wings: broad sheets, not a wireframe polyhedron.
    x = side * (.25 + u * 3.8 + spread * .42);
    y = (u - .4) * 2.2 + spread * 1.2 + (tier - 1.5) * .42;
    z = Math.sin(u * Math.PI * 2 + v * 1.6 + tier * .65) * .8
      + Math.abs(v) * .6 + (tier - 1.5) * .31;
  } else if (phase === 2) {
    // The fullest pose: overlapping wings with a narrow warm waist and cool tips.
    x = side * (.17 + u * 3.75 + spread * .7);
    y = (u - .25) * (tier < 2 ? 2.6 : -2.2) + spread * 1.7;
    z = (tier - 1.5) * .48 + fold * (u + .45) + u * u * .9;
  } else if (phase === 3) {
    // A quiet, asymmetrical seed made from tightly wrapping membranes.
    const angle = v * 2.5 + tier * .68 + side * .5;
    const radius = taper * (1.65 + tier * .19);
    x = Math.cos(angle) * radius + Math.sin(u * Math.PI) * .35;
    y = (u - .5) * 6;
    z = Math.sin(angle) * radius + side * .14;
  } else if (phase === 4) {
    // Broad branching fan; each branch retains a visible curved surface.
    const angle = (sheet - 3.5) * .27 + v * .22;
    const radius = .35 + u * 4.7;
    x = Math.sin(angle) * radius;
    y = Math.cos(angle) * radius - 2.2;
    z = Math.sin(u * Math.PI + sheet * .38) * 1.1 + spread * .8;
  } else if (phase === 5) {
    // Two interleaving ribbons with translucent folds in depth.
    const angle = u * TAU * 1.05 + side * Math.PI * .5 + tier * .23;
    const radius = .72 + taper * .55 + v * .43;
    x = Math.cos(angle) * radius + spread * .55;
    y = (u - .5) * 6.8;
    z = Math.sin(angle) * radius + (tier - 1.5) * .28;
  } else {
    // An open invitation: several overlapping arcs with an unclosed centre.
    const angle = (u - .5) * 4.8 + .55;
    const radius = 2.2 + v * .65 + tier * .21;
    x = Math.cos(angle) * radius - .5;
    y = Math.sin(angle) * radius;
    z = fold * .72 + side * .48 + Math.sin(angle * 1.2) * .65;
  }
  // Small deterministic thickness gives each sheet a volume without loose noise.
  const thickness = Math.sin(u * 117 + v * 91 + sheet * 7) * .018;
  return [x, y, z + thickness];
}

const vertexShader = /* glsl */`
  attribute vec3 aPose0; attribute vec3 aPose1; attribute vec3 aPose2;
  attribute vec3 aPose3; attribute vec3 aPose4; attribute vec3 aPose5;
  attribute vec3 aPose6; attribute vec4 aSample;
  uniform float uPhase, uTime, uEnergy, uHeight, uDensity;
  uniform int uReadCount;
  uniform vec4 uReadRects[48];
  uniform vec2 uReadViewport;
  uniform float uReadFeather;
  varying float vCore, vFacing, vEdge, vSample, vDepth, vReading;
  vec3 pose(float n) {
    if(n < .5) return aPose0; if(n < 1.5) return aPose1;
    if(n < 2.5) return aPose2; if(n < 3.5) return aPose3;
    if(n < 4.5) return aPose4; if(n < 5.5) return aPose5;
    return aPose6;
  }
  void main() {
    float chapter = floor(uPhase);
    float f = smoothstep(0., 1., fract(uPhase));
    vec3 p = mix(pose(chapter), pose(min(6., chapter + 1.)), f);
    float breath = sin(uTime * .33 + aSample.z * .7);
    p *= 1. + breath * .012 * uEnergy;
    p.z += sin(aSample.x * 5. + uTime * .27 + aSample.z) * .065 * uEnergy;
    vec4 view = modelViewMatrix * vec4(p, 1.);
    gl_Position = projectionMatrix * view;
    // Render target height includes DPR, keeping the lattice equally fine on phones.
    gl_PointSize = clamp((1.65 + aSample.w * .5) * uDensity *
      (uHeight / 800.) * (20. / max(3., -view.z)), 1., 5.5);
    vCore = exp(-length(vec2(p.x * .62, (p.y + .6) * .88)) * .4);
    vFacing = clamp(.55 + p.z * .17, .1, 1.);
    vEdge = pow(abs(aSample.y), 3.) * .65 + aSample.x * .35;
    vSample = aSample.w;
    vDepth = view.z;
    vec2 screen = gl_Position.xy / gl_Position.w * .5 + .5;
    screen.y = 1. - screen.y;
    screen *= uReadViewport;
    vReading = 1.;
    for(int i = 0; i < 48; i++) {
      if(i >= uReadCount) break;
      vec2 distance = max(abs(screen - uReadRects[i].xy) - uReadRects[i].zw, vec2(0.));
      vReading = min(vReading, smoothstep(0., uReadFeather, length(distance)));
    }
  }
`;
const fragmentShader = /* glsl */`
  uniform vec3 uCore, uLight, uEdge, uShade;
  uniform float uOpacity, uDark;
  varying float vCore, vFacing, vEdge, vSample, vDepth, vReading;
  void main() {
    vec2 q = abs(gl_PointCoord - .5) * 2.;
    // Tiny cross samples, with a softened centre. The lattice describes the surface.
    float horizontal = (1. - smoothstep(.16, .42, q.y)) * (1. - smoothstep(.7, 1., q.x));
    float vertical = (1. - smoothstep(.16, .42, q.x)) * (1. - smoothstep(.7, 1., q.y));
    float coverage = max(horizontal, vertical);
    if(coverage < .035) discard;
    vec3 cool = mix(uShade, uEdge, .3 + vFacing * .5 + vEdge * .2);
    vec3 warm = mix(uCore, uLight, vFacing * .65);
    vec3 color = mix(cool, warm, smoothstep(.12, .8, vCore));
    color = mix(color, uLight, pow(vEdge, 4.) * vFacing * .23);
    float alpha = coverage * uOpacity * (.42 + vFacing * .38) * vReading;
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Synchronous, renderer-independent form. Units: radius <= 5; time: seconds;
 * phase: 0 shell, 1 structure, 2 wings, 3 seed, 4 fan, 5 braid, 6 open arc.
 * Points test depth but do not write it: opaque gallery cards occlude them.
 */
export function createLivingForm({ count = 24000, theme = 'light', system = 'organic' } = {}) {
  count = Math.round(clamp(Number(count) || 24000, 4000, 42000));
  const geometry = new THREE.BufferGeometry();
  const positions = Array.from({ length: 7 }, () => new Float32Array(count * 3));
  const samples = new Float32Array(count * 4);
  const perSheet = Math.ceil(count / 8);
  const columns = Math.ceil(Math.sqrt(perSheet));
  const rows = Math.ceil(perSheet / columns);
  for (let i = 0; i < count; i++) {
    const sheet = Math.min(7, Math.floor(i / perSheet));
    const local = i % perSheet;
    const u = ((local % columns) + .5) / columns;
    const v = ((Math.floor(local / columns) + .5) / rows) * 2 - 1;
    for (let phase = 0; phase < 7; phase++) positions[phase].set(poseAt(phase, u, v, sheet), i * 3);
    samples.set([u, v, sheet, .5 + .5 * Math.sin(i * 2.39996323)], i * 4);
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions[0], 3));
  for (let n = 0; n < 7; n++) geometry.setAttribute(`aPose${n}`, new THREE.BufferAttribute(positions[n], 3));
  geometry.setAttribute('aSample', new THREE.BufferAttribute(samples, 4));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 5.45);
  const uniforms = {
    uTime: { value: 0 }, uPhase: { value: 0 }, uEnergy: { value: 1 },
    uOpacity: { value: 1 }, uHeight: { value: 800 }, uDark: { value: 0 },
    uDensity: { value: Math.sqrt(24000 / count) },
    uCore: { value: new THREE.Color() }, uLight: { value: new THREE.Color() },
    uEdge: { value: new THREE.Color() }, uShade: { value: new THREE.Color() },
    uReadCount: { value: 0 }, uReadRects: { value: Array.from({ length: 48 }, () => new THREE.Vector4()) },
    uReadViewport: { value: new THREE.Vector2(1, 1) }, uReadFeather: { value: 64 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader, fragmentShader, transparent: true,
    depthTest: true, depthWrite: false, blending: THREE.NormalBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.rotation.set(.14, -.38, .08);
  points.name = 'Living form — folded sample volume';
  const targetSize = new THREE.Vector2();
  points.onBeforeRender = renderer => {
    renderer.getDrawingBufferSize(targetSize);
    uniforms.uHeight.value = targetSize.y;
  };
  const object = new THREE.Group();
  object.name = 'Living form';
  object.add(points);
  let disposed = false;
  function setPalette({ theme: nextTheme = theme, system: nextSystem = system } = {}) {
    theme = nextTheme; system = nextSystem;
    const dark = theme === 'dark';
    const palette = palettes[dark ? 'dark' : 'light'];
    const monochrome = system === 'mono';
    for (const name of ['core', 'light', 'edge', 'shade']) {
      const color = uniforms[`u${name[0].toUpperCase()}${name.slice(1)}`].value;
      color.set(palette[name]);
      if (monochrome) {
        const luminance = color.r * .2126 + color.g * .7152 + color.b * .0722;
        color.setRGB(luminance, luminance, luminance);
      }
    }
    uniforms.uDark.value = dark ? 1 : 0;
  }
  setPalette();
  return {
    object,
    update({ time = 0, phase = 0, energy = 1, opacity = 1 } = {}) {
      if (disposed) return;
      uniforms.uTime.value = Number.isFinite(time) ? time : 0;
      uniforms.uPhase.value = clamp(Number.isFinite(phase) ? phase : 0, 0, 6);
      uniforms.uEnergy.value = clamp(Number.isFinite(energy) ? energy : 1, 0, 2);
      uniforms.uOpacity.value = clamp(Number.isFinite(opacity) ? opacity : 1);
      points.visible = uniforms.uOpacity.value > .002;
    },
    setPalette,
    // Optional standalone-page clearance. Gallery consumers leave this empty and
    // rely on their genuine card geometry for depth occlusion.
    setReadingRegions({ rects = [], width = 1, height = 1, feather = 64 } = {}) {
      if (disposed) return;
      width = Math.max(1, width); height = Math.max(1, height); feather = Math.max(1, feather);
      const fitted = fitReadingRegions(rects, width, height, feather);
      uniforms.uReadViewport.value.set(width, height);
      uniforms.uReadFeather.value = feather;
      uniforms.uReadCount.value = fitted.length;
      fitted.forEach((rect, index) => uniforms.uReadRects.value[index].set(
        rect.left + rect.width / 2, rect.top + rect.height / 2, rect.width / 2, rect.height / 2,
      ));
    },
    dispose() {
      if (disposed) return;
      disposed = true; object.remove(points); geometry.dispose(); material.dispose();
      points.onBeforeRender = () => {};
    },
  };
}

// Positions are fractions of viewport size, leaving space for each chapter's copy.
const chapters = [
  { x: .72, y: .55, scale: 1.15, opacity: 0 },
  { x: .5, y: .55, scale: 1.05, opacity: .42 },
  { x: .49, y: .73, scale: 1.42, opacity: .95 },
  { x: .48, y: .28, scale: 1.35, opacity: .95 },
  { x: .18, y: .53, scale: 1.2, opacity: .88 },
  { x: .29, y: .76, scale: 1.28, opacity: .9 },
  { x: .78, y: .27, scale: 1.34, opacity: .92 },
  { x: .5, y: .62, scale: 1.45, opacity: .95 },
];
const maskSelector = [
  'h1', 'h2', 'h3', 'h4', 'p', 'li', 'dt', 'dd', 'label', 'input', 'textarea',
  'button', 'a', 'summary', '.section-label', '.experience-meta', '.film-caption',
  '.small-note', '.about-copy > .mono', 'footer > span', '.photo-note',
  'img', 'video', 'canvas', '.control-demo', '.proposal', '.time-art', '.inquiry-draft',
].join(',');

/** Fixed transparent overlay; sections must be hero, work, play, films, about,
 * experience, method, contact, in that order. It never captures input/scroll.
 * refresh() invalidates layout caches after content changes. Pause stops ambient
 * animation; scroll still chooses a static chapter so reading remains usable.
 */
export function createLivingSpace({ container, sections = [] } = {}) {
  if (!(container instanceof HTMLElement)) throw new TypeError('Living space needs a container element.');
  const empty = { setPaused() {}, refresh() {}, dispose() {} };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = matchMedia('(forced-colors: active)');
  container.classList.add('living-space');
  container.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas');
  canvas.className = 'living-space-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  container.append(canvas);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false,
      powerPreference: 'low-power', premultipliedAlpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  } catch {
    container.dataset.state = 'unavailable'; canvas.remove();
    return { ...empty, dispose() { container.classList.remove('living-space'); delete container.dataset.state; } };
  }
  const root = document.documentElement;
  const workExplorer = document.querySelector('#work-explorer');
  const originalLight = ['--space-light-x', '--space-light-y'].map(name => [
    name, root.style.getPropertyValue(name), root.style.getPropertyPriority(name),
  ]);
  const initialMobile = innerWidth < 700;
  const form = createLivingForm({ count: initialMobile ? 13000 : 26000,
    theme: root.dataset.theme || 'light', system: root.dataset.designSystem || 'organic' });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 80);
  camera.position.z = 24;
  const anchor = new THREE.Group();
  anchor.add(form.object); scene.add(anchor);
  // These meshes write only depth. They come from real DOM rectangles, not a
  // second approximation of the page layout, and keep all reading surfaces clear.
  const maskMaterial = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true,
    depthTest: true, side: THREE.DoubleSide });
  const maskGeometry = new THREE.PlaneGeometry(1, 1);
  const masks = Array.from({ length: initialMobile ? 42 : 64 }, () => {
    const mesh = new THREE.Mesh(maskGeometry, maskMaterial);
    mesh.renderOrder = -1000; mesh.visible = false; mesh.position.z = 7.5;
    scene.add(mesh); return mesh;
  });
  let disposed = false, paused = false, contextLost = false, raf = 0;
  let width = 1, height = 1, lastFrame = 0, time = 0, lastScroll = scrollY;
  let layoutDirty = true, scrollDirty = true, renderDirty = true, bounds = [], rects = [], readingRects = [];
  let currentPhase = 0, currentOpacity = 0, energy = .65;
  const cleanups = [];
  const listen = (target, event, callback, options) => {
    target.addEventListener(event, callback, options);
    cleanups.push(() => target.removeEventListener(event, callback, options));
  };
  function refresh() { if (disposed) return; layoutDirty = true; renderDirty = true; requestFrame(); }
  function resize() {
    width = Math.max(1, innerWidth); height = Math.max(1, innerHeight);
    const dpr = Math.min(devicePixelRatio || 1, 1.65, Math.sqrt(2300000 / (width * height)));
    renderer.setPixelRatio(Math.max(.25, dpr)); renderer.setSize(width, height, false);
    camera.aspect = width / height; camera.updateProjectionMatrix();
    layoutDirty = true; scrollDirty = true; renderDirty = true;
  }
  function measure() {
    const sy = scrollY;
    bounds = sections.map((element, index) => {
      const r = element.getBoundingClientRect();
      return { top: r.top + sy, bottom: r.bottom + sy,
        at: Math.max(0, r.top + sy + Math.max(0, r.height - height) * .5), index };
    });
    const found = [];
    const reading = [];
    // Hero is unchanged. Work masks remain available for Cards and List views.
    for (const section of sections.slice(1)) {
      for (const element of section.querySelectorAll(maskSelector)) {
        if (element.closest('[hidden]')) continue;
        const media = element.matches('img,video,canvas,.control-demo,.proposal,.time-art,.inquiry-draft');
        if (!media && element.closest('[aria-hidden="true"]')) continue;
        const r = element.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        // Don't double-mask links and labels already protected by a text parent.
        if (element.matches('a,button,label') && element.closest('p,li,h1,h2,h3,summary')) continue;
        if (media) {
          found.push({ top: r.top + sy, left: r.left + scrollX, width: r.width, height: r.height,
            padding: 1, media: true });
        } else if (!element.closest('.control-demo,.proposal,.time-art,.inquiry-draft')) {
          // Range rectangles follow actual lines rather than a full-width block.
          // Their softly feathered clearance avoids rectangular holes in the form.
          const range = document.createRange();
          range.selectNodeContents(element);
          const lines = [...range.getClientRects()];
          if (!lines.length) lines.push(r);
          for (const line of lines) {
            if (line.width < 2 || line.height < 2) continue;
            reading.push({ top: line.top + sy, left: line.left + scrollX, width: line.width, height: line.height });
          }
        }
      }
    }
    const seenLines = new Set();
    rects = found;
    readingRects = reading.filter(rect => {
      const key = [rect.left, rect.top, rect.width, rect.height].join(':');
      if (seenLines.has(key)) return false;
      seenLines.add(key); return true;
    });
    layoutDirty = false; scrollDirty = true;
  }
  function placeMasks() {
    const worldHeight = 2 * (camera.position.z - 7.5) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const units = worldHeight / height;
    let used = 0;
    // Media/panels first; overlapping text masks are harmless depth writes.
    const visible = rects.filter(r => r.top + r.height > scrollY && r.top < scrollY + height);
    visible.sort((a, b) => Number(b.media) - Number(a.media));
    for (const r of visible) {
      if (used === masks.length) break;
      const mask = masks[used++]; const pad = r.padding;
      const left = r.left - scrollX, top = r.top - scrollY;
      mask.position.x = (left + r.width / 2 - width / 2) * units;
      mask.position.y = -(top + r.height / 2 - height / 2) * units;
      mask.scale.set((r.width + pad * 2) * units, (r.height + pad * 2) * units, 1);
      mask.visible = true;
    }
    for (; used < masks.length; used++) masks[used].visible = false;
    const feather = width < 700 ? 38 : 64;
    form.setReadingRegions({
      rects: readingRects.filter(r => r.top + r.height > scrollY - feather && r.top < scrollY + height + feather)
        .map(r => ({ ...r, left: r.left - scrollX, top: r.top - scrollY })),
      width, height, feather,
    });
  }
  function placeForm() {
    if (!bounds.length) { currentOpacity = 0; return; }
    let index = 0;
    while (index < bounds.length - 1 && scrollY >= bounds[index + 1].at) index++;
    const next = Math.min(index + 1, bounds.length - 1);
    const span = Math.max(1, bounds[next].at - bounds[index].at);
    const progress = next === index ? 0 : smooth((scrollY - bounds[index].at) / span);
    const staticMode = paused || reduced.matches;
    const t = staticMode ? (progress < .5 ? 0 : 1) : progress;
    const a = chapters[Math.min(index, 7)], b = chapters[Math.min(next, 7)];
    const worldHeight = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const x = mix(a.x, b.x, t);
    // On phones, the form occupies the whole composition at a smaller scale;
    // depth masks protect the full-width reading and media columns.
    const px = width < 700 ? mix(.5, x, .45) : x;
    anchor.position.set((px - .5) * worldHeight * camera.aspect, (.5 - mix(a.y, b.y, t)) * worldHeight, 0);
    anchor.scale.setScalar(mix(a.scale, b.scale, t) * (width < 700 ? .82 : 1));
    currentPhase = clamp(index - 1 + t, 0, 6);
    currentOpacity = mix(a.opacity, b.opacity, t);
    // The 3D gallery owns the light in Work. Cards/List keep a restrained pose.
    const work = bounds[1], hero = bounds[0];
    if (work && workExplorer?.dataset.view === 'gallery') {
      currentOpacity *= 1 - smooth((work.bottom - scrollY) / (height * .3));
    }
    if (hero && hero.bottom - scrollY > height * .04) currentOpacity = 0;
    root.style.setProperty('--space-light-x', `${Math.round(px * 100)}%`);
    root.style.setProperty('--space-light-y', `${Math.round(mix(a.y, b.y, t) * 100)}%`);
    placeMasks(); scrollDirty = false;
  }
  function syncPalette() {
    form.setPalette({ theme: root.dataset.theme || 'light', system: root.dataset.designSystem || 'organic' });
    // Design choices can change fonts/line wrapping inside fixed-height chapters.
    layoutDirty = true; renderDirty = true; requestFrame();
  }
  function requestFrame() {
    if (!disposed && !contextLost && !document.hidden && !forced.matches && !raf) raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    raf = 0;
    if (disposed || contextLost || document.hidden || forced.matches) return;
    const elapsed = lastFrame ? Math.min(.08, (now - lastFrame) / 1000) : 0;
    const moving = !paused && !reduced.matches;
    // Uniform-only animation at 30fps. DOM layout is read only when invalidated.
    if (!renderDirty && !layoutDirty && !scrollDirty && elapsed < 1 / 30) { requestFrame(); return; }
    lastFrame = now;
    if (moving) time += elapsed;
    if (layoutDirty) measure();
    if (scrollDirty) {
      const speed = Math.min(1, Math.abs(scrollY - lastScroll) / Math.max(1, height * .12));
      energy = .65 + speed * .8; lastScroll = scrollY; placeForm();
    } else energy = mix(energy, .65, .05);
    form.object.rotation.set(Math.sin(time * .11) * .045, Math.sin(time * .09) * .16, Math.sin(time * .07) * .035);
    form.update({ time, phase: currentPhase, energy: moving ? energy : 0, opacity: currentOpacity });
    renderer.render(scene, camera); renderDirty = false;
    if (moving && currentOpacity > .002) requestFrame();
  }
  listen(window, 'scroll', () => { scrollDirty = true; renderDirty = true; requestFrame(); }, { passive: true });
  listen(window, 'resize', () => { resize(); requestFrame(); }, { passive: true });
  listen(window, 'themechange', syncPalette);
  listen(window, 'visualsystemchange', syncPalette);
  listen(document, 'toggle', refresh, true);
  listen(document, 'visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else { lastFrame = 0; renderDirty = true; requestFrame(); }
  });
  const mediaChange = () => {
    cancelAnimationFrame(raf); raf = 0; lastFrame = 0; scrollDirty = true; renderDirty = true;
    container.dataset.state = forced.matches ? 'forced-colors' : 'ready'; requestFrame();
  };
  listen(reduced, 'change', mediaChange); listen(forced, 'change', mediaChange);
  listen(canvas, 'webglcontextlost', event => {
    event.preventDefault(); contextLost = true; cancelAnimationFrame(raf); raf = 0;
    container.dataset.state = 'unavailable';
  });
  listen(canvas, 'webglcontextrestored', () => {
    contextLost = false; container.dataset.state = 'ready'; lastFrame = 0; resize(); refresh();
  });
  const observer = new ResizeObserver(refresh);
  for (const section of sections) observer.observe(section);
  const paletteObserver = new MutationObserver(syncPalette);
  paletteObserver.observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-design-system'] });
  const viewObserver = new MutationObserver(refresh);
  if (workExplorer) viewObserver.observe(workExplorer, {
    attributes: true, attributeFilter: ['data-view', 'data-presentation'],
  });
  const selection = document.querySelector('#work-selection');
  if (selection) viewObserver.observe(selection, { childList: true, characterData: true, subtree: true });
  document.fonts?.ready.then(() => { if (!disposed) refresh(); });
  resize(); container.dataset.state = forced.matches ? 'forced-colors' : 'ready'; requestFrame();
  return {
    setPaused(value) {
      if (disposed) return;
      paused = Boolean(value); lastFrame = 0; scrollDirty = true; renderDirty = true;
      cancelAnimationFrame(raf); raf = 0; requestFrame();
    },
    refresh,
    dispose() {
      if (disposed) return;
      disposed = true; cancelAnimationFrame(raf); cleanups.forEach(cleanup => cleanup());
      observer.disconnect(); paletteObserver.disconnect(); viewObserver.disconnect(); form.dispose();
      maskGeometry.dispose(); maskMaterial.dispose(); renderer.dispose(); canvas.remove();
      for (const [name, value, priority] of originalLight) {
        if (value) root.style.setProperty(name, value, priority);
        else root.style.removeProperty(name);
      }
      container.classList.remove('living-space'); delete container.dataset.state;
    },
  };
}
