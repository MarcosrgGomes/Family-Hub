// =============================================================================
// FAMILYHUB — login-theme.js
// Configuração do Tailwind CSS para a tela de login
// =============================================================================

// Executado antes do DOM para evitar flash de tema errado
if (typeof tailwind !== 'undefined') {
  tailwind.config = {
    darkMode: 'class',
    theme: {
      extend: {
        fontFamily: { sans: ['Outfit', 'sans-serif'] },
        colors: {
          brand: {
            light: '#6db09d',
            main:  '#438370',
            dark:  '#2c5c4e',
          },
          bg: {
            light: '#f0f7f4',
            dark:  '#0a1628',
          },
          panel: {
            light: '#ffffff',
            dark:  '#1a2744',
          },
          border: {
            light: '#d1e8e0',
            dark:  '#2d4a6b',
          },
        },
      },
    },
  };
}
