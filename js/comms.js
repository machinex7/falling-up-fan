// ═══════════════════════════════════════════════════════
// COMMS — a second slide-out screen, same "in-universe panel, not a
// page" pattern as #info-monitor (js/monitor.js), reusing that same
// chrome (.info-monitor/.monitor-bezel/.monitor-screen/.monitor-header/
// .monitor-close/.monitor-body — see css/comms.css for the one thing
// that differs: it slides in from the left instead of the right) since
// both are just "a lit CRT screen slid over #window/#console." This
// file owns #comms-panel's own content instead: a transcript log plus
// branching reply buttons, driven by whatever conversation
// js/cutscenes.js hands it.
//
// A conversation is a flat array of nodes — { id, from, text, replies }
// — not a linear script: `replies` is a list of { text, next } choices,
// and `next` is another node's id. An empty `replies` array means the
// conversation is over — reaching one dispatches 'comms:ended', which
// js/cutscenes.js listens for to know when it's safe to start a
// scene's next `countdown` (see AGENTS.md's "The cutscene system").
// The first element of the array is always the entry point. This file
// just walks that graph; it doesn't know or care how many nodes a
// scene has or how they branch.
// ═══════════════════════════════════════════════════════
(function () {
  const tile = document.getElementById('comms-tile');
  const panel = document.getElementById('comms-panel');
  const closeBtn = document.getElementById('comms-close');
  const titleEl = document.getElementById('comms-title');
  const logEl = document.getElementById('comms-log');
  const repliesEl = document.getElementById('comms-replies');
  if (!tile || !panel || !closeBtn || !titleEl || !logEl || !repliesEl) return;

  // No conversation exists until 'comms:incoming' fires at least once —
  // the COMS tile does nothing on click until then, the same way the
  // mission timer does nothing until 'ship:launch' fires.
  let conversation = null; // { contact, nodesById }

  function appendLine(from, text, isYou) {
    const li = document.createElement('li');
    li.className = 'comms-msg' + (isYou ? ' from-you' : '');
    li.innerHTML = `<span class="comms-from">${from}</span>${text}`;
    logEl.appendChild(li);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function renderReplies(node) {
    repliesEl.innerHTML = '';
    if (!node.replies || node.replies.length === 0) {
      const p = document.createElement('p');
      p.className = 'comms-ended';
      p.textContent = 'Transmission ended';
      repliesEl.appendChild(p);
      document.dispatchEvent(new CustomEvent('comms:ended'));
      return;
    }
    node.replies.forEach(reply => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'reply-btn';
      btn.textContent = reply.text;
      btn.addEventListener('click', () => pickReply(reply));
      repliesEl.appendChild(btn);
    });
  }

  function pickReply(reply) {
    appendLine('You', reply.text, true);
    const next = conversation.nodesById.get(reply.next);
    if (!next) return; // authoring error in scenes.json — nothing to advance to
    appendLine(next.from, next.text, false);
    renderReplies(next);
  }

  function openPanel() {
    if (!conversation) return; // nothing queued yet
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

  document.addEventListener('comms:incoming', e => {
    const { contact, communications } = e.detail;
    const nodesById = new Map(communications.map(node => [node.id, node]));
    const first = communications[0];
    conversation = { contact, nodesById };

    titleEl.textContent = `Incoming Transmission: ${contact}`;
    logEl.innerHTML = '';
    appendLine(first.from, first.text, false);
    renderReplies(first);

    tile.classList.add('is-pending');
  });

  tile.addEventListener('click', openPanel);
  closeBtn.addEventListener('click', closePanel);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && panel.classList.contains('is-open')) closePanel();
  });
})();
