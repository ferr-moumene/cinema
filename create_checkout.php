<?php
/**
 * Cinema Cosmos — Chargily Pay PHP Integration
 * Creates a Chargily Pay Checkout Session via API v2
 */

header('Content-Type: application/json');
require_once __DIR__ . '/config.php';

if (!CHARGILY_SECRET_KEY) {
    http_response_code(503);
    echo json_encode(['status' => 'error', 'message' => 'Payment service is not configured on this server']);
    exit;
}

// Retrieve POST JSON Payload from Frontend
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid payload']);
    exit;
}

$amount = isset($input['amount']) ? (float)$input['amount'] : 2800;
$currency = isset($input['currency']) ? $input['currency'] : 'dzd';
$email = isset($input['email']) ? $input['email'] : 'client@cosmos.com';
$movie = isset($input['movie']) ? $input['movie'] : 'Cinema Cosmos Ticket';

// Define Redirect URLs
$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
$host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : '127.0.0.1:8080';
$baseUrl = "{$protocol}://{$host}";

$successUrl = "{$baseUrl}/index.html#thank-you";
$failureUrl = "{$baseUrl}/index.html#payment";

// Construct Chargily API v2 Checkout Payload
$payload = [
    'amount' => $amount,
    'currency' => strtolower($currency),
    'success_url' => $successUrl,
    'failure_url' => $failureUrl,
    'metadata' => [
        'customer_email' => $email,
        'movie_title' => $movie,
        'app' => 'Cinema Cosmos'
    ]
];

// Initialize cURL Request to Chargily API v2
$ch = curl_init(CHARGILY_API_URL . '/checkouts');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . CHARGILY_SECRET_KEY,
    'Content-Type: application/json',
    'User-Agent: CinemaCosmos-PHP/1.0'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200 || $httpCode === 201) {
    $data = json_decode($response, true);
    echo json_encode([
        'status' => 'success',
        'checkout_url' => $data['checkout_url'],
        'checkout_id' => $data['id']
    ]);
} else {
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to create Chargily payment session',
        'http_code' => $httpCode,
        'response' => json_decode($response, true)
    ]);
}
?>
