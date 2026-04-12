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
     * Locks a single RideRequest row for update (SELECT … FOR UPDATE).
     * Use when only a single ride row is written (e.g. guest cancel) and
     * no other RideRequest rows in the same batch are mutated.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM RideRequest r WHERE r.id = :id")
    Optional<RideRequest> findByIdWithLock(@Param("id") Long id);

    /**
     * Locks a set of rides by explicit IDs in ascending ID order
     * (SELECT … FOR UPDATE ORDER BY id). Used by assignRides to lock
     * pending rides before transitioning them to OFFERED.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM RideRequest r WHERE r.id IN :ids ORDER BY r.id ASC")
    List<RideRequest> findAllByIdWithLock(@Param("ids") List<Long> ids);

    /**
     * Fetches all rides sharing the same magic-link batch and immediately
     * acquires a PostgreSQL row-level exclusive lock on each row
     * (SELECT … FOR UPDATE). Rows are always locked in ascending ID order
     * to enforce a consistent lock-acquisition sequence across concurrent
     * transactions and prevent circular-wait deadlocks.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM RideRequest r WHERE r.magicLinkId = :magicLinkId ORDER BY r.id ASC")
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
