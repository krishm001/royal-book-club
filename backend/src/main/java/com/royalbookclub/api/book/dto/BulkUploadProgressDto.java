package com.royalbookclub.api.book.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Data Transfer Object showing the current progress of an asynchronous bulk upload batch.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BulkUploadProgressDto {
    private String batchId;
    private String fileName;
    private int totalRows;
    private int processedRows;
    private int successCount;
    private int failureCount;
    private String status;
    
    @Builder.Default
    private List<String> errors = new ArrayList<>();
    
    private Instant startedAt;
    private Instant completedAt;
}
