/**
 * WikiAI — js/search.js
 * Búsqueda real usando la API de Wikipedia en español
 */

const Search = (() => {
  const WIKI_API = 'https://es.wikipedia.org/w/api.php';

  // Sugerencias fijas (topics del Word)
  const defaultSuggestions = [
    { icon: '🔬', text: 'Ingeniería inversa' },
    { icon: '🛡️', text: 'Seguridad informática' },
    { icon: '🦠', text: 'Análisis de malware' },
    { icon: '🤖', text: 'Inteligencia artificial' },
    { icon: '🔐', text: 'Criptografía' },
    { icon: '⚙️', text: 'Compilador' },
    { icon: '📡', text: 'Protocolo de red' },
    { icon: '🐛', text: 'Depurador' },
    { icon: '🏗️', text: 'Arquitectura de software' },
    { icon: '📐', text: 'UML' },
  ];

  let searchInput = null;
  let autocompleteBox = null;
  let debounceTimer = null;
  let isAiMode = false;

  function init() {
    searchInput = document.getElementById('searchInput');
    autocompleteBox = document.getElementById('autocompleteBox');
    const btnSearch = document.getElementById('btnSearch');
    const btnSearchMode = document.getElementById('btnSearchMode');

    if (!searchInput) return;

    if (btnSearchMode) {
      btnSearchMode.addEventListener('click', () => {
        isAiMode = !isAiMode;
        if (isAiMode) {
          btnSearchMode.classList.add('ai-mode');
          btnSearchMode.textContent = '✦';
          btnSearchMode.title = 'Modo WikiAI Local';
          searchInput.placeholder = 'Generar análisis local...';
          showToast('Motor Local Activado');
        } else {
          btnSearchMode.classList.remove('ai-mode');
          btnSearchMode.textContent = 'W';
          btnSearchMode.title = 'Modo Wikipedia';
          searchInput.placeholder = 'Buscar en Wikipedia...';
          showToast('Modo Wikipedia Activado');
        }
      });
    }

    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => handleInput(e.target.value), 250);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hide();
      if (e.key === 'Enter') { hide(); triggerSearch(); }
    });

    if (btnSearch) btnSearch.addEventListener('click', triggerSearch);

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#searchWrap')) hide();
    });

    // Focus → muestra sugerencias predeterminadas
    searchInput.addEventListener('focus', () => {
      if (!searchInput.value.trim()) renderSuggestions(defaultSuggestions);
    });
  }

  async function handleInput(value) {
    if (!value || !value.trim()) {
      renderSuggestions(defaultSuggestions);
      return;
    }
    const q = value.trim();

    // Primero mostrar filtrado de sugerencias fijas (inmediato)
    const local = defaultSuggestions.filter(s =>
      s.text.toLowerCase().includes(q.toLowerCase())
    );
    if (local.length) renderSuggestions(local);

    // Luego enriquecer con OpenSearch de Wikipedia
    try {
      const url = `${WIKI_API}?action=opensearch&search=${encodeURIComponent(q)}&limit=6&namespace=0&format=json&origin=*`;
      const res = await fetch(url);
      const data = await res.json();
      const terms = data[1] || [];
      if (terms.length) {
        const items = terms.map(t => ({ icon: '📖', text: t }));
        renderSuggestions(items);
      }
    } catch (_) { /* sin conexión: solo usar sugerencias locales */ }
  }

  function renderSuggestions(items) {
    if (!autocompleteBox) return;
    autocompleteBox.innerHTML = items.slice(0, 7).map(s => `
      <div class="ac-item" data-text="${escapeAttr(s.text)}">
        <span class="ac-icon">${s.icon}</span>
        <span class="ac-text">${s.text}</span>
      </div>
    `).join('');
    autocompleteBox.classList.add('show');

    autocompleteBox.querySelectorAll('.ac-item').forEach(el => {
      el.addEventListener('click', () => select(el.dataset.text));
    });
  }

  function select(text) {
    if (searchInput) searchInput.value = text;
    hide();
    triggerSearch();
  }

  function hide() {
    autocompleteBox?.classList.remove('show');
  }

  function escapeAttr(str) {
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  return { init, select, hide, get isAiMode() { return isAiMode; } };
})();

// ─── Función global de búsqueda ────────────────────────────────
async function triggerSearch() {
  const input = document.getElementById('searchInput');
  const query = input?.value?.trim();
  if (!query) return;

  hide_autocomplete();
  await loadArticle(query);
}

function hide_autocomplete() {
  document.getElementById('autocompleteBox')?.classList.remove('show');
}

// ─── Carga de artículo desde Wikipedia ────────────────────────
async function loadArticle(query) {
  const WIKI_API = 'https://es.wikipedia.org/w/api.php';

  const articleMain = document.getElementById('articleMain');
  const articleTitle = document.getElementById('articleTitle');
  const articleSubtitle = document.getElementById('articleSubtitle');
  const articleBody = document.getElementById('articleBody');
  const articleBreadcrumb = document.getElementById('articleBreadcrumb');
  const aiGenerating = document.getElementById('aiGenerating');
  const aiContent = document.getElementById('aiContent');
  const btnSearch = document.getElementById('btnSearch');

  // Estado de carga
  if (btnSearch) { btnSearch.textContent = '…'; btnSearch.classList.add('loading'); }
  articleMain.style.opacity = '0.6';
  articleTitle.textContent = query;
  articleSubtitle.textContent = '';
  articleBody.innerHTML = `
    <div class="search-loading">
      <div class="search-spinner"></div>
      Buscando "${query}"…
    </div>`;

  // Resetear AI panel al estado idle
  const aiIdle = document.getElementById('aiIdle');
  if (aiGenerating) { aiGenerating.style.display = 'none'; }
  if (aiIdle) { aiIdle.style.display = 'flex'; }
  if (aiContent) { aiContent.style.display = 'none'; aiContent.innerHTML = ''; }

  try {
    if (Search.isAiMode) {
        // --- MODO GEMINI IA ---
        const aiRes = await fetch('/api/ai/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
        const aiData = await aiRes.json();
        
        if (!aiRes.ok) throw new Error(aiData.error || 'Error AI');
        
        articleMain.style.opacity = '1';
        articleTitle.textContent = aiData.title;
        articleSubtitle.textContent = 'Análisis generado por Motor Local (NLP)';
        articleBreadcrumb.innerHTML = `WikiAI › Análisis Local › ${aiData.title}`;
        
        articleBody.innerHTML = aiData.content_html;
        
        // Estilos del artículo
        articleBody.querySelectorAll('p').forEach(p => p.style.marginBottom = '16px');
        articleBody.querySelectorAll('h2').forEach(h => {
          h.style.cssText = 'font-family:var(--font-serif);font-size:22px;font-weight:700;margin:32px 0 14px;padding-bottom:8px;border-bottom:1px solid var(--border-light);';
        });
        articleBody.querySelectorAll('h3').forEach(h => {
          h.style.cssText = 'font-family:var(--font-serif);font-size:18px;font-weight:600;margin:24px 0 10px;';
        });
        articleBody.querySelectorAll('ul, ol').forEach(l => {
          l.style.cssText = 'padding-left:22px;margin-bottom:16px;';
        });

        // Actualizar infobox simple
        updateInfobox(aiData.title, ['Generado por IA', 'Sin verificar'], '#');
        
        // AI Panel
        if (aiGenerating) aiGenerating.style.display = 'none';
        if (aiContent) {
            aiContent.style.display = 'block';
            aiContent.innerHTML = `
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; gap:8px;">
                <p style="font-family:var(--font-sans);font-size:13px;color:var(--text-muted);margin:0;">✦ Artículo generado por WikiAI Local</p>
                <button class="btn-pdf" id="btnDownloadPdfSearch" title="Exportar a PDF" style="cursor:pointer">📄 Exportar PDF</button>
              </div>`;
            
            const btnPdf = document.getElementById('btnDownloadPdfSearch');
            if (btnPdf) {
                btnPdf.addEventListener('click', () => {
                    if (window.exportToPDF) window.exportToPDF(aiData.title, 'articleBody');
                    else showToast('Librería PDF no lista');
                });
            }
        }

        // Scroll
        articleMain.scrollIntoView({ behavior: 'smooth', block: 'start' });
        articleMain.classList.add('fade-in');
        setTimeout(() => articleMain.classList.remove('fade-in'), 600);

    } else {
        // --- MODO WIKIPEDIA ---
        const searchUrl = `${WIKI_API}?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=1&format=json&origin=*`;
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();
        const hits = searchData?.query?.search;

    if (!hits || hits.length === 0) {
      showNotFound(query);
      return;
    }

    const pageTitle = hits[0].title;

    // 2. Obtener extracto completo del artículo e imágenes (pithumbsize=800 para mayor resolución)
    const pageUrl = `${WIKI_API}?action=query&prop=extracts|categories|info|pageimages&titles=${encodeURIComponent(pageTitle)}&pithumbsize=800&format=json&origin=*&inprop=url`;
    const pageRes = await fetch(pageUrl);
    const pageData = await pageRes.json();

    const pages = pageData?.query?.pages;
    const pageId = Object.keys(pages)[0];
    const page = pages[pageId];

    if (!page || pageId === '-1') {
      showNotFound(query);
      return;
    }

    // 3. Renderizar artículo
    const extract = page.extract || '';
    const categories = page.categories?.slice(0, 3).map(c => c.title.replace('Categoría:', '')) || [];
    const wikiUrl = page.fullurl || `https://es.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`;
    const imageUrl = page.thumbnail ? page.thumbnail.source : null;

    // Parsear HTML del extracto
    const parser = new DOMParser();
    const doc = parser.parseFromString(extract, 'text/html');

    // Limpiar el HTML de Wikipedia (quitar spans/divs de edición)
    doc.querySelectorAll('.mw-editsection, .reference, sup.reference').forEach(el => el.remove());

    // Añadir IDs a los h2 para el TOC
    let tocItems = [];
    doc.querySelectorAll('h2, h3').forEach((heading, i) => {
      const id = `sec-${i}`;
      heading.id = id;
      heading.style.scrollMarginTop = '90px';
      tocItems.push({ id, text: heading.textContent.trim(), tag: heading.tagName });
    });

    articleMain.style.opacity = '1';
    articleTitle.textContent = page.title;
    articleSubtitle.textContent = categories.join(' · ') || 'Artículo de Wikipedia';
    articleBreadcrumb.innerHTML = `Wikipedia › ${categories[0] || 'Enciclopedia'} › ${page.title}`;

    // Contenido del artículo
    articleBody.innerHTML = doc.body.innerHTML + `
      <div class="article-references" style="margin-top:32px; padding-top:18px; border-top: 2px solid var(--border-light);">
        <div class="references-title">Fuente</div>
        <p style="font-family:var(--font-sans);font-size:13px;color:var(--text-muted);">
          Este artículo está basado en información de 
          <a href="${wikiUrl}" target="_blank" rel="noopener" style="color:var(--accent-primary)">Wikipedia en español</a>
          bajo licencia Creative Commons BY-SA 4.0.
        </p>
      </div>`;

    // Aplicar estilos del artículo al HTML inyectado
    articleBody.querySelectorAll('p').forEach(p => p.style.marginBottom = '16px');
    articleBody.querySelectorAll('h2').forEach(h => {
      h.style.cssText = 'font-family:var(--font-serif);font-size:22px;font-weight:700;margin:32px 0 14px;padding-bottom:8px;border-bottom:1px solid var(--border-light);';
    });
    articleBody.querySelectorAll('h3').forEach(h => {
      h.style.cssText = 'font-family:var(--font-serif);font-size:18px;font-weight:600;margin:24px 0 10px;';
    });
    articleBody.querySelectorAll('ul, ol').forEach(l => {
      l.style.cssText = 'padding-left:22px;margin-bottom:16px;';
    });

    // Actualizar TOC
    buildTOC(tocItems);
    
    // Inyectar mini-TOC al inicio del cuerpo para "Quick Jump"
    if (tocItems.length > 0) {
        const miniTocHtml = `
            <div class="mini-toc glass">
                <div class="mini-toc-title">Explorar secciones</div>
                <div class="mini-toc-grid">
                    ${tocItems.slice(0, 6).map(item => `<a href="#${item.id}" class="mini-toc-item">${item.text}</a>`).join('')}
                </div>
            </div>`;
        articleBody.insertAdjacentHTML('afterbegin', miniTocHtml);
    }

    // Actualizar infobox
    updateInfobox(page.title, categories, wikiUrl, imageUrl);

    // Actualizar artículos relacionados
    updateRelated(hits[0].snippet, query);

    // Marcar sidebar-link active
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));

    // NO generar resumen IA automáticamente — el usuario lo activa con el botón lateral
    // El panel ya se resetea al estado idle arriba

    // Scroll al inicio del artículo
    articleMain.scrollIntoView({ behavior: 'smooth', block: 'start' });
    articleMain.classList.add('fade-in');
    setTimeout(() => articleMain.classList.remove('fade-in'), 600);

    // Actualizar input con el título correcto
    const inp = document.getElementById('searchInput');
    if (inp) inp.value = page.title;
    
    } // <-- Fin del else (Modo Wikipedia)

    // Save search history
    saveSearchHistory(query);

  } catch (err) {
    console.error('[WikiAI] Error cargando artículo:', err);
    showNetworkError(query);
  } finally {
    if (btnSearch) { btnSearch.textContent = 'Buscar'; btnSearch.classList.remove('loading'); }
  }
}

async function saveSearchHistory(query) {
    const token = localStorage.getItem('wikiai-token');
    if (!token) return; // solo si hay sesión
    try {
        await fetch('/api/search-history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query })
        });
    } catch (err) {
        console.error('Error guardando historial', err);
    }
}

function showNotFound(query) {
  const articleBody = document.getElementById('articleBody');
  const articleTitle = document.getElementById('articleTitle');
  const articleMain = document.getElementById('articleMain');
  articleMain.style.opacity = '1';
  articleTitle.textContent = `Sin resultados para "${query}"`;
  articleBody.innerHTML = `
    <div style="text-align:center;padding:60px 24px;font-family:var(--font-sans);">
      <div style="font-size:48px;margin-bottom:16px">🔍</div>
      <p style="font-size:16px;color:var(--text-muted);">
        No se encontró ningún artículo para <strong>"${query}"</strong>.
      </p>
      <p style="font-size:14px;color:var(--text-faint);margin-top:8px;">
        Intenta con otro término o verifica la ortografía.
      </p>
    </div>`;
  showToast('Sin resultados — intenta otro término');
}

function showNetworkError(query) {
  const articleBody = document.getElementById('articleBody');
  const articleMain = document.getElementById('articleMain');
  articleMain.style.opacity = '1';
  articleBody.innerHTML = `
    <div style="text-align:center;padding:60px 24px;font-family:var(--font-sans);">
      <div style="font-size:48px;margin-bottom:16px">📡</div>
      <p style="font-size:16px;color:var(--text-muted);">Error de conexión al cargar "${query}".</p>
      <p style="font-size:14px;color:var(--text-faint);margin-top:8px;">Verifica tu conexión a internet.</p>
    </div>`;
  showToast('Error de red — revisa tu conexión');
}

function buildTOC(items) {
  const tocSection = document.getElementById('tocSection');
  const tocList = document.getElementById('tocList');
  if (!tocSection || !tocList || items.length === 0) {
    if (tocSection) tocSection.style.display = 'none';
    return;
  }
  tocSection.style.display = 'block';
  tocList.innerHTML = items.slice(0, 10).map(item => `
    <a class="toc-item" href="#${item.id}" 
       style="${item.tag === 'H3' ? 'padding-left:24px;font-size:12px;' : ''}">
      ${item.text}
    </a>`).join('');
}

function updateInfobox(title, categories, url, imageUrl = null) {
  const infoboxTitle = document.getElementById('infoboxTitle');
  const infoboxBody = document.getElementById('infoboxBody');
  if (!infoboxTitle || !infoboxBody) return;
  
  infoboxTitle.textContent = title;
  
  let html = '';
  
  // 1. Imagen con contenedor premium
  if (imageUrl) {
      html += `
        <div class="infobox-image-container">
            <img src="${imageUrl}" alt="${title}" class="infobox-img-fluid" />
        </div>`;
  } else {
      html += `
        <div class="infobox-img">
            <span>${title.charAt(0)}</span>
        </div>`;
  }
  
  // 2. Información General
  html += `
    <div class="infobox-data">
        <div class="info-row">
            <div class="info-key">Tipo</div>
            <div class="info-val">${categories.length > 0 ? 'Artículo Temático' : 'General'}</div>
        </div>
        <div class="info-row">
            <div class="info-key">Fuente</div>
            <div class="info-val"><a href="${url}" target="_blank" class="wiki-link-premium">Wikipedia ES</a></div>
        </div>
    </div>
  `;

  // 3. Sección de Categorías (como Chips para simetría)
  if (categories.length > 0) {
      html += `
        <div class="infobox-section-title">Clasificación</div>
        <div class="infobox-chips">
            ${categories.slice(0, 5).map(c => `<span class="category-chip" onclick="loadArticle('${c.replace(/'/g, "\\'")}'); return false;">${c}</span>`).join('')}
        </div>
      `;
  }
    
  infoboxBody.innerHTML = html;
}

function updateRelated(snippet, currentQuery) {
  const relatedPanel = document.getElementById('relatedPanel');
  if (!relatedPanel) return;
  // Extraer palabras clave del snippet
  const words = snippet.replace(/<[^>]+>/g, '').split(/\s+/)
    .filter(w => w.length > 5)
    .slice(0, 5);
  const links = relatedPanel.querySelectorAll('.related-link');
  links.forEach((link, i) => {
    if (words[i]) {
      link.dataset.search = words[i];
    }
  });
}

async function generateAISummary(title, extract) {
  const aiGenerating = document.getElementById('aiGenerating');
  const aiContent = document.getElementById('aiContent');
  if (!aiContent) return;

  if (aiGenerating) aiGenerating.style.display = 'flex';
  aiContent.style.display = 'none';

  // Extraer un buen pedazo de texto para la IA
  const text = extract.replace(/<[^>]+>/g, '').substring(0, 4000);

  try {
    const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, contextContext: title })
    });
    const data = await response.json();

    if (aiGenerating) aiGenerating.style.display = 'none';
    aiContent.style.display = 'block';

    if (response.ok) {
        aiContent.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px">
            <span style="font-size:12px; font-weight:600; color:var(--text-main)">✦ Análisis Inteligente (WikiAI Local)</span>
            <button class="btn-pdf" id="btnDownloadPdfSearch" title="Exportar a PDF" style="cursor:pointer">&#128196; Descargar PDF</button>
          </div>
          <div id="pdfSearchContentArea" style="font-family:var(--font-sans); font-size:13.5px; line-height:1.7; color:var(--text-main)">
            ${data.summary_html}
          </div>
        `;
        
        // Estilos de las listas generadas por la IA
        aiContent.querySelectorAll('li').forEach(li => {
            li.style.cssText = 'margin-bottom:10px; padding-left:4px; line-height:1.6;';
        });
        aiContent.querySelectorAll('h3').forEach(h => {
            h.style.cssText = 'font-size:14px; font-weight:700; margin:16px 0 8px; color:var(--accent-primary);';
        });
        aiContent.querySelectorAll('p').forEach(p => {
            p.style.cssText = 'margin-bottom:10px; line-height:1.7;';
        });
        
        // Event listener para exportar PDF
        const btnPdf = document.getElementById('btnDownloadPdfSearch');
        if (btnPdf) {
            btnPdf.addEventListener('click', () => {
                if (window.exportToPDF) window.exportToPDF(title, 'pdfSearchContentArea');
                else alert('La librería de PDF no está cargada aún');
            });
        }

        aiContent.style.opacity = '0';
        aiContent.style.transition = 'opacity 0.6s ease';
        requestAnimationFrame(() => { aiContent.style.opacity = '1'; });

    } else {
        aiContent.innerHTML = `<p style="color:var(--error)">Error generando resumen: ${data.error}</p>`;
    }
  } catch (err) {
    console.error(err);
    if (aiGenerating) aiGenerating.style.display = 'none';
    aiContent.style.display = 'block';
    aiContent.innerHTML = `<p style="color:var(--error)">Error de red conectando a la IA.</p>`;
  }
}

function showToast(msg) {
  const old = document.querySelector('.wiki-toast');
  if (old) old.remove();
  const t = document.createElement('div');
  t.className = 'wiki-toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'toastOut 0.25s ease-in forwards';
    setTimeout(() => t.remove(), 250);
  }, 3000);
}

document.addEventListener('DOMContentLoaded', Search.init);