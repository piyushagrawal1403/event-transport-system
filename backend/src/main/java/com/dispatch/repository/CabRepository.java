package com.dispatch.repository;

import com.dispatch.model.Cab;
import com.dispatch.model.CabStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CabRepository extends JpaRepository<Cab, Long> {
    List<Cab> findByStatus(CabStatus status);
    Optional<Cab> findByDriverPhone(String driverPhone);
    List<Cab> findTop10ByOrderByTripsCompletedDesc();
    List<Cab> findTop10ByOrderByTotalKmDesc();
}
