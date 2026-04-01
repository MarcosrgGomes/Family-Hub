// =============================================================================
// FAMILYHUB — auth.js
// Gerenciamento de sessão no navegador e cliente de API.
//
// APRESENTAÇÃO:
// Este arquivo tem duas responsabilidades:
// 1. Auth: sabe se o usuário está logado e gerencia o token no localStorage
// 2. API: centraliza todas as chamadas ao backend PHP, sempre enviando
//         o token de autenticação automaticamente em cada requisição.
// =============================================================================

// ============================================================
//  Auth — Gerenciamento de sessão no navegador
//
//  APRESENTAÇÃO:
//  Após o login, o servidor PHP retorna um token único.
//  Esse token é salvo no localStorage do navegador e enviado
//  em toda requisição para provar que o usuário está autenticado.
//
//  O objeto Auth centraliza o acesso a esses dados:
//  - getToken(): lê o token salvo
//  - getUser(): lê os dados do usuário logado
//  - isLoggedIn(): verifica se existe um token (está logado?)
//  - clear(): apaga tudo ao fazer logout
// ============================================================
const Auth = {
  // Lê o token de autenticação salvo no navegador
  getToken:   () => localStorage.getItem('fh_token'),

  // Lê os dados do usuário (nome, e-mail, família) — salvo como JSON
  getUser:    () => JSON.parse(localStorage.getItem('fh_user') || 'null'),

  // Verifica se o usuário está logado (!! converte string para booleano)
  isLoggedIn: () => !!localStorage.getItem('fh_token'),

  // Limpa a sessão — remove token e dados do usuário (usado no logout)
  clear:      () => {
    localStorage.removeItem('fh_token');
    localStorage.removeItem('fh_user');
  },
};

// ============================================================
//  API — Cliente de requisições ao backend PHP
//
//  APRESENTAÇÃO:
//  O padrão Bearer Token funciona assim:
//  Todo pedido ao servidor inclui o header:
//  "Authorization: Bearer <token>"
//
//  O PHP lê esse header em requireAuth() e valida o token
//  no banco de dados antes de responder.
//
//  O método _headers() é chamado internamente em get() e post()
//  para montar o cabeçalho automaticamente — o resto do código
//  nunca precisa se preocupar com autenticação.
// ============================================================
const API = {
  // ─── _headers() — Monta o cabeçalho com o token de autenticação ───────────
  // Chamado automaticamente em get() e post() antes de cada requisição.
  _headers() {
    const h = { 'Content-Type': 'application/json' }; // Formato JSON
    // Se estiver logado, adiciona o token no cabeçalho Authorization
    if (Auth.getToken()) h['Authorization'] = `Bearer ${Auth.getToken()}`;
    return h;
  },

  // ─── get() — Requisição GET ao backend ────────────────────────────────────
  // Busca dados do servidor (ex: lista de atividades, notificações).
  // Retorna { ok: false } se estiver offline — nunca lança erro.
  async get(route) {
    try {
      const r = await fetch(`${API_BASE}php/api.php?r=${route}`, { headers: this._headers() });
      return await r.json();
    } catch { return { ok: false, error: 'offline' }; }
  },

  // ─── post() — Requisição POST ao backend ──────────────────────────────────
  // Envia dados para o servidor (ex: salvar atividade, criar notificação).
  // Retorna { ok: false } se estiver offline — nunca lança erro.
  async post(route, body) {
    try {
      const r = await fetch(`${API_BASE}php/api.php?r=${route}`, {
        method:  'POST',
        headers: this._headers(),
        body:    JSON.stringify(body), // Converte o objeto para JSON
      });
      return await r.json();
    } catch { return { ok: false, error: 'offline' }; }
  },

  // ─── syncData() — Sincroniza o banco local com o servidor ─────────────────
  // Chamado automaticamente ao salvar dados (saveDB).
  // Não bloqueia — se falhar, os dados continuam salvos localmente.
  async syncData() {
    if (!Auth.isLoggedIn()) return;
    API.post('data', { data: DB }).catch(() => {});
  },

  // ─── loadUserData() — Carrega dados do servidor ao fazer login ────────────
  // Substitui os dados locais pelos dados do servidor (mais recentes).
  // Retorna true se carregou com sucesso, false se falhou.
  async loadUserData() {
    if (!Auth.isLoggedIn()) return false;
    try {
      const res = await API.get('data');
      if (res.ok && res.data) {
        DB = res.data; // Substitui o banco local pelos dados do servidor
        const key = window._dbStorageKey || 'familyHubDB';
        localStorage.setItem(key, JSON.stringify(DB)); // Salva localmente também
        return true;
      }
      return false;
    } catch { return false; }
  },

  // ─── loadNotifications() — Carrega notificações do servidor ───────────────
  // Sincroniza as notificações do banco de dados com o array local.
  async loadNotifications() {
    if (!Auth.isLoggedIn()) return;
    const res = await API.get('notifications');
    if (res.ok && res.notifications) {
      // Converte o formato do servidor para o formato local
      DB.notificacoes = res.notifications.map(n => ({
        id:    n.id,
        title: n.title,
        msg:   n.message,
        type:  n.type,
        icon:  n.icon,
        read:  !!n.is_read,
        date:  n.created_at,
      }));
      saveDB(false);       // Salva localmente sem sincronizar de volta
      updateNotifBadge();  // Atualiza o contador no sino
    }
  },

  // ─── markAllRead() — Marca todas as notificações como lidas no servidor ───
  async markAllRead() {
    if (!Auth.isLoggedIn()) return;
    await API.post('notifications/read', {});
  },
};

// ─── handleLogout() ───────────────────────────────────────────────────────────
// Envia logout para o servidor (invalida o token no banco),
// limpa a sessão local e redireciona para a tela de login.
function handleLogout() {
  if (Auth.isLoggedIn()) {
    // Tenta invalidar o token no servidor (ignora erro se offline)
    fetch(`${API_BASE}php/auth.php?action=logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${Auth.getToken()}` }
    }).catch(() => {});
  }
  Auth.clear();                      // Remove token e dados do navegador
  window.location.href = 'index.html'; // Redireciona para o login
}

// ─── updateUserInfo() ─────────────────────────────────────────────────────────
// Atualiza o nome da família no banco local com os dados do usuário logado,
// caso ainda esteja com o nome padrão.
function updateUserInfo() {
  const user = Auth.getUser();
  if (!user) return;
  if (user.familyName && DB.settings.familyName === 'Minha Família') {
    DB.settings.familyName = user.familyName;
  }
}
