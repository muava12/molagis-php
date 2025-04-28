/*
 * File: auth.js
 * Description: Logika untuk autentikasi, termasuk logout dan toggle password pada halaman login.
 */

export function initPasswordToggle() {
    const toggleButton = document.querySelector('.input-group-text .link-secondary');
    const passwordInput = document.getElementById('password');

    if (!toggleButton || !passwordInput) {
        console.warn('Password toggle elements not found');
        return;
    }

    // Simpan SVG untuk ikon show dan hide
    const showIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icon-tabler-eye">
            <path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"></path>
            <path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6"></path>
        </svg>
    `;
    const hideIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icon-tabler-eye-off">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
            <path d="M10.585 10.587a2 2 0 0 0 2.829 2.828"/>
            <path d="M16.681 16.673a8.717 8.717 0 0 1 -4.681 1.327c-3.6 0 -6.6 -2 -9 -6c1.272 -2.12 2.712 -3.678 4.32 -4.674m2.86 -1.146a9.055 9.055 0 0 1 1.82 -.18c3.6 0 6.6 2 9 6c-.666 1.11 -1.379 2.067 -2.138 2.87"/>
            <path d="M3 3l18 18"/>
        </svg>
    `;

    toggleButton.addEventListener('click', (e) => {
        e.preventDefault(); // Mencegah navigasi default dari <a href="#">
        
        // Toggle tipe input
        const isPasswordVisible = passwordInput.type === 'text';
        passwordInput.type = isPasswordVisible ? 'password' : 'text';
        
        // Toggle ikon
        toggleButton.innerHTML = isPasswordVisible ? showIcon : hideIcon;
        
        // Perbarui tooltip
        toggleButton.setAttribute('data-bs-original-title', isPasswordVisible ? 'Show password' : 'Hide password');
    });
}

// Inisialisasi fungsi saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    // initLogout();
    initPasswordToggle();
});