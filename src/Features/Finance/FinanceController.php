<?php
declare(strict_types=1);

namespace Molagis\Features\Finance;

use Psr\Http\Message\ServerRequestInterface;
use Laminas\Diactoros\Response\JsonResponse;
use Twig\Environment;

/**
 * Controller untuk mengelola halaman keuangan dan API endpoints.
 */
class FinanceController
{
    public function __construct(
        private FinanceService $financeService,
        private Environment $twig
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

        // Get recent financial records (limit to 10 for initial page load)
        $recordsResult = $this->financeService->getFinancialRecords(
            $accessToken,
            $startDate,
            $endDate,
            $categoryId,
            10,
            0
        );
        $records = $recordsResult['data'] ?? [];

        $viewData = [
            'title' => 'Finance Management',
            'categories' => $categories,
            'summary' => $summary,
            'records' => $records,
            'current_start_date' => $startDate,
            'current_end_date' => $endDate,
            'current_category_id' => $categoryId,
            'categories_error' => $categoriesResult['error'] ?? null,
            'summary_error' => $summaryResult['error'] ?? null,
            'records_error' => $recordsResult['error'] ?? null
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
        $limit = isset($queryParams['limit']) ? (int) $queryParams['limit'] : 50;
        $offset = isset($queryParams['offset']) ? (int) $queryParams['offset'] : 0;

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

        return new JsonResponse([
            'success' => true,
            'data' => $result['data']
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
}
