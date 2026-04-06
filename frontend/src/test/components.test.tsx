import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import TransitTimer from "../pages/admin/components/TransitTimer";
import ActiveTripsPanel from "../pages/admin/components/ActiveTripsPanel";
import RideQueuePanel from "../pages/admin/components/RideQueuePanel";
import ComplaintsPanel from "../pages/admin/components/ComplaintsPanel";
import GuestActiveRideCard from "../pages/guest/components/GuestActiveRideCard";
import ActiveRideCard from "../pages/driver/components/ActiveRideCard";
import RideHistoryPanel from "../pages/driver/components/RideHistoryPanel";

// Minimal mock for lucide-react icons (just render as spans)
vi.mock("lucide-react", async () => {
  const actual = await vi.importActual<typeof import("lucide-react")>("lucide-react");
  return actual;
});

describe("TransitTimer", () => {
  it("renders elapsed time", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { container } = render(<TransitTimer assignedAt={fiveMinutesAgo} />);
    expect(container.textContent).toMatch(/\d+m/);
  });
});

describe("ActiveTripsPanel", () => {
  it("renders empty state when no rides", () => {
    render(<ActiveTripsPanel ongoingRides={[]} fetchData={vi.fn()} />);
    expect(screen.getByText("No active trips")).toBeInTheDocument();
  });

  it("renders trips count in heading", () => {
    render(<ActiveTripsPanel ongoingRides={[]} fetchData={vi.fn()} />);
    expect(screen.getByText("Active Trips")).toBeInTheDocument();
    expect(screen.getByText("(0)")).toBeInTheDocument();
  });
});

describe("RideQueuePanel", () => {
  it("renders empty state when no groups", () => {
    render(
      <RideQueuePanel
        groups={[]}
        selectedRides={new Map()}
        toggleRide={vi.fn()}
        fetchData={vi.fn()}
      />
    );
    expect(screen.getByText("No pending rides")).toBeInTheDocument();
  });
});

describe("ComplaintsPanel", () => {
  it("renders collapsed with count", () => {
    render(
      <ComplaintsPanel
        complaints={[]}
        showComplaints={false}
        setShowComplaints={vi.fn()}
        complaintStatusFilter=""
        setComplaintStatusFilter={vi.fn()}
        complaintDateFilter=""
        setComplaintDateFilter={vi.fn()}
        handleExportComplaints={vi.fn()}
        handleCloseComplaint={vi.fn()}
      />
    );
    expect(screen.getByText("Complaints (0)")).toBeInTheDocument();
  });

  it("shows 'No complaints' when expanded with empty list", () => {
    render(
      <ComplaintsPanel
        complaints={[]}
        showComplaints={true}
        setShowComplaints={vi.fn()}
        complaintStatusFilter=""
        setComplaintStatusFilter={vi.fn()}
        complaintDateFilter=""
        setComplaintDateFilter={vi.fn()}
        handleExportComplaints={vi.fn()}
        handleCloseComplaint={vi.fn()}
      />
    );
    expect(screen.getByText("No complaints filed.")).toBeInTheDocument();
  });
});

// Minimal RideRequest stub — only the fields each component actually accesses
const stubRide = {
  id: 1,
  guestName: 'Alice',
  guestPhone: '9999999999',
  passengerCount: 2,
  direction: 'TO_VENUE' as const,
  status: 'ACCEPTED' as const,
  location: { id: 1, name: 'Hotel Leela', isMainVenue: false, distanceFromMainVenue: 2 },
  customDestination: null,
  cab: null,
  lastAssignedDriverName: 'Bob',
  lastAssignedDriverPhone: '8888888888',
  lastAssignedCabLicensePlate: 'KA01AB1234',
  dropoffOtp: null,
  magicLinkId: 'abc123',
  requestedAt: new Date().toISOString(),
  updatedAt: null,
  assignedAt: null,
  acceptedAt: null,
  driverDeniedCount: 0,
};

describe('GuestActiveRideCard', () => {
  it('renders without crashing', () => {
    render(
      <GuestActiveRideCard
        ride={stubRide}
        fetchRides={vi.fn()}
      />
    );
    expect(screen.getByText('Hotel Leela')).toBeInTheDocument();
  });
});

describe('ActiveRideCard (driver)', () => {
  it('renders without crashing', () => {
    render(
      <ActiveRideCard
        ride={stubRide}
        onReviewAssignment={vi.fn()}
        onMarkArrived={vi.fn()}
        onEnterOtp={vi.fn()}
        onCompleteTrip={vi.fn()}
        arrivingRideId={null}
        completingRideId={null}
      />
    );
    expect(screen.getByText('Hotel Leela')).toBeInTheDocument();
  });
});

describe('RideHistoryPanel', () => {
  it('renders empty state', () => {
    render(
      <RideHistoryPanel
        completedRides={[]}
        showHistory={true}
        onToggle={vi.fn()}
      />
    );
    expect(screen.getByText('No completed rides yet')).toBeInTheDocument();
  });

  it('renders collapsed with count', () => {
    render(
      <RideHistoryPanel
        completedRides={[stubRide]}
        showHistory={false}
        onToggle={vi.fn()}
      />
    );
    expect(screen.getByText('Completed Rides (1)')).toBeInTheDocument();
  });

  it('renders rides grouped by date when expanded', () => {
    render(
      <RideHistoryPanel
        completedRides={[stubRide]}
        showHistory={true}
        onToggle={vi.fn()}
      />
    );
    expect(screen.getByText('Hotel Leela')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
  });
});
