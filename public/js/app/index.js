import { initThemeToggle } from './theme.js';
import { initLogout } from './header.js';

document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initLogout();
});