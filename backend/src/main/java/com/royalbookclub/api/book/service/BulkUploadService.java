package com.royalbookclub.api.book.service;

import com.opencsv.CSVReader;
import com.royalbookclub.api.book.dto.BookDto;
import com.royalbookclub.api.book.dto.BulkUploadProgressDto;
import org.apache.poi.ss.usermodel.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.InputStreamReader;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service to process catalog bulk uploads asynchronously (supporting CSV & Excel formats).
 */
@Service
public class BulkUploadService {

    private static final Logger log = LoggerFactory.getLogger(BulkUploadService.class);
    
    private final BookService bookService;
    private final Map<String, BulkUploadProgressDto> progressMap = new ConcurrentHashMap<>();

    public BulkUploadService(BookService bookService) {
        this.bookService = bookService;
    }

    /**
     * Start the bulk upload process.
     * Validates headers/counts lines, registers the batchId, and fires the async process.
     *
     * @param fileName    Name of the uploaded file
     * @param fileBytes   Raw bytes of the file
     * @param contentType MIME type of the file
     * @return Unique batch ID for tracking
     */
    public String startUpload(String fileName, byte[] fileBytes, String contentType) {
        String batchId = UUID.randomUUID().toString();
        log.info("Starting bulk upload. Generated Batch ID: {}, File: {}", batchId, fileName);

        int totalRows = estimateRows(fileBytes, contentType);

        BulkUploadProgressDto progress = BulkUploadProgressDto.builder()
                .batchId(batchId)
                .fileName(fileName)
                .totalRows(totalRows)
                .processedRows(0)
                .successCount(0)
                .failureCount(0)
                .status("PROCESSING")
                .startedAt(Instant.now())
                .build();

        progressMap.put(batchId, progress);

        // Fire off asynchronous processing
        processUploadAsync(batchId, fileBytes, contentType);

        return batchId;
    }

    /**
     * Fetch the progress details for a batch.
     *
     * @param batchId The unique batch ID
     * @return Optional containing the progress DTO if found
     */
    public Optional<BulkUploadProgressDto> getProgress(String batchId) {
        return Optional.ofNullable(progressMap.get(batchId));
    }

    /**
     * Internal async method to process the upload.
     */
    @Async
    public void processUploadAsync(String batchId, byte[] fileBytes, String contentType) {
        log.info("Async processing started for Batch ID: {}", batchId);
        BulkUploadProgressDto progress = progressMap.get(batchId);

        if (progress == null) {
            log.error("Progress tracker missing for Batch ID: {}", batchId);
            return;
        }

        try {
            boolean isExcel = isExcel(contentType);
            if (isExcel) {
                processExcel(progress, fileBytes);
            } else {
                processCsv(progress, fileBytes);
            }
            progress.setStatus("COMPLETED");
            log.info("Async processing completed successfully for Batch ID: {}", batchId);
        } catch (Exception e) {
            log.error("Fatal failure in bulk upload Batch ID: {}", batchId, e);
            progress.setStatus("FAILED");
            progress.getErrors().add("Fatal error processing file: " + e.getMessage());
        } finally {
            progress.setCompletedAt(Instant.now());
            progressMap.put(batchId, progress);
        }
    }

    private int estimateRows(byte[] fileBytes, String contentType) {
        try {
            if (isExcel(contentType)) {
                try (Workbook workbook = WorkbookFactory.create(new ByteArrayInputStream(fileBytes))) {
                    Sheet sheet = workbook.getSheetAt(0);
                    int physicalRows = sheet.getPhysicalNumberOfRows();
                    return physicalRows > 0 ? physicalRows - 1 : 0; // Exclude header row
                }
            } else {
                try (CSVReader reader = new CSVReader(new InputStreamReader(new ByteArrayInputStream(fileBytes)))) {
                    List<String[]> allRows = reader.readAll();
                    return allRows.isEmpty() ? 0 : allRows.size() - 1; // Exclude header row
                }
            }
        } catch (Exception e) {
            log.warn("Could not accurately pre-count rows: {}", e.getMessage());
            return 0; // Will be calculated dynamically during parsing if possible
        }
    }

    private boolean isExcel(String contentType) {
        if (contentType == null) return false;
        return contentType.contains("excel") || 
               contentType.contains("spreadsheetml") || 
               contentType.contains("vnd.ms-excel") ||
               contentType.contains("application/octet-stream"); // standard fallback
    }

    private void processCsv(BulkUploadProgressDto progress, byte[] fileBytes) throws Exception {
        try (CSVReader reader = new CSVReader(new InputStreamReader(new ByteArrayInputStream(fileBytes)))) {
            List<String[]> allRows = reader.readAll();
            if (allRows.isEmpty()) {
                progress.getErrors().add("The CSV file is empty");
                return;
            }

            String[] headers = allRows.get(0);
            Map<String, Integer> headerMap = mapHeaders(headers);
            progress.setTotalRows(allRows.size() - 1);

            for (int i = 1; i < allRows.size(); i++) {
                String[] row = allRows.get(i);
                try {
                    BookDto bookDto = parseCsvRow(row, headerMap, i);
                    bookService.createOrUpdateBook(bookDto);
                    progress.setSuccessCount(progress.getSuccessCount() + 1);
                } catch (Exception e) {
                    log.warn("Failed to parse/save row {}: {}", i, e.getMessage());
                    progress.setFailureCount(progress.getFailureCount() + 1);
                    progress.getErrors().add("Row " + (i + 1) + ": " + e.getMessage());
                } finally {
                    progress.setProcessedRows(progress.getProcessedRows() + 1);
                }
            }
        }
    }

    private void processExcel(BulkUploadProgressDto progress, byte[] fileBytes) throws Exception {
        try (Workbook workbook = WorkbookFactory.create(new ByteArrayInputStream(fileBytes))) {
            Sheet sheet = workbook.getSheetAt(0);
            int lastRowNum = sheet.getLastRowNum();
            if (lastRowNum <= 0) {
                progress.getErrors().add("The Excel file is empty");
                return;
            }

            Row headerRow = sheet.getRow(0);
            if (headerRow == null) {
                progress.getErrors().add("Header row missing from Excel file");
                return;
            }

            String[] headers = new String[headerRow.getLastCellNum()];
            for (int col = 0; col < headerRow.getLastCellNum(); col++) {
                Cell cell = headerRow.getCell(col);
                headers[col] = cell != null ? cell.getStringCellValue() : "";
            }

            Map<String, Integer> headerMap = mapHeaders(headers);
            progress.setTotalRows(lastRowNum);

            for (int i = 1; i <= lastRowNum; i++) {
                Row row = sheet.getRow(i);
                if (row == null || isRowEmpty(row)) {
                    continue;
                }
                try {
                    BookDto bookDto = parseExcelRow(row, headerMap, i);
                    bookService.createOrUpdateBook(bookDto);
                    progress.setSuccessCount(progress.getSuccessCount() + 1);
                } catch (Exception e) {
                    log.warn("Failed to parse/save Excel row {}: {}", i, e.getMessage());
                    progress.setFailureCount(progress.getFailureCount() + 1);
                    progress.getErrors().add("Row " + (i + 1) + ": " + e.getMessage());
                } finally {
                    progress.setProcessedRows(progress.getProcessedRows() + 1);
                }
            }
        }
    }

    private Map<String, Integer> mapHeaders(String[] headers) {
        Map<String, Integer> map = new HashMap<>();
        for (int i = 0; i < headers.length; i++) {
            if (headers[i] != null) {
                String normalized = headers[i].trim().toLowerCase().replaceAll("[_\\s]", "");
                map.put(normalized, i);
            }
        }
        return map;
    }

    private BookDto parseCsvRow(String[] row, Map<String, Integer> headerMap, int rowIndex) {
        String isbn = getCsvVal(row, headerMap, "isbn", true, rowIndex);
        String title = getCsvVal(row, headerMap, "title", true, rowIndex);
        String subtitle = getCsvVal(row, headerMap, "subtitle", false, rowIndex);
        
        String authorsRaw = getCsvVal(row, headerMap, "authors", false, rowIndex);
        if (authorsRaw == null || authorsRaw.isBlank()) {
            authorsRaw = getCsvVal(row, headerMap, "author", true, rowIndex);
        }
        List<String> authors = Arrays.stream(authorsRaw.split("[,;]"))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .toList();

        String publisher = getCsvVal(row, headerMap, "publisher", false, rowIndex);
        String publishDate = getCsvVal(row, headerMap, "publishdate", false, rowIndex);
        if (publishDate == null) {
            publishDate = getCsvVal(row, headerMap, "year", false, rowIndex);
        }

        String description = getCsvVal(row, headerMap, "description", false, rowIndex);
        String coverUrl = getCsvVal(row, headerMap, "coverurl", false, rowIndex);
        if (coverUrl == null) {
            coverUrl = getCsvVal(row, headerMap, "cover", false, rowIndex);
        }

        String pagesStr = getCsvVal(row, headerMap, "pages", false, rowIndex);
        Integer pages = (pagesStr != null && !pagesStr.isBlank()) ? Integer.parseInt(pagesStr.replaceAll("[^0-9]", "")) : null;

        String totalCopiesStr = getCsvVal(row, headerMap, "totalcopies", false, rowIndex);
        if (totalCopiesStr == null) {
            totalCopiesStr = getCsvVal(row, headerMap, "copies", false, rowIndex);
        }
        if (totalCopiesStr == null) {
            totalCopiesStr = getCsvVal(row, headerMap, "quantity", false, rowIndex);
        }
        Integer totalCopies = (totalCopiesStr != null && !totalCopiesStr.isBlank()) ? Integer.parseInt(totalCopiesStr.replaceAll("[^0-9]", "")) : 1;

        String language = getCsvVal(row, headerMap, "language", false, rowIndex);
        if (language == null || language.isBlank()) {
            language = getCsvVal(row, headerMap, "lang", false, rowIndex);
        }
        if (language == null || language.isBlank()) {
            language = "en";
        } else {
            language = language.trim().toLowerCase();
            if (language.startsWith("hi")) {
                language = "hi";
            } else if (language.startsWith("kn") || language.startsWith("kan")) {
                language = "kn";
            } else {
                language = "en";
            }
        }

        return BookDto.builder()
                .isbn(isbn)
                .title(title)
                .subtitle(subtitle)
                .authors(authors)
                .publisher(publisher)
                .publishDate(publishDate)
                .description(description)
                .coverUrl(coverUrl)
                .pages(pages)
                .totalCopies(totalCopies)
                .language(language)
                .build();
    }

    private BookDto parseExcelRow(Row row, Map<String, Integer> headerMap, int rowIndex) {
        String isbn = getExcelVal(row, headerMap, "isbn", true, rowIndex);
        String title = getExcelVal(row, headerMap, "title", true, rowIndex);
        String subtitle = getExcelVal(row, headerMap, "subtitle", false, rowIndex);

        String authorsRaw = getExcelVal(row, headerMap, "authors", false, rowIndex);
        if (authorsRaw == null || authorsRaw.isBlank()) {
            authorsRaw = getExcelVal(row, headerMap, "author", true, rowIndex);
        }
        List<String> authors = Arrays.stream(authorsRaw.split("[,;]"))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .toList();

        String publisher = getExcelVal(row, headerMap, "publisher", false, rowIndex);
        String publishDate = getExcelVal(row, headerMap, "publishdate", false, rowIndex);
        if (publishDate == null) {
            publishDate = getExcelVal(row, headerMap, "year", false, rowIndex);
        }

        String description = getExcelVal(row, headerMap, "description", false, rowIndex);
        String coverUrl = getExcelVal(row, headerMap, "coverurl", false, rowIndex);
        if (coverUrl == null) {
            coverUrl = getExcelVal(row, headerMap, "cover", false, rowIndex);
        }

        String pagesStr = getExcelVal(row, headerMap, "pages", false, rowIndex);
        Integer pages = (pagesStr != null && !pagesStr.isBlank()) ? (int) Double.parseDouble(pagesStr) : null;

        String totalCopiesStr = getExcelVal(row, headerMap, "totalcopies", false, rowIndex);
        if (totalCopiesStr == null) {
            totalCopiesStr = getExcelVal(row, headerMap, "copies", false, rowIndex);
        }
        if (totalCopiesStr == null) {
            totalCopiesStr = getExcelVal(row, headerMap, "quantity", false, rowIndex);
        }
        Integer totalCopies = (totalCopiesStr != null && !totalCopiesStr.isBlank()) ? (int) Double.parseDouble(totalCopiesStr) : 1;

        String language = getExcelVal(row, headerMap, "language", false, rowIndex);
        if (language == null || language.isBlank()) {
            language = getExcelVal(row, headerMap, "lang", false, rowIndex);
        }
        if (language == null || language.isBlank()) {
            language = "en";
        } else {
            language = language.trim().toLowerCase();
            if (language.startsWith("hi")) {
                language = "hi";
            } else if (language.startsWith("kn") || language.startsWith("kan")) {
                language = "kn";
            } else {
                language = "en";
            }
        }

        return BookDto.builder()
                .isbn(isbn)
                .title(title)
                .subtitle(subtitle)
                .authors(authors)
                .publisher(publisher)
                .publishDate(publishDate)
                .description(description)
                .coverUrl(coverUrl)
                .pages(pages)
                .totalCopies(totalCopies)
                .language(language)
                .build();
    }

    private String getCsvVal(String[] row, Map<String, Integer> headerMap, String key, boolean required, int rowIndex) {
        Integer colIndex = headerMap.get(key);
        if (colIndex == null || colIndex >= row.length) {
            if (required) {
                throw new IllegalArgumentException("Column for required field '" + key + "' is missing");
            }
            return null;
        }
        String val = row[colIndex];
        if (val != null) val = val.trim();
        if (required && (val == null || val.isBlank())) {
            throw new IllegalArgumentException("Required value for field '" + key + "' is missing at row " + (rowIndex + 1));
        }
        return val;
    }

    private String getExcelVal(Row row, Map<String, Integer> headerMap, String key, boolean required, int rowIndex) {
        Integer colIndex = headerMap.get(key);
        if (colIndex == null) {
            if (required) {
                throw new IllegalArgumentException("Column for required field '" + key + "' is missing");
            }
            return null;
        }
        Cell cell = row.getCell(colIndex);
        if (cell == null) {
            if (required) {
                throw new IllegalArgumentException("Required value for field '" + key + "' is missing at row " + (rowIndex + 1));
            }
            return null;
        }

        String val = "";
        if (cell.getCellType() == CellType.NUMERIC) {
            val = String.valueOf(cell.getNumericCellValue());
            // Format check for integers representation inside excel numerical doubles
            if (val.endsWith(".0")) {
                val = val.substring(0, val.length() - 2);
            }
        } else {
            val = cell.getStringCellValue().trim();
        }

        if (required && val.isBlank()) {
            throw new IllegalArgumentException("Required value for field '" + key + "' is missing at row " + (rowIndex + 1));
        }
        return val;
    }

    private boolean isRowEmpty(Row row) {
        for (int c = row.getFirstCellNum(); c < row.getLastCellNum(); c++) {
            Cell cell = row.getCell(c);
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                return false;
            }
        }
        return true;
    }
}
