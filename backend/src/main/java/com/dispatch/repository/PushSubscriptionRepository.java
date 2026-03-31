// src/main/java/com/dispatch/repository/PushSubscriptionRepository.java
package com.dispatch.repository;

import com.dispatch.model.PushSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, Long> {
    List<PushSubscription> findByUserType(String userType);
    List<PushSubscription> findByUserPhone(String userPhone);
    List<PushSubscription> findByUserTypeAndUserPhone(String userType, String userPhone);
    List<PushSubscription> findAllByEndpoint(String endpoint);
    Optional<PushSubscription> findByEndpointAndUserTypeAndUserPhone(String endpoint, String userType, String userPhone);
    Optional<PushSubscription> findByEndpoint(String endpoint);
    void deleteByEndpoint(String endpoint);
    void deleteByEndpointAndUserTypeAndUserPhone(String endpoint, String userType, String userPhone);
}

