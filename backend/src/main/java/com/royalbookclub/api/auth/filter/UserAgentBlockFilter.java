package com.royalbookclub.api.auth.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.List;

/**
 * Filter that blocks requests from forbidden AI scrapers and crawlers
 * by inspecting the User-Agent header.
 */
@Component
public class UserAgentBlockFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(UserAgentBlockFilter.class);

    private static final List<String> FORBIDDEN_BOTS = List.of(
            "amazonbot",
            "applebot-extended",
            "bytespider",
            "ccbot",
            "claudebot",
            "cloudflarebrowserrenderingcrawler",
            "google-extended",
            "gptbot",
            "meta-externalagent"
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String userAgent = request.getHeader("User-Agent");

        if (userAgent != null) {
            String lowerUserAgent = userAgent.toLowerCase();
            for (String bot : FORBIDDEN_BOTS) {
                if (lowerUserAgent.contains(bot)) {
                    log.warn("Blocked request from AI scraper/crawler User-Agent: {} | IP: {} | Path: {}",
                            userAgent, request.getRemoteAddr(), request.getRequestURI());

                    response.setContentType("application/json");
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.getWriter().write(String.format(
                            "{\"success\":false,\"message\":\"Forbidden: Automated access by AI crawlers and data scrapers is strictly prohibited on royalbookclub.com under our Terms and Conditions.\",\"data\":null,\"timestamp\":\"%s\"}",
                            Instant.now()
                    ));
                    return;
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}
