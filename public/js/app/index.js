import { initThemeToggle } from './theme.js';
import { initLogout } from './auth.js';
import { initDashboard } from './dashboard.js';

document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initLogout();
    if (window.location.pathname.includes('/dashboard')) {
        initDashboard();
    }
});