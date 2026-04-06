# Event Transport Dispatch System

A production-style transport dispatch platform for coordinating event cab operations across hotels and a main venue.

## Tech Stack

- Backend: Java 17, Spring Boot 3.2, Spring Data JPA
- Database: H2 (dev), PostgreSQL (prod)
- Frontend: React 18, TypeScript, Vite, Tailwind CSS
- PWA: Service worker + Web Push (VAPID)

## Core Capabilities

- Guest ride booking with passenger split logic (for > cab capacity)
- Unified guest/driver OTP login plus admin credential login
- Admin dispatch queue with batch assignment and capacity checks
- Driver consent flow (accept / deny) before trip start
- OTP validation at trip start (not drop-off)
- Live trip progression: OFFERED -> ACCEPTED -> ARRIVED -> IN_TRANSIT -> COMPLETED
- Guest/admin cancellation handling with notifications
- Driver analytics (total km, completed/denied trips, avg acceptance time)
- Distance tracking (`Location.distanceFromMainVenue`, `Cab.totalKm`)
- Daily cancelled/declined history queue (persistent incident log)
- Daily admin operational reports and CSV exports
- Complaint system (OPEN/CLOSED)
- Event itinerary with details page and image support
- Admin event image upload endpoint
- JWT-based API access control for ADMIN/DRIVER/GUEST contexts
- Push notifications for ADMIN / DRIVER / GUEST
- SLA alerting for delayed rides

## User Roles and Features

### Guest

- Login with name + phone + OTP
- View event timeline
- Open event details page (`/events/:eventId`)
- Book ride (to venue / to hotel)
- Use custom destination when selecting `Others`
- Track active ride status in real time
- View OTP at pickup for trip start
- Cancel eligible rides
- File complaint from header
- Receive push notifications

### Admin

- Login with admin username/password from environment variables
- View pending ride queue grouped by location
- Assign rides to available cabs with capacity checks
- Monitor active trips
- View and filter cancelled/declined history by date
- Filter cancelled queue by date, driver, and incident status
- View driver details in incident queue
- Open driver analytics modal from fleet list
- Manage complaints and close tickets
- Filter complaints by status/date and export CSV
- Manage events (create/update, notify guests)
- Upload event images (`/api/v1/events/images`) with type/size validation
- Edit admin contact settings
- Receive SLA and operational push alerts

### Driver

- Login with registered phone + OTP
- View assigned/active rides
- Accept or deny assigned batch
- Mark arrived
- Start trip via OTP
- Complete trip
- Toggle availability/offline status
- Receive targeted push notifications

## Ride and Incident Lifecycle

### RideStatus

- `PENDING`
- `OFFERED`
- `ACCEPTED`
- `ARRIVED`
- `IN_TRANSIT`
- `COMPLETED`
- `CANCELLED`

### ComplaintStatus

- `OPEN`
- `CLOSED`

### RideIncidentType

- `GUEST_CANCELLED`
- `DRIVER_DECLINED`

Notes:
- Cancelled Queue is now backed by persistent `ride_incidents`, so entries do not disappear when a ride is later reassigned or accepted.
- Queue is filterable by date + driver + incident type.
- Complaints lifecycle is fixed to `OPEN` -> `CLOSED`.

## Frontend Routes

| Route | Description |
|---|---|
| `/` | Unified guest / driver OTP login and admin login |
| `/home` | Guest home (timeline + booking + active rides) |
| `/request` | Guest request ride page |
| `/status` | Guest ride status page |
| `/events/:eventId` | Guest event details |
| `/admin` | Admin dashboard |
| `/driver` | Driver dashboard |

### Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/v1/auth/request-otp` | Generate a 5-minute OTP for guest/driver login |
| `POST` | `/api/v1/auth/verify-otp` | Verify OTP and issue JWT |
| `POST` | `/api/v1/auth/admin-login` | Admin login via environment-backed credentials |

## API Reference

### Rides

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/v1/rides` | Create ride request |
| `GET` | `/api/v1/rides/pending` | Pending queue |
| `GET` | `/api/v1/rides/guest?phone=` | Guest active rides |
| `GET` | `/api/v1/rides/trip/{magicLinkId}` | Batch by magic link |
| `GET` | `/api/v1/rides/cab/{cabId}` | Active rides by cab |
| `GET` | `/api/v1/rides/cab/{cabId}/completed` | Completed rides by cab |
| `GET` | `/api/v1/rides/ongoing` | Admin ongoing trips |
| `GET` | `/api/v1/rides/cancelled?date=YYYY-MM-DD&driver=&status=` | Filtered cancelled/declined incidents |
| `PUT` | `/api/v1/rides/{id}/accept` | Driver accepts offered batch |
| `PUT` | `/api/v1/rides/{id}/deny` | Driver denies offered batch |
| `DELETE` | `/api/v1/rides/{rideId}` | Cancel ride |

### Dispatch

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/v1/dispatch/assign` | Assign rides to cab |
| `POST` | `/api/v1/dispatch/arrive/{id}` | Mark arrived |
| `POST` | `/api/v1/dispatch/start/{id}` | Start trip with OTP |
| `POST` | `/api/v1/dispatch/complete/{id}` | Complete trip |
| `POST` | `/api/v1/dispatch/status/{magicLinkId}` | Admin status override |

### Cabs

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/cabs` | Fleet list |
| `GET` | `/api/v1/cabs/{cabId}/analytics` | Driver analytics |
| `PUT` | `/api/v1/cabs/status` | Driver availability status |

### Events

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/events` | List events |
| `GET` | `/api/v1/events/{id}` | Event details |
| `POST` | `/api/v1/events` | Create event |
| `PUT` | `/api/v1/events/{id}` | Update event |
| `POST` | `/api/v1/events/images` | Upload event image (multipart) |

### Complaints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/v1/complaints` | File complaint |
| `GET` | `/api/v1/complaints?status=OPEN|CLOSED&date=YYYY-MM-DD` | Filtered complaints |
| `PUT` / `PATCH` | `/api/v1/complaints/{id}/close` | Close complaint |

### Admin Reports / Exports

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/admin/reports/daily?date=YYYY-MM-DD` | Daily operational report |
| `GET` | `/api/v1/admin/reports/exports/cancelled-queue?...` | Cancelled queue CSV |
| `GET` | `/api/v1/admin/reports/exports/driver-analytics` | Driver analytics CSV |
| `GET` | `/api/v1/admin/reports/exports/complaints?...` | Complaints CSV |

### Access Control (Protected APIs)

For protected endpoints, send:

- `Authorization: Bearer <jwt>`

Server returns JSON errors on denied or expired sessions:

- `401 Unauthorized`
- `403 Forbidden`

### Config / Metadata

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/locations` | Locations + distance from venue |
| `GET` | `/api/v1/config` | Admin contact config |
| `PUT` | `/api/v1/config` | Update admin contact config |
| `GET` | `/api/v1/notifications` | Poll event notifications |

### Push

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/v1/push/subscribe` | Register web push subscription |
| `POST` | `/api/v1/push/unsubscribe` | Unregister subscription |
| `GET` | `/api/v1/push/vapid-public-key` | Retrieve VAPID public key |

## API Examples (curl)

### 1) Request a guest OTP

```bash
curl -X POST "http://localhost:8080/api/v1/auth/request-otp" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Aman",
    "phone": "9999999999",
    "role": "GUEST"
  }'
```

### 2) Daily cancelled/declined history

```bash
curl -X GET "http://localhost:8080/api/v1/rides/cancelled?date=2026-03-29&status=DRIVER_DECLINED" \
  -H "Authorization: Bearer <admin_jwt>"
```

### 3) File a complaint (guest)

```bash
curl -X POST "http://localhost:8080/api/v1/complaints" \
  -H "Content-Type: application/json" \
  -d '{
    "guestName": "Aman",
    "guestPhone": "9999999999",
    "message": "Driver arrived very late",
    "rideRequestId": 42
  }'
```

### 4) Close complaint (admin)

```bash
curl -X PUT "http://localhost:8080/api/v1/complaints/12/close" \
  -H "Authorization: Bearer <admin_jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "closedBy": "Event Admin"
  }'
```

### 5) Upload event image (admin)

```bash
curl -X POST "http://localhost:8080/api/v1/events/images" \
  -H "Authorization: Bearer <admin_jwt>" \
  -F "file=@/absolute/path/to/event-banner.jpg"
```

Sample response:

```json
{
  "imageUrl": "http://localhost:8080/uploads/events/2cf0f3d2-a4f0-4de2-9abf-1e74c8f9d8df.jpg"
}
```

### 6) Create event with uploaded image URL

```bash
curl -X POST "http://localhost:8080/api/v1/events" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_jwt>" \
  -d '{
    "title": "Sponsor Meetup",
    "description": "Networking with sponsors",
    "imageUrl": "http://localhost:8080/uploads/events/2cf0f3d2-a4f0-4de2-9abf-1e74c8f9d8df.jpg",
    "startTime": "2026-03-30T16:00:00",
    "endTime": "2026-03-30T17:00:00",
    "locationId": 1,
    "notifyGuests": true
  }'
```

## Quick Start

### Backend

```bash
cd backend
SPRING_PROFILES_ACTIVE=seed mvn spring-boot:run
```

Backend runs on `http://localhost:8080`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Configuration

### Backend (`backend/src/main/resources/application.properties`)

- `spring.jpa.hibernate.ddl-auto=update`
- `vapid.public-key`, `vapid.private-key`, `vapid.subject`
- `app.upload.events-dir=uploads/events`
- Multipart limits:
  - `spring.servlet.multipart.max-file-size=5MB`
  - `spring.servlet.multipart.max-request-size=5MB`

### Environment Variables (recommended)

```bash
export JWT_SECRET=<your_long_random_secret>
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD=change-me
export ADMIN_PHONE=9900000000
export ADMIN_NAME="Event Admin"
export CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
export VAPID_PUBLIC_KEY=<your_public_key>
export VAPID_PRIVATE_KEY=<your_private_key>
export VAPID_SUBJECT=mailto:support@event-transport.com
```

### Generate VAPID Keys

```bash
npm install -g web-push
web-push generate-vapid-keys
```

## Event Image Upload Notes

- Admin uploads image via event modal.
- Backend saves images to `uploads/events`.
- Files are served from `/uploads/events/**`.
- Backend validates MIME type (`jpg/png/webp`), max size (5MB), and sanitizes file names.
- If no image is uploaded, backend applies default image `/images/default-event.svg`.

## Phase D / E Verification Steps

Phase 1 risk remediation and multi-session QA workflow:

- `docs/phase1-risk-remediation.md`

```bash
cd backend
mvn test
```

```bash
cd backend
SPRING_PROFILES_ACTIVE=seed mvn spring-boot:run
```

```bash
cd frontend
npm install
npm run build
```

Manual checks:

- Open `/` and verify guest OTP login, driver OTP login, and admin login all route to `/home`, `/driver`, or `/admin`.
- Open `/admin` and verify Cancelled Queue + Complaints filters and CSV export buttons.
- Verify unauthorized fallback appears if the JWT is missing/expired/invalid.
- Upload invalid event image type/size and confirm validation error.
- Try creating a ride with more than 4 passengers through the API and confirm validation fails with JSON details.
- Create/close complaints and verify lifecycle remains `OPEN` -> `CLOSED`.

## Seed Data

When the backend runs with `SPRING_PROFILES_ACTIVE=seed`, it seeds:

- 1 main venue
- 30 hotels + `Others`
- 40 cabs
- 9 sample events
- location distances from main venue
- default event images (seed URLs)
- default admin config (`admin.name`, `admin.phone`)

## Deployment

### Required Environment Variables

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `DATABASE_URL` | ✅ | — | Must be `jdbc:postgresql://` form, or `postgres://` (auto-rewritten by `DataSourceConfig`) |
| `JWT_SECRET` | ✅ | — | Min 32 chars; Render `generateValue: true` handles this |
| `ADMIN_USERNAME` | ✅ | — | Admin login username |
| `ADMIN_PASSWORD` | ✅ | — | Admin login password |
| `ADMIN_PHONE` | ✅ | — | Phone used as admin push identity |
| `ADMIN_NAME` | ⬜ | `Event Admin` | Display name |
| `VAPID_PUBLIC_KEY` | ✅ | — | See VAPID generation below |
| `VAPID_PRIVATE_KEY` | ✅ | — | See VAPID generation below |
| `VAPID_SUBJECT` | ⬜ | `mailto:support@event-transport.com` | Contact URI for push provider |
| `CORS_ALLOWED_ORIGINS` | ✅ | — | Exact Netlify URL, no trailing slash |
| `JWT_EXPIRATION_MS` | ⬜ | `86400000` | Token TTL in ms (24 h) |
| `PORT` | ⬜ | `8080` | Injected automatically by Render |

### VAPID Key Generation

```bash
npx web-push generate-vapid-keys
```

Copy output to `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`. Set `VAPID_SUBJECT` to `mailto:you@yourdomain.com`. Keys are permanent — do not rotate them without unsubscribing all existing push endpoints first.

### Backend (Docker)

```bash
cd backend
docker build -t event-transport .
docker run -p 8080:8080 \
  -e PORT=8080 \
  -e DATABASE_URL=jdbc:postgresql://host:5432/dispatchdb \
  -e JWT_SECRET=replace-with-a-long-random-secret \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=change-me \
  -e ADMIN_PHONE=9900000000 \
  -e ADMIN_NAME="Event Admin" \
  -e CORS_ALLOWED_ORIGINS=https://your-frontend.example.com \
  -e VAPID_PUBLIC_KEY=... \
  -e VAPID_PRIVATE_KEY=... \
  -e VAPID_SUBJECT=mailto:support@event-transport.com \
  event-transport
```

> **Note:** `DATABASE_URL` can use either the `jdbc:postgresql://` or `postgres://` scheme. The `DataSourceConfig` bean automatically rewrites `postgres://` to `jdbc:postgresql://` for Render compatibility.

### Render Setup Sequence

1. Create PostgreSQL database first (copy connection string)
2. Create web service from Docker Hub image or GitHub repo
3. Set all env vars in the Render dashboard
4. Deploy — watch logs for `Started DispatchApplication`
5. Verify `/actuator/health` returns `{"status":"UP"}`

> ⚠️ Render free PostgreSQL databases are deleted after 90 days. Upgrade before go-live.

### Frontend (Netlify)

1. Connect GitHub repo
2. Confirm `netlify.toml` is detected (base dir = `frontend`)
3. Set `VITE_API_URL` to your Render backend URL (Environment Variables in Netlify dashboard)
4. Deploy — confirm SPA routing works on hard refresh

```bash
cd frontend
echo "VITE_API_URL=https://your-backend-url" > .env.production
npm run build
```

Deploy `frontend/dist` to any static host (Netlify, S3 + CloudFront, etc.).

### Post-deploy CORS Checklist

- `CORS_ALLOWED_ORIGINS` on Render must exactly match your Netlify URL (e.g. `https://your-site.netlify.app`) — no trailing slash, no wildcard
- Verify in browser DevTools Network tab that CORS headers are present on API responses

### ⚠️ Ephemeral Uploads Warning

Event images uploaded via the admin dashboard are stored in the container filesystem at `uploads/events/`. **This directory is wiped on every Render redeploy.** Uploaded images will be permanently lost. The fallback default image (`/images/default-event.svg`) will be served instead. This is acceptable for a demo but must be resolved before production by migrating to object storage (Cloudflare R2 or AWS S3).

### GitHub Secrets Required for CI/CD

| Secret | Job | Purpose |
|--------|-----|---------|
| `DOCKERHUB_USERNAME` | `deploy-backend` | Image tag namespace |
| `DOCKERHUB_TOKEN` | `deploy-backend` | Registry auth |
| `RENDER_DEPLOY_HOOK_URL` | `deploy-backend` | Triggers Render redeploy after push |
| `NETLIFY_AUTH_TOKEN` | `deploy-frontend` | Netlify CLI auth |
| `NETLIFY_SITE_ID` | `deploy-frontend` | Target site |
| `VITE_API_URL` | `deploy-frontend`, `frontend` (build) | Baked into the Vite bundle at build time |

