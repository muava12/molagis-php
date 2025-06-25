<?php
declare(strict_types=1);

namespace Molagis\Features\Finance;

use Molagis\Shared\SupabaseClient;

/**
 * Service untuk mengelola data keuangan dan expense categories.
 */
class FinanceService
{
    public function __construct(
        private SupabaseClient $supabaseClient
    ) {}

    /**
     * Mengambil semua expense categories.
     *
     * @param string|null $accessToken Token akses pengguna.
     * @return array Hasil yang berisi 'data' (array categories) atau 'error'.
     */
    public function getExpenseCategories(?string $accessToken = null): array
    {
        try {
            $response = $this->supabaseClient->get(
                '/rest/v1/expense_categories?select=*&order=name.asc',
                [],
                $accessToken
            );

            if ($response['error']) {
                error_log('Error fetching expense categories: ' . $response['error']);
                return ['data' => null, 'error' => 'Gagal mengambil kategori pengeluaran'];
            }

            return ['data' => $response['data'], 'error' => null];

        } catch (\Exception $e) {
            error_log('Exception in getExpenseCategories: ' . $e->getMessage());
            return ['data' => null, 'error' => 'Gagal mengambil kategori pengeluaran'];
        }
    }

    /**
     * Mengambil financial records dengan filter opsional.
     *
     * @param string|null $accessToken Token akses pengguna.
     * @param string|null $startDate Tanggal mulai filter (Y-m-d).
     * @param string|null $endDate Tanggal akhir filter (Y-m-d).
     * @param int|null $categoryId Filter berdasarkan kategori.
     * @param int $limit Jumlah maksimal records yang diambil.
     * @param int $offset Offset untuk pagination.
     * @return array Hasil yang berisi 'data' (array records) atau 'error'.
     */
    public function getFinancialRecords(
        ?string $accessToken = null,
        ?string $startDate = null,
        ?string $endDate = null,
        ?int $categoryId = null,
        int $limit = 50,
        int $offset = 0
    ): array {
        try {
            // Build query string
            $queryParts = [
                'select=id,transaction_date,amount,type,description,created_at,category_id,expense_categories(id,name,display_name)',
                'type=eq.expense',
                'order=transaction_date.desc,created_at.desc',
                "limit={$limit}",
                "offset={$offset}"
            ];

            // Apply date filters
            if ($startDate) {
                $queryParts[] = "transaction_date=gte.{$startDate}";
            }
            if ($endDate) {
                $queryParts[] = "transaction_date=lte.{$endDate}";
            }

            // Apply category filter
            if ($categoryId) {
                $queryParts[] = "category_id=eq.{$categoryId}";
            }

            $queryString = '/rest/v1/financial_records?' . implode('&', $queryParts);
            $response = $this->supabaseClient->get($queryString, [], $accessToken);

            if ($response['error']) {
                error_log('Error fetching financial records: ' . $response['error']);
                return ['data' => null, 'error' => 'Gagal mengambil data transaksi'];
            }

            return ['data' => $response['data'], 'error' => null];

        } catch (\Exception $e) {
            error_log('Exception in getFinancialRecords: ' . $e->getMessage());
            return ['data' => null, 'error' => 'Gagal mengambil data transaksi'];
        }
    }

    /**
     * Menambahkan financial record baru.
     *
     * @param array $data Data financial record.
     * @param string|null $accessToken Token akses pengguna.
     * @return array Hasil yang berisi 'data' (record baru) atau 'error'.
     */
    public function addFinancialRecord(array $data, ?string $accessToken = null): array
    {
        try {
            // Validate required fields
            $requiredFields = ['transaction_date', 'amount', 'category_id'];
            foreach ($requiredFields as $field) {
                if (!isset($data[$field]) || empty($data[$field])) {
                    return ['data' => null, 'error' => "Field {$field} wajib diisi"];
                }
            }

            // Prepare data for insertion
            $insertData = [
                'transaction_date' => $data['transaction_date'],
                'amount' => (float) $data['amount'],
                'type' => 'expense',
                'description' => $data['description'] ?? null,
                'category_id' => (int) $data['category_id']
            ];

            // Validate amount
            if ($insertData['amount'] <= 0) {
                return ['data' => null, 'error' => 'Jumlah harus lebih besar dari 0'];
            }

            $response = $this->supabaseClient->post(
                '/rest/v1/financial_records?select=id,transaction_date,amount,type,description,created_at,category_id,expense_categories(id,name,display_name)',
                $insertData,
                ['headers' => ['Prefer' => 'return=representation']],
                $accessToken
            );

            if ($response['error']) {
                error_log('Error adding financial record: ' . $response['error']);
                return ['data' => null, 'error' => 'Gagal menambahkan transaksi'];
            }

            return ['data' => $response['data'][0] ?? null, 'error' => null];

        } catch (\Exception $e) {
            error_log('Exception in addFinancialRecord: ' . $e->getMessage());
            return ['data' => null, 'error' => 'Gagal menambahkan transaksi'];
        }
    }

    /**
     * Mengupdate financial record.
     *
     * @param int $id ID financial record.
     * @param array $data Data yang akan diupdate.
     * @param string|null $accessToken Token akses pengguna.
     * @return array Hasil yang berisi 'data' (record yang diupdate) atau 'error'.
     */
    public function updateFinancialRecord(int $id, array $data, ?string $accessToken = null): array
    {
        try {
            // Prepare data for update
            $updateData = [];
            
            if (isset($data['transaction_date'])) {
                $updateData['transaction_date'] = $data['transaction_date'];
            }
            
            if (isset($data['amount'])) {
                $amount = (float) $data['amount'];
                if ($amount <= 0) {
                    return ['data' => null, 'error' => 'Jumlah harus lebih besar dari 0'];
                }
                $updateData['amount'] = $amount;
            }
            
            if (isset($data['description'])) {
                $updateData['description'] = $data['description'];
            }
            
            if (isset($data['category_id'])) {
                $updateData['category_id'] = (int) $data['category_id'];
            }

            if (empty($updateData)) {
                return ['data' => null, 'error' => 'Tidak ada data yang diupdate'];
            }

            $response = $this->supabaseClient->update(
                "/rest/v1/financial_records?id=eq.{$id}&select=id,transaction_date,amount,type,description,created_at,category_id,expense_categories(id,name,display_name)",
                $updateData,
                ['headers' => ['Prefer' => 'return=representation']],
                $accessToken
            );

            if ($response['error']) {
                error_log('Error updating financial record: ' . $response['error']);
                return ['data' => null, 'error' => 'Gagal mengupdate transaksi'];
            }

            return ['data' => $response['data'][0] ?? null, 'error' => null];

        } catch (\Exception $e) {
            error_log('Exception in updateFinancialRecord: ' . $e->getMessage());
            return ['data' => null, 'error' => 'Gagal mengupdate transaksi'];
        }
    }

    /**
     * Menghapus financial record.
     *
     * @param int $id ID financial record.
     * @param string|null $accessToken Token akses pengguna.
     * @return array Hasil yang berisi 'success' (boolean) atau 'error'.
     */
    public function deleteFinancialRecord(int $id, ?string $accessToken = null): array
    {
        try {
            $response = $this->supabaseClient->delete(
                "/rest/v1/financial_records?id=eq.{$id}",
                [],
                $accessToken
            );

            if ($response['error']) {
                error_log('Error deleting financial record: ' . $response['error']);
                return ['success' => false, 'error' => 'Gagal menghapus transaksi'];
            }

            return ['success' => true, 'error' => null];

        } catch (\Exception $e) {
            error_log('Exception in deleteFinancialRecord: ' . $e->getMessage());
            return ['success' => false, 'error' => 'Gagal menghapus transaksi'];
        }
    }

    /**
     * Mengambil summary keuangan untuk periode tertentu.
     *
     * @param string|null $accessToken Token akses pengguna.
     * @param string|null $startDate Tanggal mulai (Y-m-d).
     * @param string|null $endDate Tanggal akhir (Y-m-d).
     * @return array Hasil yang berisi 'data' (summary) atau 'error'.
     */
    public function getFinancialSummary(?string $accessToken = null, ?string $startDate = null, ?string $endDate = null): array
    {
        try {
            // Default to current month if no dates provided
            if (!$startDate || !$endDate) {
                $now = new \DateTime();
                $startDate = $now->format('Y-m-01'); // First day of current month
                $endDate = $now->format('Y-m-t');   // Last day of current month
            }

            // Build query for summary
            $queryParts = [
                'select=amount,category_id,expense_categories(name,display_name)',
                'type=eq.expense',
                "transaction_date=gte.{$startDate}",
                "transaction_date=lte.{$endDate}"
            ];

            $queryString = '/rest/v1/financial_records?' . implode('&', $queryParts);
            $response = $this->supabaseClient->get($queryString, [], $accessToken);

            if ($response['error']) {
                error_log('Error fetching financial summary: ' . $response['error']);
                return ['data' => null, 'error' => 'Gagal mengambil ringkasan keuangan'];
            }

            // Calculate summary
            $records = $response['data'];
            $totalExpenses = 0;
            $categoryTotals = [];

            foreach ($records as $record) {
                $amount = (float) $record['amount'];
                $totalExpenses += $amount;

                $categoryName = $record['expense_categories']['display_name'] ?? 'Lainnya';
                if (!isset($categoryTotals[$categoryName])) {
                    $categoryTotals[$categoryName] = 0;
                }
                $categoryTotals[$categoryName] += $amount;
            }

            $summary = [
                'period' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate
                ],
                'total_expenses' => $totalExpenses,
                'total_records' => count($records),
                'category_breakdown' => $categoryTotals
            ];

            return ['data' => $summary, 'error' => null];

        } catch (\Exception $e) {
            error_log('Exception in getFinancialSummary: ' . $e->getMessage());
            return ['data' => null, 'error' => 'Gagal mengambil ringkasan keuangan'];
        }
    }

    /**
     * Mendapatkan jumlah total financial records dengan filter.
     *
     * @param string|null $accessToken Token akses pengguna.
     * @param string|null $startDate Tanggal mulai filter (format: Y-m-d).
     * @param string|null $endDate Tanggal akhir filter (format: Y-m-d).
     * @param int|null $categoryId ID kategori untuk filter.
     * @return array Hasil yang berisi 'data' (int) atau 'error'.
     */
    public function getFinancialRecordsCount(?string $accessToken = null, ?string $startDate = null, ?string $endDate = null, ?int $categoryId = null): array
    {
        try {
            // Build query parameters
            $queryParams = ['select' => 'count'];

            // Build filters
            $filters = [];

            if ($startDate) {
                $filters[] = "transaction_date.gte.{$startDate}";
            }

            if ($endDate) {
                $filters[] = "transaction_date.lte.{$endDate}";
            }

            if ($categoryId) {
                $filters[] = "category_id.eq.{$categoryId}";
            }

            if (!empty($filters)) {
                $queryParams['and'] = '(' . implode(',', $filters) . ')';
            }

            $queryString = http_build_query($queryParams);
            $response = $this->supabaseClient->get(
                "/rest/v1/financial_records?{$queryString}",
                [],
                $accessToken
            );

            if ($response['error']) {
                error_log('Error getting financial records count: ' . $response['error']);
                return ['data' => 0, 'error' => 'Gagal mengambil jumlah transaksi'];
            }

            $count = 0;
            if (isset($response['data'][0]['count'])) {
                $count = (int) $response['data'][0]['count'];
            }

            return ['data' => $count, 'error' => null];

        } catch (\Exception $e) {
            error_log('Error getting financial records count: ' . $e->getMessage());
            return ['data' => 0, 'error' => 'Gagal mengambil jumlah transaksi'];
        }
    }

    /**
     * Mengambil semua labels.
     *
     * @param string|null $accessToken Token akses pengguna.
     * @return array Hasil yang berisi 'data' (array labels) atau 'error'.
     */
    public function getLabels(?string $accessToken = null): array
    {
        try {
            $response = $this->supabaseClient->get(
                '/rest/v1/expense_categories?select=*&order=display_name.asc',
                [],
                $accessToken
            );

            if ($response['error']) {
                error_log('Error fetching labels: ' . $response['error']);
                return ['data' => null, 'error' => 'Gagal mengambil labels'];
            }

            return ['data' => $response['data'], 'error' => null];

        } catch (\Exception $e) {
            error_log('Exception in getLabels: ' . $e->getMessage());
            return ['data' => null, 'error' => 'Gagal mengambil labels'];
        }
    }

    /**
     * Menambahkan label baru.
     *
     * @param array $data Data label.
     * @param string|null $accessToken Token akses pengguna.
     * @return array Hasil yang berisi 'data' (label baru) atau 'error'.
     */
    public function createLabel(array $data, ?string $accessToken = null): array
    {
        try {
            // Validate required fields
            $requiredFields = ['name', 'display_name'];
            foreach ($requiredFields as $field) {
                if (!isset($data[$field]) || empty($data[$field])) {
                    return ['data' => null, 'error' => "Field {$field} wajib diisi"];
                }
            }

            // Validate name format (alphanumeric and underscore only)
            if (!preg_match('/^[a-zA-Z0-9_]+$/', $data['name'])) {
                return ['data' => null, 'error' => 'Nama label hanya boleh berisi huruf, angka, dan underscore'];
            }

            // Check if name already exists
            $existingResponse = $this->supabaseClient->get(
                "/rest/v1/expense_categories?name=eq.{$data['name']}&select=id",
                [],
                $accessToken
            );

            if ($existingResponse['error']) {
                error_log('Error checking existing label: ' . $existingResponse['error']);
                return ['data' => null, 'error' => 'Gagal memeriksa label yang sudah ada'];
            }

            if (!empty($existingResponse['data'])) {
                return ['data' => null, 'error' => 'Label dengan nama tersebut sudah ada'];
            }

            // Prepare data for insertion
            $insertData = [
                'name' => $data['name'],
                'display_name' => $data['display_name'],
                'color' => $data['color'] ?? '#206bc4',
                'description' => $data['description'] ?? null,
                'is_active' => $data['is_active'] ?? true
            ];

            $response = $this->supabaseClient->post(
                '/rest/v1/expense_categories?select=*',
                $insertData,
                ['headers' => ['Prefer' => 'return=representation']],
                $accessToken
            );

            if ($response['error']) {
                error_log('Error creating label: ' . $response['error']);
                return ['data' => null, 'error' => 'Gagal membuat label'];
            }

            return ['data' => $response['data'][0] ?? null, 'error' => null];

        } catch (\Exception $e) {
            error_log('Exception in createLabel: ' . $e->getMessage());
            return ['data' => null, 'error' => 'Gagal membuat label'];
        }
    }

    /**
     * Mengupdate label.
     *
     * @param int $id ID label.
     * @param array $data Data yang akan diupdate.
     * @param string|null $accessToken Token akses pengguna.
     * @return array Hasil yang berisi 'data' (label yang diupdate) atau 'error'.
     */
    public function updateLabel(int $id, array $data, ?string $accessToken = null): array
    {
        try {
            // Prepare data for update
            $updateData = [];
            
            if (isset($data['display_name'])) {
                $updateData['display_name'] = $data['display_name'];
            }
            
            if (isset($data['color'])) {
                $updateData['color'] = $data['color'];
            }
            
            if (isset($data['description'])) {
                $updateData['description'] = $data['description'];
            }
            
            if (isset($data['is_active'])) {
                $updateData['is_active'] = $data['is_active'];
            }

            if (empty($updateData)) {
                return ['data' => null, 'error' => 'Tidak ada data yang diupdate'];
            }

            $response = $this->supabaseClient->update(
                "/rest/v1/expense_categories?id=eq.{$id}&select=*",
                $updateData,
                ['headers' => ['Prefer' => 'return=representation']],
                $accessToken
            );

            if ($response['error']) {
                error_log('Error updating label: ' . $response['error']);
                return ['data' => null, 'error' => 'Gagal mengupdate label'];
            }

            return ['data' => $response['data'][0] ?? null, 'error' => null];

        } catch (\Exception $e) {
            error_log('Exception in updateLabel: ' . $e->getMessage());
            return ['data' => null, 'error' => 'Gagal mengupdate label'];
        }
    }

    /**
     * Menghapus label.
     *
     * @param int $id ID label.
     * @param string|null $accessToken Token akses pengguna.
     * @return array Hasil yang berisi 'success' (boolean) atau 'error'.
     */
    public function deleteLabel(int $id, ?string $accessToken = null): array
    {
        try {
            // Check if label is being used in any transactions
            $usageResponse = $this->supabaseClient->get(
                "/rest/v1/financial_records?category_id=eq.{$id}&select=id&limit=1",
                [],
                $accessToken
            );

            if ($usageResponse['error']) {
                error_log('Error checking label usage: ' . $usageResponse['error']);
                return ['success' => false, 'error' => 'Gagal memeriksa penggunaan label'];
            }

            if (!empty($usageResponse['data'])) {
                return ['success' => false, 'error' => 'Label tidak dapat dihapus karena masih digunakan dalam transaksi'];
            }

            $response = $this->supabaseClient->delete(
                "/rest/v1/expense_categories?id=eq.{$id}",
                [],
                $accessToken
            );

            if ($response['error']) {
                error_log('Error deleting label: ' . $response['error']);
                return ['success' => false, 'error' => 'Gagal menghapus label'];
            }

            return ['success' => true, 'error' => null];

        } catch (\Exception $e) {
            error_log('Exception in deleteLabel: ' . $e->getMessage());
            return ['success' => false, 'error' => 'Gagal menghapus label'];
        }
    }

    /**
     * Export data keuangan ke Excel.
     *
     * @param string|null $accessToken Token akses pengguna.
     * @param string|null $startDate Tanggal mulai filter.
     * @param string|null $endDate Tanggal akhir filter.
     * @param int|null $categoryId ID kategori untuk filter.
     * @return array Hasil yang berisi 'data' (file path) atau 'error'.
     */
    public function exportData(?string $accessToken = null, ?string $startDate = null, ?string $endDate = null, ?int $categoryId = null): array
    {
        try {
            // Get financial records for export
            $recordsResult = $this->getFinancialRecords($accessToken, $startDate, $endDate, $categoryId, 10000, 0);
            
            if ($recordsResult['error']) {
                return ['data' => null, 'error' => $recordsResult['error']];
            }

            $records = $recordsResult['data'] ?? [];

            // Create CSV content
            $csvContent = "Date,Description,Category,Amount\n";
            
            foreach ($records as $record) {
                $date = $record['transaction_date'];
                $description = $record['description'] ?? '';
                $category = $record['expense_categories']['display_name'] ?? 'Unknown';
                $amount = $record['amount'];
                
                $csvContent .= "\"{$date}\",\"{$description}\",\"{$category}\",{$amount}\n";
            }

            // Create temporary file
            $tempFile = tempnam(sys_get_temp_dir(), 'finance_export_');
            file_put_contents($tempFile, $csvContent);

            return ['data' => $tempFile, 'error' => null];

        } catch (\Exception $e) {
            error_log('Exception in exportData: ' . $e->getMessage());
            return ['data' => null, 'error' => 'Gagal export data'];
        }
    }

    /**
     * Import data keuangan dari file.
     *
     * @param \Psr\Http\Message\UploadedFileInterface $file File yang diupload.
     * @param string|null $accessToken Token akses pengguna.
     * @return array Hasil yang berisi 'imported_count' (int) dan 'data' atau 'error'.
     */
    public function importData($file, ?string $accessToken = null): array
    {
        try {
            if (!$file || $file->getError() !== UPLOAD_ERR_OK) {
                return ['imported_count' => 0, 'data' => null, 'error' => 'File upload error'];
            }

            $content = $file->getStream()->getContents();
            $lines = explode("\n", $content);
            
            // Remove header
            array_shift($lines);
            
            $importedCount = 0;
            $errors = [];

            foreach ($lines as $lineNumber => $line) {
                $line = trim($line);
                if (empty($line)) continue;

                $data = str_getcsv($line);
                if (count($data) < 4) {
                    $errors[] = "Line " . ($lineNumber + 2) . ": Invalid data format";
                    continue;
                }

                [$date, $description, $categoryName, $amount] = $data;

                // Validate date
                if (!strtotime($date)) {
                    $errors[] = "Line " . ($lineNumber + 2) . ": Invalid date format";
                    continue;
                }

                // Validate amount
                if (!is_numeric($amount) || $amount <= 0) {
                    $errors[] = "Line " . ($lineNumber + 2) . ": Invalid amount";
                    continue;
                }

                // Find category ID by name
                $categoryResult = $this->getExpenseCategories($accessToken);
                $categoryId = null;
                
                if (!$categoryResult['error']) {
                    foreach ($categoryResult['data'] as $category) {
                        if (strtolower($category['display_name']) === strtolower($categoryName)) {
                            $categoryId = $category['id'];
                            break;
                        }
                    }
                }

                if (!$categoryId) {
                    $errors[] = "Line " . ($lineNumber + 2) . ": Category '{$categoryName}' not found";
                    continue;
                }

                // Add record
                $recordData = [
                    'transaction_date' => $date,
                    'description' => $description,
                    'category_id' => $categoryId,
                    'amount' => $amount
                ];

                $addResult = $this->addFinancialRecord($recordData, $accessToken);
                
                if (!$addResult['error']) {
                    $importedCount++;
                } else {
                    $errors[] = "Line " . ($lineNumber + 2) . ": " . $addResult['error'];
                }
            }

            if (!empty($errors)) {
                return [
                    'imported_count' => $importedCount,
                    'data' => null,
                    'error' => 'Import completed with errors: ' . implode('; ', array_slice($errors, 0, 5))
                ];
            }

            return ['imported_count' => $importedCount, 'data' => null, 'error' => null];

        } catch (\Exception $e) {
            error_log('Exception in importData: ' . $e->getMessage());
            return ['imported_count' => 0, 'data' => null, 'error' => 'Gagal import data'];
        }
    }
}
