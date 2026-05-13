/**
 * ════════════════════════════════════════════════════════════════
 *  WikiAI — js/autocomplete.js
 *  Autocompletado de la barra de búsqueda
 * ════════════════════════════════════════════════════════════════
 */

const autocomplete = (() => {

  // Base de sugerencias
  const suggestions = [
    { icon: '🔍', text: 'Ingeniería inversa' },
    { icon: '🔍', text: 'Ingeniería inversa en ciberseguridad' },
    { icon: '⚖️', text: 'Ingeniería inversa y legalidad' },
    { icon: '🔧', text: 'Herramientas de ingeniería inversa' },
    { icon: '🏗️', text: 'Arquitectura de software' },
    { icon: '🛡️', text: 'Análisis de malware' },
    { icon: '📐', text: 'MediaWiki arquitectura' },
    { icon: '🌐', text: 'Wikipedia tecnología' },
    { icon: '🤖', text: 'Inteligencia artificial' },
    { icon: '💻', text: 'Decompilación de software' },
    { icon: '🔒', text: 'Ciberseguridad informática' },
    { icon: '📊', text: 'UML diagramas de clases' },
  ];

  const box = () => document.getElementById('autocompleteBox');

  // Filtrar y renderizar sugerencias
  function handle(value) {
    const b = box();
    if (!value || !value.trim()) { hide(); return; }

    const q        = value.toLowerCase().trim();
    const filtered = suggestions.filter(s => s.text.toLowerCase().includes(q));

    if (!filtered.length) { hide(); return; }

    b.innerHTML = filtered.slice(0, 6).map(s => `
      <div class="ac-item" onclick="autocomplete.select('${s.text.replace(/'/g,"\\'")}')">
        <span class="ac-icon">${s.icon}</span>
        <span class="ac-text">${s.text}</span>
      </div>
    `).join('');

    b.classList.add('show');
  }

  // Seleccionar sugerencia
  function select(text) {
    const input = document.getElementById('searchInput');
    if (input) input.value = text;
    hide();
    doSearch();
  }

  // Navegar con teclado
  function key(event) {
    if (event.key === 'Escape') hide();
    if (event.key === 'Enter') { hide(); doSearch(); }
  }

  function hide() { box().classList.remove('show'); box().innerHTML = ''; }

  // Cerrar al clic fuera
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#searchWrap')) hide();
  });

  return { handle, select, key, hide };

})();
