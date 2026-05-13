/**
 * WikiAI — js/theme.js
 */
const Theme = (() => {
  const KEY = 'wikiai-theme';

  function init() {
    const saved = localStorage.getItem(KEY) || 'light';
    apply(saved);

    const btn = document.getElementById('themeToggle');
    if (btn) btn.addEventListener('click', toggle);
  }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  function toggle() {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    apply(next);
    localStorage.setItem(KEY, next);
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', Theme.init);