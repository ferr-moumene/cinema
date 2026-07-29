<?php
/**
 * Chargily Pay API v2 Configuration File
 * Cinema Cosmos Payment Integration
 */

// Configure these as server environment variables; never commit live credentials.
define('CHARGILY_PUBLIC_KEY', getenv('CHARGILY_PUBLIC_KEY') ?: '');
define('CHARGILY_SECRET_KEY', getenv('CHARGILY_SECRET_KEY') ?: '');

// Chargily API Endpoint (Test Environment)
define('CHARGILY_API_URL', getenv('CHARGILY_API_URL') ?: 'https://pay.chargily.net/test/api/v2');
?>
