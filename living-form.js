import * as THREE from './assets/vendor/three/three.module.min.js';

// Both page and gallery import one module-level budget, even if a resize occurs
// between their initialization. An existing instance never rebuilds on resize.
export const STUDY_SAMPLE_COUNT = typeof window !== 'undefined' && window.innerWidth <= 720 ? 20000 : 32000;

// Original section studies. Eight distinct silhouettes share one ordered pixel
// lattice and material. These are visual interpretations, not biographical claims.
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const TAU = Math.PI * 2;
const POSE_NAMES = ['Unfolding volume', 'Portal scaffold', 'Open brackets', 'Aperture',
  'Branching canopy', 'Woven paths', 'Connected stages', 'Open ripple arch'];
const BRANCH_ENDS = [[-3, 2.35], [-1.8, 3.05], [-.55, 3.5], [.7, 3.35], [2, 2.85], [3.15, 1.95]];
const PALETTES = {
  light: { core: '#be7226', light: '#f0d5a8', edge: '#228f9f', shade: '#254b50' },
  dark: { core: '#f0a040', light: '#fff1d0', edge: '#45d5e7', shade: '#163b47' },
};

function fitReadingRegions(rects, width, height, feather) {
  if (rects.length <= 48) return rects;
  // Exact, bounded coverage: if a viewport has >48 line boxes, coalesce them
  // spatially, retaining every visible line rather than dropping the tail.
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

function sampleSurface(target, offset, u, v, sheet, phase) {
  const side = sheet % 2 ? 1 : -1;
  const angle = v * Math.PI;
  let x = 0, y = 0, z = 0;
  if (phase === 0) {
    // One closed membrane follows a spatial knot. Eight adjacent sectors form
    // its cross-section, rather than eight disconnected ribbons or cut ends.
    const t = u * TAU, c2 = Math.cos(2 * t), s2 = Math.sin(2 * t);
    const c3 = Math.cos(3 * t), s3 = Math.sin(3 * t), radius = 2 + c3;
    const cx = radius * c2 * .93, cy = radius * s2 * .82, cz = s3 * 1.14;
    let tx = (-3 * s3 * c2 - 2 * radius * s2) * .93;
    let ty = (-3 * s3 * s2 + 2 * radius * c2) * .82;
    let tz = 3 * c3 * 1.14;
    const tangentLength = Math.hypot(tx, ty, tz);
    tx /= tangentLength; ty /= tangentLength; tz /= tangentLength;
    const planarLength = Math.hypot(tx, ty), nx = -ty / planarLength, ny = tx / planarLength;
    const bx = -tz * ny, by = tz * nx, bz = tx * ny - ty * nx;
    const cross = (sheet + (v + 1) * .5) * TAU / 8;
    const membrane = .48 + .09 * Math.cos(3 * t + cross * 2);
    const alongNormal = Math.cos(cross) * membrane, alongBinormal = Math.sin(cross) * membrane * 1.3;
    const px = cx + nx * alongNormal + bx * alongBinormal;
    const py = cy + ny * alongNormal + by * alongBinormal;
    const pz = cz + bz * alongBinormal;
    // An oblique presentation exposes the folds and their front/back crossings.
    x = px * .97014 + pz * .24254;
    const tiltedZ = -px * .24254 + pz * .97014;
    y = py * .98007 - tiltedZ * .19867; z = py * .19867 + tiltedZ * .98007;
  } else if (phase === 1) {
    // Two rectilinear frames in depth: a scaffold/portal around an empty centre.
    const back = sheet >= 4, beam = sheet % 4;
    const halfWidth = back ? 2.48 : 3.05, halfHeight = back ? 2.12 : 2.62;
    const radius = back ? .17 : .22;
    z = (back ? -1.05 : .8) + Math.sin(angle) * radius;
    if (beam < 2) {
      x = (beam ? 1 : -1) * halfWidth + Math.cos(angle) * radius;
      y = (u * 2 - 1) * halfHeight;
    } else {
      x = (u * 2 - 1) * halfWidth;
      y = (beam === 2 ? 1 : -1) * halfHeight + Math.cos(angle) * radius;
    }
  } else if (phase === 2) {
    // Two separated cups/brackets leave a visible gap for agency and choice.
    const layer = Math.floor(sheet / 2), a = (u - .5) * Math.PI * 1.12;
    const radius = 1.55 + layer * .12;
    x = side * (.88 + Math.cos(a) * radius + v * .23 * Math.cos(a));
    y = Math.sin(a) * 2.56 + v * .15 * Math.sin(a);
    z = (layer - 1.5) * .3 + v * .78 + Math.cos(a) * v * v * .28;
  } else if (phase === 3) {
    // Eight curved aperture blades, with an open lens at their centre.
    const radial = (v + 1) * .5;
    const a = (sheet + u) * TAU / 8 + radial * .28;
    const radius = 1.05 + radial * 2.22;
    x = Math.cos(a) * radius; y = Math.sin(a) * radius;
    z = (1 - radial) * .65 + Math.sin(u * Math.PI) * .42 + side * .14;
  } else if (phase === 4) {
    // A shared trunk branches upward; two lower roots keep the silhouette grounded.
    let cx, cy, tx, ty, radius;
    if (sheet < 6) {
      const end = BRANCH_ENDS[sheet];
      cx = end[0] * Math.pow(u, 1.75); cy = -2.8 + (end[1] + 2.8) * u;
      tx = end[0] * 1.75 * Math.pow(u, .75); ty = end[1] + 2.8;
      radius = .14 + Math.sin(Math.PI * u) * u * .5;
      z = Math.sin(Math.PI * u) * (sheet - 2.5) * .22;
    } else {
      cx = side * 2.05 * Math.pow(u, 1.2); cy = -2.6 - u * .8;
      tx = side * 2.46 * Math.pow(u, .2); ty = -.8;
      radius = .17 * (1 - u * .65); z = Math.sin(Math.PI * u) * .18;
    }
    const length = Math.hypot(tx, ty);
    x = cx - ty / length * Math.cos(angle) * radius;
    y = cy + tx / length * Math.cos(angle) * radius;
    z += Math.sin(angle) * radius * .8;
  } else if (phase === 5) {
    // Horizontal interleaving paths cross in depth rather than sharing a tree trunk.
    const lane = (sheet - 3.5) * .48, wave = u * TAU + sheet * .74;
    x = -3.85 + u * 7.7;
    y = lane * Math.cos(u * Math.PI) + Math.sin(wave) * .66 + v * .24;
    z = Math.sin(u * TAU * 1.5 + sheet * .8) * .78 + Math.sin(v * Math.PI * .65) * .2;
  } else if (phase === 6) {
    // Three separate rounded modules, joined by two short physical bridges.
    if (sheet < 6) {
      const stage = Math.floor(sheet / 2), px = u * 2 - 1;
      x = (stage - 1) * 2.7 + px * .94 * Math.sqrt(1 - .18 * v * v);
      y = v * .97 * Math.sqrt(1 - .18 * px * px);
      z = side * (.2 + Math.sin(Math.PI * u) * Math.cos(v * Math.PI / 2) * .3);
    } else {
      x = (sheet === 6 ? -1.76 : .94) + u * .82;
      y = Math.cos(angle) * .13; z = Math.sin(angle) * .13;
    }
  } else {
    // Concentric arcs open toward the viewer/bottom: an invitation, not a closed lens.
    const radius = 1.08 + sheet * .32 + Math.cos(angle) * .09;
    const a = (u - .5) * 4.3;
    x = Math.sin(a) * radius; y = Math.cos(a) * radius - .4;
    z = (sheet - 3.5) * .14 + Math.sin(angle) * .12;
  }
  target[offset] = x; target[offset + 1] = y; target[offset + 2] = z;
}

function samplingGrid(phase, sheet, count) {
  // Approximate physical arc lengths of each patch's two parameter directions.
  // A square UV grid on a 13×.7 ribbon produces ribs; these grids keep pixel
  // intervals comparable in both directions while retaining regular spacing.
  let length = 1, width = 1;
  if (phase === 0) {
    length = 29.8; width = .47;
    // Keep each narrow sector almost rectangular, including the20k budget.
    // Clamping columns first can leave a final row with only a few pixels,
    // creating an artificial seam along an otherwise closed membrane.
    const rows = Math.max(4, Math.round(Math.sqrt(count * width / length)));
    return { columns: Math.ceil(count / rows), rows };
  }
  else if (phase === 1) {
    const back = sheet >= 4, vertical = sheet % 4 < 2;
    length = back ? (vertical ? 4.24 : 4.96) : (vertical ? 5.24 : 6.1);
    width = TAU * (back ? .17 : .22);
  } else if (phase === 2) { length = 7.5; width = 1.7; }
  else if (phase === 3) { length = 1.7; width = 2.3; }
  else if (phase === 4) {
    if (sheet < 6) { length = Math.hypot(BRANCH_ENDS[sheet][0], BRANCH_ENDS[sheet][1] + 2.8) * 1.04; width = TAU * .22; }
    else { length = 2.3; width = TAU * .114; }
  } else if (phase === 5) { length = 8.8; width = .62; }
  else if (phase === 6) { length = sheet < 6 ? 1.88 : .82; width = sheet < 6 ? 1.94 : TAU * .13; }
  else { length = (1.08 + sheet * .32) * 4.3; width = .663; }
  const columns = Math.round(clamp(Math.sqrt(count * length / width), 8, Math.max(8, Math.floor(count / 8))));
  return { columns, rows: Math.ceil(count / columns) };
}

function buildGeometry(count) {
  const positions = Array.from({ length: POSE_NAMES.length }, () => new Float32Array(count * 3));
  const normals = Array.from({ length: POSE_NAMES.length }, () => new Float32Array(count * 3));
  const samples = new Float32Array(count * 3);
  const perSheet = Math.ceil(count / 8);
  const sampling = Array.from({ length: POSE_NAMES.length }, (_, phase) =>
    Array.from({ length: 8 }, (_, sheet) => samplingGrid(phase, sheet, Math.min(perSheet, count - sheet * perSheet))));
  for (let i = 0; i < count; i++) {
    const sheet = Math.min(7, Math.floor(i / perSheet)), local = i % perSheet;
    for (let phase = 0; phase < POSE_NAMES.length; phase++) {
      const { columns, rows } = sampling[phase][sheet];
      const u = ((local % columns) + .5) / columns;
      const v = ((Math.floor(local / columns) + .5) / rows) * 2 - 1;
      sampleSurface(positions[phase], i * 3, u, v, sheet, phase);
      if (phase === 0) samples.set([u, v, sheet], i * 3);
    }
  }
  let maxRadius = 0;
  for (let phase = 0; phase < POSE_NAMES.length; phase++) {
    const p = positions[phase], n = normals[phase];
    for (let i = 0; i < count; i++) {
      const sheet = Math.min(7, Math.floor(i / perSheet)), local = i % perSheet;
      const { columns } = sampling[phase][sheet];
      const start = sheet * perSheet, end = Math.min(count, start + perSheet), column = local % columns;
      const before = (column > 0 ? i - 1 : i) * 3;
      const after = (column < columns - 1 && i + 1 < end ? i + 1 : i) * 3;
      const below = (i - columns >= start ? i - columns : i) * 3;
      const above = (i + columns < end ? i + columns : i) * 3;
      const ux = p[after] - p[before], uy = p[after + 1] - p[before + 1], uz = p[after + 2] - p[before + 2];
      const vx = p[above] - p[below], vy = p[above + 1] - p[below + 1], vz = p[above + 2] - p[below + 2];
      const direction = phase === 0 ? -1 : sheet % 2 ? 1 : -1;
      let nx = (uy * vz - uz * vy) * direction;
      let ny = (uz * vx - ux * vz) * direction;
      let nz = (ux * vy - uy * vx) * direction;
      const length = Math.hypot(nx, ny, nz);
      if (length < 1e-7) { nx = 0; ny = 0; nz = 1; }
      else { nx /= length; ny /= length; nz /= length; }
      n.set([nx, ny, nz], i * 3);
      maxRadius = Math.max(maxRadius, Math.hypot(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]));
    }
  }
  const geometry = new THREE.BufferGeometry();
  // Only five GPU attributes are active. Cache eight poses on the CPU, then
  // copy two adjacent poses/normals into stable GPU buffers at chapter changes.
  // Stable BufferAttributes also ensure geometry.dispose releases every buffer.
  const active = ['position', 'aPoseNext', 'aNormal', 'aNormalNext'].map(name => {
    const attribute = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
    attribute.setUsage(THREE.DynamicDrawUsage); geometry.setAttribute(name, attribute);
    return attribute;
  });
  geometry.setAttribute('aSample', new THREE.BufferAttribute(samples, 3));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), maxRadius * 1.035 + .22);
  let currentChapter = -1;
  function selectPhase(phase) {
    const chapter = Math.floor(clamp(phase, 0, POSE_NAMES.length - 1));
    if (chapter === currentChapter) return;
    currentChapter = chapter;
    const next = Math.min(POSE_NAMES.length - 1, chapter + 1);
    const data = [positions[chapter], positions[next], normals[chapter], normals[next]];
    active.forEach((attribute, index) => {
      attribute.array.set(data[index]); attribute.needsUpdate = true;
    });
  }
  selectPhase(0);
  return { geometry, selectPhase, sampling, release() { positions.length = 0; normals.length = 0; } };
}

const vertexShader = /* glsl */`
  attribute vec3 aPoseNext, aNormal, aNormalNext;
  attribute vec3 aSample;
  uniform float uPhase, uMorph, uIntro, uTime, uEnergy, uHeight, uPixelStep;
  uniform int uReadCount;
  uniform vec4 uReadRects[48];
  uniform vec2 uReadViewport;
  uniform float uReadFeather;
  varying float vWarm, vLight, vRim, vDepth, vReading;
  void main() {
    // The CPU selects adjacent buffers and sends their fraction separately.
    // fract(fullPhase) can wrap to0 when float32 rounds6.99999999 up to7.
    float t = uMorph;
    float f = clamp(t * t * t * (t * (t * 6. - 15.) + 10.), 0., 1.);
    vec3 p = mix(position, aPoseNext, f);
    vec3 blendedNormal = mix(aNormal, aNormalNext, f);
    vec3 n = length(blendedNormal) > .0001 ? normalize(blendedNormal) : aNormal;
    // The intro acts only when explicitly requested by the page. Its endpoint
    // is exactly the shared geometry; galleries default to uIntro=1.
    if (uIntro < 1.) {
      float gather = smoothstep(0., .18, uIntro);
      float unfold = smoothstep(.14, .94, uIntro);
      float latitude = aSample.x * 3.14159265;
      float longitude = (aSample.z + (aSample.y + 1.) * .5) * .78539816;
      vec3 seedNormal = vec3(sin(latitude) * cos(longitude), cos(latitude), sin(latitude) * sin(longitude));
      vec3 seed = seedNormal * mix(.76, .25, gather);
      float twist = (1. - unfold) * (1.1 + p.y * .37);
      mat2 turn = mat2(cos(twist), sin(twist), -sin(twist), cos(twist));
      p.xz = turn * p.xz; n.xz = turn * n.xz;
      p = mix(seed, p, unfold);
      vec3 formingNormal = mix(seedNormal, n, unfold);
      n = length(formingNormal) > .0001 ? normalize(formingNormal) : n;
    }
    float breath = sin(uTime * .26);
    p *= 1. + breath * .008 * uEnergy;
    p.z += sin(aSample.x * 6.28318531 + uTime * .2) * .025 * uEnergy;
    float searching = 1. - smoothstep(0., .85, uPhase);
    float sector = (aSample.z + (aSample.y + 1.) * .5) * .78539816;
    p.x += sin(uTime * .16 + aSample.x * 6.28318531 + sector) * .055 * uEnergy * searching;
    p.y += cos(uTime * .13 + aSample.x * 6.28318531 + sector) * .045 * uEnergy * searching;
    vec4 view = modelViewMatrix * vec4(p, 1.);
    gl_Position = projectionMatrix * view;
    vec3 normalView = normalize(normalMatrix * n);
    vec3 eye = normalize(-view.xyz);
    vec3 key = normalize(vec3(-.35, .68, 1.));
    float diffuse = max(dot(normalView, key), 0.);
    float transmission = max(dot(-normalView, key), 0.) * .28;
    float facing = abs(dot(normalView, eye));
    vRim = pow(1. - facing, 2.2);
    vLight = .25 + diffuse * .6 + transmission;
    vDepth = smoothstep(-1.7, 2.2, p.z);
    vWarm = clamp(exp(-length(vec2(p.x * .7, p.y + .4)) * .38) * 1.35 - .18, 0., 1.);
    float worldScale = length(modelViewMatrix[0].xyz);
    gl_PointSize = clamp(uPixelStep * worldScale * (uHeight / 800.) *
      (20. / max(3., -view.z)), 1., 7.);
    vec2 screen = gl_Position.xy / gl_Position.w * .5 + .5;
    screen.y = 1. - screen.y;
    screen *= uReadViewport;
    vReading = 1.;
    for(int i = 0; i < 48; i++) {
      if(i >= uReadCount) break;
      vec2 gap = max(abs(screen - uReadRects[i].xy) - uReadRects[i].zw, vec2(0.));
      vReading = min(vReading, smoothstep(0., uReadFeather, length(gap)));
    }
  }
`;
const fragmentShader = /* glsl */`
  uniform vec3 uCore, uLight, uEdge, uShade;
  uniform float uOpacity, uDark;
  varying float vWarm, vLight, vRim, vDepth, vReading;
  void main() {
    vec2 q = abs(gl_PointCoord - .5) * 2.;
    // A soft-edged square micro-pixel, never a cross, disc, streak or noise sprite.
    float coverage = 1. - smoothstep(.68, .98, max(q.x, q.y));
    if(coverage < .025 || vReading < .002) discard;
    vec3 cool = mix(uShade, uEdge, .27 + vLight * .52 + vRim * .2);
    vec3 warm = mix(uCore, uLight, clamp(vLight * .38 + vRim * .12, 0., 1.));
    vec3 body = mix(cool, warm, smoothstep(.05, .86, vWarm));
    body = mix(uShade, body, .58 + vDepth * .42);
    vec3 rim = mix(uEdge, uLight, vWarm * .7);
    body = mix(body, rim, vRim * (.17 + uDark * .06));
    float alpha = coverage * uOpacity * (.35 + vLight * .24 + vDepth * .12) * vReading;
    gl_FragColor = vec4(body, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Shared synchronous material factory, independent of a renderer or DOM.
 * time is seconds; phase0..7 follows POSE_NAMES with matched sample indices.
 * Hero uses0, Work1, then sections2..7. Object transforms begin at identity.
 * update({intro}) optionally forms a seed into the volume; default1 is complete.
 * Opaque scene geometry naturally occludes points: depthTest true, depthWrite false.
 */
export function createLivingForm({ count = 60000, theme = 'light', system = 'organic' } = {}) {
  count = Math.round(clamp(Number(count) || 60000, 8000, 80000));
  const { geometry, selectPhase, sampling, release } = buildGeometry(count);
  const uniforms = {
    uTime: { value: 0 }, uPhase: { value: 0 }, uMorph: { value: 0 }, uIntro: { value: 1 }, uEnergy: { value: 1 }, uOpacity: { value: 1 },
    uHeight: { value: 800 }, uPixelStep: { value: Math.sqrt(60000 / count) }, uDark: { value: 0 },
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
  points.name = 'Section pixel lattice';
  const targetSize = new THREE.Vector2();
  points.onBeforeRender = renderer => {
    renderer.getDrawingBufferSize(targetSize);
    uniforms.uHeight.value = targetSize.y;
  };
  const object = new THREE.Group();
  object.name = 'Original living material study';
  object.userData.livingForm = { sampleCount: count, poseCount: POSE_NAMES.length,
    poseNames: [...POSE_NAMES], radius: geometry.boundingSphere.radius, sampling };
  object.add(points);
  let disposed = false;
  function setPalette({ theme: nextTheme = theme, system: nextSystem = system } = {}) {
    if (disposed) return;
    theme = nextTheme; system = nextSystem;
    const palette = PALETTES[theme === 'dark' ? 'dark' : 'light'];
    for (const name of ['core', 'light', 'edge', 'shade']) {
      const color = uniforms[`u${name[0].toUpperCase()}${name.slice(1)}`].value;
      color.set(palette[name]);
      if (system === 'mono') {
        const luminance = color.r * .2126 + color.g * .7152 + color.b * .0722;
        color.setRGB(luminance, luminance, luminance);
      }
    }
    uniforms.uDark.value = theme === 'dark' ? 1 : 0;
  }
  setPalette();
  return {
    object,
    update({ time = 0, phase = 0, energy = 1, opacity = 1, intro = 1 } = {}) {
      if (disposed) return;
      uniforms.uTime.value = Number.isFinite(time) ? time : 0;
      uniforms.uPhase.value = clamp(Number.isFinite(phase) ? phase : 0, 0, POSE_NAMES.length - 1);
      selectPhase(uniforms.uPhase.value);
      uniforms.uMorph.value = uniforms.uPhase.value - Math.floor(uniforms.uPhase.value);
      uniforms.uIntro.value = clamp(Number.isFinite(intro) ? intro : 1);
      uniforms.uEnergy.value = clamp(Number.isFinite(energy) ? energy : 1, 0, 2);
      uniforms.uOpacity.value = clamp(Number.isFinite(opacity) ? opacity : 1);
      points.visible = uniforms.uOpacity.value > .002;
    },
    setPalette,
    setReadingRegions({ rects = [], width = 1, height = 1, feather = 64 } = {}) {
      if (disposed) return;
      width = Math.max(1, width); height = Math.max(1, height); feather = Math.max(1, feather);
      const fitted = fitReadingRegions(rects, width, height, feather);
      uniforms.uReadViewport.value.set(width, height); uniforms.uReadFeather.value = feather;
      uniforms.uReadCount.value = fitted.length;
      fitted.forEach((rect, index) => uniforms.uReadRects.value[index].set(
        rect.left + rect.width / 2, rect.top + rect.height / 2, rect.width / 2, rect.height / 2,
      ));
    },
    dispose() {
      if (disposed) return;
      disposed = true; object.remove(points); geometry.dispose(); material.dispose(); release();
      points.onBeforeRender = () => {};
    },
  };
}
