// Shared appearance preferences. No project data or contact form content is stored.
(() => {
  const root = document.documentElement;
  const choices = {paper:'Paper & cobalt',mono:'Monochrome',organic:'Living colour'};
  let selected = 'organic';
  try { const saved = localStorage.getItem('vm-design-system'); if (choices[saved]) selected = saved; } catch {}
  root.dataset.designSystem = selected;
  function mount() {
    const header = document.querySelector('header');
    if (!header) return;
    const bar = document.createElement('details');
    bar.className = 'visual-choices preview-options'; bar.id = 'visual-choices';
    bar.innerHTML = '<summary>View options <span aria-hidden="true">＋</span></summary><div class="preview-options-panel"><p class="preview-options-note">Personalise your view</p><div class="preview-option-group"><span class="preview-option-label">Visual language</span><div class="visual-choice-controls" role="group" aria-label="Website design system"></div></div></div>';
    header.after(bar);
    Object.entries(choices).forEach(([id,label]) => {
      const button = document.createElement('button'); button.type='button'; button.textContent=label;
      button.dataset.designChoice=id; button.setAttribute('aria-pressed',String(id===selected));
      button.addEventListener('click',()=>apply(id)); bar.querySelector('.visual-choice-controls').append(button);
    });
    bar.addEventListener('keydown',event=>{if(event.key==='Escape'){bar.open=false;bar.querySelector('summary').focus();}});
    document.addEventListener('pointerdown',event=>{if(bar.open&&!bar.contains(event.target))bar.open=false;});
    function apply(id,remember=true) {
      selected=id; root.dataset.designSystem=id;
      if(remember)try {localStorage.setItem('vm-design-system',id);} catch {}
      bar.querySelectorAll('[data-design-choice]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.designChoice===id)));
      document.dispatchEvent(new CustomEvent('visualsystemchange',{detail:{system:id}}));
      document.dispatchEvent(new Event('themechange'));
    }
    function restore(){try{const saved=localStorage.getItem('vm-design-system');if(choices[saved]&&saved!==selected)apply(saved,false);}catch{}}
    window.addEventListener('pageshow',restore);
    window.addEventListener('storage',event=>{if(event.key==='vm-design-system'||event.key===null)restore();});
    document.dispatchEvent(new Event('visualoptionsready'));
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount,{once:true}); else mount();
})();
