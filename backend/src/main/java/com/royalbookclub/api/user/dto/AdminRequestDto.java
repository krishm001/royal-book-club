package com.royalbookclub.api.user.dto;

import com.royalbookclub.api.user.model.AdminRequestStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

public class AdminRequestDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Create {
        private String reason;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
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
}
