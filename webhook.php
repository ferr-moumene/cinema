<?php
/**
 * Cinema Cosmos — Chargily Pay Webhook Listener
 * Receives payment status updates from Chargily Pay (e.g. checkout.paid)
 */

header('Content-Type: application/json');
require_once __DIR__ . '/config.php';

$rawBody = file_get_contents('php://input');
$data = json_decode($rawBody, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid webhook payload']);
    exit;
}

$event = isset($data['type']) ? $data['type'] : null;

if ($event === 'checkout.paid') {
    $checkout = $data['data'];
    $checkoutId = $checkout['id'];
    $metadata = isset($checkout['metadata']) ? $checkout['metadata'] : [];

    // Log or process successful payment in database
    error_log("Chargily Payment Received! Checkout ID: {$checkoutId}");

    echo json_encode(['status' => 'success', 'message' => 'Payment processed']);
} else {
    echo json_encode(['status' => 'ignored', 'event' => $event]);
}
?>
