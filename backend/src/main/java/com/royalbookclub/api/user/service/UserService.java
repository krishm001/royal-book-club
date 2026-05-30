package com.royalbookclub.api.user.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import com.royalbookclub.api.common.exception.ResourceNotFoundException;
import com.royalbookclub.api.user.model.Role;
import com.royalbookclub.api.user.model.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.concurrent.ExecutionException;

/**
 * Service to manage Firebase Users mapped in Firestore.
 */
@Service
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    private final Firestore firestore;
    private static final String COLLECTION_NAME = "users";

    public UserService(Firestore firestore) {
        this.firestore = firestore;
    }

    /**
     * Retrieves a user from Firestore, or creates it if it doesn't exist yet.
     */
    public User getOrCreateUser(String uid, String email, String fullName) {
        DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(uid);
        try {
            ApiFuture<DocumentSnapshot> future = docRef.get();
            DocumentSnapshot document = future.get();

            if (document.exists()) {
                User user = document.toObject(User.class);
                if (user != null) {
                    user.setId(document.getId());
                    return user;
                }
            }

            // User does not exist, provision a new one in Firestore
            String firstName = "";
            String lastName = "";
            if (fullName != null && !fullName.trim().isEmpty()) {
                String[] parts = fullName.trim().split("\\s+", 2);
                firstName = parts[0];
                if (parts.length > 1) {
                    lastName = parts[1];
                }
            } else if (email != null && email.contains("@")) {
                firstName = email.split("@")[0];
            } else {
                firstName = "Club";
                lastName = "Member";
            }

            // Assign ADMIN to the very first user or a config-based admin list, default to MEMBER
            Role role = Role.MEMBER;
            // E.g., check if this is the first user ever registered in Firestore
            ApiFuture<QuerySnapshot> countFuture = firestore.collection(COLLECTION_NAME).limit(1).get();
            if (countFuture.get().isEmpty()) {
                role = Role.ADMIN;
                log.info("First user detected in system. Assigning ADMIN role to {}", email);
            }

            User newUser = User.builder()
                    .id(uid)
                    .email(email)
                    .firstName(firstName)
                    .lastName(lastName)
                    .role(role)
                    .createdAt(new Date())
                    .updatedAt(new Date())
                    .build();

            log.info("Creating new Firestore user document for uid: {}, email: {}", uid, email);
            ApiFuture<WriteResult> writeResult = docRef.set(newUser);
            writeResult.get(); // Synchronize write

            return newUser;

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Failed to get/create user due to interruption", e);
            throw new RuntimeException("User verification interrupted", e);
        } catch (ExecutionException e) {
            log.error("Error communicating with Firestore while getting/creating user", e);
            throw new RuntimeException("Database error verifying user details", e);
        }
    }

    /**
     * Retrieves a user by their Firestore document ID (UID).
     */
    public User getUserById(String id) {
        DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(id);
        try {
            DocumentSnapshot document = docRef.get().get();
            if (!document.exists()) {
                throw new ResourceNotFoundException("User not found with ID: " + id);
            }
            User user = document.toObject(User.class);
            if (user != null) {
                user.setId(document.getId());
            }
            return user;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Request interrupted", e);
        } catch (ExecutionException e) {
            throw new RuntimeException("Database error fetching user", e);
        }
    }

    /**
     * Returns a list of all users in the system.
     */
    public List<User> getAllUsers() {
        try {
            ApiFuture<QuerySnapshot> future = firestore.collection(COLLECTION_NAME).get();
            List<QueryDocumentSnapshot> documents = future.get().getDocuments();
            List<User> users = new ArrayList<>();
            for (QueryDocumentSnapshot document : documents) {
                User user = document.toObject(User.class);
                if (user != null) {
                    user.setId(document.getId());
                    users.add(user);
                }
            }
            return users;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Request interrupted", e);
        } catch (ExecutionException e) {
            throw new RuntimeException("Database error retrieving users list", e);
        }
    }

    /**
     * Updates an existing user's details.
     */
    public User updateUser(String id, User updatedUser) {
        DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(id);
        try {
            DocumentSnapshot document = docRef.get().get();
            if (!document.exists()) {
                throw new ResourceNotFoundException("User not found with ID: " + id);
            }

            User existing = document.toObject(User.class);
            if (existing == null) {
                throw new ResourceNotFoundException("User details could not be parsed");
            }

            // Update allowed fields
            existing.setFirstName(updatedUser.getFirstName());
            existing.setLastName(updatedUser.getLastName());
            existing.setRfidToken(updatedUser.getRfidToken());
            existing.setUpdatedAt(new Date());

            // Protect role changes from general updates
            if (updatedUser.getRole() != null) {
                existing.setRole(updatedUser.getRole());
            }

            docRef.set(existing).get();
            existing.setId(id);
            return existing;

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Request interrupted", e);
        } catch (ExecutionException e) {
            throw new RuntimeException("Database error updating user", e);
        }
    }

    /**
     * Sets the role for an existing user and records an audit entry.
     */
    public void setUserRole(String id, Role role, String performedBy) {
        DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(id);
        try {
            DocumentSnapshot document = docRef.get().get();
            if (!document.exists()) {
                throw new ResourceNotFoundException("User not found with ID: " + id);
            }

            ApiFuture<WriteResult> write = docRef.update("role", role, "updatedAt", new Date());
            write.get();

            // Write an audit entry
            DocumentReference auditRef = firestore.collection("admin_actions").document();
            ApiFuture<WriteResult> auditW = auditRef.set(new java.util.HashMap<String, Object>() {{
                put("userId", id);
                put("newRole", role.name());
                put("performedBy", performedBy);
                put("performedAt", new Date());
            }});
            auditW.get();

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Request interrupted", e);
        } catch (ExecutionException e) {
            throw new RuntimeException("Database error updating user role", e);
        }
    }
}
