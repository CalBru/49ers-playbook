/* positions.js — the five spots on the field.
   Positions are tied to a SIDE of the field, not to a route. When a play is
   flipped, the left and right receivers trade assignments (see Plays.mirror),
   because a kid who lines up on the right stays on the right. */

var Positions = (function () {

  var LIST = [
    { key: 'C',  num: 1, name: 'Center',         nick: 'The Snapper',
      color: '#F5A524',
      job: 'You start the play! Snap the ball back through your legs, then run and get open.',
      spot: [50, 70] },

    { key: 'WL', num: 2, name: 'Wide Receiver',  nick: 'The Catcher', side: 'Left',
      color: '#2E9BF0',
      job: 'You line up way out on the LEFT. Run your route fast and catch the ball!',
      spot: [20, 70] },

    { key: 'WR', num: 3, name: 'Wide Receiver',  nick: 'The Catcher', side: 'Right',
      color: '#8B5CF6',
      job: 'You line up way out on the RIGHT. Run your route fast and catch the ball!',
      spot: [80, 70] },

    { key: 'QB', num: 4, name: 'Quarterback',    nick: 'The Thrower',
      color: '#22C55E',
      job: 'You catch the snap. Then you hand it off, fake it, or throw it.',
      spot: [50, 77] },

    { key: 'RB', num: 5, name: 'Running Back',   nick: 'The Runner',
      color: '#EC4899',
      job: 'You start in the back. Take the ball and run — or FAKE like you have it!',
      spot: [50, 85] }
  ];

  var BY_KEY = {};
  LIST.forEach(function (p) { BY_KEY[p.key] = p; });

  /* "Wide Receiver Left (The Catcher)" / "Center (The Snapper)" */
  function fullName(key) {
    var p = BY_KEY[key];
    if (!p) return '';
    return p.name + (p.side ? ' ' + p.side : '') + ' (' + p.nick + ')';
  }

  /* Short form for chips and tight spaces: "Receiver Left", "Running Back" */
  function shortName(key) {
    var p = BY_KEY[key];
    if (!p) return '';
    if (p.key === 'WL') return 'Receiver Left';
    if (p.key === 'WR') return 'Receiver Right';
    return p.name;
  }

  return {
    list: LIST,
    get: function (key) { return BY_KEY[key]; },
    keys: LIST.map(function (p) { return p.key; }),
    fullName: fullName,
    shortName: shortName,
    color: function (key) { return (BY_KEY[key] || {}).color || '#888'; }
  };
})();
