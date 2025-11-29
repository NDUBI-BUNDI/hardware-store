<?php
/**
 * Hardware Store API
 * DASHEL Enterprise
 */

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$endpoint = $_GET['endpoint'] ?? '';

// Simple API key enforcement for write operations when API_KEY is set in config.php
if (in_array($method, ['POST', 'PUT', 'DELETE'])) {
    if (defined('API_KEY') && API_KEY) {
        // Read header (case-insensitive)
        $apiKeyHeader = null;
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            foreach ($headers as $k => $v) {
                if (strtolower($k) === 'x-api-key') { $apiKeyHeader = $v; break; }
            }
        }
        // fallback to $_SERVER
        if (!$apiKeyHeader) {
            $apiKeyHeader = $_SERVER['HTTP_X_API_KEY'] ?? $_SERVER['X_API_KEY'] ?? null;
        }

        if (!$apiKeyHeader || $apiKeyHeader !== API_KEY) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Unauthorized: invalid or missing API key']);
            exit();
        }
    }
}

try {
    switch($endpoint) {
        // DASHBOARD ENDPOINT
        case 'dashboard':
            if ($method === 'GET') {
                $stats = [];
                
                // Total Sales
                $stats['totalSales'] = $pdo->query(
                    "SELECT COALESCE(SUM(total_price), 0) as total FROM sales"
                )->fetch()['total'];
                
                // Inventory Value
                $stats['totalInventoryValue'] = $pdo->query(
                    "SELECT COALESCE(SUM(quantity * selling_price), 0) as total FROM inventory"
                )->fetch()['total'];
                
                // Low Stock Items
                $stats['lowStockItems'] = $pdo->query(
                    "SELECT COUNT(*) as count FROM inventory WHERE quantity < reorder_level"
                )->fetch()['count'];
                
                // Profit Calculation
                $totalCost = $pdo->query(
                    "SELECT COALESCE(SUM(s.quantity * i.buying_price), 0) as cost 
                     FROM sales s 
                     JOIN inventory i ON s.product_name = i.product_name"
                )->fetch()['cost'];
                $stats['profit'] = $stats['totalSales'] - $totalCost;
                
                // Recent Sales
                $stats['recentSales'] = $pdo->query(
                    "SELECT * FROM sales ORDER BY sale_date DESC LIMIT 5"
                )->fetchAll();
                
                // Total Products
                $stats['totalProducts'] = $pdo->query(
                    "SELECT COUNT(*) as count FROM inventory"
                )->fetch()['count'];
                
                // Total Suppliers
                $stats['totalSuppliers'] = $pdo->query(
                    "SELECT COUNT(*) as count FROM suppliers WHERE is_active = 1"
                )->fetch()['count'];
                
                sendResponse(['success' => true, 'data' => $stats]);
            }
            break;
        
        // SALES ENDPOINTS
        case 'sales':
            if ($method === 'GET') {
                $page = $_GET['page'] ?? 1;
                $limit = 20;
                $offset = ($page - 1) * $limit;
                
                $sales = $pdo->query(
                    "SELECT * FROM sales ORDER BY sale_date DESC LIMIT $limit OFFSET $offset"
                )->fetchAll();
                
                $total = $pdo->query("SELECT COUNT(*) as count FROM sales")->fetch()['count'];
                
                sendResponse([
                    'success' => true,
                    'data' => $sales,
                    'pagination' => [
                        'page' => (int)$page,
                        'limit' => $limit,
                        'total' => (int)$total,
                        'pages' => ceil($total / $limit)
                    ]
                ]);
            } 
            elseif ($method === 'POST') {
                $data = getRequestData();
                
                $missing = validateRequired($data, ['product_name', 'quantity', 'unit_price', 'sale_date']);
                if (!empty($missing)) {
                    sendResponse([
                        'success' => false,
                        'error' => 'Missing required fields: ' . implode(', ', $missing)
                    ], 400);
                }
                
                $stmt = $pdo->prepare(
                    "INSERT INTO sales (product_name, quantity, unit_price, total_price, sale_date, notes) 
                     VALUES (?, ?, ?, ?, ?, ?)"
                );
                $total = $data['quantity'] * $data['unit_price'];
                $stmt->execute([
                    $data['product_name'],
                    $data['quantity'],
                    $data['unit_price'],
                    $total,
                    $data['sale_date'],
                    $data['notes'] ?? null
                ]);
                
                // Update inventory
                $stmt = $pdo->prepare("UPDATE inventory SET quantity = quantity - ? WHERE product_name = ?");
                $stmt->execute([$data['quantity'], $data['product_name']]);
                
                sendResponse([
                    'success' => true,
                    'message' => 'Sale recorded successfully',
                    'id' => $pdo->lastInsertId()
                ], 201);
            }
            break;
        
        // INVENTORY ENDPOINTS
        case 'inventory':
            if ($method === 'GET') {
                $inventory = $pdo->query(
                    "SELECT i.*, s.name as supplier_name 
                     FROM inventory i 
                     LEFT JOIN suppliers s ON i.supplier_id = s.id 
                     ORDER BY i.product_name"
                )->fetchAll();
                sendResponse(['success' => true, 'data' => $inventory]);
            } 
            elseif ($method === 'POST') {
                $data = getRequestData();
                
                $missing = validateRequired($data, ['product_name', 'quantity', 'buying_price', 'selling_price']);
                if (!empty($missing)) {
                    sendResponse([
                        'success' => false,
                        'error' => 'Missing required fields: ' . implode(', ', $missing)
                    ], 400);
                }
                
                $stmt = $pdo->prepare(
                    "INSERT INTO inventory (product_name, quantity, buying_price, selling_price, supplier_id, reorder_level, description) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)"
                );
                $stmt->execute([
                    $data['product_name'],
                    $data['quantity'],
                    $data['buying_price'],
                    $data['selling_price'],
                    $data['supplier_id'] ?? null,
                    $data['reorder_level'] ?? 10,
                    $data['description'] ?? null
                ]);
                
                sendResponse([
                    'success' => true,
                    'message' => 'Product added successfully',
                    'id' => $pdo->lastInsertId()
                ], 201);
            }
            break;
        
        // SUPPLIERS ENDPOINTS
        case 'suppliers':
            if ($method === 'GET') {
                $suppliers = $pdo->query(
                    "SELECT * FROM suppliers WHERE is_active = 1 ORDER BY name"
                )->fetchAll();
                sendResponse(['success' => true, 'data' => $suppliers]);
            } 
            elseif ($method === 'POST') {
                $data = getRequestData();
                
                $missing = validateRequired($data, ['name', 'phone']);
                if (!empty($missing)) {
                    sendResponse([
                        'success' => false,
                        'error' => 'Missing required fields: ' . implode(', ', $missing)
                    ], 400);
                }
                
                $stmt = $pdo->prepare(
                    "INSERT INTO suppliers (name, phone, email, address, products_supplied, payment_terms) 
                     VALUES (?, ?, ?, ?, ?, ?)"
                );
                $stmt->execute([
                    $data['name'],
                    $data['phone'],
                    $data['email'] ?? null,
                    $data['address'] ?? null,
                    $data['products_supplied'] ?? null,
                    $data['payment_terms'] ?? null
                ]);
                
                sendResponse([
                    'success' => true,
                    'message' => 'Supplier added successfully',
                    'id' => $pdo->lastInsertId()
                ], 201);
            }
            break;
        
        // M-PESA STK PUSH ENDPOINT
        case 'stk-push':
            if ($method === 'POST') {
                $data = getRequestData();
                
                $missing = validateRequired($data, ['phone', 'amount']);
                if (!empty($missing)) {
                    sendResponse([
                        'success' => false,
                        'error' => 'Missing required fields: ' . implode(', ', $missing)
                    ], 400);
                }
                
                $phone = $data['phone'];
                $amount = (int)$data['amount'];
                $reference = 'HW' . time();
                
                // Get M-Pesa access token
                $credentials = base64_encode(MPESA_CONSUMER_KEY . ':' . MPESA_CONSUMER_SECRET);
                $tokenUrl = 'https://' . MPESA_ENV . '.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
                
                $ch = curl_init($tokenUrl);
                curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Basic ' . $credentials]);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                $response = curl_exec($ch);
                $tokenData = json_decode($response);
                $accessToken = $tokenData->access_token ?? '';
                curl_close($ch);
                
                if (!$accessToken) {
                    logError('Failed to get M-Pesa token', ['response' => $response]);
                    sendResponse([
                        'success' => false,
                        'message' => 'Failed to get M-Pesa token'
                    ], 500);
                }
                
                // STK Push request
                $timestamp = date('YmdHis');
                $password = base64_encode(MPESA_SHORTCODE . MPESA_PASSKEY . $timestamp);
                
                $stkUrl = 'https://' . MPESA_ENV . '.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
                $stkData = [
                    'BusinessShortCode' => MPESA_SHORTCODE,
                    'Password' => $password,
                    'Timestamp' => $timestamp,
                    'TransactionType' => 'CustomerPayBillOnline',
                    'Amount' => $amount,
                    'PartyA' => $phone,
                    'PartyB' => MPESA_SHORTCODE,
                    'PhoneNumber' => $phone,
                    'CallBackURL' => MPESA_CALLBACK_URL,
                    'AccountReference' => $reference,
                    'TransactionDesc' => 'Hardware Payment'
                ];
                
                $ch = curl_init($stkUrl);
                curl_setopt($ch, CURLOPT_HTTPHEADER, [
                    'Authorization: Bearer ' . $accessToken,
                    'Content-Type: application/json'
                ]);
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($stkData));
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                $stkResponse = curl_exec($ch);
                curl_close($ch);
                
                // Save STK push record
                // store optional merchant/paybill metadata if provided
                $paybill = $data['paybill'] ?? MPESA_SHORTCODE;
                $merchantAccount = $data['merchant_account'] ?? null;

                $stmt = $pdo->prepare(
                    "INSERT INTO stk_pushes (phone, amount, reference, status, response, merchant_request_id, checkout_request_id, result_code, result_desc, paybill, merchant_account, attempts) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
                );
                $stmt->execute([$phone, $amount, $reference, 'pending', $stkResponse, $responseData->MerchantRequestID ?? null, $responseData->CheckoutRequestID ?? null, $responseData->ResponseCode ?? null, $responseData->ResponseDescription ?? null, $paybill, $merchantAccount, 1]);
                
                $responseData = json_decode($stkResponse, true);
                if (isset($responseData['ResponseCode']) && $responseData['ResponseCode'] == '0') {
                    sendResponse([
                        'success' => true,
                        'message' => 'STK push sent successfully',
                        'data' => $responseData
                    ]);
                } else {
                    sendResponse([
                        'success' => false,
                        'message' => 'STK push failed',
                        'data' => $responseData
                    ], 400);
                }
            }
            break;
        
        // STK HISTORY ENDPOINT
        case 'stk-history':
            if ($method === 'GET') {
                $history = $pdo->query(
                    "SELECT * FROM stk_pushes ORDER BY created_at DESC LIMIT 20"
                )->fetchAll();
                sendResponse(['success' => true, 'data' => $history]);
            }
            break;
        
        // SEARCH ENDPOINT
        case 'search':
            if ($method === 'GET') {
                $query = $_GET['q'] ?? '';
                if (strlen($query) < 2) {
                    sendResponse([
                        'success' => false,
                        'error' => 'Search query too short'
                    ], 400);
                }
                
                $searchTerm = '%' . $query . '%';
                $results = [];
                
                $results['products'] = $pdo->prepare(
                    "SELECT id, product_name as name, quantity FROM inventory WHERE product_name LIKE ?"
                );
                $results['products']->execute([$searchTerm]);
                $results['products'] = $results['products']->fetchAll();
                
                $results['suppliers'] = $pdo->prepare(
                    "SELECT id, name FROM suppliers WHERE name LIKE ? AND is_active = 1"
                );
                $results['suppliers']->execute([$searchTerm]);
                $results['suppliers'] = $results['suppliers']->fetchAll();
                
                sendResponse(['success' => true, 'data' => $results]);
            }
            break;

        // SUPPLIER FINANCIALS - invoices, payments, ledger and balances
        case 'supplier-invoice':
            if ($method === 'POST') {
                $data = getRequestData();
                $missing = validateRequired($data, ['supplier_id', 'amount']);
                if (!empty($missing)) {
                    sendResponse(['success' => false, 'error' => 'Missing required fields: ' . implode(', ', $missing)], 400);
                }

                $stmt = $pdo->prepare("INSERT INTO supplier_invoices (supplier_id, amount, description) VALUES (?, ?, ?)");
                $stmt->execute([$data['supplier_id'], $data['amount'], $data['description'] ?? null]);

                sendResponse(['success' => true, 'message' => 'Invoice recorded', 'id' => $pdo->lastInsertId()], 201);
            }
            break;

        case 'supplier-payment':
            if ($method === 'POST') {
                $data = getRequestData();
                $missing = validateRequired($data, ['supplier_id', 'amount']);
                if (!empty($missing)) {
                    sendResponse(['success' => false, 'error' => 'Missing required fields: ' . implode(', ', $missing)], 400);
                }

                $stmt = $pdo->prepare("INSERT INTO supplier_payments (supplier_id, amount, method, reference) VALUES (?, ?, ?, ?)");
                $stmt->execute([$data['supplier_id'], $data['amount'], $data['method'] ?? null, $data['reference'] ?? null]);

                sendResponse(['success' => true, 'message' => 'Payment recorded', 'id' => $pdo->lastInsertId()], 201);
            }
            break;

        case 'supplier-ledger':
            if ($method === 'GET') {
                $supplierId = $_GET['supplier_id'] ?? null;
                if (!$supplierId) {
                    sendResponse(['success' => false, 'error' => 'supplier_id is required'], 400);
                }

                $invoices = $pdo->prepare("SELECT id, amount, description, created_at, 'invoice' as type FROM supplier_invoices WHERE supplier_id = ? ORDER BY created_at DESC");
                $invoices->execute([$supplierId]);
                $invoices = $invoices->fetchAll();

                $payments = $pdo->prepare("SELECT id, amount, method, reference, created_at, 'payment' as type FROM supplier_payments WHERE supplier_id = ? ORDER BY created_at DESC");
                $payments->execute([$supplierId]);
                $payments = $payments->fetchAll();

                // merge and sort by created_at desc
                $ledger = array_merge($invoices, $payments);
                usort($ledger, function($a, $b){ return strtotime($b['created_at']) - strtotime($a['created_at']); });

                sendResponse(['success' => true, 'data' => $ledger]);
            }
            break;

        case 'supplier-balances':
            if ($method === 'GET') {
                $stmt = $pdo->query(
                    "SELECT s.id, s.name,
                        (SELECT COALESCE(SUM(amount),0) FROM supplier_invoices WHERE supplier_id = s.id) as invoices_total,
                        (SELECT COALESCE(SUM(amount),0) FROM supplier_payments WHERE supplier_id = s.id) as payments_total,
                        ((SELECT COALESCE(SUM(amount),0) FROM supplier_invoices WHERE supplier_id = s.id) - (SELECT COALESCE(SUM(amount),0) FROM supplier_payments WHERE supplier_id = s.id)) as owed
                     FROM suppliers s WHERE s.is_active = 1"
                );

                $balances = $stmt->fetchAll();
                sendResponse(['success' => true, 'data' => $balances]);
            }
            break;

        // BANK PAYMENTS - CSV batch flow
        case 'bank-payments':
            if ($method === 'GET') {
                // list bank payments with optional status filter
                $status = $_GET['status'] ?? null;
                if ($status) {
                    $stmt = $pdo->prepare("SELECT bp.*, s.name as supplier_name, s.bank_name, s.bank_account, s.bank_branch FROM bank_payments bp JOIN suppliers s ON bp.supplier_id = s.id WHERE bp.status = ? ORDER BY bp.created_at DESC");
                    $stmt->execute([$status]);
                } else {
                    $stmt = $pdo->query("SELECT bp.*, s.name as supplier_name, s.bank_name, s.bank_account, s.bank_branch FROM bank_payments bp JOIN suppliers s ON bp.supplier_id = s.id ORDER BY bp.created_at DESC");
                }
                $rows = $stmt->fetchAll();
                sendResponse(['success' => true, 'data' => $rows]);
            } elseif ($method === 'POST') {
                // create a bank payment draft
                $data = getRequestData();
                $missing = validateRequired($data, ['supplier_id', 'amount']);
                if (!empty($missing)) {
                    sendResponse(['success' => false, 'error' => 'Missing required fields: ' . implode(', ', $missing)], 400);
                }

                $stmt = $pdo->prepare("INSERT INTO bank_payments (supplier_id, amount, currency, bank_name, account_number, branch, status) VALUES (?, ?, ?, ?, ?, ?, 'draft')");
                $stmt->execute([
                    $data['supplier_id'],
                    $data['amount'],
                    $data['currency'] ?? 'KES',
                    $data['bank_name'] ?? null,
                    $data['account_number'] ?? null,
                    $data['branch'] ?? null
                ]);

                sendResponse(['success' => true, 'message' => 'Bank payment draft created', 'id' => $pdo->lastInsertId()], 201);
            }
            break;

        case 'bank-payments-export':
            // Export selected bank payments as CSV and mark exported with a batch id
            if ($method === 'POST') {
                $data = getRequestData();
                $ids = $data['ids'] ?? [];
                // if no ids provided, export all drafts
                if (!is_array($ids) || count($ids) === 0) {
                    $stmt = $pdo->prepare("SELECT bp.*, s.name as supplier_name, s.bank_name, s.bank_account, s.bank_branch FROM bank_payments bp JOIN suppliers s ON bp.supplier_id = s.id WHERE bp.status = 'draft' ORDER BY bp.created_at ASC");
                    $stmt->execute();
                } else {
                    // build placeholders
                    $placeholders = implode(',', array_fill(0, count($ids), '?'));
                    $stmt = $pdo->prepare("SELECT bp.*, s.name as supplier_name, s.bank_name, s.bank_account, s.bank_branch FROM bank_payments bp JOIN suppliers s ON bp.supplier_id = s.id WHERE bp.id IN ({$placeholders}) ORDER BY bp.created_at ASC");
                    $stmt->execute($ids);
                }

                $rows = $stmt->fetchAll();
                if (!$rows || count($rows) === 0) {
                    sendResponse(['success' => false, 'error' => 'No bank payments found to export'], 400);
                }

                // Build CSV lines
                $csvHeader = ['SupplierName','BankName','AccountNumber','Branch','Amount','Currency','Reference'];
                $csvLines = [implode(',', $csvHeader)];
                foreach ($rows as $r) {
                    $ref = 'BP' . time() . '-' . $r['id'];
                    $line = [
                        '"' . str_replace('"','""',$r['supplier_name']) . '"',
                        '"' . str_replace('"','""', $r['bank_name'] ?? '') . '"',
                        '"' . ($r['bank_account'] ?? '') . '"',
                        '"' . ($r['branch'] ?? '') . '"',
                        number_format($r['amount'],2,'.',''),
                        $r['currency'] ?? 'KES',
                        '"' . $ref . '"'
                    ];
                    $csvLines[] = implode(',', $line);
                }

                $csv = implode("\n", $csvLines);

                // mark exported and set batch_id
                $batchId = 'BATCH-' . time();
                $now = date('Y-m-d H:i:s');
                $idsToUpdate = array_column($rows, 'id');
                $placeholders = implode(',', array_fill(0, count($idsToUpdate), '?'));
                $updateSql = "UPDATE bank_payments SET status = 'exported', batch_id = ?, exported_at = ? WHERE id IN ({$placeholders})";
                $stmtUp = $pdo->prepare($updateSql);
                $params = array_merge([$batchId, $now], $idsToUpdate);
                $stmtUp->execute($params);

                // Return CSV content (frontend will prompt download) and batch id
                sendResponse(['success' => true, 'data' => ['csv' => $csv, 'batch_id' => $batchId]]);
            }
            break;

        // SALES ANALYTICS - aggregated sales / cost / profit with selectable granularity
        // Query params supported: granularity = daily|monthly|quarterly|yearly (default: monthly)
        // Optional: from=YYYY-MM-DD, to=YYYY-MM-DD
        case 'sales-analytics':
            if ($method === 'GET') {
                $gran = strtolower(trim($_GET['granularity'] ?? 'monthly'));
                $from = $_GET['from'] ?? null;
                $to = $_GET['to'] ?? null;

                // Build period expression depending on granularity
                switch ($gran) {
                    case 'daily':
                        $periodExpr = "DATE_FORMAT(s.sale_date, '%Y-%m-%d')";
                        break;
                    case 'quarterly':
                        // e.g. 2025-Q1
                        $periodExpr = "CONCAT(YEAR(s.sale_date), '-Q', QUARTER(s.sale_date))";
                        break;
                    case 'yearly':
                        $periodExpr = "CAST(YEAR(s.sale_date) AS CHAR)";
                        break;
                    case 'monthly':
                    default:
                        $periodExpr = "DATE_FORMAT(s.sale_date, '%Y-%m')";
                        $gran = 'monthly';
                        break;
                }

                // Build base SQL with optional date filters
                $where = "";
                $params = [];
                if ($from && $to) {
                    $where = "WHERE s.sale_date BETWEEN ? AND ?";
                    $params[] = $from;
                    $params[] = $to;
                } elseif ($from) {
                    $where = "WHERE s.sale_date >= ?";
                    $params[] = $from;
                } elseif ($to) {
                    $where = "WHERE s.sale_date <= ?";
                    $params[] = $to;
                }

                $sql = "SELECT {$periodExpr} AS period,
                            COALESCE(SUM(s.total_price),0) AS sales_total,
                            COALESCE(SUM(s.quantity * IFNULL(i.buying_price,0)),0) AS cost_total
                        FROM sales s
                        LEFT JOIN inventory i ON s.product_name = i.product_name
                        {$where}
                        GROUP BY period
                        ORDER BY period ASC";

                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                $rows = $stmt->fetchAll();

                $out = array_map(function($r){
                    return [
                        'period' => $r['period'],
                        'sales_total' => (float)$r['sales_total'],
                        'cost_total' => (float)$r['cost_total'],
                        'profit' => (float)$r['sales_total'] - (float)$r['cost_total']
                    ];
                }, $rows);

                sendResponse(['success' => true, 'data' => $out, 'meta' => ['granularity' => $gran]]);
            }
            break;
        
        default:
            sendResponse([
                'success' => false,
                'error' => 'Invalid endpoint'
            ], 404);
    }
} catch(Exception $e) {
    logError('API Error', ['endpoint' => $endpoint, 'error' => $e->getMessage()]);
    sendResponse([
        'success' => false,
        'error' => $e->getMessage()
    ], 500);
}
?>
