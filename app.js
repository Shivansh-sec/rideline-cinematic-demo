(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Full-screen menu with keyboard support.
  const nav = $('#main-nav');
  const navToggle = $('#nav-toggle');
  const closeNav = () => {
    if (!nav || !navToggle) return;
    nav.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Open menu');
    document.body.classList.remove('menu-open');
  };
  navToggle?.addEventListener('click', () => {
    const open = navToggle.getAttribute('aria-expanded') === 'true';
    nav.classList.toggle('open', !open);
    navToggle.setAttribute('aria-expanded', String(!open));
    navToggle.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
    document.body.classList.toggle('menu-open', !open);
    if (!open) $('a', nav)?.focus({ preventScroll: true });
  });
  $$('#main-nav a').forEach(link => link.addEventListener('click', closeNav));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeNav(); });
  window.addEventListener('resize', () => { if (window.innerWidth > 760) closeNav(); }, { passive: true });

  // Elegant reveal motion with a no-JS and reduced-motion fallback.
  const revealItems = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const observer = new IntersectionObserver((entries, instance) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        instance.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -40px 0px', threshold: 0.08 });
    revealItems.forEach((item, index) => {
      item.style.transitionDelay = (index % 3) * 70 + 'ms';
      observer.observe(item);
    });
  } else {
    revealItems.forEach(item => item.classList.add('is-visible'));
  }

  // Film playback is muted, user-controllable and lazy-loaded for performance.
  const films = { hero: $('.hero-film'), cinema: $('.cinema-film') };
  const toggleFor = key => $('[data-toggle-film="' + key + '"]');
  const paintToggle = (key, playing) => {
    const button = toggleFor(key);
    if (!button) return;
    button.setAttribute('aria-label', playing ? 'Pause riding video' : 'Play riding video');
    const icon = $('.film-toggle-icon', button);
    const text = $('.film-toggle-text', button);
    if (icon) icon.textContent = playing ? 'Ⅱ' : '▶';
    if (text) text.textContent = playing ? 'PAUSE FILM' : 'PLAY FILM';
  };
  const loadFilm = key => {
    const video = films[key];
    if (!video) return Promise.resolve(null);
    if (!video.dataset.loaded) {
      video.src = video.dataset.film;
      video.dataset.loaded = '1';
      video.load();
    }
    return Promise.resolve(video);
  };
  const playFilm = async (key, explicit = false) => {
    const video = films[key];
    if (!video) return;
    if (reduceMotion.matches && !explicit) { paintToggle(key, false); return; }
    await loadFilm(key);
    video.muted = true;
    try { await video.play(); paintToggle(key, true); }
    catch (_) { paintToggle(key, false); }
  };
  const pauseFilm = key => { films[key]?.pause(); paintToggle(key, false); };
  Object.entries(films).forEach(([key, video]) => {
    if (!video) return;
    paintToggle(key, false);
    video.addEventListener('playing', () => paintToggle(key, true));
    video.addEventListener('pause', () => paintToggle(key, false));
    video.addEventListener('error', () => paintToggle(key, false));
  });
  $$('[data-toggle-film]').forEach(button => button.addEventListener('click', async () => {
    const key = button.dataset.toggleFilm;
    if (!films[key]) return;
    if (!films[key].paused) pauseFilm(key);
    else await playFilm(key, true);
  }));
  if (films.hero && !reduceMotion.matches) window.setTimeout(() => playFilm('hero'), 180);
  if (films.cinema && 'IntersectionObserver' in window) {
    const filmObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          loadFilm('cinema');
          if (!reduceMotion.matches) playFilm('cinema');
        } else pauseFilm('cinema');
      });
    }, { rootMargin: '240px 0px', threshold: 0.02 });
    const section = $('.cinema-section');
    if (section) filmObserver.observe(section);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { pauseFilm('hero'); pauseFilm('cinema'); return; }
    if (reduceMotion.matches) return;
    if ($('.hero')?.getBoundingClientRect().bottom > 0) playFilm('hero');
    const bounds = $('.cinema-section')?.getBoundingClientRect();
    if (bounds && bounds.bottom > 0 && bounds.top < window.innerHeight) playFilm('cinema');
  });
  reduceMotion.addEventListener?.('change', event => {
    if (event.matches) { pauseFilm('hero'); pauseFilm('cinema'); }
  });

  // Scroll progress and subtle camera movement. All work is frame-throttled.
  let framePending = false;
  const updateScrollEffects = () => {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    document.documentElement.style.setProperty('--scroll-progress', String(Math.min(1, window.scrollY / maxScroll)));
    const hero = $('.hero');
    if (hero && !reduceMotion.matches && window.innerWidth > 760) {
      const ratio = Math.min(1, Math.max(0, window.scrollY / Math.max(1, hero.offsetHeight)));
      const film = $('.hero-film');
      if (film) film.style.transform = 'translate3d(0,' + (ratio * 20) + 'px,0) scale(1.025)';
    }
    framePending = false;
  };
  window.addEventListener('scroll', () => {
    if (framePending) return;
    framePending = true;
    requestAnimationFrame(updateScrollEffects);
  }, { passive: true });
  updateScrollEffects();

  // Pointer-following glow for desktop; no effects for touch input.
  if (matchMedia('(hover:hover) and (pointer:fine)').matches && !reduceMotion.matches) {
    let pointerFrame = 0;
    window.addEventListener('pointermove', event => {
      if (pointerFrame) return;
      pointerFrame = requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--pointer-x', event.clientX + 'px');
        document.documentElement.style.setProperty('--pointer-y', event.clientY + 'px');
        pointerFrame = 0;
      });
    }, { passive: true });
  }

  // Gentle 3D card response: deliberately restrained, disabled on mobile and reduced motion.
  if (matchMedia('(hover:hover) and (pointer:fine)').matches && !reduceMotion.matches) {
    $$('[data-tilt]').forEach(card => {
      card.addEventListener('pointermove', event => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        const rotateY = (x - 0.5) * 3;
        const rotateX = (0.5 - y) * 3;
        card.style.transform = 'perspective(1000px) rotateX(' + rotateX.toFixed(2) + 'deg) rotateY(' + rotateY.toFixed(2) + 'deg) translateY(-5px)';
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  // A vehicle category selected above is reflected in the enquiry demo.
  $$('[data-ride]').forEach(link => link.addEventListener('click', () => {
    const select = $('#ride-kind');
    if (!select) return;
    const option = [...select.options].find(item => item.value === link.dataset.ride);
    if (option) select.value = option.value;
  }));

  // Date constraints use local calendar dates to avoid UTC midnight drift.
  const localDateString = date => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  };
  const pickup = $('#pickup-date');
  const returned = $('#return-date');
  const today = localDateString(new Date());
  if (pickup && returned) {
    pickup.min = today;
    returned.min = today;
    pickup.addEventListener('change', () => {
      returned.min = pickup.value || today;
      if (pickup.value && returned.value && returned.value < pickup.value) returned.value = pickup.value;
    });
  }

  // Demo form intentionally does not send, track, store, or transmit details.
  // It creates a local preview that the presenter can copy manually.
  const form = $('#enquiry-form');
  const formStatus = $('#form-status');
  form?.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const ride = $('#ride-kind').value;
    const start = pickup.value;
    const end = returned.value;
    const name = $('#customer-name').value.trim();
    const riders = $('#riders').value;
    const extra = $('#message').value.trim();
    if (start < today) { formStatus.textContent = 'Choose today or a future pickup date.'; pickup.focus(); return; }
    if (end < start) { formStatus.textContent = 'The return date must be the same as or later than the pickup date.'; returned.focus(); return; }

    const lines = [
      'Hello! I would like to enquire about a motorcycle rental.',
      '',
      'Name: ' + name,
      'Ride category: ' + ride,
      'Pickup date: ' + start,
      'Return date: ' + end,
      'Number of riders: ' + riders,
      extra ? 'Trip notes: ' + extra : '',
      '',
      'Please confirm vehicle availability, pricing, deposit, documents, insurance, pickup arrangements and rental terms.'
    ].filter(Boolean);
    const message = lines.join('\n');
    formStatus.replaceChildren();
    const intro = document.createElement('p');
    intro.textContent = 'Preview ready. Nothing has been sent. Copy this sample enquiry to test the flow:';
    formStatus.appendChild(intro);
    const preview = document.createElement('pre');
    preview.className = 'form-preview';
    preview.textContent = message;
    formStatus.appendChild(preview);
    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'copy-preview';
    copyButton.textContent = 'Copy enquiry text';
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(message);
        copyButton.textContent = 'Copied to clipboard ✓';
      } catch (_) {
        const range = document.createRange();
        range.selectNodeContents(preview);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        copyButton.textContent = 'Text selected — press Ctrl+C';
      }
    });
    formStatus.appendChild(copyButton);
  });

  // Keep all visual-only controls accessible and the page harmless as a demo.
  $('#nav-toggle')?.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeNav();
  });
})();