import * as THREE from './assets/vendor/three/three.module.min.js';
import {createLivingForm, STUDY_SAMPLE_COUNT} from './living-form.js?v=20261018-live1';
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=n=>{const t=clamp(n);return t*t*t*(t*(t*6-15)+10);};
// Positions are fractions of viewport size, leaving space for each chapter's copy.
const chapters = [
  { x: .69, y: .43, scale: 1.7, halfX: 3.5, halfY: 3.4 },
  { x: .5, y: .51, scale: 1.05, halfX: 3.6, halfY: 3.1 },
  { x: .695, y: .53, scale: 2.45, halfX: 3.6, halfY: 3.2 },
  { x: .51, y: .3, scale: 1.45, halfX: 3.6, halfY: 3.6 },
  { x: .445, y: .52, scale: 1.65, halfX: 3.6, halfY: 4 },
  { x: .3, y: .72, scale: 1.65, halfX: 4.2, halfY: 2.5 },
  { x: .5, y: .27, scale: 3.4, halfX: 4, halfY: 1.3 },
  { x: .57, y: .53, scale: 2, halfX: 3.8, halfY: 3.4 },
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
  const initialMobile = innerWidth <= 720;
  const form = createLivingForm({ count: STUDY_SAMPLE_COUNT,
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
  let currentPhase = 0, currentOpacity = 1, energy = .45, storyScroll = scrollY, workMix = 0, galleryBox;
  const cleanups = [];
  const listen = (target, event, callback, options) => {
    target.addEventListener(event, callback, options);
    cleanups.push(() => target.removeEventListener(event, callback, options));
  };
  function refresh() { if (disposed) return; layoutDirty = true; renderDirty = true; requestFrame(); }
  function resize() {
    const viewport = container.getBoundingClientRect();
    width = Math.max(1, viewport.width); height = Math.max(1, viewport.height);
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
    const gallery = document.querySelector('#work-gallery');
    const gr = gallery?.getBoundingClientRect();
    galleryBox = gr && gr.width > 0 && gr.height > 0 ? {left:gr.left,top:gr.top+sy,width:gr.width,height:gr.height} : null;
    const found = [];
    const reading = [];
    for (const section of sections) {
      for (const element of section.querySelectorAll(maskSelector)) {
        if (element.closest('[hidden]')) continue;
        if (element.matches('.project-gallery-canvas')) continue;
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
    while (index < bounds.length - 1 && storyScroll >= bounds[index + 1].at) index++;
    const next = Math.min(index + 1, bounds.length - 1);
    const span = Math.max(1, bounds[next].at - bounds[index].at);
    const progress = next === index ? 0 : smooth((storyScroll - bounds[index].at) / span);
    const t = progress;
    const a = chapters[Math.min(index, 7)], b = chapters[Math.min(next, 7)];
    const worldHeight = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const x = mix(a.x, b.x, t);
    // On phones, the form occupies the whole composition at a smaller scale;
    // depth masks protect the full-width reading and media columns.
    const mobile=width<=720;
    const px = mobile ? mix(.5, x, .2) : x;
    let py = mix(a.y, b.y, t);
    if(mobile&&index===0)py=mix(.3,py,t);
    let positionX=(px-.5)*worldHeight*camera.aspect,positionY=(.5-py)*worldHeight;
    const maxX=worldHeight*camera.aspect*(Math.min(px,1-px)-.025)/mix(a.halfX,b.halfX,t);
    const maxY=worldHeight*(Math.min(py,1-py)-.035)/mix(a.halfY,b.halfY,t);
    let scale=mobile?worldHeight*camera.aspect/10.8:Math.min(mix(a.scale,b.scale,t),maxX,maxY);
    currentPhase = clamp(index + t, 0, 7);
    // One sampled volume hands into the real sphere's camera at matching size.
    workMix=0;
    const work=bounds[1];
    if(work&&galleryBox&&workExplorer?.dataset.view==='gallery'&&workExplorer?.dataset.presentation==='portfolio'&&document.querySelector('#work-gallery')?.classList.contains('is-ready')){
      const proximity=1-Math.abs(scrollY-work.at)/height;
      // Settle into the gallery camera before transferring opacity. Two visible
      // copies must never move independently during the handoff.
      const alignment=smooth((proximity-.1)/.55);
      workMix=smooth((proximity-.7)/.3);
      const fov=galleryBox.width<720?52:43;
      const tangent=Math.tan(THREE.MathUtils.degToRad(fov/2));
      const framing=tangent*Math.min(1,galleryBox.width/galleryBox.height)*.76;
      const distance=7.05*Math.sqrt(1+1/(framing*framing));
      const pixels=galleryBox.height/(2*(distance+.65)*tangent);
      const gx=galleryBox.left+galleryBox.width/2;
      const gy=galleryBox.top-scrollY+galleryBox.height/2+.18*pixels;
      positionX=mix(positionX,(gx-width/2)*worldHeight/height,alignment);
      positionY=mix(positionY,(height/2-gy)*worldHeight/height,alignment);
      scale=mix(scale,pixels*worldHeight/height,alignment);
    }
    anchor.position.set(positionX,positionY,0);anchor.scale.setScalar(scale);
    currentOpacity=1-workMix;
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
    const previousStoryScroll=storyScroll;
    storyScroll=moving?mix(storyScroll,scrollY,1-Math.exp(-elapsed/.85)):scrollY;
    if(Math.abs(storyScroll-scrollY)<.05)storyScroll=scrollY;
    if(scrollDirty||storyScroll!==previousStoryScroll)placeForm();
    form.update({ time, phase: currentPhase, energy, opacity: currentOpacity });
    window.dispatchEvent(new CustomEvent('livingframe',{detail:{time,phase:currentPhase,energy,paused:!moving,workMix}}));
    renderer.render(scene, camera); renderDirty = false;
    if (moving || storyScroll!==scrollY) requestFrame();
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
  const galleryStage=document.querySelector('#work-gallery');
  if(galleryStage)viewObserver.observe(galleryStage,{attributes:true,attributeFilter:['class']});
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

const ready=document.readyState==='loading'?new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve,{once:true})):Promise.resolve();
await ready;
const home=document.querySelector('.portfolio-home');
if(home){
  const container=document.createElement('div');container.className='living-space';container.setAttribute('aria-hidden','true');home.prepend(container);
  const story=createLivingSpace({container,sections:[...document.querySelectorAll('main>section')]});
  let paused=false,button;
  const preference=matchMedia('(prefers-reduced-motion:reduce)');
  function sync(){story.setPaused(paused);if(button){const unavailable=container.dataset.state==='unavailable';button.textContent=unavailable?'Artwork unavailable':preference.matches?'Motion reduced':paused?'Resume artwork':'Pause artwork';button.disabled=preference.matches||unavailable;button.setAttribute('aria-pressed',String(paused||preference.matches));}}
  function mount(){if(button)return;const panel=document.querySelector('.preview-options-panel');if(!panel)return;const group=document.createElement('div');group.className='preview-option-group';button=document.createElement('button');button.type='button';button.addEventListener('click',()=>{paused=!paused;sync();});group.append(button);panel.append(group);sync();}
  mount();document.addEventListener('visualoptionsready',mount,{once:true});preference.addEventListener('change',sync);new MutationObserver(sync).observe(container,{attributes:true,attributeFilter:['data-state']});sync();
}
