/* ── Board / List / Card CRUD ── */
const Board = (() => {
  const api = (path, opts = {}) => {
    const h = { ...Auth.bearer(), Prefer: "return=representation" };
    return fetch(SUPABASE_URL + "/rest/v1/" + path, { ...opts, headers: h }).then(async (res) => {
      if (res.status === 401) {
        if (await Auth.refresh()) return fetch(SUPABASE_URL + "/rest/v1/" + path, { ...opts, headers: { ...Auth.bearer(), Prefer: "return=representation" } }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e)));
        Auth.signOut(); App.showAuth(); throw new Error("Oturum süresi doldu.");
      }
      if (res.status === 204) return null;
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "API hatası");
      return data;
    });
  };

  /* ── Boards ── */
  const getBoards = () => api("boards?select=*&order=created_at.asc");

  const createBoard = (title) => api("boards", {
    method: "POST",
    body: JSON.stringify({ title, user_id: Auth.getUser().id }),
  });

  const deleteBoard = (id) => api("boards?id=eq." + id, { method: "DELETE" });

  const renameBoard = (id, title) => api("boards?id=eq." + id, {
    method: "PATCH", body: JSON.stringify({ title }),
  });

  /* ── Lists ── */
  const getLists = (boardId) => api("lists?board_id=eq." + boardId + "&select=*&order=position.asc");

  const createList = (boardId, title, position) => api("lists", {
    method: "POST",
    body: JSON.stringify({ board_id: boardId, title, position }),
  });

  const renameList = (id, title) => api("lists?id=eq." + id, {
    method: "PATCH", body: JSON.stringify({ title }),
  });

  const deleteList = (id) => api("lists?id=eq." + id, { method: "DELETE" });

  const updateListPos = (id, position) => api("lists?id=eq." + id, {
    method: "PATCH", body: JSON.stringify({ position }),
  });

  /* ── Cards ── */
  const getCards = (boardId) => api("cards?board_id=eq." + boardId + "&select=*&order=position.asc");

  const createCard = (listId, boardId, title, position) => api("cards", {
    method: "POST",
    body: JSON.stringify({ list_id: listId, board_id: boardId, title, position }),
  });

  const updateCard = (id, fields) => api("cards?id=eq." + id, {
    method: "PATCH", body: JSON.stringify(fields),
  });

  const deleteCard = (id) => api("cards?id=eq." + id, { method: "DELETE" });

  return { getBoards, createBoard, deleteBoard, renameBoard, getLists, createList, renameList, deleteList, updateListPos, getCards, createCard, updateCard, deleteCard };
})();
