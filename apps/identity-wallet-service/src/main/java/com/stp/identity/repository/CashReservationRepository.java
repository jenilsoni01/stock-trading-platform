package com.stp.identity.repository;

import com.stp.identity.entity.CashReservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CashReservationRepository extends JpaRepository<CashReservation, UUID> {

    Optional<CashReservation> findByIdempotencyKey(String idempotencyKey);

    boolean existsByIdempotencyKey(String idempotencyKey);
}
