# 49ers Playbook

A practice tool for a 6-year-old flag football team. Pick your spot, and it shows
you **one sentence and one animated arrow** — your job, on that play, in that
direction. Built for learning the plays at home between practices, not for
looking things up on the sideline.

Works on a phone, an iPad, or a computer. No app to install.

## What's in it

- **Learn the Plays** — all 8 plays animated. Tap `HIKE!` and watch it happen.
  `Other way` mirrors the play left/right. Once you've picked a spot, your own
  route is the bright one and everyone else fades back.
- **Coach Calls It** — two drills. *Hear it, do it*: Coach calls a play, you say
  what your job is. *Watch it, name it*: it plays silently, you name it.
- **Play the Game** — who gets the ball, which of three spots you finish in, and
  are you faking or do you really get it. Earns stars.
- **The Positions** — what each of the five spots does.

Picking a position is optional and can be changed from any screen — the button
in the top-right pulses until you choose one. Nothing asks you to commit before
you've seen anything.

The animation runs deliberately slowly. Six-year-olds can't follow five routes at
game speed, and a learning tool has no reason to run at one.

Every instruction and play name has a 🔊 button, because most six-year-olds
can't read them yet.

## The plays

Four runs — Dive, Sweep, Reverse, Fake Reverse.
Four passes — Sweep Pass, Running Back Pass, Fake Dive Receiver Pass,
Fake Sweep Center Pass.

Each one flips, so that's 16 calls from 8 shapes. The boys only have to learn 8.

The last three are written out in full on purpose. The cards use shorthand — `RB
Pass Right`, `Fake Dive WR Pass Left`, `Fake Sweep Left C Pass` — but the drills
read every play name out loud, and a speech synthesiser says "W-R" as two
letters, which means nothing to a six-year-old.

If Coach actually calls a play differently from how it's written, give that play
a `spokenTpl` in `js/plays.js` and the app will *say* that while still *showing*
the written name:

```js
id: 'rbpass', nameTpl: 'Running Back Pass {D}', spokenTpl: 'R B Pass {D}',
```

> **Heads up on Reverse Right:** the name says Right but the ball finishes going
> **left** — the Runner starts right, then hands it back. The app never lets a kid
> guess direction from a play name; every instruction says the direction outright,
> and the Reverse plays carry an extra warning in the drills.

## How the diagrams work

Same language as the laminated cards:

| Mark | Meaning |
|---|---|
| **Red route** | **The ball.** This player finishes the play with it. |
| **Dotted** | A **fake** / misdirection — not pre-snap motion. |
| **Long dash** | The **pass**, in the air. |
| **Solid** | A real route or run, without the ball. Drawn in that player's colour. |

The one thing worth knowing: **Sweep Left** and **Reverse Right** look almost
identical, but on Sweep the Runner's line is *dotted* (he's faking — the ball goes
straight to the Catcher) and on Reverse it's *solid* (he really takes it, then
gives it up). Same picture, different play.

## Fixing or adding a play

Everything lives in [`js/plays.js`](js/plays.js) — that's the only file you need.
Each play lists five assignments, one per position, with a spoken sentence and the
route as a list of points.

- Coordinates are `x` 0–100 left-to-right and `y` 0–100 where **smaller y is
  further downfield**. The line of scrimmage is `y = 70`.
- Write `{L}` and `{R}` instead of "left" and "right" — they flip automatically
  when the play is mirrored. `{D}` in a play name is that play's own direction.
- Set `ballCarrier: true` on whoever ends up with the ball. That's the red route.
- Flipping a play is just `x → 100 - x`, so you never draw a play twice.

What each position *does* on a play — run it, catch it, throw it, hand it off,
fake it, or just run a route — is worked out from the routes and the ball events
rather than written by hand, so it can't drift out of sync with the diagram. That
derived job is what the *Hear it, do it* drill asks for.

## Running it

It's plain HTML, CSS and JavaScript — no build step and nothing to install. Open
`index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## Deploying

`index.html` is at the repo root, so GitHub Pages serves it as-is:
**Settings → Pages → Deploy from branch → `main` / `(root)`**.
