package com.dispatch.repository;

import com.dispatch.model.RideIncident;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface RideIncidentRepository extends JpaRepository<RideIncident, Long> {
    List<RideIncident> findByOccurredAtBetweenOrderByOccurredAtDesc(Instant startInclusive, Instant endExclusive);
}

