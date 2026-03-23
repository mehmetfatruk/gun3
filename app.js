/* ── App Controller ── */
const App = (() => {
  let currentBoardId = null;
  let lists = [];
  let cards = [];

  /* ── helpers ── */
  const $ = (id) => document.getElementById(id);
  const esc = (s) => { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; };
  const escAttr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  /* ── screens ── */
  function showAuth() {
    $("authScreen").classList.remove("hidden");
    $("boardsScreen").classList.add("hidden");
    $("boardDetailScreen").classList.add("hidden");
  }

  function showBoards() {
    $("authScreen").classList.add("hidden");
    $("boardsScreen").classList.remove("hidden");
    $("boardDetailScreen").classList.add("hidden");
    $("userEmailBoards").textContent = Auth.getUser().email;
    loadBoards();
  }

  function showBoardDetail(boardId, boardTitle) {
    currentBoardId = boardId;
    $("boardsScreen").classList.add("hidden");
    $("boardDetailScreen").classList.remove("hidden");
    $("boardTitle").textContent = boardTitle;
    $("userEmailDetail").textContent = Auth.getUser().email;
    loadBoardData();
  }

  /* ── Auth UI ── */
  let isSignUp = false;

  function initAuthUI() {
    $("authBtn").onclick = handleAuth;
    $("authToggleLink").onclick = toggleAuthMode;
    $("passwordInput").addEventListener("keydown", (e) => { if (e.key === "Enter") handleAuth(); });
  }

  function toggleAuthMode() {
    isSignUp = !isSignUp;
    hideAuthMsg();
    $("authTitle").textContent = isSignUp ? "Kayıt Ol" : "Giriş Yap";
    $("authBtn").textContent = isSignUp ? "Kayıt Ol" : "Giriş Yap";
    $("authToggleText").textContent = isSignUp ? "Zaten hesabın var mı?" : "Hesabın yok mu?";
    $("authToggleLink").textContent = isSignUp ? "Giriş Yap" : "Kayıt Ol";
  }

  function showAuthMsg(text, type) {
    const el = $("authMessage");
    el.textContent = text;
    el.className = "auth-message " + type;
  }
  function hideAuthMsg() { $("authMessage").className = "auth-message hidden"; }

  async function handleAuth() {
    const email = $("emailInput").value.trim();
    const pw = $("passwordInput").value;
    hideAuthMsg();
    if (!email || !pw) return showAuthMsg("E-posta ve şifre gerekli.", "error");
    if (pw.length < 6) return showAuthMsg("Şifre en az 6 karakter olmalı.", "error");
    $("authBtn").disabled = true;
    try {
      if (isSignUp) {
        const r = await Auth.signUp(email, pw);
        if (r.needsConfirm) { showAuthMsg("Kayıt başarılı! E-postanıza onay bağlantısı gönderildi.", "success"); $("emailInput").value = ""; $("passwordInput").value = ""; }
        else showBoards();
      } else {
        await Auth.signIn(email, pw);
        showBoards();
      }
    } catch (e) { showAuthMsg(e.message, "error"); }
    $("authBtn").disabled = false;
  }

  /* ── Boards list ── */
  async function loadBoards() {
    const grid = $("boardsGrid");
    grid.innerHTML = '<div class="loading">Yükleniyor...</div>';
    try {
      const boards = await Board.getBoards();
      renderBoardsGrid(boards);
    } catch (e) { grid.innerHTML = '<div class="empty-state">Panolar yüklenemedi.</div>'; }
  }

  function renderBoardsGrid(boards) {
    const grid = $("boardsGrid");
    let html = boards.map(b => `
      <div class="board-card" onclick="App.openBoard(${b.id}, '${escAttr(b.title)}')">
        <div class="board-card-title">${esc(b.title)}</div>
        <button class="board-delete-btn" onclick="event.stopPropagation(); App.removeBoard(${b.id})" title="Sil">&times;</button>
      </div>
    `).join("");
    html += `
      <div class="board-card board-card-new" onclick="App.promptNewBoard()">
        <span class="board-card-plus">+</span>
        <span>Yeni Pano</span>
      </div>
    `;
    grid.innerHTML = html;
  }

  async function promptNewBoard() {
    const title = prompt("Pano adı:");
    if (!title?.trim()) return;
    try {
      await Board.createBoard(title.trim());
      loadBoards();
    } catch (e) { alert("Pano oluşturulamadı: " + e.message); }
  }

  async function removeBoard(id) {
    if (!confirm("Bu panoyu silmek istediğinize emin misiniz?")) return;
    try { await Board.deleteBoard(id); loadBoards(); } catch (e) { alert("Silinemedi: " + e.message); }
  }

  function openBoard(id, title) { showBoardDetail(id, title); }

  /* ── Board detail ── */
  async function loadBoardData() {
    const container = $("listsContainer");
    container.innerHTML = '<div class="loading">Yükleniyor...</div>';
    try {
      [lists, cards] = await Promise.all([Board.getLists(currentBoardId), Board.getCards(currentBoardId)]);
      renderBoard();
    } catch (e) { container.innerHTML = '<div class="empty-state">Veriler yüklenemedi.</div>'; }
  }

  function renderBoard() {
    const container = $("listsContainer");
    let html = "";

    lists.sort((a, b) => a.position - b.position).forEach(list => {
      const listCards = cards.filter(c => c.list_id === list.id).sort((a, b) => a.position - b.position);
      html += `
      <div class="list" data-list-id="${list.id}">
        <div class="list-header">
          <h3 class="list-title" ondblclick="App.editListTitle(${list.id})" title="Düzenlemek için çift tıklayın">${esc(list.title)}</h3>
          <span class="list-badge">${listCards.length}</span>
          <button class="list-menu-btn" onclick="App.deleteListConfirm(${list.id})" title="Listeyi sil">&times;</button>
        </div>
        <div class="list-cards" data-list-id="${list.id}">
          ${listCards.map(c => renderCard(c)).join("")}
        </div>
        <div class="list-add">
          <input type="text" class="add-card-input" placeholder="Kart ekle..." data-list-id="${list.id}" onkeydown="if(event.key==='Enter') App.addCard(${list.id}, this)">
          <button class="add-card-btn" onclick="App.addCard(${list.id}, this.previousElementSibling)">+</button>
        </div>
      </div>`;
    });

    html += `
    <div class="list list-new" onclick="App.promptNewList()">
      <div class="list-new-inner">
        <span>+ Liste Ekle</span>
      </div>
    </div>`;

    container.innerHTML = html;
  }

  function renderCard(c) {
    const dueHtml = c.due_date ? `<span class="card-due">${c.due_date}</span>` : "";
    const descIcon = c.description ? '<span class="card-has-desc" title="Açıklama var">&#9776;</span>' : "";
    return `
    <div class="card" data-card-id="${c.id}" data-list-id="${c.list_id}" data-position="${c.position}" onclick="App.openCardModal(${c.id})">
      <div class="card-title">${esc(c.title)}</div>
      <div class="card-meta">${descIcon}${dueHtml}</div>
    </div>`;
  }

  /* ── List CRUD ── */
  async function promptNewList() {
    const title = prompt("Liste adı:");
    if (!title?.trim()) return;
    const pos = lists.length;
    try {
      const data = await Board.createList(currentBoardId, title.trim(), pos);
      lists.push(data[0]);
      renderBoard();
    } catch (e) { alert("Liste oluşturulamadı: " + e.message); }
  }

  async function editListTitle(listId) {
    const list = lists.find(l => l.id === listId);
    const title = prompt("Yeni liste adı:", list?.title);
    if (!title?.trim() || title.trim() === list.title) return;
    try {
      await Board.renameList(listId, title.trim());
      list.title = title.trim();
      renderBoard();
    } catch (e) { alert("Değiştirilemedi: " + e.message); }
  }

  async function deleteListConfirm(listId) {
    if (!confirm("Bu listeyi ve içindeki tüm kartları silmek istiyor musunuz?")) return;
    try {
      await Board.deleteList(listId);
      lists = lists.filter(l => l.id !== listId);
      cards = cards.filter(c => c.list_id !== listId);
      renderBoard();
    } catch (e) { alert("Silinemedi: " + e.message); }
  }

  /* ── Card CRUD ── */
  async function addCard(listId, input) {
    const title = input.value.trim();
    if (!title) return;
    input.value = "";
    const pos = cards.filter(c => c.list_id === listId).length;
    try {
      const data = await Board.createCard(listId, currentBoardId, title, pos);
      cards.push(data[0]);
      renderBoard();
    } catch (e) { alert("Kart eklenemedi: " + e.message); }
  }

  /* ── Card modal ── */
  function openCardModal(cardId) {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    const overlay = document.createElement("div");
    overlay.className = "card-modal-overlay";
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    overlay.innerHTML = `
    <div class="card-modal">
      <button class="modal-close" onclick="this.closest('.card-modal-overlay').remove()">&times;</button>
      <div class="modal-field">
        <label>Başlık</label>
        <input type="text" id="modalTitle" value="${escAttr(card.title)}">
      </div>
      <div class="modal-field">
        <label>Açıklama</label>
        <textarea id="modalDesc" rows="4" placeholder="Açıklama ekle...">${esc(card.description || "")}</textarea>
      </div>
      <div class="modal-field">
        <label>Son Tarih</label>
        <input type="date" id="modalDue" value="${card.due_date || ""}">
      </div>
      <div class="modal-actions">
        <button class="btn-save" onclick="App.saveCardModal(${card.id})">Kaydet</button>
        <button class="btn-danger" onclick="App.deleteCardFromModal(${card.id})">Kartı Sil</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
  }

  async function saveCardModal(cardId) {
    const title = $("modalTitle").value.trim();
    if (!title) return alert("Başlık boş olamaz.");
    const description = $("modalDesc").value.trim() || null;
    const due_date = $("modalDue").value || null;
    try {
      await Board.updateCard(cardId, { title, description, due_date });
      const card = cards.find(c => c.id === cardId);
      if (card) { card.title = title; card.description = description; card.due_date = due_date; }
      document.querySelector(".card-modal-overlay")?.remove();
      renderBoard();
    } catch (e) { alert("Kaydedilemedi: " + e.message); }
  }

  async function deleteCardFromModal(cardId) {
    if (!confirm("Bu kartı silmek istiyor musunuz?")) return;
    try {
      await Board.deleteCard(cardId);
      cards = cards.filter(c => c.id !== cardId);
      document.querySelector(".card-modal-overlay")?.remove();
      renderBoard();
    } catch (e) { alert("Silinemedi: " + e.message); }
  }

  /* ── Navigation ── */
  function goBackToBoards() {
    currentBoardId = null;
    showBoards();
  }

  async function logout() {
    await Auth.signOut();
    showAuth();
  }

  /* ── Init ── */
  async function init() {
    initAuthUI();
    DragDrop.init();

    const cb = await Auth.handleCallback();
    if (cb) { showBoards(); return; }
    if (await Auth.restore()) { showBoards(); return; }
    showAuth();
  }

  return {
    init, showAuth, showBoards, openBoard, promptNewBoard, removeBoard,
    promptNewList, editListTitle, deleteListConfirm,
    addCard, openCardModal, saveCardModal, deleteCardFromModal,
    goBackToBoards, logout
  };
})();

document.addEventListener("DOMContentLoaded", App.init);
