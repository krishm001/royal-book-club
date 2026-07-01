package com.royalbookclub.api.translation;

import com.royalbookclub.api.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/translate")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Translation", description = "Administrative endpoints to generate translations using Google Cloud Translate API")
public class AdminTranslationController {

    private static final Logger log = LoggerFactory.getLogger(AdminTranslationController.class);

    private final TranslationService translationService;

    public AdminTranslationController(TranslationService translationService) {
        this.translationService = translationService;
    }

    @PostMapping
    @Operation(summary = "Translate Map of Texts", description = "Generates translations of a map of fields to target languages.")
    public ResponseEntity<ApiResponse<Map<String, Map<String, String>>>> translate(
            @RequestBody TranslationRequest request) {
        log.info("Admin request to translate {} fields to {}", 
                request.getTexts() != null ? request.getTexts().size() : 0, 
                request.getTargetLanguages());
        
        if (request.getTexts() == null || request.getTexts().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Source texts cannot be empty"));
        }
        if (request.getTargetLanguages() == null || request.getTargetLanguages().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Target languages cannot be empty"));
        }

        Map<String, Map<String, String>> translations = translationService.translateMap(
                request.getTexts(), 
                request.getTargetLanguages()
        );

        return ResponseEntity.ok(ApiResponse.success(translations, "Translations generated successfully"));
    }
}
