package com.royalbookclub.api.auth.filter;

import com.google.api.core.ApiFuture;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import com.royalbookclub.api.auth.FirebaseAuthenticationToken;
import com.royalbookclub.api.user.model.Role;
import com.royalbookclub.api.user.model.User;
import com.royalbookclub.api.user.service.UserService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ExecutionException;

/**
 * Filter that intercepts HTTP requests, extracts the Firebase Bearer token,
 * validates it against the Firebase Admin SDK, and establishes the SecurityContext.
 */
@Component
public class FirebaseTokenFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(FirebaseTokenFilter.class);

    private final FirebaseAuth firebaseAuth;
    private final UserService userService;

    public FirebaseTokenFilter(FirebaseAuth firebaseAuth, @Lazy UserService userService) {
        this.firebaseAuth = firebaseAuth;
        this.userService = userService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring(7);
        try {
            // Verify token using verifyIdTokenAsync as required
            ApiFuture<FirebaseToken> future = firebaseAuth.verifyIdTokenAsync(token);
            FirebaseToken firebaseToken = future.get(); // Resolves synchronously in the request thread

            String uid = firebaseToken.getUid();
            String email = firebaseToken.getEmail();
            String name = firebaseToken.getName();

            // Fetch user from Firestore database or create one on their first signup
            User user = userService.getOrCreateUser(uid, email, name);
            Role role = user.getRole() != null ? user.getRole() : Role.MEMBER;

            List<GrantedAuthority> authorities = Collections.singletonList(
                    new SimpleGrantedAuthority("ROLE_" + role.name())
            );

            FirebaseAuthenticationToken authentication = new FirebaseAuthenticationToken(
                    user, firebaseToken, authorities
            );
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

            SecurityContextHolder.getContext().setAuthentication(authentication);
            log.debug("Authenticated Firebase user {} with role: {}", email, role);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Token verification was interrupted", e);
            SecurityContextHolder.clearContext();
        } catch (ExecutionException e) {
            log.warn("Firebase ID token verification failed: {}", e.getCause().getMessage());
            SecurityContextHolder.clearContext();
        } catch (Exception e) {
            log.error("Error setting user authentication in security context", e);
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }
}
