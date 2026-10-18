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
    root.querySelector('#work-selected-title').textContent = project.title;
    root.querySelector('#work-selected-title').href = href;
    root.querySelector('#work-selected-summary').textContent = project.summary;
    root.querySelector('#work-open').href = href;
    root.querySelector('#work-open').setAttribute('aria-label', `Explore ${project.title}`);
  }
  function syncPause() {
    pause.textContent = paused ? 'Resume rotation' : 'Pause rotation';
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
        const module = mode === 'gallery' ? await import('./project-gallery3d.js?v=20261018-live1') : await import('./project-cards3d.js?v=20261018-live1');
        const make = mode === 'gallery' ? module.createProjectGallery : module.createProjectCards;
        const instance = await make({container:stages[mode], projects:items,
          onSelect:project => { if (view === mode && instances.has(mode)) showSelection(project); },
          onOpen:project => { if (project && view === mode) location.href = `project.html?id=${encodeURIComponent(project.id)}`; },
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
    if (clearError) fallback.hidden = true;
    remember(preferenceKey,mode);
    buttons.forEach(button => button.setAttribute('aria-pressed',String(button.dataset.workView === mode)));
    list.hidden = mode !== 'list';
    visuals.hidden = mode === 'list';
    selection.hidden = mode === 'list';
    Object.entries(stages).forEach(([key,stage]) => { stage.hidden = key !== mode; });
    instances.forEach((instance,key) => instance.setActive(key === mode));
    root.querySelector('#work-view-name').textContent = mode === 'gallery' ? '01 / THE ORBIT' : '02 / THE CARD RIBBON';
    root.querySelector('#work-hint').textContent = mode === 'gallery' ? 'Drag to turn in any direction. Select a card or use the project picker.' : 'Swipe sideways to browse. Open the card in front.';
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
  picker.addEventListener('change',() => { selectionRevision++; instances.get(view)?.focusProject(picker.value); });
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
    for(const [selector,label] of [['#work-switch','Project view'],['.work-presentation','Gallery treatment'],['.work-filterbar','Collection']]){
      const control=root.querySelector(selector),group=document.createElement('div'),heading=document.createElement('span');
      if(!control)continue;
      group.className='preview-option-group';heading.className='preview-option-label';heading.textContent=label;group.append(heading,control);options.append(group);
    }
   }
  }
  mountOptions();document.addEventListener('visualoptionsready',mountOptions,{once:true});
}
