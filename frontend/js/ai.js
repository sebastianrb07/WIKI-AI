/**
 * WikiAI — js/ai.js
 * Panel de IA — barra de confianza y resumen inicial
 */
const AI = (() => {
  function init() {
    // Animar barra de confianza al cargar
    setTimeout(() => {
      const fill = document.getElementById('confFill');
      if (fill) fill.style.width = '94%';
    }, 900);

    // Resumen inicial del artículo de portada
    setTimeout(() => {
      const gen = document.getElementById('aiGenerating');
      const cont = document.getElementById('aiContent');
      if (!gen || !cont) return;
      gen.style.display = 'none';
      cont.style.display = 'block';
      cont.innerHTML = `
        <ul>
          <li>La <strong>ingeniería inversa</strong> analiza sistemas terminados para reconstruir su diseño original.</li>
          <li>Esencial en ciberseguridad para diseccionar <em>malware</em> y detectar vulnerabilidades 0-day.</li>
          <li>Métodos clave: <strong>Análisis Estático</strong> (sin ejecución) y <strong>Análisis Dinámico</strong> (en tiempo real).</li>
          <li>Herramientas estándar: Ghidra (NSA), IDA Pro, Wireshark y Frida.</li>
          <li>Legalmente permitida en la UE bajo excepciones de <strong>interoperabilidad</strong> (Directiva 2009/24/CE).</li>
        </ul>`;
      cont.style.opacity = '0';
      cont.style.transition = 'opacity 0.7s ease';
      requestAnimationFrame(() => { cont.style.opacity = '1'; });
    }, 2800);
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', AI.init);