/**
 * WikiAI — js/auth.js
 */
const Auth = (() => {
  const USERS_KEY = 'wikiai-users';
  const SESSION_KEY = 'wikiai-session';

  function init() {
    // Botón login en header
    const btnLogin = document.getElementById('btnLogin');
    if (btnLogin) {
        btnLogin.addEventListener('click', () => {
            if (localStorage.getItem('wikiai-token')) {
                loadProfile();
            } else {
                showModal('login');
            }
        });
    }

    // Clic en el saludo (email) para abrir perfil
    const userGreeting = document.getElementById('userGreeting');
    if (userGreeting) {
        userGreeting.addEventListener('click', loadProfile);
    }

    // Botón submit login
    const loginSubmit = document.getElementById('btnLoginSubmit');
    if (loginSubmit) loginSubmit.addEventListener('click', handleLogin);

    // Botón submit register
    const regSubmit = document.getElementById('btnRegisterSubmit');
    if (regSubmit) regSubmit.addEventListener('click', handleRegister);

    // Switches entre modales
    const toReg = document.getElementById('toRegister');
    if (toReg) toReg.addEventListener('click', (e) => { e.preventDefault(); switchModal('login', 'register'); });

    const toLog = document.getElementById('toLogin');
    if (toLog) toLog.addEventListener('click', (e) => { e.preventDefault(); switchModal('register', 'login'); });

    // Botón update profile y logout
    const btnUpdateProfile = document.getElementById('btnUpdateProfile');
    if (btnUpdateProfile) btnUpdateProfile.addEventListener('click', updateProfile);

    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) btnLogout.addEventListener('click', logout);

    const btnTopLogout = document.getElementById('btnTopLogout');
    if (btnTopLogout) btnTopLogout.addEventListener('click', logout);

    // Restaurar sesión
    const session = localStorage.getItem(SESSION_KEY);
    if (session) {
        setLoggedIn(session);
    } else {
        setLoggedOut();
    }

    // Inicializar Google Auth
    initGoogle();
  }

  function initGoogle() {
    if (!window.google) {
        setTimeout(initGoogle, 500);
        return;
    }

    google.accounts.id.initialize({
      client_id: "789267310725-gc8tb2slgu6aq17hocdn55mvo3r5h1eo.apps.googleusercontent.com",
      callback: handleGoogleLogin
    });

    // Renderizar en ambos contenedores (Login y Register)
    const containers = ["googleBtnContainer", "googleBtnContainerReg"];
    containers.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        google.accounts.id.renderButton(el, { 
          theme: "outline", 
          size: "large", 
          width: "280", 
          text: "continue_with" 
        });
      }
    });
  }

  async function handleGoogleLogin(response) {
    try {
        const res = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: response.credential })
        });
        const data = await res.json();

        if (!res.ok) {
            showToast(data.error || 'Error en Google Login');
            return;
        }

        localStorage.setItem('wikiai-token', data.token);
        localStorage.setItem(SESSION_KEY, data.user.email);
        
        setLoggedIn(data.user.email);
        document.getElementById('loginModal')?.classList.remove('show');
        document.getElementById('registerModal')?.classList.remove('show');
        showToast(`¡Bienvenido de nuevo!`);
    } catch (err) {
        console.error('Google Auth Error:', err);
        showToast('Error conectando con el servidor');
    }
  }

  function showModal(type) {
    const id = type === 'login' ? 'loginModal' : type === 'profile' ? 'profileModal' : 'registerModal';
    document.getElementById(id)?.classList.add('show');
  }

  function switchModal(from, to) {
    document.getElementById(from + 'Modal')?.classList.remove('show');
    document.getElementById(to + 'Modal')?.classList.add('show');
  }

  async function handleLogin() {
    const email = document.getElementById('loginEmail')?.value?.trim();
    const pass = document.getElementById('loginPassword')?.value;
    if (!email || !pass) { showToast('Completa todos los campos'); return; }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: pass })
      });
      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || 'Error al iniciar sesión');
        return;
      }

      localStorage.setItem('wikiai-token', data.token);
      localStorage.setItem(SESSION_KEY, data.user.email);
      setLoggedIn(data.user.email);
      document.getElementById('loginModal')?.classList.remove('show');
      showToast(`¡Bienvenido de nuevo!`);
    } catch (err) {
      console.error(err);
      showToast('Error de conexión con el servidor');
    }
  }

  async function handleRegister() {
    const email = document.getElementById('regEmail')?.value?.trim();
    const pass = document.getElementById('regPassword')?.value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { showToast('Ingresa un correo electrónico válido'); return; }

    if (pass.length < 8) { showToast('La contraseña debe tener al menos 8 caracteres'); return; }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: pass })
      });
      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || 'Error al registrarse');
        return;
      }

      document.getElementById('registerModal')?.classList.remove('show');
      switchModal('register', 'login');
      document.getElementById('loginEmail').value = email;
      showToast(`¡Cuenta creada! Inicia sesión ahora.`);
    } catch (err) {
      console.error(err);
      showToast('Error de conexión con el servidor');
    }
  }

  function setLoggedIn(displayIdent) {
    const btnLogin = document.getElementById('btnLogin');
    const authNav = document.getElementById('authNav');
    const userGreeting = document.getElementById('userGreeting');
    
    if (btnLogin) btnLogin.style.display = 'none';
    if (authNav) authNav.style.display = 'flex';
    if (userGreeting) {
        userGreeting.textContent = displayIdent;
        // Si el identificador es un correo muy largo, lo truncamos visualmente pero mantenemos el title
        userGreeting.title = displayIdent;
    }
  }

  function setLoggedOut() {
    const btnLogin = document.getElementById('btnLogin');
    const authNav = document.getElementById('authNav');
    
    if (btnLogin) btnLogin.style.display = 'block';
    if (authNav) authNav.style.display = 'none';
  }

  async function loadProfile() {
      const token = localStorage.getItem('wikiai-token');
      if (!token) return;

      try {
          const res = await fetch('/api/user/profile', {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (!res.ok) {
              if (res.status === 401 || res.status === 403) logout();
              return showToast(data.error || 'Error cargando perfil');
          }

          document.getElementById('profileUsername').value = data.user.username;
          document.getElementById('profileEmail').value = data.user.email;
          
          // Ajustar placeholder de contraseña para usuarios de Google sin clave previa
          const currentPassInput = document.getElementById('profileCurrentPassword');
          if (currentPassInput) {
              currentPassInput.placeholder = data.user.isSocial ? "No requerida inicial" : "Actual";
              currentPassInput.disabled = data.user.isSocial && !data.user.hasPassword;
              if (data.user.isSocial && !data.user.hasPassword) {
                  currentPassInput.style.opacity = "0.5";
                  currentPassInput.title = "No necesitas contraseña actual si entraste con Google";
              } else {
                  currentPassInput.style.opacity = "1";
                  currentPassInput.disabled = false;
              }
          }

          // Mensaje de guía dinámico
          const guideMsg = document.getElementById('profileGuideMessage');
          if (guideMsg) {
              if (data.user.isSocial && !data.user.hasPassword) {
                  guideMsg.style.background = "rgba(108, 92, 231, 0.1)";
                  guideMsg.style.color = "var(--accent-primary)";
                  guideMsg.style.border = "1px solid rgba(108, 92, 231, 0.2)";
                  guideMsg.innerHTML = "✨ <strong>Tip:</strong> Has entrado con Google. Puedes establecer una contraseña aquí para habilitar también el acceso manual.";
              } else if (data.user.isSocial && data.user.hasPassword) {
                  guideMsg.style.background = "rgba(0, 184, 148, 0.1)";
                  guideMsg.style.color = "#00b894";
                  guideMsg.style.border = "1px solid rgba(0, 184, 148, 0.2)";
                  guideMsg.innerHTML = "✅ <strong>Acceso Dual:</strong> Ya tienes una contraseña manual establecida. Puedes entrar vía Google o con tu correo y clave.";
              } else {
                  guideMsg.style.background = "rgba(9, 132, 227, 0.1)";
                  guideMsg.style.color = "#0984e3";
                  guideMsg.style.border = "1px solid rgba(9, 132, 227, 0.2)";
                  guideMsg.innerHTML = "🔐 <strong>Identidad verificada:</strong> Aquí puedes actualizar tu contraseña de acceso cuando lo desees.";
              }
          }

          // Mostrar siempre sección de contraseña para permitir acceso dual (Manual + Google)
          const pwdSection = document.querySelector('.password-change-section');
          const btnUpdate = document.getElementById('btnUpdateProfile');
          
          if (pwdSection) pwdSection.style.display = 'block';
          if (btnUpdate) btnUpdate.style.display = 'block';

          // Renderizar artículos
          const list = document.getElementById('userArticlesList');
          if (list) {
              if (data.articles && data.articles.length > 0) {
                  list.innerHTML = data.articles.map(art => `
                      <div class="user-article-item">
                          <span class="user-article-title">${art.title}</span>
                          <span class="user-article-date">${new Date(art.published_at).toLocaleDateString()}</span>
                      </div>
                  `).join('');
              } else {
                  list.innerHTML = '<p style="font-size:12px; color:var(--text-muted); text-align:center; padding:10px;">Aún no has publicado artículos.</p>';
              }
          }

          // Cargar historial de búsqueda
          try {
              const histRes = await fetch('/api/search-history', {
                  headers: { 'Authorization': `Bearer ${token}` }
              });
              const histData = await histRes.json();
              const histList = document.getElementById('userSearchHistory');
              
              if (histList) {
                  if (histRes.ok && histData.length > 0) {
                      histList.innerHTML = histData.map(h => `
                          <div class="user-article-item" style="cursor:pointer;" onclick="document.getElementById('profileModal').classList.remove('show'); loadArticle('${h.query.replace(/'/g, "\\'")}')">
                              <span class="user-article-title" style="color:var(--accent-primary);"><span style="font-size:12px;margin-right:6px">🔍</span>${h.query}</span>
                              <span class="user-article-date">${new Date(h.created_at).toLocaleDateString()}</span>
                          </div>
                      `).join('');
                  } else {
                      histList.innerHTML = '<p style="font-size:12px; color:var(--text-muted); text-align:center; padding:10px;">No hay búsquedas recientes.</p>';
                  }
              }
          } catch(e) {
              console.error('Error cargando historial', e);
          }

          showModal('profile');
      } catch (err) {
          console.error(err);
          showToast('Error de conexión');
      }
  }

  async function updateProfile() {
      const token = localStorage.getItem('wikiai-token');
      const user = document.getElementById('profileUsername')?.value?.trim();
      const email = document.getElementById('profileEmail')?.value?.trim();
      const currentPassword = document.getElementById('profileCurrentPassword')?.value || undefined;
      const newPassword = document.getElementById('profileNewPassword')?.value || undefined;

      if (!user || !email) return showToast('Completa los campos obligatorios');
      const currentPassInput = document.getElementById('profileCurrentPassword');
      const isCurrentPassDisabled = currentPassInput ? currentPassInput.disabled : false;

      if (newPassword && !currentPassword && !isCurrentPassDisabled) {
          return showToast('Ingresa tu contraseña actual');
      }

      try {
          const res = await fetch('/api/user/profile', {
              method: 'PUT',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ username: user, email, currentPassword, newPassword })
          });
          const data = await res.json();

          if (!res.ok) return showToast(data.error || 'Error actualizando perfil');

          localStorage.setItem(SESSION_KEY, data.user.username);
          setLoggedIn(data.user.username);
          showToast('Perfil actualizado exitosamente');
          document.getElementById('profileModal').classList.remove('show');
      } catch (err) {
          console.error(err);
          showToast('Error de conexión');
      }
  }

  function logout() {
      if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
          localStorage.removeItem('wikiai-token');
          localStorage.removeItem(SESSION_KEY);
          setLoggedOut();
          document.getElementById('profileModal')?.classList.remove('show');
          showToast('Sesión cerrada');
      }
  }

    return { init, showModal, loadProfile };
  })();

document.addEventListener('DOMContentLoaded', Auth.init);