package com.royalbookclub.api.audit.controller;

import com.royalbookclub.api.audit.model.InventoryAudit;
import com.royalbookclub.api.audit.service.InventoryAuditService;
import com.royalbookclub.api.user.model.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/v1/audit")
@Tag(name = "Inventory Audits", description = "Endpoints for curators to start, scan, and complete physical inventory audits")
public class InventoryAuditController {

    private static final Logger log = LoggerFactory.getLogger(InventoryAuditController.class);

    private final InventoryAuditService auditService;

    public InventoryAuditController(InventoryAuditService auditService) {
        this.auditService = auditService;
    }

    /**
     * Start a new active inventory audit session.
     */
    @PostMapping("/start")
    @Operation(summary = "Start audit session", description = "Deactivates any existing session and begins a brand new physical inventory audit session.")
    public ResponseEntity<InventoryAudit> startAudit(
            @RequestParam(required = false) String curatorId,
            @AuthenticationPrincipal User user) {
        String resolvedCuratorId = resolveCuratorId(curatorId, user);
        log.info("REST request to start inventory audit by Curator: {}", resolvedCuratorId);
        InventoryAudit audit = auditService.startAudit(resolvedCuratorId);
        return ResponseEntity.ok(audit);
    }

    /**
     * Scan an item inside an active audit session.
     */
    @PostMapping("/{id}/scan")
    @Operation(summary = "Scan item in audit", description = "Verifies and reconciles a specific book ISBN or physical NFC tag in the active session.")
    public ResponseEntity<InventoryAudit> scanItem(
            @PathVariable String id,
            @RequestParam String identifier) {
        log.info("REST request to scan identifier {} inside audit session {}", identifier, id);
        InventoryAudit audit = auditService.scanItem(id, identifier);
        return ResponseEntity.ok(audit);
    }

    /**
     * Complete the audit session and automatically reconcile stock.
     */
    @PostMapping("/{id}/complete")
    @Operation(summary = "Complete audit session", description = "Marks session as completed and automatically synchronizes database stocks with shelf scans.")
    public ResponseEntity<InventoryAudit> completeAudit(@PathVariable String id) {
        log.info("REST request to complete audit session {}", id);
        InventoryAudit audit = auditService.completeAudit(id);
        return ResponseEntity.ok(audit);
    }

    /**
     * Fetch active audit session for a curator.
     */
    @GetMapping("/active")
    @Operation(summary = "Get active audit", description = "Fetch the curator's active audit session, if one exists.")
    public ResponseEntity<InventoryAudit> getActiveAudit(
            @RequestParam(required = false) String curatorId,
            @AuthenticationPrincipal User user) {
        String resolvedCuratorId = resolveCuratorId(curatorId, user);
        log.info("REST request to check active audit for Curator: {}", resolvedCuratorId);
        Optional<InventoryAudit> active = auditService.getActiveAudit(resolvedCuratorId);
        return active.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    private String resolveCuratorId(String curatorId, User user) {
        if (curatorId != null && !curatorId.trim().isEmpty() && !"undefined".equals(curatorId) && !"null".equals(curatorId)) {
            return curatorId.trim();
        }
        if (user != null && user.getId() != null) {
            return user.getId();
        }
        return "SYSTEM_CURATOR";
    }
}
