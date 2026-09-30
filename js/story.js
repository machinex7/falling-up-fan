// ═══════════════════════════════════════════════════════
// STORY — drives data/story.json (compiled from ink/*.ink by
// scripts/compile-ink.js — see AGENTS.md's "The cutscene system") through
// the inkjs runtime (window.inkjs, loaded via the CDN <script> tag in
// index.html before this file). Replaces the earlier hand-rolled
// cutscenes.js + comms.js pair: those walked a flat JSON node graph and a
// separate scene-index array; an ink Story already tracks its own
// execution position and branch state internally, so there's no separate
// graph-walker to maintain here — this file is just "call Continue()/
// ChooseChoiceIndex() and render whatever comes back."
//
// This owns BOTH halves that used to be split across two files: playing a
// scene's `image` over the starfield (#scene-object) AND the comms panel
// (#comms-tile/#comms-panel) — they're driven by the same Story object and
// the same per-line tags, so keeping them in one file avoids threading
// that shared state through a cross-file event pair for what's now
// genuinely one flow. 'timer:complete' (in) and 'timer:start' (out) are
// still real DOM events, since js/timer.js is a separate file this one
// doesn't otherwise talk to.
// ═══════════════════════════════════════════════════════
(function () {
  if (!window.inkjs) return; // CDN script blocked/failed — nothing to drive

  const sceneObject = document.getElementById('scene-object');
  const sceneObjectImg = document.getElementById('scene-object-img');
  const tile = document.getElementById('comms-tile');
  const panel = document.getElementById('comms-panel');
  const closeBtn = document.getElementById('comms-close');
  const titleEl = document.getElementById('comms-title');
  const logEl = document.getElementById('comms-log');
  const repliesEl = document.getElementById('comms-replies');
  if (!sceneObject || !sceneObjectImg || !tile || !panel || !closeBtn ||
      !titleEl || !logEl || !repliesEl) return;

  const STORY_URL = 'data/story.json';
  // fetched eagerly (unlike monitor.js's lazy on-click fetch) since
  // 'timer:complete' can fire many minutes after page load — better to
  // already have the data in hand than to start a fetch at the exact
  // moment the scene is meant to play. Promises memoize their resolved
  // value, so every `storyPromise.then(story => ...)` below reuses the
  // same one inkjs.Story instance — its own internal execution/branch
  // state is what replaces the old sceneIndex/nodesById bookkeeping.
  const storyPromise = fetch(STORY_URL)
    .then(res => {
      if (!res.ok) throw new Error(`${STORY_URL}: HTTP ${res.status}`);
      return res.json();
    })
    .then(json => {
      const story = new window.inkjs.Story(json);
      watchShipState(story);
      return story;
    });

  // Which scene plays next is decided in ink, not here: each
  // 'timer:complete' plays this one fixed knot, which diverts to whatever
  // the last scene queued with queue() (see "STORY THREADS" in
  // ink/ship.ink). New threads never need a change in this file.
  const NEXT_SCENE_KNOT = 'play_next';

  // The speaker label for every line in the current scene (there's only
  // ever one contact right now — see ink/ship.ink's header comment on
  // why this isn't a per-line override), set by `# contact:` tags
  // encountered while gathering a beat (see applyTags).
  let currentContact = 'Unknown';
  let hasActiveConversation = false;

  // Ship state that lives in ink variables (see ink/ship.ink's "SHIP
  // STATE" header). Ink is the one source of truth — there are no tags
  // for these; the observers below are the only place any of them
  // reaches the page, whether the story wrote them with a plain `~` or
  // one of ship.ink's clamping helpers (damage/repair/adjust/set_level).
  //
  // Percentage stats (0–100 ink VARs). This file only announces them as
  // a 'ship:stat' DOM event (detail: { name, value }); js/instruments.js
  // owns every readout/gauge/warning light that shows one. A new stat is
  // a VAR in ink/ship.ink plus its name here.
  const PERCENT_STATS = ['hull', 'power', 'reactor', 'shield', 'cargo', 'drive', 'scan', 'signal'];
  // true/false ink VARs, announced the same way (instruments.js shows
  // them on a data-stat toggle button).
  const TOGGLE_STATS = ['signal_boost', 'cabin_light', 'autopilot'];
  // Stats computed from others rather than stored — each is an ink
  // function of the same name in ink/ship.ink ("COMPUTED STATS"), called
  // directly so the formula lives only there. Re-announced after any
  // ship-state change.
  const DERIVED_STATS = ['integrity', 'reactor_load', 'reactor_use', 'signal_strength', 'projected_power', 'cabin_lit'];
  // Stats the pilot can set from the console ('control:set' events from
  // js/throttle.js levers, js/knobs.js knobs and js/controls.js toggle
  // buttons). Each goes
  // through ship.ink's set_<name>() function, so the player obeys the
  // same rules the story does.
  const PLAYER_CONTROLS = ['shield', 'reactor', 'drive', 'scan', 'signal_boost', 'cabin_light', 'autopilot'];
  const MOVEMENT_MODES = ['stopped', 'thruster', 'sideSpace'];

  function announceStat(name, value) {
    document.dispatchEvent(new CustomEvent('ship:stat', { detail: { name, value } }));
  }

  // Observers fire in the middle of ink's own evaluation, where it can't
  // run another function — so batch every change in one evaluation into
  // a single recompute once it's finished (ink evaluation is always
  // synchronous, so a microtask is guaranteed to land after it).
  let derivedQueued = false;
  function announceDerived(story) {
    if (derivedQueued) return;
    derivedQueued = true;
    queueMicrotask(() => {
      derivedQueued = false;
      DERIVED_STATS.forEach(name => announceStat(name, story.EvaluateFunction(name)));
      announceFlight(story);
    });
  }

  // Flight modes (see ship.ink's "FLIGHT MODES" header): `movement` is
  // the mode the story ORDERS, `engaged_movement` the one the ship is
  // actually in. Both are ink LISTs, so values arrive as InkLists —
  // String() gives the item name ("thruster"). Announced together, with
  // whether the big button may be pressed, as 'ship:flight' (detail:
  // { ordered, engaged, ready }) for js/power.js. The ENGAGED mode is
  // also exposed as body[data-movement] for CSS and as a 'ship:movement'
  // DOM event (detail.mode) whenever it changes — the hook for whatever
  // each mode should look like.
  let lastEngaged = null;
  function announceFlight(story) {
    const ordered = String(story.variablesState.$('movement'));
    const engaged = String(story.variablesState.$('engaged_movement'));
    const bad = [ordered, engaged].find(m => !MOVEMENT_MODES.includes(m));
    if (bad !== undefined) {
      console.warn(`story: unknown movement mode "${bad}" — expected one of ${MOVEMENT_MODES.join(', ')}`);
      return;
    }
    // the pilot just engaged the ordered mode: show the image held for it
    if (heldImage !== null && ordered === engaged) {
      showSceneObject(heldImage);
      heldImage = null;
    }
    const ready = Boolean(story.EvaluateFunction('launch_ready'));
    document.dispatchEvent(new CustomEvent('ship:flight', { detail: { ordered, engaged, ready } }));
    if (engaged === lastEngaged) return;
    lastEngaged = engaged;
    document.body.dataset.movement = engaged;
    document.dispatchEvent(new CustomEvent('ship:movement', { detail: { mode: engaged } }));
  }

  function watchShipState(story) {
    [...PERCENT_STATS, ...TOGGLE_STATS].forEach(name => {
      announceStat(name, story.variablesState.$(name));
      story.ObserveVariable(name, (_name, value) => {
        announceStat(name, value);
        announceDerived(story);
      });
    });
    // the flight modes feed launch_ready()/power_cost(), so they just
    // trigger the same recompute (which also announces them)
    ['movement', 'engaged_movement'].forEach(name => {
      story.ObserveVariable(name, () => announceDerived(story));
    });
    announceDerived(story);
  }

  function showSceneObject(imageSrc) {
    sceneObjectImg.src = imageSrc;
    sceneObject.classList.add('is-visible');
  }

  function clearSceneObject() {
    sceneObject.classList.remove('is-visible');
  }

  function appendLine(from, text, isYou) {
    const li = document.createElement('li');
    li.className = 'comms-msg' + (isYou ? ' from-you' : '');
    li.innerHTML = `<span class="comms-from">${from}</span>${text}`;
    logEl.appendChild(li);
    logEl.scrollTop = logEl.scrollHeight;
  }

  // `# image:` tags aren't applied the moment they're read: the last one
  // in a beat is queued (queuedImage — a path, or null for clear) and
  // settled once the beat is gathered (resolveImage), so it doesn't
  // matter whether the scene sets `movement` before or after the tag.
  // If that beat left a flight mode change pending, a new image is HELD
  // (heldImage) until the pilot presses the big button and engages it —
  // it's what's outside the window once the ship gets there. A clear is
  // never held: it hides the image now and drops any held one.
  let queuedImage;       // undefined = no image tag this beat
  let heldImage = null;

  function resolveImage(story) {
    if (queuedImage === undefined) return;
    const next = queuedImage;
    queuedImage = undefined;
    heldImage = null;
    if (next === null) clearSceneObject();
    else if (story.EvaluateFunction('launch_pending')) heldImage = next;
    else showSceneObject(next);
  }

  // Applies every tag attached to the line ink just produced (see
  // ink/ship.ink's header comment for the full tag list). `# image:` with no value (or the word `clear`) hides
  // #scene-object instead of pointing it at a new src — the two are the
  // same tag because "which image is showing" is one piece of state,
  // not a separate show/hide concept.
  function applyTags(tags) {
    tags.forEach(tag => {
      const sep = tag.indexOf(':');
      const key = (sep === -1 ? tag : tag.slice(0, sep)).trim();
      const value = sep === -1 ? '' : tag.slice(sep + 1).trim();
      if (key === 'contact') currentContact = value;
      else if (key === 'image') {
        queuedImage = value === '' || value.toLowerCase() === 'clear' ? null : value;
      }
    });
  }

  // Runs the story forward, appending one transcript line per ink
  // Continue() call, until it hits a choice point or runs out of content
  // — this IS the "one beat" of a conversation, whether that beat started
  // a brand-new scene or resumed after the player picked a reply.
  function runContinueLoop(story) {
    while (story.canContinue) {
      const text = story.Continue().trim();
      applyTags(story.currentTags || []);
      if (text) appendLine(currentContact, text, false);
    }
    resolveImage(story);
  }

  function renderEnded() {
    repliesEl.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'comms-ended';
    p.textContent = 'Transmission ended';
    repliesEl.appendChild(p);
  }

  function renderChoices(story) {
    repliesEl.innerHTML = '';
    story.currentChoices.forEach((choice, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'reply-btn';
      btn.textContent = choice.text;
      btn.addEventListener('click', () => pickChoice(story, i, choice.text));
      repliesEl.appendChild(btn);
    });
  }

  // Whatever runContinueLoop() just gathered, decide how the beat ends:
  // more choices to offer, or the conversation is over — the latter
  // starts the mission timer toward the next scene, if the story queued
  // one (queue() in ink/ship.ink). Nothing queued = the timer stays put.
  function finishBeat(story) {
    if (story.currentChoices.length > 0) {
      renderChoices(story);
      return;
    }
    renderEnded();
    if (story.EvaluateFunction('scene_queued')) {
      const seconds = Number(story.variablesState.$('next_countdown')) || 0;
      document.dispatchEvent(new CustomEvent('timer:start', { detail: { seconds } }));
    }
  }

  function pickChoice(story, i, text) {
    appendLine('You', text, true);
    story.ChooseChoiceIndex(i);
    runContinueLoop(story);
    finishBeat(story);
  }

  function playScene(story, knotName) {
    story.ChoosePathString(knotName);
    logEl.innerHTML = '';
    runContinueLoop(story);

    hasActiveConversation = true;
    titleEl.textContent = `Incoming Transmission: ${currentContact}`;
    finishBeat(story);
    tile.classList.add('is-pending');
  }

  function openPanel() {
    if (!hasActiveConversation) return; // nothing queued yet
    tile.classList.remove('is-pending');
    tile.setAttribute('aria-expanded', 'true');
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
  }

  function closePanel() {
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    tile.setAttribute('aria-expanded', 'false');
  }

  document.addEventListener('timer:complete', () => {
    storyPromise
      .then(story => {
        if (!story.EvaluateFunction('scene_queued')) return; // nothing queued
        playScene(story, NEXT_SCENE_KNOT);
      })
      .catch(err => console.error('data/story.json failed to load', err));
  });

  // A lever moved — never fires mid-Continue() (UI events can't
  // interrupt synchronous ink evaluation), so it's safe to run an ink
  // function here; the observers above then update the console.
  document.addEventListener('control:set', e => {
    const { name, value } = e.detail;
    if (!PLAYER_CONTROLS.includes(name)) return;
    storyPromise
      .then(story => story.EvaluateFunction(`set_${name}`, [value]))
      .catch(err => console.error(`story: set_${name} failed`, err));
  });

  // The big button, pressed after the initial launch (js/power.js):
  // engage the ordered flight mode through ship.ink's engage(), which
  // re-checks the criteria and spends the power itself. Same "safe to
  // run an ink function from a UI event" reasoning as 'control:set'.
  document.addEventListener('control:engage', () => {
    storyPromise
      .then(story => story.EvaluateFunction('engage'))
      .catch(err => console.error('story: engage failed', err));
  });

  tile.addEventListener('click', openPanel);
  closeBtn.addEventListener('click', closePanel);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && panel.classList.contains('is-open')) closePanel();
  });
})();
