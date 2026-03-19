/* ============================================================
   ST. MICHAEL CLEANING — SUBSCRIPTION SITE
   Splash, scroll, form logic, audio
   ============================================================ */

/* ---- Audio System ---- */
const audio = {
  enabled: false,
  autoMuted: false,
  jingle: null,
  init() {
    this.jingle = document.getElementById('jingle');
  },
  enable() {
    this.enabled = true;
    this.autoMuted = false;
    resetInactivityTimer();
  },
  stop() {
    if (this.jingle) { this.jingle.pause(); this.jingle.currentTime = 0; }
  }
};

/* ---- Inactivity auto-mute (30s) ---- */
let inactivityTimer = null;

function resetInactivityTimer() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  if (audio.autoMuted) {
    audio.autoMuted = false;
    audio.enabled = true;
    const btn = document.getElementById('muteBtn');
    if (btn) { btn.textContent = '\u{1F50A}'; btn.style.opacity = '.7'; }
  }
  inactivityTimer = setTimeout(() => {
    if (audio.enabled) {
      audio.autoMuted = true;
      audio.enabled = false;
      audio.stop();
      const btn = document.getElementById('muteBtn');
      if (btn) { btn.textContent = '\u{1F507}'; btn.style.opacity = '.4'; }
    }
  }, 30000);
}

['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'].forEach(evt => {
  document.addEventListener(evt, resetInactivityTimer, { passive: true });
});

function toggleMute() {
  audio.autoMuted = false;
  const btn = document.getElementById('muteBtn');
  if (audio.enabled) {
    audio.enabled = false;
    audio.stop();
    // Stop narration tour
    narrationRunning = false;
    narrationQueue.forEach(item => { item.audio.pause(); item.audio.currentTime = 0; });
    bgMusic.pause(); bgMusic.currentTime = 0;
    // Clear highlights
    document.querySelectorAll('.scrubbypts, .hero, .whats-included, .how-it-works, .plans, .property-manager, .consultation').forEach(el => el.style.boxShadow = '');
    btn.textContent = '\u{1F507}';
    btn.style.opacity = '.4';
  } else {
    audio.enabled = true;
    btn.textContent = '\u{1F50A}';
    btn.style.opacity = '.7';
  }
}

/* ---- Splash Particles ---- */
(function initSplash() {
  const container = document.getElementById('particles');
  if (!container) return;
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 60 + 10;
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDuration = (Math.random() * 8 + 6) + 's';
    p.style.animationDelay = (Math.random() * 5) + 's';
    container.appendChild(p);
  }
})();

/* ---- Bubble cursor (site-wide) ---- */
(function initBubbleCursor() {
  function spawnBubble(x, y) {
    const b = document.createElement('div');
    b.className = 'bubble';
    const size = Math.random() * 20 + 8;
    b.style.width = size + 'px';
    b.style.height = size + 'px';
    b.style.left = (x - size / 2) + 'px';
    b.style.top = (y - size / 2) + 'px';
    document.body.appendChild(b);
    b.addEventListener('animationend', () => b.remove());
  }
  let lastX = 0, lastY = 0;
  document.addEventListener('mousemove', e => {
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    if (Math.abs(dx) + Math.abs(dy) > 20) {
      spawnBubble(e.clientX, e.clientY);
      lastX = e.clientX; lastY = e.clientY;
    }
  });
  document.addEventListener('touchmove', e => {
    const t = e.touches[0];
    const dx = t.clientX - lastX, dy = t.clientY - lastY;
    if (Math.abs(dx) + Math.abs(dy) > 20) {
      spawnBubble(t.clientX, t.clientY);
      lastX = t.clientX; lastY = t.clientY;
    }
  });
  document.addEventListener('click', e => {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        spawnBubble(
          e.clientX + (Math.random() - .5) * 40,
          e.clientY + (Math.random() - .5) * 40
        );
      }, i * 50);
    }
  });
})();

/* ---- Jingle story synced to spectral peaks (106 BPM) ---- */
const STORY_PHASES = [
  { t: 0.73,  text: "Hold on \u2014 we're tidying up for you\u2026", phase: 'cleaning' },
  { t: 2.69,  text: "Bubbles going up\u2026", phase: 'cleaning' },
  { t: 4.31,  text: "Scrubbing the floors, wiping the glass\u2026", phase: 'cleaning' },
  { t: 6.05,  text: "Dusting off every corner\u2026", phase: 'polishing' },
  { t: 8.27,  text: "Almost there \u2014 rinsing it all down\u2026", phase: 'polishing' },
  { t: 10.27, text: "Now watch that sparkle\u2026", phase: 'shining' },
  { t: 13.03, text: "Everything's shining bright\u2026", phase: 'shining' },
  { t: 15.01, text: "All clean. Welcome in.", phase: 'welcome' }
];

const JINGLE_LYRICS = [
  { t: 0.73,  text: "St. Michael Cleaning \u2013 we make it shine" },
  { t: 2.69,  text: "Bubbles up, every time" },
  { t: 4.31,  text: "From floors to glass, we do the work" },
  { t: 6.05,  text: "Fresh and clean, no dust, no dirt" },
  { t: 8.27,  text: "Call St. Michael, let it flow" },
  { t: 10.27, text: "Watch that sparkle start to glow" },
  { t: 13.03, text: "St. Michael Cleaning \u2013 fast and bright" },
  { t: 15.01, text: "We scrub it clean, we do it right" }
];

let jingleTimers = [];

function spawnBubbleBurst(container, count) {
  for (let i = 0; i < count; i++) {
    const b = document.createElement('div');
    b.className = 'splash-burst';
    const size = Math.random() * 30 + 10;
    b.style.width = size + 'px';
    b.style.height = size + 'px';
    b.style.left = (10 + Math.random() * 80) + '%';
    b.style.top = (20 + Math.random() * 60) + '%';
    b.style.animationDelay = (Math.random() * 0.2) + 's';
    container.appendChild(b);
    b.addEventListener('animationend', () => b.remove());
  }
}

function spawnJingleBubbles() {
  const container = document.getElementById('particles');
  for (let i = 0; i < 15; i++) {
    const b = document.createElement('div');
    b.className = 'splash-jingle-bubble';
    const size = Math.random() * 50 + 12;
    b.style.width = size + 'px';
    b.style.height = size + 'px';
    b.style.left = Math.random() * 100 + '%';
    b.style.bottom = '-' + size + 'px';
    b.style.animationDuration = (Math.random() * 6 + 5) + 's';
    b.style.animationDelay = (Math.random() * 3) + 's';
    container.appendChild(b);
  }
}

function spawnSplashSparkles() {
  const splash = document.getElementById('splash');
  for (let i = 0; i < 12; i++) {
    const s = document.createElement('div');
    s.className = 'splash-sparkle';
    s.style.left = (10 + Math.random() * 80) + '%';
    s.style.top = (10 + Math.random() * 80) + '%';
    s.style.setProperty('--sx', (Math.random() - .5) * 100 + 'px');
    s.style.setProperty('--sy', (Math.random() - .5) * 100 + 'px');
    splash.appendChild(s);
    s.addEventListener('animationend', () => s.remove());
  }
}

function triggerBeat(splash, container, intensity) {
  const logo = document.getElementById('storyLogo');
  if (logo) { logo.classList.remove('beat'); void logo.offsetWidth; logo.classList.add('beat'); }
  splash.classList.remove('beat-flash');
  void splash.offsetWidth;
  splash.classList.add('beat-flash');
  setTimeout(() => splash.classList.remove('beat-flash'), 600);
  const title = splash.querySelector('.splash-title');
  if (title) { title.classList.add('glow'); setTimeout(() => title.classList.remove('glow'), 500); }
  spawnBubbleBurst(splash, intensity === 'high' ? 10 : 5);
  for (let i = 0; i < (intensity === 'high' ? 6 : 3); i++) {
    const b = document.createElement('div');
    b.className = 'splash-jingle-bubble';
    const size = Math.random() * 45 + 15;
    b.style.width = size + 'px';
    b.style.height = size + 'px';
    b.style.left = Math.random() * 100 + '%';
    b.style.bottom = '-' + size + 'px';
    b.style.animationDuration = (Math.random() * 5 + 4) + 's';
    b.style.animationDelay = (Math.random() * .3) + 's';
    container.appendChild(b);
  }
  if (intensity === 'high') {
    const shimmer = document.createElement('div');
    shimmer.className = 'splash-shimmer';
    splash.appendChild(shimmer);
    shimmer.addEventListener('animationend', () => shimmer.remove());
  }
}

function startJingleLyrics() {
  const splash = document.getElementById('splash');
  const container = document.getElementById('particles');
  const storyEl = document.getElementById('splashStory');
  const storyText = document.getElementById('storyText');
  const suds = document.getElementById('splashSuds');

  jingleTimers.forEach(t => clearTimeout(t));
  jingleTimers = [];
  storyEl.classList.add('visible');

  jingleTimers.push(setTimeout(() => { suds.style.height = '20%'; }, 500));
  jingleTimers.push(setTimeout(() => { suds.style.height = '40%'; }, 6000));
  jingleTimers.push(setTimeout(() => { suds.style.height = '60%'; }, 12000));
  jingleTimers.push(setTimeout(() => { suds.style.height = '15%'; }, 18000));
  jingleTimers.push(setTimeout(() => { suds.style.height = '0'; }, 21000));

  STORY_PHASES.forEach((phase, idx) => {
    const timer = setTimeout(() => {
      const logo = document.getElementById('storyLogo');
      if (logo) {
        logo.className = 'story-logo phase-' + phase.phase;
        logo.classList.remove('beat');
        void logo.offsetWidth;
        logo.classList.add('beat');
      }
      const wrap = document.getElementById('storyLogoWrap');
      if (wrap) {
        const ripple = document.createElement('div');
        ripple.className = 'story-ripple';
        wrap.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove());
      }
      storyText.style.opacity = '0';
      setTimeout(() => {
        storyText.textContent = phase.text;
        storyText.style.opacity = '1';
      }, 150);
      splash.className = 'splash phase-' + phase.phase;
      const isSparkle = /shine|sparkle|glow|bright/i.test(JINGLE_LYRICS[idx].text);
      triggerBeat(splash, container, isSparkle ? 'high' : 'normal');
      if (isSparkle) spawnSplashSparkles();
    }, phase.t * 1000);
    jingleTimers.push(timer);
  });

  const midBeats = [1.44,3.24,4.93,5.49,7.09,7.68,9.40,9.99,11.10,11.67,12.22,14.46,16.13,16.70,17.81,18.95,19.51,20.64,21.94,22.58];
  midBeats.forEach(t => {
    const timer = setTimeout(() => {
      const logo = document.getElementById('storyLogo');
      if (logo) { logo.classList.remove('beat'); void logo.offsetWidth; logo.classList.add('beat'); }
      for (let i = 0; i < 3; i++) {
        const b = document.createElement('div');
        b.className = 'splash-jingle-bubble';
        const size = Math.random() * 30 + 10;
        b.style.width = size + 'px';
        b.style.height = size + 'px';
        b.style.left = Math.random() * 100 + '%';
        b.style.bottom = '-' + size + 'px';
        b.style.animationDuration = (Math.random() * 4 + 3) + 's';
        container.appendChild(b);
      }
    }, t * 1000);
    jingleTimers.push(timer);
  });
}

/* ---- Splash Dismiss ---- */
let jingleSkipped = false;

function skipToPage() {
  if (jingleSkipped) return;
  jingleSkipped = true;
  const splash = document.getElementById('splash');
  const jingle = document.getElementById('jingle');
  jingle.pause();
  jingleTimers.forEach(t => clearTimeout(t));
  const storyEl = document.getElementById('splashStory');
  if (storyEl) storyEl.classList.remove('visible');
  splash.classList.add('fade-out');
  audio.enable();
  setTimeout(() => {
    splash.classList.add('hidden');
    const app = document.getElementById('app');
    app.classList.remove('hidden');
    app.style.opacity = '0';
    app.style.transition = 'opacity 0.8s ease';
    requestAnimationFrame(() => { app.style.opacity = '1'; });
    initForm();
    spawnPageBubbles();
    initScrollAnimations();
    setTimeout(() => startNarrationTour(), 400);
  }, 400);
}

function dismissSplash() {
  const splash = document.getElementById('splash');
  const jingle = document.getElementById('jingle');
  const splashContent = splash.querySelector('.splash-content');
  if (splashContent) splashContent.style.display = 'none';

  audio.init();
  jingleSkipped = false;

  // Double-tap anywhere on splash to skip jingle
  let tapCount = 0;
  let tapTimer = null;
  splash.addEventListener('click', function onTap() {
    tapCount++;
    if (tapCount >= 2) {
      splash.removeEventListener('click', onTap);
      skipToPage();
      return;
    }
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { tapCount = 0; }, 600);
  });

  jingle.volume = 0.5;
  jingle.play().catch(() => {});
  spawnJingleBubbles();
  startJingleLyrics();

  jingle.addEventListener('ended', function onJingleEnd() {
    jingle.removeEventListener('ended', onJingleEnd);
    if (jingleSkipped) return;
    jingleSkipped = true;
    jingleTimers.forEach(t => clearTimeout(t));
    const storyEl = document.getElementById('splashStory');
    if (storyEl) storyEl.classList.remove('visible');

    // Quick transition
    splash.classList.add('fade-out');
    audio.enable();
    setTimeout(() => {
      splash.classList.add('hidden');
      const app = document.getElementById('app');
      app.classList.remove('hidden');
      app.style.opacity = '0';
      app.style.transition = 'opacity 0.8s ease';
      requestAnimationFrame(() => { app.style.opacity = '1'; });
      initForm();
      spawnPageBubbles();
      initScrollAnimations();
      // Start narration immediately
      setTimeout(() => startNarrationTour(), 400);
    }, 400);
  });
}

/* ---- Plan Selection & Scroll ---- */
function selectPlan(plan) {
  const radio = document.querySelector('input[name="plan"][value="' + plan + '"]');
  if (radio) radio.checked = true;

  // Show/hide properties field
  const pf = document.getElementById('propertiesField');
  if (plan === 'Custom') {
    pf.classList.remove('hidden');
  } else {
    pf.classList.add('hidden');
  }

  // Scroll to form
  const section = document.getElementById('consultation');
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function selectPropertyManager() {
  selectPlan('Custom');
  const pf = document.getElementById('propertiesField');
  pf.classList.remove('hidden');
  setTimeout(() => {
    const inp = document.getElementById('numProperties');
    if (inp) inp.focus();
  }, 600);
}

/* ---- Form Init ---- */
function initForm() {
  setMinDate();
  setupPlanRadioListeners();
}

function setMinDate() {
  const dateInput = document.getElementById('startDate');
  if (!dateInput) return;
  const now = new Date();
  now.setDate(now.getDate() + 3);
  const min = now.toISOString().split('T')[0];
  dateInput.min = min;
}

function setupPlanRadioListeners() {
  const radios = document.querySelectorAll('input[name="plan"]');
  const pf = document.getElementById('propertiesField');
  radios.forEach(r => {
    r.addEventListener('change', () => {
      if (r.value === 'Custom') {
        pf.classList.remove('hidden');
      } else {
        pf.classList.add('hidden');
      }
    });
  });
}

/* ---- Form Validation ---- */
function clearErrors() {
  document.querySelectorAll('.field-error').forEach(el => { el.textContent = ''; });
  document.querySelectorAll('.error').forEach(el => { el.classList.remove('error'); });
}

function showError(fieldId, msg) {
  const input = document.getElementById(fieldId);
  const errorEl = document.getElementById(fieldId + 'Error');
  if (input) input.classList.add('error');
  if (errorEl) errorEl.textContent = msg;
}

function validateForm() {
  clearErrors();
  let valid = true;

  // Required text fields
  const requiredFields = [
    { id: 'fullName', label: 'Full Name' },
    { id: 'email', label: 'Email' },
    { id: 'phone', label: 'Phone' },
    { id: 'street', label: 'Street Address' },
    { id: 'city', label: 'City' },
    { id: 'province', label: 'Province' },
    { id: 'postalCode', label: 'Postal Code' },
    { id: 'startDate', label: 'Preferred Start Date' }
  ];

  requiredFields.forEach(f => {
    const el = document.getElementById(f.id);
    if (!el || !el.value.trim()) {
      showError(f.id, f.label + ' is required.');
      valid = false;
    }
  });

  // Email format
  const emailEl = document.getElementById('email');
  if (emailEl && emailEl.value.trim()) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(emailEl.value.trim())) {
      showError('email', 'Please enter a valid email address.');
      valid = false;
    }
  }

  // Date minimum 3 days from today
  const dateEl = document.getElementById('startDate');
  if (dateEl && dateEl.value) {
    const selected = new Date(dateEl.value + 'T00:00:00');
    const min = new Date();
    min.setHours(0, 0, 0, 0);
    min.setDate(min.getDate() + 3);
    if (selected < min) {
      showError('startDate', 'Start date must be at least 3 days from today.');
      valid = false;
    }
  }

  // Plan selection
  const planSelected = document.querySelector('input[name="plan"]:checked');
  if (!planSelected) {
    const planErr = document.getElementById('planError');
    if (planErr) planErr.textContent = 'Please select a plan.';
    valid = false;
  }

  // Properties count (if Custom)
  if (planSelected && planSelected.value === 'Custom') {
    const numEl = document.getElementById('numProperties');
    if (!numEl || !numEl.value || parseInt(numEl.value) < 2) {
      showError('numProperties', 'Please enter at least 2 properties.');
      valid = false;
    } else if (parseInt(numEl.value) > 50) {
      showError('numProperties', 'Maximum 50 properties.');
      valid = false;
    }
  }

  return valid;
}

/* ---- Chime Sound ---- */
function playChime() {
  if (!audio.enabled) return;
  try {
    const chime = new Audio('audio/chime.mp3');
    chime.volume = 0.35;
    chime.play().catch(() => {});
  } catch (e) { /* silent fail */ }
}

/* ---- Form Submission ---- */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('consultForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      const firstError = document.querySelector('.error');
      if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Honeypot check
    const honey = document.getElementById('website');
    if (honey && honey.value) return;

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.querySelector('span').textContent = 'Submitting...';

    const planRadio = document.querySelector('input[name="plan"]:checked');

    const payload = {
      fullName: document.getElementById('fullName').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      street: document.getElementById('street').value.trim(),
      city: document.getElementById('city').value.trim(),
      province: document.getElementById('province').value,
      postalCode: document.getElementById('postalCode').value.trim(),
      plan: planRadio ? planRadio.value : '',
      numProperties: document.getElementById('numProperties').value || null,
      startDate: document.getElementById('startDate').value,
      notes: document.getElementById('notes').value.trim(),
      website: honey ? honey.value : ''
    };

    try {
      const res = await fetch('submit.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        // Show success
        playChime();
        form.classList.add('hidden');
        document.getElementById('formSuccess').classList.remove('hidden');
        form.reset();
      } else {
        alert('Something went wrong. Please try again or email us at info@stmichael.work.');
        submitBtn.disabled = false;
        submitBtn.querySelector('span').textContent = 'Request Consultation';
      }
    } catch (err) {
      alert('Something went wrong. Please try again or email us at info@stmichael.work.');
      submitBtn.disabled = false;
      submitBtn.querySelector('span').textContent = 'Request Consultation';
    }
  });

});

/* ---- Sequential Narration Tour (Global Scope) ---- */
const bgMusic = new Audio('audio/StMichaelbg.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.04;
const popSound = new Audio('audio/pop.mp3');

const narrationQueue = [
  { audio: new Audio('audio/hero.mp3?v=3'), target: 'hero' },
  { audio: new Audio('audio/whatwedo.mp3?v=3'), target: 'whats-included' },
  { audio: new Audio('audio/whysubscribe.mp3?v=3'), target: 'how-it-works' },
  { audio: new Audio('audio/scrubbypts.mp3?v=3'), target: 'scrubbypts' },
  { audio: new Audio('audio/plan-weekly.mp3?v=1'), target: 'plan-weekly' },
  { audio: new Audio('audio/plan-biweekly.mp3?v=1'), target: 'plan-biweekly' },
  { audio: new Audio('audio/plan-monthly.mp3?v=1'), target: 'plan-monthly' },
  { audio: new Audio('audio/property.mp3?v=3'), target: 'property-manager' },
  { audio: new Audio('audio/cta.mp3?v=3'), target: 'consultation' },
];

let narrationIndex = -1;
let narrationRunning = false;

function playPop() {
  if (!audio.enabled) return;
  const p = popSound.cloneNode();
  p.volume = 0.2 + Math.random() * 0.15;
  p.playbackRate = 0.85 + Math.random() * 0.3;
  p.play().catch(() => {});
}

function startNarrationTour() {
  if (narrationRunning || !audio.enabled) return;
  narrationRunning = true;
  bgMusic.play().catch(() => {});
  narrationIndex = -1;
  playNextNarration();
}

function playNextNarration() {
  narrationIndex++;
  if (narrationIndex >= narrationQueue.length || !audio.enabled) {
    narrationRunning = false;
    let vol = bgMusic.volume;
    const fade = setInterval(() => {
      vol -= 0.01;
      if (vol <= 0) {
        clearInterval(fade);
        bgMusic.pause();
        bgMusic.currentTime = 0;
      } else {
        bgMusic.volume = vol;
      }
    }, 100);
    return;
  }

  const item = narrationQueue[narrationIndex];
  const el = document.getElementById(item.target);

  // Trigger section-specific animations
  if (item.target === 'scrubbypts') animateScrubbyPts();

  // Make section visible first
  if (el) {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
    playPop();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.style.transition = 'box-shadow .5s ease, opacity 0.6s ease, transform 0.6s ease';
    el.style.boxShadow = '0 0 0 3px #4a8c2a, 0 6px 25px rgba(74,140,42,.15)';
  }

  if (narrationIndex > 0) {
    const prev = document.getElementById(narrationQueue[narrationIndex - 1].target);
    if (prev) prev.style.boxShadow = '';
  }

  const thisIdx = narrationIndex;
  let advanced = false;
  function advanceOnce() {
    if (advanced) return;
    advanced = true;
    if (el) el.style.boxShadow = '';
    setTimeout(() => playNextNarration(), 500);
  }

  setTimeout(() => {
    if (!audio.enabled || !narrationRunning) return;
    item.audio.volume = 0.75;
    item.audio.play().then(() => {
      // Ended → advance
      item.audio.addEventListener('ended', advanceOnce, { once: true });
      // Fallback timeout: 30s max per narration
      setTimeout(() => { if (narrationIndex === thisIdx) advanceOnce(); }, 30000);
    }).catch(() => {
      // Play failed → skip
      advanceOnce();
    });
  }, 500);
}

/* ---- Floating Page Bubbles ---- */
function spawnPageBubbles() {
  // Create a persistent bubble container
  const container = document.createElement('div');
  container.id = 'pageBubbles';
  container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden';
  document.body.appendChild(container);

  function createBubble() {
    const b = document.createElement('div');
    const size = Math.random() * 30 + 10;
    b.style.cssText = 'position:absolute;border-radius:50%;'
      + 'background:radial-gradient(circle at 30% 30%, rgba(255,255,255,0.6), rgba(74,140,42,0.08) 40%, transparent);'
      + 'border:1px solid rgba(74,140,42,0.1);'
      + 'width:' + size + 'px;height:' + size + 'px;'
      + 'left:' + (Math.random() * 100) + '%;'
      + 'bottom:-' + size + 'px;'
      + 'animation:pageBubbleFloat ' + (Math.random() * 8 + 6) + 's ease-out forwards;'
      + 'opacity:0;';
    container.appendChild(b);
    b.addEventListener('animationend', () => b.remove());
  }

  // Spawn bubbles periodically
  setInterval(createBubble, 800);
  // Initial burst
  for (let i = 0; i < 8; i++) setTimeout(createBubble, i * 200);
}

/* ---- Scroll Animations (Fade-in sections) ---- */
function initScrollAnimations() {
  // Add reveal class to all sections
  const sections = document.querySelectorAll('.hero, .whats-included, .how-it-works, .plans, .property-manager, .consultation, .faq');
  sections.forEach(s => {
    s.style.opacity = '0';
    s.style.transform = 'translateY(30px)';
    s.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  sections.forEach(s => observer.observe(s));

  // Reveal hero immediately
  const hero = document.querySelector('.hero');
  if (hero) {
    hero.style.opacity = '1';
    hero.style.transform = 'translateY(0)';
  }
}

/* ---- Scrubby Points Animation ---- */
function animateScrubbyPts() {
  const fill = document.getElementById('scrubbyFill');
  const tag = document.getElementById('scrubbyRewardTag');
  const rewards = document.querySelectorAll('.scrubby-reward-item');

  if (!fill) return;

  // Reset
  fill.style.width = '0%';
  tag.classList.remove('visible');
  rewards.forEach(r => r.classList.remove('visible'));

  // Animate progress bar filling over 3 seconds
  setTimeout(() => { fill.style.width = '20%'; }, 300);
  setTimeout(() => { fill.style.width = '40%'; }, 800);
  setTimeout(() => { fill.style.width = '60%'; }, 1300);
  setTimeout(() => { fill.style.width = '80%'; }, 1800);
  setTimeout(() => {
    fill.style.width = '100%';
    // Show reward tag
    setTimeout(() => tag.classList.add('visible'), 500);
  }, 2300);

  // Pop in reward items one by one
  rewards.forEach((r, i) => {
    setTimeout(() => r.classList.add('visible'), 3000 + i * 400);
  });
}
