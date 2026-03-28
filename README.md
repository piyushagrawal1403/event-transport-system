# Event Transport Dispatch System

A lightweight, reliable transport dispatch system for coordinating a fleet of ~40 cabs transporting up to 10,000 guests between ~30 hotels and a single main venue.

## Architecture

- **Backend:** Java 17, Spring Boot 3.2, Spring Data JPA, H2 (dev) / PostgreSQL (prod)
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, PWA
- **Infrastructure:** Dockerized backend, static frontend deployable to S3/CloudFront/Netlify

## Quick Start

### Backend
```bash
cd backend
mvn spring-boot:run
# Runs on http://localhost:8080
# H2 console at http://localhost:8080/h2-console
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

## Routes

| Route | Description |
|-------|-------------|
| `/` | Guest login (name + phone) |
| `/request` | Guest ride request form |
| `/status` | Guest active ride status (polling) |
| `/admin` | Admin dispatch dashboard |
| `/d/:magicLinkId` | Driver magic link (OTP completion) |
| `/driver` | Driver dashboard |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/rides` | Create ride request |
| GET | `/api/v1/rides/pending` | Get pending rides |
| GET | `/api/v1/rides/guest?phone=` | Get guest's active rides |
| GET | `/api/v1/rides/trip/:magicLinkId` | Get trip rides |
| GET | `/api/v1/cabs` | Get all cabs |
| GET | `/api/v1/locations` | Get all locations |
| POST | `/api/v1/dispatch/assign` | Assign rides to cab |
| POST | `/api/v1/dispatch/complete/:magicLinkId` | Complete trip with OTP |
| POST | `/api/v1/dispatch/status/:magicLinkId` | Update trip status |

## Deployment

### Backend (Docker)
```bash
cd backend
docker build -t event-transport .
docker run -p 8080:8080 \
  -e DATABASE_URL=jdbc:postgresql://host:5432/dispatchdb \
  -e DB_USERNAME=user \
  -e DB_PASSWORD=pass \
  event-transport
```

### Frontend
```bash
cd frontend
echo "VITE_API_URL=https://your-backend-url" > .env.production
npm run build
# Deploy the dist/ folder to Netlify, S3+CloudFront, or any static host
```

## Seed Data
On first run, the backend auto-seeds:
- 1 Main Venue (Grand Event Center)
- 30 Hotels
- 40 Cabs (KA-01-AB-1001 through KA-01-AB-1040)

## Phase B: Notifications & SLA Alerts - Implementation Summary

## Backend Changes

### 1. Dependencies Added (pom.xml)
- `nl.martijndwars:web-push:5.1.1` - Web Push library for VAPID
- `com.google.code.gson:gson:2.8.9` - JSON serialization
- `org.bouncycastle:bcpkix-jdk18on:1.78.1` - Cryptography library for web push
- **BouncyCastle provider registered programmatically** in PushNotificationService

### 2. New Entities
- **PushSubscription.java** - Stores push notification subscriptions linked to users
  - Fields: endpoint, p256dh, auth, userPhone, userType, subscribedAt
  - Unique constraint on endpoint to prevent duplicates

### 3. Updated Entities
- **EventNotification.java** - Added `targetPhone` field for targeted alerts
  - null = broadcast to all admins
  - specific phone = targeted to driver

### 4. New Services
- **PushNotificationService.java** - Handles push notification delivery
  - `subscribeUser()` - Register a user for push notifications
  - `unsubscribeUser()` - Unregister a user
  - `sendPushToAdmins()` - Send broadcast alerts to all admins
  - `sendPushToDriver()` - Send targeted alerts to specific driver
  - Automatic cleanup of invalid subscriptions

- **SLAAlertService.java** - Scheduled SLA monitoring
  - Runs every 1 minute (configurable)
  - Checks for PENDING rides > 15 minutes
  - Checks for OFFERED rides > 30 minutes
  - Sends web push alerts to all ADMIN users when violations detected

### 5. Updated Services
- **DispatchService.java** 
  - Added `cancelAcceptedRide()` method
  - Sends targeted notification to driver when their accepted ride is cancelled
  - Triggers push notification immediately

### 6. New Controllers
- **PushSubscriptionController.java** - REST endpoints for push management
  - `POST /api/v1/push/subscribe` - Register push subscription
  - `POST /api/v1/push/unsubscribe` - Unregister push subscription
  - `GET /api/v1/push/vapid-public-key` - Get VAPID public key for frontend

### 7. Repository
- **PushSubscriptionRepository.java** - Data access for push subscriptions
  - Methods to find subscriptions by userType, userPhone, and endpoint

### 8. Configuration
- **application.properties** - Added VAPID and scheduling config
  - `vapid.public-key` - Environment variable or config
  - `vapid.private-key` - Environment variable or config
  - `vapid.subject` - Service contact email
  - Scheduler pool size: 10 threads
  - Scheduler thread name prefix: `dispatch-scheduler-`

### 9. Application Setup
- **DispatchApplication.java** - Added `@EnableScheduling` annotation

## Frontend Changes

### 1. Service Worker Updates (public/sw.js)
- Added push event listener to handle incoming notifications
- Added notification click handler to focus app or open new window
- Displays notifications with icon and badge

### 2. New Push Notification Service (src/services/PushNotificationService.ts)
- `initialize()` - Register service worker
- `requestPermission()` - Request browser notification permission
- `subscribeUser()` - Subscribe user to push notifications
  - Fetches VAPID public key from server
  - Subscribes to PushManager
  - Sends subscription details to backend
- Helper methods for VAPID key encoding/decoding

### 3. Updated Driver Dashboard (src/pages/driver/DriverDashboard.tsx)
- Import push notification service
- Initialize push notifications on driver login
- Auto-subscribe driver with phone and DRIVER type

### 4. API Client Updates (src/api/client.ts)
- Added push notification endpoints
  - `subscribeToPush()` - Manual subscription
  - `getVapidPublicKey()` - Fetch VAPID public key

## Environment Setup

### Required Environment Variables
Create a `.ENV` file in the backend directory with:
```bash
VAPID_PUBLIC_KEY=<your_public_key>
VAPID_PRIVATE_KEY=<your_private_key>
VAPID_SUBJECT=mailto:support@event-transport.com
```

The application uses `dotenv-java` to automatically load environment variables from the `.ENV` file.

### Generate VAPID Keys
To generate VAPID keys, use web-push CLI or equivalent:
```bash
npm install -g web-push
web-push generate-vapid-keys
```

### Alternative: System Environment Variables
You can also set environment variables directly in your deployment environment:
```bash
export VAPID_PUBLIC_KEY=your_public_key
export VAPID_PRIVATE_KEY=your_private_key
export VAPID_SUBJECT=mailto:support@event-transport.com
```

## Alert Flow

### 1. New Ride Request Alert (Admin)
**When:** Guest creates a new ride request
**Trigger:** `RideService.createRide()`
**Recipients:** All admin users
**Notification:** "New Ride Request" - "New ride request from [Guest Name] ([X] pax) needs assignment"

### 2. Driver Assignment Alert (Driver)
**When:** Admin assigns ride to a driver
**Trigger:** `DispatchService.assignRides()`
**Recipients:** Specific driver
**Notification:** "New Ride Assignment" - "You have been assigned [X] ride(s) for pickup. Please check your dashboard."

### 3. Guest Cancellation Alert (Admin + Driver)
**When:** Guest cancels an accepted/dispatched ride
**Trigger:** `RideService.cancelRide()`
**Recipients:** All admins + assigned driver
**Notifications:**
- **Admin:** "Guest Cancelled Ride" - "Guest [Name] cancelled their accepted ride #[ID]"
- **Driver:** "Ride Cancelled by Guest" - "Ride #[ID] was cancelled by the guest. You are now available."

### 4. Admin Cancellation Alert (Driver)
**When:** Admin cancels an accepted ride
**Trigger:** `DispatchService.cancelAcceptedRide()`
**Recipients:** Specific driver
**Notification:** "Ride Cancelled" - "Ride #[ID] has been cancelled. You are now available for new assignments"

### 5. SLA Violation Alerts (Admin)
**When:** Rides exceed service level time limits
**Trigger:** `SLAAlertService.checkSLAViolations()` (every 60 seconds)
**Recipients:** All admin users
**Types:**
- **PENDING Alert:** Rides waiting > 15 minutes
- **OFFERED Alert:** Rides offered > 30 minutes
**Notification:** "SLA Violation Alert" - "Ride #[ID] has been in [STATUS] state for too long"

## Key Features
✅ VAPID Web Push implementation
✅ User subscription management with phone-based targeting
✅ Automatic SLA monitoring with cron jobs
✅ **New ride request alerts for admins**
✅ **Driver assignment notifications**
✅ **Guest cancellation alerts (admin + driver)**
✅ Targeted driver notifications on ride cancellation
✅ Broadcast admin alerts for SLA violations
✅ Service worker for push event handling
✅ Automatic cleanup of invalid subscriptions
✅ No UI changes required - minimal frontend integration
