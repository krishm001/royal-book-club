package com.royalbookclub.api.user.controller;

import com.royalbookclub.api.auth.dto.RegisterRequest;
import com.royalbookclub.api.common.dto.ApiResponse;
import com.royalbookclub.api.user.dto.UpdateRoleRequest;
import com.royalbookclub.api.user.model.Role;
import com.royalbookclub.api.user.model.User;
import com.royalbookclub.api.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller providing endpoints for authentication status checks and administrative user management.
 */
@RestController
@Tag(name = "User Management", description = "Endpoints for managing users and authenticated profiles")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * Retrieves the profile details of the currently authenticated user.
     * Uses Spring Security's @AuthenticationPrincipal to resolve the user principal.
     */
    @GetMapping("/api/v1/auth/me")
    @Operation(summary = "Get current authenticated user profile", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<User>> getCurrentUser(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(user));
    }

    /**
     * Admin-only endpoint to fetch all registered club users.
     */
    @GetMapping("/api/v1/admin/users")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get list of all registered users (Admin only)", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<List<User>>> getAllUsers() {
        List<User> users = userService.getAllUsers();
        return ResponseEntity.ok(ApiResponse.success(users));
    }

    /**
     * Public endpoint to register a new user in Firestore after Firebase Auth signup.
     * Called by frontend after successful email/password registration.
     */
    @PostMapping("/api/v1/auth/register")
    @Operation(summary = "Register new user in Firestore (called after Firebase signup)")
    public ResponseEntity<ApiResponse<User>> registerUser(@RequestBody RegisterRequest request) {
        User user = userService.getOrCreateUser(request.getUid(), request.getEmail(), request.getDisplayName());
        return ResponseEntity.ok(ApiResponse.success(user));
    }

    /**
     * Endpoint to fetch all users for non-admin display (e.g., member list).
     * Returns only non-sensitive user fields.
     */
    @GetMapping("/api/v1/users")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get list of all registered users (Admin only)", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<List<User>>> listUsers() {
        List<User> users = userService.getAllUsers();
        return ResponseEntity.ok(ApiResponse.success(users));
    }

    @PutMapping("/api/v1/admin/users/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update a user's role, admin-only", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<User>> updateUserRole(
            @PathVariable String id,
            @Valid @RequestBody UpdateRoleRequest request,
            @AuthenticationPrincipal User currentUser
    ) {
        Role requestedRole = request.getRole();
        if (currentUser != null && currentUser.getId() != null && currentUser.getId().equals(id) && requestedRole != Role.ADMIN) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Administrators may not downgrade their own role."));
        }

        userService.setUserRole(id, requestedRole, currentUser != null ? currentUser.getId() : null);
        User updated = userService.getUserById(id);
        return ResponseEntity.ok(ApiResponse.success(updated, "User role updated successfully."));
    }
}
