// ═══════════════════════════════════════════════════════
// CUTSCENES — data/scenes.json is a plain array of scene objects,
// meant to be hand-authored (see AGENTS.md's "The cutscene system"):
// each one may have an `image` (a ship/station that fades in over
// the starfield, via #scene-object), a `communications` array (a
// branching conversation handed off to js/comms.js), and/or a
// `countdown` (seconds) that restarts js/timer.js once the scene is
// done, so the next scene has its own trigger lined up. This file
// only owns "what happens when the next scene is due" and "when is
// THIS scene done" — not how any of image/comms/timer actually render
// or tick.
//
// "The next scene is due" is currently just 'timer:complete'
// (js/timer.js, fired once the mission countdown hits zero); a
// future scene trigger (another timer, a location, anything else) is
// just another listener calling playNextScene(), the same loose
// event-dispatch pattern 'ship:launch' already established — this
// file doesn't need to know in advance what will trigger it next.
// ═══════════════════════════════════════════════════════
(function () {
  const sceneObject = document.getElementById('scene-object');
  const sceneObjectImg = document.getElementById('scene-object-img');
  if (!sceneObject || !sceneObjectImg) return;

  const SCENES_URL = 'data/scenes.json';
  // fetched eagerly (unlike monitor.js's lazy on-click fetch) since
  // 'timer:complete' can fire many minutes after page load — better to
  // already have the data in hand than to start a fetch at the exact
  // moment the scene is meant to play.
  const scenesPromise = fetch(SCENES_URL).then(res => {
    if (!res.ok) throw new Error(`${SCENES_URL}: HTTP ${res.status}`);
    return res.json();
  });

  // module-scoped index into scenes.json — each call to playNextScene()
  // advances it, so repeated triggers (once more than one exists) play
  // scenes in authored order rather than replaying the first one.
  let sceneIndex = 0;

  // a scene's own `countdown`, held here between "the scene started"
  // and "the scene is actually done" — which, when it has a
  // conversation, isn't until 'comms:ended' fires (the player has to
  // walk the branches to reach that), not the moment the scene plays.
  let pendingCountdown = null;

  function showSceneObject(imageSrc) {
    sceneObjectImg.src = imageSrc;
    sceneObject.classList.add('is-visible');
  }

  function startNextCountdown(seconds) {
    document.dispatchEvent(new CustomEvent('timer:start', { detail: { seconds } }));
  }

  function playNextScene() {
    scenesPromise
      .then(scenes => {
        const scene = scenes[sceneIndex];
        sceneIndex += 1;
        if (!scene) return; // nothing authored yet at this index

        if (scene.image) showSceneObject(scene.image);

        const hasComms = Array.isArray(scene.communications) && scene.communications.length > 0;
        if (hasComms) {
          // set before dispatching: if the conversation's very first
          // node is already a leaf, js/comms.js's 'comms:ended' fires
          // synchronously inside this same dispatch, and needs to see
          // this already in place.
          pendingCountdown = typeof scene.countdown === 'number' ? scene.countdown : null;
          document.dispatchEvent(new CustomEvent('comms:incoming', {
            detail: {
              contact: scene.contact || 'Unknown',
              communications: scene.communications,
            },
          }));
        } else if (typeof scene.countdown === 'number') {
          // no conversation to wait on — the scene is "done" as soon
          // as it's played.
          startNextCountdown(scene.countdown);
        }
      })
      .catch(err => console.error('scenes.json failed to load', err));
  }

  document.addEventListener('timer:complete', playNextScene);

  document.addEventListener('comms:ended', () => {
    if (pendingCountdown !== null) {
      startNextCountdown(pendingCountdown);
      pendingCountdown = null;
    }
  });
})();
