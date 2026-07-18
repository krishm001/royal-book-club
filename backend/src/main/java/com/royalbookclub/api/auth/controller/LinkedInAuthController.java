package com.royalbookclub.api.auth.controller;

import com.royalbookclub.api.auth.service.LinkedInAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.Map;

/**
 * Controller exposing endpoints to initiate and complete LinkedIn OAuth 2.0 logins.
 */
@RestController
@RequestMapping("/api/v1/auth/linkedin")
@Tag(name = "LinkedIn Auth", description = "OAuth endpoints for LinkedIn authentication & Firebase integration")
public class LinkedInAuthController {

    private final LinkedInAuthService linkedInAuthService;

    public LinkedInAuthController(LinkedInAuthService linkedInAuthService) {
        this.linkedInAuthService = linkedInAuthService;
    }

    @GetMapping("/url")
    @Operation(summary = "Get LinkedIn OAuth URL", description = "Returns the redirect URL to initiate the LinkedIn authorization code flow.")
    public ResponseEntity<String> getAuthorizationUrl(@RequestParam(required = false) String redirectUri) {
        return ResponseEntity.ok(linkedInAuthService.getAuthorizationUrl(redirectUri));
    }

    @PostMapping("/callback")
    @Operation(summary = "LinkedIn Callback exchange", description = "Exchanges authorization code for access token, provisions user in Firestore, and returns Firebase custom token.")
    public Mono<ResponseEntity<Map<String, String>>> handleCallback(
            @RequestParam String code,
            @RequestParam(required = false) String redirectUri) {
        return linkedInAuthService.handleCallback(code, redirectUri)
                .map(customToken -> ResponseEntity.ok(Map.of("customToken", customToken)));
    }
}
