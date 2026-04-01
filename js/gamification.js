// =============================================================================
// FAMILYHUB — gamification.js
// Sistema de pontos, níveis, streaks, conquistas e prêmios.
//
// APRESENTAÇÃO:
// Este é o arquivo mais diferenciado do projeto. Implementa um
// sistema de gamificação completo: pontos variáveis por prioridade,
// bônus por prazo, streak de dias consecutivos, conquistas automáticas
// e prêmios resgatáveis — tudo sem precisar de ação manual.
// =============================================================================


//Usamos a técnica de Monkey Patching para criar um padrão Decorator, interceptando a ação do usuário no ar para injetar o sistema de pontos sem precisarmos alterar ou arriscar quebrar o código original do aplicativo.

// O Decorator é a ideia de adicionar coisas novas sem quebrar o código antigo. O Monkey Patching é o truque no JavaScript que usamos para fazer isso acontecer com o aplicativo já rodando.

// ============================================================
//  addPontos() — Adiciona pontos com detecção automática de nível
//
//  APRESENTAÇÃO:
//  Adiciona pontos ao membro e compara o nível antes e depois.
//  Se o membro subiu de nível, dispara automaticamente uma
//  notificação de conquista — sem nenhuma verificação manual.
//
//  getLevel() usa a tabela LEVELS (config.js) para determinar
//  em qual nível o membro está conforme seus pontos totais.
// ============================================================
function addPontos(membroName, pts, reason) {
  // Inicializa os pontos do membro se for a primeira vez
  if (!DB.gamification.pontos[membroName]) DB.gamification.pontos[membroName] = 0;

  const before = DB.gamification.pontos[membroName]; // Pontos antes
  DB.gamification.pontos[membroName] += pts;          // Adiciona os pontos
  const after  = DB.gamification.pontos[membroName];  // Pontos depois

  // Declaração de níveis
  const lvlBefore = getLevel(before);
  const lvlAfter  = getLevel(after);

  // Verifica se o nível mudou comparando antes e depois
  if (lvlBefore.label !== lvlAfter.label) {

    // Subiu de nível! Dispara notificação automática de conquista
    addNotificacao(
      `${membroName} subiu de nível! ${lvlAfter.icon}`,
      `Parabéns! ${membroName} alcançou o nível **${lvlAfter.label}** com ${after} pontos!`,
      'achievement', 'trending-up'
    );
  }

  // Toast de fedback
  if (reason) toast(`+${pts} pts para ${membroName}! ${reason}`, 'success', 2500);
  checkConquistas(membroName); // Verifica se alguma conquista foi desbloqueada
}

// ─── checkConquistas() ────────────────────────────────────────────────────────
// Verifica TODAS as conquistas disponíveis após cada ação.
// Se o membro atingiu a condição pela primeira vez, desbloqueia e notifica.
function checkConquistas(membroName) {
  CONQUISTAS_DEF.forEach(def => {
    // Verifica se o membro já tem essa conquista
    const jatem = DB.gamification.conquistas.some(c => c.id === def.id && c.memberId === membroName);
    if (!jatem && def.check(membroName, DB)) {
      // Nova conquista desbloqueada!
      DB.gamification.conquistas.push({
        id: def.id, memberId: membroName,
        date: new Date().toISOString().split('T')[0]
      });

      // Notificação de conquista desbloqueada
      addNotificacao(`${membroName} desbloqueou: ${def.icon} ${def.title}`, def.desc, 'achievement', 'award');
      toast(`${def.icon} ${membroName} desbloqueou: ${def.title}!`, 'success', 4000);
      // Sincroniza a conquista com o servidor
      if (Auth.isLoggedIn()) API.post('achievements', { achievement_id: def.id, member_name: membroName });
    }
  });
}

// ─── updateStreak() ───────────────────────────────────────────────────────────
// Atualiza a sequência de dias consecutivos (streak) do membro.
// Se concluiu tarefa ontem E hoje: streak aumenta.
// Se pulou um dia: streak reinicia do zero.
function updateStreak(membroName) {
  const hoje  = new Date().toISOString().split('T')[0];
  const ontem = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Registro da declaração do ultimo dia de atividade
  const last  = DB.gamification.lastActivityDate[membroName];

  // Anti-Trapaça
  if (last === hoje) return; // Já registrou atividade hoje, não conta de novo
  // Se fez atividade ontem: continua o streak. Se não: reinicia para 1.
  DB.gamification.streaks[membroName]       = (last === ontem) ? (DB.gamification.streaks[membroName] || 0) + 1 : 1;
  DB.gamification.lastActivityDate[membroName] = hoje;
}

// ─── resgatarPremio() ─────────────────────────────────────────────────────────
// Permite que um membro troque seus pontos por um prêmio da loja.
// Verifica se tem pontos suficientes antes de confirmar.
function resgatarPremio(premioId, membroName) {
  const premio = PREMIOS_DEF.find(p => p.id === premioId);
  const membro = DB.membros.find(m => m.name === membroName);
  if (!premio || !membro) return
  
  // Declaração de pts do membro
  const pts = DB.gamification.pontos[membroName] || 0;

  // Custo do premio maior que pts
  if (pts < premio.custo) { toast(`Pontos insuficientes! Precisa de ${premio.custo} pts.`, 'error'); return; }

  // Confirmação de resgate(Evitar compra indevida)
  confirmDialog(`Resgatar "${premio.title}" por ${premio.custo} pontos para ${membroName}?`, () => {
    DB.gamification.pontos[membroName] -= premio.custo; // Debita os pontos
    DB.gamification.premios_resgatados.push({ id: premioId, memberId: membroName, date: new Date().toISOString().split('T')[0], titulo: premio.title });

    // Salvar atividade em log(histórico)
    saveActivityLog(membroName, `Resgatou o prêmio "${premio.title}" (${premio.custo} pts)`, 'premio');

    // Adicionar Notificação
    addNotificacao(`${membroName} resgatou: ${premio.icon} ${premio.title}`, `Parabéns! ${premio.desc}`, 'achievement', 'gift');
    saveDB();// Salvar no banco de dados
    renderApp(); // Atualiza a interface com os pontos debitados

    //toast de premio resgatado
    toast(`${premio.icon} Prêmio resgatado! ${premio.desc}`, 'success', 5000);
  });
}

// ============================================================
//  INTERCEPTOR — Padrão de organização de código
//
//  APRESENTAÇÃO:
//  O padrão "Interceptor" permite adicionar comportamento novo
//  em cima de uma função existente SEM modificar o código original.
//
//  Guardamos a referência da função original (_orig),
//  substituímos por uma nova que chama a original primeiro
//  e depois aplica a gamificação por cima.
//
//  Isso mantém o crud.js focado só em salvar dados,
//  e o gamification.js focado só em pontos/conquistas —
//  cada arquivo com sua responsabilidade separada.
// ============================================================

// ── Interceptor de toggleStatusAtividade ─────────────────────────────────────
const _origToggle = window.toggleStatusAtividade;
window.toggleStatusAtividade = function(id) {
  const at = DB.atividades.find(a => a.id === id);
  const wasNotConcluida = at && at.status !== 'concluida'; // Estado antes

  _origToggle(id); // Executa a função original do crud.js (salva o status)

  // Após a função original executar, verifica se acabou de ser concluída
  const atU = DB.atividades.find(a => a.id === id);
  if (atU && atU.status === 'concluida' && wasNotConcluida) {
    // ── Cálculo dinâmico de pontos ────────────────────────
    // APRESENTAÇÃO:
    // A pontuação não é fixa — varia conforme a prioridade e o prazo:
    // Base: 10 pontos
    // +5 se prioridade alta
    // +15 se prioridade urgente
    // +5 se entregou no prazo (data >= hoje)
    // +5 bônus extra se urgente E no prazo
    // + bônus de streak (dias consecutivos)
    const hoje = new Date().toISOString().split('T')[0];
    let pts = 10;                                  // Pontos base por concluir
    if (atU.priority === 'alta')    pts += 5;     // Bônus por prioridade alta
    if (atU.priority === 'urgente') pts += 15;    // Bônus por prioridade urgente
    if (atU.date >= hoje)           pts += 5;     // Bônus por entregar no prazo
    if (atU.priority === 'urgente' && atU.date >= hoje) pts += 5; // Bônus duplo: urgente + no prazo

    updateStreak(atU.resp); // Atualiza o streak do responsável
    // Adiciona bônus de streak: 1 dia seguido = +0, 2 dias = +1, 3 dias = +2...
    pts += (DB.gamification.streaks[atU.resp] || 1) - 1;

    addPontos(atU.resp, pts, '✅ Tarefa concluída!');
    saveActivityLog(atU.resp, `Concluiu a atividade "${atU.title}"`, 'concluir');
    saveDB();
  }
};

// ── Interceptor de setStatusAtividade ────────────────────────────────────────
// Mesmo padrão para quando o status é alterado via dropdown (não toggle)
const _origSetStatus = window.setStatusAtividade;
window.setStatusAtividade = function(id, status) {
  const at = DB.atividades.find(a => a.id === id);
  const wasNotConcluida = at && at.status !== 'concluida';
  _origSetStatus(id, status); // Executa o original
  if (status === 'concluida' && wasNotConcluida && at) {
    const hoje = new Date().toISOString().split('T')[0];
    let pts = 10;
    if (at.priority === 'alta')    pts += 5;
    if (at.priority === 'urgente') pts += 15;
    if (at.date >= hoje)           pts += 5;
    updateStreak(at.resp);
    addPontos(at.resp, pts, '✅ Tarefa concluída!');
    saveActivityLog(at.resp, `Concluiu a atividade "${at.title}"`, 'concluir');
    saveDB();
  }
};

// ── Interceptor de checkItem ──────────────────────────────────────────────────
// Adiciona 2 pontos para o primeiro membro ao marcar item como comprado
const _origCheckItem = window.checkItem;
window.checkItem = function(lIdx, iIdx) {
  _origCheckItem(lIdx, iIdx); // Executa o original
  if (DB.membros.length > 0) addPontos(DB.membros[0].name, 2, '🛒 Item comprado!');
};

// ─── Sistema de logs ──────────────────────────────────────────────────────────
// Ícones e cores para cada tipo de ação no histórico
const LOG_ICONS = {
  criar:     { icon: 'plus-circle',   color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20'  },
  editar:    { icon: 'edit-3',        color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-900/20'        },
  excluir:   { icon: 'trash-2',       color: 'text-red-500',     bg: 'bg-red-50 dark:bg-red-900/20'          },
  concluir:  { icon: 'check-circle',  color: 'text-brand-main',  bg: 'bg-brand-main/10'                      },
  status:    { icon: 'refresh-cw',    color: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-900/20'      },
  foto:      { icon: 'camera',        color: 'text-purple-500',  bg: 'bg-purple-50 dark:bg-purple-900/20'    },
  config:    { icon: 'settings',      color: 'text-slate-500',   bg: 'bg-slate-100 dark:bg-slate-800'        },
  premio:    { icon: 'gift',          color: 'text-rose-500',    bg: 'bg-rose-50 dark:bg-rose-900/20'        },
  conquista: { icon: 'award',         color: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-900/20'      },
  lista:     { icon: 'shopping-cart', color: 'text-cyan-500',    bg: 'bg-cyan-50 dark:bg-cyan-900/20'        },
  receita:   { icon: 'utensils',      color: 'text-orange-500',  bg: 'bg-orange-50 dark:bg-orange-900/20'    },
  membro:    { icon: 'user',          color: 'text-indigo-500',  bg: 'bg-indigo-50 dark:bg-indigo-900/20'    },
  default:   { icon: 'clock',         color: 'text-brand-main',  bg: 'bg-brand-main/10'                      },
};

// ─── saveActivityLog() ────────────────────────────────────────────────────────
// Registra uma ação no histórico local e tenta sincronizar com o servidor.
// Limita o histórico local a 200 entradas para não ocupar muito espaço.
function saveActivityLog(actor, message, tipo) {
  if (!DB.logs) DB.logs = [];
  const entry = {
    id:          Date.now() + Math.random(),
    actor:       actor || 'Sistema',
    description: message,
    tipo:        tipo || 'default',
    created_at:  new Date().toISOString(),
  };
  DB.logs.unshift(entry);                          // Insere no início (mais recente primeiro)
  if (DB.logs.length > 200) DB.logs = DB.logs.slice(0, 200); // Mantém máximo de 200
  saveDB(false); // Salva localmente sem sincronizar (evita loop)
  if (Auth.isLoggedIn()) {
    API.post('logs', { description: `[${actor}] ${message}` }).catch(() => {});
  }
}

// ─── loadLogs() ───────────────────────────────────────────────────────────────
// Carrega os logs: tenta o servidor primeiro, usa os locais como fallback.
async function loadLogs() {
  const container = document.getElementById('logs-container');
  if (!container) return;
  container.innerHTML = `<div class="text-center py-8 text-slate-400">
    <i data-lucide="loader" class="w-6 h-6 mx-auto mb-2 animate-spin opacity-50"></i>
    <p class="text-sm">Carregando...</p>
  </div>`;
  lucide.createIcons({ nodes: [container] });
  if (Auth.isLoggedIn()) {
    try {
      const res = await API.get('logs');
      if (res.ok && res.data && res.data.length > 0) {
        const backendLogs = res.data.map(l => ({
          id:          l.id || Date.now() + Math.random(),
          actor:       'Sistema',
          description: l.description,
          tipo:        detectTipo(l.description),
          created_at:  l.created_at,
        }));
        renderLogsHTML(container, backendLogs);
        return;
      }
    } catch (_) {}
  }
  const localLogs = DB.logs || [];
  if (localLogs.length === 0) {
    container.innerHTML = `<div class="text-center py-12 text-slate-400">
      <i data-lucide="inbox" class="w-10 h-10 mx-auto mb-3 opacity-30"></i>
      <p class="font-medium text-sm">Nenhuma ação registrada ainda.</p>
    </div>`;
    lucide.createIcons({ nodes: [container] });
    return;
  }
  renderLogsHTML(container, localLogs);
}

// Detecta o tipo do log analisando as palavras-chave da descrição
function detectTipo(description) {
  const d = (description || '').toLowerCase();
  if (d.includes('criou') || d.includes('adicionou'))   return 'criar';
  if (d.includes('editou') || d.includes('atualizado')) return 'editar';
  if (d.includes('excluiu') || d.includes('removeu'))   return 'excluir';
  if (d.includes('concluída') || d.includes('concluiu'))return 'concluir';
  if (d.includes('foto') || d.includes('imagem'))       return 'foto';
  if (d.includes('status'))                             return 'status';
  if (d.includes('receita'))                            return 'receita';
  if (d.includes('lista'))                              return 'lista';
  if (d.includes('membro'))                             return 'membro';
  if (d.includes('configuração'))                       return 'config';
  if (d.includes('prêmio') || d.includes('resgatou'))  return 'premio';
  return 'default';
}

// Renderiza os logs em HTML com ícone, descrição e tempo relativo
function renderLogsHTML(container, logs) {
  const timeAgo = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (m < 1)  return 'agora mesmo';
    if (m < 60) return `há ${m} min`;
    if (h < 24) return `há ${h}h`;
    if (d < 7)  return `há ${d} dia${d > 1 ? 's' : ''}`;
    return new Date(iso).toLocaleDateString('pt-BR');
  };
  const formatDate = (iso) => {
    try { return new Date(iso).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
    catch { return iso; }
  };
  container.innerHTML = logs.slice(0, 50).map(log => {
    const tipo  = LOG_ICONS[log.tipo] || LOG_ICONS.default;
    const ago   = timeAgo(log.created_at);
    const full  = formatDate(log.created_at);
    const desc  = (log.description || '').replace(/^\[.*?\]\s*/, '');
    const actor = log.actor && log.actor !== 'Sistema' ? log.actor : '';
    return `<div class="flex items-start gap-3 p-4 bg-panel-light dark:bg-panel-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm hover:shadow-md transition-shadow">
      <div class="p-2 ${tipo.bg} rounded-lg flex-shrink-0 mt-0.5">
        <i data-lucide="${tipo.icon}" class="w-4 h-4 ${tipo.color}"></i>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-[13px] font-medium text-slate-700 dark:text-slate-200">${desc}</p>
        ${actor ? `<p class="text-[11px] text-slate-400 mt-0.5">👤 ${actor}</p>` : ''}
      </div>
      <div class="text-right flex-shrink-0">
        <p class="text-[11px] font-medium text-slate-400" title="${full}">${ago}</p>
      </div>
    </div>`;
  }).join('');
  lucide.createIcons({ nodes: [container] });
}
