export function initLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/index.php?action=logout', { 
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            if (response.ok) {
                window.location.href = '/index.php?action=login';
            } else {
                throw new Error('Gagal logout dari server');
            }
        } catch (error) {
            console.error('Error logging out:', error);
            // Fallback untuk kasus offline: hapus cookie session di client dan redirect
            document.cookie = 'PHPSESSID=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
            window.location.href = '/index.php?action=login';
        }
    });
}