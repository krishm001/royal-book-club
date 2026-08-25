package com.royalbookclub.api.e2e;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.firestore.WriteResult;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.UserRecord;
import com.royalbookclub.api.book.model.Book;
import com.royalbookclub.api.book.model.BookCopy;
import com.royalbookclub.api.config.model.CheckoutSettings;
import com.royalbookclub.api.config.service.CheckoutSettingsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Controller strictly for E2E Test Automation.
 * Bypasses standard Firebase Auth to allow programmatic creation/teardown
 * of test data. Secured by a static shared secret injected via env vars.
 */
@RestController
@RequestMapping("/api/v1/e2e")
public class E2eTestController {

    private static final Logger log = LoggerFactory.getLogger(E2eTestController.class);

    @Value("${e2e.shared-secret:}")
    private String sharedSecret;

    private final Firestore firestore;
    private final CheckoutSettingsService checkoutSettingsService;

    public E2eTestController(Firestore firestore, CheckoutSettingsService checkoutSettingsService) {
        this.firestore = firestore;
        this.checkoutSettingsService = checkoutSettingsService;
    }

    private void validateSecret(String secret) {
        if (sharedSecret == null || sharedSecret.isBlank()) {
            throw new RuntimeException("E2E testing is disabled on this environment.");
        }
        if (!sharedSecret.equals(secret)) {
            throw new RuntimeException("Unauthorized E2E Request. Invalid secret.");
        }
    }

    @PostMapping("/setup")
    public ResponseEntity<Map<String, Object>> setup(@RequestHeader("X-E2E-Secret") String secret) throws Exception {
        validateSecret(secret);
        log.info("Running E2E Setup...");

        // 1. Create Test Book
        String isbn = "E2E_TEST_0001";
        Book book = new Book();
        book.setIsbn(isbn);
        book.setTitle("E2E Test Volume");
        book.setAuthors(List.of("E2E Robot"));
        book.setIsTest(true);
        book.setNtagUid("e2e000aabbcc");
        book.setNtagUids(List.of("e2e000aabbcc"));
        book.setQrIds(List.of(999000001L));
        book.setTotalCopies(5);
        book.setAvailableCopies(5);
        
        BookCopy copy = new BookCopy();
        copy.setCopyNo(1);
        copy.setNtagUid("e2e000aabbcc");
        copy.setQrId(999000001L);
        copy.setStatus("AVAILABLE");
        book.setCopies(List.of(copy));
        
        firestore.collection("books").document(isbn).set(book).get();

        // 2. Create Test NFC Counter
        Map<String, Object> counterData = new HashMap<>();
        counterData.put("counter", 10L);
        counterData.put("isTest", true);
        firestore.collection("nfc_counters").document("e2e000aabbcc").set(counterData).get();

        // 3. Create Test Users
        createOrUpdateUser("e2e_unverified@e2e-test.royalbookclub.invalid", false);
        createOrUpdateUser("e2e_verified_incomplete@e2e-test.royalbookclub.invalid", true);
        String completeUid = createOrUpdateUser("e2e_verified_complete@e2e-test.royalbookclub.invalid", true);
        createOrUpdateUser("anon@e2e-test.royalbookclub.invalid", false);

        // Add profile data to complete user
        Map<String, Object> profileData = new HashMap<>();
        profileData.put("email", "e2e_verified_complete@e2e-test.royalbookclub.invalid");
        profileData.put("phone", "+1234567890");
        profileData.put("address", "123 Test St, Test City, TS 12345");
        profileData.put("houseNo", "123");
        profileData.put("street", "Test St");
        profileData.put("city", "Test City");
        profileData.put("pinCode", "12345");
        profileData.put("firstName", "E2E");
        profileData.put("lastName", "User");
        firestore.collection("users").document(completeUid).set(profileData).get();

        Map<String, Object> response = new HashMap<>();
        response.put("status", "setup_complete");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/teardown")
    public ResponseEntity<Map<String, Object>> teardown(@RequestHeader("X-E2E-Secret") String secret) throws Exception {
        validateSecret(secret);
        log.info("Running E2E Teardown...");

        deleteTestDocs("books");
        deleteTestDocs("checkouts");
        deleteTestDocs("nfc_counters");

        List<String> testEmails = List.of(
            "e2e_unverified@e2e-test.royalbookclub.invalid",
            "e2e_verified_incomplete@e2e-test.royalbookclub.invalid",
            "e2e_verified_complete@e2e-test.royalbookclub.invalid",
            "anon@e2e-test.royalbookclub.invalid"
        );
        
        for (String email : testEmails) {
            try {
                UserRecord user = FirebaseAuth.getInstance().getUserByEmail(email);
                FirebaseAuth.getInstance().deleteUser(user.getUid());
                firestore.collection("users").document(user.getUid()).delete().get();
            } catch (Exception e) {
                // Ignore if user does not exist
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("status", "teardown_complete");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-email")
    public ResponseEntity<Map<String, Object>> verifyEmail(
            @RequestHeader("X-E2E-Secret") String secret, 
            @RequestParam String email) throws Exception {
        validateSecret(secret);
        UserRecord user = FirebaseAuth.getInstance().getUserByEmail(email);
        UserRecord.UpdateRequest request = new UserRecord.UpdateRequest(user.getUid())
                .setEmailVerified(true);
        FirebaseAuth.getInstance().updateUser(request);
        
        Map<String, Object> response = new HashMap<>();
        response.put("status", "email_verified");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/gating-config")
    public ResponseEntity<CheckoutSettings> getGatingConfig(@RequestHeader("X-E2E-Secret") String secret) {
        validateSecret(secret);
        return ResponseEntity.ok(checkoutSettingsService.getCheckoutSettings());
    }

    @PutMapping("/gating-config")
    public ResponseEntity<CheckoutSettings> updateGatingConfig(
            @RequestHeader("X-E2E-Secret") String secret, 
            @RequestBody CheckoutSettings settings) {
        validateSecret(secret);
        return ResponseEntity.ok(checkoutSettingsService.saveCheckoutSettings(settings));
    }

    private void deleteTestDocs(String collectionName) throws Exception {
        ApiFuture<QuerySnapshot> future = firestore.collection(collectionName).whereEqualTo("isTest", true).get();
        List<QueryDocumentSnapshot> documents = future.get().getDocuments();
        for (QueryDocumentSnapshot document : documents) {
            document.getReference().delete().get();
        }
    }

    private String createOrUpdateUser(String email, boolean emailVerified) throws Exception {
        String password = System.getenv("TEST_USER_PASSWORD") != null ? System.getenv("TEST_USER_PASSWORD") : "E2eTestPass123!";
        try {
            UserRecord user = FirebaseAuth.getInstance().getUserByEmail(email);
            UserRecord.UpdateRequest request = new UserRecord.UpdateRequest(user.getUid())
                    .setPassword(password)
                    .setEmailVerified(emailVerified);
            FirebaseAuth.getInstance().updateUser(request);
            return user.getUid();
        } catch (Exception e) {
            UserRecord.CreateRequest request = new UserRecord.CreateRequest()
                    .setEmail(email)
                    .setPassword(password)
                    .setEmailVerified(emailVerified);
            UserRecord user = FirebaseAuth.getInstance().createUser(request);
            return user.getUid();
        }
    }
}
