<?php
/**
 * M-Pesa STK Push Callback Handler
 * DASHEL Enterprise
 */

require_once 'config.php';

// Get the callback data
$callbackData = file_get_contents('php://input');

// Log the callback
file_put_contents(
    'logs/mpesa_callback_' . date('Y-m-d') . '.log',
    date('Y-m-d H:i:s') . ' - ' . $callbackData . PHP_EOL,
    FILE_APPEND
);

// Parse the callback
$callback = json_decode($callbackData, true);

try {
    if (isset($callback['Body']['stkCallback'])) {
        $stkCallback = $callback['Body']['stkCallback'];
        
        $merchantRequestId = $stkCallback['MerchantRequestID'];
        $checkoutRequestId = $stkCallback['CheckoutRequestID'];
        $resultCode = $stkCallback['ResultCode'];
        $resultDesc = $stkCallback['ResultDesc'];
        
        // Find the STK push record
        $stmt = $pdo->prepare(
            "UPDATE stk_pushes 
             SET status = ?, result_code = ?, result_desc = ?, 
                 merchant_request_id = ?, checkout_request_id = ?, 
                 updated_at = NOW()
             WHERE merchant_request_id = ? OR checkout_request_id = ?"
        );
        
        $status = ($resultCode == 0) ? 'completed' : 'failed';
        $stmt->execute([
            $status,
            $resultCode,
            $resultDesc,
            $merchantRequestId,
            $checkoutRequestId,
            $merchantRequestId,
            $checkoutRequestId
        ]);
        
        // If successful and has item metadata, could process the payment
        if ($resultCode == 0 && isset($stkCallback['CallbackMetadata'])) {
            // Process successful payment
        }
    }
} catch (Exception $e) {
    file_put_contents(
        'logs/mpesa_callback_error_' . date('Y-m-d') . '.log',
        date('Y-m-d H:i:s') . ' - ' . $e->getMessage() . PHP_EOL,
        FILE_APPEND
    );
}

// Always return 200 to acknowledge receipt
http_response_code(200);
echo json_encode(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
?>
