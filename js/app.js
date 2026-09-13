/* app.js — screens, state, and the play view. */

var App = (function () {

  var KEY = 'niners-playbook-v1';
  var $ = function (id) { return document.getElementById(id); };

  var state = { pos: null, stars: {}, muted: false, screen: 'home' };
  var view  = { play: null, flipped: false, anim: null };

  /* ------------------------------------------------------------- storage */
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var s = JSON.parse(raw);
        state.pos = s.pos || null; state.stars = s.stars || {}; state.muted = !!s.muted;
      }
    } catch (e) { /* private mode, first run, cleared data — all fine */ }
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        pos: state.pos, stars: state.stars, muted: state.muted
      }));
    } catch (e) {}
  }
  function starCount() { return Object.keys(state.stars).length; }
  function award(playId) {
    if (state.stars[playId]) return false;
    state.stars[playId] = true; save(); return true;
  }

  /* -------------------------------------------------------------- routing */
  var SCREENS = ['home', 'plays', 'play', 'drills', 'quiz', 'positions'];
  var TITLES  = { home:'49ers Playbook', plays:'The Plays', play:'',
                  drills:'Coach Calls It', quiz:'Play the Game', positions:'The Positions' };

  function go(name, arg) {
    if (view.anim) { view.anim.stop(); view.anim = null; }
    if (!$('cue').hidden) $('cue').hidden = true;
    Speech.stop();
    state.screen = name;

    SCREENS.forEach(function (s) {
      var elm = $('screen-' + s);
      if (elm) elm.hidden = (s !== name);
    });
    $('appTitle').textContent = TITLES[name] || '';
    /* Back and Home are redundant everywhere except the play view, and the
       title needs the room on a phone. */
    $('backBtn').hidden = (name === 'home');
    $('homeBtn').hidden = (name !== 'home' && name !== 'play');
    window.scrollTo(0, 0);

    if (name === 'home')      renderHome();
    if (name === 'plays')     renderPlayList();
    if (name === 'play')      openPlay(arg);
    if (name === 'positions') renderPositions();
    if (name === 'drills')    Drills.start($('drillHost'));
    if (name === 'quiz')      Quiz.start($('quizHost'));
  }

  function back() {
    if (state.screen === 'play') go('plays');
    else go('home');
  }

  /* ----------------------------------------------------------------- sound */
  /* Everything here talks, which is the point for a pre-reader but not always
     wanted -- in the car, at practice, or with a sleeping sibling nearby. */
  function syncMute() {
    var b = $('muteBtn');
    b.hidden = !Speech.ok;
    b.textContent = state.muted ? '🔇' : '🔊';
    b.setAttribute('aria-label', state.muted ? 'Turn sound on' : 'Turn sound off');
    b.classList.toggle('is-off', state.muted);
    Speech.setMuted(state.muted);
  }

  function toggleMute() {
    state.muted = !state.muted;
    save(); syncMute();
    /* Repaint so the little speaker buttons appear or disappear with it. */
    if (state.screen === 'play')      paintPlay();
    if (state.screen === 'positions') renderPositions();
    if (!$('cue').hidden) $('cueSpeak').hidden = !Speech.enabled();
    if (!state.muted) Speech.say('Sound is on!');
  }

  /* -------------------------------------------------------- position bar */
  /* The bar lives under the header on every screen. Five numbered buttons
     matching the numbers on the field, so the mapping is learned by sight. */
  function renderPosBar() {
    $('posBarRow').innerHTML = Positions.list.map(function (p) {
      return '<button class="posbtn' + (p.key === state.pos ? ' is-on' : '') + '"' +
             ' data-pos="' + p.key + '" style="--c:' + p.color + '">' +
               '<span class="posbtn__num">' + p.num + '</span>' +
               /* Real position names. The full one where there is room, a
                  slightly shorter real name on a phone -- never the nickname,
                  which belongs on the Positions screen. */
               '<span class="posbtn__lbl">' +
                 '<span class="lbl-wide">' + p.name + (p.side ? ' ' + p.side : '') + '</span>' +
                 '<span class="lbl-narrow">' + Positions.shortName(p.key) + '</span>' +
               '</span>' +
             '</button>';
    }).join('');
    syncPosBar();
  }

  function syncPosBar() {
    var p = state.pos && Positions.get(state.pos);
    $('posBarLabel').textContent = p ? "I'm the " + Positions.fullName(p.key)
                                     : 'Who are you today?';
    $('posBar').classList.toggle('is-empty', !p);
    var btns = $('posBarRow').children;
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('is-on', btns[i].getAttribute('data-pos') === state.pos);
    }
  }

  function setPos(key) {
    var changed = state.pos !== key;
    state.pos = key; save(); syncPosBar();
    /* Re-explain whatever is on screen from the new set of eyes. */
    if (state.screen === 'home')      renderHome();
    if (state.screen === 'plays')     renderPlayList();
    if (state.screen === 'play')    { paintPlay(); if (changed) showPosCue(); }
    if (state.screen === 'positions') renderPositions();
    if (state.screen === 'drills')    Drills.onPosChange();
    if (state.screen === 'quiz')      Quiz.onPosChange();
  }

  /* ----------------------------------------------------------------- home */
  function renderHome() {
    var n = starCount(), total = Plays.list.length;
    $('homeStars').textContent = n
      ? '⭐ ' + n + ' of ' + total + ' plays learned'
      : 'Learn a play to earn your first star!';
  }

  /* ------------------------------------------------------------ play list */
  function renderPlayList() {
    var host = $('playList');
    host.innerHTML = '';
    [['run', 'Running Plays'], ['pass', 'Passing Plays']].forEach(function (grp) {
      var h = document.createElement('div');
      h.className = 'pl-group'; h.textContent = grp[1];
      host.appendChild(h);

      Plays.list.filter(function (p) { return p.type === grp[0]; }).forEach(function (p) {
        var b = document.createElement('button');
        b.className = 'pl-card';
        b.innerHTML =
          '<span class="pl-card__mini"><svg viewBox="0 20 100 78" ' +
            'preserveAspectRatio="xMidYMid meet"></svg></span>' +
          '<span class="pl-card__body">' +
            '<b class="pl-card__name">' + Plays.name(p) + '</b>' +
            '<i class="pl-card__sub">' + p.coach + '</i>' +
          '</span>' +
          '<span class="pl-card__star' + (state.stars[p.id] ? ' is-on' : '') + '">⭐</span>';
        b.addEventListener('click', function () { go('play', p.id); });
        host.appendChild(b);
        Field.render(b.querySelector('svg'), p, { focus: state.pos, animate: false });
      });
    });
  }

  /* ------------------------------------------------------------ play view */
  function current() {
    return view.flipped ? Plays.flip(view.play) : view.play;
  }

  function openPlay(id) {
    view.play = Plays.byId(id) || Plays.list[0];
    view.flipped = false;
    paintPlay();
    showPlayBrief();
  }

  function emphasise(txt) {
    return txt
      .replace(/\bFAKE\b/g, '<span class="fakeword">FAKE</span>')
      .replace(/\b(LEFT|RIGHT)\b/g, function (m) {
        return '<b>' + m + (m === 'LEFT' ? ' ←' : ' →') + '</b>';
      });
  }

  function paintPlay(animate) {
    var p = current();
    $('playName').textContent = Plays.name(p);

    if (view.anim) { view.anim.stop(); }
    view.anim = Field.render($('fieldSvg'), p, {
      focus: state.pos, animate: !!animate
    });

    var card = $('jobCard'), txt = $('jobText');
    if (!state.pos) {
      card.style.setProperty('--pc', 'var(--gold)');
      txt.className = 'job__text job--none';
      txt.textContent = 'Tap the button up top to pick your spot, and I will show you exactly what YOU do.';
      $('jobSpeak').hidden = true;
      return;
    }

    var a = Plays.assignment(p, state.pos);
    card.style.setProperty('--pc', Positions.color(state.pos));
    txt.className = 'job__text';
    txt.innerHTML = emphasise(a.say) +
      (p.heads_up ? '<br><b style="color:var(--gold-lt)">⚠️ ' +
        Plays.text(p.heads_up, p) + '</b>' : '');
    $('jobSpeak').hidden = !Speech.enabled();
    $('jobSpeak').onclick = function () { Speech.say(a.say); };
  }

  function hike() {
    var p = current();
    Speech.callPlay(Plays.spoken(p));
    paintPlay(true);
    if (state.pos) award(p.id);
  }

  /* ------------------------------------------------------------- the cue */
  /* One overlay, read top to bottom: what the play is for, the play in simple
     steps, then YOUR job. It comes up when you open a play and again whenever
     you swap position mid-play, because your job just silently changed.
     Auto-spoken, since most six-year-olds cannot read it. */
  function openCue(opts) {
    var colour = opts.colour || '#B3995D';
    $('cue').style.setProperty('--cc', colour);
    $('cueWho').textContent  = opts.kicker;
    $('cueText').innerHTML   = emphasise(opts.text || '');
    $('cueText').hidden      = !opts.text;

    var steps = opts.steps || [];
    $('cueSteps').innerHTML = steps.map(function (t) {
      return '<li>' + emphasise(t) + '</li>';
    }).join('');
    $('cueSteps').hidden = !steps.length;

    $('cueJob').hidden = !opts.job;
    if (opts.job) {
      $('cueJobLbl').textContent = opts.jobLabel;
      $('cueJobTxt').innerHTML   = emphasise(opts.job) +
        (opts.warn ? '<span class="cue__warn">⚠️ ' + emphasise(opts.warn) + '</span>' : '');
    }

    $('cueGo').textContent = opts.goLabel || 'Got it — show me ▶';
    $('cueSpeak').hidden = !Speech.enabled();
    $('cue').hidden = false;
    $('cue').querySelector('.cue__panel').scrollTop = 0;

    var script = opts.say;
    Speech.say(script);
    $('cueSpeak').onclick = function () { Speech.say(script); };
  }

  /* Opening a play: what the play IS, and nothing else. Your own job is on the
     play screen right behind this, and in the cue when you swap position --
     stacking it here just made a wall of text. */
  function showPlayBrief() {
    var p = current();
    var about = Plays.text(p.about || '', p);
    var steps = (p.steps || []).map(function (t) { return Plays.text(t, p); });

    openCue({
      kicker: Plays.name(p), text: about, steps: steps,
      say: [Plays.spoken(p) + '.', about].concat(steps).join(' '),
      goLabel: 'Watch it ▶'
    });
  }

  /* Swapping position mid-play: just the new job, kept short. */
  function showPosCue() {
    var p = current(), a = Plays.assignment(p, state.pos);
    if (!a) return;
    var warn = p.heads_up ? Plays.text(p.heads_up, p) : null;
    openCue({
      kicker: Plays.name(p),
      job: a.say, warn: warn,
      jobLabel: 'Your job — ' + Positions.shortName(state.pos),
      colour: Positions.color(state.pos),
      say: 'You are the ' + Positions.shortName(state.pos) + '. ' + a.say +
           (warn ? ' ' + warn : ''),
      goLabel: 'Got it — show me ▶'
    });
  }

  function hideCue(thenPlay) {
    $('cue').hidden = true;
    Speech.stop();
    if (thenPlay) hike();
  }

  /* ------------------------------------------------------------ positions */
  function renderPositions() {
    $('posList').innerHTML = Positions.list.map(function (p) {
      return '<div class="poscard--big" style="--c:' + p.color + '">' +
        '<h3>' + p.name + (p.side ? ' ' + p.side : '') + '</h3>' +
        '<div class="nick">' + p.nick + ' · Number ' + p.num + '</div>' +
        '<p>' + p.job + '</p>' +
        '<div class="row">' +
          (Speech.enabled() ? '<button class="ghostbtn" data-say="' + p.key + '">🔊 Read it</button>' : '') +
          '<button class="ghostbtn" data-be="' + p.key + '">I am this one</button>' +
        '</div></div>';
    }).join('');
  }

  /* ------------------------------------------------------------- confetti */
  function confetti() {
    var host = $('confetti');
    var cols = ['#AA0000', '#B3995D', '#E3C878', '#22C55E', '#2E9BF0', '#F5A524'];
    for (var i = 0; i < 44; i++) {
      var s = document.createElement('i');
      s.style.left = Math.random() * 100 + 'vw';
      s.style.background = cols[i % cols.length];
      s.style.animation = 'drop ' + (1.5 + Math.random() * 1.3).toFixed(2) + 's linear ' +
                          (Math.random() * 0.5).toFixed(2) + 's forwards';
      host.appendChild(s);
    }
    setTimeout(function () { host.innerHTML = ''; }, 3600);
  }

  /* ----------------------------------------------------------------- wire */
  function init() {
    load(); syncMute(); renderPosBar();

    $('homeBtn').addEventListener('click', function () { go('home'); });
    $('muteBtn').addEventListener('click', toggleMute);
    $('backBtn').addEventListener('click', back);
    $('randomPos').addEventListener('click', function () {
      var pool = Positions.keys.filter(function (k) { return k !== state.pos; });
      var k = pool[Math.floor(Math.random() * pool.length)];
      setPos(k);
      Speech.say('You are the ' + Positions.shortName(k) + '!');
    });

    document.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-pos],[data-go],[data-say],[data-be]') : null;
      if (!t) return;
      if (t.hasAttribute('data-pos'))   { setPos(t.getAttribute('data-pos')); return; }
      if (t.hasAttribute('data-go'))    return go(t.getAttribute('data-go'));
      if (t.hasAttribute('data-say'))   return Speech.say(Positions.get(t.getAttribute('data-say')).job);
      if (t.hasAttribute('data-be'))    { setPos(t.getAttribute('data-be')); return; }
    });

    $('hikeBtn').addEventListener('click', hike);
    $('cueGo').addEventListener('click', function () { hideCue(true); });
    document.querySelector('[data-cue-close]')
            .addEventListener('click', function () { hideCue(false); });
    $('flipBtn').addEventListener('click', function () {
      view.flipped = !view.flipped;
      paintPlay();
      Speech.callPlay(Plays.spoken(current()));
    });
    $('playNameSpeak').addEventListener('click', function () {
      Speech.callPlay(Plays.spoken(current()));
    });

    go('home');
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    go: go, setPos: setPos, confetti: confetti, award: award,
    get pos() { return state.pos; },
    get stars() { return state.stars; },
    starCount: starCount
  };
})();
