package com.royalbookclub.api.user.service;

import com.google.cloud.firestore.Firestore;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import com.google.firebase.auth.UserRecord;
import com.google.firebase.auth.UserInfo;
import com.royalbookclub.api.auth.FirebaseAuthenticationToken;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class UserServiceTest {

    @Mock
    private Firestore firestore;

    private FirebaseAuth firebaseAuth = null;

    @Mock
    private UserRecord userRecord;

    @Mock
    private UserInfo userInfo;

    private UserService userService;
    private boolean shouldThrowPermissionError;
    private boolean shouldReturnMockUser;
    private boolean getFirebaseUserRecordCalled;

    @BeforeEach
    void setUp() {
        shouldThrowPermissionError = false;
        shouldReturnMockUser = false;
        getFirebaseUserRecordCalled = false;

        userService = new UserService(firestore, firebaseAuth) {
            @Override
            protected UserRecord getFirebaseUserRecord(String uid) throws Exception {
                getFirebaseUserRecordCalled = true;
                if (shouldThrowPermissionError) {
                    throw new RuntimeException("INSUFFICIENT_PERMISSION: Firebase Admin lacks permissions");
                }
                if (shouldReturnMockUser) {
                    return userRecord;
                }
                return super.getFirebaseUserRecord(uid);
            }
        };
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private FirebaseToken createFirebaseToken(String uid, boolean emailVerified, String signInProvider) throws Exception {
        Map<String, Object> claims = new HashMap<>();
        claims.put("sub", uid);
        claims.put("email_verified", emailVerified);
        
        Map<String, Object> firebaseMetadata = new HashMap<>();
        firebaseMetadata.put("sign_in_provider", signInProvider);
        claims.put("firebase", firebaseMetadata);
        
        var constructor = FirebaseToken.class.getDeclaredConstructor(Map.class);
        constructor.setAccessible(true);
        return constructor.newInstance(claims);
    }

    @Test
    void testIsEmailVerifiedFromSecurityContext_PasswordProvider_Verified() throws Exception {
        String uid = "user123";
        FirebaseToken token = createFirebaseToken(uid, true, "password");

        FirebaseAuthenticationToken authToken = new FirebaseAuthenticationToken(null, token, Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(authToken);

        boolean result = userService.isEmailVerified(uid);

        assertTrue(result);
        assertFalse(getFirebaseUserRecordCalled); // Remote call bypassed
    }

    @Test
    void testIsEmailVerifiedFromSecurityContext_PasswordProvider_Unverified() throws Exception {
        String uid = "user123";
        FirebaseToken token = createFirebaseToken(uid, false, "password");

        FirebaseAuthenticationToken authToken = new FirebaseAuthenticationToken(null, token, Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(authToken);

        boolean result = userService.isEmailVerified(uid);

        assertFalse(result);
        assertFalse(getFirebaseUserRecordCalled); // Remote call bypassed
    }

    @Test
    void testIsEmailVerifiedFromSecurityContext_GoogleProvider_Bypassed() throws Exception {
        String uid = "user123";
        FirebaseToken token = createFirebaseToken(uid, false, "google.com");

        FirebaseAuthenticationToken authToken = new FirebaseAuthenticationToken(null, token, Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(authToken);

        boolean result = userService.isEmailVerified(uid);

        assertTrue(result);
        assertFalse(getFirebaseUserRecordCalled); // Remote call bypassed
    }

    @Test
    void testIsEmailVerifiedFallbackToRemote_Success() throws Exception {
        String uid = "user123";
        
        // Setup SecurityContext with a different user to trigger remote fallback
        FirebaseToken token = createFirebaseToken("different_user", true, "password");
        FirebaseAuthenticationToken authToken = new FirebaseAuthenticationToken(null, token, Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(authToken);

        // Mock Remote UserRecord properties
        shouldReturnMockUser = true;
        when(userInfo.getProviderId()).thenReturn("password");
        when(userRecord.getProviderData()).thenReturn(new UserInfo[]{userInfo});
        when(userRecord.isEmailVerified()).thenReturn(true);

        boolean result = userService.isEmailVerified(uid);

        assertTrue(result);
        assertTrue(getFirebaseUserRecordCalled);
    }

    @Test
    void testIsEmailVerifiedFallbackToRemote_InsufficientPermission_GracefulBypass() throws Exception {
        String uid = "user123";

        // SecurityContext is clear (no authentication), forcing remote call
        shouldThrowPermissionError = true;

        boolean result = userService.isEmailVerified(uid);

        // Should return true and not crash
        assertTrue(result);
        assertTrue(getFirebaseUserRecordCalled);
    }
}
