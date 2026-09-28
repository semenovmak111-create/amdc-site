/* ZeeFrames — "What you get" carousel */
(function () {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    function pad(n) {
        return (n < 10 ? '0' : '') + n;
    }

    function init(root) {
        var tabs = [].slice.call(root.querySelectorAll('.zcr-tab'));
        var slides = [].slice.call(root.querySelectorAll('.zcr-slide'));
        var dots = [].slice.call(root.querySelectorAll('.zcr-dot'));
        var tablist = root.querySelector('.zcr-tabs');
        var stage = root.querySelector('.zcr-stage');
        var count = root.querySelector('.zcr-count');
        var total = slides.length;
        var current = 0;

        // autoplay, like the testimonial slider: the active dot fills up and
        // the next slide opens. It stops for good once the visitor steers.
        var autoplay = !reduce.matches;
        var inView = false;
        var hovered = false;
        var focused = false;

        function fill() {
            dots.forEach(function (d) {
                var f = d.querySelector('.zcr-dot-fill');
                if (f) f.remove();
            });
            var f = document.createElement('span');
            f.className = 'zcr-dot-fill';
            f.addEventListener('animationend', function () {
                if (autoplay) go(current + 1, false);
            });
            dots[current].appendChild(f);
        }

        function sync() {
            var run = autoplay && inView && !document.hidden;
            root.classList.toggle('is-playing', autoplay);
            root.classList.toggle('is-paused', autoplay && (!run || hovered || focused));
        }

        function stop() {
            if (!autoplay) return;
            autoplay = false;
            count.setAttribute('aria-live', 'polite');
            sync();
        }

        function scrollTab(tab) {
            var left = tab.offsetLeft - tablist.offsetLeft;
            var max = left - (tablist.clientWidth - tab.offsetWidth) / 2;
            if (tablist.scrollWidth <= tablist.clientWidth) return;
            tablist.scrollTo({ left: Math.max(0, max), behavior: reduce.matches ? 'auto' : 'smooth' });
        }

        function go(i, byUser, focusTab) {
            i = (i + total) % total;
            if (byUser) stop();
            current = i;

            slides.forEach(function (s, n) {
                var on = n === i;
                s.classList.toggle('is-active', on);
                s.setAttribute('aria-hidden', on ? 'false' : 'true');
                if ('inert' in s) s.inert = !on;
            });
            tabs.forEach(function (t, n) {
                var on = n === i;
                t.setAttribute('aria-selected', on ? 'true' : 'false');
                t.tabIndex = on ? 0 : -1;
            });
            dots.forEach(function (d, n) {
                d.classList.toggle('is-active', n === i);
            });
            count.innerHTML = '<b>' + pad(i + 1) + '</b> / ' + pad(total);

            fill();
            scrollTab(tabs[i]);
            if (focusTab) tabs[i].focus({ preventScroll: true });
        }

        tabs.forEach(function (t, n) {
            t.addEventListener('click', function () { go(n, true); });
        });

        dots.forEach(function (d, n) {
            d.addEventListener('click', function () { go(n, true); });
        });

        root.querySelectorAll('[data-zcr-prev]').forEach(function (b) {
            b.addEventListener('click', function () { go(current - 1, true); });
        });
        root.querySelectorAll('[data-zcr-next]').forEach(function (b) {
            b.addEventListener('click', function () { go(current + 1, true); });
        });

        // ← → anywhere inside the block; Home / End on the tabs
        root.addEventListener('keydown', function (e) {
            var onTab = e.target.getAttribute && e.target.getAttribute('role') === 'tab';
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
                e.preventDefault();
                go(current + (e.key === 'ArrowRight' ? 1 : -1), true, onTab);
            } else if (onTab && (e.key === 'Home' || e.key === 'End')) {
                e.preventDefault();
                go(e.key === 'Home' ? 0 : total - 1, true, true);
            }
        });

        // swipe: a horizontal flick of 40 px or more; vertical scroll stays native
        var sx = null, sy = 0;
        stage.addEventListener('pointerdown', function (e) {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            sx = e.clientX;
            sy = e.clientY;
        });
        stage.addEventListener('pointerup', function (e) {
            if (sx === null) return;
            var dx = e.clientX - sx, dy = e.clientY - sy;
            sx = null;
            if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) go(current + (dx < 0 ? 1 : -1), true);
        });
        stage.addEventListener('pointercancel', function () { sx = null; });

        // pictures 4–7 are drawn at a fixed width. In a narrower frame they first
        // reflow down to 360 px and only then zoom, so the type never gets tiny.
        var arts = [].slice.call(root.querySelectorAll('.zcr-art'));
        function fit() {
            arts.forEach(function (a) {
                var box = a.parentElement;
                var design = parseInt(a.getAttribute('data-w'), 10) || 440;
                var room = box.clientWidth < 400 ? 24 : 64;
                var availW = box.clientWidth - room, availH = box.clientHeight - room;
                var w = Math.max(360, Math.min(design, availW));
                a.style.zoom = '';
                a.style.width = w + 'px';
                var s = Math.min(1, availW / w, availH / a.offsetHeight);
                if (s < 1) a.style.zoom = s.toFixed(3);
            });
        }
        fit();
        if ('ResizeObserver' in window) new ResizeObserver(fit).observe(stage);
        else window.addEventListener('resize', fit);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);

        // Metrica switches
        root.querySelectorAll('.zcr-toggle').forEach(function (b) {
            b.addEventListener('click', function () {
                b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
            });
        });

        var card = root.querySelector('.zcr-card');
        card.addEventListener('mouseenter', function () { hovered = true; sync(); });
        card.addEventListener('mouseleave', function () { hovered = false; sync(); });
        root.addEventListener('focusin', function () { focused = true; sync(); });
        root.addEventListener('focusout', function (e) {
            if (!root.contains(e.relatedTarget)) { focused = false; sync(); }
        });
        document.addEventListener('visibilitychange', sync);

        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (entries) {
                inView = entries[0].isIntersecting;
                sync();
            }, { threshold: 0.35 }).observe(card);
        } else {
            inView = true;
        }

        reduce.addEventListener && reduce.addEventListener('change', function () {
            if (reduce.matches) stop();
        });

        if (autoplay) count.setAttribute('aria-live', 'off');
        go(0, false);
        sync();
    }

    document.querySelectorAll('[data-zcr]').forEach(init);
})();
