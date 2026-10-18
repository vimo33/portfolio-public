'use strict';
(() => {
 const projects = window.PORTFOLIO || [];
 const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const groupNames = {bildspur:'Bildspur',ftr:'Follow the Rabbit',bakboka:'Bakboka',independent:'Independent'};
 const themeToggle = document.querySelector('#theme-toggle');
 function syncThemeToggle() {
  const dark = document.documentElement.dataset.theme === 'dark';
  if (themeToggle) {
   themeToggle.textContent = dark ? '☀ Day' : '◐ Night';
   themeToggle.setAttribute('aria-label',dark ? 'Switch to Day (light theme)' : 'Switch to Night (dark theme)');
  }
 }
 syncThemeToggle();
 themeToggle?.addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('vm-theme',theme); } catch {}
  syncThemeToggle();
  document.dispatchEvent(new Event('themechange'));
 });
 function restoreThemePreference() {
  let saved;
  try { saved = localStorage.getItem('vm-theme'); } catch {}
  document.documentElement.dataset.theme = saved === 'dark' || saved === 'light'
   ? saved : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  syncThemeToggle();
  document.dispatchEvent(new Event('themechange'));
 }
 window.addEventListener('pageshow',restoreThemePreference);
 window.addEventListener('storage',event=>{if(event.key === 'vm-theme' || event.key === null) restoreThemePreference();});
 const index = document.querySelector('#project-index');
 if (index) {
  const items = projects.filter(p => !p.archive);
  const render = filter => {
   const selected = items.filter(p => filter === 'all' || p.group === filter);
   index.innerHTML = selected.map(p => `<a class="project-row" href="project.html?id=${encodeURIComponent(p.id)}"><span class="mono">${String(items.indexOf(p)+1).padStart(2,'0')}</span><h4>${escape(p.title)}</h4><span class="project-desc">${escape(p.summary)}</span><span class="row-status">${escape(p.status)}</span><span class="row-arrow" aria-hidden="true">↗</span></a>`).join('');
   document.querySelector('#filter-status').textContent = `${selected.length} projects shown.`;
   index.dataset.filter = filter;
   document.dispatchEvent(new CustomEvent('projectfilterchange', {detail:{filter,projects:selected}}));
  };
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
   document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed',String(b === button)));
   render(button.dataset.filter);
  }));
  render('all');
 }
 const caseContent = document.querySelector('#case-content');
 if (caseContent) {
  const id = document.body.dataset.project || new URLSearchParams(location.search).get('id');
  const project = projects.find(p => p.id === id);
  if (!project) {
   document.title = 'Project not found — Vikas Mohan';
   caseContent.innerHTML = '<div class="case-heading"><div><span class="mono">A THREAD NOT FOUND</span><h1>Let’s find<br>another way.</h1></div><p>This project link does not match the current collection. <a href="index.html#work">Explore the field guide ↗</a></p></div>';
  } else {
   const p = project;
   document.title = `${p.title} — Vikas Mohan`;
   document.querySelector('meta[name="description"]').content = p.summary;
   const links = [p.repo ? `<a class="btn btn-dark" href="${escape(p.repo)}">Explore the public source ↗</a>` : '', p.live ? `<a class="btn btn-line" href="${escape(p.live)}">Visit the prototype ↗</a>` : ''].join('');
   const next = projects[(projects.indexOf(p) + 1) % projects.length];
   const gallery = (p.images || []).map((im,i) => `<figure class="case-shot${im.presentation === 'portrait' ? ' case-shot-portrait' : ''}"><button class="case-image" type="button" data-image-index="${i}" aria-haspopup="dialog" aria-label="Enlarge image: ${escape(im.alt)}"><img src="${escape(im.src)}" alt="${escape(im.alt)}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}><span class="image-enlarge" aria-hidden="true">Enlarge ↗</span></button><figcaption><span class="mono">${String(i+1).padStart(2,'0')} /</span> ${escape(im.caption)}</figcaption></figure>`).join('');
   const video = p.video ? `<figure class="case-shot case-video"><video controls playsinline preload="metadata" poster="${escape(p.video.poster)}" aria-label="${escape(p.video.label)}"><source src="${escape(p.video.src)}" type="video/mp4"><a href="${escape(p.video.src)}">Watch ${escape(p.video.label)}</a></video><figcaption><span class="mono">PLAY /</span> ${escape(p.video.caption)}</figcaption></figure>` : '';
   const galleryNote = p.galleryNote ? `<p class="gallery-note">${escape(p.galleryNote)}</p>` : '';
   const stack = p.id === 'rabbit-stack' ? '<div class="stack-diagram" aria-label="Rabbit Stack vision: capture, remember, work, review and deploy on a personal computer"><span class="mono">THE PROPOSED STACK</span><div><span>Capture</span><span>Remember</span><span>Work</span><span>Review</span><span>Deploy</span></div><p>Your machine. A shared memory. Tools that work together.</p><small>Product vision · components in development · distribution planned</small></div>' : '';
   caseContent.innerHTML = `<div class="case-heading"><div><span class="mono">${escape((groupNames[p.group] || 'Independent').toUpperCase())} / ${escape(p.category.toUpperCase())}</span><h1>${escape(p.title)}</h1></div><p>${escape(p.summary)}</p></div><dl class="case-meta"><div><dt>Contribution</dt><dd>${escape(p.role)}</dd></div><div><dt>Stage</dt><dd>${escape(p.status)}</dd></div><div><dt>Period</dt><dd>${escape(p.year)}</dd></div></dl><div class="case-gallery">${galleryNote}${video}${gallery || stack || `<div class="case-visual"><h2>${escape(p.lens)}</h2><span class="mono">${escape(p.artifact)}</span></div>`}</div><p class="case-lens">${escape(p.lens)}</p><div class="case-story"><div><article><h2>The question</h2><p>${escape(p.question)}</p></article><article><h2>${escape(p.storyHeading || 'What I’m building')}</h2><p>${escape(p.approach)}</p>${p.details.length ? `<ul>${p.details.map(x => `<li>${escape(x)}</li>`).join('')}</ul>` : ''}</article></div><div><article><h2>The interesting part</h2><p>${escape(p.learning)}</p></article><div class="case-note"><strong>Where this stands</strong><br>${escape(p.limits)}</div><div class="case-actions">${links || '<a class="btn btn-dark" href="mailto:vikasm.22@gmail.com">Talk about this project ↗</a>'}</div></div></div><div class="case-next"><a href="index.html#work">← All projects</a><a href="project.html?id=${encodeURIComponent(next.id)}">Next: ${escape(next.title)} ↗</a></div>`;
   if (p.images?.length) {
    const viewer = document.createElement('dialog');
    viewer.className = 'image-viewer';
    viewer.setAttribute('aria-labelledby','image-viewer-title');
    viewer.innerHTML = '<header class="image-viewer-header"><h2 id="image-viewer-title"></h2><form method="dialog"><button class="image-close" type="submit" autofocus>Close <span aria-hidden="true">×</span></button></form></header><div class="image-viewer-stage"><img alt=""></div><p class="image-viewer-caption"></p>';
    document.body.append(viewer);
    let opener;
    caseContent.addEventListener('click',event => {
     const button = event.target.closest('[data-image-index]');
     if (!button) return;
     const index = Number(button.dataset.imageIndex), im = p.images[index];
     if (!im) return;
     opener = button;
     viewer.querySelector('h2').textContent = `${p.title} · ${index+1} / ${p.images.length}`;
     const image = viewer.querySelector('img');
     image.src = im.src;
     image.alt = im.alt;
     viewer.querySelector('.image-viewer-caption').textContent = im.caption;
     viewer.showModal();
     document.body.classList.add('image-viewing');
    });
    viewer.addEventListener('click',event => {
     if (event.target !== viewer) return;
     const bounds = viewer.getBoundingClientRect();
     if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) viewer.close();
    });
    viewer.addEventListener('close',() => {
     document.body.classList.remove('image-viewing');
     opener?.focus({preventScroll:true});
    });
   }
  }
 }
 // Local illustrative state machine. It never sends data or invokes a model.
 const demo = document.querySelector('#control-demo');
 if (demo) {
  const scenarios = {
   memory:{label:'01',title:'Replace a remembered preference',body:'An old note says “weekly updates.” A newer note says “monthly updates.” The assistant proposes replacing the old preference.',source:'Two invented notes, with conflicting dates',change:'One preference in this demo',result:'Preference changed to monthly updates in the demo.'},
   sharing:{label:'02',title:'Share a project summary',body:'The assistant proposes making a project summary visible to a collaborator. The source contains an internal note, so the audience deserves a closer look.',source:'An invented project note marked internal',change:'Audience changes from private to a collaborator',result:'Sharing approved in the demo. Nothing was sent.'},
   creative:{label:'03',title:'Change the bass part',body:'A music assistant suggests a simpler bass phrase. The proposed change should leave the other parts untouched and give you a way to reconsider.',source:'An invented four-part arrangement',change:'The bass part only; other parts stay the same',result:'Bass variation selected in the demo. No audio was changed.'}
  };
  let scenario = 'memory', decided = false;
  const status = document.querySelector('#demo-status'), protect = document.querySelector('#protect-toggle'), approve = document.querySelector('#approve'), reject = document.querySelector('#reject'), log = document.querySelector('#decision-log');
  function addLog(text) { const li = document.createElement('li'); li.textContent = text; log.append(li); }
  function reset() {
   decided = false; protect.checked = false; approve.disabled = false; reject.disabled = false;
   const s = scenarios[scenario];
   for (const [field,value] of Object.entries({label:`PROPOSED CHANGE / ${s.label}`,title:s.title,body:s.body,source:s.source,change:s.change})) document.querySelector(`#proposal-${field}`).textContent = value;
   status.textContent = 'Awaiting your decision. Nothing has changed.';
   log.replaceChildren(); addLog('Proposal created. Waiting for review.');
  }
  document.querySelectorAll('[data-scenario]').forEach(button => button.addEventListener('click', () => {
   scenario = button.dataset.scenario;
   document.querySelectorAll('[data-scenario]').forEach(b => b.setAttribute('aria-pressed',String(b === button)));
   reset();
  }));
  protect.addEventListener('change', () => {
   approve.disabled = protect.checked || decided;
   status.textContent = decided ? 'Decision recorded. Reset to try again.' : protect.checked ? 'Protected. The proposed change cannot be approved.' : 'Protection removed. Awaiting your decision.';
   addLog(protect.checked ? 'You protected the item.' : 'You removed protection.');
  });
  approve.addEventListener('click', () => {
   if (protect.checked || decided) return;
   decided = true; approve.disabled = true; reject.disabled = true;
   status.textContent = scenarios[scenario].result;
   addLog('You approved this proposal. Demo state changed.');
  });
  reject.addEventListener('click', () => {
   if (decided) return;
   decided = true; approve.disabled = true; reject.disabled = true;
   status.textContent = 'Kept as is. The proposal was declined.';
   addLog('You declined this proposal. Original state preserved.');
  });
  document.querySelector('#reset-demo').addEventListener('click', reset);
 }
 const canvas = document.querySelector('#loom');
 if (canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let mode = 'think', paused = reduced.matches, inView = true, frame = 0, phase = 0, last = 0;
  const toggle = document.querySelector('#motion-toggle');
  function updateToggle() { toggle.textContent = paused ? 'Play motion' : 'Pause motion'; toggle.setAttribute('aria-pressed',String(paused)); }
  function draw(t) {
   const w = canvas.width, h = canvas.height;
   ctx.clearRect(0,0,w,h); ctx.save(); ctx.translate(w/2,h/2); ctx.scale(w/700,h/700);
   ctx.rotate(-.23); ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--blue').trim(); ctx.lineWidth = 1.3;
   for(let line=0; line<54; line++) {
    const u = line/53;
    ctx.beginPath();
    for(let n=0;n<=180;n++) {
     const a = n/180*Math.PI*2;
     let x,y;
     if(mode==='build') {
      const radius = 95+u*145;
      x = Math.sign(Math.cos(a))*Math.pow(Math.abs(Math.cos(a)),.55)*radius;
      y = Math.sign(Math.sin(a))*Math.pow(Math.abs(Math.sin(a)),.55)*radius*.79;
      x += Math.sin(u*6+t*.25)*18; y+=Math.cos(u*5+t*.3)*16;
     } else if(mode==='feel') {
      const r = 125+u*105+Math.sin(a*3+u*2+t*.3)*32;
      x = Math.cos(a)*r; y = Math.sin(a)*r*.9+Math.cos(a*2+u*4+t*.3)*32;
     } else {
      const r = 80+u*170;
      x = Math.cos(a)*r+Math.sin(a*2+u*3+t*.2)*32;
      y = Math.sin(a)*r*.85+Math.cos(a*3+u*4+t*.23)*30;
     }
     n===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    }
    ctx.closePath(); ctx.globalAlpha=.48+u*.4; ctx.stroke();
   }
   ctx.globalAlpha=1; ctx.rotate(.23); ctx.fillStyle='#234bdd'; ctx.beginPath();ctx.arc(206,-142,7,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#dcf68a'; ctx.beginPath();ctx.arc(-133,145,17,0,Math.PI*2);ctx.fill(); ctx.strokeStyle='#20241f';ctx.lineWidth=1;ctx.stroke(); ctx.restore();
  }
  function tick(now) {
   frame = 0;
   if(paused || !inView || document.hidden) { last=0; return; }
   if(last) phase += Math.min(now-last,50)/1000;
   last=now; draw(phase); frame=requestAnimationFrame(tick);
  }
  function sync() { if(frame) cancelAnimationFrame(frame); frame=0;last=0;draw(phase);if(!paused && inView && !document.hidden) frame=requestAnimationFrame(tick); }
  function resize() { const box=canvas.getBoundingClientRect();const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(box.width*dpr));canvas.height=canvas.width;draw(phase); }
  const captions = {think:'A thought, taking shape.',build:'Give the idea a structure.',feel:'Leave room for the unexpected.'};
  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
   mode=button.dataset.mode; document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
   document.querySelector('#loom-caption').textContent=captions[mode];draw(phase);
  }));
  toggle.addEventListener('click',()=>{paused=!paused;updateToggle();sync();});
  reduced.addEventListener('change',()=>{paused=reduced.matches;updateToggle();sync();});
  document.addEventListener('visibilitychange',sync);
  document.addEventListener('themechange',()=>draw(phase));
  new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync();},{threshold:0}).observe(canvas);
  new ResizeObserver(resize).observe(canvas);
  resize(); updateToggle(); sync();
 }
})();
