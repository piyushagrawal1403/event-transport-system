package com.dispatch.repository;

import com.dispatch.model.EventItinerary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EventItineraryRepository extends JpaRepository<EventItinerary, UUID> {
    List<EventItinerary> findAllByOrderByStartTimeAsc();
}
