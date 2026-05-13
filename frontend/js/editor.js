/**
 * WikiAI — js/editor.js
 * Lógica para el editor WYSIWYG (Quill.js) y envío de artículos al backend.
 */
const Editor = (() => {
  let quillInstance = null;

  function init() {
    // Escuchar un evento personalizado o simplemente exponer un método render.
    // Lo expondremos globalmente para que navigation.js pueda llamarlo.
    window.renderEditorView = renderEditorView;
  }

  function renderEditorView() {
    const main = document.getElementById('articleMain');
    if (!main) return;

    // Verificar si el usuario está logueado
    const token = localStorage.getItem('wikiai-token');
    if (!token) {
        // Redirigir al login
        Auth.showModal('login');
        showToast('Debes iniciar sesión para escribir artículos.');
        return;
    }

    main.style.opacity = '0';
    
    setTimeout(() => {
      // Limpiamos los headers
      document.getElementById('articleBreadcrumb').textContent = 'WikiAI › Redacción › Nuevo Artículo';
      document.getElementById('articleTitle').textContent = 'Creando nuevo artículo';
      document.getElementById('articleSubtitle').textContent = 'Usa el editor WYSIWYG para formatear el contenido. La IA verificará la estructura.';
      
      const meta = document.querySelector('.article-meta');
      if(meta) meta.innerHTML = '<span class="meta-tag">✍️ Borrador</span>';

      const aiSummary = document.getElementById('aiSummary');
      if (aiSummary) aiSummary.style.display = 'none';

      const bodyEl = document.getElementById('articleBody');
      bodyEl.innerHTML = `
        <div class="editor-container" style="margin-top: 20px;">
          <input type="text" id="editorTitle" placeholder="Título del artículo" class="form-input" style="width:100%; margin-bottom: 12px; font-size: 20px; font-weight: 600;">
          <select id="editorCategory" class="form-input" style="width:100%; margin-bottom: 20px;">
              <option value="1">Tecnología</option>
              <option value="2">Ciencia</option>
              <option value="3">Historia</option>
              <option value="4">Arte</option>
          </select>
          <div id="quillEditor" style="height: 400px; background: var(--surface); border-radius: 0 0 8px 8px;"></div>
          <button id="btnSubmitArticle" class="btn-search" style="margin-top: 20px; width: 100%;">Publicar Artículo</button>
        </div>
      `;

      main.style.opacity = '1';
      
      // Initialize Quill
      quillInstance = new Quill('#quillEditor', {
        theme: 'snow',
        placeholder: 'Escribe el contenido enciclopédico aquí...',
        modules: {
          toolbar: [
            [{ 'header': [2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            ['blockquote', 'code-block'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['link', 'image']
          ]
        }
      });

      // Custom fix for Quill styles in Dark mode interacting with WikiAI base CSS
      document.querySelector('.ql-toolbar').style.background = 'var(--surface2)';
      document.querySelector('.ql-container').style.fontFamily = 'var(--font-sans)';
      document.querySelector('.ql-container').style.fontSize = '15.5px';

      document.getElementById('btnSubmitArticle').addEventListener('click', submitArticle);

    }, 300);
  }

  async function submitArticle() {
    const title = document.getElementById('editorTitle').value.trim();
    const category = document.getElementById('editorCategory').value;
    const content_html = quillInstance.root.innerHTML;
    const raw_text = quillInstance.getText();

    if (!title || raw_text.trim().length === 0) {
        showToast('El título y contenido no pueden estar vacíos.');
        return;
    }

    const token = localStorage.getItem('wikiai-token');
    const btn = document.getElementById('btnSubmitArticle');
    btn.disabled = true;
    btn.textContent = 'Publicando y Verificando (IA)...';

    try {
        const response = await fetch('/api/articles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title,
                category_id: parseInt(category),
                content_html,
                raw_text
            })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Artículo publicado. Revisa la evaluación IA en tu perfil.');
            // Volver a la portada temporalmente después de publicar
            setTimeout(() => { loadArticle('Portada'); }, 2000);
        } else {
            showToast(data.error || 'Error al publicar.');
            btn.disabled = false;
            btn.textContent = 'Publicar Artículo';
        }
    } catch (err) {
        console.error(err);
        showToast('Excepción conectando al servidor');
        btn.disabled = false;
        btn.textContent = 'Publicar Artículo';
    }
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', Editor.init);
