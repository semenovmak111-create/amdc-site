/* ============================================================
   «САЙТ ДЛЯ АМДЦ» — ПОВЕДЕНИЕ ТЕЛЕФОННОЙ ВЕРСИИ.

   Ни библиотек, ни сборки — как и в основном скрипте.

   ── Что делает ───────────────────────────────────────────
   Из десяти развёрнутых разворотов собирает десять
   читаемых: длинные перечни прячет под спойлеры, а после
   ключевых блоков ставит полосу мессенджеров.

   ── Что прячется, а что нет ──────────────────────────────
   Правило одно: под спойлер уходит то, что подтверждает уже
   высказанную мысль, и никогда — сама мысль. Поэтому первым
   в каждом перечне остаётся то, ради чего перечень собран,
   а заголовок спойлера — тезис, а не «подробнее»: человек
   должен знать, что откроет, ещё не открыв.

   Расчёт не сворачивается никогда: это единственное место,
   где цифры считаются от того, что ввёл сам человек, и
   спрятать его — значит выбросить главный довод страницы.

   ── Что будет, если скрипт не выполнится ─────────────────
   Ничего не сломается: страница останется той же, просто
   длиннее. Ни один смысл не живёт в скрипте — он только
   перекладывает уже готовые узлы.
   ============================================================ */

(function(){
  'use strict';

  var MOB = '(max-width:860px)';
  if (!matchMedia(MOB).matches) return;

  var WA = '79111112122';
  var TG = 'https://t.me/+79111112122';

  /* ---- 1. Спойлер ---------------------------------------
     Собирает <details> вокруг списка узлов и ставит его туда,
     где стоял первый из них. */
  function spoiler(nodes, title, opts){
    nodes = [].slice.call(nodes).filter(Boolean);
    if (!nodes.length) return null;

    opts = opts || {};
    var d  = document.createElement('details');
    d.className = 'mob-sp' + (opts.wide ? ' wide' : '');

    var s  = document.createElement('summary');
    s.appendChild(document.createTextNode(title));
    if (opts.count !== false){
      var c = document.createElement('span');
      c.className = 'cnt';
      c.textContent = '+' + (opts.count || nodes.length);
      s.appendChild(c);
    }

    var box = document.createElement('div');
    box.className = 'in';

    nodes[0].parentNode.insertBefore(d, nodes[0]);
    nodes.forEach(function(n){ box.appendChild(n); });
    d.appendChild(s);
    d.appendChild(box);
    return d;
  }

  /* ---- 2. Полоса мессенджеров ---------------------------
     Ставится после блоков, где у читателя возникает вопрос,
     а не только в подвале. */
  function messengers(afterEl, question, waText){
    if (!afterEl) return;
    var box = document.createElement('div');
    box.className = 'mob-msg';
    box.innerHTML =
      '<div class="q">' + question + '</div>' +
      '<a class="wa" href="https://wa.me/' + WA + '?text=' +
        encodeURIComponent(waText) + '" target="_blank" rel="noopener">' +
        '<svg class="i"><use href="#i-wa"/></svg>WhatsApp</a>' +
      '<a class="tg" href="' + TG + '" target="_blank" rel="noopener">' +
        '<svg class="i"><use href="#i-tg"/></svg>Telegram</a>';
    afterEl.appendChild(box);
    return box;
  }

  /* ---- Пара «имя + телефон» ------------------------------
     Лёжа экран 390 px высотой, и форма столбиком туда не
     помещается. Оборачиваем первые два поля в общий блок:
     стоя он ничего не меняет, лёжа раскладывает их в две
     колонки. */
  document.querySelectorAll('form.form').forEach(function(f){
    var fs = f.querySelectorAll('.field');
    if (fs.length < 2) return;
    var g = document.createElement('div');
    g.className = 'fields2';
    fs[0].parentNode.insertBefore(g, fs[0]);
    g.appendChild(fs[0]); g.appendChild(fs[1]);
  });

  function sec(n){ return document.querySelector('section[data-sec="' + n + '"]'); }
  function wrapOf(n){ var s = sec(n); return s && s.querySelector('.wrap'); }
  function items(n, sel){
    var s = sec(n);
    return s ? [].slice.call(s.querySelectorAll(sel)) : [];
  }
  /* Оставить на виду первые keep, остальное — под спойлер. */
  function fold(n, sel, keep, title, opts){
    var all = items(n, sel);
    if (all.length <= keep) return null;
    return spoiler(all.slice(keep), title, opts);
  }

  /* ========================================================
     03. КАК ПАЦИЕНТ ПОПАДАЕТ К ВАМ

     Две дороги стоят рядом только на широком экране; на
     телефоне они уже друг под другом, и это работает. Три
     карточки под ними — расшифровка одного и того же провала;
     последняя, личная, остаётся на виду: ради неё разворот
     и собран. Сто фигурок уходят целиком — цифра «66 из 100»
     сказана строкой выше словами.
     ======================================================== */
  (function(){
    var g = items('s03', '.guards > .guard');
    if (g.length >= 3){
      spoiler([g[0], g[1]], 'Что именно сломано и во что обходится');
      g[2].parentNode.appendChild(g[2]);
    }
    var s = sec('s03'); if (!s) return;
    var p = s.querySelector('.people');
    if (p) spoiler([p], 'Показать на ста петербуржцах', {count:false});
  })();

  messengers(wrapOf('s03'),
    'Похоже на то, как есть у вас? Скажите, что не так.',
    'Здравствуйте! Это АМДЦ. Посмотрел разбор, хочу обсудить.');

  /* ========================================================
     04. РАСЧЁТ

     Сам расчёт остаётся развёрнутым весь: это единственное
     место, где цифры считаются от того, что ввёл человек.
     Под спойлер уходит только сноска о коэффициентах — она
     нужна тому, кто решил проверить, и мешает тому, кто
     просто читает.
     ======================================================== */
  (function(){
    var s = sec('s04'); if (!s) return;
    var note = s.querySelector('.note');
    if (note) spoiler([note], 'Откуда взяты коэффициенты', {count:false});
  })();

  /* ========================================================
     05. СОСЕДИ ПО КВАРТАЛУ

     Три снимка по высоте — три экрана. На виду ближайший
     сосед и собственный сайт клиники: сравнение работает уже
     на этой паре. Средний уходит под спойлер, карточка АМДЦ
     остаётся последней — на ней строится вывод блока.
     ======================================================== */
  (function(){
    var rows = items('s05', '.sites .site');
    if (rows.length < 3) return;
    spoiler([rows[1]], 'Ещё один — в соседнем доме', {count:false});
    var me = rows[2];
    me.parentNode.appendChild(me);
  })();

  messengers(wrapOf('s05'),
    'Хотите такую же страницу, как у соседей, — только свою?',
    'Здравствуйте! Это АМДЦ. Посмотрел сравнение с соседями, хочу обсудить сайт.');

  /* ========================================================
     06. КАК ВЫБИРАТЬ

     На виду два критерия: дальше человек либо принял способ
     смотреть, либо нет, и остальные три нужны ему справкой.
     Карточки «кому я не подхожу» сворачиваются в строку с
     прямой надписью — свёрнутая, она честнее развёрнутой,
     потому что её видно и не читая.
     ======================================================== */
  fold('s06', '.crit > li', 2, 'Ещё три пункта, по которым стоит смотреть');
  fold('s06', '.guards > .guard', 0, 'Кому я не подхожу — три случая');

  /* ========================================================
     07. ПРЕДЛОЖЕНИЕ

     Ответы по тем же пяти пунктам: на виду первые два, они
     же самые проверяемые. Из шести выгод открыты деньги и
     время, остальные четыре под спойлером. Три шага срока
     не трогаются: это и есть предложение.
     ======================================================== */
  fold('s07', '.crit > li', 2, 'Ответы по остальным трём пунктам');
  fold('s07', '.gains > .gain', 2, 'Что ещё вы получаете, кроме денег и времени');

  /* ========================================================
     08. ЧТО ВЫ ОБО МНЕ ДУМАЕТЕ

     Шесть претензий. Две первые — про деньги вперёд и про
     исчезновение подрядчика — остаются на виду: из-за них
     закрывают страницу. Остальные четыре ждут того, у кого
     они есть.
     ======================================================== */
  fold('s08', '.aud > li', 2, 'Ещё четыре: бюджет, результат, выход, один человек');

  messengers(wrapOf('s08'),
    'Осталось сомнение, которого тут нет? Напишите одной строкой.',
    'Здравствуйте! Это АМДЦ. У меня вопрос по предложению.');

  /* ========================================================
     09. ПРО ЦЕНУ

     Вилка рынка остаётся целиком: четыре строки и есть
     система координат, без одной из них она не работает.
     Под спойлер уходит разбор цены по долям.
     ======================================================== */
  fold('s09', '.parts > .part', 0, 'Из чего складывается цена', {count:3});

  /* ---- 3. Спойлеры в полосе прокрутки -------------------
     details раскрывается мгновенно, и содержимое выталкивает
     страницу вниз рывком. Подводим заголовок спойлера к
     верхнему краю, чтобы раскрытое оказалось перед глазами.

     Слушаем click на самом заголовке, а не событие toggle:
     toggle приходит и на программное раскрытие. */
  document.addEventListener('click', function(e){
    var s = e.target.closest && e.target.closest('.mob-sp > summary');
    if (!s) return;
    var d = s.parentNode;
    if (d.open) return;
    var hdr = parseInt(getComputedStyle(document.documentElement)
                .getPropertyValue('--hdr'), 10) || 56;
    requestAnimationFrame(function(){
      var top = d.getBoundingClientRect().top;
      if (top < hdr + 8 || top > innerHeight * 0.55){
        scrollBy({top: top - hdr - 12, behavior: 'smooth'});
      }
    });
  });

  /* ---- 4. Блоки внутри спойлера показываются сразу -------
     Основной скрипт прячет блоки до попадания в экран через
     IntersectionObserver. Содержимое закрытого спойлера в
     экран не попадает никогда. */
  document.addEventListener('toggle', function(e){
    var d = e.target;
    if (!d.classList || !d.classList.contains('mob-sp') || !d.open) return;
    d.querySelectorAll('[data-rise]').forEach(function(el){
      el.classList.add('seen');
    });
  }, true);

  /* ---- 5. Когда выпускать липкую полосу -----------------
     Полоса выезжает ровно тогда, когда кнопка первого экрана
     ушла из виду. Пока она на месте, дублировать её внизу
     незачем. */
  (function(){
    var cta = document.querySelector('.hero .ctarow');
    var root = document.documentElement;
    if (!cta) { root.classList.add('sticky-ready'); return; }

    if (!('IntersectionObserver' in window)){
      root.classList.add('sticky-ready');
      return;
    }
    new IntersectionObserver(function(e){
      root.classList.toggle('sticky-ready', !e[0].isIntersecting);
    }, {threshold:0}).observe(cta);
  })();

  /* ---- 6. Клавиатура и липкая полоса --------------------
     Пока человек заполняет поле, полоса внизу должна уйти:
     клавиатура поднимает её ровно на свой край. Это касается
     и полей расчёта, а не только формы. */
  (function(){
    var root = document.documentElement, off;
    function typing(on){
      clearTimeout(off);
      if (on) root.classList.add('typing');
      else off = setTimeout(function(){ root.classList.remove('typing'); }, 180);
    }
    addEventListener('focusin', function(e){
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) typing(true);
    });
    addEventListener('focusout', function(e){
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) typing(false);
    });
  })();

  document.documentElement.classList.add('mob');
})();
