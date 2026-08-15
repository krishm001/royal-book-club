package com.royalbookclub.api.audit.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Model representing an inventory audit session.
 * Maps to the "inventory_audits" collection in Firestore.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryAudit {
    private String id;
    private String status; // "ACTIVE", "COMPLETED"
    private String curatorId;
    private Instant startedAt;
    private Instant completedAt;

    @Builder.Default
    private List<String> auditedIsbns = new ArrayList<>();

    @Builder.Default
    private List<String> missingIsbns = new ArrayList<>();
}
