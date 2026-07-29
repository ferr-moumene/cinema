# Cinema Cosmos

A browser-based cinema booking prototype with a Python or PHP checkout endpoint for Chargily Pay.

## What it does

- Browse movies and showtimes, select seats, and review a booking.
- Start a Chargily Pay checkout when the server is configured.
- Use the explicit demo-payment button for a local walkthrough; demo tickets are stored only in the current browser's local storage.
- Sign in as an administrator to edit the local movie catalogue. Customer profiles are also local-browser only.

## Run locally (Python)

In PowerShell, set configuration for the current session, then start the server:

```powershell
$env:CINEMA_ADMIN_PASSWORD = 'choose-a-long-unique-password'
$env:CHARGILY_SECRET_KEY = 'your_chargily_test_secret_key'
python server.py
```

Open `http://127.0.0.1:8080`. Use the administrator username `admin` and the password configured above.

For a visual-only demo, omit `CHARGILY_SECRET_KEY` and use **Demo Test Pay**. The normal payment button will correctly report that checkout is unavailable.

## Before deployment

- Set secrets through the host's environment/secret manager; do not add them to source control.
- Serve the site over HTTPS and configure Chargily success/failure URLs to the public site.
- Verify the official Chargily webhook signature before treating an event as paid, and store orders in a database.
- Replace local-browser customer/admin state with server-side accounts, sessions, authorization, and persistent movie/order data.
