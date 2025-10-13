document.addEventListener('DOMContentLoaded', () => {
    const themeSwitcher = document.getElementById('theme-switcher');
    const themeIcon = themeSwitcher ? themeSwitcher.querySelector('i') : null;
    const body = document.body;

    /**
     * Aplica o tema selecionado ao corpo do documento e o salva no localStorage.
     * @param {string} theme - O tema a ser aplicado ('dark' ou 'light').
     */
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            body.classList.add('dark');
            if(themeIcon) themeIcon.className = 'fas fa-sun';
        } else {
            body.classList.remove('dark');
            if(themeIcon) themeIcon.className = 'fas fa-moon';
        }
        localStorage.setItem('theme', theme);
    };

    if (themeSwitcher) {
        themeSwitcher.addEventListener('click', () => {
            const currentTheme = localStorage.getItem('theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            applyTheme(newTheme);
        });
    }

    // Aplica o tema salvo na carga inicial
    const savedTheme = localStorage.getItem('theme') || 'dark'; // Padrão para escuro
    applyTheme(savedTheme);
});
