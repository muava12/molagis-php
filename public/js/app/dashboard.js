/*
 * File: dashboard.js
 * Description: Logika untuk halaman dashboard, termasuk pengambilan data pengantaran dan inisialisasi modal tambah customer.
 */

import { renderErrorAlert, showToast } from './utils.js';

// Impor modul add-customer-modal
import { initAddCustomerModal } from './add-customer-modal.js';

// Variabel global
const bootstrap = window.tabler?.bootstrap;

// Fungsi utama untuk inisialisasi dashboard
export function initDashboard() {
    console.log('Initializing dashboard event listeners');

    // Inisialisasi event listener untuk navigasi hari
    const prevButton = document.getElementById('prev-day');
    const nextButton = document.getElementById('next-day');
    const tableBody = document.querySelector('#deliveries-table tbody');
    const totalBadge = document.getElementById('total-badge');
    const dateSubtitle = document.getElementById('date-subtitle');

    if (!prevButton || !nextButton || !tableBody || !totalBadge || !dateSubtitle) {
        console.error('One or more DOM elements not found:', {
            prevButton: !!prevButton,
            nextButton: !!nextButton,
            tableBody: !!tableBody,
            totalBadge: !!totalBadge,
            dateSubtitle: !!dateSubtitle,
        });
        return;
    }

    const fetchDeliveries = async (date, button) => {
        console.log('Fetching deliveries for date:', date);
        prevButton.disabled = true;
        nextButton.disabled = true;
        const spinner = button.querySelector('.spinner-border');
        const svg = button.querySelector('svg');
        spinner.classList.remove('d-none');
        svg.classList.add('d-none');

        try {
            const response = await fetch(`/api/deliveries?date=${date}`);
            const data = await response.json();

            if (response.ok && !data.error) {
                tableBody.innerHTML = '';
                if (data.deliveries.length > 0) {
                    data.deliveries.forEach((delivery) => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>
                                <div class="d-flex align-items-center">
                                    <span class="avatar avatar-sm" style="background-image: url(https://api.dicebear.com/9.x/avataaars-neutral/svg?seed=${delivery.kurir_id})"></span>
                                    <div class="ms-2">${delivery.courier_name}</div>
                                </div>
                            </td>
                            <td>
                                ${delivery.jumlah_pengantaran} titik Pengantaran
                                <div class="text-muted small">${delivery.jumlah_selesai} sudah sampai</div>
                            </td>
                            <td class="text-center">
                                <a target="_blank" href="/delivery/${delivery.kurir_id}" class="btn btn-icon" aria-label="Buka">
                                    <svg class="icon icon-2" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                        <path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"/>
                                        <path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6"/>
                                    </svg>
                                </a>
                            </td>
                        `;
                        tableBody.appendChild(row);
                    });
                } else {
                    tableBody.innerHTML = '<tr><td colspan="3" class="text-center">Tidak ada pengantaran hari ini</td></tr>';
                }

                totalBadge.textContent = data.total_deliveries;
                dateSubtitle.textContent = data.today_date;
                prevButton.dataset.date = data.current_date;
                nextButton.dataset.date = data.current_date;

                const errorContainer = document.querySelector('#error-container');
                if (errorContainer) errorContainer.innerHTML = '';
            } else {
                const errorContainer = document.querySelector('#error-container');
                if (errorContainer && !errorContainer.querySelector('.alert')) {
                    renderErrorAlert(data.error || 'Gagal mengambil data');
                }
            }
        } catch (error) {
            console.error('Fetch error:', error);
            renderErrorAlert('Gagal mengambil data: ' + error.message);
        } finally {
            spinner.classList.add('d-none');
            svg.classList.remove('d-none');
            prevButton.disabled = false;
            nextButton.disabled = false;
        }
    };

    const prevHandler = () => {
        console.log('Previous button clicked');
        const currentDate = new Date(prevButton.dataset.date);
        currentDate.setDate(currentDate.getDate() - 1);
        const newDate = currentDate.toISOString().split('T')[0];
        fetchDeliveries(newDate, prevButton);
    };
    const nextHandler = () => {
        console.log('Next button clicked');
        const currentDate = new Date(nextButton.dataset.date);
        currentDate.setDate(currentDate.getDate() + 1);
        const newDate = currentDate.toISOString().split('T')[0];
        fetchDeliveries(newDate, nextButton);
    };

    prevButton.removeEventListener('click', prevHandler);
    nextButton.removeEventListener('click', nextHandler);
    prevButton.addEventListener('click', prevHandler);
    nextButton.addEventListener('click', nextHandler);

    // Inisialisasi modal tambah customer
    initAddCustomerModal('dashboard-add-modal', {
        showToast,
        showErrorToast: (title, message) => renderErrorAlert(message), // Sesuaikan dengan renderErrorAlert
    });
}

// Inisialisasi standalone jika diperlukan
function initialize() {
    initDashboard();
}

initialize();