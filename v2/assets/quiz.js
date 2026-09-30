/* ZeeFrames — quiz "Получите прототип сайта и анализ рынка за шесть ответов".
   Behaviour only; the look lives in quiz.css. Works on any markup that carries the
   data-zqz-* hooks, so one script serves the block and its sketches.

   [data-zqz]            root
   [data-zqz-step]       a question (fieldset); options are .zqz-opt buttons with aria-pressed,
                         the group [data-multi] takes several answers
   [data-zqz-final]      the result screen
   [data-zqz-count]      "Вопрос 1 из 6" (aria-live)
   [data-zqz-dot]        progress items, one per question (slider dots, tabs, …)
   [data-zqz-hint]       side slides, one per question plus one for the result
   [data-zqz-back|fwd]   previous / next question; [data-zqz-next] "Дальше" (inactive until answered,
                         hidden instead when it carries data-hide)
   [data-zqz-goal]       gets the answer to question 2; [data-zqz-val] slots get every answer on the result,
   [data-zqz-ans] slots get them live (under the question tabs)
   [data-zqz-why]        on the result: the data-why sentences of the picked options, one per question
                         (the first picked one of a multi-choice question), in question order, one per line
   [data-zqz-toggle]     phone toggle of the question list; [data-zqz-toggle-label] shows the current one
   [data-zqz-again]      start over
   Answers are also left in window.amdcQuiz for the lead form, as on amdc-site/v2. */
(function () {
    var all = function (sel, el) { return Array.prototype.slice.call(el.querySelectorAll(sel)); };

    function init(root) {
        var steps = all('[data-zqz-step]', root);
        var final = root.querySelector('[data-zqz-final]');
        var count = root.querySelector('[data-zqz-count]');
        var dots = all('[data-zqz-dot]', root);
        var hints = all('[data-zqz-hint]', root);
        var N = steps.length, cur = 0, timer;

        var opts = function (st) { return all('.zqz-opt', st); };
        var picked = function (st) { return opts(st).filter(function (o) { return o.getAttribute('aria-pressed') === 'true'; }); };
        var answered = function (i) { return i < N && picked(steps[i]).length > 0; };
        var answers = function () {
            return steps.map(function (st) {
                return picked(st).map(function (o) { return (o.getAttribute('data-short') || o.textContent).trim(); }).join(', ');
            });
        };

        function paint() {
            var done = cur === N;
            root.setAttribute('data-step', done ? 'final' : String(cur + 1));
            steps.concat(final ? [final] : []).forEach(function (st, j) {
                var on = j === cur;
                st.classList.toggle('is-active', on);
                st.setAttribute('aria-hidden', on ? 'false' : 'true');
                if ('inert' in st) st.inert = !on;
            });
            hints.forEach(function (h, j) { h.classList.toggle('is-active', j === Math.min(cur, hints.length - 1)); });
            dots.forEach(function (d, j) {
                var on = j === cur;
                d.classList.toggle('is-active', on);
                d.classList.toggle('is-done', answered(j));
                if (d.tagName === 'BUTTON') d.disabled = j > cur && !answered(j - 1);
                if (on) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current');
            });
            if (count) count.textContent = done ? 'Готово' : 'Вопрос ' + (cur + 1) + ' из ' + N;
            var a = answers();
            all('[data-zqz-ans]', root).forEach(function (v) { v.textContent = a[+v.getAttribute('data-zqz-ans')]; });
            all('[data-zqz-toggle-label]', root).forEach(function (l) {
                l.textContent = done ? 'Готово · все ' + N + ' ответов' : (dots[cur] ? dots[cur].getAttribute('data-label') : '');
            });
            all('[data-zqz-back]', root).forEach(function (b) { b.disabled = cur === 0; });
            all('[data-zqz-fwd]', root).forEach(function (b) { b.disabled = done || !answered(cur); });
            steps.forEach(function (st) {
                var nx = st.querySelector('[data-zqz-next]');
                if (!nx) return;
                if (nx.hasAttribute('data-hide')) nx.hidden = !picked(st).length;
                else nx.disabled = !picked(st).length;
            });
        }

        function show(i, focus) {
            clearTimeout(timer);
            cur = Math.max(0, Math.min(N, i));
            if (cur === N) {
                var a = answers();
                window.amdcQuiz = a;
                all('[data-zqz-goal]', root).forEach(function (g) { g.textContent = '«' + a[1] + '»'; });
                all('[data-zqz-val]', root).forEach(function (v) { v.textContent = a[+v.getAttribute('data-zqz-val')] || '—'; });
                var why = steps.map(function (st) {
                    var o = picked(st).filter(function (x) { return x.hasAttribute('data-why'); })[0];
                    return o ? o.getAttribute('data-why') : '';
                }).filter(Boolean).join('\n');
                all('[data-zqz-why]', root).forEach(function (w) { w.textContent = why; });
            }
            paint();
            if (focus) {
                var target = (cur === N ? final : steps[cur]).querySelector('[data-zqz-focus]');
                if (target) target.focus({ preventScroll: true });
            }
        }

        var within = function () { return root.contains(document.activeElement); };

        steps.forEach(function (st, i) {
            var multi = !!st.querySelector('[data-multi]');
            opts(st).forEach(function (o) {
                o.addEventListener('click', function () {
                    if (multi) {
                        o.setAttribute('aria-pressed', o.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
                    } else {
                        opts(st).forEach(function (x) { x.setAttribute('aria-pressed', x === o ? 'true' : 'false'); });
                        clearTimeout(timer);
                        var kb = within() && root.classList.contains('zqz-kb');
                        timer = setTimeout(function () { show(i + 1, kb); }, 380);
                    }
                    paint();
                });
            });
            var nx = st.querySelector('[data-zqz-next]');
            if (nx) nx.addEventListener('click', function () { if (answered(i)) show(i + 1, true); });

            /* arrows move between the options of a group, like a radio group */
            st.addEventListener('keydown', function (e) {
                var k = e.key, list = opts(st), at = list.indexOf(document.activeElement);
                if (at < 0) return;
                var d = (k === 'ArrowRight' || k === 'ArrowDown') ? 1 : (k === 'ArrowLeft' || k === 'ArrowUp') ? -1 : 0;
                if (!d) return;
                e.preventDefault();
                list[(at + d + list.length) % list.length].focus();
            });
        });

        all('[data-zqz-back]', root).forEach(function (b) { b.addEventListener('click', function () { if (cur > 0) show(cur - 1, false); }); });
        all('[data-zqz-fwd]', root).forEach(function (b) { b.addEventListener('click', function () { if (answered(cur)) show(cur + 1, false); }); });
        var toggle = root.querySelector('[data-zqz-toggle]');
        var fold = function (open) {
            if (!toggle) return;
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            toggle.parentElement.classList.toggle('is-open', open);
        };
        if (toggle) toggle.addEventListener('click', function () { fold(toggle.getAttribute('aria-expanded') !== 'true'); });
        dots.forEach(function (d, j) {
            if (d.tagName === 'BUTTON') d.addEventListener('click', function () { fold(false); show(j, false); });
        });
        all('[data-zqz-again]', root).forEach(function (b) {
            b.addEventListener('click', function () {
                all('.zqz-opt', root).forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
                window.amdcQuiz = null;
                show(0, true);
            });
        });

        /* digits 1–9 pick an answer while the quiz is on screen (not while typing in a field) */
        var seen = false;
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (e) { seen = e[0].intersectionRatio > 0.35; }, { threshold: [0, 0.35, 0.6] }).observe(root);
        }
        document.addEventListener('keydown', function (e) {
            if (!/^[1-9]$/.test(e.key) || e.ctrlKey || e.metaKey || e.altKey || cur >= N) return;
            var t = e.target, typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
            if (typing || !(seen || root.contains(t))) return;
            var o = opts(steps[cur])[+e.key - 1];
            if (!o) return;
            e.preventDefault();
            root.classList.add('zqz-kb');
            o.focus({ preventScroll: true });
            o.click();
        });

        /* the lime glow of a card follows the pointer */
        all('.zqz-opt', root).forEach(function (o) {
            o.addEventListener('pointermove', function (e) {
                var r = o.getBoundingClientRect();
                o.style.setProperty('--mx', (e.clientX - r.left) + 'px');
                o.style.setProperty('--my', (e.clientY - r.top) + 'px');
            });
        });

        /* keyboard users get focus moved to the next question; mouse users keep their place */
        root.addEventListener('keydown', function () { root.classList.add('zqz-kb'); });
        root.addEventListener('pointerdown', function () { root.classList.remove('zqz-kb'); });

        var start = +(new URLSearchParams(location.search).get('zqz') || 0);   /* ?zqz=3 — for screenshots */
        if (start) {
            steps.forEach(function (st, i) {
                if (i >= start - 1 && start <= N) return;
                var o = opts(st);
                o[i === 3 ? 0 : i % o.length].setAttribute('aria-pressed', 'true');
                if (i === 3) o[2].setAttribute('aria-pressed', 'true');
            });
        }
        show(start ? Math.min(start - 1, N) : 0, false);
    }

    all('[data-zqz]', document).forEach(init);
})();
