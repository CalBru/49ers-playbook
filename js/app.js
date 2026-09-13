/* app.js — screens, state, and the play view. */

var App = (function () {

  var KEY = 'niners-playbook-v1';
  var $ = function (id) { return document.getElementById(id); };

  var state = { pos: null, stars: {}, screen: 'home' };
  var view  = { play: null, flipped: false, slow: false, anim: null };

  /* ------------------------------------------------------------- storage */
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var s = JSON.parse(raw); state.pos = s.pos || null; state.stars = s.stars || {}; }
    } catch (e) { /* private mode, first run, cleared data — all fine */ }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ pos: state.pos, stars: state.stars })); }
    catch (e) {}
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

  /* ------------------------------------------------------- position chip */
  function posCardHTML(p, on) {
    return '<button class="poscard' + (on ? ' is-on' : '') + '" data-pos="' + p.key + '"' +
           ' style="--c:' + p.color + '">' +
           '<span class="poscard__num">' + p.num + '</span>' +
           '<span class="poscard__txt">' +
             '<b class="poscard__name">' + p.name + '</b>' +
             '<i class="poscard__nick">' + (p.side ? p.side + ' · ' : '') + p.nick + '</i>' +
           '</span></button>';
  }

  function renderPosCards(host) {
    host.innerHTML = Positions.list.map(function (p) {
      return posCardHTML(p, p.key === state.pos);
    }).join('');
  }

  function syncChip() {
    var p = state.pos && Positions.get(state.pos);
    $('posChipLabel').textContent = p ? Positions.shortName(p.key) : 'Pick a spot';
    $('posChipDot').style.background = p ? p.color : '#888';
  }

  function setPos(key) {
    state.pos = key; save(); syncChip();
    /* Re-explain whatever is on screen from the new set of eyes. */
    if (state.screen === 'home')      renderHome();
    if (state.screen === 'plays')     renderPlayList();
    if (state.screen === 'play')      paintPlay();
    if (state.screen === 'positions') renderPositions();
    if (state.screen === 'drills')    Drills.onPosChange();
    if (state.screen === 'quiz')      Quiz.onPosChange();
  }

  function openSheet() {
    renderPosCards($('sheetPosCards'));
    $('posSheet').hidden = false;
  }
  function closeSheet() { $('posSheet').hidden = true; }

  /* ----------------------------------------------------------------- home */
  function renderHome() {
    renderPosCards($('homePosCards'));
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

    var focus = $('justMe').checked ? state.pos : null;
    if (view.anim) { view.anim.stop(); }
    view.anim = Field.render($('fieldSvg'), p, {
      focus: focus, animate: !!animate, speed: view.slow ? 0.45 : 1
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
    $('jobSpeak').hidden = !Speech.ok;
    $('jobSpeak').onclick = function () { Speech.say(a.say); };
  }

  function hike() {
    var p = current();
    Speech.callPlay(Plays.spoken(p));
    paintPlay(true);
    if (state.pos) award(p.id);
  }

  /* ------------------------------------------------------------ positions */
  function renderPositions() {
    $('posList').innerHTML = Positions.list.map(function (p) {
      return '<div class="poscard--big" style="--c:' + p.color + '">' +
        '<h3>' + p.name + (p.side ? ' ' + p.side : '') + '</h3>' +
        '<div class="nick">' + p.nick + ' · Number ' + p.num + '</div>' +
        '<p>' + p.job + '</p>' +
        '<div class="row">' +
          (Speech.ok ? '<button class="ghostbtn" data-say="' + p.key + '">🔊 Read it</button>' : '') +
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
    load(); syncChip();

    $('homeBtn').addEventListener('click', function () { go('home'); });
    $('backBtn').addEventListener('click', back);
    $('posChip').addEventListener('click', openSheet);
    $('randomPos').addEventListener('click', function () {
      var k = Positions.keys[Math.floor(Math.random() * Positions.keys.length)];
      setPos(k); closeSheet();
      Speech.say('You are the ' + Positions.shortName(k) + '!');
    });

    document.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-close],[data-pos],[data-go],[data-say],[data-be]') : null;
      if (!t) return;
      if (t.hasAttribute('data-close')) return closeSheet();
      if (t.hasAttribute('data-pos'))   { setPos(t.getAttribute('data-pos')); closeSheet(); return; }
      if (t.hasAttribute('data-go'))    return go(t.getAttribute('data-go'));
      if (t.hasAttribute('data-say'))   return Speech.say(Positions.get(t.getAttribute('data-say')).job);
      if (t.hasAttribute('data-be'))    { setPos(t.getAttribute('data-be')); return; }
    });

    $('hikeBtn').addEventListener('click', hike);
    $('flipBtn').addEventListener('click', function () {
      view.flipped = !view.flipped;
      paintPlay();
      Speech.callPlay(Plays.spoken(current()));
    });
    $('slowBtn').addEventListener('click', function () {
      view.slow = !view.slow;
      $('slowBtn').classList.toggle('is-on', view.slow);
      paintPlay(true);
    });
    $('justMe').addEventListener('change', function () { paintPlay(); });
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
