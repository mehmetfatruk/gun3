/* ── Drag & Drop ── */
const DragDrop = (() => {
  let dragCard = null;
  let dragGhost = null;
  let placeholder = null;
  let originListId = null;
  let originPos = null;
  let offsetX = 0, offsetY = 0;

  function init() {
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("touchstart", onTouchStart, { passive: false });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
  }

  function getCard(el) { return el.closest?.(".card"); }
  function getListBody(el) { return el.closest?.(".list-cards"); }

  /* ── Mouse events ── */
  function onMouseDown(e) {
    if (e.button !== 0) return;
    const card = getCard(e.target);
    if (!card || e.target.closest("button, input, textarea, .card-modal-overlay")) return;
    startDrag(card, e.clientX, e.clientY);
  }

  function onMouseMove(e) {
    if (!dragCard) return;
    moveDrag(e.clientX, e.clientY);
  }

  function onMouseUp(e) {
    if (!dragCard) return;
    endDrag();
  }

  /* ── Touch events ── */
  let touchTimer = null;
  let touchStarted = false;

  function onTouchStart(e) {
    const card = getCard(e.target);
    if (!card || e.target.closest("button, input, textarea, .card-modal-overlay")) return;
    const t = e.touches[0];
    touchTimer = setTimeout(() => {
      touchStarted = true;
      startDrag(card, t.clientX, t.clientY);
    }, 200);
  }

  function onTouchMove(e) {
    if (!dragCard) { clearTimeout(touchTimer); return; }
    if (touchStarted) e.preventDefault();
    const t = e.touches[0];
    moveDrag(t.clientX, t.clientY);
  }

  function onTouchEnd() {
    clearTimeout(touchTimer);
    if (!dragCard) return;
    touchStarted = false;
    endDrag();
  }

  /* ── Core ── */
  function startDrag(card, x, y) {
    dragCard = card;
    const rect = card.getBoundingClientRect();
    offsetX = x - rect.left;
    offsetY = y - rect.top;
    originListId = card.dataset.listId;
    originPos = +card.dataset.position;

    placeholder = document.createElement("div");
    placeholder.className = "card-placeholder";
    placeholder.style.height = rect.height + "px";
    card.parentNode.insertBefore(placeholder, card);

    dragGhost = card.cloneNode(true);
    dragGhost.className = "card card-ghost";
    dragGhost.style.width = rect.width + "px";
    document.body.appendChild(dragGhost);
    positionGhost(x, y);

    card.style.display = "none";
  }

  function positionGhost(x, y) {
    if (!dragGhost) return;
    dragGhost.style.left = (x - offsetX) + "px";
    dragGhost.style.top = (y - offsetY) + "px";
  }

  function moveDrag(x, y) {
    positionGhost(x, y);

    const elBelow = document.elementFromPoint(x, y);
    if (!elBelow) return;

    const listBody = elBelow.closest(".list-cards");
    if (!listBody) return;

    const cards = [...listBody.querySelectorAll(".card:not([style*='display: none'])")];
    let insertBefore = null;

    for (const c of cards) {
      const r = c.getBoundingClientRect();
      if (y < r.top + r.height / 2) { insertBefore = c; break; }
    }

    if (placeholder.parentNode !== listBody || placeholder.nextSibling !== insertBefore) {
      listBody.insertBefore(placeholder, insertBefore);
    }
  }

  function endDrag() {
    if (!dragCard || !placeholder) return;

    const newListBody = placeholder.parentNode;
    const newListId = newListBody.dataset.listId;

    newListBody.insertBefore(dragCard, placeholder);
    dragCard.style.display = "";
    placeholder.remove();
    if (dragGhost) { dragGhost.remove(); dragGhost = null; }

    // Calculate new positions
    const siblings = [...newListBody.querySelectorAll(".card")];
    const updates = [];
    siblings.forEach((c, i) => {
      const cardId = +c.dataset.cardId;
      const oldListId = c.dataset.listId;
      const changed = +oldListId !== +newListId && +c.dataset.cardId === +dragCard.dataset.cardId;
      c.dataset.position = i;
      c.dataset.listId = newListId;
      updates.push({ id: cardId, position: i, list_id: +newListId });
    });

    // Persist changes
    updates.forEach(u => Board.updateCard(u.id, { position: u.position, list_id: u.list_id }));

    dragCard = null;
    placeholder = null;
  }

  return { init };
})();
