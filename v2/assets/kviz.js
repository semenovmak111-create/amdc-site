/* Квиз на месте «Шести вопросов»: шаги, прогресс, ответы уходят в заявку (#leadForm). */
(function () {
  var root = document.getElementById('quiz'); if (!root) return;
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var steps = $$('.qz-step', root), done = root.querySelector(".qz-final");
  var back = root.querySelector('.qz-nav .qz-back'), next = root.querySelector('.qz-next');
  var bar = document.getElementById('qzBar'), num = document.getElementById('qzNum'), txt = document.getElementById('qzText');
  var ring = document.querySelector('#check .score-ring .fg'), C = 169.6, N = steps.length, cur = 0, timer;

  var answered = function (st) {
    return $$('.qz-opts', st).every(function (g) { return g.querySelector('.qz-opt.is-on'); });
  };
  var progress = function (k) {
    bar.style.width = (100 * k / N) + '%';
    ring.style.strokeDashoffset = C - C * k / N;
  };
  var show = function (i) {
    cur = i;
    root.classList.remove('qz-done');
    steps.forEach(function (s, j) { s.classList.toggle('is-active', j === i); });
    done.classList.remove('is-active');
    back.hidden = i === 0;
    next.disabled = !answered(steps[i]);
    next.textContent = i === N - 1 ? 'Готово' : 'Дальше';
    num.textContent = (i + 1) + '/' + N;
    txt.textContent = 'Вопрос ' + (i + 1) + ' из ' + N;
    progress(i);
  };
  var collect = function () {
    return steps.map(function (s) {
      return $$('.qz-opt.is-on', s).map(function (o) { return o.textContent.trim(); }).join(', ');
    });
  };
  var finish = function () {
    var a = collect();
    window.amdcQuiz = a;
    steps.forEach(function (s) { s.classList.remove('is-active'); });
    root.classList.add('qz-done'); done.classList.add('is-active');
    var goal = done.querySelector('[data-goal]'); if (goal) goal.textContent = '«' + a[1] + '»';
    done.querySelector('.qz-sum').innerHTML = a.map(function (x, i) {
      return '<li><b>0' + (i + 1) + '</b><span>' + x.replace(/</g, '&lt;') + '</span></li>';
    }).join('');
    num.textContent = N + '/' + N; txt.textContent = 'Готово';
    progress(N);
  };
  var go = function () { if (cur < N - 1) show(cur + 1); else finish(); };

  $$('.qz-opts', root).forEach(function (g) {
    var multi = g.hasAttribute('data-multi');
    $$('.qz-opt', g).forEach(function (o) {
      o.addEventListener('click', function () {
        if (multi) o.classList.toggle('is-on');
        else $$('.qz-opt', g).forEach(function (x) { x.classList.toggle('is-on', x === o); });
        var st = steps[cur];
        next.disabled = !answered(st);
        clearTimeout(timer);
        var auto = !$$('.qz-opts[data-multi]', st).length;
        if (auto && answered(st)) timer = setTimeout(go, 380);
      });
    });
  });
  next.addEventListener('click', function () { clearTimeout(timer); if (answered(steps[cur])) go(); });
  back.addEventListener('click', function () { clearTimeout(timer); if (cur > 0) show(cur - 1); });
  root.querySelector('.qz-again').addEventListener('click', function () {
    $$('.qz-opt.is-on', root).forEach(function (o) { o.classList.remove('is-on'); });
    window.amdcQuiz = null; show(0);
  });
  show(0);
})();
