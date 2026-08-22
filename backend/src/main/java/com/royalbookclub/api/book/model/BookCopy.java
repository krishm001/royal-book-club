package com.royalbookclub.api.book.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents a specific physical copy of a book catalog item.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookCopy {
    private Integer copyNo;            // 1-indexed identifier for copy
    private String ntagUid;            // Optional NFC Tag UID bound to this physical copy
    private Long qrId;                 // Optional globally unique 9-digit physical QR code ID
    private String status;             // "AVAILABLE", "CHECKED_OUT", "REQUESTED_CHECKOUT", "REQUESTED_RETURN"
    private String currentCheckoutId;  // Associated active transaction ID

    /**
     * Converts this BookCopy to a lossless Firestore map.
     */
    public java.util.Map<String, Object> toMap() {
        java.util.Map<String, Object> map = new java.util.HashMap<>();
        map.put("copyNo", copyNo);
        map.put("ntagUid", ntagUid);
        map.put("qrId", qrId);
        map.put("status", status);
        map.put("currentCheckoutId", currentCheckoutId);
        return map;
    }

    /**
     * Reconstructs a BookCopy from a Firestore map defensively preserving all types.
     */
    public static BookCopy fromMap(java.util.Map<String, Object> m) {
        if (m == null) return null;
        Integer cNo = null;
        Object copyNoVal = m.get("copyNo");
        if (copyNoVal instanceof Number) {
            cNo = ((Number) copyNoVal).intValue();
        } else if (copyNoVal instanceof String && !((String) copyNoVal).isBlank()) {
            try { cNo = Integer.parseInt(((String) copyNoVal).trim()); } catch (NumberFormatException ignored) {}
        }

        Long qId = null;
        Object qrIdVal = m.get("qrId");
        if (qrIdVal instanceof Number) {
            qId = ((Number) qrIdVal).longValue();
        } else if (qrIdVal instanceof String && !((String) qrIdVal).isBlank()) {
            try { qId = Long.parseLong(((String) qrIdVal).trim()); } catch (NumberFormatException ignored) {}
        }

        return BookCopy.builder()
                .copyNo(cNo)
                .ntagUid((String) m.get("ntagUid"))
                .qrId(qId)
                .status((String) m.get("status"))
                .currentCheckoutId((String) m.get("currentCheckoutId"))
                .build();
    }
}
