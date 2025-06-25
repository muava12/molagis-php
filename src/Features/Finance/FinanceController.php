<?php
declare(strict_types=1);

namespace Molagis\Features\Finance;

use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Laminas\Diactoros\Response\JsonResponse;
use Twig\Environment;
use Molagis\Features\Settings\SettingsService;
use Laminas\Diactoros\Response\Response;

/**
 * Controller untuk mengelola halaman keuangan dan API endpoints.
 */
class FinanceController
{
    public function __construct(
        private FinanceService $financeService,
        private SettingsService $settingsService,
        private Environment $twig,
        private \Molagis\Shared\SupabaseService $supabaseService
    ) {}

    /**
     * Menampilkan halaman keuangan.
     *
     * @param ServerRequestInterface $request Permintaan HTTP
     * @return string Template Twig yang dirender
     */
    public function showFinance(ServerRequestInterface $request): string
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        $queryParams = $request->getQueryParams();
        
        // Get filter parameters
        $startDate = $queryParams['start_date'] ?? null;
        $endDate = $queryParams['end_date'] ?? null;
        $categoryId = isset($queryParams['category_id']) ? (int) $queryParams['category_id'] : null;

        // Get expense categories for dropdown
        $categoriesResult = $this->financeService->getExpenseCategories($accessToken);
        $categories = $categoriesResult['data'] ?? [];

        // Get financial summary
        $summaryResult = $this->financeService->getFinancialSummary($accessToken, $startDate, $endDate);
        $summary = $summaryResult['data'] ?? [];

        // Get pagination parameters
        $page = isset($queryParams['page']) ? max(1, (int) $queryParams['page']) : 1;
        $limit = isset($queryParams['limit']) ? min(500, max(10, (int) $queryParams['limit'])) : 500;
        $offset = ($page - 1) * $limit;

        // Get financial records with pagination
        $recordsResult = $this->financeService->getFinancialRecords(
            $accessToken,
            $startDate,
            $endDate,
            $categoryId,
            $limit,
            $offset
        );
        $records = $recordsResult['data'] ?? [];

        // Get total count for pagination
        $countResult = $this->financeService->getFinancialRecordsCount(
            $accessToken,
            $startDate,
            $endDate,
            $categoryId
        );
        $totalRecords = $countResult['data'] ?? 0;

        // Calculate pagination info
        $totalPages = $totalRecords > 0 ? ceil($totalRecords / $limit) : 1;

        // Ambil business_name dari settings (bukan dari profil user, agar konsisten)
        $businessNameResponse = $this->settingsService->getSettingByKey('business_name', $accessToken);
        $businessName = $businessNameResponse['data'] ?? 'Molagis';

        // Ambil couriers
        $couriersResult = $this->supabaseService->getActiveCouriers($accessToken);
        $couriers = $couriersResult['data'] ?? [];

        $viewData = [
            'title' => 'Finance Management',
            'categories' => $categories,
            'summary' => $summary,
            'records' => $records,
            'current_start_date' => $startDate,
            'current_end_date' => $endDate,
            'current_category_id' => $categoryId,
            'current_page' => $page,
            'current_limit' => $limit,
            'total_records' => $totalRecords,
            'total_pages' => $totalPages,
            'categories_error' => $categoriesResult['error'] ?? null,
            'summary_error' => $summaryResult['error'] ?? null,
            'records_error' => $recordsResult['error'] ?? null,
            'count_error' => $countResult['error'] ?? null,
                        'business_name' => $businessName,
            'couriers' => $couriers,
        ];

        try {
            return $this->twig->render('finance.html.twig', $viewData);
        } catch (\Twig\Error\Error $e) {
            error_log('Twig error in showFinance: ' . $e->getMessage());
            return 'Error rendering finance page: ' . htmlspecialchars($e->getMessage());
        }
    }

    /**
     * API endpoint untuk mengambil expense categories.
     *
     * @param ServerRequestInterface $request Permintaan HTTP
     * @return JsonResponse Response JSON
     */
    public function getExpenseCategories(ServerRequestInterface $request): JsonResponse
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        
        $result = $this->financeService->getExpenseCategories($accessToken);
        
        if ($result['error']) {
            return new JsonResponse([
                'success' => false,
                'message' => $result['error']
            ], 500);
        }

        return new JsonResponse([
            'success' => true,
            'data' => $result['data']
        ]);
    }

    /**
     * API endpoint untuk mengambil financial records dengan filter.
     *
     * @param ServerRequestInterface $request Permintaan HTTP
     * @return JsonResponse Response JSON
     */
    public function getFinancialRecords(ServerRequestInterface $request): JsonResponse
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        $queryParams = $request->getQueryParams();
        
        $startDate = $queryParams['start_date'] ?? null;
        $endDate = $queryParams['end_date'] ?? null;
        $categoryId = isset($queryParams['category_id']) ? (int) $queryParams['category_id'] : null;
        $page = isset($queryParams['page']) ? max(1, (int) $queryParams['page']) : 1;
        $limit = isset($queryParams['limit']) ? min(500, max(10, (int) $queryParams['limit'])) : 500;
        $offset = ($page - 1) * $limit;

        $result = $this->financeService->getFinancialRecords(
            $accessToken,
            $startDate,
            $endDate,
            $categoryId,
            $limit,
            $offset
        );

        if ($result['error']) {
            return new JsonResponse([
                'success' => false,
                'message' => $result['error']
            ], 500);
        }

        // Get total count for pagination
        $countResult = $this->financeService->getFinancialRecordsCount(
            $accessToken,
            $startDate,
            $endDate,
            $categoryId
        );
        $totalRecords = $countResult['data'] ?? 0;
        $totalPages = $totalRecords > 0 ? ceil($totalRecords / $limit) : 1;

        return new JsonResponse([
            'success' => true,
            'data' => $result['data'],
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_records' => $totalRecords,
                'total_pages' => $totalPages,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1
            ]
        ]);
    }

    /**
     * API endpoint untuk menambahkan financial record baru.
     *
     * @param ServerRequestInterface $request Permintaan HTTP
     * @return JsonResponse Response JSON
     */
    public function addFinancialRecord(ServerRequestInterface $request): JsonResponse
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        $data = $request->getParsedBody();

        if (!$data) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Data tidak valid'
            ], 400);
        }

        $result = $this->financeService->addFinancialRecord($data, $accessToken);

        if ($result['error']) {
            return new JsonResponse([
                'success' => false,
                'message' => $result['error']
            ], 400);
        }

        return new JsonResponse([
            'success' => true,
            'message' => 'Transaksi berhasil ditambahkan',
            'data' => $result['data']
        ]);
    }

    /**
     * API endpoint untuk mengupdate financial record.
     *
     * @param ServerRequestInterface $request Permintaan HTTP
     * @return JsonResponse Response JSON
     */
    public function updateFinancialRecord(ServerRequestInterface $request): JsonResponse
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        $data = $request->getParsedBody();
        $id = (int) $request->getAttribute('id');
        
        if (!$data || !$id) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Data tidak valid'
            ], 400);
        }

        $result = $this->financeService->updateFinancialRecord($id, $data, $accessToken);
        
        if ($result['error']) {
            return new JsonResponse([
                'success' => false,
                'message' => $result['error']
            ], 400);
        }

        return new JsonResponse([
            'success' => true,
            'message' => 'Transaksi berhasil diupdate',
            'data' => $result['data']
        ]);
    }

    /**
     * API endpoint untuk menghapus financial record.
     *
     * @param ServerRequestInterface $request Permintaan HTTP
     * @return JsonResponse Response JSON
     */
    public function deleteFinancialRecord(ServerRequestInterface $request): JsonResponse
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        $id = (int) $request->getAttribute('id');
        
        if (!$id) {
            return new JsonResponse([
                'success' => false,
                'message' => 'ID tidak valid'
            ], 400);
        }

        $result = $this->financeService->deleteFinancialRecord($id, $accessToken);
        
        if ($result['error']) {
            return new JsonResponse([
                'success' => false,
                'message' => $result['error']
            ], 400);
        }

        return new JsonResponse([
            'success' => true,
            'message' => 'Transaksi berhasil dihapus'
        ]);
    }

    /**
     * API endpoint untuk mengambil semua labels.
     *
     * @param ServerRequestInterface $request Permintaan HTTP
     * @return JsonResponse Response JSON
     */
    public function getLabels(ServerRequestInterface $request): JsonResponse
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        
        $result = $this->financeService->getLabels($accessToken);
        
        if ($result['error']) {
            return new JsonResponse([
                'success' => false,
                'message' => $result['error']
            ], 500);
        }

        return new JsonResponse([
            'success' => true,
            'data' => $result['data']
        ]);
    }

    /**
     * API endpoint untuk menambahkan label baru.
     *
     * @param ServerRequestInterface $request Permintaan HTTP
     * @return JsonResponse Response JSON
     */
    public function createLabel(ServerRequestInterface $request): JsonResponse
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        $data = $request->getParsedBody();

        if (!$data) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Data tidak valid'
            ], 400);
        }

        $result = $this->financeService->createLabel($data, $accessToken);

        if ($result['error']) {
            return new JsonResponse([
                'success' => false,
                'message' => $result['error']
            ], 400);
        }

        return new JsonResponse([
            'success' => true,
            'message' => 'Label berhasil dibuat',
            'data' => $result['data']
        ]);
    }

    /**
     * API endpoint untuk mengupdate label.
     *
     * @param ServerRequestInterface $request Permintaan HTTP
     * @return JsonResponse Response JSON
     */
    public function updateLabel(ServerRequestInterface $request): JsonResponse
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        $data = $request->getParsedBody();
        $id = (int) $request->getAttribute('id');
        
        if (!$data || !$id) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Data tidak valid'
            ], 400);
        }

        $result = $this->financeService->updateLabel($id, $data, $accessToken);
        
        if ($result['error']) {
            return new JsonResponse([
                'success' => false,
                'message' => $result['error']
            ], 400);
        }

        return new JsonResponse([
            'success' => true,
            'message' => 'Label berhasil diupdate',
            'data' => $result['data']
        ]);
    }

    /**
     * API endpoint untuk menghapus label.
     *
     * @param ServerRequestInterface $request Permintaan HTTP
     * @return JsonResponse Response JSON
     */
    public function deleteLabel(ServerRequestInterface $request): JsonResponse
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        $id = (int) $request->getAttribute('id');
        
        if (!$id) {
            return new JsonResponse([
                'success' => false,
                'message' => 'ID tidak valid'
            ], 400);
        }

        $result = $this->financeService->deleteLabel($id, $accessToken);
        
        if ($result['error']) {
            return new JsonResponse([
                'success' => false,
                'message' => $result['error']
            ], 400);
        }

        return new JsonResponse([
            'success' => true,
            'message' => 'Label berhasil dihapus'
        ]);
    }

    /**
     * API endpoint untuk export data keuangan.
     *
     * @param ServerRequestInterface $request Permintaan HTTP
     * @return ResponseInterface Response file
     */
    public function exportData(ServerRequestInterface $request): ResponseInterface
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        $queryParams = $request->getQueryParams();
        
        $startDate = $queryParams['start_date'] ?? null;
        $endDate = $queryParams['end_date'] ?? null;
        $categoryId = isset($queryParams['category_id']) ? (int) $queryParams['category_id'] : null;

        $result = $this->financeService->exportData($accessToken, $startDate, $endDate, $categoryId);

        if ($result['error']) {
            return new JsonResponse([
                'success' => false,
                'message' => $result['error']
            ], 500);
        }

        $filePath = $result['data'];
        
        if (!file_exists($filePath)) {
            return new JsonResponse([
                'success' => false,
                'message' => 'File export tidak ditemukan'
            ], 500);
        }

        $content = file_get_contents($filePath);
        $filename = 'finance_data_' . date('Y-m-d') . '.csv';

        $response = new Response();
        $response = $response->withHeader('Content-Type', 'text/csv');
        $response = $response->withHeader('Content-Disposition', 'attachment; filename="' . $filename . '"');
        $response = $response->withHeader('Content-Length', strlen($content));
        $response->getBody()->write($content);

        // Clean up temporary file
        unlink($filePath);

        return $response;
    }

    /**
     * API endpoint untuk import data keuangan.
     *
     * @param ServerRequestInterface $request Permintaan HTTP
     * @return JsonResponse Response JSON
     */
    public function importData(ServerRequestInterface $request): JsonResponse
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        $uploadedFiles = $request->getUploadedFiles();
        
        if (empty($uploadedFiles) || !isset($uploadedFiles['file'])) {
            return new JsonResponse([
                'success' => false,
                'message' => 'File tidak ditemukan'
            ], 400);
        }

        $file = $uploadedFiles['file'];
        $result = $this->financeService->importData($file, $accessToken);

        if ($result['error']) {
            return new JsonResponse([
                'success' => false,
                'message' => $result['error']
            ], 400);
        }

        return new JsonResponse([
            'success' => true,
            'message' => 'Data berhasil diimport',
            'imported_count' => $result['imported_count'],
            'data' => $result['data']
        ]);
    }
}
