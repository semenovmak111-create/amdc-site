/* Сайт для АМДЦ — интерактив. Без библиотек. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var WA = '79111112122';
  var fmt = function (n, dec) {
    return Number(n).toLocaleString('ru-RU', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 }).replace(/ /g, ' ');
  };
  var inView = function (el, cb, opts) {
    if (!('IntersectionObserver' in window)) { cb(el); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { cb(e.target); io.unobserve(e.target); } });
    }, opts || { threshold: 0.18 });
    io.observe(el);
  };

  /* ---------- Первый экран сайта в мониторе витрины ---------- */
  // Внутри рамки страница открывается сама в себе: там свою рамку не грузим
  var framed = window.self !== window.top;
  if (framed) document.documentElement.classList.add('in-frame');
  var live = $('.mock-live');
  if (live && !framed) {
    var frame = $('iframe', live);
    var fit = function () { live.style.setProperty('--s', live.clientWidth / 1440); };
    fit();
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(live);
    else window.addEventListener('resize', fit);
    inView(live, function () { frame.src = frame.dataset.src; }, { rootMargin: '600px 0px' });
  }

  /* ---------- Объёмная звезда: собираем слои по глубине ---------- */
  $$('.star3d').forEach(function (s) {
    var depth = +s.dataset.depth, n = Math.max(2, Math.round(depth / 1.2));
    for (var i = 0; i <= n; i++) {
      var l = document.createElement('i');
      if (i === 0 || i === n) l.className = 'face';
      l.style.setProperty('--z', (depth / 2 - i * depth / n).toFixed(2));
      s.appendChild(l);
    }
  });

  /* ---------- Курсор-свечение ---------- */
  var cursor = $('.cursor-circle');
  if (cursor && window.matchMedia('(hover: hover)').matches) {
    var cx = 0, cy = 0, tx = 0, ty = 0, raf = null;
    var loop = function () {
      cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22;
      cursor.style.transform = 'translate(' + (cx - 40) + 'px,' + (cy - 40) + 'px)';
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.5 ? requestAnimationFrame(loop) : null;
    };
    document.addEventListener('mousemove', function (e) {
      tx = e.clientX; ty = e.clientY;
      document.body.classList.add('has-cursor');
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
    document.addEventListener('mouseleave', function () { document.body.classList.remove('has-cursor'); });
    cursor.style.left = '0'; cursor.style.top = '0';
  }

  /* ---------- Шапка, меню, активный пункт ---------- */
  var header = $('#header');
  var burger = $('.burger');
  burger.addEventListener('click', function () {
    var open = document.body.classList.toggle('menu-open');
    burger.setAttribute('aria-expanded', open);
  });
  $$('#mobileMenu a').forEach(function (a) {
    a.addEventListener('click', function () { document.body.classList.remove('menu-open'); burger.setAttribute('aria-expanded', 'false'); });
  });
  var navLinks = $$('.nav a');
  var navTargets = navLinks.map(function (a) { return $(a.getAttribute('href')); });
  var onScroll = function () {
    header.classList.toggle('scrolled', window.scrollY > 10);
    var y = window.scrollY + 140, active = -1;
    navTargets.forEach(function (t, i) { if (t && t.offsetTop <= y) active = i; });
    // «Потери» подсвечиваются только внутри своих секций, дальше — следующий пункт
    navLinks.forEach(function (a, i) { a.classList.toggle('active', i === active); });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Появление при прокрутке ---------- */
  $$('.reveal').forEach(function (el) { inView(el, function (t) { t.classList.add('in'); }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }); });

  /* ---------- Печатная машинка в герое ---------- */
  var typed = $('.typed');
  if (typed) {
    var words = typed.dataset.words.split('|');
    if (reduce) { typed.textContent = words[0]; }
    else {
      var wi = 0, ci = 0, del = false;
      var tick = function () {
        var w = words[wi];
        typed.textContent = w.slice(0, ci);
        if (!del && ci < w.length) { ci++; setTimeout(tick, 70); }
        else if (!del) { del = true; setTimeout(tick, 1700); }
        else if (ci > 0) { ci--; setTimeout(tick, 35); }
        else { del = false; wi = (wi + 1) % words.length; setTimeout(tick, 300); }
      };
      tick();
    }
  }

  /* ---------- Бегущая строка: дублируем для бесшовности ---------- */
  $$('.marquee-track').forEach(function (t) { t.innerHTML += t.innerHTML; });

  /* ---------- Счётчики ---------- */
  $$('[data-count]').forEach(function (el) {
    var end = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0), suf = el.dataset.suffix || '';
    if (reduce) return;
    el.textContent = fmt(0, dec) + suf;
    inView(el, function () {
      var t0 = performance.now(), dur = 1400;
      var step = function (now) {
        var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(end * e, dec) + suf;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.5 });
  });

  /* ---------- 2. График-развилка и переключатель ---------- */
  var chart = $('#forkChart');
  if (chart) {
    $$('.draw', chart).forEach(function (p) { p.style.setProperty('--len', Math.ceil(p.getTotalLength())); });
    inView(chart, function () { chart.classList.add('in'); }, { threshold: 0.35 });
  }
  var sw = $('.fork-switch');
  if (sw) {
    var pill = $('.pill', sw), btns = $$('button', sw);
    var place = function () {
      var b = $('button.active', sw);
      pill.style.left = b.offsetLeft + 'px'; pill.style.width = b.offsetWidth + 'px';
    };
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (x) { x.classList.toggle('active', x === b); x.setAttribute('aria-selected', x === b); });
        $$('.fork-panel').forEach(function (p) { p.classList.toggle('active', p.dataset.panel === b.dataset.target); });
        place();
      });
    });
    place();
    window.addEventListener('resize', place);
    if (document.fonts) document.fonts.ready.then(place);
  }

  /* ---------- 4. Весы ---------- */
  var scales = $('#scales');
  if (scales) inView(scales, function () { setTimeout(function () { scales.classList.add('in'); }, 250); }, { threshold: 0.6 });

  /* ---------- 5. Карусель ---------- */
  (function () {
    var root = $('#gain'); if (!root) return;
    var vp = $('.car-viewport', root), track = $('.car-track', root);
    var slides = $$('.slide', root), tabs = $$('.car-tab', root);
    var dotsWrap = $('.dots', root), count = $('.car-count', root);
    var n = slides.length, cur = 0, visible = false, hover = false;
    var DUR = 7000;
    root.style.setProperty('--dur', DUR / 1000 + 's');

    slides.forEach(function (_, i) {
      var d = document.createElement('button');
      d.type = 'button'; d.className = 'dot'; d.setAttribute('aria-label', 'Слайд ' + (i + 1));
      d.addEventListener('click', function () { go(i); });
      d.addEventListener('animationend', function () { if (i === cur) go(cur + 1); });
      dotsWrap.appendChild(d);
    });
    var dots = $$('.dot', dotsWrap);

    var offset = function (i) { return slides[i].offsetLeft - slides[0].offsetLeft; };
    var setX = function (x) { track.style.transform = 'translate3d(' + (-x) + 'px,0,0)'; };

    function onActivate(s) {
      $$('.v-bars i', s).forEach(function (b) { b.style.height = '0'; requestAnimationFrame(function () { setTimeout(function () { b.style.height = b.dataset.h; }, 80); }); });
      var st = $$('.v-steps li', s);
      st.forEach(function (li) { li.classList.remove('on'); });
      st.forEach(function (li, k) { setTimeout(function () { li.classList.add('on'); }, 150 + k * 170); });
    }

    function go(i, silent) {
      cur = (i + n) % n;
      slides.forEach(function (s, k) { s.classList.toggle('active', k === cur); s.setAttribute('aria-hidden', k !== cur); });
      tabs.forEach(function (t, k) { t.classList.toggle('active', k === cur); t.setAttribute('aria-selected', k === cur); });
      dots.forEach(function (d, k) { d.classList.remove('active'); if (k === cur) { void d.offsetWidth; d.classList.add('active'); } });
      count.innerHTML = '<b>' + String(cur + 1).padStart(2, '0') + '</b> / ' + String(n).padStart(2, '0');
      setX(offset(cur));
      var t = tabs[cur];
      var tp = t && t.parentNode;
      if (tp && tp.scrollWidth > tp.clientWidth) tp.scrollTo({ left: Math.max(0, t.offsetLeft - tp.offsetLeft - 16), behavior: 'smooth' });
      if (!silent) onActivate(slides[cur]);
    }

    tabs.forEach(function (t, i) { t.addEventListener('click', function () { go(i); }); });
    $('[data-car="prev"]', root).addEventListener('click', function () { go(cur - 1); });
    $('[data-car="next"]', root).addEventListener('click', function () { go(cur + 1); });

    // Автопрокрутка идёт только когда карусель на экране и курсор не над ней
    var sync = function () { root.classList.toggle('paused', !visible || hover || reduce); };
    vp.addEventListener('mouseenter', function () { hover = true; sync(); });
    vp.addEventListener('mouseleave', function () { hover = false; sync(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; sync(); }, { threshold: 0.35 }).observe(root);
    }
    sync();

    document.addEventListener('keydown', function (e) {
      if (!visible || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
      if (e.key === 'ArrowRight') go(cur + 1);
      if (e.key === 'ArrowLeft') go(cur - 1);
    });

    // Перетаскивание мышью и свайп
    var sx = 0, sy = 0, dx = 0, drag = false, lock = null;
    vp.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button, a')) return;
      drag = true; lock = null; sx = e.clientX; sy = e.clientY; dx = 0;
    });
    window.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var mx = e.clientX - sx, my = e.clientY - sy;
      if (lock === null && (Math.abs(mx) > 6 || Math.abs(my) > 6)) {
        lock = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
        if (lock === 'x') { vp.classList.add('dragging'); try { vp.setPointerCapture(e.pointerId); } catch (_) {} }
      }
      if (lock !== 'x') return;
      dx = mx;
      var edge = (cur === 0 && dx > 0) || (cur === n - 1 && dx < 0) ? 0.35 : 1;
      setX(offset(cur) - dx * edge);
    });
    var end = function () {
      if (!drag) return;
      drag = false; vp.classList.remove('dragging');
      if (lock === 'x' && Math.abs(dx) > 70) go(cur + (dx < 0 ? 1 : -1));
      else setX(offset(cur));
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    vp.addEventListener('click', function (e) { if (Math.abs(dx) > 6) { e.preventDefault(); e.stopPropagation(); } }, true);

    // Тумблеры кампаний в слайде «Управляемый поток»
    $$('.v-toggle', root).forEach(function (b) {
      b.addEventListener('click', function () {
        b.classList.toggle('on');
        var on = $$('.v-toggle.on', root).length;
        var bars = $$('.v-bars i', root), last = bars[bars.length - 1];
        last.style.height = on === 2 ? '100%' : on === 1 ? '92%' : '30%';
      });
    });

    window.addEventListener('resize', function () { setX(offset(cur)); });
    go(0, true);
    inView(root, function () { onActivate(slides[cur]); }, { threshold: 0.3 });
  })();

  /* ---------- 6. Проверка: аккордеон и счёт ---------- */
  (function () {
    var accs = $$('#check .accordion');
    var num = $('#scoreNum'), text = $('#scoreText'), ring = $('#check .score-ring .fg');
    var C = 169.6;
    var open = function (a, state) {
      a.classList.toggle('active', state);
      $('.acc-btn', a).setAttribute('aria-expanded', state);
    };
    var score = function () {
      var no = accs.filter(function (a) { return a.classList.contains('ans-no'); }).length;
      var done = accs.filter(function (a) { return a.classList.contains('ans-no') || a.classList.contains('ans-yes'); }).length;
      num.textContent = no;
      ring.style.strokeDashoffset = C - C * no / accs.length;
      if (!done) text.innerHTML = 'Откройте вопрос и отметьте честно: есть ответ или нет.';
      else if (no === 0 && done === accs.length) text.innerHTML = 'На все шесть есть ответ — возможно, сайт вам пока не нужен. Так тоже бывает.';
      else text.innerHTML = 'Без ответа: <b>' + no + ' из ' + accs.length + '</b>. Столько дыр сайт закроет за десять дней.';
    };
    accs.forEach(function (a, i) {
      $('.acc-btn', a).addEventListener('click', function () {
        var was = a.classList.contains('active');
        accs.forEach(function (x) { open(x, false); });
        open(a, !was);
      });
      $$('.acc-answer button', a).forEach(function (b) {
        b.addEventListener('click', function () {
          var yes = b.dataset.a === 'yes';
          a.classList.toggle('ans-yes', yes); a.classList.toggle('ans-no', !yes);
          $$('.acc-answer button', a).forEach(function (x) { x.classList.remove('sel-yes', 'sel-no'); });
          b.classList.add(yes ? 'sel-yes' : 'sel-no');
          score();
          var next = accs[i + 1];
          if (next && !next.classList.contains('ans-yes') && !next.classList.contains('ans-no')) {
            setTimeout(function () { accs.forEach(function (x) { open(x, false); }); open(next, true); }, 380);
          }
        });
      });
    });
  })();

  /* ---------- 9. Процесс: активный шаг, прогресс, карточка ---------- */
  (function () {
    var list = $('#how .process-list'); if (!list) return;
    var steps = $$('.step', list), bar = $('.progress', list);
    var title = $('#pvTitle'), daysEl = $('#pvDays'), out = $('#pvOut');
    for (var d = 1; d <= 10; d++) { var c = document.createElement('div'); c.textContent = d; daysEl.appendChild(c); }
    var cells = $$('div', daysEl), last = -1;
    var paint = function (i) {
      if (i === last) return; last = i;
      var s = steps[i], from = +s.dataset.from, to = +s.dataset.to;
      steps.forEach(function (x, k) { x.classList.toggle('active', k === i); });
      title.textContent = s.dataset.day;
      cells.forEach(function (c, k) {
        var day = k + 1;
        c.classList.toggle('cur', day >= from && day <= to);
        c.classList.toggle('done', day < from);
      });
      out.innerHTML = '<b>На выходе:</b> ' + s.dataset.out;
    };
    var upd = function () {
      var mid = window.innerHeight * 0.45, idx = 0;
      steps.forEach(function (s, k) { if (s.getBoundingClientRect().top < mid) idx = k; });
      paint(idx);
      var r = list.getBoundingClientRect();
      var p = Math.max(0, Math.min(1, (mid - r.top) / r.height));
      bar.style.height = (p * 100) + '%';
    };
    window.addEventListener('scroll', upd, { passive: true });
    window.addEventListener('resize', upd);
    upd();
  })();

  /* ---------- 10. Калькулятор ---------- */
  (function () {
    var root = $('#calc'); if (!root) return;
    var ids = ['cViews', 'cFound', 'cCheck', 'cShow'];
    var inputs = {}, ranges = {};
    ids.forEach(function (id) { inputs[id] = $('#' + id); ranges[id] = $('.range[data-for="' + id + '"]'); });
    var months = 1, shown = 0, anim = null;
    var CARD = 0.726, CONV = 0.06;

    var fill = function (r) { r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min) * 100) + '%'); };
    var val = function (id) {
      var el = inputs[id], v = parseFloat(String(el.value).replace(',', '.'));
      if (isNaN(v) || v < 0) v = 0;
      return Math.min(v, parseFloat(el.max));
    };
    var tween = function (to) {
      var el = $('#resSum'), from = shown, t0 = performance.now(), dur = reduce ? 0 : 550;
      cancelAnimationFrame(anim);
      var step = function (now) {
        var p = dur ? Math.min(1, (now - t0) / dur) : 1, e = 1 - Math.pow(1 - p, 3);
        shown = from + (to - from) * e;
        el.textContent = '+' + fmt(Math.round(shown)) + ' ₽';
        if (p < 1) anim = requestAnimationFrame(step);
      };
      anim = requestAnimationFrame(step);
    };
    var calc = function () {
      var views = val('cViews'), found = val('cFound'), check = val('cCheck'), show = Math.max(0, Math.min(100, val('cShow')));
      var fromCard = views * CARD, visits = fromCard + found, leads = visits * CONV, clients = leads * show / 100;
      var month = clients * check;
      $('#fViews').textContent = fmt(views);
      $('#fVisits').textContent = fmt(Math.round(fromCard)) + '+' + fmt(found);
      $('#fLeads').textContent = fmt(Math.round(leads));
      $('#fClients').textContent = fmt(Math.round(clients));
      $('#fShowCap').textContent = fmt(show) + '% записавшихся дойдут до приёма';
      var base = Math.max(views, visits, 1);
      var w = function (x) { return Math.max(x > 0 ? 3 : 0, Math.sqrt(x / base) * 100) + '%'; };
      $('#bViews').style.width = w(views);
      $('#bVisits').style.width = w(visits);
      $('#bLeads').style.width = w(leads);
      $('#bClients').style.width = w(clients);
      var caps = { 1: 'Сайт принесёт в первый месяц', 3: 'Сайт принесёт за первый квартал', 12: 'Сайт принесёт за первый год' };
      $('#resCap').textContent = caps[months];
      $('#resSub').textContent = months === 1
        ? 'и столько же каждый следующий — ' + fmt(Math.round(month * 12)) + ' ₽ за год'
        : '≈ ' + fmt(Math.round(clients * months)) + ' новых пациентов с сайта за ' + (months === 3 ? 'три месяца' : 'двенадцать месяцев');
      tween(month * months);
      $$('.presets button', root).forEach(function (b) { b.classList.toggle('on', +b.dataset.v === check); });
    };
    ids.forEach(function (id) {
      var inp = inputs[id], r = ranges[id];
      inp.addEventListener('input', function () {
        var v = val(id);
        r.value = Math.min(v, +r.max); fill(r); calc();
      });
      inp.addEventListener('blur', function () { inp.value = val(id); });
      r.addEventListener('input', function () { inp.value = r.value; fill(r); calc(); });
      fill(r);
    });
    $$('.presets button', root).forEach(function (b) {
      b.addEventListener('click', function () {
        inputs.cCheck.value = b.dataset.v; ranges.cCheck.value = b.dataset.v; fill(ranges.cCheck); calc();
      });
    });
    $$('.periods button', root).forEach(function (b) {
      b.addEventListener('click', function () {
        months = +b.dataset.m;
        $$('.periods button', root).forEach(function (x) { x.classList.toggle('on', x === b); });
        calc();
      });
    });
    shown = 0;
    inView(root, function () { calc(); }, { threshold: 0.3 });
    // Бары и числа должны быть корректны и без прокрутки (например, при переходе по якорю)
    $('#resSum').textContent = '+0 ₽';
  })();

  /* ---------- 13. Сдвиг: строки по очереди ---------- */
  var shift = $('#shiftGrid');
  if (shift) {
    $$('.shift-row', shift).forEach(function (r, i) { r.style.transitionDelay = (i % 6) * 90 + (i >= 6 ? 300 : 0) + 'ms'; });
    inView(shift, function () { shift.classList.add('in'); }, { threshold: 0.3 });
  }

  /* ---------- 14. Заявка → готовое сообщение в WhatsApp ---------- */
  var form = $('#leadForm');
  if (form) {
    var phone = form.phone;
    phone.addEventListener('input', function () { phone.parentNode.classList.remove('err'); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var digits = phone.value.replace(/\D/g, '');
      if (digits.length < 10) { phone.parentNode.classList.add('err'); phone.focus(); return; }
      if (!form.consent.checked) { form.consent.focus(); return; }
      var name = form.name.value.trim();
      var text = 'Здравствуйте! Это АМДЦ (ул. Орбели, 19). Хочу макет главной и разбор запросов.'
        + (name ? ' Меня зовут ' + name + '.' : '') + ' Мой номер: ' + phone.value.trim() + '.';
      var btn = $('button[type=submit]', form);
      btn.textContent = 'Открываю WhatsApp…';
      window.open('https://wa.me/' + WA + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
      setTimeout(function () {
        form.outerHTML = '<div class="form-done" style="margin-top:40px"><h3>Заявка собрана</h3>' +
          '<p>Если WhatsApp не открылся сам — напишите на <a href="https://wa.me/' + WA + '" target="_blank" rel="noopener">+7 911 111-21-22</a> или позвоните. Отвечу в течение часа. Макет — через 4–5 дней.</p></div>';
      }, 900);
    });
  }

  /* ---------- 16. Голосовое ---------- */
  (function () {
    var player = $('#player'); if (!player) return;
    var audio = $('#vAudio'), wave = $('#wave'), time = $('#vTime'), btn = $('.play', player);
    var N = 46, seed = 7, broken = false;
    var rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (var i = 0; i < N; i++) {
      var b = document.createElement('i');
      var env = Math.sin(Math.PI * (i + 1) / (N + 1));
      b.style.height = Math.round(18 + env * 55 + rnd() * 27) + '%';
      wave.appendChild(b);
    }
    var bars = $$('i', wave);
    var mmss = function (s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
    var paint = function () {
      var p = audio.duration ? audio.currentTime / audio.duration : 0;
      bars.forEach(function (b, k) { b.classList.toggle('on', k / N < p); });
      time.textContent = mmss(audio.duration ? audio.duration - audio.currentTime : 107);
    };
    audio.addEventListener('error', function () { broken = true; });
    audio.addEventListener('loadedmetadata', paint);
    audio.addEventListener('timeupdate', paint);
    audio.addEventListener('ended', function () { player.classList.remove('playing'); audio.currentTime = 0; paint(); });
    btn.addEventListener('click', function () {
      if (broken) { $('#voice').classList.add('no-audio'); return; }
      if (audio.paused) {
        var pr = audio.play();
        if (pr && pr.catch) pr.catch(function () { $('#voice').classList.add('no-audio'); player.classList.remove('playing'); });
        player.classList.add('playing');
      } else { audio.pause(); player.classList.remove('playing'); }
    });
    wave.addEventListener('click', function (e) {
      if (!audio.duration) return;
      var r = wave.getBoundingClientRect();
      audio.currentTime = (e.clientX - r.left) / r.width * audio.duration; paint();
    });
  })();
})();
