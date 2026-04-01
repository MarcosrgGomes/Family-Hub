// =============================================================================
// FAMILYHUB — search.js
// Busca global com dropdown em tempo real
//
// APRESENTAÇÃO:
// Este arquivo implementa a busca global do header — aquela caixinha
// com a lupa que procura em todo o sistema ao mesmo tempo.
//
// Como funciona:
// 1. initGlobalSearch() configura os listeners de evento uma única vez
// 2. Enquanto o usuário digita (event "input"), renderSearchDropdown() é chamada
// 3. O dropdown exibe resultados agrupados por seção (atividades, receitas, membros)
// 4. Clicando em um resultado, navega para a tela correspondente e fecha o dropdown
// 5. Tecla Escape ou clique fora fecha o dropdown
// =============================================================================

// ─── initGlobalSearch() ───────────────────────────────────────────────────────
// Chamada uma única vez no boot do sistema (app.js — DOMContentLoaded).
// Configura três eventos no campo de busca:
// 1. "input" → dispara a busca a cada tecla digitada (mínimo 2 caracteres)
// 2. "keydown" → Escape limpa e fecha o dropdown
// 3. "click" no documento → clique fora fecha o dropdown
function initGlobalSearch() {
  const input = document.getElementById('global-search');
  if (!input) return; // Segurança: campo pode não existir na tela de login

  // Abre/atualiza o dropdown enquanto o usuário digita
  input.addEventListener('input', (e) => {
    globalSearch = e.target.value.trim();
    // Só busca quando tiver pelo menos 2 caracteres (evita resultados demais)
    if (globalSearch.length >= 2) renderSearchDropdown(globalSearch);
    else closeSearchDropdown();
  });

  // Tecla Escape limpa tudo e fecha
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSearchDropdown();
      input.value = '';
      globalSearch = '';
    }
  });

  // Clique fora do campo ou do dropdown fecha o dropdown
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#global-search') && !e.target.closest('#search-dropdown'))
      closeSearchDropdown();
  });
}

// ─── renderSearchDropdown() ───────────────────────────────────────────────────
// Cria ou atualiza o dropdown com os resultados da busca.
// Busca em 3 seções ao mesmo tempo:
//   - Atividades: pelo título, responsável e notas
//   - Receitas: pelo nome e categoria
//   - Membros: pelo nome e parentesco
//
// O highlight() envolve o trecho encontrado em <mark> amarelo
// para facilitar a visualização de onde o texto foi encontrado.
function renderSearchDropdown(query) {
  const q = query.toLowerCase(); // Converte para minúsculo para busca case-insensitive

  // Cria ou reutiliza o elemento do dropdown
  let existing = document.getElementById('search-dropdown');
  if (!existing) {
    existing = document.createElement('div');
    existing.id = 'search-dropdown';
    existing.className = 'absolute top-full left-0 right-0 mt-2 bg-panel-light dark:bg-panel-dark rounded-2xl shadow-2xl border border-border-light dark:border-border-dark z-50 max-h-[420px] overflow-y-auto custom-scrollbar';
    // Posiciona o dropdown relativo ao campo de busca
    document.querySelector('#global-search').parentElement.appendChild(existing);
    document.querySelector('#global-search').parentElement.style.position = 'relative';
  }

  // Busca em cada seção com limite de resultados para não poluir o dropdown
  const results = {
    atividades: DB.atividades.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.resp.toLowerCase().includes(q) ||
      (a.notes || '').toLowerCase().includes(q)
    ).slice(0, 5), // Máximo 5 atividades

    receitas: DB.receitas.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.tag.toLowerCase().includes(q)
    ).slice(0, 3), // Máximo 3 receitas

    membros: DB.membros.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q)
    ).slice(0, 3), // Máximo 3 membros
  };

  const total = results.atividades.length + results.receitas.length + results.membros.length;

  // Nenhum resultado encontrado: exibe mensagem amigável
  if (total === 0) {
    existing.innerHTML = `<div class="p-5 text-center text-slate-400 text-sm">
      <i data-lucide="search-x" class="w-6 h-6 mx-auto mb-2 opacity-40"></i>
      <p>Nenhum resultado para "<b>${query}</b>"</p>
    </div>`;
    lucide.createIcons({ nodes: [existing] });
    return;
  }

  let html = `<div class="p-2">`;

  // ── Seção Atividades ─────────────────────────────────────
  if (results.atividades.length) {
    html += `<p class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-3 py-1.5">Atividades</p>`;
    results.atividades.forEach(a => {
      const st = statusConfig[a.status]; // Ícone e cor do status
      html += `<button onclick="changeView('atividades'); closeSearchDropdown(); document.getElementById('global-search').value=''"
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group">
        <span class="w-7 h-7 rounded-lg flex items-center justify-center ${st.color} flex-shrink-0">
          <i data-lucide="${st.icon}" class="w-3.5 h-3.5"></i>
        </span>
        <div class="flex-1 min-w-0">
          <p class="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">${highlight(a.title, q)}</p>
          <p class="text-[11px] text-slate-400">${a.date.split('-').reverse().join('/')} · ${a.resp}</p>
        </div></button>`;
    });
  }

  // ── Seção Receitas ───────────────────────────────────────
  if (results.receitas.length) {
    html += `<p class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-3 py-1.5 mt-1">Receitas</p>`;
    results.receitas.forEach(r => {
      html += `<button onclick="changeView('receitas'); closeSearchDropdown(); document.getElementById('global-search').value=''"
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left">
        <span class="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
          <i data-lucide="chef-hat" class="w-3.5 h-3.5 text-orange-500"></i></span>
        <div class="flex-1 min-w-0">
          <p class="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">${highlight(r.title, q)}</p>
          <p class="text-[11px] text-slate-400">${r.tag} · ${r.time}</p>
        </div></button>`;
    });
  }

  // ── Seção Membros ────────────────────────────────────────
  if (results.membros.length) {
    html += `<p class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-3 py-1.5 mt-1">Membros</p>`;
    results.membros.forEach(m => {
      html += `<button onclick="changeView('membros'); closeSearchDropdown(); document.getElementById('global-search').value=''"
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left">
        <img src="${m.photo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(m.name)}" class="w-7 h-7 rounded-full object-cover flex-shrink-0">
        <div class="flex-1 min-w-0">
          <p class="text-[13px] font-semibold text-slate-800 dark:text-slate-100">${highlight(m.name, q)}</p>
          <p class="text-[11px] text-slate-400">${m.role}</p>
        </div></button>`;
    });
  }

  html += `</div>`;
  existing.innerHTML = html;
  lucide.createIcons({ nodes: [existing] });
}

// ─── closeSearchDropdown() ────────────────────────────────────────────────────
// Remove o elemento do dropdown do DOM completamente.
// Chamada ao fechar (Escape, clique fora, navegação para resultado).
function closeSearchDropdown() {
  const el = document.getElementById('search-dropdown');
  if (el) el.remove(); // Remove completamente em vez de apenas esconder
}
