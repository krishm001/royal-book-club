package com.royalbookclub.api.auth.service;

import com.google.firebase.auth.FirebaseAuth;
import com.royalbookclub.api.user.model.User;
import com.royalbookclub.api.user.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * Service to manage LinkedIn OAuth 2.0 authorization code flow, profile parsing,
 * and minting Firebase custom tokens.
 */
@Service
public class LinkedInAuthService {

    private static final Logger log = LoggerFactory.getLogger(LinkedInAuthService.class);

    @Value("${linkedin.client-id}")
    private String clientId;

    @Value("${linkedin.client-secret}")
    private String clientSecret;

    @Value("${linkedin.redirect-uri}")
    private String redirectUri;

    private final UserService userService;
    private final FirebaseAuth firebaseAuth;
    private final WebClient webClient;

    public LinkedInAuthService(UserService userService, FirebaseAuth firebaseAuth) {
        this.userService = userService;
        this.firebaseAuth = firebaseAuth;
        this.webClient = WebClient.builder().build();
    }

    /**
     * Builds and returns the official LinkedIn Authorization Redirect URL.
     */
    public String getAuthorizationUrl(String customRedirectUri) {
        String activeRedirectUri = (customRedirectUri != null && !customRedirectUri.isBlank()) 
                ? customRedirectUri 
                : this.redirectUri;
        try {
            return "https://www.linkedin.com/oauth/v2/authorization"
                    + "?response_type=code"
                    + "&client_id=" + URLEncoder.encode(clientId, StandardCharsets.UTF_8)
                    + "&redirect_uri=" + URLEncoder.encode(activeRedirectUri, StandardCharsets.UTF_8)
                    + "&scope=" + URLEncoder.encode("openid profile email", StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("Failed to generate LinkedIn Authorization URL", e);
            throw new RuntimeException("Failed to generate LinkedIn Authorization URL", e);
        }
    }

    public String getAuthorizationUrl() {
        return getAuthorizationUrl(null);
    }

    /**
     * Exchanges the authorization code for LinkedIn UserInfo profile, gets or creates
     * the user in Firestore, and mints a Firebase custom token.
     */
    public Mono<String> handleCallback(String code, String customRedirectUri) {
        if (code == null || code.isBlank()) {
            return Mono.error(new IllegalArgumentException("Authorization code cannot be null or blank"));
        }

        String activeRedirectUri = (customRedirectUri != null && !customRedirectUri.isBlank()) 
                ? customRedirectUri 
                : this.redirectUri;

        MultiValueMap<String, String> tokenRequest = new LinkedMultiValueMap<>();
        tokenRequest.add("grant_type", "authorization_code");
        tokenRequest.add("code", code);
        tokenRequest.add("client_id", clientId);
        tokenRequest.add("client_secret", clientSecret);
        tokenRequest.add("redirect_uri", activeRedirectUri);

        log.info("Exchanging authorization code with LinkedIn for Access Token using redirect_uri: {}...", activeRedirectUri);

        return webClient.post()
                .uri("https://www.linkedin.com/oauth/v2/accessToken")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(BodyInserters.fromFormData(tokenRequest))
                .retrieve()
                .onStatus(status -> status.isError(), response -> 
                    response.bodyToMono(String.class)
                        .flatMap(errorBody -> {
                            log.error("LinkedIn Access Token Exchange failed with status {}. Response body: {}", response.statusCode(), errorBody);
                            return Mono.error(new IllegalStateException("LinkedIn OAuth exchange failed: " + errorBody));
                        })
                )
                .bodyToMono(Map.class)
                .flatMap(tokenResponse -> {
                    String accessToken = (String) tokenResponse.get("access_token");
                    if (accessToken == null || accessToken.isBlank()) {
                        return Mono.error(new IllegalStateException("Failed to retrieve access token from LinkedIn"));
                    }
                    log.info("Access Token received. Fetching LinkedIn user profile...");
                    return fetchLinkedInProfile(accessToken);
                })
                .flatMap(profile -> {
                    String sub = (String) profile.get("sub");
                    String email = (String) profile.get("email");
                    String name = (String) profile.get("name");

                    if (sub == null || sub.isBlank()) {
                        return Mono.error(new IllegalStateException("LinkedIn user profile did not contain 'sub' field"));
                    }
                    if (email == null || email.isBlank()) {
                        // fallback or generate email based on sub if not present (OpenID standard requires email)
                        email = sub + "@linkedin.royalbookclub.com";
                    }
                    if (name == null || name.isBlank()) {
                        name = "LinkedIn User";
                    }

                    String uid = "linkedin_" + sub;
                    log.info("LinkedIn user resolved: ID={}, Email={}, Name={}. Provisioning Firestore record...", uid, email, name);

                    try {
                        User user = userService.getOrCreateUser(uid, email, name);
                        log.info("Firestore user provisioned successfully. Minting custom Firebase Token for user {}", uid);
                        String customToken = firebaseAuth.createCustomToken(uid);
                        return Mono.just(customToken);
                    } catch (Exception e) {
                        log.error("Failed to provision user or mint custom token", e);
                        return Mono.error(e);
                    }
                });
    }

    public Mono<String> handleCallback(String code) {
        return handleCallback(code, null);
    }

    private Mono<Map> fetchLinkedInProfile(String accessToken) {
        return webClient.get()
                .uri("https://api.linkedin.com/v2/userinfo")
                .headers(headers -> headers.setBearerAuth(accessToken))
                .retrieve()
                .bodyToMono(Map.class)
                .onErrorResume(ex -> {
                    log.warn("OpenID Connect userinfo endpoint returned error: {}. Falling back to legacy LinkedIn APIs...", ex.getMessage());
                    return fetchLegacyLinkedInProfile(accessToken);
                });
    }

    private Mono<Map> fetchLegacyLinkedInProfile(String accessToken) {
        log.info("Attempting to fetch profile using legacy LinkedIn API endpoints (/v2/me)...");
        
        Mono<Map> profileMono = webClient.get()
                .uri("https://api.linkedin.com/v2/me")
                .headers(headers -> headers.setBearerAuth(accessToken))
                .retrieve()
                .bodyToMono(Map.class)
                .onErrorResume(ex -> {
                    log.error("Legacy LinkedIn profile fetch failed: {}", ex.getMessage());
                    return Mono.empty();
                });

        Mono<Map> emailMono = webClient.get()
                .uri("https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))")
                .headers(headers -> headers.setBearerAuth(accessToken))
                .retrieve()
                .bodyToMono(Map.class)
                .onErrorResume(ex -> {
                    log.error("Legacy LinkedIn email fetch failed: {}", ex.getMessage());
                    return Mono.empty();
                });

        return Mono.zip(profileMono, emailMono)
                .map(tuple -> {
                    Map<?, ?> profile = tuple.getT1();
                    Map<?, ?> emailResponse = tuple.getT2();
                    
                    java.util.HashMap<String, Object> unifiedMap = new java.util.HashMap<>();
                    
                    String id = (String) profile.get("id");
                    unifiedMap.put("sub", id);
                    
                    String firstName = (String) profile.get("localizedFirstName");
                    String lastName = (String) profile.get("localizedLastName");
                    String fullName = "LinkedIn User";
                    if (firstName != null && !firstName.isBlank()) {
                        fullName = firstName;
                        if (lastName != null && !lastName.isBlank()) {
                            fullName += " " + lastName;
                        }
                    }
                    unifiedMap.put("name", fullName);
                    
                    String email = null;
                    if (emailResponse != null && emailResponse.containsKey("elements")) {
                        try {
                            java.util.List<?> elements = (java.util.List<?>) emailResponse.get("elements");
                            if (elements != null && !elements.isEmpty()) {
                                Map<?, ?> element = (Map<?, ?>) elements.get(0);
                                Map<?, ?> handle = (Map<?, ?>) element.get("handle~");
                                if (handle != null) {
                                    email = (String) handle.get("emailAddress");
                                }
                            }
                        } catch (Exception e) {
                            log.warn("Failed to parse email from legacy LinkedIn response", e);
                        }
                    }
                    unifiedMap.put("email", email);
                    return (Map) unifiedMap;
                })
                .switchIfEmpty(Mono.error(new IllegalStateException("Failed to resolve profile from both OpenID Connect and Legacy LinkedIn APIs")));
    }
}
