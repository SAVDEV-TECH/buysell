Admin UI (static) — Failed Escrow Auto-Releases

Files:
- admin_ui.html — Minimal static admin interface to list failed auto-release escrows and call retryTransfer.

Setup:
1. Replace firebaseConfig placeholders in admin_ui.html with your project's Firebase configuration (apiKey, authDomain, projectId).
2. Ensure your Cloud Functions are deployed and include the callable functions:
   - listFailedAutoReleases
   - retryTransfer
3. Make the signed-in account an admin by setting custom claim `admin: true` using Admin SDK.

Hosting:
- Host the file as static content (Firebase Hosting, S3, GitHub Pages, local web server). Example:
  python -m http.server 8000
  Then open http://localhost:8000/admin_ui.html

Security notes:
- The UI checks the `admin` custom claim in the ID token before showing data; ensure only trusted accounts have that claim.
- Serve the UI over HTTPS in production.

Usage:
- Sign in with Google, confirm you have admin claim, click "Refresh list".
- For each failed escrow, click "Retry Transfer (admin)" to call the retryTransfer callable.

Enhancements:
- Add pagination and search.
- Show transfer logs and success/failure details.
- Add server-side rate-limiting for retryTransfer to avoid abuse.
