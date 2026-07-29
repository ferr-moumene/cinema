<?php
/**
 * Cinema Cosmos — Secure Server-Side Login Script (PHP)
 * Validates admin credentials securely on the server
 */

header('Content-Type: application/json');
require_once __DIR__ . '/config.php';

$ADMIN_USER = 'admin';
$adminPassword = getenv('CINEMA_ADMIN_PASSWORD') ?: '';
$ADMIN_PASS_HASH = $adminPassword ? hash('sha256', $adminPassword) : null;

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request']);
    exit;
}

$user = isset($input['username']) ? trim($input['username']) : '';
$password = isset($input['password']) ? trim($input['password']) : '';

$inputHash = hash('sha256', $password);

if ($ADMIN_PASS_HASH && $user === $ADMIN_USER && hash_equals($ADMIN_PASS_HASH, $inputHash)) {
    $token = bin2hex(random_bytes(32));
    echo json_encode([
        'status' => 'success',
        'role' => 'admin',
        'token' => $token,
        'message' => 'Authenticated successfully as Administrator'
    ]);
} else {
    http_response_code(401);
    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid username or password'
    ]);
}
?>
