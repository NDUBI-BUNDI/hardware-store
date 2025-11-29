<?php
/**
 * Hardware Store Admin - Configuration File
 * DASHEL Enterprise
 */

// Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-KEY');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database configuration
$host = getenv('MYSQL_HOST') ?: 'localhost';
$dbname = getenv('MYSQL_DATABASE') ?: 'hardware_store';
$username = getenv('MYSQL_USER') ?: 'root';
$password = getenv('MYSQL_PASSWORD') ?: 'root123';
$port = getenv('MYSQL_PORT') ?: '3306';

try {
    $pdo = new PDO(
        "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database connection failed',
        'message' => $e->getMessage()
    ]);
    exit();
}

// M-Pesa credentials
define('MPESA_CONSUMER_KEY', getenv('MPESA_CONSUMER_KEY') ?: 'YOUR_CONSUMER_KEY');
define('MPESA_CONSUMER_SECRET', getenv('MPESA_CONSUMER_SECRET') ?: 'YOUR_CONSUMER_SECRET');
define('MPESA_SHORTCODE', getenv('MPESA_SHORTCODE') ?: 'YOUR_SHORTCODE');
define('MPESA_PASSKEY', getenv('MPESA_PASSKEY') ?: 'YOUR_PASSKEY');
define('MPESA_ENV', getenv('MPESA_ENV') ?: 'sandbox');
define('MPESA_CALLBACK_URL', getenv('MPESA_CALLBACK_URL') ?: 'https://yourdomain.com/backend/callback.php');

// Application settings
define('APP_NAME', 'Hardware Store Admin - DASHEL');
define('APP_VERSION', '1.0.0');
define('DEBUG', getenv('DEBUG') === 'true');

// Optional API key for simple protected endpoints in development/preview.
// If empty, API key checks are skipped (convenient for local dev). Set via environment variable API_KEY.
define('API_KEY', getenv('API_KEY') ?: '');

/**
 * Send JSON response
 */
function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit();
}

/**
 * Get request data
 */
function getRequestData() {
    $input = file_get_contents('php://input');
    return json_decode($input, true) ?? [];
}

/**
 * Validate required fields
 */
function validateRequired($data, $required) {
    $missing = [];
    foreach ($required as $field) {
        if (!isset($data[$field]) || $data[$field] === '') {
            $missing[] = $field;
        }
    }
    return $missing;
}

/**
 * Log errors for debugging
 */
function logError($message, $context = []) {
    if (DEBUG) {
        $timestamp = date('Y-m-d H:i:s');
        $logMessage = "[$timestamp] $message";
        if (!empty($context)) {
            $logMessage .= " | " . json_encode($context);
        }
        error_log($logMessage);
    }
}
?>
