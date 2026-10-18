(() => {
  const portrait = document.querySelector('.portrait-comparison');
  if (!portrait) return;

  const image = portrait.querySelector('img');
  const controls = portrait.querySelector('.portrait-controls');
  const slider = portrait.querySelector('input[type="range"]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let timer = null;
  let visible = false;
  let automaticRevealFinished = false;
  let userControlled = false;

  function cancelTimer() {
    window.clearTimeout(timer);
    timer = null;
  }

  function setColour(value, animate = false) {
    portrait.classList.toggle('portrait-revealing', animate);
    portrait.style.setProperty('--portrait-grayscale', String(1 - value / 100));
    portrait.style.setProperty('--portrait-colour', `${value}%`);
    slider.value = String(value);
    slider.setAttribute('aria-valuetext', value === 0 ? 'Black and white' : value === 100 ? 'Full colour' : `${value}% colour`);
  }

  function scheduleReveal() {
    cancelTimer();
    if (automaticRevealFinished || userControlled || reducedMotion.matches || !visible || document.hidden || !image.complete || !image.naturalWidth) return;
    timer = window.setTimeout(() => {
      timer = null;
      automaticRevealFinished = true;
      setColour(100, true);
    }, 3000);
  }

  function takeControl() {
    userControlled = true;
    cancelTimer();
    portrait.classList.remove('portrait-revealing');
  }

  const canObserve = 'IntersectionObserver' in window;
  setColour(reducedMotion.matches || !canObserve ? 100 : 0);
  controls.hidden = false;

  slider.addEventListener('pointerdown', takeControl);
  slider.addEventListener('focus', takeControl);
  slider.addEventListener('keydown', takeControl);
  slider.addEventListener('input', () => {
    takeControl();
    setColour(Number(slider.value));
  });

  if (canObserve) {
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.25;
      scheduleReveal();
    }, { threshold: [0, 0.25] });
    observer.observe(image);
  }

  image.addEventListener('load', scheduleReveal);
  document.addEventListener('visibilitychange', scheduleReveal);
  reducedMotion.addEventListener('change', () => {
    cancelTimer();
    if (reducedMotion.matches) {
      automaticRevealFinished = true;
      if (!userControlled) setColour(100);
    }
  });
})();
