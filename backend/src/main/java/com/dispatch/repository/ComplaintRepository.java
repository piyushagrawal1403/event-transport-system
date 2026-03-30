package com.dispatch.repository;

import com.dispatch.model.Complaint;
import com.dispatch.model.ComplaintStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface ComplaintRepository extends JpaRepository<Complaint, Long> {
    List<Complaint> findAllByOrderByCreatedAtDesc();
    List<Complaint> findByStatusOrderByCreatedAtDesc(ComplaintStatus status);
    long countByStatus(ComplaintStatus status);

    @Query("""
            SELECT c FROM Complaint c
            WHERE (:status IS NULL OR c.status = :status)
              AND (:startInclusive IS NULL OR c.createdAt >= :startInclusive)
              AND (:endExclusive IS NULL OR c.createdAt < :endExclusive)
            ORDER BY c.createdAt DESC
            """)
    List<Complaint> findForAdminFilters(
            @Param("status") ComplaintStatus status,
            @Param("startInclusive") Instant startInclusive,
            @Param("endExclusive") Instant endExclusive
    );
}

