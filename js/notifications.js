// =============================================================================
// FAMILYHUB — notifications.js
// Sistema de notificações automáticas e painel de alertas.
//
// APRESENTAÇÃO:
// Este arquivo gerencia todas as notificações do sistema.
// As notificações são geradas automaticamente — o usuário
// não precisa fazer nada para recebê-las.
// =============================================================================

// ─── addNotificacao() ─────────────────────────────────────────────────────────
// Adiciona uma nova notificação ao banco local e sincroniza com o servidor.
// Limita a 50 notificações para não ocupar muito espaço.
function addNotificacao(title, msg, type='info', icon='bell') {
  // Insere no início do array (mais recente primeiro)
  DB.notificacoes.unshift({
    id:    Date.now(),
    title, msg, type, icon,
    read:  false,                        // Começa como não lida
    date:  new Date().toISOString()
  });
  // Mantém no máximo 50 notificações salvas
  if (DB.notificacoes.length > 50) DB.notificacoes = DB.notificacoes.slice(0, 50);
  updateNotifBadge(); // Atualiza o número no sino imediatamente
  // Tenta salvar no servidor em segundo plano (não bloqueia)
  if (Auth.isLoggedIn()) API.post('notifications/create', { title, message: msg, type, icon }).catch(() => {});
}

// ============================================================
//  updateNotifBadge() — Contador no sino em tempo real
//
//  APRESENTAÇÃO:
//  Conta quantas notificações não foram lidas e exibe o número
//  no badge (bolinha vermelha) do ícone de sino no header.
//  Se tiver mais de 9, exibe "9+" para não estourar o layout.
//  Se não tiver nenhuma não lida, esconde o badge completamente.
// ============================================================
function updateNotifBadge() {
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  const count = DB.notificacoes.filter(n => !n.read).length; // Conta as não lidas
  badge.textContent   = count > 9 ? '9+' : String(count);   // Formata o número
  badge.style.display = count > 0 ? 'flex' : 'none';        // Mostra ou esconde
}

// ─── toggleNotifPanel() ───────────────────────────────────────────────────────
// Abre ou fecha o painel de notificações conforme o estado atual.
function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  panel.classList.contains('translate-x-full') ? openNotifPanel() : closeNotifPanel();
}

// ─── openNotifPanel() ─────────────────────────────────────────────────────────
// Abre o painel, renderiza as notificações e marca todas como lidas.
function openNotifPanel() {
  const panel   = document.getElementById('notif-panel');
  const overlay = document.getElementById('notif-overlay');
  if (!panel) return;
  renderNotifPanel();                           // Renderiza o conteúdo
  panel.classList.remove('translate-x-full');  // Desliza o painel para dentro
  overlay.classList.remove('hidden');           // Mostra o overlay escuro
  // Marca todas as notificações como lidas ao abrir o painel
  DB.notificacoes.forEach(n => n.read = true);
  updateNotifBadge(); // Remove o badge (todas foram lidas)
  saveDB(false);
  if (Auth.isLoggedIn()) API.markAllRead(); // Sincroniza com o servidor
}

// ─── closeNotifPanel() ────────────────────────────────────────────────────────
function closeNotifPanel() {
  document.getElementById('notif-panel')?.classList.add('translate-x-full');
  document.getElementById('notif-overlay')?.classList.add('hidden');
}

// ─── renderNotifPanel() ───────────────────────────────────────────────────────
// Gera o HTML das notificações com cores diferentes por tipo.
function renderNotifPanel() {
  const list = document.getElementById('notif-list');
  if (!list) return;
  // Cada tipo de notificação tem cor de fundo e borda diferente
  const typeConfig = {
    achievement: { bg: 'bg-amber-50 dark:bg-amber-900/20',   border: 'border-amber-200 dark:border-amber-800/40',   iconColor: 'text-amber-500'  },
    success:     { bg: 'bg-emerald-50 dark:bg-emerald-900/20',border: 'border-emerald-200 dark:border-emerald-800/40',iconColor: 'text-emerald-500'},
    warning:     { bg: 'bg-red-50 dark:bg-red-900/20',        border: 'border-red-200 dark:border-red-800/40',        iconColor: 'text-red-500'    },
    info:        { bg: 'bg-blue-50 dark:bg-blue-900/20',      border: 'border-blue-200 dark:border-blue-800/40',      iconColor: 'text-blue-500'   }
  };
  if (!DB.notificacoes.length) {
    list.innerHTML = `<div class="text-center py-16 text-slate-400"><i data-lucide="bell-off" class="w-10 h-10 mx-auto mb-3 opacity-30"></i><p class="font-medium text-sm">Nenhuma notificação</p></div>`;
    lucide.createIcons({ nodes: [list] }); return;
  }
  list.innerHTML = DB.notificacoes.map(n => {
    const cfg = typeConfig[n.type] || typeConfig.info;
    return `<div class="p-3 rounded-xl border ${cfg.bg} ${cfg.border} mb-2">
    <div class="flex gap-3"><i data-lucide="${n.icon||'bell'}" class="w-4 h-4 flex-shrink-0 mt-0.5 ${cfg.iconColor}"></i>
      <div class="flex-1 min-w-0">
        <p class="text-[13px] font-bold leading-snug">${n.title}</p>
        <p class="text-[12px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">${n.msg}</p>
        <p class="text-[10px] text-slate-400 mt-1.5 font-medium">${getTimeAgo(n.date)}</p>
      </div></div></div>`;
  }).join('');
  lucide.createIcons({ nodes: [list] });
}

// ─── getTimeAgo() ─────────────────────────────────────────────────────────────
// Converte uma data ISO em texto relativo: "agora mesmo", "há 5 min", "há 2h"...
function getTimeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)     return 'agora mesmo'; // 60 segundos
  if (diff < 3600)   return `há ${Math.floor(diff / 60)} min`; // 1h
  if (diff < 86400)  return `há ${Math.floor(diff / 3600)}h`; // 24h 
  // 7 Dias
  if (diff < 604800) return `há ${Math.floor(diff / 86400)} 
  dia${Math.floor(diff / 86400) > 1 ? 's' : ''}`; // >= 7 Dias
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

// ============================================================
//  checkAutoNotificacoes() — Alertas automáticos ao abrir o sistema
//
//  APRESENTAÇÃO:
//  Chamada uma vez quando o sistema carrega (no boot do app.js).
//  Verifica automaticamente duas situações sem precisar de
//  nenhuma ação do usuário:
//
//  1. Tarefas atrasadas: pendentes que venceram ontem
//     → Gera alerta laranja "⚠️ Tarefa em atraso"
//
//  2. Tarefas de hoje: pendentes com data = hoje
//     → Gera lembrete azul "📅 X tarefa(s) para hoje"
//
//  Verifica se a notificação já foi enviada antes para não
//  duplicar alertas a cada atualização da tela.
// ============================================================
function checkAutoNotificacoes() {
  const hoje  = new Date().toISOString().split('T')[0];
  const ontem = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // ── Tarefas atrasadas (venceram ontem e ainda estão pendentes) ──
  DB.atividades.filter(a => a.status === 'pendente' && a.date === ontem).forEach(a => {
    // Verifica se já existe notificação de atraso para essa tarefa
    const jaNotif = DB.notificacoes.some(n => n.msg && n.msg.includes(a.title) && n.type === 'warning');
    if (!jaNotif) addNotificacao(
      `⚠️ Tarefa em atraso: ${a.title}`,
      `Atribuída a ${a.resp} — venceu ontem!`,
      'warning', 'alert-triangle'
    );
  });

  // ── Tarefas de hoje (pendentes com data = hoje) ──────────────────
  const taskHoje = DB.atividades.filter(a => a.date === hoje && a.status !== 'concluida');
  if (taskHoje.length > 0) {
    // Verifica se o lembrete de hoje já foi enviado (evita duplicar)
    const jaViu = DB.notificacoes.some(n => n.type === 'info' && n.date && n.date.startsWith(hoje) && n.icon === 'calendar');
    if (!jaViu) addNotificacao(
      `📅 ${taskHoje.length} tarefa${taskHoje.length > 1 ? 's' : ''} para hoje`,
      // Lista até 3 tarefas e indica se há mais
      taskHoje.slice(0, 3).map(t => `• ${t.title} (${t.resp})`).join('\n')
        + (taskHoje.length > 3 ? `\n• e mais ${taskHoje.length - 3}...` : ''),
      'info', 'calendar'
    );
  }
}
