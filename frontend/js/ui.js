/**
 * ════════════════════════════════════════════════════════════════
 *  WikiAI — js/ui.js
 *  Lógica general de la interfaz: AI summary, confidence bar, etc.
 * ════════════════════════════════════════════════════════════════
 */

/* ── Función global de búsqueda ─────────────────────────────── */
function doSearch() {
  const input = document.getElementById('searchInput');
  const query = input ? input.value.trim() : '';
  if (query) {
    // En producción: redirigir a resultados
    // window.location.href = `search.html?q=${encodeURIComponent(query)}`;
    console.log('[WikiAI] Buscando:', query);
  }
  autocomplete.hide();
}

/* ── Animación del resumen IA ───────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {

  // Simular carga del resumen IA (2.2s de "generando")
  setTimeout(() => {
    const generating = document.getElementById('aiGenerating');
    const content    = document.getElementById('aiContent');
    if (!generating || !content) return;

    generating.style.display = 'none';
    content.style.display    = 'block';
    content.style.opacity    = '0';
    content.style.transition = 'opacity .6s ease';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { content.style.opacity = '1'; });
    });
  }, 2200);

  // Animar barra de confianza del artículo
  setTimeout(() => {
    const fill = document.getElementById('confFill');
    if (fill) fill.style.width = '94%';
  }, 700);

  // Verificar soporte de búsqueda por voz y avisar si no hay
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    const btn = document.getElementById('btnVoice');
    if (btn) {
      btn.title   = 'Tu navegador no soporta búsqueda por voz. Usa Chrome o Edge.';
      btn.style.opacity = '0.4';
      btn.style.cursor  = 'not-allowed';
      btn.onclick = () => alert('Búsqueda por voz no disponible en este navegador.\nUsa Google Chrome o Microsoft Edge.');
    }
  }
});
