(function () {
  var root = document.documentElement;
  // Reduced motion: the switch skips its wipe, and the name warp, typing,
  // scramble and row slide stay still.
  var calm = matchMedia('(prefers-reduced-motion: reduce)');
  // The accent and the idle dot colour change with the mode; styles.css owns
  // both and these are re-read on every switch, not per frame.
  var accent, dotIdle;
  function readTheme() {
    var cs = getComputedStyle(root);
    accent = cs.getPropertyValue('--accent').trim();
    dotIdle = cs.getPropertyValue('--dot-idle').trim();
  }
  readTheme();
  var SHOW_GLOW = true;
  var SHOW_CURSOR_RING = true;

  var CODE = `# whoami.rb
class Veronica < Engineer
  BASED_IN = "Buenos Aires, AR"
  YEARS    = 5

  def stack
    %w[rails hotwire postgres
       tailwind typescript
       viewcomponent rspec kamal]
  end

  def owns
    [:architecture, :rest_apis,
     :integrations, :background_jobs,
     :data_modeling, :performance]
  end

  def industries
    %w[healthcare aviation
       coaching e-commerce]
  end

  def available? = true
end
`;

  var ring       = document.getElementById('ring');
  var glowHost   = document.getElementById('glowHost');
  var glowLayer  = document.getElementById('glowLayer');
  var heroName   = document.getElementById('heroName');
  var field      = document.getElementById('about');
  var canvas     = document.getElementById('dotCanvas');
  var rowsHost   = document.getElementById('work');
  var preview    = document.getElementById('preview');
  var scrambleHost = document.getElementById('contact');
  var trackFill  = document.getElementById('trackFill');
  var typedEl    = document.getElementById('typed');
  var header     = document.querySelector('header');
  var previewImg = document.getElementById('previewImg');
  var previewBack = document.getElementById('previewBack');

  var glowPos = [50, 34];

  function alpha(a) { return accent.replace(/\)$/, ' / ' + a + ')'); }

  function setGlow() {
    if (!glowLayer) return;
    var px = glowPos[0], py = glowPos[1];
    glowLayer.style.background = 'radial-gradient(44% 42% at ' + px + '% ' + py + '%,' + alpha(0.5) + ' 0%,' + alpha(0.16) + ' 44%,transparent 74%)';
  }

  function applyProps() {
    if (glowLayer && !SHOW_GLOW) glowLayer.style.display = 'none';
    if (ring) ring.style.display = SHOW_CURSOR_RING ? 'block' : 'none';
    setGlow();
  }

  // Hidden over the hero, slides in once the hero has scrolled past.
  function headerReveal() {
    if (!header || !glowHost) return;
    var shown = null;
    var update = function () {
      var trigger = glowHost.offsetTop + glowHost.offsetHeight - header.offsetHeight;
      var want = (window.scrollY || window.pageYOffset) > trigger;
      if (want !== shown) { shown = want; header.classList.toggle('is-visible', want); }
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  function cursorRing() {
    if (!ring) return;
    var x = 0, y = 0, tx = 0, ty = 0;
    document.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY; ring.style.opacity = 1;
      var hov = e.target.closest && e.target.closest('[data-hov],[data-row],[data-scramble],a,button');
      var s = hov ? 58 : 30;
      ring.style.width = s + 'px'; ring.style.height = s + 'px';
      ring.style.background = hov ? 'var(--ring-fill)' : 'transparent';
    });
    document.addEventListener('pointerleave', function () { ring.style.opacity = 0; });
    var loop = function () {
      x += (tx - x) * 0.18; y += (ty - y) * 0.18;
      ring.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-50%)';
      requestAnimationFrame(loop);
    };
    loop();
  }

  function kineticType() {
    if (!heroName || calm.matches) return;
    var letters = [].slice.call(heroName.querySelectorAll('[data-k]'));
    var px = -9999, py = -9999, active = false;
    var apply = function () {
      letters.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var d = Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2));
        // Frontend moves more: a wider reach, a bigger lift and a tilt toward the pointer.
        var fe = root.dataset.mode !== 'backend', k = fe ? 1.8 : 1;
        var f = active ? Math.max(0, 1 - d / (fe ? 351 : 260)) : 0;
        var tilt = fe ? (px - (r.left + r.width / 2)) / 60 * f : 0;
        el.style.fontVariationSettings = "'wght' " + Math.round(500 + f * 400 + (active ? 0 : 200));
        el.style.transform = 'translateY(' + (-f * 12 * k).toFixed(2) + 'px) scaleY(' + (1 + f * 0.14 * k).toFixed(3) + ') rotate(' + tilt.toFixed(2) + 'deg)';
        el.style.transition = active ? 'color .2s ease' : 'all .55s cubic-bezier(.2,.8,.2,1)';
      });
    };
    window.addEventListener('pointermove', function (e) { px = e.clientX; py = e.clientY; active = true; apply(); });
    apply();
  }

  function glowFollow() {
    if (!glowHost) return;
    glowPos = [50, 34];
    setGlow();
    glowHost.addEventListener('pointermove', function (e) {
      var r = glowHost.getBoundingClientRect();
      glowPos = [((e.clientX - r.left) / r.width * 100).toFixed(1), ((e.clientY - r.top) / r.height * 100).toFixed(1)];
      setGlow();
    });
    glowHost.addEventListener('pointerleave', function () { glowPos = [50, 34]; setGlow(); });
  }

  // Ruby tokens, in priority order. Scanned once over the whole snippet so a
  // half-typed line can't be mis-tokenised mid-token and flicker colours.
  var RULES = [
    ['com', /#[^\n]*/y],
    ['str', /"(?:\\.|[^"\\])*"/y],
    ['str', /%w\[[^\]]*\]/y],
    ['sym', /:[a-z_][a-z0-9_]*/iy],
    ['kw',  /\b(?:class|def|end|module|self|return|do|if|else|elsif|unless|true|false|nil)\b/y],
    ['con', /\b[A-Z][A-Za-z0-9_]*\b/y],
    ['num', /\b\d+\b/y]
  ];
  var DEF = /\bdef\s+/y;

  var CLASS_AT = (function () {
    var out = new Array(CODE.length).fill('');
    var i = 0;
    var mark = function (from, to, cls) { for (var k = from; k < to; k++) out[k] = cls; };
    while (i < CODE.length) {
      var hit = false;
      for (var r = 0; r < RULES.length; r++) {
        var re = RULES[r][1];
        re.lastIndex = i;
        var m = re.exec(CODE);
        if (m && m.index === i) {
          mark(i, i + m[0].length, RULES[r][0]);
          // the name right after `def` is the method being defined
          if (RULES[r][0] === 'kw' && m[0] === 'def') {
            DEF.lastIndex = i;
            var d = DEF.exec(CODE);
            if (d && d.index === i) {
              var nm = /[a-z_][A-Za-z0-9_]*[?!]?/y;
              nm.lastIndex = i + d[0].length;
              var n = nm.exec(CODE);
              if (n) mark(n.index, n.index + n[0].length, 'fn');
            }
          }
          i += m[0].length;
          hit = true;
          break;
        }
      }
      if (!hit) i++;
    }
    return out;
  })();

  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // Emit the first n characters as runs of same-class text.
  function highlight(n) {
    var html = '', run = '', cls = CLASS_AT[0];
    var flush = function () {
      if (!run) return;
      html += cls ? '<span class="tok-' + cls + '">' + esc(run) + '</span>' : esc(run);
      run = '';
    };
    for (var k = 0; k < n; k++) {
      if (CLASS_AT[k] !== cls) { flush(); cls = CLASS_AT[k]; }
      run += CODE[k];
    }
    flush();
    return html;
  }

  function typeLoop() {
    if (!typedEl) return;
    if (calm.matches) { typedEl.innerHTML = highlight(CODE.length); return; }
    var i = 0;
    var step = function () {
      i++;
      typedEl.innerHTML = highlight(i);
      if (i >= CODE.length) { setTimeout(function () { i = 0; step(); }, 5200); return; }
      setTimeout(step, CODE[i - 1] === '\n' ? 80 : 20 + Math.random() * 30);
    };
    setTimeout(step, 600);
  }

  function dotField() {
    if (!canvas || !field) return;
    var ctx = canvas.getContext('2d');
    var w = 0, h = 0, dots = [], mx = -9999, my = -9999;
    var build = function () {
      var r = field.getBoundingClientRect(); if (!r.width) return;
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var g = 30; dots = [];
      for (var y = g / 2; y < h; y += g) for (var x = g / 2; x < w; x += g) dots.push({ x: x, y: y, ox: x, oy: y });
    };
    new ResizeObserver(build).observe(field);
    field.addEventListener('pointermove', function (e) { var r = field.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
    field.addEventListener('pointerleave', function () { mx = my = -9999; });
    var t = 0;
    var frame = function () {
      t += 0.012;
      ctx.clearRect(0, 0, w, h);
      dots.forEach(function (d, i) {
        var dx = d.ox - mx, dy = d.oy - my, dist = Math.hypot(dx, dy);
        var f = Math.max(0, 1 - dist / 210);
        var wob = Math.sin(t + i * 0.32) * 1.1;
        d.x += (d.ox + (dx / (dist || 1)) * f * 28 + wob - d.x) * 0.14;
        d.y += (d.oy + (dy / (dist || 1)) * f * 28 + wob - d.y) * 0.14;
        ctx.beginPath(); ctx.arc(d.x, d.y, 1 + f * 2.2, 0, 6.2832);
        ctx.fillStyle = f > 0.18 ? alpha((0.25 + f * 0.7).toFixed(2)) : dotIdle;
        ctx.fill();
      });
      requestAnimationFrame(frame);
    };
    build(); frame();
  }

  function rowPreview() {
    if (!rowsHost || !preview) return;
    var rows = [].slice.call(rowsHost.querySelectorAll('[data-row]'));
    var shotsOf = function (r) { return (r.dataset.preview || '').split(',').filter(Boolean); };
    // Warm the cache so the first hover paints at once instead of fading in
    // behind a fetch and decode.
    rows.forEach(function (r) { shotsOf(r).forEach(function (src) { var im = new Image(); im.src = src; }); });
    // Touch screens can't hover, so each row also carries its first shot
    // inline, under the title; styles.css only shows it there.
    rows.forEach(function (r) {
      var first = shotsOf(r)[0], title = r.firstElementChild && r.firstElementChild.firstElementChild;
      if (!first || !title) return;
      var im = document.createElement('img');
      im.className = 'row-thumb'; im.src = first; im.alt = ''; im.loading = 'lazy';
      (r.querySelector('[data-year]') || title).after(im);
    });

    var cycle = null;
    var stop = function () { clearInterval(cycle); cycle = null; if (previewBack) previewBack.classList.remove('is-on'); };
    var show = function (list) {
      stop();
      if (!previewImg) return;
      if (!list.length) { previewImg.classList.remove('is-on'); return; }
      var i = 0;
      previewImg.setAttribute('src', list[0]);
      previewImg.classList.add('is-on');
      if (list.length < 2) return;
      cycle = setInterval(function () {
        i = (i + 1) % list.length;
        // Keep the current shot underneath and fade the next one in over it,
        // so the placeholder never shows between shots.
        if (previewBack) {
          previewBack.setAttribute('src', previewImg.getAttribute('src'));
          previewBack.classList.add('is-on');
        }
        previewImg.style.transition = 'none';
        previewImg.classList.remove('is-on');
        void previewImg.offsetWidth; // commit opacity 0 before fading back in
        previewImg.style.transition = '';
        previewImg.setAttribute('src', list[i]);
        previewImg.classList.add('is-on');
      }, 1800);
    };
    rows.forEach(function (r) {
      r.addEventListener('pointerenter', function (e) {
        place(e);
        // Rows with no screenshot yet show no preview rather than the bare hatch.
        preview.style.opacity = shotsOf(r).length ? 1 : 0;
        show(shotsOf(r));
        rows.forEach(function (o) { o.style.opacity = o === r ? '1' : '.32'; });
        if (!calm.matches) r.style.paddingLeft = '18px';
      });
      r.addEventListener('pointerleave', function () { r.style.paddingLeft = '0px'; });
    });
    // The preview is fixed to the viewport and sits just right of the pointer
    // (left of it near the right edge), so it stays under the cursor while
    // the page scrolls beneath a still mouse.
    var place = function (e) {
      var w = preview.offsetWidth, x = e.clientX + 24;
      if (x + w > window.innerWidth - 16) x = e.clientX - 24 - w;
      preview.style.transform = 'translate(' + x + 'px,' + e.clientY + 'px) translate(0,-50%)';
    };
    rowsHost.addEventListener('pointermove', place);
    rowsHost.addEventListener('pointerleave', function () {
      preview.style.opacity = 0;
      stop();
      if (previewImg) previewImg.classList.remove('is-on');
      rows.forEach(function (o) { o.style.opacity = '1'; o.style.paddingLeft = '0px'; });
    });
  }

  function scramble() {
    if (!scrambleHost || calm.matches) return;
    var chars = '@#$%&*+=<>_/\\|';
    scrambleHost.querySelectorAll('[data-scramble]').forEach(function (el) {
      var orig = el.textContent;
      var raf, frame = 0;
      el.addEventListener('pointerenter', function () {
        frame = 0; cancelAnimationFrame(raf);
        var tick = function () {
          frame++;
          el.textContent = orig.split('').map(function (c, k) {
            return c === ' ' ? c : (frame > k * 2.2 ? c : chars[Math.floor(Math.random() * chars.length)]);
          }).join('');
          if (frame < orig.length * 2.4) raf = requestAnimationFrame(tick); else el.textContent = orig;
        };
        tick();
      });
      el.addEventListener('pointerleave', function () { cancelAnimationFrame(raf); el.textContent = orig; });
    });
  }

  function reveal() {
    var els = [].slice.call(document.querySelectorAll('[data-reveal]'));
    // Hidden state is set imperatively (never in the markup) so the page stays readable if JS never runs.
    els.forEach(function (el) { el.style.opacity = '0'; el.style.transform = 'translateY(18px)'; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.style.opacity = '1';
          en.target.style.transform = 'translateY(0)';
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });

    var show = function (el) { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; };
    // Fallback: if the page can't scroll (embedded/short viewport), reveal everything anyway.
    var sweep = function () {
      var se = document.scrollingElement || document.documentElement;
      var canScroll = se.scrollHeight - se.clientHeight > 8;
      els.forEach(function (el) {
        if (getComputedStyle(el).opacity !== '0') return;
        if (!canScroll || el.getBoundingClientRect().top < window.innerHeight * 1.2) show(el);
      });
    };
    setTimeout(sweep, 500);
    setTimeout(sweep, 1400);
    setTimeout(function () { els.forEach(show); }, 2600);

    var career = document.getElementById('career');
    if (trackFill && career) {
      var tick = function () {
        var r = career.getBoundingClientRect();
        var p = r.height ? Math.min(1, Math.max(0, (window.innerHeight * 0.6 - r.top) / r.height)) : 0;
        trackFill.style.width = (p * 100).toFixed(1) + '%';
        requestAnimationFrame(tick);
      };
      tick();
    }
  }

  function tiles() {
    document.querySelectorAll('[data-tile]').forEach(function (t) {
      var media = t.querySelector('div');
      // Hover draws the accent as an outline, so the photo can fill the tile.
      if (media) {
        media.style.outline = '1.5px solid transparent';
        media.style.outlineOffset = '4px';
        media.style.transition = 'outline-color .35s ease';
      }
      // A tile whose photo carries data-shots cycles through them while hovered.
      var photo = t.querySelector('img[data-shots]');
      var shots = photo ? photo.dataset.shots.split(',') : [];
      shots.forEach(function (src) { new Image().src = src; });
      // A copy underneath holds the outgoing photo while the next fades in
      // over it, as in the work previews, so the hatch never shows between shots.
      var back = null;
      if (shots.length > 1) {
        back = photo.cloneNode();
        back.removeAttribute('data-shots');
        back.alt = '';
        back.setAttribute('aria-hidden', 'true');
        back.style.transition = 'none';
        back.style.opacity = '0';
        photo.before(back);
      }
      var cycle = null, at = 0;
      t.addEventListener('pointerenter', function () {
        t.style.transform = 'translateY(-8px)';
        if (shots.length > 1) cycle = setInterval(function () {
          at = (at + 1) % shots.length;
          back.src = photo.src;
          back.style.opacity = '1';
          photo.style.transition = 'none';
          photo.style.opacity = '0';
          void photo.offsetWidth; // commit opacity 0 before fading back in
          photo.style.transition = '';
          photo.src = shots[at];
          photo.style.opacity = '1';
        }, 1500);
        if (media) media.style.outlineColor = 'var(--accent)';
      });
      t.addEventListener('pointerleave', function () {
        t.style.transform = 'translateY(0)';
        if (cycle) { clearInterval(cycle); cycle = null; at = 0; photo.src = shots[0]; photo.style.opacity = '1'; back.style.opacity = '0'; }
        if (media) media.style.outlineColor = 'transparent';
      });
    });
  }

  // Frontend / Backend switch. The initial mode is set by the inline script in
  // <head>; this syncs the buttons and animates each change.
  function modeToggle() {
    var buttons = [].slice.call(document.querySelectorAll('[data-set-mode]'));
    var scan = document.getElementById('scan');
    var sync = function () {
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.setMode === root.dataset.mode)); });
    };
    var apply = function (mode) {
      root.dataset.mode = mode;
      sync();
      readTheme();
      setGlow();
    };
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        var mode = b.dataset.setMode;
        if (root.dataset.mode === mode) return;
        try { localStorage.setItem('mode', mode); } catch (e) {}
        if (calm.matches) return apply(mode);
        if (document.startViewTransition && scan) return wipe(mode);
        root.classList.add('mode-anim');
        setTimeout(function () { root.classList.remove('mode-anim'); }, 350);
        apply(mode);
      });
    });
    sync();

    // A scanline sweeps the viewport and the new mode is revealed behind it:
    // downward with CRT banding into backend, upward with a glow into frontend.
    // The line's colours use var(--accent), which resolves in the new mode
    // because the line is captured after the switch.
    function wipe(mode) {
      var toBE = mode === 'backend';
      var mix = function (n) { return 'color-mix(in oklch, var(--accent) ' + n + '%, transparent)'; };
      scan.style.background = toBE
        ? 'repeating-linear-gradient(to bottom, transparent 0 2px, rgba(0,0,0,.35) 2px 3px), linear-gradient(to bottom, transparent, ' + mix(16) + ' 80%, var(--accent) 96%, var(--accent))'
        : 'linear-gradient(to top, transparent, ' + mix(22) + ' 75%, var(--accent) 96%, var(--accent))';
      scan.style.boxShadow = toBE ? 'none' : '0 -6px 24px ' + mix(45);
      scan.style.display = 'block';
      scan.style.viewTransitionName = 'vi-scan';
      root.dataset.vt = 'wipe';
      var vt = document.startViewTransition(function () { apply(mode); });
      vt.ready.then(function () {
        var H = window.innerHeight;
        var o = function (pseudo) { return { duration: 680, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'both', pseudoElement: pseudo }; };
        root.animate({ clipPath: toBE ? ['inset(0 0 100% 0)', 'inset(0 0 0% 0)'] : ['inset(100% 0 0 0)', 'inset(0% 0 0 0)'] }, o('::view-transition-new(root)'));
        root.animate({ transform: toBE ? ['translateY(-80px)', 'translateY(' + (H - 80) + 'px)'] : ['translateY(' + H + 'px)', 'translateY(0px)'] }, o('::view-transition-group(vi-scan)'));
        root.animate(toBE ? { opacity: [1, .55, 1, .8, 1, .6, 1, 1, 0] } : { opacity: [1, 1, 1, 0] }, { duration: 680, fill: 'both', pseudoElement: '::view-transition-new(vi-scan)' });
      }).catch(function () {});
      vt.finished.finally(function () {
        scan.style.display = 'none';
        scan.style.viewTransitionName = '';
        delete root.dataset.vt;
      });
    }
  }

  headerReveal();
  cursorRing();
  kineticType();
  glowFollow();
  typeLoop();
  dotField();
  rowPreview();
  scramble();
  reveal();
  tiles();
  applyProps();
  modeToggle();

  // Copy buttons put their text on the clipboard and confirm for a moment.
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    var label = b.textContent;
    b.addEventListener('click', function () {
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(b.dataset.copy).then(function () {
        b.textContent = root.dataset.mode === 'backend' ? 'copied ✓' : 'Copied';
        setTimeout(function () { b.textContent = label; }, 1600);
      });
    });
  });
})();
