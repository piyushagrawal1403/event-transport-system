package com.dispatch.repository;

import com.dispatch.model.RideIncident;
import com.dispatch.model.RideIncidentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface RideIncidentRepository extends JpaRepository<RideIncident, Long> {
    List<RideIncident> findByOccurredAtBetweenOrderByOccurredAtDesc(Instant startInclusive, Instant endExclusive);

    long countByOccurredAtBetweenAndIncidentType(Instant startInclusive, Instant endExclusive, RideIncidentType incidentType);

    @Query("""
            SELECT i FROM RideIncident i
            WHERE i.occurredAt >= :startInclusive
              AND i.occurredAt < :endExclusive
              AND (:incidentType IS NULL OR i.incidentType = :incidentType)
              AND (:driverQuery IS NULL OR :driverQuery = '' OR
                   LOWER(COALESCE(i.driverName, '')) LIKE LOWER(CONCAT('%', :driverQuery, '%')) OR
                   LOWER(COALESCE(i.driverPhone, '')) LIKE LOWER(CONCAT('%', :driverQuery, '%')) OR
                   LOWER(COALESCE(i.cabLicensePlate, '')) LIKE LOWER(CONCAT('%', :driverQuery, '%')))
            ORDER BY i.occurredAt DESC
            """)
    List<RideIncident> findForAdminFilters(
            @Param("startInclusive") Instant startInclusive,
            @Param("endExclusive") Instant endExclusive,
            @Param("incidentType") RideIncidentType incidentType,
            @Param("driverQuery") String driverQuery
    );
}

