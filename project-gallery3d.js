import * as THREE from './assets/vendor/three/three.module.min.js';

/**
 * Original orbital image gallery, built with Three.js 0.181.2.
 * The scene is a navigation surface. Native page controls and a list remain
 * responsible for the complete accessible project content.
 */
export async function createProjectGallery({container, projects = [], onSelect = () => {}, onOpen = () => {}, onError = () => {}}) {
  if (!(container instanceof HTMLElement)) throw new TypeError('A gallery container is required.');
  const motionStudy = document.documentElement.hasAttribute('data-motion-study');

  let renderer;
  let disposed = false;
  let generation = 0;
  let frame = 0;
  let previousTime = 0;
  let inView = true;
  let active = true;
  let manuallyPaused = false;
  let reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  let presentation = 'portfolio';
  let colours;
  let width = 1;
  let height = 1;
  let mobile = false;
  let currentRotation = -.18;
  let targetRotation = -.18;
  let currentPitch = 0;
  let targetPitch = 0;
  let targetTilt = 0;
  let currentTilt = 0;
  let focusRotation = null;
  let focusTimer = 0;
  let selected = null;
  let selectedTile = -1;
  let hovered = null;
  let pointer = null;
  let cards = [];
  let items = [];
  let sphereSlots = [];
  let needsRender = true;
  let livingForm = null;
  let livingTime = 0;
  let studyFrame = null;
  const listeners = [];
  const textureCache = new Map();
  const textureLoader = new THREE.TextureLoader();
  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();
  const scene = new THREE.Scene();
  const livingAnchor = new THREE.Group();
  livingAnchor.name = 'Project collection living form';
  livingAnchor.position.set(0, -.18, -.65);
  livingAnchor.scale.setScalar(motionStudy ? 1 : .92);
  livingAnchor.visible = false;
  scene.add(livingAnchor);
  const camera = new THREE.PerspectiveCamera(43, 1, .1, 100);
  const shellRotation = new THREE.Quaternion();
  const shellEuler = new THREE.Euler();
  const canvas = document.createElement('canvas');
  canvas.className = 'project-gallery-canvas';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'group');
  canvas.setAttribute('aria-label', 'Interactive project gallery. Drag to turn in two directions; on touch, start horizontally. Left and right arrows select projects, up and down arrows tilt, Enter opens the selection, and Home resets.');
  container.classList.add('project-gallery-stage', 'is-loading');
  container.append(canvas);

  function listen(target, name, fn, options) {
    target.addEventListener(name, fn, options);
    listeners.push(() => target.removeEventListener(name, fn, options));
  }

  function fail(error) {
    if (disposed) return;
    container.classList.remove('is-loading', 'is-ready');
    container.classList.add('is-failed');
    cancelAnimationFrame(frame);
    frame = 0;
    active = false;
    onError(error instanceof Error ? error : new Error('The 3D project gallery could not start.'));
  }

  try {
    renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true, powerPreference: 'low-power'});
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  } catch (error) {
    fail(new Error('This browser could not start the 3D gallery. The project list is still available.', {cause: error}));
    canvas.remove();
    throw error;
  }

  const imageWidth = 3.98;
  const imageHeight = 2.34;
  const sphereRadius = 6.7;
  const imageGeometry = roundedRect(imageWidth, imageHeight, .055);
  const selectionGeometry = selectionBorder(imageWidth, imageHeight);
  const selectionMaterial = new THREE.MeshBasicMaterial({color: '#f4f3eb', side: THREE.DoubleSide, toneMapped: false});
  const titleCanvas = document.createElement('canvas');
  titleCanvas.width = 2048;
  titleCanvas.height = 260;
  const titleContext = titleCanvas.getContext('2d');
  const titleText = container.querySelector('.work-orbit-title')?.textContent.trim().replace(/\s+/g, ' ') || 'A world of what if.';
  const titleMap = new THREE.CanvasTexture(titleCanvas);
  titleMap.colorSpace = THREE.SRGBColorSpace;
  const titleGeometry = new THREE.PlaneGeometry(17.5, 2.22);
  const titleMaterial = new THREE.MeshBasicMaterial({map: titleMap, transparent: true, depthWrite: false, alphaTest: .02, toneMapped: false});
  const sceneTitle = new THREE.Mesh(titleGeometry, titleMaterial);
  sceneTitle.position.z = -.1;
  sceneTitle.visible = false;
  scene.add(sceneTitle);

  function removeLivingForm(error) {
    const form = livingForm;
    livingForm = null;
    livingAnchor.visible = false;
    livingAnchor.clear();
    try { form?.dispose(); } catch {}
    if (error) console.warn('Project gallery: the living form is unavailable; the project collection remains usable.', error);
  }

  async function loadLivingForm() {
    try {
      // This optional layer must never prevent the real project gallery loading.
      const {createLivingForm, STUDY_SAMPLE_COUNT} = motionStudy
        ? await import('./living-form.js?v=20261018-live1')
        : await import('./living-space.js?v=20261017-space4');
      if (disposed) return;
      livingForm = createLivingForm({
        count: motionStudy ? STUDY_SAMPLE_COUNT : (mobile ? 15000 : 24000),
        theme,
        system: document.documentElement.dataset.designSystem || 'organic'
      });
      if (!livingForm?.object?.isObject3D || typeof livingForm.update !== 'function' || typeof livingForm.setPalette !== 'function' || typeof livingForm.dispose !== 'function') {
        throw new TypeError('The living form did not provide its scene interface.');
      }
      livingForm.object.traverse(object => {
        // Cards write to this same depth buffer. Their front faces occlude the
        // points naturally; transparent points never become a screen overlay.
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) if (material) {
          material.depthTest = true;
          material.depthWrite = false;
        }
      });
      livingAnchor.add(livingForm.object);
      invalidate();
    } catch (error) {
      if (!disposed) { removeLivingForm(error); invalidate(); }
    }
  }

  function updateLivingForm(dt, canMove) {
    livingAnchor.visible = Boolean(livingForm && presentation === 'portfolio' && items.length);
    if (!livingAnchor.visible) return;
    if (motionStudy) {
      // The study's page renderer supplies the same clock and pose to both
      // scenes; only ownership opacity changes as the form enters the cards.
      if (studyFrame) livingTime = studyFrame.time;
      else if (canMove) livingTime += dt;
      livingAnchor.quaternion.identity();
      try {
        livingForm.update({
          time: livingTime,
          phase: studyFrame?.phase ?? 0,
          energy: studyFrame?.energy ?? .45,
          opacity: studyFrame?.workMix ?? 1
        });
      } catch (error) { removeLivingForm(error); }
      return;
    }
    // Use the gallery's active clock, not wall time: pause, focus, reduced motion
    // and offscreen states freeze the form together with the image shell.
    if (canMove) livingTime += dt;
    livingAnchor.quaternion.copy(shellRotation);
    try {
      livingForm.update({
        time: livingTime,
        phase: 1.85 + Math.sin(livingTime * .06) * .12,
        energy: .72,
        opacity: theme === 'dark' ? .82 : .74
      });
    } catch (error) { removeLivingForm(error); }
  }

  function roundedRect(w, h, radius) {
    const shape = new THREE.Shape();
    const x = -w / 2, y = -h / 2;
    shape.moveTo(x + radius, y);
    shape.lineTo(x + w - radius, y);
    shape.quadraticCurveTo(x + w, y, x + w, y + radius);
    shape.lineTo(x + w, y + h - radius);
    shape.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    shape.lineTo(x + radius, y + h);
    shape.quadraticCurveTo(x, y + h, x, y + h - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);
    const geometry = new THREE.ShapeGeometry(shape, 6);
    const position = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    for (let i = 0; i < position.count; i++) uv.setXY(i, (position.getX(i) + w / 2) / w, (position.getY(i) + h / 2) / h);
    return geometry;
  }

  function selectionBorder(w, h) {
    // A hollow border preserves the screenshot from either side of the globe.
    const outerX = w * 1.055 / 2;
    const outerY = h * 1.08 / 2;
    const shape = new THREE.Shape();
    shape.moveTo(-outerX, -outerY);
    shape.lineTo(outerX, -outerY);
    shape.lineTo(outerX, outerY);
    shape.lineTo(-outerX, outerY);
    shape.closePath();
    const hole = new THREE.Path();
    hole.moveTo(-w / 2, -h / 2);
    hole.lineTo(-w / 2, h / 2);
    hole.lineTo(w / 2, h / 2);
    hole.lineTo(w / 2, -h / 2);
    hole.closePath();
    shape.holes.push(hole);
    return new THREE.ShapeGeometry(shape);
  }

  function readPalette() {
    // Read the page tokens, not the reference view's local dark overrides.
    if (presentation === 'reference') return {
      base: '#10201b', text: '#f4f3ef', muted: '#a6b4a5', border: '#54674e'
    };
    const style = getComputedStyle(document.documentElement);
    const token = (name, fallback) => style.getPropertyValue(name).trim() || fallback;
    return {
      base: token('--paper', theme === 'dark' ? '#151c18' : '#f4f3eb'),
      text: token('--ink', theme === 'dark' ? '#eef1e7' : '#20241f'),
      muted: token('--muted', theme === 'dark' ? '#a6b4a5' : '#62665d'),
      border: token('--line', theme === 'dark' ? '#4b5c50' : '#ced0c5')
    };
  }

  function palette() { return colours || (colours = readPalette()); }

  function paintSceneTitle() {
    titleContext.clearRect(0, 0, titleCanvas.width, titleCanvas.height);
    titleContext.fillStyle = palette().text;
    titleContext.font = '150px Georgia, serif';
    titleContext.textAlign = 'center';
    titleContext.textBaseline = 'middle';
    titleContext.fillText(titleText, 1024, 130);
    titleMap.needsUpdate = true;
  }

  function titleTexture(project, index) {
    // An explicitly typographic tile for projects without public screenshots.
    const tile = document.createElement('canvas');
    tile.width = 1024;
    tile.height = 602;
    const ctx = tile.getContext('2d');
    const p = palette();
    ctx.fillStyle = p.base;
    ctx.fillRect(0, 0, tile.width, tile.height);
    ctx.strokeStyle = p.border;
    ctx.lineWidth = 1;
    for (let n = 0; n < 8; n++) {
      ctx.beginPath();
      ctx.ellipse(860, 150, 80 + n * 50, 80 + n * 50, -.2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = p.muted;
    ctx.font = '21px Consolas, monospace';
    ctx.fillText('PROJECT NOTES / ' + String(index + 1).padStart(2, '0'), 58, 68);
    ctx.fillStyle = p.text;
    ctx.font = '56px Arial, Helvetica, sans-serif';
    const words = String(project.title || 'Project').split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > 820 && line) { lines.push(line); line = word; }
      else line = next;
    }
    lines.push(line);
    lines.slice(0, 3).forEach((text, i) => ctx.fillText(text, 58, 300 + i * 64));
    ctx.fillStyle = p.muted;
    ctx.font = '22px Arial, Helvetica, sans-serif';
    const note = String(project.status || 'An exploration in progress');
    ctx.fillText(note.length > 64 ? note.slice(0, 61) + '…' : note, 58, 540);
    const texture = new THREE.CanvasTexture(tile);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  function screenshotSource(project) {
    return project.video?.poster || project.images?.[0]?.src || null;
  }

  function screenshotTexture(source) {
    if (textureCache.has(source)) return textureCache.get(source);
    const loading = new Promise(resolve => {
      textureLoader.load(source, texture => {
        if (disposed) { texture.dispose(); resolve(null); return; }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        const image = texture.image;
        const sourceAspect = image.width / image.height;
        const targetAspect = imageWidth / imageHeight;
        if (sourceAspect > targetAspect) {
          texture.repeat.x = targetAspect / sourceAspect;
          texture.offset.x = (1 - texture.repeat.x) / 2;
        } else {
          texture.repeat.y = sourceAspect / targetAspect;
          // Show the top of tall app captures, just as their case-study cards do.
          texture.offset.y = 1 - texture.repeat.y;
        }
        resolve(texture);
      }, undefined, () => {
        console.warn('Project gallery: screenshot unavailable; using a project title tile.', source);
        resolve(null);
      });
    });
    textureCache.set(source, loading);
    return loading;
  }

  async function makeCard(project, index, token, tileIndex = index) {
    const group = new THREE.Group();
    let map = titleTexture(project, index);
    const imageMaterial = new THREE.MeshBasicMaterial({map, side: THREE.DoubleSide, toneMapped: false});
    const image = new THREE.Mesh(imageGeometry, imageMaterial);
    image.position.set(0, 0, .015);
    image.userData.project = project;
    const selectionFrame = new THREE.Mesh(selectionGeometry, selectionMaterial);
    selectionFrame.position.z = .005;
    selectionFrame.visible = false;
    group.add(selectionFrame);
    group.add(image);
    const card = {group, image, selectionFrame, project, index, tileIndex, imageMaterial, ownMap: map, hasScreenshot: false};
    cards.push(card);
    scene.add(group);
    const source = screenshotSource(project);
    if (source) {
      map = await screenshotTexture(source);
      if (disposed || token !== generation) return;
      if (map) {
        card.ownMap.dispose();
        card.ownMap = null;
        card.imageMaterial.map = map;
        card.imageMaterial.needsUpdate = true;
        card.hasScreenshot = true;
        invalidate();
      }
    }
  }

  function clearCards() {
    for (const card of cards) {
      scene.remove(card.group);
      card.imageMaterial.dispose();
      card.ownMap?.dispose();
    }
    cards = [];
  }

  async function setProjects(nextProjects = []) {
    if (disposed) return;
    const token = ++generation;
    const previousId = selected?.id;
    items = nextProjects.filter(project => project && project.id);
    clearCards();
    hovered = null;
    focusRotation = null;
    clearTimeout(focusTimer);
    currentRotation = targetRotation = -.18;
    currentPitch = targetPitch = 0;
    currentTilt = targetTilt = 0;
    sphereSlots = [];
    if (items.length) {
      // Equal-area placement keeps the image shell coherent without latitude
      // bands. Repeat real imagery across at least forty tiles while retaining
      // every project and mapping each tile to its actual case study.
      const tileCount = Math.max(40, items.length);
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      for (let index = 0; index < tileCount; index++) sphereSlots.push({
        latitude: Math.asin(1 - 2 * (index + .5) / tileCount),
        angle: index * goldenAngle
      });
    }
    const pending = sphereSlots.map((slot, tileIndex) => makeCard(items[tileIndex % items.length], tileIndex % items.length, token, tileIndex));
    selected = items.find(project => project.id === previousId) || items[0] || null;
    selectedTile = preferredTile(selected)?.tileIndex ?? -1;
    if (selected) onSelect(selected);
    canvas.setAttribute('aria-label', `Interactive gallery of ${items.length} projects. Drag to turn in two directions; on touch, start horizontally. Left and right arrows select projects, up and down arrows tilt, Enter opens the selection, and Home resets.`);
    container.classList.remove('is-loading');
    container.classList.add('is-ready');
    invalidate();
    Promise.all(pending).then(() => {
      if (disposed || generation !== token) return;
      invalidate();
    }).catch(fail);
  }

  function preferredTile(project) {
    return cards.filter(card => card.project.id === project?.id).sort((a, b) => Math.abs(sphereSlots[a.tileIndex].latitude) - Math.abs(sphereSlots[b.tileIndex].latitude))[0];
  }

  function choose(project, focus = false, clickedTile = null) {
    if (!project) return;
    if (selected?.id !== project.id) { selected = project; onSelect(project); }
    const nearestTile = clickedTile || preferredTile(project);
    selectedTile = nearestTile?.tileIndex ?? -1;
    if (focus) {
      if (!nearestTile) return;
      const slot = sphereSlots[nearestTile.tileIndex];
      // Account for both the tile latitude and the shell's fixed roll. Yaw alone
      // cannot bring a polar tile to the camera-facing centre of the collection.
      const roll = -.14;
      const correction = Math.asin(THREE.MathUtils.clamp(Math.tan(roll) * Math.tan(slot.latitude), -1, 1));
      const y = Math.sin(roll) * Math.sin(correction) * Math.cos(slot.latitude) + Math.cos(roll) * Math.sin(slot.latitude);
      const z = Math.cos(correction) * Math.cos(slot.latitude);
      const elevation = Math.atan2(camera.position.y, camera.position.z || 30);
      targetPitch = Math.atan2(y, z) - elevation - .22;
      targetTilt = 0;
      let next = correction - slot.angle;
      while (next - currentRotation > Math.PI) next -= Math.PI * 2;
      while (next - currentRotation < -Math.PI) next += Math.PI * 2;
      targetRotation = next;
      focusRotation = next;
      clearTimeout(focusTimer);
      if (!reduced && !manuallyPaused) focusTimer = setTimeout(() => {
        focusRotation = null;
        invalidate();
      }, 4000);
      if (reduced) { currentRotation = next; currentPitch = targetPitch; currentTilt = 0; }
    }
    invalidate();
  }

  function selectNext(delta = 1) {
    if (!items.length) return;
    const index = Math.max(0, items.findIndex(project => project.id === selected?.id));
    choose(items[(index + delta + items.length) % items.length], true);
  }

  function focusProject(id) { choose(items.find(project => project.id === id), true); }

  function updateScene(dt) {
    const canMove = !manuallyPaused && !reduced && !pointer && !hovered && focusRotation === null;
    if (canMove) {
      targetRotation += dt * .035;
    }
    const easing = reduced ? 1 : 1 - Math.exp(-dt * 7);
    currentRotation += (targetRotation - currentRotation) * easing;
    currentPitch += (targetPitch - currentPitch) * easing;
    currentTilt += (targetTilt - currentTilt) * easing;
    sceneTitle.visible = items.length > 0;
    shellRotation.setFromEuler(shellEuler.set(.22 + currentPitch + currentTilt * .12, 0, -.14));
    updateLivingForm(dt, canMove);
    for (const card of cards) {
      const slot = sphereSlots[card.tileIndex];
      const angle = slot.angle + currentRotation;
      const front = (Math.cos(angle) + 1) / 2;
      const ring = Math.cos(slot.latitude);
      const x = Math.sin(angle) * sphereRadius * ring;
      const y = Math.sin(slot.latitude) * sphereRadius;
      const z = Math.cos(angle) * sphereRadius * ring;
      card.group.position.set(x, y, z);
      // Both colour treatments share this same approved spherical shell.
      card.group.lookAt(x * 2, y * 2, z * 2);
      card.group.quaternion.premultiply(shellRotation);
      card.group.position.applyQuaternion(shellRotation);
      card.group.scale.setScalar(.65);
      card.imageMaterial.color.setScalar(.4 + front * .6);
      card.selectionFrame.visible = card.tileIndex === selectedTile;
    }
    // Frame the whole globe against the shorter viewport dimension, leaving
    // breathing room for its curved silhouette at every stage aspect ratio.
    const framingTangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.min(1, camera.aspect) * .76;
    const framingDistance = 7.05 * Math.sqrt(1 + 1 / (framingTangent * framingTangent));
    camera.position.set(0, .15, framingDistance);
    camera.lookAt(0, 0, 0);
  }

  function canRender() { return !disposed && active && inView && !document.hidden; }

  function animate(now) {
    frame = 0;
    if (!canRender()) { previousTime = 0; return; }
    const dt = previousTime ? Math.min((now - previousTime) / 1000, .05) : 1 / 60;
    previousTime = now;
    updateScene(dt);
    renderer.render(scene, camera);
    needsRender = false;
    const unsettled = Math.abs(currentRotation - targetRotation) > .0001 || Math.abs(currentPitch - targetPitch) > .0001 || Math.abs(currentTilt - targetTilt) > .0001;
    const auto = cards.length > 0 && !manuallyPaused && !reduced && !pointer && !hovered && focusRotation === null;
    if (auto || unsettled || pointer || needsRender) frame = requestAnimationFrame(animate);
  }

  function invalidate() {
    needsRender = true;
    if (!frame && canRender()) frame = requestAnimationFrame(animate);
  }

  function resize() {
    if (disposed) return;
    const rect = container.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    mobile = width < 720;
    camera.aspect = width / height;
    camera.fov = mobile ? 52 : 43;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75));
    renderer.setSize(width, height, false);
    invalidate();
  }

  function hitTest(event) {
    const rect = canvas.getBoundingClientRect();
    pointerNDC.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointerNDC, camera);
    const meshes = cards.map(card => card.image);
    const hit = raycaster.intersectObjects(meshes, false)[0];
    return hit ? cards.find(card => card.image === hit.object) : null;
  }

  function pointerDown(event) {
    if (!active || event.isPrimary === false || event.button > 0) return;
    pointer = {id: event.pointerId, x: event.clientX, y: event.clientY, previousX: event.clientX, previousY: event.clientY, touch: event.pointerType === 'touch', dragged: false, card: hitTest(event)};
    // Desktop can turn on either axis immediately. Touch keeps native vertical
    // page scrolling until a clearly horizontal gesture claims the globe.
    if (!pointer.touch) canvas.setPointerCapture(event.pointerId);
    focusRotation = null;
    clearTimeout(focusTimer);
    hovered = null;
    invalidate();
  }

  function pointerMove(event) {
    if (!active) return;
    if (pointer && event.pointerId === pointer.id) {
      const dx = event.clientX - pointer.x;
      const dy = event.clientY - pointer.y;
      const intended = pointer.touch ? Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.15 : Math.hypot(dx, dy) > 5;
      if (!pointer.dragged && intended) {
        pointer.dragged = true;
        if (!canvas.hasPointerCapture(event.pointerId)) canvas.setPointerCapture(event.pointerId);
        container.classList.add('is-dragging');
      }
      if (pointer.dragged) {
        targetRotation += (event.clientX - pointer.previousX) * .006;
        targetPitch = THREE.MathUtils.clamp(targetPitch + (event.clientY - pointer.previousY) * .006, -Math.PI, Math.PI);
        if (reduced) { currentRotation = targetRotation; currentPitch = targetPitch; }
      }
      pointer.previousX = event.clientX;
      pointer.previousY = event.clientY;
      invalidate();
      return;
    }
    if (event.pointerType === 'touch') return;
    hovered = hitTest(event);
    canvas.style.cursor = hovered ? 'pointer' : 'grab';
    if (!reduced && !manuallyPaused) {
      const rect = canvas.getBoundingClientRect();
      targetTilt = THREE.MathUtils.clamp((event.clientY - rect.top) / rect.height - .5, -.5, .5);
    }
    invalidate();
  }

  function releasePointer(event, cancelled = false) {
    if (!pointer || event.pointerId !== pointer.id) return;
    const gesture = pointer;
    pointer = null;
    container.classList.remove('is-dragging');
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    const moved = Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y);
    if (!cancelled && !gesture.dragged && moved < 8) {
      const card = hitTest(event);
      if (card && card.project.id === gesture.card?.project.id) { choose(card.project, false, card); onOpen(card.project); }
    }
    invalidate();
  }

  function setTheme(value, force = false) {
    if (disposed) return;
    const next = value === 'dark' ? 'dark' : 'light';
    if (next === theme && !force) return;
    theme = next;
    try { livingForm?.setPalette({theme, system: document.documentElement.dataset.designSystem || 'organic'}); }
    catch (error) { removeLivingForm(error); }
    colours = readPalette();
    selectionMaterial.color.set(palette().text);
    paintSceneTitle();
    for (const card of cards) {
      if (!card.hasScreenshot) {
        card.ownMap?.dispose();
        card.ownMap = titleTexture(card.project, card.index);
        card.imageMaterial.map = card.ownMap;
        card.imageMaterial.needsUpdate = true;
      }
    }
    invalidate();
  }

  function setPresentation(value) {
    const next = value === 'reference' ? 'reference' : 'portfolio';
    if (disposed || next === presentation) return;
    presentation = next;
    container.classList.toggle('is-reference', next === 'reference');
    // A treatment change recolours existing textures only. Keep the same
    // selection, sphere orientation, card geometry and pending image loads.
    setTheme(theme, true);
  }

  function setPaused(value) {
    manuallyPaused = Boolean(value);
    clearTimeout(focusTimer);
    if (manuallyPaused) {
      targetRotation = currentRotation;
      targetPitch = currentPitch;
      targetTilt = currentTilt;
    } else focusRotation = null;
    invalidate();
  }

  function setActive(value) {
    active = Boolean(value);
    if (!active) {
      cancelAnimationFrame(frame);
      frame = 0;
      if (pointer && canvas.hasPointerCapture(pointer.id)) canvas.releasePointerCapture(pointer.id);
      pointer = null;
      hovered = null;
      container.classList.remove('is-dragging');
    }
    previousTime = 0;
    invalidate();
  }

  function reset() {
    livingTime = 0;
    focusRotation = null;
    clearTimeout(focusTimer);
    hovered = null;
    targetRotation = -.18;
    targetPitch = 0;
    targetTilt = 0;
    if (reduced) { currentRotation = targetRotation; currentPitch = targetPitch; currentTilt = targetTilt; }
    choose(items[0]);
    invalidate();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const visibilityObserver = new IntersectionObserver(entries => {
    inView = entries[0]?.isIntersecting ?? true;
    if (!inView) { cancelAnimationFrame(frame); frame = 0; previousTime = 0; }
    else invalidate();
  }, {rootMargin: '80px'});
  visibilityObserver.observe(container);
  const themeObserver = new MutationObserver(() => setTheme(document.documentElement.dataset.theme, true));
  themeObserver.observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme', 'data-design-system']});
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  listen(motionPreference, 'change', event => {
    reduced = event.matches;
    clearTimeout(focusTimer);
    focusRotation = null;
    currentRotation = targetRotation;
    currentPitch = targetPitch;
    currentTilt = targetTilt = 0;
    invalidate();
  });
  listen(document, 'visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; previousTime = 0; }
    else invalidate();
  });
  if (motionStudy) listen(window, 'livingframe', event => {
    const detail = event.detail;
    if (!detail || !['time', 'phase', 'energy', 'workMix'].every(key => Number.isFinite(detail[key]))) return;
    studyFrame = {
      time: Math.max(0, detail.time),
      phase: THREE.MathUtils.clamp(detail.phase, 0, 7),
      energy: THREE.MathUtils.clamp(detail.energy, 0, 2),
      workMix: THREE.MathUtils.clamp(detail.workMix, 0, 1),
      paused: Boolean(detail.paused)
    };
    if (presentation === 'portfolio') invalidate();
  });
  listen(canvas, 'pointerdown', pointerDown);
  listen(canvas, 'pointermove', pointerMove);
  listen(canvas, 'pointerup', event => releasePointer(event));
  listen(canvas, 'pointercancel', event => releasePointer(event, true));
  listen(canvas, 'lostpointercapture', event => releasePointer(event, true));
  listen(canvas, 'pointerleave', () => { if (!pointer) { hovered = null; targetTilt = 0; canvas.style.cursor = 'grab'; invalidate(); } });
  listen(canvas, 'keydown', event => {
    if (event.key === 'ArrowRight') { event.preventDefault(); selectNext(1); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); selectNext(-1); }
    else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      focusRotation = null;
      clearTimeout(focusTimer);
      targetPitch = THREE.MathUtils.clamp(targetPitch + (event.key === 'ArrowDown' ? .18 : -.18), -Math.PI, Math.PI);
      if (reduced) currentPitch = targetPitch;
      invalidate();
    }
    else if (event.key === 'Enter' && selected) { event.preventDefault(); onOpen(selected); }
    else if (event.key === 'Home') { event.preventDefault(); reset(); }
  });
  listen(canvas, 'webglcontextlost', event => {
    event.preventDefault();
    fail(new Error('The browser interrupted the 3D view. Switch to the project list to keep exploring.'));
  });

  function dispose() {
    if (disposed) return;
    disposed = true;
    ++generation;
    clearTimeout(focusTimer);
    cancelAnimationFrame(frame);
    listeners.forEach(remove => remove());
    resizeObserver.disconnect();
    visibilityObserver.disconnect();
    themeObserver.disconnect();
    clearCards();
    removeLivingForm();
    scene.remove(livingAnchor);
    imageGeometry.dispose();
    selectionGeometry.dispose();
    selectionMaterial.dispose();
    titleGeometry.dispose(); titleMaterial.dispose(); titleMap.dispose();
    for (const loading of textureCache.values()) loading.then(texture => texture?.dispose());
    textureCache.clear();
    renderer.dispose();
    canvas.remove();
    container.classList.remove('is-loading', 'is-ready', 'is-dragging');
  }

  setTheme(theme, true);
  resize();
  // Layout and controls are usable immediately; image decoding fills the cards.
  setProjects(projects).catch(fail);
  loadLivingForm();
  return {setProjects, setPaused, setActive, setTheme, setPresentation, reset, focusProject, selectNext, dispose};
}
