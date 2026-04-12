package com.dispatch.repository;

import com.dispatch.model.RideRequest;
import com.dispatch.model.RideStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface RideRequestRepository extends JpaRepository<RideRequest, Long> {
    List<RideRequest> findByStatus(RideStatus status);
    List<RideRequest> findByGuestPhoneAndStatusIn(String guestPhone, List<RideStatus> statuses);
    List<RideRequest> findByMagicLinkId(String magicLinkId);
    Optional<RideRequest> findFirstByMagicLinkId(String magicLinkId);

    /**
     * Fetches all rides sharing the same magic-link batch and immediately
     * acquires a PostgreSQL row-level exclusive lock on each row
     * (SELECT … FOR UPDATE). Use this inside any transaction that will
     * mutate the batch so that all callers acquire locks in a consistent
     * order and deadlocks are avoided.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM RideRequest r WHERE r.magicLinkId = :magicLinkId")
    List<RideRequest> findByMagicLinkIdWithLock(@Param("magicLinkId") String magicLinkId);
    List<RideRequest> findByCabIdAndStatusIn(Long cabId, List<RideStatus> statuses);
    List<RideRequest> findByStatusIn(List<RideStatus> statuses);
    List<RideRequest> findByCabIdAndStatus(Long cabId, RideStatus status);
    List<RideRequest> findByStatusOrderByUpdatedAtDesc(RideStatus status);
    List<RideRequest> findByStatusAndDriverDeniedCountGreaterThanOrderByUpdatedAtDesc(RideStatus status, Integer driverDeniedCount);
    List<RideRequest> findByCabId(Long cabId);
    long countByRequestedAtBetween(Instant startInclusive, Instant endExclusive);
    long countByRequestedAtBetweenAndStatus(Instant startInclusive, Instant endExclusive, RideStatus status);

    @Query("""
            SELECT r FROM RideRequest r
            WHERE r.requestedAt >= :startInclusive
              AND r.requestedAt < :endExclusive
              AND r.status = :status
            """)
    List<RideRequest> findByRequestedRangeAndStatus(
            @Param("startInclusive") Instant startInclusive,
            @Param("endExclusive") Instant endExclusive,
            @Param("status") RideStatus status
    );
}
