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

  // The ordered list of top-level knots 'timer:complete' plays through —
  // the ink-authored equivalent of the old scenes.json array, just names
  // instead of whole objects; everything about a scene's OWN branching
  // content lives in ink/story.ink itself, not here. Extend this as more
  // scenes get written.
  const SCENE_KNOTS = ['handler_checkin'];
  let sceneIndex = 0;

  // The speaker label for every line in the current scene (there's only
  // ever one contact right now — see ink/story.ink's header comment on
  // why this isn't a per-line override), and the countdown (seconds)
  // queued to start once the player reaches the end of the current
  // conversation — both set by tags encountered while gathering a beat
  // (see applyTags), reset per scene so a later scene can't inherit an
  // earlier one's leftovers.
  let currentContact = 'Unknown';
  let pendingCountdown = null;
  let hasActiveConversation = false;

  // Ship state that lives in ink VARs (see ink/story.ink's header). Ink
  // is the one source of truth: the matching tags just write those same
  // VARs (see applyTags), and the observers below are the only place any
  // of them reaches the page, so `~ hull -= 10` in ink and `# hull: -10`
  // behave identically.
  //
  // Percentage stats: ink VAR name -> the console readout showing it. A
  // new one is a VAR in story.ink plus an entry here — the tag, clamping
  // and rendering all come for free.
  const PERCENT_STATS = {
    hull: 'ro-hull',
    power: 'ro-power',
    reactor: 'ro-reactor',
  };
  const MOVEMENT_MODES = ['stopped', 'thruster', 'sideSpace'];

  function clampPercent(n) {
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  function renderPercent(name, value) {
    const el = document.getElementById(PERCENT_STATS[name]);
    if (el) el.textContent = String(clampPercent(value)).padStart(3, '0') + '%';
  }

  // Exposed as body[data-movement] for CSS and as a 'ship:movement' DOM
  // event (detail.mode) for any other file that needs to react — same
  // loose event pattern as 'ship:launch'/'timer:complete'.
  function renderMovement(mode) {
    if (!MOVEMENT_MODES.includes(mode)) {
      console.warn(`story: unknown movement mode "${mode}" — expected one of ${MOVEMENT_MODES.join(', ')}`);
      return;
    }
    document.body.dataset.movement = mode;
    document.dispatchEvent(new CustomEvent('ship:movement', { detail: { mode } }));
  }

  function watchShipState(story) {
    Object.keys(PERCENT_STATS).forEach(name => {
      renderPercent(name, story.variablesState.$(name));
      story.ObserveVariable(name, (_name, value) => renderPercent(name, value));
    });
    renderMovement(story.variablesState.$('movement'));
    story.ObserveVariable('movement', (_name, value) => renderMovement(value));
  }

  // `# hull: 80` sets, `# hull: -15` / `# hull: +10` adjust — same for
  // every PERCENT_STATS key.
  function applyPercentTag(story, name, value) {
    const n = Number(value);
    if (value === '' || Number.isNaN(n)) {
      console.warn(`story: bad ${name} tag value "${value}"`);
      return;
    }
    const relative = value[0] === '+' || value[0] === '-';
    const current = story.variablesState.$(name);
    story.variablesState.$(name, clampPercent(relative ? current + n : n));
  }

  function applyMovementTag(story, value) {
    if (!MOVEMENT_MODES.includes(value)) {
      console.warn(`story: unknown movement mode "${value}" — expected one of ${MOVEMENT_MODES.join(', ')}`);
      return;
    }
    story.variablesState.$('movement', value);
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

  // Applies every tag attached to the line ink just produced (see
  // ink/story.ink's header comment for the full tag list). `# image:` with no value (or the word `clear`) hides
  // #scene-object instead of pointing it at a new src — the two are the
  // same tag because "which image is showing" is one piece of state,
  // not a separate show/hide concept.
  function applyTags(story, tags) {
    tags.forEach(tag => {
      const sep = tag.indexOf(':');
      const key = (sep === -1 ? tag : tag.slice(0, sep)).trim();
      const value = sep === -1 ? '' : tag.slice(sep + 1).trim();
      if (key === 'contact') currentContact = value;
      else if (key === 'image') {
        if (value === '' || value.toLowerCase() === 'clear') clearSceneObject();
        else showSceneObject(value);
      }
      else if (key === 'countdown') pendingCountdown = Number(value);
      else if (key in PERCENT_STATS) applyPercentTag(story, key, value);
      else if (key === 'movement') applyMovementTag(story, value);
    });
  }

  // Runs the story forward, appending one transcript line per ink
  // Continue() call, until it hits a choice point or runs out of content
  // — this IS the "one beat" of a conversation, whether that beat started
  // a brand-new scene or resumed after the player picked a reply.
  function runContinueLoop(story) {
    while (story.canContinue) {
      const text = story.Continue().trim();
      applyTags(story, story.currentTags || []);
      if (text) appendLine(currentContact, text, false);
    }
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
  // more choices to offer, or the conversation is over — the latter is
  // this scene's `countdown` (if any) becoming due, the ink-driven
  // equivalent of the old 'comms:ended' handoff to js/cutscenes.js.
  function finishBeat(story) {
    if (story.currentChoices.length > 0) {
      renderChoices(story);
      return;
    }
    renderEnded();
    if (pendingCountdown !== null) {
      document.dispatchEvent(new CustomEvent('timer:start', { detail: { seconds: pendingCountdown } }));
      pendingCountdown = null;
    }
  }

  function pickChoice(story, i, text) {
    appendLine('You', text, true);
    story.ChooseChoiceIndex(i);
    runContinueLoop(story);
    finishBeat(story);
  }

  function playScene(story, knotName) {
    pendingCountdown = null;
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
        const knotName = SCENE_KNOTS[sceneIndex];
        sceneIndex += 1;
        if (!knotName) return; // nothing authored yet at this index
        playScene(story, knotName);
      })
      .catch(err => console.error('data/story.json failed to load', err));
  });

  tile.addEventListener('click', openPanel);
  closeBtn.addEventListener('click', closePanel);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && panel.classList.contains('is-open')) closePanel();
  });
})();
