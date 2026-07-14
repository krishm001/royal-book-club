package com.royalbookclub.api.user.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import com.royalbookclub.api.common.exception.BusinessRuleException;
import com.royalbookclub.api.common.exception.ResourceNotFoundException;
import com.royalbookclub.api.user.model.Role;
import com.royalbookclub.api.user.model.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;

/**
 * Service to manage Firebase Users mapped in Firestore.
 */
@Service
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    private final Firestore firestore;
    private final com.google.firebase.auth.FirebaseAuth firebaseAuth;
    private static final String COLLECTION_NAME = "users";

    public UserService(Firestore firestore, com.google.firebase.auth.FirebaseAuth firebaseAuth) {
        this.firestore = firestore;
        this.firebaseAuth = firebaseAuth;
    }


    private String sanitizeName(String name) {
        if (name == null) return "";
        String trimmed = name.trim();
        if (trimmed.isEmpty() || 
            "null".equalsIgnoreCase(trimmed) || 
            "null null".equalsIgnoreCase(trimmed) || 
            "null null null".equalsIgnoreCase(trimmed)) {
            return "";
        }
        return trimmed;
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
                    boolean needsUpdate = false;
                    
                    String fName = sanitizeName(user.getFirstName());
                    String lName = sanitizeName(user.getLastName());
                    
                    if (user.getFirstName() != null && !fName.equals(user.getFirstName())) {
                        user.setFirstName(fName);
                        needsUpdate = true;
                    }
                    if (user.getLastName() != null && !lName.equals(user.getLastName())) {
                        user.setLastName(lName);
                        needsUpdate = true;
                    }
                    
                    String sanitizedFullName = sanitizeName(fullName);
                    if (fName.isEmpty() && !sanitizedFullName.isEmpty()) {
                        String[] parts = sanitizedFullName.split("\\s+", 2);
                        user.setFirstName(parts[0]);
                        if (parts.length > 1) {
                            user.setLastName(parts[1]);
                        } else {
                            user.setLastName("");
                        }
                        needsUpdate = true;
                    }
                    
                    if (needsUpdate) {
                        user.setUpdatedAt(new Date());
                        docRef.set(user).get();
                        log.info("Synchronized profile name for existing user {} from Google token name: {}", uid, fullName);
                    }
                    return user;
                }
            }

            // User does not exist, provision a new one in Firestore
            String firstName = "";
            String lastName = "";
            String sanitizedFullName = sanitizeName(fullName);
            if (!sanitizedFullName.isEmpty()) {
                String[] parts = sanitizedFullName.split("\\s+", 2);
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
                    if (user.getDeleted() != null && user.getDeleted()) {
                        continue;
                    }
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
            if (updatedUser.getFirstName() != null) {
                existing.setFirstName(updatedUser.getFirstName());
            }
            if (updatedUser.getLastName() != null) {
                existing.setLastName(updatedUser.getLastName());
            }
            if (updatedUser.getRfidToken() != null) {
                existing.setRfidToken(updatedUser.getRfidToken());
            }
            if (updatedUser.getPhone() != null) {
                existing.setPhone(updatedUser.getPhone());
            }
            if (updatedUser.getHouseNo() != null) {
                existing.setHouseNo(updatedUser.getHouseNo());
            }
            if (updatedUser.getStreet() != null) {
                existing.setStreet(updatedUser.getStreet());
            }
            if (updatedUser.getCity() != null) {
                existing.setCity(updatedUser.getCity());
            }
            if (updatedUser.getPinCode() != null) {
                existing.setPinCode(updatedUser.getPinCode());
            }
            if (updatedUser.getLanguage() != null) {
                existing.setLanguage(updatedUser.getLanguage());
            }
            if (updatedUser.getConsentAcceptedAt() != null) {
                existing.setConsentAcceptedAt(updatedUser.getConsentAcceptedAt());
            }
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
        if (role == null) {
            throw new BusinessRuleException("Target role must be provided.");
        }
        if (performedBy != null && performedBy.equals(id) && role != Role.ADMIN) {
            throw new BusinessRuleException("Administrators cannot downgrade their own role.");
        }

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

    /**
     * Counts active checkouts for a given member.
     */
    public long getActiveCheckoutsCount(String targetUid) {
        if (targetUid == null || targetUid.isBlank()) {
            return 0;
        }
        try {
            Query activeQuery = firestore.collection("checkouts")
                    .whereEqualTo("memberId", targetUid)
                    .whereIn("status", java.util.Arrays.asList("CHECKED_OUT", "REQUESTED_CHECKOUT", "REQUESTED_RETURN"));
            return activeQuery.get().get().size();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Request interrupted while checking active checkouts.", e);
        } catch (ExecutionException e) {
            throw new RuntimeException("Database error checking active checkouts: " + e.getMessage(), e);
        }
    }

    /**
     * Soft deletes and anonymizes a user.
     */
    public void deleteUserPermanently(String targetUid, String performedByUid, boolean force) {
        if (targetUid == null || targetUid.isBlank()) {
            throw new BusinessRuleException("Target user UID must be provided.");
        }
        if (targetUid.equals(performedByUid)) {
            throw new BusinessRuleException("You are not authorized to delete your own administrative ledger entry.");
        }

        DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(targetUid);
        try {
            DocumentSnapshot docSnapshot = docRef.get().get();
            if (!docSnapshot.exists()) {
                throw new ResourceNotFoundException("User not found with ID: " + targetUid);
            }

            User existingUser = docSnapshot.toObject(User.class);
            if (existingUser != null && existingUser.getDeleted() != null && existingUser.getDeleted()) {
                throw new BusinessRuleException("User is already deleted.");
            }

            long activeCount = getActiveCheckoutsCount(targetUid);
            if (activeCount > 0 && !force) {
                throw new BusinessRuleException("ACTIVE_CHECKOUTS_FOUND:" + activeCount);
            }

            if (activeCount > 0 && force) {
                log.info("Force delete initiated. Clearing {} active checkouts for user {}.", activeCount, targetUid);
                try {
                    QuerySnapshot activeSnap = firestore.collection("checkouts")
                            .whereEqualTo("memberId", targetUid)
                            .whereIn("status", java.util.Arrays.asList("CHECKED_OUT", "REQUESTED_CHECKOUT", "REQUESTED_RETURN"))
                            .get().get();
                    
                    for (QueryDocumentSnapshot checkoutDoc : activeSnap.getDocuments()) {
                        String bookId = checkoutDoc.getString("bookId");
                        DocumentReference checkoutRef = checkoutDoc.getReference();
                        
                        // 1. Return book copy back to inventory
                        if (bookId != null && !bookId.isBlank()) {
                            DocumentReference bookRef = firestore.collection("books").document(bookId);
                            DocumentSnapshot bookDoc = bookRef.get().get();
                            if (bookDoc.exists()) {
                                Long available = bookDoc.getLong("availableCopies");
                                Long total = bookDoc.getLong("totalCopies");
                                long newAvailable = (available != null ? available : 0) + 1;
                                if (total != null && newAvailable > total) {
                                    newAvailable = total;
                                }
                                bookRef.update("availableCopies", newAvailable).get();
                                log.info("Restored copy of book {} for force-deleted user {}.", bookId, targetUid);
                            }
                        }
                        
                        // 2. Mark checkout as RETURNED
                        Map<String, Object> checkoutUpdates = new java.util.HashMap<>();
                        checkoutUpdates.put("status", "RETURNED");
                        checkoutUpdates.put("returnedAt", new Date());
                        checkoutUpdates.put("notes", "Automatically returned due to administrative force user deletion.");
                        checkoutRef.update(checkoutUpdates).get();
                    }
                    log.info("Successfully cleared {} active checkouts for force-deleted user {}.", activeCount, targetUid);
                } catch (Exception e) {
                    log.error("Failed to clear active checkouts for force-deleted user {}: {}", targetUid, e.getMessage(), e);
                }
            }

            // 1. Delete from Firebase Authentication credentials
            try {
                firebaseAuth.deleteUser(targetUid);
                log.info("Successfully deleted user {} from Firebase Authentication credentials.", targetUid);
            } catch (Exception e) {
                log.error("Firebase Auth deletion failed for uid: {}. Message: {}. Proceeding to anonymize Firestore document.", targetUid, e.getMessage(), e);
            }

            // 2. Soft-delete user document from Firestore (anonymize fields, keeping only firstName and lastName)
            Map<String, Object> updates = new java.util.HashMap<>();
            updates.put("email", null);
            updates.put("phone", null);
            updates.put("rfidToken", null);
            updates.put("houseNo", null);
            updates.put("street", null);
            updates.put("city", null);
            updates.put("pinCode", null);
            updates.put("consentAcceptedAt", null);
            updates.put("deleted", true);
            updates.put("updatedAt", new Date());

            docRef.update(updates).get();
            log.info("Successfully anonymized user {} in Firestore, preserving only name.", targetUid);

            // 3. Write an audit entry
            DocumentReference auditRef = firestore.collection("admin_actions").document();
            auditRef.set(new java.util.HashMap<String, Object>() {{
                put("userId", targetUid);
                put("action", "SOFT_DELETION_ANONYMIZED");
                put("performedBy", performedByUid);
                put("performedAt", new Date());
                put("hadActiveCheckouts", activeCount > 0);
            }}).get();

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Request interrupted while deleting user.", e);
        } catch (ExecutionException e) {
            throw new RuntimeException("Database error deleting user: " + e.getMessage(), e);
        }
    }
}

