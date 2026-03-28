// src/main/java/com/dispatch/repository/EventNotificationRepository.java
package com.dispatch.repository;

import com.dispatch.model.EventNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.Instant;
import java.util.List;

@Repository
public interface EventNotificationRepository extends JpaRepository<EventNotification, Long> {
    // Fetch all notifications created after a given timestamp (for polling)
    List<EventNotification> findByCreatedAtAfterOrderByCreatedAtDesc(Instant since);
    // Fetch latest N notifications regardless of time
    List<EventNotification> findTop10ByOrderByCreatedAtDesc();
}