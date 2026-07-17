package com.royalbookclub.api.auth.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;

/**
 * Filter that enforces that incoming requests (except actuator health checks)
 * are routed through Cloudflare, verifying a shared secret header.
 */
@Component
public class CloudflareSecretFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(CloudflareSecretFilter.class);

    private static final String CLOUDFLARE_HEADER = "X-Cloudflare-Secret";

    private final String cloudflareSecret;

    public CloudflareSecretFilter(@Value("${app.security.cloudflare-secret:}") String cloudflareSecret) {
        this.cloudflareSecret = cloudflareSecret;
        if (!StringUtils.hasText(cloudflareSecret)) {
            log.warn("Cloudflare Secret is NOT set. Origin verification is DISABLED. This is acceptable ONLY for local development.");
        } else {
            log.info("Cloudflare Secret validation is ENABLED. Requests must carry the correct X-Cloudflare-Secret header.");
        }
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // 1. Bypass check if secret is not configured (e.g. in local development)
        if (!StringUtils.hasText(cloudflareSecret)) {
            filterChain.doFilter(request, response);
            return;
        }

        // 2. Bypass check for Actuator health and readiness/liveness probes
        String path = request.getRequestURI();
        if (path.startsWith("/actuator") || path.equals("/health")) {
            filterChain.doFilter(request, response);
            return;
        }

        // 3. Verify the secret header
        String incomingSecret = request.getHeader(CLOUDFLARE_HEADER);
        if (cloudflareSecret.equals(incomingSecret)) {
            filterChain.doFilter(request, response);
        } else {
            log.warn("Unauthorized direct origin access attempt: IP={}, Path={}, Header={}",
                    request.getRemoteAddr(), path, incomingSecret != null ? "[PRESENT]" : "[MISSING]");

            response.setContentType("application/json");
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.getWriter().write(String.format(
                    "{\"success\":false,\"message\":\"Forbidden: Direct origin access is blocked. Please access the application via Cloudflare.\",\"data\":null,\"timestamp\":\"%s\"}",
                    Instant.now()
            ));
        }
    }
}
