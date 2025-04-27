import { initThemeToggle } from './theme.js';
import { initLogout } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initLogout();
});