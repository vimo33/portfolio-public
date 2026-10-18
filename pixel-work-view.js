// View selection stays separate from project content and the two renderers.
const ready = document.readyState === 'loading' ? new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, {once:true})) : Promise.resolve();
await ready;
const root = document.querySelector('#work-explorer');
if (root) {
  const all = (window.PORTFOLIO || []).filter(project => !project.archive);
  const names = {bildspur:'Bildspur', ftr:'Follow the Rabbit', bakboka:'Bakboka', independent:'Independent'};
  const list = document.querySelector('#project-index');
  const visuals = root.querySelector('#work-visuals');
  const selection = root.querySelector('#work-selection');
  const fallback = root.querySelector('#work-fallback');
  const buttons = [...root.querySelectorAll('[data-work-view]')];
  const presentationButtons = [...root.querySelectorAll('[data-presentation]')];
  const stages = {gallery:root.querySelector('#work-gallery'), cards:root.querySelector('#work-cards')};
  const instances = new Map(), pending = new Map();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reducedMotion.matches, view = 'list', selected = all[0], filter = list.dataset.filter || 'all';
  let items = all.filter(p => filter === 'all' || p.group === filter);
  let request = 0;
  const pause = root.querySelector('#work-motion');
  const picker = root.querySelector('#work-jump');
  const titleLink = root.querySelector('#work-selected-title');
  const detailHeading = titleLink.closest('h3');
  detailHeading.tabIndex = -1;
  detailHeading.id = 'work-detail-heading';
  selection.setAttribute('role','region');
  selection.setAttribute('aria-labelledby','work-detail-heading');
  const detailCopy = titleLink.closest('h3').parentElement;
  detailCopy.classList.add('work-project-copy');
  const description = document.createElement('p');
  description.className = 'work-project-description';
  detailCopy.append(description);
  const intro = document.createElement('div');
  intro.className = 'work-inspect-intro';
  const introTitle = document.createElement('strong');
  introTitle.textContent = 'Explore a project';
  const introText = document.createElement('p');
  introText.textContent = 'Drag to look around. Hover for a quick preview, then select a card to bring it closer and read its story.';
  intro.append(introTitle,introText);
  selection.prepend(intro);
  const announcement = document.createElement('p');
  announcement.className = 'sr-only';
  announcement.setAttribute('role','status');
  root.append(announcement);
  const viewNames = {gallery:'Sphere',cards:'Cards',list:'List'};
  buttons.forEach(button => { button.textContent = viewNames[button.dataset.workView]; });
  const toolbar = root.querySelector('.work-toolbar');
  const toolbarActions = document.createElement('div');
  toolbarActions.className = 'work-toolbar-actions';
  toolbarActions.append(root.querySelector('#work-count'));
  const fullscreenButton = document.createElement('button');
  fullscreenButton.type = 'button';
  fullscreenButton.id = 'work-fullscreen';
  fullscreenButton.className = 'work-fullscreen-button';
  fullscreenButton.textContent = 'Full screen ↗';
  fullscreenButton.setAttribute('aria-controls',root.id);
  fullscreenButton.setAttribute('aria-pressed','false');
  toolbarActions.append(fullscreenButton);
  toolbar.append(toolbarActions);
  let fullscreenMode = null, fullscreenPending = false, fullscreenReturnFocus = null;
  let fallbackState = null, previousDialogAttributes = null;

  function focusFullscreenControl() { fullscreenButton.focus({preventScroll:true}); }
  function fullscreenChanged(mode) {
    fullscreenMode = mode;
    root.classList.toggle('is-work-fullscreen',Boolean(mode));
    fullscreenButton.textContent = mode ? 'Exit full screen ×' : 'Full screen ↗';
    fullscreenButton.setAttribute('aria-pressed',String(Boolean(mode)));
    if (mode) {
      previousDialogAttributes ??= ['role','aria-modal','aria-labelledby'].map(name => [name,root.getAttribute(name)]);
      root.setAttribute('role','dialog');
      root.setAttribute('aria-modal','true');
      root.setAttribute('aria-labelledby','work-title');
      focusFullscreenControl();
    } else {
      previousDialogAttributes?.forEach(([name,value]) => value === null ? root.removeAttribute(name) : root.setAttribute(name,value));
      previousDialogAttributes = null;
      if (fullscreenReturnFocus?.isConnected) fullscreenReturnFocus.focus({preventScroll:true});
      fullscreenReturnFocus = null;
    }
    // Both renderers and the page's handoff measure the newly sized container.
    syncPause();
    window.dispatchEvent(new CustomEvent('workfullscreenchange',{detail:{active:Boolean(mode),mode}}));
    window.dispatchEvent(new Event('resize'));
  }
  function enterContainedFullscreen() {
    const marker = document.createComment('Project explorer fullscreen origin');
    root.before(marker);
    const bodyStyle = document.body.style;
    fallbackState = {
      marker, x:scrollX, y:scrollY,
      styles:['position','top','left','right','width','overflow'].map(name => [name,bodyStyle.getPropertyValue(name),bodyStyle.getPropertyPriority(name)]),
      inert:[]
    };
    document.body.append(root);
    for (const sibling of document.body.children) {
      if (sibling === root || ['SCRIPT','STYLE','LINK'].includes(sibling.tagName)) continue;
      fallbackState.inert.push([sibling,sibling.inert]);
      sibling.inert = true;
    }
    Object.assign(bodyStyle,{position:'fixed',top:`-${fallbackState.y}px`,left:`-${fallbackState.x}px`,right:'0',width:'100%',overflow:'hidden'});
    root.classList.add('is-contained-fullscreen');
    fullscreenChanged('fallback');
  }
  function leaveContainedFullscreen() {
    if (!fallbackState) return;
    const saved = fallbackState;
    fallbackState = null;
    saved.marker.replaceWith(root);
    saved.inert.forEach(([element,inert]) => { element.inert = inert; });
    saved.styles.forEach(([name,value,priority]) => value ? document.body.style.setProperty(name,value,priority) : document.body.style.removeProperty(name));
    root.classList.remove('is-contained-fullscreen','is-work-fullscreen');
    const scrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(saved.x,saved.y);
    document.documentElement.style.scrollBehavior = scrollBehavior;
    fullscreenChanged(null);
  }
  async function toggleFullscreen() {
    if (fullscreenPending) return;
    if (fullscreenMode === 'fallback') { leaveContainedFullscreen(); return; }
    if (document.fullscreenElement === root) {
      try { await document.exitFullscreen(); } catch { announcement.textContent = 'Use Escape to exit full screen.'; }
      return;
    }
    fullscreenReturnFocus = document.activeElement;
    fullscreenPending = true;
    try {
      if (!root.requestFullscreen || document.fullscreenEnabled === false) throw new Error('Contained fullscreen required');
      await root.requestFullscreen();
      if (document.fullscreenElement === root && fullscreenMode !== 'native') fullscreenChanged('native');
    } catch { enterContainedFullscreen(); }
    finally { fullscreenPending = false; }
  }
  fullscreenButton.addEventListener('click',toggleFullscreen);
  document.addEventListener('fullscreenchange',() => {
    if (document.fullscreenElement === root) fullscreenChanged('native');
    else if (fullscreenMode === 'native') fullscreenChanged(null);
  });
  document.addEventListener('keydown',event => {
    if (!fullscreenMode) return;
    if (event.key === 'Escape' && fullscreenMode === 'fallback') { event.preventDefault(); leaveContainedFullscreen(); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...root.querySelectorAll('a[href],button:not([disabled]),select:not([disabled]),input:not([disabled]),[tabindex="0"]')].filter(node => node.getClientRects().length && !node.closest('[hidden],[inert]'));
    const first = focusable[0], last = focusable.at(-1);
    if (!first) { event.preventDefault(); focusFullscreenControl(); return; }
    if (event.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
  },true);
  document.addEventListener('focusin',event => { if (fullscreenMode && !root.contains(event.target)) focusFullscreenControl(); });
  window.addEventListener('pagehide',() => { if (fullscreenMode === 'fallback') leaveContainedFullscreen(); });
  root.addEventListener('projectinspect',() => {
    if (view !== 'gallery') return;
    detailHeading.focus({preventScroll:true});
    detailHeading.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
  });
  let selectionRevision = 0;
  function populatePicker() {
    picker.replaceChildren(...items.map(project => {
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = project.title;
      return option;
    }));
  }
  function remember(key, value) { try { sessionStorage.setItem(key,value); } catch {} }
  function recall(key) { try { return sessionStorage.getItem(key); } catch { return null; } }
  let presentation = recall('vm-study-work-presentation-v2') === 'reference' ? 'reference' : 'portfolio';
  function setPresentation(value) {
    presentation = value;
    root.dataset.presentation = value;
    presentationButtons.forEach(button => button.setAttribute('aria-pressed',String(button.dataset.presentation === value)));
    instances.forEach(instance => instance.setPresentation?.(value));
    remember('vm-study-work-presentation-v2',value);
  }
  function showSelection(project) {
    if (!project) return;
    selected = project;
    picker.value = project.id;
    const number = items.findIndex(p => p.id === project.id) + 1;
    root.querySelector('#work-selected-meta').textContent = `${String(number).padStart(2,'0')} / ${String(items.length).padStart(2,'0')} · ${names[project.group]} · ${project.status}`;
    const href = `project.html?id=${encodeURIComponent(project.id)}`;
    titleLink.textContent = project.title;
    if (view === 'gallery') titleLink.removeAttribute('href');
    else titleLink.href = href;
    root.querySelector('#work-selected-summary').textContent = project.summary;
    description.textContent = project.approach || project.question || project.summary;
    root.querySelector('#work-open').href = href;
    root.querySelector('#work-open').textContent = view === 'gallery' ? 'View project ↗' : 'Explore project ↗';
    root.querySelector('#work-open').setAttribute('aria-label', `View ${project.title}`);
    announcement.textContent = `${project.title}. Project details ready.`;
  }
  function syncPause() {
    const activity = fullscreenMode ? 'motion' : 'rotation';
    pause.textContent = `${paused ? 'Resume' : 'Pause'} ${activity}`;
    pause.setAttribute('aria-pressed',String(paused));
    instances.forEach(instance => instance.setPaused(paused));
  }
  function fail(mode) {
    instances.get(mode)?.dispose();
    instances.delete(mode);
    pending.delete(mode);
    stages[mode].classList.remove('is-failed');
    if (view !== mode) return;
    fallback.textContent = `${mode === 'gallery' ? 'The 3D gallery' : 'The card view'} could not open in this browser. All projects are available in the list.`;
    fallback.hidden = false;
    setView('list', false);
  }
  async function renderer(mode) {
    if (instances.has(mode)) return instances.get(mode);
    if (!pending.has(mode)) {
      const job = (async () => {
        const module = mode === 'gallery' ? await import('./project-gallery3d.js?v=20261018-story6') : await import('./project-cards3d.js?v=20261018-live1');
        const make = mode === 'gallery' ? module.createProjectGallery : module.createProjectCards;
        const instance = await make({container:stages[mode], projects:items,
          onSelect:project => { if (view === mode && instances.has(mode)) showSelection(project); },
          onOpen:project => {
            if (!project || view !== mode) return;
            if (mode === 'gallery') showSelection(project);
            else location.href = `project.html?id=${encodeURIComponent(project.id)}`;
          },
          onError:() => fail(mode)});
        instance.setActive(false);
        instance.setPaused(paused);
        instance.setPresentation?.(presentation);
        instances.set(mode,instance);
        return instance;
      })();
      pending.set(mode,job);
      job.catch(() => pending.delete(mode));
    }
    return pending.get(mode);
  }
  async function setView(mode, clearError = true) {
    const token = ++request;
    const preferredId = selected?.id;
    const startingRevision = selectionRevision;
    view = mode;
    root.dataset.view = mode;
    showSelection(selected);
    if (clearError) fallback.hidden = true;
    remember(preferenceKey,mode);
    buttons.forEach(button => button.setAttribute('aria-pressed',String(button.dataset.workView === mode)));
    list.hidden = mode !== 'list';
    visuals.hidden = mode === 'list';
    selection.hidden = mode === 'list';
    Object.entries(stages).forEach(([key,stage]) => { stage.hidden = key !== mode; });
    instances.forEach((instance,key) => instance.setActive(key === mode));
    root.querySelector('#work-view-name').textContent = mode === 'gallery' ? '01 / THE ORBIT' : '02 / THE CARD RIBBON';
    root.querySelector('#work-hint').textContent = mode === 'gallery' ? 'Drag in any direction · select to inspect · use View project to open.' : 'Swipe sideways to browse. Open the card in front.';
    if (mode === 'list') return;
    const loading = root.querySelector('#work-loading');
    loading.hidden = false;
    try {
      const instance = await renderer(mode);
      if (token !== request) return;
      const preferred = items.find(p => p.id === (startingRevision === selectionRevision ? preferredId : selected?.id)) || items[0];
      instance.setProjects(items);
      if (preferred) instance.focusProject(preferred.id);
      instance.setActive(true);
      showSelection(preferred);
      loading.hidden = true;
    } catch { if (token === request) fail(mode); }
  }
  root.querySelector('#work-switch').hidden = false;
  buttons.forEach(button => button.addEventListener('click',() => setView(button.dataset.workView)));
  presentationButtons.forEach(button => button.addEventListener('click',() => setPresentation(button.dataset.presentation)));
  pause.addEventListener('click',() => { paused = !paused; syncPause(); });
  reducedMotion.addEventListener('change',event => { paused = event.matches; syncPause(); });
  root.querySelector('#work-reset').addEventListener('click',() => instances.get(view)?.reset());
  root.querySelector('#work-prev').addEventListener('click',() => instances.get(view)?.selectNext(-1));
  root.querySelector('#work-next').addEventListener('click',() => instances.get(view)?.selectNext(1));
  picker.addEventListener('change',() => {
    const project = items.find(item => item.id === picker.value);
    if (!project) return;
    selectionRevision++;
    showSelection(project);
    instances.get(view)?.focusProject(project.id);
  });
  document.addEventListener('projectfilterchange',event => {
    selectionRevision++;
    filter = event.detail.filter;
    items = event.detail.projects;
    populatePicker();
    if (!items.some(p => p.id === selected?.id)) selected = items[0];
    instances.forEach(instance => instance.setProjects(items));
    showSelection(selected);
    root.querySelector('#work-count').textContent = `${items.length} projects · different ways in`;
  });
  root.querySelector('#work-count').textContent = `${items.length} projects · different ways in`;
  populatePicker();
  showSelection(selected);
  syncPause();
  setPresentation(presentation);
  const mobile = matchMedia('(max-width: 600px)').matches;
  const preferenceKey = mobile ? 'vm-study-work-view-mobile' : 'vm-study-work-view';
  const saved = recall(preferenceKey);
  const defaultView = reducedMotion.matches || innerHeight < 540 ? 'list' : mobile ? 'cards' : 'gallery';
  setView(['gallery','cards','list'].includes(saved) ? saved : defaultView);
  function mountOptions(){
   const options = document.querySelector('.preview-options-panel');
   if(options){
    for(const [selector,label] of [['.work-presentation','Gallery treatment'],['.work-filterbar','Collection']]){
      const control=root.querySelector(selector),group=document.createElement('div'),heading=document.createElement('span');
      if(!control)continue;
      group.className='preview-option-group';heading.className='preview-option-label';heading.textContent=label;group.append(heading,control);options.append(group);
    }
   }
  }
  mountOptions();document.addEventListener('visualoptionsready',mountOptions,{once:true});
}
