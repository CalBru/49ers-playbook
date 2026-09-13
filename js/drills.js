/* drills.js — "Coach Calls It". Teaches the PLAY NAMES, which is the thing a
   photo of a whiteboard teaches worst.

   Two drills, deliberately. An earlier "hear it, pick it from a list" round
   was cut: it tested reading the options, not knowing the play.

     see  -> name   (watch it, then name it)
     hear -> do     (Coach calls it -- what is YOUR job?) */

var Drills = (function () {

  var ROUND = 5;
  var host, mode = null, queue = [], idx = 0, results = [], locked = false;

  /* ------------------------------------------------------------- helpers */
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function pool() { return Plays.all(true); }   // all 8 shapes, both directions

  function distractors(target, n) {
    var name = Plays.name(target);
    var others = pool().filter(function (p) { return Plays.name(p) !== name; });
    /* Prefer the same shape's other direction — that mix-up is the whole point. */
    var sameShape = others.filter(function (p) { return p.id === target.id; });
    var rest = shuffle(others.filter(function (p) { return p.id !== target.id; }));
    return shuffle(sameShape.concat(rest).slice(0, n));
  }

  /* ---------------------------------------------------------- build round */
  function build() {
    queue = []; idx = 0; results = [];
    var picks = shuffle(pool()).slice(0, ROUND);
    picks.forEach(function (p) {
      queue.push({ play: p, choices: shuffle(distractors(p, 2).concat([p])) });
    });
  }

  /* ------------------------------------------------------------- screens */
  function start(h) { host = h; mode = null; renderModes(); }

  function onPosChange() {
    if (mode === 'do' && queue.length) renderQ();
    else if (!mode) renderModes();
  }

  function renderModes() {
    host.innerHTML =
      '<div class="drill">' +
        '<p class="drill__kicker">Coach Calls It</p>' +
        '<h2 class="drill__q">Know the play names</h2>' +
        '<p class="drill__hint">Pick how you want to practise. Five calls per round.</p>' +
        '<div class="modepick">' +
          '<button class="menu__btn menu__btn--quiz" data-mode="do">' +
            '<span class="menu__icon">🏃</span><span class="menu__text">' +
            '<b>Hear it, do it</b><i>Coach calls a play — what is YOUR job?</i></span></button>' +
          '<button class="menu__btn menu__btn--plays" data-mode="see">' +
            '<span class="menu__icon">👀</span><span class="menu__text">' +
            '<b>Watch it, name it</b><i>See the play — you name it</i></span></button>' +
        '</div>' +
      '</div>';

    host.querySelectorAll('[data-mode]').forEach(function (b) {
      b.addEventListener('click', function () {
        var m = b.getAttribute('data-mode');
        if (m === 'do' && !App.pos) {
          Speech.say('Pick your spot first!');
          host.querySelector('.drill__hint').textContent =
            'Tap the button up top to pick your spot first — this one is about YOU.';
          return;
        }
        mode = m; build(); renderQ();
      });
    });
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

  function renderQ() {
    if (idx >= queue.length) return renderScore();
    locked = false;
    var q = queue[idx], p = q.play, name = Plays.name(p);
    if (mode === 'see') renderSee(q, p, name);
    else                renderDo(q, p, name);
  }

  function choiceBtns(q, correctName, onPick) {
    var wrap = document.createElement('div');
    wrap.className = 'choices';
    q.choices.forEach(function (c) {
      var b = document.createElement('button');
      b.className = 'choice';
      b.textContent = Plays.name(c);
      b.addEventListener('click', function () {
        if (locked) return;
        locked = true;
        var right = Plays.name(c) === correctName;
        b.classList.add(right ? 'is-right' : 'is-wrong');
        if (!right) {
          wrap.querySelectorAll('.choice').forEach(function (o) {
            if (o.textContent === correctName) o.classList.add('is-right');
          });
        }
        onPick(right);
      });
      wrap.appendChild(b);
    });
    return wrap;
  }

  function afterAnswer(right, play, note) {
    results[idx] = right;
    if (right) App.award(play.id);

    var fb = host.querySelector('.feedback');
    fb.className = 'feedback ' + (right ? 'is-ok' : 'is-no');
    fb.textContent = (right ? '✅ Nice! ' : '👉 ') + (note || 'This one is ' + Plays.name(play) + '.');
    Speech.say((right ? 'Nice! ' : '') + (note || 'That one is ' + Plays.spoken(play)));

    /* Wrong ones come back later in the round — no penalty, just another look. */
    if (!right) queue.push(queue[idx]);

    host.querySelector('.drill__progress').outerHTML = pips();

    var next = document.createElement('button');
    next.className = 'nextbtn';
    next.textContent = idx + 1 >= queue.length ? 'See my stars ⭐' : 'Next call →';
    next.addEventListener('click', function () { idx++; renderQ(); });
    host.querySelector('.drill').appendChild(next);
  }

  /* --- watch it, name it --------------------------------------- */
  function renderSee(q, p, name) {
    host.innerHTML =
      '<div class="drill">' + pips() +
        '<p class="drill__kicker">Watch the play</p>' +
        '<div class="drill__field"><svg viewBox="0 20 100 78" ' +
          'preserveAspectRatio="xMidYMid meet"></svg></div>' +
        '<button class="ghostbtn" id="again" style="width:100%">▶︎ Watch again</button>' +
        '<p class="drill__hint" style="margin-top:14px">What play was that?</p>' +
        '<div id="ch"></div><p class="feedback"></p>' +
      '</div>';
    var svg = host.querySelector('svg');
    /* Spoken too, but carefully: naming the play would give the answer away,
       so only the instruction is read. */
    Speech.say('Watch the play. Then tell me which play it was.');
    var run = function () { Field.render(svg, p, { focus: App.pos, animate: true }); };
    host.querySelector('#again').addEventListener('click', run);
    host.querySelector('#ch').appendChild(choiceBtns(q, name, function (r) {
      afterAnswer(r, p);
    }));
    run();
  }

  /* --- hear it, do it: what is your JOB? ------------------------------- */
  /* Asks for the ACTION, not the direction. "Which way do you go?" was a
     coin-flip a kid could pass without knowing the play; what you actually DO
     on it -- run it, catch it, fake it -- is the thing worth knowing. */
  function renderDo(q, p, name) {
    if (!App.pos) { mode = null; return renderModes(); }
    var me = Positions.shortName(App.pos);
    var answer = Plays.action(p, App.pos);

    /* Correct answer plus two plausible others. */
    var ids = Object.keys(Plays.ACTIONS).filter(function (k) { return k !== answer.id; });
    var opts = shuffle([answer.id].concat(shuffle(ids).slice(0, 2)));

    host.innerHTML =
      '<div class="drill">' + pips() +
        '<p class="drill__kicker">You are the ' + me + '</p>' +
        '<h2 class="drill__q">' + name + '</h2>' +
        '<button class="bigsound" id="replay"><span>🔊</span>Say it again</button>' +
        '<p class="drill__hint">What is your job on this play?</p>' +
        '<div class="choices" id="ch"></div>' +
        '<p class="feedback"></p>' +
      '</div>';

    var ch = host.querySelector('#ch');
    opts.forEach(function (id) {
      var b = document.createElement('button');
      b.className = 'choice';
      b.textContent = Plays.ACTIONS[id].label;
      b.addEventListener('click', function () {
        if (locked) return;
        locked = true;
        var right = id === answer.id;
        b.classList.add(right ? 'is-right' : 'is-wrong');
        if (!right) {
          ch.querySelectorAll('.choice').forEach(function (x) {
            if (x.textContent === answer.label) x.classList.add('is-right');
          });
        }

        /* Always show it, so a wrong answer still teaches the play. */
        var box = document.createElement('div');
        box.className = 'drill__field';
        box.innerHTML = '<svg viewBox="0 20 100 78" preserveAspectRatio="xMidYMid meet"></svg>';
        ch.parentNode.insertBefore(box, ch.nextSibling);
        Field.render(box.querySelector('svg'), p, { focus: App.pos, animate: true });

        var a = Plays.assignment(p, App.pos);
        afterAnswer(right, p, a.say);
      });
      ch.appendChild(b);
    });

    host.querySelector('#replay').addEventListener('click', function () { Speech.callPlay(Plays.spoken(p)); });
    Speech.callPlay(Plays.spoken(p));
  }

  /* ------------------------------------------------------------- scoring */
  function renderScore() {
    var got = results.filter(Boolean).length, total = results.length;
    var perfect = got === total && total > 0;
    host.innerHTML =
      '<div class="drill scorecard">' +
        '<div class="scorecard__stars">' + (perfect ? '⭐⭐⭐' : got >= total / 2 ? '⭐⭐' : '⭐') + '</div>' +
        '<p class="scorecard__msg">' + (perfect ? 'Perfect round!' : 'You got ' + got + ' of ' + total) + '</p>' +
        '<p class="drill__hint">' + (perfect ? 'You know those names cold.' : 'Run it again — you are getting there.') + '</p>' +
        '<button class="nextbtn" id="again">Go again</button>' +
        '<button class="ghostbtn" id="switch" style="width:100%;margin-top:10px">Try a different drill</button>' +
      '</div>';
    host.querySelector('#again').addEventListener('click', function () { build(); renderQ(); });
    host.querySelector('#switch').addEventListener('click', function () { mode = null; renderModes(); });
    Speech.say(perfect ? 'Perfect round! Great job!' : 'You got ' + got + ' out of ' + total);
    if (perfect) App.confetti();
  }

  return { start: start, onPosChange: onPosChange, shuffle: shuffle };
})();
