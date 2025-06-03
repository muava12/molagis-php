export function initThemeToggle() {
    const bootstrap = window.tabler?.bootstrap;
    const themeToggle = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;

    if (!themeToggle) return;

    const savedTheme = localStorage.getItem('theme') || 'light';
    htmlElement.setAttribute('data-bs-theme', savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-bs-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        htmlElement.setAttribute('data-bs-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        const tooltipInstance = bootstrap.Tooltip.getInstance(themeToggle);
        if (tooltipInstance) {
            tooltipInstance.hide();
        }
        themeToggle.blur(); // Add this line to remove focus
    });
}