export function initLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/index.php?action=logout', { method: 'POST' });
            if (response.ok) {
                window.location.href = '/index.php?action=login';
            } else {
                alert('Gagal logout. Silakan coba lagi.');
            }
        } catch (error) {
            console.error('Error logging out:', error);
            alert('Gagal logout. Silakan coba lagi.');
        }
    });
}