<?php
declare(strict_types=1);

namespace Molagis\Features\Reports;

use Psr\Http\Message\ServerRequestInterface;
use Twig\Environment;
use Molagis\Features\Settings\SettingsService;

/**
 * Controller untuk mengelola halaman reports dan statistik.
 */
class ReportsController
{
    public function __construct(
        private ReportsService $reportsService,
        private SettingsService $settingsService,
        private Environment $twig,
    ) {}

    /**
     * Menampilkan halaman reports dengan overview cards.
     *
     * @param ServerRequestInterface $request Permintaan HTTP
     * @return string Template Twig yang dirender
     */
    public function showReports(ServerRequestInterface $request): string
    {
        $user = $request->getAttribute('user');
        $accessToken = $_SESSION['user_token'] ?? null;
        $queryParams = $request->getQueryParams();
        
        // Get filter parameters
        $period = $queryParams['period'] ?? null;
        $startDate = $queryParams['start_date'] ?? null;
        $endDate = $queryParams['end_date'] ?? null;

        // Initialize view data array
        $viewData = [
            'title' => 'Reports & Analytics',
            'user_id' => $user['id'] ?? 'default-seed',
            'error' => null,
        ];

        // Get business name setting
        $businessNameResponse = $this->settingsService->getSettingByKey('business_name', $accessToken);
        $viewData['business_name'] = $businessNameResponse['data'] ?? 'Molagis';
        if (!empty($businessNameResponse['error'])) {
            error_log("Error fetching business_name setting: " . $businessNameResponse['error']);
        }

        // Determine user role (mock for now, will be integrated with actual user system)
        $userRole = $user['role'] ?? 'owner'; // Default to owner for full access
        
        // Get reports data based on role
        $reportsResult = $this->reportsService->getReportsByRole($userRole, $accessToken);
        $viewData['reports_data'] = $reportsResult['data'] ?? [];
        $reportsError = $reportsResult['error'] ?? null;
        
        if ($reportsError) {
            error_log("Error fetching reports data: " . $reportsError);
            $viewData['error'] = "Gagal memuat data reports.";
        }

        // Add filter information to view data
        $viewData['current_period'] = $period;
        $viewData['current_start_date'] = $startDate;
        $viewData['current_end_date'] = $endDate;
        $viewData['user_role'] = $userRole;

        // Clean up error message
        $viewData['error'] = trim((string) $viewData['error']);
        if (empty($viewData['error'])) {
            $viewData['error'] = null;
        }

        return $this->twig->render('reports.html.twig', $viewData);
    }
}
