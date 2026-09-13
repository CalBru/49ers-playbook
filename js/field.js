/* field.js — draws the field, the five players, and their routes, and animates
   the whole thing on HIKE.

   Line language matches Coach's cards: the ball carrier's route is SCARLET,
   fakes are DOTTED, the throw is a LONG DASH. Everyone else runs in their own
   position colour so a kid can always find himself. */

var Field = (function () {

  var NS = 'http://www.w3.org/2000/svg';
  var BALL = '#AA0000';
  var ROUTE_ANIM = [0.12, 0.95];   // routes draw between these fractions
  var uid = 0;

  function el(name, attrs) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    return n;
  }

  function d(pts) {
    return pts.map(function (p, i) {
      return (i ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2);
    }).join(' ');
  }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2; }
  function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }

  /* ------------------------------------------------------------ the field */
  function drawField(svg) {
    svg.appendChild(el('rect', { x: 0, y: 18, width: 100, height: 82, class: 'f-turf' }));
    for (var y = 26; y <= 94; y += 8) {
      svg.appendChild(el('line', { x1: 2, y1: y, x2: 98, y2: y, class: 'f-yard' }));
    }
    svg.appendChild(el('line', {
      x1: 2, y1: Plays.LOS, x2: 98, y2: Plays.LOS, class: 'f-los'
    }));
    var arrow = el('text', { x: 50, y: 23, class: 'f-updown' });
    arrow.textContent = '↑ THIS WAY ↑';
    svg.appendChild(arrow);
  }

  /* --------------------------------------------------------------- render */
  /* opts: { focus, animate, speed, onDone } */
  function render(svg, play, opts) {
    opts = opts || {};
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    var defs = el('defs');
    svg.appendChild(defs);
    drawField(svg);

    var gRoutes  = el('g'); svg.appendChild(gRoutes);
    var gPlayers = el('g'); svg.appendChild(gPlayers);
    var gBall    = el('g'); svg.appendChild(gBall);

    var focus = opts.focus || null;
    var carrier = Plays.carrier(play);
    var rows = {};

    Positions.list.forEach(function (pos) {
      var a = Plays.assignment(play, pos.key);
      if (!a) return;

      /* The ball's route stays half-lit even in "just me" mode. For the QB —
         whose own route is a two-step stub — where the ball goes IS his job,
         and for everyone else it is useful context. */
      var isCarrier = (pos.key === carrier);
      var dim   = focus && focus !== pos.key && !isCarrier;
      var half  = focus && focus !== pos.key && isCarrier;
      var color = a.ballCarrier ? BALL : pos.color;
      var id    = 'm' + (++uid);

      /* One combined path drives the player token's motion. */
      var motionPts = [];
      a.segs.forEach(function (s) {
        s.pts.forEach(function (p, i) {
          if (motionPts.length && i === 0) return;   // skip duplicated joins
          motionPts.push(p);
        });
      });
      var motion = el('path', { d: d(motionPts), fill: 'none', stroke: 'none' });
      defs.appendChild(motion);

      /* Reveal mask: a fat white stroke that un-draws itself. Because it is a
         mask (not the path's own dash array) the dotted and dashed styles
         survive the animation intact. */
      var mask = el('mask', { id: id, maskUnits: 'userSpaceOnUse' });
      var reveal = el('path', {
        d: d(motionPts), fill: 'none', stroke: '#fff',
        'stroke-width': 8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
      });
      mask.appendChild(reveal);
      defs.appendChild(mask);

      var g = el('g', {
        mask: opts.animate ? 'url(#' + id + ')' : null,
        class: 'f-route' + (dim ? ' is-dim' : '') + (half ? ' is-half' : '') +
               (focus === pos.key ? ' is-focus' : '')
      });

      a.segs.forEach(function (s) {
        g.appendChild(el('path', {
          d: d(s.pts), fill: 'none', stroke: color,
          class: 'f-seg f-seg--' + s.style
        }));
      });

      /* Arrowhead on the very end of the route. */
      var last = motionPts[motionPts.length - 1];
      var prev = motionPts[motionPts.length - 2] || last;
      var ang  = Math.atan2(last[1] - prev[1], last[0] - prev[0]) * 180 / Math.PI;
      g.appendChild(el('path', {
        d: 'M0 0 L-3.4 1.9 L-2.4 0 L-3.4 -1.9 Z', fill: color, class: 'f-head',
        transform: 'translate(' + last[0] + ',' + last[1] + ') rotate(' + ang + ')'
      }));

      gRoutes.appendChild(g);

      /* Player token. */
      var tg = el('g', {
        class: 'f-player' + (dim ? ' is-dim' : '') + (focus === pos.key ? ' is-focus' : '')
      });
      /* Fat invisible hit area first, so small fingers can tap a token. */
      tg.appendChild(el('circle', { r: 7, fill: 'transparent', class: 'f-hit' }));
      tg.appendChild(el('circle', { r: 3.4, fill: pos.color, class: 'f-tok' }));
      if (pos.key === 'C') {
        tg.appendChild(el('rect', { x: -3.6, y: -3.6, width: 7.2, height: 7.2,
          fill: 'none', stroke: pos.color, 'stroke-width': 0.7, class: 'f-tok-box' }));
      }
      var num = el('text', { class: 'f-num', y: 1.5 });
      num.textContent = pos.num;
      tg.appendChild(num);
      tg.setAttribute('transform', 'translate(' + pos.spot[0] + ',' + pos.spot[1] + ')');
      gPlayers.appendChild(tg);

      rows[pos.key] = {
        pos: pos, assign: a, motion: motion, reveal: reveal,
        token: tg, group: g, len: 0
      };
    });

    /* The ball. */
    var ball = el('g', { class: 'f-ball' });
    ball.appendChild(el('ellipse', { rx: 2.1, ry: 1.45, fill: BALL,
      stroke: '#fff', 'stroke-width': 0.5 }));
    gBall.appendChild(ball);

    var api = {
      rows: rows, ball: ball, carrier: carrier,
      stop: function () { if (this._raf) cancelAnimationFrame(this._raf); this._raf = null; }
    };

    Object.keys(rows).forEach(function (k) {
      var r = rows[k];
      r.len = r.motion.getTotalLength() || 0.001;
      r.reveal.setAttribute('stroke-dasharray', r.len + ' ' + r.len);
      r.reveal.setAttribute('stroke-dashoffset', opts.animate ? r.len : 0);
    });

    positionBall(api, play, opts.animate ? 0 : 1);

    if (opts.animate) animate(api, play, opts);
    return api;
  }

  /* ------------------------------------------------------------- timeline */
  /* A handoff is scheduled for the moment the two players are actually closest
     to each other, so the ball changes hands where they meet. Timing it on a
     fixed clock instead made the ball leap an open gap, which reads as a pass --
     wrong for the reverse, where the exchange is hand-to-hand. */
  function schedule(api, play) {
    var evs = Plays.ballEvents(play), t = 0.02;

    evs.forEach(function (e) {
      if (e.kind === 'snap') {
        e.t0 = t; e.t1 = t + 0.08;
      } else if (e.kind === 'throw') {
        /* Work backwards from the catch. The ball should ARRIVE as the receiver
           reaches the end of his route -- throwing on a fixed clock released it
           while he was still in the backfield, which looked badly early. */
        var LAND = 0.93, FLIGHT = 0.22;
        e.t0 = Math.max(t + 0.04, LAND - FLIGHT);
        e.t1 = LAND;
      } else {
        var lo = Math.max(t + 0.02, 0.13), hi = 0.72, best = lo, bestD = Infinity;
        for (var p = lo; p <= hi; p += 0.01) {
          var a = tokenPos(api, e.from, p), b = tokenPos(api, e.to, p);
          var d2 = (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
          if (d2 < bestD) { bestD = d2; best = p; }
        }
        /* Short and flat: an exchange, not a flight. */
        e.t0 = Math.max(lo, best - 0.018);
        e.t1 = e.t0 + 0.036;
        e.gap = Math.sqrt(bestD);
      }
      t = e.t1 + 0.04;
    });
    return evs;
  }

  function tokenPos(api, key, p) {
    var r = api.rows[key];
    if (!r) return { x: 50, y: 80 };
    var rp = clamp01((p - ROUTE_ANIM[0]) / (ROUTE_ANIM[1] - ROUTE_ANIM[0]));
    var pt = r.motion.getPointAtLength(ease(rp) * r.len);
    return { x: pt.x, y: pt.y };
  }

  function positionBall(api, play, p) {
    var evs = api._evs || (api._evs = schedule(api, play));
    var pos = null;

    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      if (p >= e.t0 && p <= e.t1) {
        var t = ease((p - e.t0) / (e.t1 - e.t0));
        var a = tokenPos(api, e.from, p), b = tokenPos(api, e.to, p);
        /* Only a throw leaves the ground. */
        var lift = e.kind === 'throw' ? Math.sin(t * Math.PI) * 6 : 0;
        pos = { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) - lift };
        break;
      }
      if (p > e.t1) pos = tokenPos(api, e.to, p);
    }
    if (!pos) pos = tokenPos(api, 'C', p);

    /* Tuck the ball just off the carrier's shoulder so it never hides him. */
    api.ball.setAttribute('transform',
      'translate(' + (pos.x + 3.6).toFixed(2) + ',' + (pos.y - 3.2).toFixed(2) + ')');
  }

  function animate(api, play, opts) {
    /* Deliberately slow. Six-year-olds cannot follow five routes at game
       speed, and there is no reason a learning tool should run at one. */
    var dur = 5400 / (opts.speed || 1);
    var t0 = performance.now();

    function frame(now) {
      var p = clamp01((now - t0) / dur);

      Object.keys(api.rows).forEach(function (k) {
        var r = api.rows[k];
        var rp = ease(clamp01((p - ROUTE_ANIM[0]) / (ROUTE_ANIM[1] - ROUTE_ANIM[0])));
        r.reveal.setAttribute('stroke-dashoffset', (r.len * (1 - rp)).toFixed(2));
        var pt = r.motion.getPointAtLength(rp * r.len);
        r.token.setAttribute('transform',
          'translate(' + pt.x.toFixed(2) + ',' + pt.y.toFixed(2) + ')');
      });

      positionBall(api, play, p);

      if (p < 1) { api._raf = requestAnimationFrame(frame); }
      else { api._raf = null; if (opts.onDone) opts.onDone(); }
    }
    api._raf = requestAnimationFrame(frame);
  }

  return { render: render };
})();
