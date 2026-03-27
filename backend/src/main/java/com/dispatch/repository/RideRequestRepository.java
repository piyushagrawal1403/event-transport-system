package com.dispatch.repository;

import com.dispatch.model.RideRequest;
import com.dispatch.model.RideStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RideRequestRepository extends JpaRepository<RideRequest, Long> {
    List<RideRequest> findByStatus(RideStatus status);
    List<RideRequest> findByGuestPhoneAndStatusIn(String guestPhone, List<RideStatus> statuses);
    List<RideRequest> findByMagicLinkId(String magicLinkId);
    Optional<RideRequest> findFirstByMagicLinkId(String magicLinkId);
    List<RideRequest> findByCabIdAndStatusIn(Long cabId, List<RideStatus> statuses);
    List<RideRequest> findByStatusIn(List<RideStatus> statuses);
}
