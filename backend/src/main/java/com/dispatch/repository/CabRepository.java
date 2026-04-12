package com.dispatch.repository;

import com.dispatch.model.Cab;
import com.dispatch.model.CabStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CabRepository extends JpaRepository<Cab, Long> {
    List<Cab> findByStatus(CabStatus status);
    Optional<Cab> findByDriverPhone(String driverPhone);
    List<Cab> findTop10ByOrderByTripsCompletedDesc();
    List<Cab> findTop10ByOrderByTotalKmDesc();

    /**
     * Fetches a Cab by ID and immediately acquires a PostgreSQL row-level
     * exclusive lock (SELECT … FOR UPDATE). Always lock the Cab before
     * locking any RideRequest rows to enforce a consistent lock-acquisition
     * order across all transactions and prevent deadlocks.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Cab c WHERE c.id = :id")
    Optional<Cab> findByIdWithLock(@Param("id") Long id);
}
