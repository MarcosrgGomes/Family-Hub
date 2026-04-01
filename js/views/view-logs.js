// =============================================================================
// FAMILYHUB — views/view-logs.js
// View: Histórico de Alterações
//
// APRESENTAÇÃO:
// Esta view exibe o histórico de todas as ações realizadas no sistema:
// criar atividade, concluir tarefa, editar membro, resgatar prêmio, etc.
//
// A renderização dos logs reais é assíncrona — feita por loadLogs()
// (gamification.js) após o HTML base ser inserido. Por isso o container
// começa com um spinner de carregamento.
//
// Prioridade dos logs:
//   1. Logs do servidor (backend PHP) — mais confiáveis e completos
//   2. Logs locais do DB.logs — fallback quando offline
// =============================================================================
function renderLogs() {
  const totalLogs = (DB.logs || []).length;

  return `<div class="max-w-3xl mx-auto space-y-6">
    <!-- ── Cabeçalho com contador e botões ── -->
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-2xl font-bold">Histórico de Alterações</h2>
        <!-- Exibe quantas ações foram registradas, com plural correto -->
        <p class="text-slate-400 text-sm mt-1">${
          totalLogs > 0
            ? `${totalLogs} ação${totalLogs > 1 ? 'ões' : ''} registrada${totalLogs > 1 ? 's' : ''}`
            : 'Últimas ações registradas no sistema'
        }</p>
      </div>
      <div class="flex gap-2">
        <!-- Botão de limpar: só aparece se tiver logs -->
        ${totalLogs > 0 ? `<button onclick="confirmDialog('Limpar todo o histórico?', () => { DB.logs=[]; saveDB(false); loadLogs(); })"
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 font-bold text-sm transition-colors">
          <i data-lucide="trash-2" class="w-4 h-4"></i> Limpar
        </button>` : ''}
        <!-- Botão de atualizar: re-executa loadLogs() para buscar do servidor -->
        <button onclick="loadLogs()"
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-main/10 text-brand-main hover:bg-brand-main/20 font-bold text-sm transition-colors">
          <i data-lucide="refresh-cw" class="w-4 h-4"></i> Atualizar
        </button>
      </div>
    </div>

    <!-- ── Container dos logs ── -->
    <!-- Começa com spinner. loadLogs() (gamification.js) substitui este conteúdo
         quando os logs carregarem (do servidor ou do localStorage). -->
    <div id="logs-container" class="space-y-3">
      <div class="text-center py-12 text-slate-400">
        <i data-lucide="loader" class="w-8 h-8 mx-auto mb-3 opacity-30 animate-spin"></i>
        <p class="font-medium text-sm">Carregando histórico...</p>
      </div>
    </div>
  </div>`;
}
