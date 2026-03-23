/* ── Auth Module ── */
const Auth = (() => {
  let accessToken = null;
  let refreshToken = null;
  let currentUser = null;

  const base = () => ({ apikey: SUPABASE_KEY, "Content-Type": "application/json" });
  const bearer = () => ({ ...base(), Authorization: "Bearer " + accessToken });

  function getToken() { return accessToken; }
  function getUser() { return currentUser; }

  /* ── persist / restore ── */
  function persist() {
    localStorage.setItem("mk_at", accessToken);
    localStorage.setItem("mk_rt", refreshToken);
    localStorage.setItem("mk_user", JSON.stringify(currentUser));
  }
  function clearStorage() {
    localStorage.removeItem("mk_at");
    localStorage.removeItem("mk_rt");
    localStorage.removeItem("mk_user");
  }

  /* ── session ── */
  function setSession(data) {
    accessToken = data.access_token;
    refreshToken = data.refresh_token;
    currentUser = data.user;
    persist();
  }

  async function refresh() {
    const rt = localStorage.getItem("mk_rt");
    if (!rt) return false;
    const res = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST", headers: base(),
      body: JSON.stringify({ refresh_token: rt }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (!data.access_token) return false;
    setSession(data);
    return true;
  }

  /* ── signup / signin ── */
  async function signUp(email, password) {
    const res = await fetch(SUPABASE_URL + "/auth/v1/signup", {
      method: "POST", headers: base(),
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error_description || data.msg || data.error?.message || "Kayıt başarısız.");
    if (data.id && !data.confirmed_at) return { needsConfirm: true };
    setSession(data);
    return { needsConfirm: false };
  }

  async function signIn(email, password) {
    const res = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=password", {
      method: "POST", headers: base(),
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      const msg = data.error_description || data.msg || data.error?.message || "Giriş başarısız.";
      throw new Error(msg.includes("Email not confirmed") ? "E-posta adresiniz henüz onaylanmadı." : msg);
    }
    setSession(data);
  }

  async function signOut() {
    try { await fetch(SUPABASE_URL + "/auth/v1/logout", { method: "POST", headers: bearer() }); } catch {}
    accessToken = null; refreshToken = null; currentUser = null;
    clearStorage();
  }

  /* ── callback from email confirm ── */
  function handleCallback() {
    const hash = window.location.hash;
    if (!hash || !hash.includes("access_token")) return false;
    const p = new URLSearchParams(hash.substring(1));
    const at = p.get("access_token");
    const rt = p.get("refresh_token");
    if (!at) return false;
    accessToken = at; refreshToken = rt;
    localStorage.setItem("mk_at", at);
    localStorage.setItem("mk_rt", rt);
    return new Promise((resolve) => {
      fetch(SUPABASE_URL + "/auth/v1/user", { headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + at } })
        .then(r => r.json()).then(user => {
          currentUser = user;
          localStorage.setItem("mk_user", JSON.stringify(user));
          window.location.hash = "";
          resolve(true);
        });
    });
  }

  /* ── restore existing session ── */
  async function restore() {
    const saved = localStorage.getItem("mk_at");
    const savedUser = localStorage.getItem("mk_user");
    if (!saved || !savedUser) return false;
    accessToken = saved;
    refreshToken = localStorage.getItem("mk_rt");
    currentUser = JSON.parse(savedUser);
    const res = await fetch(SUPABASE_URL + "/auth/v1/user", { headers: bearer() });
    if (res.ok) return true;
    if (await refresh()) return true;
    clearStorage();
    return false;
  }

  return { getToken, getUser, signUp, signIn, signOut, handleCallback, restore, refresh, bearer };
})();
