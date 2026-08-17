package com.royalbookclub.api.book.controller;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controller to handle physical NFC tag counter diagnostics and administrative reset operations.
 */
@RestController
@RequestMapping("/api/v1/admin/nfc")
@Tag(name = "NFC Tag Admin", description = "Endpoints for auditing physical NFC tags and resetting sequences.")
public class NfcAdminController {

    private static final Logger log = LoggerFactory.getLogger(NfcAdminController.class);

    private final Firestore firestore;

    public NfcAdminController(Firestore firestore) {
        this.firestore = firestore;
    }

    /**
     * Fetch all physical NFC counters with their currently joined book masterworks.
     */
    @GetMapping("/counters")
    @Operation(summary = "Get paired counters", description = "Audit physical NFC counters joined with book catalog titles.")
    @SuppressWarnings("unchecked")
    public ResponseEntity<List<NfcCounterDto>> getCounters(@RequestParam(required = false) Long minCounter) {
        log.info("Fetching physical NFC counter audit logs with minCounter filtering: {}", minCounter);
        try {
            // 1. Fetch all counters
            ApiFuture<QuerySnapshot> countersFuture = firestore.collection("nfc_counters").get();
            List<QueryDocumentSnapshot> countersDocs = countersFuture.get().getDocuments();

            // 2. Fetch all books to join details
            ApiFuture<QuerySnapshot> booksFuture = firestore.collection("books").get();
            List<QueryDocumentSnapshot> booksDocs = booksFuture.get().getDocuments();

            Map<String, DocumentSnapshot> bookMap = new HashMap<>();
            for (QueryDocumentSnapshot bookDoc : booksDocs) {
                String ntagUid = bookDoc.getString("ntagUid");
                if (ntagUid != null && !ntagUid.isBlank()) {
                    bookMap.put(ntagUid.trim().toLowerCase().replace(":", ""), bookDoc);
                }
                List<String> ntagUids = (List<String>) bookDoc.get("ntagUids");
                if (ntagUids != null) {
                    for (String tag : ntagUids) {
                        if (tag != null && !tag.isBlank()) {
                            bookMap.put(tag.trim().toLowerCase().replace(":", ""), bookDoc);
                        }
                    }
                }
            }

            // 3. Assemble DTOs
            List<NfcCounterDto> dtos = new ArrayList<>();
            for (QueryDocumentSnapshot counterDoc : countersDocs) {
                String rawDocId = counterDoc.getId();
                String uid = rawDocId.trim().toLowerCase().replace(":", "");
                Long counter = counterDoc.getLong("counter");
                if (counter == null) {
                    counter = 0L;
                }

                if (minCounter != null && counter < minCounter) {
                    continue;
                }

                NfcCounterDto dto = new NfcCounterDto();
                dto.setNtagUid(uid);
                dto.setRawDocumentId(rawDocId);
                dto.setCounter(counter);
                dto.setFirstSeenAt(counterDoc.getDate("firstSeenAt"));
                dto.setLastResetAt(counterDoc.getDate("lastResetAt"));

                DocumentSnapshot bookDoc = bookMap.get(uid);
                if (bookDoc != null) {
                    dto.setBookIsbn(bookDoc.getString("isbn"));
                    dto.setBookTitle(bookDoc.getString("title"));
                    List<String> authors = (List<String>) bookDoc.get("authors");
                    if (authors != null && !authors.isEmpty()) {
                        dto.setBookAuthor(String.join(", ", authors));
                    } else {
                        dto.setBookAuthor(bookDoc.getString("author"));
                    }
                    dto.setHasBook(true);
                } else {
                    dto.setHasBook(false);
                }

                dtos.add(dto);
            }

            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            log.error("Failed to fetch physical NFC counter audit records", e);
            throw new RuntimeException("Failed to load counter audits", e);
        }
    }

    /**
     * Force a bulk sequence reset on selected tag UIDs (supporting raw document IDs).
     */
    @PostMapping("/counters/reset")
    @Operation(summary = "Bulk reset counters", description = "Reset physical counter records and cache synchronization timestamps.")
    public ResponseEntity<Map<String, Object>> resetCounters(@RequestBody ResetRequestDto request) {
        if (request.getNtagUids() == null || request.getNtagUids().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "ntagUids sequence list is empty."));
        }

        log.info("Executing administrative NFC bulk counter reset for {} tags", request.getNtagUids().size());
        Date now = new Date();
        for (String uid : request.getNtagUids()) {
            try {
                // First try direct document reference as is (rawDocumentId)
                DocumentReference counterRef = firestore.collection("nfc_counters").document(uid);
                DocumentSnapshot snap = counterRef.get().get();
                if (!snap.exists()) {
                    // Fallback to normalized clean UID
                    String cleanUid = uid.trim().toLowerCase().replace(":", "");
                    counterRef = firestore.collection("nfc_counters").document(cleanUid);
                }
                Map<String, Object> updates = new HashMap<>();
                updates.put("counter", 0L);
                updates.put("lastResetAt", now);
                updates.put("firstSeenAt", now);
                counterRef.set(updates, com.google.cloud.firestore.SetOptions.merge()).get();
                log.info("NFC counter reset successful for tag reference: {}", counterRef.getId());
            } catch (Exception e) {
                log.error("Failed to reset NFC counter for reference: {}", uid, e);
            }
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Successfully reset counters for " + request.getNtagUids().size() + " tags.",
                "resetAt", now.toInstant().toString()
        ));
    }

    /**
     * Force administrative deletion of selected NFC counter records.
     */
    @PostMapping("/counters/delete")
    @Operation(summary = "Bulk delete counters", description = "Permanently remove selected physical NFC tag registers.")
    public ResponseEntity<Map<String, Object>> deleteCounters(@RequestBody ResetRequestDto request) {
        if (request.getNtagUids() == null || request.getNtagUids().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "ntagUids deletion list is empty."));
        }

        log.info("Executing administrative NFC bulk counter deletion for {} tags", request.getNtagUids().size());
        int deletedCount = 0;
        for (String uid : request.getNtagUids()) {
            try {
                // Delete raw document
                DocumentReference counterRef = firestore.collection("nfc_counters").document(uid);
                counterRef.delete().get();
                
                // Also clean/normalized fallback
                String cleanUid = uid.trim().toLowerCase().replace(":", "");
                if (!cleanUid.equals(uid)) {
                    firestore.collection("nfc_counters").document(cleanUid).delete().get();
                }
                
                deletedCount++;
                log.info("NFC counter deletion successful for: {}", uid);
            } catch (Exception e) {
                log.error("Failed to delete NFC counter record for: {}", uid, e);
            }
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Successfully deleted " + deletedCount + " NFC counter record(s)."
        ));
    }

    @Data
    public static class NfcCounterDto {
        private String ntagUid;
        private String rawDocumentId;
        private Long counter;
        private Date firstSeenAt;
        private Date lastResetAt;
        private String bookIsbn;
        private String bookTitle;
        private String bookAuthor;
        private boolean hasBook;
    }

    @Data
    public static class ResetRequestDto {
        private List<String> ntagUids;
    }
}
