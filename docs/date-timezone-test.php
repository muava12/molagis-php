<?php
/**
 * Test script untuk memverifikasi timezone handling
 * Jalankan dengan: php docs/date-timezone-test.php
 */

echo "=== Date Timezone Test ===\n\n";

// Test case: Input tanggal 4-6 Januari 2024
$startDateInput = '2024-01-04';
$endDateInput = '2024-01-06';

echo "Input dari frontend:\n";
echo "Start Date: {$startDateInput}\n";
echo "End Date: {$endDateInput}\n\n";

// Test 1: Tanpa timezone (masalah lama)
echo "1. DateTime tanpa timezone (MASALAH LAMA):\n";
try {
    $start1 = new DateTime($startDateInput);
    $end1 = new DateTime($endDateInput);
    
    echo "Start: " . $start1->format('Y-m-d H:i:s T') . "\n";
    echo "End: " . $end1->format('Y-m-d H:i:s T') . "\n";
    echo "Display: " . $start1->format('j') . '-' . $end1->format('j') . " Januari 2024\n\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n\n";
}

// Test 2: Dengan timezone Asia/Jakarta (solusi baru)
echo "2. DateTime dengan timezone Asia/Jakarta (SOLUSI BARU):\n";
try {
    $timezone = new DateTimeZone('Asia/Jakarta');
    $start2 = new DateTime($startDateInput, $timezone);
    $end2 = new DateTime($endDateInput, $timezone);
    
    echo "Start: " . $start2->format('Y-m-d H:i:s T') . "\n";
    echo "End: " . $end2->format('Y-m-d H:i:s T') . "\n";
    echo "Display: " . $start2->format('j') . '-' . $end2->format('j') . " Januari 2024\n\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n\n";
}

// Test 3: JavaScript toISOString() simulation
echo "3. JavaScript toISOString() simulation:\n";
$jsDate = new DateTime('2024-01-04 00:00:00', new DateTimeZone('Asia/Jakarta'));
echo "Local time: " . $jsDate->format('Y-m-d H:i:s T') . "\n";

// Convert to UTC (seperti toISOString())
$jsDate->setTimezone(new DateTimeZone('UTC'));
echo "UTC time: " . $jsDate->format('Y-m-d H:i:s T') . "\n";
echo "toISOString().split('T')[0]: " . $jsDate->format('Y-m-d') . "\n\n";

// Test 4: Local date formatting (solusi JavaScript baru)
echo "4. Local date formatting (SOLUSI JAVASCRIPT BARU):\n";
$localDate = new DateTime('2024-01-04 00:00:00', new DateTimeZone('Asia/Jakarta'));
$year = $localDate->format('Y');
$month = $localDate->format('m');
$day = $localDate->format('d');
echo "formatDateLocal result: {$year}-{$month}-{$day}\n\n";

// Test 5: Server timezone info
echo "5. Server timezone info:\n";
echo "Default timezone: " . date_default_timezone_get() . "\n";
echo "Current time: " . date('Y-m-d H:i:s T') . "\n";

echo "\n=== Test Complete ===\n";
?>
