/* ============================================================================
   plays.js — THE PLAYBOOK. This is the only file you need to edit to fix a
   route, reword an instruction, or add a play.

   HOW THE DIAGRAMS WORK (matching Coach's whiteboard cards):
     red line   -> THE BALL. Whoever's route is red ends up with it.
     dotted     -> a FAKE / misdirection. Not pre-snap motion.
     long dash  -> the PASS, in the air.
     solid blue -> a real route or run, without the ball.

   COORDINATES: x 0..100 left-to-right, y 0..100 where SMALLER y is FURTHER
   DOWNFIELD. The line of scrimmage is y = 70. Flipping a play is just
   x -> 100 - x, so every play works both directions for free.

   DIRECTION WORDS: write {L} and {R} instead of "left" and "right". They
   render as LEFT and RIGHT, and they swap automatically when the play flips.
   Same for {D} in a play name, which is the play's own direction.

   SEGMENT STYLES: 'solid' (real route) | 'fake' (dotted) | 'throw' (long dash)
   Set ballCarrier:true on whoever finishes the play with the ball -> red route.
============================================================================ */

var Plays = (function () {

  var LOS = 70;

  var LIST = [

    /* ---------------------------------------------------------------- RUNS */
    {
      id: 'dive', nameTpl: 'Dive {D}', dir: 'Right', type: 'run', level: 1,
      coach: 'Straight ahead, right up the gut.',
      about: 'The fastest play. No tricks!',
      steps: ['Center snaps it.',
              'Quarterback hands it to the Running Back.',
              'He runs straight up the {R} side!'],
      assignments: {
        C:  { say: 'Snap the ball, run up at an angle to the {L}, then turn around and come back for it.',
              segs: [{ style: 'solid', pts: [[50,70],[38,52],[41,58]] }] },
        WL: { say: 'Run straight down the field as fast as you can!',
              segs: [{ style: 'solid', pts: [[20,70],[20,30]] }] },
        WR: { say: 'Run behind everybody and FAKE like you are getting the ball, then keep going {L} and up the field.',
              segs: [{ style: 'solid', pts: [[80,70],[63,84]] },
                     { style: 'fake',  pts: [[63,84],[43,84]] },
                     { style: 'solid', pts: [[43,84],[31,63]] }] },
        QB: { say: 'Catch the snap, fake it to the Wide Receiver running by, then hand it to the Running Back.',
              segs: [{ style: 'solid', pts: [[50,77],[50,80]] }] },
        RB: { say: 'Take the ball and RUN through the hole on the {R}!',
              ballCarrier: true,
              segs: [{ style: 'solid', pts: [[50,85],[62,52]] }] }
      },
      ball: [ { from:'C', to:'QB', kind:'snap' }, { from:'QB', to:'RB', kind:'handoff' } ]
    },

    {
      id: 'sweep', nameTpl: 'Sweep {D}', dir: 'Left', type: 'run', level: 1,
      coach: 'Wide around the outside.',
      about: 'Run around the outside, not up the middle.',
      steps: ['Center snaps it.',
              'A Wide Receiver runs across.',
              'He takes it and runs wide {L}!'],
      assignments: {
        C:  { say: 'Snap the ball, run straight up, then cut to the {R}.',
              segs: [{ style: 'solid', pts: [[50,70],[50,56],[64,56]] }] },
        WL: { say: 'Run straight down the field!',
              segs: [{ style: 'solid', pts: [[20,70],[20,30]] }] },
        WR: { say: 'Come across, take the ball, and run wide to the {L}!',
              ballCarrier: true,
              segs: [{ style: 'solid', pts: [[80,70],[63,84],[41,84],[27,64]] }] },
        QB: { say: 'Catch the snap, fake it to the Running Back, then hand it to the Wide Receiver coming across.',
              segs: [{ style: 'solid', pts: [[50,77],[50,80]] }] },
        RB: { say: 'FAKE like you have the ball, then run straight down the field.',
              segs: [{ style: 'fake',  pts: [[50,85],[58,74]] },
                     { style: 'solid', pts: [[58,74],[58,32]] }] }
      },
      ball: [ { from:'C', to:'QB', kind:'snap' }, { from:'QB', to:'WR', kind:'handoff' } ]
    },

    {
      /* NOTE: the card says "Reverse Right" but the ball finishes going LEFT --
         the Running Back starts right, the Wide Receiver takes it the other way.
         The steps above spell that out, so no separate warning is needed. */
      id: 'reverse', nameTpl: 'Reverse {D}', dir: 'Right', type: 'run', level: 2,
      coach: 'Starts one way, goes the other.',
      about: 'A trick! The ball goes back the other way.',
      steps: ['Running Back takes it and starts {R}.',
              'A Wide Receiver takes it from him.',
              'He runs back the other way, {L}!'],
      assignments: {
        C:  { say: 'Snap the ball, run straight up, then cut to the {R}.',
              segs: [{ style: 'solid', pts: [[50,70],[50,56],[64,56]] }] },
        WL: { say: 'Run straight down the field!',
              segs: [{ style: 'solid', pts: [[20,70],[20,30]] }] },
        WR: { say: 'Come across, take the ball from the Running Back, and keep running {L}!',
              ballCarrier: true,
              segs: [{ style: 'solid', pts: [[80,70],[64,82],[41,84],[27,64]] }] },
        QB: { say: 'Catch the snap and hand it to the Running Back.',
              segs: [{ style: 'solid', pts: [[50,77],[50,80]] }] },
        RB: { say: 'Take the ball, start running {R}, then hand it off to the Wide Receiver coming across. Keep running!',
              /* The bend at [62,81] is the mesh point -- it puts the Running Back and
                 the Wide Receiver shoulder to shoulder so the exchange reads as a
                 handoff rather than a pitch. */
              segs: [{ style: 'solid', pts: [[50,85],[62,81],[78,48]] }] }
      },
      ball: [ { from:'C', to:'QB', kind:'snap' },
              { from:'QB', to:'RB', kind:'handoff' },
              { from:'RB', to:'WR', kind:'handoff' } ]
    },

    {
      /* The card has a faint "Pass" watermark -- ignore it. This one is a RUN.
         Plays 'reverse' and 'fakereverse' look identical until the mesh point. */
      id: 'fakereverse', nameTpl: 'Fake Reverse {D}', dir: 'Right', type: 'run', level: 2,
      coach: 'Looks just like Reverse — but the Running Back keeps it.',
      about: 'Looks like Reverse — but it is a fake!',
      steps: ['Running Back takes it and starts {R}.',
              'A Wide Receiver FAKES taking it.',
              'Running Back keeps it and runs {R}!'],
      assignments: {
        C:  { say: 'Snap the ball, run straight up, then cut to the {L}.',
              segs: [{ style: 'solid', pts: [[50,70],[50,56],[36,56]] }] },
        WL: { say: 'Run up a few steps, then turn around and come back for the ball.',
              segs: [{ style: 'solid', pts: [[20,70],[20,44],[24,49]] }] },
        WR: { say: 'Come across and FAKE like you are taking the ball, then keep running {L}.',
              segs: [{ style: 'fake',  pts: [[80,70],[64,82]] },
                     { style: 'solid', pts: [[64,82],[41,84],[29,63]] }] },
        QB: { say: 'Catch the snap and hand it to the Running Back.',
              segs: [{ style: 'solid', pts: [[50,77],[50,80]] }] },
        RB: { say: 'Take the ball, FAKE the handoff to the Wide Receiver, then KEEP IT and run {R}!',
              ballCarrier: true,
              segs: [{ style: 'solid', pts: [[50,85],[62,81],[77,45]] }] }
      },
      ball: [ { from:'C', to:'QB', kind:'snap' }, { from:'QB', to:'RB', kind:'handoff' } ]
    },

    /* ------------------------------------------------------------- PASSES */
    {
      id: 'sweeppass', nameTpl: 'Sweep {D} Pass', dir: 'Left', type: 'pass', level: 3,
      coach: 'Looks like Sweep — then the Wide Receiver throws it.',
      about: 'Looks like Sweep — then he throws it!',
      steps: ['A Wide Receiver takes it and runs {L}.',
              'The Center sneaks down the {L} side.',
              'The Receiver stops and throws to him!'],
      assignments: {
        C:  { say: 'Snap the ball, run up at an angle to the {L}, then turn around. The ball is coming to YOU!',
              ballCarrier: true,
              segs: [{ style: 'solid', pts: [[50,70],[33,48],[33,55]] }] },
        WL: { say: 'Run straight down the field to clear everybody out!',
              segs: [{ style: 'solid', pts: [[20,70],[20,26]] }] },
        WR: { say: 'Come across, take the ball, run {L}, then STOP and THROW it to the Center!',
              segs: [{ style: 'solid', pts: [[80,70],[63,84],[41,84],[31,84]] }] },
        QB: { say: 'Catch the snap and hand it to the Wide Receiver coming across.',
              segs: [{ style: 'solid', pts: [[50,77],[50,80]] }] },
        RB: { say: 'Run up the field on the {R} side.',
              segs: [{ style: 'solid', pts: [[50,85],[60,76],[60,34]] }] }
      },
      ball: [ { from:'C', to:'QB', kind:'snap' },
              { from:'QB', to:'WR', kind:'handoff' },
              { from:'WR', to:'C',  kind:'throw' } ]
    },

    {
      /* Card says "RB Pass Right". A pass TO the Running Back -- he does not throw
         it. Spelled out here because the drill reads the name out loud. */
      id: 'rbpass', nameTpl: 'Running Back Pass {D}', dir: 'Right', type: 'pass', level: 3,
      coach: 'Fake it to the Running Back, then throw it to him.',
      about: 'Fake it to him, then throw it to him!',
      steps: ['Quarterback FAKES the handoff to the Running Back.',
              'The Running Back sneaks out to the {R}.',
              'Quarterback throws it to him!'],
      assignments: {
        C:  { say: 'Snap the ball, then run straight down the field.',
              segs: [{ style: 'solid', pts: [[50,70],[50,28]] }] },
        WL: { say: 'Run straight down the field!',
              segs: [{ style: 'solid', pts: [[20,70],[20,28]] }] },
        WR: { say: 'Run across behind everybody to the {L} to trick them.',
              segs: [{ style: 'solid', pts: [[80,70],[63,84]] },
                     { style: 'fake',  pts: [[63,84],[31,84]] }] },
        QB: { say: 'Catch the snap, FAKE the handoff to the Running Back, then throw it {R} to him.',
              segs: [{ style: 'solid', pts: [[50,77],[50,80]] }] },
        RB: { say: 'FAKE like you are taking the handoff, then slip out and cut {R}. Catch the ball!',
              ballCarrier: true,
              segs: [{ style: 'fake',  pts: [[50,85],[57,77]] },
                     { style: 'solid', pts: [[57,77],[57,58],[75,58]] }] }
      },
      ball: [ { from:'C', to:'QB', kind:'snap' }, { from:'QB', to:'RB', kind:'throw' } ]
    },

    {
      id: 'fakedive', nameTpl: 'Fake Dive Receiver Pass {D}', dir: 'Left', type: 'pass', level: 3,
      coach: 'Fake the Dive, throw to the Wide Receiver.',
      about: 'Fake a run, then throw it.',
      steps: ['Quarterback FAKES the dive to the Running Back.',
              'A Wide Receiver cuts to the middle.',
              'Quarterback throws it {L}!'],
      assignments: {
        C:  { say: 'Snap the ball, run straight up, then cut to the {R}.',
              segs: [{ style: 'solid', pts: [[50,70],[50,56],[64,56]] }] },
        WL: { say: 'Run up the field, then cut IN toward the middle. Catch the ball!',
              ballCarrier: true,
              segs: [{ style: 'solid', pts: [[20,70],[20,48],[37,48]] }] },
        WR: { say: 'Run across behind everybody, then go up the field on the {L}.',
              segs: [{ style: 'solid', pts: [[80,70],[63,84],[41,84],[29,65]] }] },
        QB: { say: 'Catch the snap, FAKE the dive to the Running Back, then throw it {L}.',
              segs: [{ style: 'solid', pts: [[50,77],[50,80]] }] },
        RB: { say: 'FAKE like you are taking the ball, then run straight down the field.',
              segs: [{ style: 'fake',  pts: [[50,85],[58,76]] },
                     { style: 'solid', pts: [[58,76],[58,30]] }] }
      },
      ball: [ { from:'C', to:'QB', kind:'snap' }, { from:'QB', to:'WL', kind:'throw' } ]
    },

    {
      /* Card says "Fake Sweep Left C Pass". The "C" is the Center -- he catches it. */
      id: 'fakesweepc', nameTpl: 'Fake Sweep {D} Center Pass', dir: 'Left', type: 'pass', level: 3,
      coach: 'Fake the Sweep, throw to the Center.',
      about: 'Fake the Sweep, throw to the Center!',
      steps: ['Quarterback FAKES the handoff to the Running Back.',
              'The Center cuts to the {R}.',
              'Quarterback throws it to the Center!'],
      assignments: {
        C:  { say: 'Snap the ball, run straight up, then cut to the {R}. The ball is coming to YOU!',
              ballCarrier: true,
              segs: [{ style: 'solid', pts: [[50,70],[50,52],[75,52]] }] },
        WL: { say: 'Run up the field, then cut IN toward the middle.',
              segs: [{ style: 'solid', pts: [[20,70],[20,48],[37,48]] }] },
        WR: { say: 'Run across behind everybody like you are getting the ball on a sweep.',
              segs: [{ style: 'solid', pts: [[80,70],[63,84],[41,84],[29,64]] }] },
        QB: { say: 'Catch the snap, FAKE the handoff to the Running Back, then throw it {R} to the Center.',
              segs: [{ style: 'solid', pts: [[50,77],[50,80]] }] },
        RB: { say: 'FAKE like you are taking the ball, then run straight down the field.',
              segs: [{ style: 'fake',  pts: [[50,85],[58,76]] },
                     { style: 'solid', pts: [[58,76],[58,28]] }] }
      },
      ball: [ { from:'C', to:'QB', kind:'snap' }, { from:'QB', to:'C', kind:'throw' } ]
    }
  ];

  /* ---------------------------------------------------------------- utils */

  var OPP = { Left: 'Right', Right: 'Left' };

  /* Render {L} {R} {D} tokens. When flipped, L and R trade places. */
  function text(str, play) {
    if (!str) return '';
    var l = play.flipped ? 'RIGHT' : 'LEFT';
    var r = play.flipped ? 'LEFT'  : 'RIGHT';
    return str.replace(/\{L\}/g, l)
              .replace(/\{R\}/g, r)
              .replace(/\{D\}/g, dir(play));
  }

  function dir(play) {
    return play.flipped ? OPP[play.dir] : play.dir;
  }

  function name(play) {
    return play.nameTpl.replace(/\{D\}/g, dir(play));
  }

  /* How the play SOUNDS when Coach calls it. Defaults to the written name. Give
     a play a spokenTpl only if what Coach yells differs from what is written --
     e.g. spokenTpl: 'R B Pass {D}' to have it read out as letters. */
  function spoken(play) {
    return (play.spokenTpl || play.nameTpl).replace(/\{D\}/g, dir(play));
  }

  /* A flipped play is the same object with flipped:true. All the geometry and
     wording swaps happen at read time, so there is only ever one source of
     truth per play. */
  function flip(play) {
    var copy = Object.create(play);
    copy.flipped = !play.flipped;
    return copy;
  }

  function mirrorPts(pts) {
    return pts.map(function (p) { return [100 - p[0], p[1]]; });
  }

  var SWAP_SIDE = { WL: 'WR', WR: 'WL', C: 'C', QB: 'QB', RB: 'RB' };

  /* The assignment a given POSITION runs on this play.
     Flipping trades the two receivers, because a kid who lines up on the right
     stays on the right -- the play comes to him instead. */
  function assignment(play, posKey) {
    var srcKey = play.flipped ? SWAP_SIDE[posKey] : posKey;
    var a = play.assignments[srcKey];
    if (!a) return null;
    return {
      pos: posKey,
      say: text(a.say, play),
      ballCarrier: !!a.ballCarrier,
      hasFake: a.segs.some(function (s) { return s.style === 'fake'; }),
      segs: a.segs.map(function (s) {
        return { style: s.style, pts: play.flipped ? mirrorPts(s.pts) : s.pts };
      })
    };
  }

  function ballEvents(play) {
    return play.ball.map(function (e) {
      return {
        from: play.flipped ? SWAP_SIDE[e.from] : e.from,
        to:   play.flipped ? SWAP_SIDE[e.to]   : e.to,
        kind: e.kind
      };
    });
  }

  /* ---------------------------------------------------------------- jobs */
  /* What this position actually DOES on this play, in one word. Derived from
     the diagram and the ball events rather than hand-written per play, so it
     can never drift out of sync with the routes.

       run   - carries the ball on a running play
       catch - the pass is coming to you
       throw - you throw it
       hand  - you give the ball to someone else
       fake  - you have a dotted line: pretend you have it
       route - run your route, no ball this time                            */

  var ACTIONS = {
    run:   { label: 'Get the ball and RUN!',            short: 'Run it' },
    catch: { label: 'Go out for a pass and CATCH it!',  short: 'Catch it' },
    throw: { label: 'THROW the ball!',                  short: 'Throw it' },
    hand:  { label: 'HAND the ball off to someone.',    short: 'Hand it off' },
    fake:  { label: 'FAKE it — pretend you have it!',   short: 'Fake it' },
    route: { label: 'Run your route — no ball for you.', short: 'Just run' }
  };

  function action(play, posKey) {
    var a = assignment(play, posKey);
    if (!a) return null;
    var id;
    if (a.ballCarrier) {
      id = play.type === 'run' ? 'run' : 'catch';
    } else {
      var evs = ballEvents(play);
      var throws = evs.some(function (e) { return e.kind === 'throw'    && e.from === posKey; });
      var hands  = evs.some(function (e) { return e.kind === 'handoff'  && e.from === posKey; });
      id = throws ? 'throw' : hands ? 'hand' : a.hasFake ? 'fake' : 'route';
    }
    return { id: id, label: ACTIONS[id].label, short: ACTIONS[id].short };
  }

  /* Who ends up with the ball, as a position key. */
  function carrier(play) {
    var found = null;
    Positions.keys.forEach(function (k) {
      var a = assignment(play, k);
      if (a && a.ballCarrier) found = k;
    });
    return found;
  }

  /* Every play in both directions: 8 shapes -> 16 calls. */
  function all(includeFlipped) {
    var out = [];
    LIST.forEach(function (p) {
      out.push(p);
      if (includeFlipped) out.push(flip(p));
    });
    return out;
  }

  function byId(id) {
    return LIST.filter(function (p) { return p.id === id; })[0];
  }

  return {
    list: LIST, all: all, byId: byId,
    flip: flip, name: name, spoken: spoken, dir: dir, text: text,
    assignment: assignment, ballEvents: ballEvents, carrier: carrier,
    action: action, ACTIONS: ACTIONS,
    LOS: LOS
  };
})();
