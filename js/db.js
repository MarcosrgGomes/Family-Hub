// =============================================================================
// FAMILYHUB — db.js
// Cache local (localStorage) espelhando o estado no MySQL quando há sessão.
// Com usuário logado, o backend PHP (MySQL) é a fonte de verdade — veja API.loadUserData.
// =============================================================================

// ─── Banco vazio para usuários novos ─────────────────────────────────────────
const emptyDB = {
  settings: { familyName: 'Minha Família', email: '', photo: '' },
  gamification: {
    pontos: {},
    conquistas: [],
    streaks: {},
    lastActivityDate: {},
    premios_resgatados: [],
    desafios: [],
  },
  notificacoes: [],
  logs:       [],
  atividades: [],
  listas:     [],
  receitas:   [],
  membros:    [],
};

// Alias mantido para compatibilidade
const defaultDB = emptyDB;

// ─── Inicialização do DB ──────────────────────────────────────────────────────
function getInitialDB() {
  const loggedUser  = Auth.getUser();
  const userEmail   = loggedUser?.email?.toLowerCase() || '';
  const storageKey  = userEmail ? `familyHubDB_${userEmail}` : 'familyHubDB';

  window._dbStorageKey = storageKey;

  const stored   = localStorage.getItem(storageKey);
  const template = emptyDB;
  const db       = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(template));

  if (!db.settings)   db.settings   = { ...template.settings };
  db.atividades = (db.atividades || []).map(a  => ({ status: 'pendente', priority: 'media', notes: '', ...a }));
  db.listas     = (db.listas     || []).map((l, i) => ({ id: l.id || Date.now() + i, icon: l.icon || 'shopping-cart', ...l }));
  db.receitas   = (db.receitas   || []).map(r  => ({ porcoes: 4, ...r }));
  db.membros    = (db.membros    || []).map(m  => ({ borderHex: '#3b82f6', ...m }));
  if (!db.gamification)                    db.gamification = JSON.parse(JSON.stringify(emptyDB.gamification));
  if (!db.gamification.pontos)             db.gamification.pontos = {};
  if (!db.gamification.conquistas)         db.gamification.conquistas = [];
  if (!db.gamification.streaks)            db.gamification.streaks = {};
  if (!db.gamification.lastActivityDate)   db.gamification.lastActivityDate = {};
  if (!db.gamification.premios_resgatados) db.gamification.premios_resgatados = [];
  if (!db.gamification.desafios)           db.gamification.desafios = [];
  if (!db.notificacoes)                    db.notificacoes = [];
  if (!db.logs)                            db.logs = [];
  return db;
}

let DB = getInitialDB();

function saveDB(sync = true) {
  const key = window._dbStorageKey || 'familyHubDB';
  localStorage.setItem(key, JSON.stringify(DB));
  updateSidebarSettings();
  if (sync) API.syncData();
}
