package com.royalbookclub.api.config;

import com.royalbookclub.api.auth.filter.CloudflareSecretFilter;
import com.royalbookclub.api.auth.filter.FirebaseTokenFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Spring Security 6.x configuration class setting up standard WebSecurity,
 * stateless session management, path rules, and our custom Firebase authorization filter.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final FirebaseTokenFilter firebaseTokenFilter;
    private final CloudflareSecretFilter cloudflareSecretFilter;

    public SecurityConfig(FirebaseTokenFilter firebaseTokenFilter, CloudflareSecretFilter cloudflareSecretFilter) {
        this.firebaseTokenFilter = firebaseTokenFilter;
        this.cloudflareSecretFilter = cloudflareSecretFilter;
    }

    /**
     * Constructs and registers the Spring Security Filter Chain.
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setContentType("application/json");
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.getWriter().write("{\"success\":false,\"message\":\"Unauthorized: ID Token is missing, expired, or invalid\",\"data\":null,\"timestamp\":\"" + java.time.Instant.now() + "\"}");
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setContentType("application/json");
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.getWriter().write("{\"success\":false,\"message\":\"Forbidden: You do not have permission to access this resource\",\"data\":null,\"timestamp\":\"" + java.time.Instant.now() + "\"}");
                        })
                )
                .authorizeHttpRequests(authorize -> authorize
                        // Swagger/OpenAPI endpoints & Actuator metrics
                        .requestMatchers(
                                "/swagger-ui.html",
                                "/swagger-ui/**",
                                "/v3/api-docs/**",
                                "/api-docs/**",
                                "/actuator/**",
                                "/robots.txt",
                                "/sitemap.xml"
                        ).permitAll()
                        // Public authentication & catalog endpoints
                        .requestMatchers(
                                "/api/v1/auth/login",
                                "/api/v1/auth/signup",
                                "/api/v1/auth/register",
                                "/api/v1/auth/linkedin/**",
                                "/api/v1/public/**",
                                "/api/v1/books/**",
                                "/api/v1/events/**",
                                "/api/v1/genres/**",
                                "/api/v1/discourses/**",
                                "/api/v1/site-reviews"
                        ).permitAll()
                        // Any other request must be authenticated
                        .anyRequest().authenticated()
                )
                // Add the Cloudflare origin verification filter at the top, and Firebase token filter before auth
                .addFilterBefore(cloudflareSecretFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(firebaseTokenFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
