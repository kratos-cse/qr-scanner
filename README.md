# KRATOS ’26 QR scanner

Standalone check-in app. No login. It talks to the existing Kratos backend.

## Local setup

1. Backend running at `http://localhost:8000`.
2. Add this origin to backend `CORS_ORIGINS`:

   `http://localhost:5174`

3. Copy env:

   ```text
   copy .env.example .env
   ```

   `VITE_API_BASE_URL=http://localhost:8000/api/v1`

4. Install and run:

   ```text
   npm install
   npm run dev
   ```

   Opens on http://localhost:5174. Admin can link here with `NEXT_PUBLIC_QR_SCANNER_URL`.

## Camera

Browsers only allow the camera on `localhost` or HTTPS. A hosted scanner needs HTTPS. If the camera is blocked, type the QR token manually.

## Check-in

Pick a common checkpoint, then scan any event's participant QR. The QR decides the event and the person. Create that checkpoint once in the admin Attendance page. It is not tied to a single event. A team QR shows that team’s roster. Each checkbox checks in one member through `POST /api/v1/scanner/member-checkin`. Checked boxes cannot be cleared. The backend decides duplicates and eligibility.

Anyone who has a valid team QR can check in other members of that same team at that checkpoint while the short-lived capability is valid. It does not grant access to other teams or admin APIs.
