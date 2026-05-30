package com.royalbookclub.api.user.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

/**
 * AdminRequest document stored in Firestore under `admin_requests`.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminRequest {
    private String id;
    private String requesterUid;
    private String requesterEmail;
    private String reason;
    private AdminRequestStatus status;
    private Date createdAt;
    private String reviewedBy;
    private Date reviewedAt;
    private String note;
}
