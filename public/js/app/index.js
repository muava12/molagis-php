import { initThemeToggle } from './theme.js';
import { initLogout } from './header.js';

document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initLogout();
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed: ', error);
            });
    });
}