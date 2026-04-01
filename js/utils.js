// =============================================================================
// FAMILYHUB — utils.js
// Funções utilitárias usadas em todo o sistema.
//
// APRESENTAÇÃO:
// Este arquivo concentra funções auxiliares reutilizáveis:
// backup de dados, formatação de datas, upload de imagens,
// e highlight de texto para a busca global.
// =============================================================================

// ─── handleImageUpload() ──────────────────────────────────────────────────────
// Lê uma imagem do input de arquivo e converte para base64 (string de texto).
// O callback recebe a string base64 para uso em <img src="..."> ou salvar no DB.
function handleImageUpload(inputId, callback) {
  const file = document.getElementById(inputId).files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload  = e => callback(e.target.result); // Chama o callback com o base64
  reader.readAsDataURL(file); // Converte a imagem para string base64
}

// ============================================================
//  formatDateLabel() — Rótulos de data amigáveis
//
//  APRESENTAÇÃO:
//  Converte datas no formato "YYYY-MM-DD" em textos que o usuário
//  entende facilmente, sem precisar calcular na cabeça:
//  - Data de hoje → "Hoje"
//  - Data de amanhã → "Amanhã"
//  - Data de ontem → "Ontem"
//  - Demais datas → Nome do dia da semana (Segunda, Terça...)
//
//  Também retorna se a data já passou (past: true) para
//  colorir tarefas atrasadas de vermelho na interface.
// ============================================================
function formatDateLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date   = new Date(y, m - 1, d); // Cria o objeto Date sem fuso horário

  // Cria as datas de referência (zerando horas para comparar só o dia)
  const hoje   = new Date(); hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje); amanha.setDate(hoje.getDate() + 1);
  const ontem  = new Date(hoje); ontem.setDate(hoje.getDate() - 1);

  const fmtBR = dateStr.split('-').reverse().join('/'); // Formato DD/MM/YYYY

  // Compara com hoje, amanhã e ontem
  if (date.toDateString() === hoje.toDateString())   return { label: 'Hoje',   sub: fmtBR, highlight: true,  past: false };
  if (date.toDateString() === amanha.toDateString()) return { label: 'Amanhã', sub: fmtBR, highlight: false, past: false };
  if (date.toDateString() === ontem.toDateString())  return { label: 'Ontem',  sub: fmtBR, highlight: false, past: true  };

  // Para outras datas, retorna o nome do dia da semana
  const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return { label: weekdays[date.getDay()], sub: fmtBR, highlight: false, past: date < hoje };
}

// ─── getTagColor() ────────────────────────────────────────────────────────────
// Retorna as classes CSS de cor para cada categoria de tarefa.
// Usado para colorir os badges de categoria nas atividades.
function getTagColor(cat) {
  const map = {
    'TAREFA DOMÉSTICA': 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400',
    'ESCOLA':           'text-blue-500 bg-blue-50 dark:bg-blue-900/30',
    'ESPORTE':          'text-orange-500 bg-orange-50 dark:bg-orange-900/30',
    'SAÚDE':            'text-red-500 bg-red-50 dark:bg-red-900/30',
    'SOCIAL':           'text-purple-500 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400',
  };
  return map[cat] || 'text-slate-500 bg-slate-100'; // Cor padrão se categoria não mapeada
}

// ─── highlight() ──────────────────────────────────────────────────────────────
// Envolve o trecho que coincide com a busca em uma tag <mark> amarela.
// Usado nos resultados da busca global para destacar o texto encontrado.
function highlight(text, query) {
  if (!query) return text;
  // Escapa caracteres especiais de regex para busca segura
  const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(re, '<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">$1</mark>');
}

// ─── getLevel() ───────────────────────────────────────────────────────────────
// Retorna o nível do membro baseado na quantidade de pontos.
// Percorre a tabela LEVELS de trás para frente e retorna o primeiro
// nível cujo mínimo seja menor ou igual aos pontos do membro.
function getLevel(pts) {
  return LEVELS.slice().reverse().find(l => pts >= l.min) || LEVELS[0];
}

// ============================================================
//  exportarDados() — Exportar backup em JSON
//
//  APRESENTAÇÃO:
//  Exporta todos os dados da família (atividades, membros,
//  listas, pontos etc.) em um arquivo .json com a data atual
//  no nome. O usuário pode salvar como backup e importar depois.
//
//  Usa a API de Blob do navegador para criar o arquivo em memória
//  e simula um clique num link de download — tudo no frontend,
//  sem precisar de servidor.
// ============================================================
function exportarDados() {
  const a = document.createElement('a');
  // Cria o arquivo em memória com os dados formatados
  a.href = URL.createObjectURL(
    new Blob([JSON.stringify(DB, null, 2)], { type: 'application/json' })
  );
  // Nome do arquivo com a data atual: familyhub-backup-2025-06-15.json
  a.download = `familyhub-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click(); // Simula o clique para iniciar o download
  toast('Backup exportado!', 'success');
}

// ============================================================
//  importarDados() — Importar backup JSON
//
//  APRESENTAÇÃO:
//  Lê o arquivo .json selecionado pelo usuário, valida se é um
//  backup válido do FamilyHub (verifica campos obrigatórios) e
//  pede confirmação antes de substituir todos os dados atuais.
//
//  A validação básica evita que o usuário importe um arquivo
//  errado por engano e perca todos os dados.
// ============================================================
function importarDados(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      // Validação básica: verifica se o arquivo tem os campos essenciais
      if (!data.atividades || !data.membros) throw new Error('inválido');
      // Pede confirmação antes de sobrescrever os dados atuais
      confirmDialog('Substituir todos os dados pelo backup?', () => {
        DB = data; saveDB(); renderApp();
        toast('Backup importado!', 'success');
      });
    } catch {
      toast('Arquivo inválido ou corrompido.', 'error');
    }
  };
  reader.readAsText(file); // Lê o arquivo como texto (JSON é texto)
  input.value = ''; // Limpa o input para permitir importar o mesmo arquivo novamente
}

// ─── limparAtividades() ───────────────────────────────────────────────────────
// Remove todas as atividades concluídas do sistema após confirmação.
function limparAtividades() {
  const count = DB.atividades.filter(a => a.status === 'concluida').length;
  if (count === 0) { toast('Nenhuma atividade concluída.', 'info'); return; }
  confirmDialog(`Remover ${count} atividade${count > 1 ? 's' : ''} concluída${count > 1 ? 's' : ''}?`, () => {
    DB.atividades = DB.atividades.filter(a => a.status !== 'concluida');
    saveDB(); renderApp(); toast(`${count} removida${count > 1 ? 's' : ''}.`);
  });
}

// ─── resetarSistema() ─────────────────────────────────────────────────────────
// Apaga TODOS os dados e restaura o sistema ao estado inicial.
// Pede confirmação dupla implícita pela mensagem de aviso.
function resetarSistema() {
  confirmDialog('ATENÇÃO: Isso apagará TODOS os dados desta conta. Tem certeza?', () => {
    const k = window._dbStorageKey || 'familyHubDB';
    localStorage.removeItem(k);         // Apaga do localStorage
    DB = JSON.parse(JSON.stringify(emptyDB)); // Restaura estrutura vazia
    window._dbStorageKey = k;
    saveDB(); renderApp(); toast('Sistema resetado.', 'warning');
  });
}
