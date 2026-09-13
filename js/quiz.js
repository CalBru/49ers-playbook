/* quiz.js — "Play the Game". Job recall rather than name recall: who gets the
   ball, where do YOU run, and — the heart of this playbook — are you faking or
   do you really get it?

   No timers and no way to lose. A wrong answer just shows the right one moving.
   Plays unlock by level so a beginner is not facing all sixteen calls. */

var Quiz = (function () {

  var ROUND = 5;
  var host, queue = [], idx = 0, results = [], locked = false;

  function shuffle(a) { return Drills.shuffle(a); }

  /* Level 1 from the start; the rest open up as stars come in. */
  function unlockedLevel() {
    var n = App.starCount();
    return n >= 4 ? 3 : n >= 2 ? 2 : 1;
  }
  function pool() {
    var max = unlockedLevel();
    return Plays.all(true).filter(function (p) { return p.level <= max; });
  }

  function dist(a, b) {
    var dx = a[0] - b[0], dy = a[1] - b[1];
    return Math.sqrt(dx * dx + dy * dy);
  }

  function travel(play, posKey) {
    return dist(Positions.get(posKey).spot, endPoint(play, posKey));
  }

  function endPoint(play, posKey) {
    var a = Plays.assignment(play, posKey), pts = [];
    a.segs.forEach(function (s) { pts = pts.concat(s.pts); });
    return pts[pts.length - 1];
  }

  /* ---------------------------------------------------------- build round */
  function build() {
    queue = []; idx = 0; results = [];
    var ps = shuffle(pool());
    var types = shuffle(['carrier', 'fake', 'where', 'carrier', 'where']);
    for (var i = 0; i < ROUND; i++) {
      var p = ps[i % ps.length];
      var t = types[i];
      if ((t === 'fake' || t === 'where') && !App.pos) t = 'carrier';
      queue.push({ play: p, type: t });
    }
  }

  function pips() {
    var out = '';
    for (var i = 0; i < queue.length; i++) {
      var c = results[i] === true ? ' is-ok' : results[i] === false ? ' is-no'
            : i === idx ? ' is-now' : '';
      out += '<span class="pip' + c + '"></span>';
    }
    return '<div class="drill__progress">' + out + '</div>';
  }

  function start(h) {
    host = h;
    if (!App.pos) return renderNeedPos();
    build(); renderQ();
  }
  function onPosChange() { start(host); }

  /* The position bar sits right above this, so point at it rather than
     duplicating the five buttons here. */
  function renderNeedPos() {
    host.innerHTML =
      '<div class="drill">' +
        '<p class="drill__arrow">☝️</p>' +
        '<h2 class="drill__q">Tap your spot up top</h2>' +
        '<p class="drill__hint">Every question here is about what YOU do, ' +
          'so pick which one you are playing.</p>' +
      '</div>';
  }

  /* ------------------------------------------------------------ feedback */
  function afterAnswer(right, q, msg) {
    results[idx] = right;
    if (right) App.award(q.play.id);

    var fb = host.querySelector('.feedback');
    fb.className = 'feedback ' + (right ? 'is-ok' : 'is-no');
    fb.textContent = right ? '✅ ' + (msg || 'That is it!') : '👉 ' + msg;
    Speech.say(right ? 'Yes! ' + (msg || '') : msg);

    if (!right) queue.push(q);
    host.querySelector('.drill__progress').outerHTML = pips();

    var next = document.createElement('button');
    next.className = 'nextbtn';
    next.textContent = idx + 1 >= queue.length ? 'See my stars ⭐' : 'Next one →';
    next.addEventListener('click', function () { idx++; renderQ(); });
    host.querySelector('.drill').appendChild(next);
  }

  function renderQ() {
    if (idx >= queue.length) return renderScore();
    locked = false;
    var q = queue[idx];
    if (q.type === 'carrier') return qCarrier(q);
    if (q.type === 'fake')    return qFake(q);
    return qWhere(q);
  }

  /* --- who gets the ball? (tap the jersey) ----------------------------- */
  function qCarrier(q) {
    var p = q.play, answer = Plays.carrier(p), name = Plays.name(p);
    host.innerHTML =
      '<div class="drill">' + pips() +
        '<p class="drill__kicker">' + name + '</p>' +
        '<h2 class="drill__q">Who ends up with the ball?</h2>' +
        '<p class="drill__hint">Tap the player on the field.</p>' +
        '<div class="drill__field"><svg viewBox="0 20 100 78" ' +
          'preserveAspectRatio="xMidYMid meet"></svg></div>' +
        '<p class="feedback"></p>' +
      '</div>';

    var svg = host.querySelector('svg');
    var api = Field.render(svg, p, { focus: null, animate: false });
    /* Hide the routes — that would give it away. */
    svg.querySelectorAll('.f-route, .f-ball').forEach(function (n) { n.style.display = 'none'; });

    Object.keys(api.rows).forEach(function (k) {
      var tok = api.rows[k].token;
      tok.style.cursor = 'pointer';
      tok.addEventListener('click', function () {
        if (locked) return;
        locked = true;
        svg.querySelectorAll('.f-route, .f-ball').forEach(function (n) { n.style.display = ''; });
        Field.render(svg, p, { focus: answer, animate: true });
        afterAnswer(k === answer, q,
          'The ' + Positions.shortName(answer) + ' gets it on ' + name + '.');
      });
    });
  }

  /* --- faking, or really getting it? ----------------------------------- */
  function qFake(q) {
    var p = q.play, me = App.pos;
    var a = Plays.assignment(p, me);
    var real = a.ballCarrier;
    var faking = a.hasFake;
    /* Only ask when the answer is interesting. */
    if (!real && !faking) { q.type = 'where'; return qWhere(q); }

    host.innerHTML =
      '<div class="drill">' + pips() +
        '<p class="drill__kicker">' + Plays.name(p) + ' · you are the ' + Positions.shortName(me) + '</p>' +
        '<h2 class="drill__q">Do you really get the ball?</h2>' +
        '<div class="choices choices--2" id="ch">' +
          '<button class="choice" data-v="1">🏈 I really get it</button>' +
          '<button class="choice" data-v="0">🤫 I am just FAKING</button>' +
        '</div>' +
        '<p class="feedback"></p>' +
      '</div>';

    host.querySelectorAll('#ch .choice').forEach(function (b) {
      b.addEventListener('click', function () {
        if (locked) return;
        locked = true;
        var said = b.getAttribute('data-v') === '1';
        var right = said === real;
        b.classList.add(right ? 'is-right' : 'is-wrong');

        var box = document.createElement('div');
        box.className = 'drill__field';
        box.innerHTML = '<svg viewBox="0 20 100 78" preserveAspectRatio="xMidYMid meet"></svg>';
        host.querySelector('#ch').parentNode.insertBefore(box, host.querySelector('.feedback'));
        Field.render(box.querySelector('svg'), p, { focus: me, animate: true });

        afterAnswer(right, q, real
          ? 'You really get it — run hard!'
          : 'You are faking. Sell it like you have the ball!');
      });
    });
  }

  /* --- which spot do you finish in? ------------------------------------ */
  /* This used to ask for an exact tap on the field, which was too fine-grained
     for a beginner -- knowing roughly where you end up and hitting a pixel are
     different skills. Now it offers three marked spots. */
  function qWhere(q) {
    var p = q.play, me = App.pos;
    /* Pointless for the Quarterback, who finishes where he started. */
    if (travel(p, me) < 14) { q.type = 'carrier'; return qCarrier(q); }
    var target = endPoint(p, me);

    /* Decoys come from where the other players finish -- but only ones who
       actually go somewhere. The Quarterback barely moves, so his end point
       sits on top of the formation: visually cluttered and obviously wrong. */
    var starts = Positions.keys.map(function (k) { return Positions.get(k).spot; });
    var clearOfFormation = function (e) {
      return starts.every(function (sp) { return dist(e, sp) > 12; });
    };
    var others = Positions.keys
      .filter(function (k) { return k !== me && travel(p, k) > 14; })
      .map(function (k) { return endPoint(p, k); })
      .filter(function (e) { return dist(e, target) > 18 && clearOfFormation(e); });
    others = shuffle(others);

    var spots = [target];
    for (var i = 0; i < others.length && spots.length < 3; i++) {
      var ok = spots.every(function (sp) { return dist(sp, others[i]) > 18; });
      if (ok) spots.push(others[i]);
    }
    /* Fall back to mirrored/offset points if the play bunches everyone up. */
    var tries = [[100 - target[0], target[1]], [target[0], Math.max(26, target[1] - 26)],
                 [target[0], Math.min(92, target[1] + 26)]];
    for (var j = 0; j < tries.length && spots.length < 3; j++) {
      if (clearOfFormation(tries[j]) &&
          spots.every(function (sp) { return dist(sp, tries[j]) > 18; })) spots.push(tries[j]);
    }
    spots = shuffle(spots);

    host.innerHTML =
      '<div class="drill">' + pips() +
        '<p class="drill__kicker">' + Plays.name(p) + ' · you are the ' + Positions.shortName(me) + '</p>' +
        '<h2 class="drill__q">Where do you finish up?</h2>' +
        '<p class="drill__hint">Tap one of the three spots.</p>' +
        '<div class="drill__field"><svg viewBox="0 20 100 78" ' +
          'preserveAspectRatio="xMidYMid meet"></svg></div>' +
        '<p class="feedback"></p>' +
      '</div>';

    var svg = host.querySelector('svg');
    Field.render(svg, p, { focus: me, animate: false });
    svg.querySelectorAll('.f-route, .f-ball').forEach(function (n) { n.style.display = 'none'; });

    var NS = 'http://www.w3.org/2000/svg';
    spots.forEach(function (sp, i) {
      var g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'f-target');
      g.setAttribute('transform', 'translate(' + sp[0] + ',' + sp[1] + ')');
      var c = document.createElementNS(NS, 'circle'); c.setAttribute('r', 7.5);
      var t = document.createElementNS(NS, 'text'); t.setAttribute('y', 1.9);
      t.textContent = 'ABC'[i];
      g.appendChild(c); g.appendChild(t);
      g.addEventListener('click', function () {
        if (locked) return;
        locked = true;
        var right = sp === target;
        g.setAttribute('class', 'f-target ' + (right ? 'is-right' : 'is-wrong'));
        Field.render(svg, p, { focus: me, animate: true });
        afterAnswer(right, q, right ? 'That is where your route ends.'
                                    : 'Watch it again — that is where you end up.');
      });
      svg.appendChild(g);
    });
  }

  /* ------------------------------------------------------------- scoring */
  function renderScore() {
    var got = results.filter(Boolean).length, total = results.length;
    var perfect = got === total && total > 0;
    var lvl = unlockedLevel();
    host.innerHTML =
      '<div class="drill scorecard">' +
        '<div class="scorecard__stars">' + (perfect ? '⭐⭐⭐' : got >= total / 2 ? '⭐⭐' : '⭐') + '</div>' +
        '<p class="scorecard__msg">' + (perfect ? 'Perfect!' : 'You got ' + got + ' of ' + total) + '</p>' +
        '<p class="drill__hint">' + App.starCount() + ' of ' + Plays.list.length +
          ' plays learned' + (lvl < 3 ? ' · learn more to unlock the tricky ones' : '') + '</p>' +
        '<button class="nextbtn" id="again">Go again</button>' +
      '</div>';
    host.querySelector('#again').addEventListener('click', function () { build(); renderQ(); });
    Speech.say(perfect ? 'Perfect! Great job!' : 'You got ' + got + ' out of ' + total);
    if (perfect) App.confetti();
  }

  return { start: start, onPosChange: onPosChange };
})();
