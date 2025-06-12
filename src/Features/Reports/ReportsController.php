<?php
declare(strict_types=1);

namespace Molagis\Features\Reports;

use Psr\Http\Message\ServerRequestInterface;
use Twig\Environment;
use Molagis\Features\Settings\SettingsService;
use Molagis\Shared\SupabaseService;

/**
 * Controller untuk mengelola halaman reports dan statistik.
 */
class ReportsController
{
    public function __construct(
        private ReportsService $reportsService,
        private SettingsService $settingsService,
        private SupabaseService $supabaseService,
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

        // Process period parameters
        $processedDates = $this->processPeriodParameters($period, $startDate, $endDate);
        $startDate = $processedDates['start_date'];
        $endDate = $processedDates['end_date'];
        $period = $processedDates['period'];

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
        // Get couriers for header dropdown
        $couriersResult = $this->supabaseService->getActiveCouriers($accessToken);
        $viewData['couriers'] = $couriersResult['data'] ?? [];

        // Determine user role (mock for now, will be integrated with actual user system)
        $userRole = $user['role'] ?? 'owner'; // Default to owner for full access

        // Get reports data based on role with date filters
        $reportsResult = $this->reportsService->getReportsByRole($userRole, $accessToken, $startDate, $endDate);
        $viewData['reports_data'] = $reportsResult['data'] ?? [];
        $reportsError = $reportsResult['error'] ?? null;
        
        if ($reportsError) {
            error_log("Error fetching reports data: " . $reportsError);
            $viewData['error'] = "Gagal memuat data reports.";
        }

        // Get detailed customer order data
        $customerOrderDetailsResult = $this->reportsService->getCustomerOrderDetailsReport($startDate, $endDate, $accessToken);
        $viewData['detailed_customer_orders'] = $customerOrderDetailsResult['data'] ?? [];
        if (!empty($customerOrderDetailsResult['error'])) {
            $currentError = $viewData['error'] ?? '';
            $viewData['error'] = ($currentError ? $currentError . '; ' : '') . $customerOrderDetailsResult['error'];
            error_log("Error fetching customer order details: " . $customerOrderDetailsResult['error']);
        }

        // Add filter information to view data
        $viewData['current_period'] = $period;
        $viewData['current_start_date'] = $startDate;
        $viewData['current_end_date'] = $endDate;
        $viewData['user_role'] = $userRole;
        // Format date for subtitle
        $formatter = new \IntlDateFormatter(
            'id_ID', // Lokalisasi Indonesia
            \IntlDateFormatter::FULL, // Gaya tanggal lengkap
            \IntlDateFormatter::NONE, // Tidak menyertakan waktu
            'Asia/Makassar', // Zona waktu
            \IntlDateFormatter::GREGORIAN,
            'EEEE, dd MMMM yyyy' // Format: Rabu, 14 Mei 2025
        );
        $currentDate = new \DateTime('now', new \DateTimeZone('Asia/Makassar'));
        $formattedDate = $formatter->format($currentDate);
        $viewData['date_subtitle'] = $formattedDate;
        
        // Clean up error message
        $viewData['error'] = trim((string) $viewData['error']);
        if (empty($viewData['error'])) {
            $viewData['error'] = null;
        }

        return $this->twig->render('reports.html.twig', $viewData);
    }

    /**
     * Process period parameters and return standardized dates.
     *
     * @param string|null $period Period type (weekly, monthly)
     * @param string|null $startDate Start date string
     * @param string|null $endDate End date string
     * @return array Processed dates and period info
     */
    private function processPeriodParameters(?string $period, ?string $startDate, ?string $endDate): array
    {
        $now = new \DateTime();

        // If custom dates are provided, use them
        if ($startDate && $endDate) {
            try {
                // Create DateTime objects with explicit timezone to avoid timezone issues
                $timezone = new \DateTimeZone('Asia/Jakarta'); // or use server timezone
                $start = new \DateTime($startDate, $timezone);
                $end = new \DateTime($endDate, $timezone);

                // Validate date range
                if ($start > $end) {
                    throw new \InvalidArgumentException('Start date cannot be greater than end date');
                }

                // Limit to reasonable range (max 2 years)
                $daysDiff = $start->diff($end)->days;
                if ($daysDiff > 730) {
                    throw new \InvalidArgumentException('Date range too large (max 2 years)');
                }

                return [
                    'start_date' => $start->format('Y-m-d'),
                    'end_date' => $end->format('Y-m-d'),
                    'period' => 'custom'
                ];
            } catch (\Exception $e) {
                error_log('Invalid date parameters: ' . $e->getMessage());
                // Fall back to default (current month)
                $period = 'monthly';
            }
        }

        // Handle predefined periods
        switch ($period) {
            case 'weekly':
                // Last 7 days (including today)
                $endDate = $now->format('Y-m-d');
                $startDate = $now->modify('-6 days')->format('Y-m-d');
                break;

            case 'monthly':
            default:
                // Current month
                $startDate = $now->format('Y-m-01'); // First day of current month
                $endDate = $now->format('Y-m-t');   // Last day of current month
                $period = 'monthly';
                break;
        }

        return [
            'start_date' => $startDate,
            'end_date' => $endDate,
            'period' => $period
        ];
    }
}
