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
