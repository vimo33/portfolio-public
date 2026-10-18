/* Original project-card ribbon: CSS perspective, real portfolio media, no renderer dependency. */
export function createProjectCards({ container, projects = [], onSelect, onOpen, onError }) {
  if (!container) throw new TypeError('A project cards container is required.');

  const stage = document.createElement('div');
  stage.className = 'project-cards3d';
  stage.tabIndex = 0;
  stage.setAttribute('role', 'group');
  stage.setAttribute('aria-label', 'Project card ribbon. Use left and right arrow keys to choose a project.');

  const label = document.createElement('div');
  label.className = 'project-cards3d-label mono';
  label.setAttribute('aria-hidden', 'true');
  const labelTitle = document.createElement('span');
  labelTitle.textContent = 'A STACK OF POSSIBILITIES';
  const count = document.createElement('span');
  label.append(labelTitle, count);

  const bank = document.createElement('div');
  bank.className = 'project-cards3d-bank';
  const hint = document.createElement('div');
  hint.className = 'project-cards3d-hint mono';
  hint.textContent = '← SWIPE OR USE ARROW KEYS →';
  hint.setAttribute('aria-hidden', 'true');
  stage.append(label, bank, hint);
  container.append(stage);

  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const cleanups = [];
  let items = [];
  let cards = [];
  let current = 0;
  let active = true;
  let paused = false;
  let inView = false;
  let disposed = false;
  let compact = container.clientWidth < 720;
  let reference = false;
  let gesture = null;
  let suppressClickUntil = 0;

  function listen(target, type, callback, options) {
    target.addEventListener(type, callback, options);
    cleanups.push(() => target.removeEventListener(type, callback, options));
  }

  function notify(callback, project) {
    if (typeof callback !== 'function') return;
    try { callback(project); } catch (error) { if (typeof onError === 'function') onError(error); }
  }

  function updateMotion() {
    const running = active && !paused && inView && !document.hidden && !motionPreference.matches && !gesture;
    stage.classList.toggle('is-running', running);
    stage.classList.toggle('is-static', motionPreference.matches);
  }

  function offsetFor(index) {
    let offset = index - current;
    if (offset > items.length / 2) offset -= items.length;
    if (offset < -items.length / 2) offset += items.length;
    return offset;
  }

  function render() {
    if (disposed) return;
    stage.classList.toggle('is-compact', compact);
    stage.classList.toggle('is-empty', items.length === 0);
    count.textContent = items.length ? `${String(current + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}` : 'NO PROJECTS';

    cards.forEach((card, index) => {
      const offset = offsetFor(index);
      const distance = Math.abs(offset);
      const selected = distance === 0;
      const visible = distance <= 2;
      const direction = Math.sign(offset);
      const y = distance === 0 ? 0 : direction * (distance === 1 ? (reference ? (compact ? 118 : 145) : (compact ? 139 : 211)) : (reference ? (compact ? 210 : 270) : (compact ? 238 : 340)));
      const z = distance === 0 ? 30 : distance === 1 ? -160 : -350;
      const tilt = direction * (distance === 1 ? -58 : -69);

      card.hidden = !visible;
      card.classList.toggle('is-current', selected);
      card.classList.toggle('is-neighbor', !selected);
      card.style.setProperty('--card-y', `${y}px`);
      card.style.setProperty('--card-z', `${z}px`);
      card.style.setProperty('--card-tilt', `${tilt}deg`);
      card.style.setProperty('--card-roll', `${direction * distance * -2}deg`);
      card.style.zIndex = String(10 - distance);
      card.style.opacity = selected ? '1' : distance === 1 ? '.76' : '.42';
      card.tabIndex = selected && active ? 0 : -1;
      card.setAttribute('aria-hidden', String(!selected || !active));
      card.setAttribute('aria-label', selected ? `Open ${items[index].title}` : `Select ${items[index].title}`);

      const image = card.querySelector('img[data-src]');
      if (visible && image) {
        image.src = image.dataset.src;
        image.removeAttribute('data-src');
      }
    });
    updateMotion();
  }

  function select(index, announce = true) {
    if (disposed || !items.length) return;
    const previous = current;
    current = ((index % items.length) + items.length) % items.length;
    const focusedCard = cards.includes(document.activeElement);
    render();
    if (focusedCard && previous !== current) cards[current].focus({ preventScroll: true });
    if (announce) notify(onSelect, items[current]);
  }

  function makeCard(project, index) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `project-cards3d-card cards-tone-${index % 4}`;
    card.dataset.projectId = project.id;

    const surface = document.createElement('span');
    surface.className = 'project-cards3d-surface';
    const meta = document.createElement('span');
    meta.className = 'project-cards3d-meta mono';
    const number = document.createElement('span');
    number.textContent = `${String(index + 1).padStart(2, '0')} / ${project.group === 'ftr' ? 'FOLLOW THE RABBIT' : project.group === 'bildspur' ? 'BILDSPUR' : project.group === 'bakboka' ? 'BAKBOKA' : 'INDEPENDENT'}`;
    const arrow = document.createElement('span');
    arrow.textContent = '↗';
    arrow.setAttribute('aria-hidden', 'true');
    meta.append(number, arrow);

    const media = document.createElement('span');
    media.className = 'project-cards3d-media';
    const imageSource = project.images?.[0]?.src || project.video?.poster;
    if (imageSource) {
      const image = document.createElement('img');
      image.dataset.src = imageSource;
      image.alt = '';
      image.decoding = 'async';
      image.draggable = false;
      image.addEventListener('error', () => {
        image.remove();
        media.classList.add('is-typographic');
      }, { once: true });
      media.append(image);
    } else {
      media.classList.add('is-typographic');
    }
    const monogram = document.createElement('span');
    monogram.className = 'project-cards3d-monogram';
    monogram.textContent = project.title.split(/\s+/).slice(0, 2).map(word => word[0]).join('');
    monogram.setAttribute('aria-hidden', 'true');
    media.append(monogram);

    const caption = document.createElement('span');
    caption.className = 'project-cards3d-caption';
    const title = document.createElement('span');
    title.className = 'project-cards3d-title';
    title.textContent = project.title;
    const status = document.createElement('span');
    status.className = 'project-cards3d-status';
    status.textContent = project.status || 'Project exploration';
    caption.append(title, status);
    surface.append(meta, media, caption);
    card.append(surface);
    card.addEventListener('click', () => {
      if (!active || disposed || performance.now() < suppressClickUntil) return;
      if (index === current) notify(onOpen, items[current]);
      else select(index);
    });
    return card;
  }

  function setProjects(nextProjects) {
    if (disposed) return;
    const previousId = items[current]?.id;
    items = Array.isArray(nextProjects) ? nextProjects.filter(project => project && !project.archive && project.id && project.title) : [];
    cards = items.map(makeCard);
    bank.replaceChildren(...cards);
    current = Math.max(0, items.findIndex(project => project.id === previousId));
    render();
    notify(onSelect, items[current] || null);
  }

  function endGesture(event, cancelled = false) {
    if (!gesture || event.pointerId !== gesture.id) return;
    const completed = gesture;
    gesture = null;
    stage.classList.remove('is-dragging');
    stage.style.setProperty('--cards-drag-x', '0px');
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    if (completed.horizontal) {
      suppressClickUntil = performance.now() + 450;
      if (!cancelled && Math.abs(completed.dx) > 44) select(current + (completed.dx < 0 ? 1 : -1));
    }
    updateMotion();
  }

  listen(stage, 'keydown', event => {
    if (!active || !items.length) return;
    const movement = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (movement) {
      event.preventDefault();
      select(current + movement);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      select(event.key === 'Home' ? 0 : items.length - 1);
    } else if ((event.key === 'Enter' || event.key === ' ') && event.target === stage) {
      event.preventDefault();
      notify(onOpen, items[current]);
    }
  });

  listen(stage, 'pointerdown', event => {
    if (!active || !event.isPrimary || event.button !== 0) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, horizontal: false };
    updateMotion();
  });
  listen(stage, 'pointermove', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.horizontal && Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
      endGesture(event, true);
      return;
    }
    if (!gesture.horizontal && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      gesture.horizontal = true;
      stage.setPointerCapture(event.pointerId);
      stage.classList.add('is-dragging');
    }
    if (gesture.horizontal) {
      gesture.dx = dx;
      if (event.cancelable) event.preventDefault();
      stage.style.setProperty('--cards-drag-x', `${Math.max(-55, Math.min(55, dx * .18))}px`);
    }
  });
  listen(stage, 'pointerup', event => endGesture(event));
  listen(stage, 'pointercancel', event => endGesture(event, true));
  listen(stage, 'lostpointercapture', event => {
    // Touch capture transfers from the pressed card to its parent during a swipe.
    // Only losing the stage's own capture ends that gesture.
    if (event.target === stage) endGesture(event, true);
  });
  listen(stage, 'pointerleave', event => { if (gesture && !gesture.horizontal) endGesture(event, true); });
  listen(stage, 'dragstart', event => event.preventDefault());
  listen(document, 'visibilitychange', updateMotion);
  listen(motionPreference, 'change', updateMotion);

  let visibilityObserver;
  if ('IntersectionObserver' in window) {
    visibilityObserver = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      updateMotion();
    });
    visibilityObserver.observe(stage);
  }

  let resizeObserver;
  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(([entry]) => {
      const nextCompact = entry.contentRect.width < 720;
      if (nextCompact !== compact) { compact = nextCompact; render(); }
    });
    resizeObserver.observe(container);
  }

  setProjects(projects);
  return {
    setProjects,
    setPresentation(value) {
      reference = value === 'reference';
      stage.classList.toggle('is-reference',reference);
      render();
    },
    setPaused(value) { paused = Boolean(value); updateMotion(); },
    setActive(value) {
      active = Boolean(value);
      stage.tabIndex = active ? 0 : -1;
      stage.inert = !active;
      if (!active && gesture) endGesture({ pointerId: gesture.id }, true);
      render();
    },
    reset() { select(0); },
    focusProject(id) {
      const index = items.findIndex(project => project.id === id);
      if (index >= 0) select(index);
      return index >= 0;
    },
    selectNext(delta = 1) { select(current + Math.sign(delta)); },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (gesture) endGesture({ pointerId: gesture.id }, true);
      visibilityObserver?.disconnect();
      resizeObserver?.disconnect();
      cleanups.forEach(cleanup => cleanup());
      stage.remove();
      cards = [];
      items = [];
    }
  };
}
