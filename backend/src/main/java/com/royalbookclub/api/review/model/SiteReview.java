package com.royalbookclub.api.review.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

/**
 * Model representing a platform site review / feedback comment.
 * Maps to the "site_reviews" collection in Firestore.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SiteReview {
    private String id;
    private String userId;
    private String userName;
    private String userEmail;
    private Integer rating; // 1 to 5 stars
    private String comment;
    private Boolean approved; // false by default for admin moderation
    @Builder.Default
    private Boolean published = false; // false by default, controls home page visibility
    private Instant createdAt;

    // Aliases to support legacy frontend/payload field naming gracefully
    public String getMemberId() {
        return userId;
    }
    public void setMemberId(String memberId) {
        this.userId = memberId;
    }

    public String getMemberName() {
        return userName;
    }
    public void setMemberName(String memberName) {
        this.userName = memberName;
    }

    public String getMemberEmail() {
        return userEmail;
    }
    public void setMemberEmail(String memberEmail) {
        this.userEmail = memberEmail;
    }

    public Instant getSubmittedAt() {
        return createdAt;
    }
    public void setSubmittedAt(Instant submittedAt) {
        this.createdAt = submittedAt;
    }
}
