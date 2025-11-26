/* ===========================
   SzAi Chat — Final Logic (Complete)
   =========================== */
document.addEventListener('DOMContentLoaded', () => {

  const API_URL = "/api/chat"; 
  const DEFAULT_POSTER = '/static/images/bot_icon.png';
  
  // DOM Elements
  const toggleBtn = document.getElementById('sz-toggle-btn');
  const chatBox = document.getElementById('sz-chat-box');
  const clearBtn = document.getElementById('sz-clear-chat');
  const closeBtn = document.getElementById('sz-close-chat');
  const sendBtn = document.getElementById('sz-send');
  const inputField = document.getElementById('sz-input');
  const chatBody = document.getElementById('sz-chat-body');

  // Flag to ensure greeting happens only once per session
  let hasGreeted = false;

  // ---------- Online Indicator ----------
  (function attachOnlineIndicator() {
    const onlineDot = document.querySelector('.sz-status-dot');
    const onlineText = document.querySelector('.sz-status-text');
    
    function setStateOnline() {
      if(onlineDot) onlineDot.style.background = '#2ecc71';
      if(onlineText) onlineText.textContent = 'Online';
    }
    function setStateOffline() {
      if(onlineDot) onlineDot.style.background = '#95a5a6';
      if(onlineText) onlineText.textContent = 'Offline';
    }

    if (navigator.onLine) setStateOnline();
    else setStateOffline();

    window.addEventListener('online', setStateOnline);
    window.addEventListener('offline', setStateOffline);
  })();

  // ---------- Utilities ----------
  function formatHTML(text) {
    let t = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/\n/g, '<br>');
    t = t.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color:#bf2630; text-decoration:underline;">$1</a>');
    return t;
  }

  function smoothScrollToBottom() {
    setTimeout(() => {
      chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: 'smooth' });
    }, 50);
  }

  // ---------- Message Rendering ----------
  function addMessage(text, sender = 'bot', suggestions = []) {
    const wrapper = document.createElement('div');
    wrapper.className = `sz-msg sz-msg-${sender}`;

    const bubble = document.createElement('div');
    bubble.className = `sz-bubble sz-bubble-${sender}`;
    bubble.innerHTML = formatHTML(text);

    wrapper.appendChild(bubble);

    if (sender === 'bot' && Array.isArray(suggestions) && suggestions.length > 0) {
      const sugWrap = document.createElement('div');
      sugWrap.className = 'sz-suggestions';
      
      suggestions.forEach((s) => {
        const chip = document.createElement('div');
        chip.className = 'sz-chip';
        chip.textContent = s;
        chip.addEventListener('click', () => sendMessage(s));
        sugWrap.appendChild(chip);
      });

      const col = document.createElement('div');
      col.style.display = 'flex';
      col.style.flexDirection = 'column';
      col.style.alignItems = 'flex-start';
      col.appendChild(bubble);
      col.appendChild(sugWrap);
      
      wrapper.innerHTML = ''; 
      wrapper.appendChild(col);
    }

    chatBody.appendChild(wrapper);
    smoothScrollToBottom();
  }

  // --- IMAGE FIX: Use Modal instead of window.open ---
  function addImage(src) {
    const div = document.createElement('div');
    div.className = 'sz-msg sz-msg-bot';
    // Triggers the Image Modal defined at the bottom
    div.innerHTML = `<img src="${src}" class="sz-chat-img" alt="image" onclick="window.openSzImageModal('${src}')" title="Click to zoom">`;
    chatBody.appendChild(div);
    smoothScrollToBottom();
  }

  function addTyping(id) {
    const el = document.createElement('div');
    el.id = id;
    el.className = 'sz-msg sz-msg-bot';
    el.innerHTML = `
      <div class="sz-bubble sz-bubble-bot" style="padding: 12px 16px;">
        <div style="display:flex; gap:4px; align-items:center;">
          <div class="sz-dot" style="width:6px; height:6px; background:#888; border-radius:50%; animation:bounce 1.4s infinite -0.32s both;"></div>
          <div class="sz-dot" style="width:6px; height:6px; background:#888; border-radius:50%; animation:bounce 1.4s infinite -0.16s both;"></div>
          <div class="sz-dot" style="width:6px; height:6px; background:#888; border-radius:50%; animation:bounce 1.4s infinite both;"></div>
        </div>
      </div>
      <style>@keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }</style>
    `;
    chatBody.appendChild(el);
    smoothScrollToBottom();
  }

  function removeTyping(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  function addVideoInline(src, poster) {
    const escapedSrc = src.replace(/'/g, "\\'");
    const escapedPoster = (poster || '').replace(/'/g, "\\'");
    
    const div = document.createElement('div');
    div.className = 'sz-msg sz-msg-bot';
    
    div.innerHTML = `
      <div style="position:relative; display:inline-block; width:100%; max-width:280px;">
        <video style="width:100%; border-radius:12px; display:block; background:#000;" preload="metadata">
          <source src="${escapedSrc}" type="video/mp4">
        </video>
        <div 
          style="position:absolute; inset:0; background:rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; cursor:pointer; border-radius:12px;"
          onclick="window.openSzVideoModal('${escapedSrc}', '${escapedPoster}')"
        >
          <div style="width:40px; height:40px; background:rgba(255,255,255,0.9); border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 10px rgba(0,0,0,0.3);">
            <i class="fa-solid fa-play" style="color:#bf2630; font-size:14px; margin-left:2px;"></i>
          </div>
        </div>
      </div>`;
      
    chatBody.appendChild(div);
    smoothScrollToBottom();
  }

  // ---------- Core Logic: Send Message (With 2s Delay) ----------
  async function sendMessage(text) {
    if (!text) return;

    addMessage(text, 'user');
    
    inputField.value = '';
    inputField.disabled = true;
    sendBtn.disabled = true;

    const typingId = 'typing-' + Date.now();
    addTyping(typingId);

    try {
      const [res, _] = await Promise.all([
        fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ msg: text })
        }),
        new Promise(resolve => setTimeout(resolve, 2000)) // 2 Second Thinking Delay
      ]);

      const data = await res.json();

      removeTyping(typingId);
      inputField.disabled = false;
      sendBtn.disabled = false;
      inputField.focus();

      addMessage(data.response, 'bot', data.suggestions || []);
      if (data.image) addImage(data.image);
      if (data.video) addVideoInline(data.video, data.context_poster);

    } catch (err) {
      console.error(err);
      removeTyping(typingId);
      inputField.disabled = false;
      sendBtn.disabled = false;
      inputField.focus();
      addMessage("Couldn't connect to the server. Please try again.", 'bot');
    }
  }

  // ---------- UI Event Listeners ----------
  toggleBtn?.addEventListener('click', () => {
    chatBox.classList.toggle('open');
    if (chatBox.classList.contains('open')) {
      setTimeout(() => inputField.focus(), 300);
      
      // Greeting Logic
      if (!hasGreeted) {
        hasGreeted = true;
        setTimeout(() => {
          addMessage("Hello! I am **SzAi**, your HR Assistant. How can I help you today?", 'bot', 
            ['How to apply leave?', 'Check leave balance', 'Download Payslip']);
        }, 400);
      }
    }
  });

  closeBtn?.addEventListener('click', () => chatBox.classList.remove('open'));
  
  clearBtn?.addEventListener('click', () => { 
    chatBody.innerHTML = ''; 
    hasGreeted = false; // Optional: Reset greeting so it appears again if cleared
  });

  sendBtn?.addEventListener('click', () => sendMessage(inputField.value.trim()));
  
  inputField?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage(inputField.value.trim());
  });

  // ===============================================
  //  LOGIC: Image Pan/Zoom Modal
  // ===============================================
  (function initImageModal() {
    const modal = document.getElementById('sz-image-modal');
    if (!modal) return;

    const modalImg = document.getElementById('sz-full-image');
    const closeBtn = document.querySelector('.sz-close-img');
    const container = document.querySelector('.sz-img-view-container');
    
    // Zoom Controls
    const zoomInBtn = document.getElementById('sz-zoom-in');
    const zoomOutBtn = document.getElementById('sz-zoom-out');
    const resetBtn = document.getElementById('sz-zoom-reset');

    let scale = 1;
    let pointX = 0;
    let pointY = 0;
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    function updateTransform() {
      modalImg.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
    }

    // Expose this function globally so addImage() can use it
    window.openSzImageModal = function(src) {
      modal.style.display = "block";
      modalImg.src = src;
      // Reset State
      scale = 1; pointX = 0; pointY = 0;
      updateTransform();
    };

    function closeModal() { modal.style.display = "none"; }
    
    closeBtn?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if(e.target === modal || e.target === container) closeModal();
    });

    // Zoom Logic
    function zoom(direction) {
      const step = 0.2;
      if (direction === 'in') scale += step;
      else scale = Math.max(0.5, scale - step);
      updateTransform();
    }

    zoomInBtn?.addEventListener('click', () => zoom('in'));
    zoomOutBtn?.addEventListener('click', () => zoom('out'));
    resetBtn?.addEventListener('click', () => {
      scale = 1; pointX = 0; pointY = 0; updateTransform();
    });

    // Mouse Wheel Zoom
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      scale += e.deltaY * -0.001;
      scale = Math.min(Math.max(0.5, scale), 5);
      updateTransform();
    });

    // Pan (Drag) Logic
    container.addEventListener('mousedown', (e) => {
      if(e.target !== modalImg && e.target !== container) return;
      isDragging = true;
      startX = e.clientX - pointX;
      startY = e.clientY - pointY;
      container.style.cursor = 'grabbing';
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
      pointX = e.clientX - startX;
      pointY = e.clientY - startY;
      updateTransform();
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
      if(container) container.style.cursor = 'grab';
    });
  })();

  // ===============================================
  //  LOGIC: Modern Video Player
  // ===============================================
  (function () {
    const modal = document.getElementById('sz-modal');
    const popup = document.getElementById('sz-video-popup');
    const backdrop = document.getElementById('sz-modal-backdrop');
    const closeBtnVideo = document.getElementById('sz-modal-close');
    const videoEl = document.getElementById('sz-popup-video');
    const centerPlay = document.getElementById('sz-center-play');
    
    const playBtn = document.getElementById('sz-playpause');
    const rewindBtn = document.getElementById('sz-rewind');
    const forwardBtn = document.getElementById('sz-forward');
    const timeEl = document.getElementById('sz-time');
    const muteBtn = document.getElementById('sz-mute');
    const volRange = document.getElementById('sz-vol');
    const pipBtn = document.getElementById('sz-pip');
    const fullBtn = document.getElementById('sz-full');

    const progressWrap = document.getElementById('sz-progress-wrap');
    const progress = document.getElementById('sz-progress');
    const buff = document.getElementById('sz-progress-buffer');
    const played = document.getElementById('sz-progress-played');
    const tooltip = document.getElementById('sz-progress-tooltip');

    function fmt(t) { 
      if (!isFinite(t)) return '0:00'; 
      const s = Math.floor(t % 60); 
      const m = Math.floor(t / 60); 
      return `${m}:${s.toString().padStart(2, '0')}`; 
    }

    function updateTime() { 
      if (!timeEl) return; 
      timeEl.textContent = `${fmt(videoEl.currentTime)} / ${fmt(videoEl.duration)}`; 
      const pct = (videoEl.currentTime / videoEl.duration || 0) * 100; 
      if (played) played.style.width = pct + '%'; 
    }
    
    function updateBuffer() { 
      try { 
        const ranges = videoEl.buffered; 
        if (ranges.length) { 
          const end = ranges.end(ranges.length - 1); 
          if (buff) buff.style.width = ((end / videoEl.duration || 0) * 100) + '%'; 
        } 
      } catch (e) { } 
    }

    function togglePlay() { 
      if (videoEl.paused) videoEl.play(); 
      else videoEl.pause(); 
      updatePlayUI(); 
    }

    function updatePlayUI() { 
      if (playBtn) playBtn.innerHTML = videoEl.paused ? '<i class="fa-solid fa-play"></i>' : '<i class="fa-solid fa-pause"></i>';
      if (centerPlay) centerPlay.style.display = videoEl.paused ? 'flex' : 'none';
    }

    function updateVolUI() {
      if (!muteBtn) return;
      if (videoEl.muted || videoEl.volume === 0) muteBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
      else if (videoEl.volume < 0.5) muteBtn.innerHTML = '<i class="fa-solid fa-volume-low"></i>';
      else muteBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
    }

    // Listeners
    videoEl.addEventListener('timeupdate', updateTime);
    videoEl.addEventListener('progress', updateBuffer);
    videoEl.addEventListener('play', updatePlayUI);
    videoEl.addEventListener('pause', updatePlayUI);
    videoEl.addEventListener('click', togglePlay);
    videoEl.addEventListener('ended', () => { videoEl.currentTime = 0; videoEl.pause(); });

    playBtn?.addEventListener('click', togglePlay);
    centerPlay?.addEventListener('click', togglePlay);
    rewindBtn?.addEventListener('click', () => videoEl.currentTime = Math.max(0, videoEl.currentTime - 10));
    forwardBtn?.addEventListener('click', () => videoEl.currentTime = Math.min(videoEl.duration || 0, videoEl.currentTime + 10));

    function seekTo(clientX) { 
      const rect = progressWrap.getBoundingClientRect(); 
      let x = Math.min(rect.width, Math.max(0, clientX - rect.left)); 
      const pct = x / rect.width; 
      videoEl.currentTime = (videoEl.duration || 0) * pct; 
    }
    
    let seeking = false;
    progressWrap?.addEventListener('mousedown', (ev) => { seeking = true; seekTo(ev.clientX); });
    window.addEventListener('mousemove', (ev) => { if (seeking) seekTo(ev.clientX); });
    window.addEventListener('mouseup', () => seeking = false);
    progressWrap?.addEventListener('click', (ev) => seekTo(ev.clientX));

    progressWrap?.addEventListener('mousemove', (ev) => {
      const rect = progressWrap.getBoundingClientRect();
      const x = Math.min(rect.width, Math.max(0, ev.clientX - rect.left));
      const pct = x / rect.width;
      tooltip.textContent = fmt((videoEl.duration || 0) * pct);
      tooltip.style.display = 'block';
      tooltip.style.left = x + 'px';
    });
    progressWrap?.addEventListener('mouseleave', () => tooltip.style.display = 'none');

    volRange?.addEventListener('input', () => { 
      videoEl.volume = volRange.value; 
      videoEl.muted = (videoEl.volume === 0);
      updateVolUI();
    });
    
    muteBtn?.addEventListener('click', () => { 
      videoEl.muted = !videoEl.muted; 
      if (videoEl.muted) volRange.value = 0; 
      else volRange.value = videoEl.volume || 1; 
      updateVolUI(); 
    });

    pipBtn?.addEventListener('click', async () => { 
      if (document.pictureInPictureElement) document.exitPictureInPicture(); 
      else try { await videoEl.requestPictureInPicture(); } catch(e) {} 
    });
    
    fullBtn?.addEventListener('click', async () => { 
      if (!document.fullscreenElement) popup.requestFullscreen().catch(()=>{}); 
      else document.exitFullscreen().catch(()=>{}); 
    });

    function closeModal() { 
      modal.setAttribute('aria-hidden', 'true'); 
      try { videoEl.pause(); videoEl.currentTime = 0; } catch (e) {} 
      backdrop.style.opacity = 0; 
    }
    closeBtnVideo?.addEventListener('click', closeModal);
    backdrop?.addEventListener('click', closeModal);

    // Expose Global Video Opener
    window.openSzVideoModal = function (src, poster) {
      if (!src) return;
      modal.setAttribute('aria-hidden', 'false');
      backdrop.style.opacity = 1;
      
      while (videoEl.firstChild) videoEl.removeChild(videoEl.firstChild);
      const srcEl = document.createElement('source');
      srcEl.src = src; srcEl.type = 'video/mp4';
      videoEl.appendChild(srcEl);
      
      if (poster) videoEl.setAttribute('poster', poster); else videoEl.removeAttribute('poster');
      videoEl.load();
      videoEl.volume = 1; 
      if(volRange) volRange.value = 1; 
      videoEl.muted = false;
      
      updateVolUI();
      updatePlayUI();
      
      videoEl.play().catch(e => console.log('Autoplay prevented', e));
    };
  })(); 
});