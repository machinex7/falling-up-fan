// ═══════════════════════════════════════════════════════
// CUTSCENES — data/scenes.json is a plain array of scene objects,
// meant to be hand-authored (see AGENTS.md's "The cutscene system"):
// each one may have an `image` (a ship/station that fades in over
// the starfield, via #scene-object) and/or a `communications` array
// (a branching conversation handed off to js/comms.js). This file
// only owns "what happens when the next scene is due" — playing a
// scene's image and handing its conversation off — not how either of
// those actually render.
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

  function showSceneObject(imageSrc) {
    sceneObjectImg.src = imageSrc;
    sceneObject.classList.add('is-visible');
  }

  function playNextScene() {
    scenesPromise
      .then(scenes => {
        const scene = scenes[sceneIndex];
        sceneIndex += 1;
        if (!scene) return; // nothing authored yet at this index

        if (scene.image) showSceneObject(scene.image);

        if (Array.isArray(scene.communications) && scene.communications.length) {
          document.dispatchEvent(new CustomEvent('comms:incoming', {
            detail: {
              contact: scene.contact || 'Unknown',
              communications: scene.communications,
            },
          }));
        }
      })
      .catch(err => console.error('scenes.json failed to load', err));
  }

  document.addEventListener('timer:complete', playNextScene);
})();
