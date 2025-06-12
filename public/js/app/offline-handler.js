/**
 * Offline Handler - Menangani deteksi koneksi internet dan menampilkan offline state
 * Hanya menampilkan offline state saat ada attempt navigasi/reload
 */

class OfflineHandler {
    constructor() {
        this.isOffline = false;
        this.connectionLost = false; // Track jika koneksi putus tapi belum show offline state
        this.originalContent = null;
        this.offlineTemplate = null;
        this.indicatorElement = document.getElementById('connection-indicator');
        this.init();
    }

    init() {
        // Event listeners untuk online/offline
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleConnectionLost());
        
        // Intercept navigasi dan reload dari awal
        this.interceptNavigationAttempts();

        // Periodic check untuk memastikan koneksi benar-benar tersedia
        setInterval(() => this.checkConnection(), 30000); // Cek setiap 30 detik
    }

    handleConnectionLost() {
        if (this.indicatorElement) { this.indicatorElement.className = 'connection-indicator offline'; }
        this.connectionLost = true;
        console.log('Connection lost - waiting for navigation attempt');
    }

    async checkConnection() {
        try {
            // Coba fetch ke endpoint yang ringan dengan timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch('/api/ping', {
                method: 'HEAD',
                cache: 'no-cache',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            // Jika berhasil dan sedang offline, kembalikan ke online
            if (this.isOffline) {
                this.handleOnline();
            } else if (this.connectionLost) {
                // Koneksi kembali normal, reset flag
                this.connectionLost = false;
                console.log('Connection restored');
            }
        } catch (error) {
            console.log('Connection check failed:', error.message);
            // Set flag bahwa koneksi bermasalah
            this.connectionLost = true;
        }
    }

    // Method ini dipanggil saat ada attempt navigasi dan koneksi bermasalah
    async handleOffline() {
        if (this.isOffline) return; // Sudah offline
        
        this.isOffline = true;
        console.log('Showing offline state due to navigation attempt');
        
        // Simpan konten asli
        this.originalContent = document.body.innerHTML;
        
        // Load template offline
        await this.loadOfflineTemplate();
        
        // Ganti konten dengan offline state
        this.showOfflineState();
    }

    handleOnline() {
        if (this.indicatorElement) {
            this.indicatorElement.className = 'connection-indicator online';
            // The CSS animation will handle fade-out and then set display:none
            // However, to ensure it's properly reset for next time:
            setTimeout(() => {
                if (this.indicatorElement) { // Check again in case element is gone
                    this.indicatorElement.className = 'connection-indicator'; // Reset classes, hide it
                }
            }, 3000); // Match CSS animation duration
        }
        if (!this.isOffline && !this.connectionLost) return; // Sudah online
        
        this.isOffline = false;
        this.connectionLost = false;
        console.log('Connection restored');
        
        // Kembalikan konten asli atau reload halaman
        if (this.originalContent) {
            document.body.innerHTML = this.originalContent;
            this.originalContent = null;
            
            // Re-initialize event listeners jika diperlukan
            this.reinitializeScripts();
        } else {
            // Fallback: reload halaman
            window.location.reload();
        }
    }

    // Intercept navigasi attempts dari awal (sebelum offline state ditampilkan)
    interceptNavigationAttempts() {
        // Intercept link clicks
        document.addEventListener('click', async (e) => {
            if (e.target.tagName === 'A' && this.connectionLost && !this.isOffline) {
                e.preventDefault();
                console.log('Navigation attempt detected while offline - showing offline state');
                await this.handleOffline();
                return false;
            }
        });

        // Intercept form submissions
        document.addEventListener('submit', async (e) => {
            if (this.connectionLost && !this.isOffline) {
                e.preventDefault();
                console.log('Form submission attempt detected while offline - showing offline state');
                await this.handleOffline();
                return false;
            }
        });

        // Override window.location methods
        // const originalReload = window.location.reload; // Removed
        // const originalAssign = window.location.assign; // Removed
        // const originalReplace = window.location.replace; // Removed

        // window.location.reload override removed
        // window.location.assign override removed
        // window.location.replace override removed

        // Intercept history navigation / page reload attempts
        if (this.beforeUnloadHandler) { // Remove existing if any
            window.removeEventListener('beforeunload', this.beforeUnloadHandler);
        }
        this.beforeUnloadHandler = async (e) => {
            if (this.connectionLost && !this.isOffline) {
                console.log('Page unload/reload attempt detected (beforeunload) while connectionLost - showing offline state');
                e.preventDefault();
                await this.handleOffline();
                // e.returnValue = 'Changes you made may not be saved.'; // Example if prompt was needed
            }
        };
        window.addEventListener('beforeunload', this.beforeUnloadHandler);
    }

    async loadOfflineTemplate() {
        if (this.offlineTemplate) return; // Sudah dimuat
        
        try {
            const response = await fetch('/offline-template');
            if (response.ok) {
                this.offlineTemplate = await response.text();
            } else {
                // Fallback template jika endpoint tidak tersedia
                this.offlineTemplate = this.getFallbackTemplate();
            }
        } catch (error) {
            console.error('Failed to load offline template:', error);
            this.offlineTemplate = this.getFallbackTemplate();
        }
    }

    showOfflineState() {
        if (!this.offlineTemplate) {
            this.offlineTemplate = this.getFallbackTemplate();
        }
        
        document.body.innerHTML = this.offlineTemplate;
        
        // Tambahkan event listener untuk tombol "Coba Lagi"
        const retryButton = document.querySelector('.btn-retry');
        if (retryButton) {
            retryButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleRetryClick();
            });
        }
        
        // Intercept semua navigasi saat offline state ditampilkan
        this.interceptNavigationInOfflineState();
    }

    handleRetryClick() {
        console.log('Retry button clicked - checking connection...');
        this.checkConnection();
    }

    // Intercept navigasi saat sudah dalam offline state
    interceptNavigationInOfflineState() {
        // Store handlers for later removal
        this.offlineClickHandler = (e) => {
            if (this.isOffline && e.target.tagName === 'A') {
                e.preventDefault();
                console.log('Navigation blocked - still offline');
                return false;
            }
        };

        this.offlineSubmitHandler = (e) => {
            if (this.isOffline) {
                e.preventDefault();
                console.log('Form submission blocked - still offline');
                return false;
            }
        };

        // Intercept semua link clicks
        document.addEventListener('click', this.offlineClickHandler);

        // Intercept form submissions
        document.addEventListener('submit', this.offlineSubmitHandler);

        // window.location.reload override removed from here
    }

    getFallbackTemplate() {
        return `
            <div class="page-wrapper">
                <div class="page-body">
                    <div class="container-tight py-4">
                        <div class="empty">
                            <div class="empty-img">
                                <svg width="250" height="250" viewBox="0 0 1024 1024" class="icon" version="1.1" xmlns="http://www.w3.org/2000/svg" style="margin: auto; display: block; margin-bottom: 1rem;">
                                    <path d="M249.756098 671.843902c24.775805 41.714263 23.179863 65.00402 13.259551 81.590322s-13.956371 36.724137 4.400702 40.115825c18.357073 3.391688 66.257795-5.794341 83.525932-32.096156 17.268137-26.299317 7.340332-56.702127 41.177288-79.364995" fill="#54C6D5" />
                                    <path d="M755.429776 593.318088c-18.998946 70.723434-88.755824 161.302478-247.355942 165.940449H384.836683c-67.721366 0-121.910946-20.3776-155.665483-56.81202-6.895766-7.440234-18.911532-25.669932-22.900137-37.655727s-6.191454-19.156293-2.919648-27.922731c-8.102088-5.681951-21.6064-16.776117-26.90123-32.036215-5.9392-17.12078-3.87122-32.802966-3.311765-41.109854s1.268761-18.996449 3.311765-30.21799C192.659356 444.443473 275.668293 379.629268 369.032117 379.629268h24.308761c78.538302 0 167.361561 70.88078 183.653151 167.491434 1.883161 11.186576 10.150088 54.89639 17.425483 62.961015 22.797737 25.287805 75.166595 27.223415 100.347005 4.328273 3.496585-3.181893 8.20199-7.729951 14.113717-13.641678a19.992976 19.992976 0 0 0 5.137483-19.428527c-1.266263-4.605502-2.347707-7.899785-3.241834-9.887844-1.620917-3.356722-4.058537-13.664156-14.201132-23.477073-10.140098-9.815415-43.302712-25.172917-36.824039-30.0032 1.04398-0.779239 6.096546-3.856234 14.500839-5.527102 35.04078-6.978185 55.033756 18.334595 62.179278 28.082575 0.779239 1.063961 1.531005 2.122927 2.257795 3.171903 0.709307-1.051473 1.448585-2.132917 2.215337-3.246829 6.493659-9.435785 28.040117-33.929366 62.478985-27.83282 7.128039 1.258771 13.59922 4.538068 14.990361 5.354771 7.255415 4.265834-35.273054 30.0032-42.376117 38.087805s-15.782088 19.703259-20.567414 37.256117z" fill="#6ED8E6" />
                                </svg>
                            </div>
                            <p class="empty-title">Ups! Koneksi Internet Terputus</p>
                            <p class="empty-subtitle text-secondary">Sepertinya koneksi internet Anda sedang bermasalah. Silakan periksa koneksi dan coba lagi.</p>
                            <div class="empty-action">
                                <button class="btn btn-primary btn-retry">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-2">
                                        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                                        <path d="M21 3v5h-5"></path>
                                        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                                        <path d="M3 21v-5h5"></path>
                                    </svg>
                                    Coba Lagi
                                </button>
                                <a href="/dashboard" class="btn btn-outline-secondary ms-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-2">
                                        <path d="M5 12l14 0"></path>
                                        <path d="M5 12l6 6"></path>
                                        <path d="M5 12l6 -6"></path>
                                    </svg>
                                    Kembali ke Dashboard
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    reinitializeScripts() {
        // Re-initialize scripts yang mungkin diperlukan setelah konten dikembalikan
        // Contoh: event listeners, komponen UI, dll.
        
        // Remove offline event listeners
        if (this.offlineClickHandler) {
            document.removeEventListener('click', this.offlineClickHandler);
        }
        if (this.offlineSubmitHandler) {
            document.removeEventListener('submit', this.offlineSubmitHandler);
        }
        
        // Dispatch event untuk memberitahu komponen lain bahwa halaman sudah kembali online
        window.dispatchEvent(new CustomEvent('page-restored', {
            detail: { timestamp: Date.now() }
        }));
    }
}

// Initialize offline handler ketika DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.offlineHandler = new OfflineHandler();
});

// Export untuk digunakan di tempat lain jika diperlukan
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OfflineHandler;
}