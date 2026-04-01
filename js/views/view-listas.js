// =============================================================================
// FAMILYHUB — views/view-listas.js
// View: Listas de Compras
//
// APRESENTAÇÃO:
// Esta view exibe as listas de compras em colunas do tipo "kanban".
// Cada lista tem duas seções: "pendentes" (a comprar) e "carrinho" (comprado).
//
// Interações possíveis por item:
// - Checkbox → checkItem() move para o carrinho (+2 pontos via gamification.js)
// - Checkbox marcado → uncheckItem() devolve para pendentes
// - Botão × → deleteListItem() remove o item
// - Campo + Enter/botão → addListItem() adiciona item à lista
//
// A última coluna é sempre um botão "Nova Lista" que abre o modal.
// =============================================================================
function renderListas() {
  const colunasHTML = DB.listas.map((lista, index) => {
    // Calcula o progresso da lista (itens comprados / total)
    const total = lista.pendentes.length + lista.carrinho.length;
    const pct   = total > 0 ? Math.round((lista.carrinho.length / total) * 100) : 0;

    return `<div class="bg-panel-light dark:bg-panel-dark rounded-2xl shadow-md border border-border-light dark:border-border-dark flex flex-col h-full border-t-[5px] ${lista.border}">

      <!-- ── Cabeçalho da lista com barra de progresso ── -->
      <div class="p-4 border-b border-border-light dark:border-border-dark">
        <div class="flex items-center justify-between mb-2">
          <!-- Ícone e título da lista -->
          <h3 class="font-bold text-[15px] flex items-center gap-2">
            <i data-lucide="${lista.icon || 'shopping-cart'}" class="w-4 h-4 opacity-60"></i>${lista.title}</h3>
          <div class="flex items-center gap-1">
            <!-- Botão de limpar carrinho: só aparece quando há itens comprados -->
            ${lista.carrinho.length > 0
              ? `<button onclick="limparCarrinho(${index})" class="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg hover:bg-emerald-100">Limpar concluídos</button>`
              : ''}
            <!-- Editar lista -->
            <button onclick="openModal('formLista',${lista.id})" class="p-1.5 text-slate-400 hover:text-blue-500 rounded-lg"><i data-lucide="settings-2" class="w-3.5 h-3.5"></i></button>
            <!-- Excluir lista -->
            <button onclick="deleteLista(${index})" class="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
          </div>
        </div>
        <!-- Barra de progresso: verde conforme itens são comprados -->
        <div class="flex items-center gap-2">
          <div class="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div class="h-full bg-emerald-400 rounded-full transition-all duration-500" style="width:${pct}%"></div>
          </div>
          <span class="text-[10px] font-bold text-slate-400">${lista.carrinho.length}/${total}</span>
        </div>
      </div>

      <!-- ── Corpo da lista: itens pendentes e carrinho ── -->
      <div class="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-2">

        <!-- Mensagem quando tudo foi comprado -->
        ${lista.pendentes.length === 0 && lista.carrinho.length > 0
          ? `<div class="text-center py-4 text-slate-400"><i data-lucide="check-circle-2" class="w-7 h-7 mx-auto mb-1.5 text-emerald-400 opacity-60"></i><p class="text-[13px] font-medium">Tudo comprado!</p></div>`
          : ''}

        <!-- Mensagem quando a lista está completamente vazia -->
        ${lista.pendentes.length === 0 && lista.carrinho.length === 0
          ? `<div class="text-center py-6 text-slate-400"><i data-lucide="clipboard-list" class="w-8 h-8 mx-auto mb-2 opacity-20"></i><p class="text-[13px]">Lista vazia</p></div>`
          : ''}

        <!-- Itens pendentes (a comprar) -->
        ${lista.pendentes.map((item, i) =>
          `<div class="flex items-center justify-between p-2.5 rounded-xl border border-border-light dark:border-border-dark hover:border-brand-main bg-white dark:bg-slate-800 transition-all group">
            <label class="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
              <!-- Marcar como comprado → move para o carrinho -->
              <input type="checkbox" onclick="checkItem(${index},${i})" class="w-4 h-4 text-brand-main rounded border-slate-300 flex-shrink-0">
              <span class="text-[14px] font-medium truncate">${item}</span>
            </label>
            <!-- Botão de deletar: visível ao hover -->
            <button onclick="deleteListItem(${index},${i},false)" class="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1 flex-shrink-0"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
          </div>`
        ).join('')}

        <!-- Seção do carrinho (já comprado) — só aparece quando tem itens -->
        ${lista.carrinho.length > 0
          ? `<div class="pt-4 mt-2 border-t border-dashed border-border-light dark:border-border-dark">
              <p class="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <i data-lucide="shopping-cart" class="w-3 h-3"></i> No Carrinho
              </p>
              <div class="space-y-1.5">
                ${lista.carrinho.map((item, i) =>
                  `<div class="flex items-center justify-between p-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-900/10 group">
                    <label class="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 opacity-60 hover:opacity-90">
                      <!-- Desmarcar → devolve para pendentes -->
                      <input type="checkbox" checked onclick="uncheckItem(${index},${i})" class="w-3.5 h-3.5 text-emerald-500 rounded flex-shrink-0">
                      <span class="text-[13px] font-medium line-through text-slate-500 truncate">${item}</span>
                    </label>
                    <button onclick="deleteListItem(${index},${i},true)" class="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 p-0.5 flex-shrink-0"><i data-lucide="x" class="w-3 h-3"></i></button>
                  </div>`
                ).join('')}
              </div>
            </div>`
          : ''}
      </div>

      <!-- ── Rodapé: campo para adicionar novo item ── -->
      <div class="p-3 border-t border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
        <div class="flex items-center gap-2 relative">
          <input type="text" id="add-item-${index}" placeholder="Adicionar item..."
            class="flex-1 pl-3 pr-9 py-2.5 rounded-xl border border-border-light dark:border-border-dark text-[14px] bg-white dark:bg-slate-900 focus:outline-none focus:border-brand-main shadow-sm"
            onkeypress="if(event.key==='Enter') addListItem(${index})"> <!-- Enter também adiciona -->
          <button onclick="addListItem(${index})" class="absolute right-2 text-brand-main hover:bg-brand-main/10 p-1.5 rounded-lg">
            <i data-lucide="plus" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    </div>`;
  }).join('');

  // Grade responsiva: 1 coluna no mobile, 2 no tablet, 3 no desktop
  // A última célula é sempre o botão de criar nova lista
  return `<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 h-[calc(100vh-160px)]">
    ${colunasHTML}
    <!-- Botão "Nova Lista" — sempre a última coluna -->
    <button onclick="openModal('formLista')"
      class="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:text-brand-main hover:border-brand-main hover:bg-brand-main/5 min-h-[200px] transition-all group">
      <div class="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-brand-main/10 flex items-center justify-center mb-3">
        <i data-lucide="plus" class="w-6 h-6"></i>
      </div>
      <p class="font-bold text-sm">Nova Lista</p>
    </button>
  </div>`;
}
