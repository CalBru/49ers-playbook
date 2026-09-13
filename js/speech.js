/* speech.js — reads things out loud. Most six-year-olds cannot read the
   instructions, so every piece of text in the app can be spoken.
   Degrades silently: if the browser has no speech, buttons just hide. */

var Speech = (function () {

  var synth = window.speechSynthesis || null;
  var ok = !!(synth && typeof SpeechSynthesisUtterance !== 'undefined');
  var voice = null;
  var muted = false;   // owned by the app, persisted there

  function pickVoice() {
    if (!ok) return;
    var vs = synth.getVoices() || [];
    if (!vs.length) return;
    var en = vs.filter(function (v) { return /^en(-|_|$)/i.test(v.lang); });
    var pool = en.length ? en : vs;
    /* Prefer a clear, natural-sounding default over a novelty voice. */
    var liked = ['Samantha', 'Alex', 'Google US English', 'Daniel', 'Karen'];
    for (var i = 0; i < liked.length; i++) {
      var m = pool.filter(function (v) { return v.name.indexOf(liked[i]) === 0; })[0];
      if (m) { voice = m; return; }
    }
    voice = pool[0];
  }

  if (ok) {
    pickVoice();
    if (typeof synth.onvoiceschanged !== 'undefined') synth.onvoiceschanged = pickVoice;
  }

  function say(text, opts) {
    if (!ok || muted || !text) return;
    opts = opts || {};
    try {
      synth.cancel();
      var u = new SpeechSynthesisUtterance(String(text));
      if (voice) u.voice = voice;
      u.rate   = opts.rate  != null ? opts.rate  : 0.95;  // a touch slow for kids
      u.pitch  = opts.pitch != null ? opts.pitch : 1;
      u.volume = 1;
      synth.speak(u);
    } catch (e) { /* never let speech break the app */ }
  }

  /* A play name, called the way a coach calls it. */
  function callPlay(name) {
    say(name + '!', { rate: 0.8, pitch: 0.9 });
  }

  function stop() { if (ok) { try { synth.cancel(); } catch (e) {} } }

  /* Available at all only if the browser can speak AND the user wants it. */
  function enabled() { return ok && !muted; }

  function setMuted(v) {
    muted = !!v;
    if (muted) stop();
  }

  return {
    ok: ok, say: say, callPlay: callPlay, stop: stop,
    enabled: enabled, setMuted: setMuted,
    get muted() { return muted; }
  };
})();
