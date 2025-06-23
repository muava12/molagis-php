function initThemeToggle() {
    const bootstrap = window.tabler?.bootstrap;
    const themeToggle = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;

    if (!themeToggle) return;

    const savedTheme = localStorage.getItem('theme') || 'dark';
    htmlElement.setAttribute('data-bs-theme', savedTheme);

    themeToggle.addEventListener('click', (e) => {
        e.preventDefault();
        const currentTheme = htmlElement.getAttribute('data-bs-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        htmlElement.setAttribute('data-bs-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });
}

// Langsung panggil fungsi saat skrip dimuat
initThemeToggle();