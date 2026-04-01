// =============================================================================
// FAMILYHUB — views/view-configuracoes.js
// =============================================================================

// =============================================================================
// 14. VIEW — CONFIGURAÇÕES
// =============================================================================
function renderConfiguracoes() {
  const totalAtv = DB.atividades.length;
  const totalRec = DB.receitas.length;
  const totalMem = DB.membros.length;
  const dbSize   = Math.round(JSON.stringify(DB).length/1024*10)/10;
  return `<div class="max-w-3xl space-y-6 pb-10">
    <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-7 shadow-sm border border-border-light dark:border-border-dark">
      <h3 class="text-base font-bold mb-5 border-b border-border-light dark:border-border-dark pb-4 flex items-center gap-2">
        <i data-lucide="home" class="w-5 h-5 text-brand-main"></i> Conta da Família</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nome da Família</label>
          <input type="text" id="cfg-name" value="${DB.settings.familyName}"
            class="w-full px-4 py-3 rounded-xl border border-border-light dark:border-border-dark bg-bg-light dark:bg-slate-900 focus:border-brand-main focus:ring-1 focus:ring-brand-main outline-none text-sm"></div>
        <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">E-mail Principal</label>
          <input type="email" id="cfg-email" value="${DB.settings.email}"
            class="w-full px-4 py-3 rounded-xl border border-border-light dark:border-border-dark bg-bg-light dark:bg-slate-900 focus:border-brand-main focus:ring-1 focus:ring-brand-main outline-none text-sm"></div>
      </div>
      <div class="mb-6">
        <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Foto da Família</label>
        <div class="flex items-center gap-5">
          <div class="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border-2 border-border-light flex-shrink-0">
            <img id="cfg-photo-preview" src="${DB.settings.photo||'https://via.placeholder.com/150'}" class="w-full h-full object-cover"></div>
          <div><input type="file" id="cfg-photo-file" accept="image/png, image/jpeg"
            class="text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-main/10 file:text-brand-main hover:file:bg-brand-main/20 cursor-pointer"
            onchange="handleImageUpload('cfg-photo-file', b => document.getElementById('cfg-photo-preview').src = b)">
          <p class="text-[11px] text-slate-400 mt-1.5">JPG ou PNG, máx 2MB</p></div>
        </div>
      </div>
      <button onclick="saveSettings()" class="bg-brand-main text-white px-6 py-2.5 rounded-xl font-bold hover:bg-brand-dark transition-colors shadow-md text-sm">Salvar Configurações</button>
    </div>
    <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-7 shadow-sm border border-border-light dark:border-border-dark flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div class="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <i data-lucide="${isDarkMode?'moon':'sun'}" class="w-5 h-5 text-slate-600 dark:text-slate-300"></i></div>
        <div><h3 class="font-bold">Modo ${isDarkMode?'Escuro':'Claro'}</h3>
          <p class="text-xs text-slate-500 mt-0.5">${isDarkMode?'Descansa os olhos à noite.':'Interface clara e limpa.'}</p></div>
      </div>
      <button onclick="toggleDarkMode()" class="w-12 h-6 rounded-full ${isDarkMode?'bg-brand-main':'bg-slate-300'} relative transition-colors duration-300 shadow-inner flex-shrink-0">
        <div class="w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 ${isDarkMode?'left-7':'left-1'} shadow"></div>
      </button>
    </div>
    <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-7 shadow-sm border border-border-light dark:border-border-dark">
      <h3 class="text-base font-bold mb-5 border-b border-border-light dark:border-border-dark pb-4 flex items-center gap-2">
        <i data-lucide="bar-chart-2" class="w-5 h-5 text-brand-main"></i> Dados do Sistema</h3>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        ${[{icon:'check-square',label:'Atividades',val:totalAtv,color:'text-brand-main'},{icon:'users',label:'Membros',val:totalMem,color:'text-blue-500'},{icon:'chef-hat',label:'Receitas',val:totalRec,color:'text-orange-500'},{icon:'database',label:'Armazenado',val:`${dbSize}kb`,color:'text-purple-500'}]
          .map(s=>`<div class="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <i data-lucide="${s.icon}" class="w-5 h-5 mx-auto mb-2 ${s.color}"></i>
            <p class="text-xl font-black ${s.color}">${s.val}</p>
            <p class="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mt-0.5">${s.label}</p>
          </div>`).join('')}
      </div>
      <div class="flex flex-wrap gap-3">
        <button onclick="exportarDados()" class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold text-sm hover:bg-blue-100">
          <i data-lucide="download" class="w-4 h-4"></i> Exportar Backup</button>
        <label class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm hover:bg-emerald-100 cursor-pointer">
          <i data-lucide="upload" class="w-4 h-4"></i> Importar Backup
          <input type="file" accept=".json" class="hidden" onchange="importarDados(this)"></label>
        <button onclick="changeView('estatisticas')" class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 font-bold text-sm hover:bg-purple-100">
          <i data-lucide="bar-chart-2" class="w-4 h-4"></i> Ver Estatísticas</button>
      </div>
    </div>
    <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-7 shadow-sm border border-red-200 dark:border-red-900/40">
      <h3 class="text-base font-bold mb-4 flex items-center gap-2 text-red-600">
        <i data-lucide="triangle-alert" class="w-5 h-5"></i> Zona de Perigo</h3>
      <div class="flex flex-wrap gap-3">
        <button onclick="limparAtividades()" class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 font-bold text-sm hover:bg-red-100">
          <i data-lucide="check-circle" class="w-4 h-4"></i> Limpar Atividades Concluídas</button>
        <button onclick="resetarSistema()" class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600">
          <i data-lucide="rotate-ccw" class="w-4 h-4"></i> Resetar Sistema</button>
      </div>
    </div>
  </div>`;
}