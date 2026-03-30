# Event Transport Dispatch System

A production-style transport dispatch platform for coordinating event cab operations across hotels and a main venue.

## Tech Stack

- Backend: Java 17, Spring Boot 3.2, Spring Data JPA
- Database: H2 (dev), PostgreSQL (prod)
- Frontend: React 18, TypeScript, Vite, Tailwind CSS
- PWA: Service worker + Web Push (VAPID)

## Core Capabilities

- Guest ride booking with passenger split logic (for > cab capacity)
- Admin dispatch queue with batch assignment and capacity checks
- Driver consent flow (accept / deny) before trip start
- OTP validation at trip start (not drop-off)
- Live trip progression: OFFERED -> ACCEPTED -> ARRIVED -> IN_TRANSIT -> COMPLETED
- Guest/admin cancellation handling with notifications
- Driver analytics (total km, completed/denied trips, avg acceptance time)
- Distance tracking (`Location.distanceFromMainVenue`, `Cab.totalKm`)
- Daily cancelled/declined history queue (persistent incident log)
- Complaint system (OPEN/CLOSED)
- Event itinerary with details page and image support
- Admin event image upload endpoint
- Push notifications for ADMIN / DRIVER / GUEST
- SLA alerting for delayed rides

## User Roles and Features

### Guest

- Login with name + phone
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

- View pending ride queue grouped by location
- Assign rides to available cabs with capacity checks
- Monitor active trips
- View and filter cancelled/declined history by date
- View driver details in incident queue
- Open driver analytics modal from fleet list
- Manage complaints and close tickets
- Manage events (create/update, notify guests)
- Upload event images (`/api/v1/events/images`)
- Edit admin contact settings
- Receive SLA and operational push alerts

### Driver

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
- Queue is filterable by day from admin dashboard.

## Frontend Routes

| Route | Description |
|---|---|
| `/` | Guest login |
| `/home` | Guest home (timeline + booking + active rides) |
| `/events/:eventId` | Guest event details |
| `/admin` | Admin dashboard |
| `/driver` | Driver dashboard |

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
| `GET` | `/api/v1/rides/cancelled?date=YYYY-MM-DD` | Daily cancelled/declined incidents |
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
| `GET` | `/api/v1/complaints?status=OPEN|CLOSED` | List complaints |
| `PUT` / `PATCH` | `/api/v1/complaints/{id}/close` | Close complaint |

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

### 1) Daily cancelled/declined history

```bash
curl -X GET "http://localhost:8080/api/v1/rides/cancelled?date=2026-03-29"
```

### 2) File a complaint (guest)

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

### 3) Close complaint (admin)

```bash
curl -X PUT "http://localhost:8080/api/v1/complaints/12/close" \
  -H "Content-Type: application/json" \
  -d '{
    "closedBy": "Event Admin"
  }'
```

### 4) Upload event image (admin)

```bash
curl -X POST "http://localhost:8080/api/v1/events/images" \
  -F "file=@/absolute/path/to/event-banner.jpg"
```

Sample response:

```json
{
  "imageUrl": "http://localhost:8080/uploads/events/2cf0f3d2-a4f0-4de2-9abf-1e74c8f9d8df.jpg"
}
```

### 5) Create event with uploaded image URL

```bash
curl -X POST "http://localhost:8080/api/v1/events" \
  -H "Content-Type: application/json" \
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
mvn spring-boot:run
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
- Stored URL is persisted in `EventItinerary.imageUrl`.

## Seed Data

On first run, the backend seeds:

- 1 main venue
- 30 hotels + `Others`
- 40 cabs
- 9 sample events
- location distances from main venue
- default event images (seed URLs)
- default admin config (`admin.name`, `admin.phone`)

## Deployment

### Backend (Docker example)

```bash
cd backend
docker build -t event-transport .
docker run -p 8080:8080 \
  -e DATABASE_URL=jdbc:postgresql://host:5432/dispatchdb \
  -e DB_USERNAME=user \
  -e DB_PASSWORD=pass \
  -e VAPID_PUBLIC_KEY=... \
  -e VAPID_PRIVATE_KEY=... \
  -e VAPID_SUBJECT=mailto:support@event-transport.com \
  event-transport
```

### Frontend (production build)

```bash
cd frontend
echo "VITE_API_URL=https://your-backend-url" > .env.production
npm run build
```

Deploy `frontend/dist` to any static host (Netlify, S3 + CloudFront, etc.).
