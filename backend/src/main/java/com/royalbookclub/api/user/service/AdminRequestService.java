package com.royalbookclub.api.user.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.*;
import com.royalbookclub.api.common.exception.ResourceNotFoundException;
import com.royalbookclub.api.user.model.AdminRequest;
import com.royalbookclub.api.user.model.AdminRequestStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutionException;

@Service
public class AdminRequestService {

    private static final Logger log = LoggerFactory.getLogger(AdminRequestService.class);

    private final Firestore firestore;
    private static final String COLLECTION = "admin_requests";

    private final UserService userService;

    public AdminRequestService(Firestore firestore, UserService userService) {
        this.firestore = firestore;
        this.userService = userService;
    }

    public AdminRequest createRequest(String requesterUid, String requesterEmail, String reason) {
        String id = UUID.randomUUID().toString();
        AdminRequest req = AdminRequest.builder()
                .id(id)
                .requesterUid(requesterUid)
                .requesterEmail(requesterEmail)
                .reason(reason)
                .status(AdminRequestStatus.PENDING)
                .createdAt(new Date())
                .build();

        try {
            ApiFuture<WriteResult> write = firestore.collection(COLLECTION).document(id).set(req);
            write.get();
            return req;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Interrupted creating admin request", e);
        } catch (ExecutionException e) {
            log.error("Error creating admin request", e);
            throw new RuntimeException("Database error creating admin request", e);
        }
    }

    public List<AdminRequest> listByStatus(AdminRequestStatus status) {
        try {
            Query query = firestore.collection(COLLECTION).whereEqualTo("status", status.name());
            ApiFuture<QuerySnapshot> future = query.get();
            List<QueryDocumentSnapshot> docs = future.get().getDocuments();
            List<AdminRequest> results = new ArrayList<>();
            for (QueryDocumentSnapshot d : docs) {
                AdminRequest r = d.toObject(AdminRequest.class);
                if (r != null) {
                    r.setId(d.getId());
                    results.add(r);
                }
            }
            return results;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Interrupted listing admin requests", e);
        } catch (ExecutionException e) {
            throw new RuntimeException("Database error listing admin requests", e);
        }
    }

    public AdminRequest getById(String id) {
        DocumentReference ref = firestore.collection(COLLECTION).document(id);
        try {
            DocumentSnapshot snap = ref.get().get();
            if (!snap.exists()) {
                throw new ResourceNotFoundException("AdminRequest not found: " + id);
            }
            AdminRequest r = snap.toObject(AdminRequest.class);
            if (r != null) r.setId(snap.getId());
            return r;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Interrupted fetching admin request", e);
        } catch (ExecutionException e) {
            throw new RuntimeException("Database error fetching admin request", e);
        }
    }

    public AdminRequest approve(String id, String adminUid, String note) {
        DocumentReference ref = firestore.collection(COLLECTION).document(id);

        try {
            // Update the admin_request status atomically
            ApiFuture<Transaction> txFuture = firestore.runTransaction(transaction -> {
                DocumentSnapshot snap = transaction.get(ref).get();
                if (!snap.exists()) {
                    throw new ResourceNotFoundException("AdminRequest not found: " + id);
                }
                AdminRequest r = snap.toObject(AdminRequest.class);
                if (r == null) {
                    throw new ResourceNotFoundException("AdminRequest parse error: " + id);
                }

                r.setStatus(AdminRequestStatus.APPROVED);
                r.setReviewedBy(adminUid);
                r.setReviewedAt(new Date());
                r.setNote(note);

                transaction.set(ref, r);

                return null;
            });

            // Wait for completion
            txFuture.get();

            // After the admin_request is marked approved, update the user's role and write an audit
            AdminRequest updated = getById(id);
            if (updated != null) {
                userService.setUserRole(updated.getRequesterUid(), com.royalbookclub.api.user.model.Role.ADMIN, adminUid);
            }

            return getById(id);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Interrupted approving admin request", e);
        } catch (ExecutionException e) {
            throw new RuntimeException("Database error approving admin request", e);
        }
    }

    public AdminRequest reject(String id, String adminUid, String note) {
        DocumentReference ref = firestore.collection(COLLECTION).document(id);
        try {
            ApiFuture<WriteResult> w = ref.update(
                    "status", AdminRequestStatus.REJECTED.name(),
                    "reviewedBy", adminUid,
                    "reviewedAt", new Date(),
                    "note", note
            );
            w.get();
            return getById(id);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Interrupted rejecting admin request", e);
        } catch (ExecutionException e) {
            throw new RuntimeException("Database error rejecting admin request", e);
        }
    }
}
