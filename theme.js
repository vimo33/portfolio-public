// Apply before paint; the switch in script.js persists the reader's preference.
(() => {
 let theme;
 try { theme = localStorage.getItem('vm-theme'); } catch {}
 document.documentElement.dataset.theme = theme === 'dark' || theme === 'light'
  ? theme : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
})();
