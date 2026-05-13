/**
 * WikiAI — js/voice.js
 * Búsqueda por voz con Speech Recognition API
 */

class VoiceSearch {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.overlay = null;
    this.statusEl = null;
    this.transcriptEl = null;
    this.btnVoice = null;
    this.supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  init() {
    this.overlay = document.getElementById('voiceOverlay');
    this.statusEl = document.getElementById('voiceStatus');
    this.transcriptEl = document.getElementById('voiceTranscript');
    this.btnVoice = document.getElementById('btnVoice');

    const cancelBtn = document.getElementById('btnCancelVoice');
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.stop());

    if (this.btnVoice) {
      this.btnVoice.addEventListener('click', () => this.toggle());
    }

    if (!this.supported) {
      if (this.btnVoice) {
        this.btnVoice.title = 'Tu navegador no soporta búsqueda por voz. Usa Chrome.';
        this.btnVoice.style.opacity = '0.4';
      }
      return;
    }

    this._setupRecognition();
  }

  _setupRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SR();
    this.recognition.lang = 'es-ES';
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    this.recognition.continuous = false;

    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.statusEl) this.statusEl.textContent = 'Escuchando…';
      if (this.transcriptEl) this.transcriptEl.textContent = '';
      if (this.overlay) this.overlay.classList.add('show');
      if (this.btnVoice) this.btnVoice.classList.add('listening');
    };

    this.recognition.onresult = (event) => {
      let interim = '', final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      if (this.transcriptEl) {
        this.transcriptEl.textContent = final || interim;
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.btnVoice) this.btnVoice.classList.remove('listening');

      const heard = this.transcriptEl?.textContent?.trim();
      if (heard) {
        if (this.statusEl) this.statusEl.textContent = 'Buscando…';
        setTimeout(() => {
          this._closeOverlay();
          const input = document.getElementById('searchInput');
          if (input) {
            input.value = heard;
            // Disparar búsqueda
            if (typeof triggerSearch === 'function') triggerSearch();
          }
        }, 800);
      } else {
        if (this.statusEl) this.statusEl.textContent = 'No se escuchó nada';
        setTimeout(() => this._closeOverlay(), 1500);
      }
    };

    this.recognition.onerror = (e) => {
      this.isListening = false;
      if (this.btnVoice) this.btnVoice.classList.remove('listening');

      const msgs = {
        'not-allowed': 'Permiso de micrófono denegado',
        'no-speech': 'No se detectó audio',
        'network': 'Error de red',
        'audio-capture': 'No se encontró micrófono',
      };
      const msg = msgs[e.error] || `Error: ${e.error}`;
      if (this.statusEl) this.statusEl.textContent = msg;
      setTimeout(() => this._closeOverlay(), 2000);
      console.warn('[WikiAI Voice]', e.error);
    };
  }

  toggle() {
    if (!this.supported) {
      showToast('Búsqueda por voz no disponible — usa Chrome o Edge');
      return;
    }
    if (this.isListening) {
      this.stop();
    } else {
      // Re-inicializar recognition (algunos navegadores requieren instancia nueva)
      this._setupRecognition();
      try {
        this.recognition.start();
      } catch (err) {
        console.warn('[WikiAI Voice] start error:', err);
        showToast('No se pudo iniciar el micrófono');
      }
    }
  }

  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    } else {
      this._closeOverlay();
    }
    if (this.btnVoice) this.btnVoice.classList.remove('listening');
    this.isListening = false;
  }

  _closeOverlay() {
    if (this.overlay) this.overlay.classList.remove('show');
  }
}

const voiceSearch = new VoiceSearch();
document.addEventListener('DOMContentLoaded', () => voiceSearch.init());