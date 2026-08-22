package com.royalbookclub.api.checkout.service;

import com.google.cloud.firestore.Firestore;
import com.royalbookclub.api.config.model.CheckoutSettings;
import com.royalbookclub.api.config.service.CheckoutSettingsService;
import com.royalbookclub.api.user.service.UserService;
import com.royalbookclub.api.checkout.dto.ReturnRequestDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.google.cloud.firestore.Transaction;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.CollectionReference;
import com.google.cloud.firestore.Query;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.api.core.ApiFuture;
import com.google.api.core.ApiFutures;
import com.royalbookclub.api.book.model.BookCopy;
import com.royalbookclub.api.checkout.model.Checkout;
import java.util.Arrays;

import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class CheckoutServiceTest {

    @Mock
    private Firestore firestore;

    @Mock
    private CheckoutSettingsService checkoutSettingsService;

    @Mock
    private UserService userService;

    @Mock
    private com.royalbookclub.api.book.service.BookService bookService;

    private CheckoutService checkoutService;

    @BeforeEach
    void setUp() {
        checkoutService = new CheckoutService(firestore, checkoutSettingsService, userService, bookService);
    }

    @Test
    void testReturnBookGeofenceViolationThrowsException() {
        // Setup library settings at (12.9716, 77.5946) with 100 meters radius
        CheckoutSettings settings = CheckoutSettings.builder()
                .libraryLatitude(12.9716)
                .libraryLongitude(77.5946)
                .validRadiusMeters(100.0)
                .build();
        
        when(checkoutSettingsService.getCheckoutSettings()).thenReturn(settings);

        // User coordinates far away: (13.0827, 80.2707) (Chennai vs Bangalore)
        ReturnRequestDto request = new ReturnRequestDto();
        request.setBookId("978-3-16-148410-0");
        request.setMemberId("member123");
        request.setReturnLatitude(13.0827);
        request.setReturnLongitude(80.2707);

        Exception exception = assertThrows(IllegalArgumentException.class, () -> {
            checkoutService.returnBook(request);
        });

        assertTrue(exception.getMessage().contains("Self-return is only permitted within library premises"));
    }

    @Test
    void testVerifiedReturnGeofenceViolationThrowsException() {
        // Setup library settings at (12.9716, 77.5946) with 100 meters radius
        CheckoutSettings settings = CheckoutSettings.builder()
                .libraryLatitude(12.9716)
                .libraryLongitude(77.5946)
                .validRadiusMeters(100.0)
                .build();

        when(checkoutSettingsService.getCheckoutSettings()).thenReturn(settings);

        // User coordinates far away
        ReturnRequestDto request = new ReturnRequestDto();
        request.setBookId("978-3-16-148410-0");
        request.setMemberId("member123");
        request.setNtagUid("04:2a:3b:4c:5d:6e:7f");
        request.setReturnLatitude(13.0827);
        request.setReturnLongitude(80.2707);

        Exception exception = assertThrows(IllegalArgumentException.class, () -> {
            checkoutService.verifiedReturn(request);
        });

        assertTrue(exception.getMessage().contains("Self-return is only permitted within library premises"));
    }

    @Mock
    private Transaction transaction;

    @Mock
    private CollectionReference checkoutsCollection;

    @Mock
    private CollectionReference booksCollection;

    @Mock
    private DocumentReference checkoutRef;

    @Mock
    private DocumentReference bookRef;

    @Mock
    private DocumentSnapshot checkoutDoc;

    @Mock
    private QueryDocumentSnapshot bookDoc;

    @Mock
    private ApiFuture<DocumentSnapshot> futureDoc;

    @Test
    void testVerifiedReturnWithMatchingCopySucceeds() throws Exception {
        // Setup library settings to bypass geofencing
        CheckoutSettings settings = CheckoutSettings.builder()
                .enforceReturnGeofencing(false)
                .build();
        when(checkoutSettingsService.getCheckoutSettings()).thenReturn(settings);

        // Mock runTransaction to run our lambda synchronously
        when(firestore.runTransaction(any())).thenAnswer(invocation -> {
            Object func = invocation.getArgument(0);
            Class<?> clazz = Class.forName("com.google.cloud.firestore.Transaction$Function");
            java.lang.reflect.Method targetMethod = null;
            for (java.lang.reflect.Method m : clazz.getMethods()) {
                if (m.getParameterCount() == 1 && m.getParameterTypes()[0].getName().equals("com.google.cloud.firestore.Transaction")) {
                    targetMethod = m;
                    break;
                }
            }
            if (targetMethod == null) {
                throw new IllegalStateException("Could not find Firestore Transaction.Function update/apply method");
            }
            String result = (String) targetMethod.invoke(func, transaction);
            return ApiFutures.immediateFuture(result);
        });

        // Mock collections and document references
        when(firestore.collection("checkouts")).thenReturn(checkoutsCollection);
        when(checkoutsCollection.document("checkout123")).thenReturn(checkoutRef);
        when(transaction.get(checkoutRef)).thenReturn(futureDoc);
        when(futureDoc.get()).thenReturn(checkoutDoc);
        when(checkoutDoc.exists()).thenReturn(true);
        when(checkoutDoc.getId()).thenReturn("checkout123");
        when(checkoutDoc.getString("status")).thenReturn("CHECKED_OUT");
        when(checkoutDoc.getString("bookId")).thenReturn("9783161484100");
        when(checkoutDoc.getLong("copyNo")).thenReturn(1L);
        when(checkoutRef.getId()).thenReturn("checkout123");

        // Mock resolveBookDocument lookup inside CheckoutService
        when(firestore.collection("books")).thenReturn(booksCollection);
        Query queryMock = mock(Query.class);
        when(booksCollection.whereEqualTo(anyString(), anyString())).thenReturn(queryMock);
        when(queryMock.limit(anyInt())).thenReturn(queryMock);

        ApiFuture<QuerySnapshot> futureQuerySnap = mock(ApiFuture.class);
        QuerySnapshot querySnap = mock(QuerySnapshot.class);
        when(transaction.get(queryMock)).thenReturn(futureQuerySnap);
        when(futureQuerySnap.get()).thenReturn(querySnap);
        when(querySnap.isEmpty()).thenReturn(false);
        when(querySnap.getDocuments()).thenReturn(Arrays.asList(bookDoc));
        when(bookDoc.exists()).thenReturn(true);
        when(bookDoc.getReference()).thenReturn(bookRef);

        // Mock BookCopy array with 2 copies
        BookCopy copy1 = BookCopy.builder().copyNo(1).ntagUid("042A3B4C5D6E7F").status("CHECKED_OUT").build();
        BookCopy copy2 = BookCopy.builder().copyNo(2).ntagUid("04FFFFFFFFFFFF").status("AVAILABLE").build();
        when(bookService.getOrCreateBookCopies(bookDoc)).thenReturn(Arrays.asList(copy1, copy2));

        // Mock final read in getCheckoutById inside verifiedReturn
        ApiFuture<DocumentSnapshot> futureGet = mock(ApiFuture.class);
        when(checkoutRef.get()).thenReturn(futureGet);
        when(futureGet.get()).thenReturn(checkoutDoc);

        // Create return request for Copy #1
        ReturnRequestDto request = new ReturnRequestDto();
        request.setCheckoutId("checkout123");
        request.setBookId("978-3-16-148410-0");
        request.setMemberId("member123");
        request.setNtagUid("04:2a:3b:4c:5d:6e:7f"); // Matches copy 1
        request.setNfcOrBarcode("NFC");

        // Execute verifiedReturn
        Checkout returnedCheckout = checkoutService.verifiedReturn(request);

        // Verify successful execution and no exceptions
        assertNotNull(returnedCheckout);
        verify(transaction, atLeastOnce()).update(eq(checkoutRef), anyString(), any(), anyString(), any(), anyString(), any(), anyString(), any(), anyString(), any());
    }

    @Test
    void testVerifiedReturnWithCopyMismatchThrowsIllegalArgumentException() throws Exception {
        // Setup library settings to bypass geofencing
        CheckoutSettings settings = CheckoutSettings.builder()
                .enforceReturnGeofencing(false)
                .build();
        when(checkoutSettingsService.getCheckoutSettings()).thenReturn(settings);

        // Mock runTransaction to run our lambda synchronously
        when(firestore.runTransaction(any())).thenAnswer(invocation -> {
            Object func = invocation.getArgument(0);
            try {
                Class<?> clazz = Class.forName("com.google.cloud.firestore.Transaction$Function");
                java.lang.reflect.Method targetMethod = null;
                for (java.lang.reflect.Method m : clazz.getMethods()) {
                    if (m.getParameterCount() == 1 && m.getParameterTypes()[0].getName().equals("com.google.cloud.firestore.Transaction")) {
                        targetMethod = m;
                        break;
                    }
                }
                if (targetMethod == null) {
                    throw new IllegalStateException("Could not find Firestore Transaction.Function update/apply method");
                }
                String result = (String) targetMethod.invoke(func, transaction);
                return ApiFutures.immediateFuture(result);
            } catch (Exception e) {
                java.lang.Throwable cause = e instanceof java.lang.reflect.InvocationTargetException ? e.getCause() : e;
                return ApiFutures.immediateFailedFuture(cause);
            }
        });

        // Mock collections and document references
        when(firestore.collection("checkouts")).thenReturn(checkoutsCollection);
        when(checkoutsCollection.document("checkout123")).thenReturn(checkoutRef);
        when(transaction.get(checkoutRef)).thenReturn(futureDoc);
        when(futureDoc.get()).thenReturn(checkoutDoc);
        when(checkoutDoc.exists()).thenReturn(true);
        lenient().when(checkoutDoc.getId()).thenReturn("checkout123");
        when(checkoutDoc.getString("status")).thenReturn("CHECKED_OUT");
        when(checkoutDoc.getString("bookId")).thenReturn("9783161484100");
        when(checkoutDoc.getLong("copyNo")).thenReturn(1L); // Expected checkout was Copy #1

        // Mock resolveBookDocument lookup inside CheckoutService
        when(firestore.collection("books")).thenReturn(booksCollection);
        Query queryMock = mock(Query.class);
        when(booksCollection.whereEqualTo(anyString(), anyString())).thenReturn(queryMock);
        when(queryMock.limit(anyInt())).thenReturn(queryMock);

        ApiFuture<QuerySnapshot> futureQuerySnap = mock(ApiFuture.class);
        QuerySnapshot querySnap = mock(QuerySnapshot.class);
        when(transaction.get(queryMock)).thenReturn(futureQuerySnap);
        when(futureQuerySnap.get()).thenReturn(querySnap);
        when(querySnap.isEmpty()).thenReturn(false);
        when(querySnap.getDocuments()).thenReturn(Arrays.asList(bookDoc));
        lenient().when(bookDoc.exists()).thenReturn(true);
        lenient().when(bookDoc.getReference()).thenReturn(bookRef);

        // Mock BookCopy array with 2 copies
        BookCopy copy1 = BookCopy.builder().copyNo(1).ntagUid("042A3B4C5D6E7F").status("CHECKED_OUT").build();
        BookCopy copy2 = BookCopy.builder().copyNo(2).ntagUid("04FFFFFFFFFFFF").status("AVAILABLE").build(); // User scans Copy #2
        when(bookService.getOrCreateBookCopies(bookDoc)).thenReturn(Arrays.asList(copy1, copy2));

        // Create return request scanning Copy #2
        ReturnRequestDto request = new ReturnRequestDto();
        request.setCheckoutId("checkout123");
        request.setBookId("978-3-16-148410-0");
        request.setMemberId("member123");
        request.setNtagUid("04:FF:FF:FF:FF:FF:FF"); // Matches copy 2
        request.setNfcOrBarcode("NFC");

        // Verify exception is thrown on mismatch
        Exception exception = assertThrows(RuntimeException.class, () -> {
            checkoutService.verifiedReturn(request);
        });

        assertTrue(exception.getMessage().contains("This copy (Copy #2) is different from the one you checked out (Copy #1)"));
    }

    @Test
    void testVerifiedReturnWithBarcodeBypassesCopyMismatchCheck() throws Exception {
        // Setup library settings to bypass geofencing
        CheckoutSettings settings = CheckoutSettings.builder()
                .enforceReturnGeofencing(false)
                .build();
        when(checkoutSettingsService.getCheckoutSettings()).thenReturn(settings);

        // Mock runTransaction to run our lambda synchronously
        when(firestore.runTransaction(any())).thenAnswer(invocation -> {
            Object func = invocation.getArgument(0);
            Class<?> clazz = Class.forName("com.google.cloud.firestore.Transaction$Function");
            java.lang.reflect.Method targetMethod = null;
            for (java.lang.reflect.Method m : clazz.getMethods()) {
                if (m.getParameterCount() == 1 && m.getParameterTypes()[0].getName().equals("com.google.cloud.firestore.Transaction")) {
                    targetMethod = m;
                    break;
                }
            }
            if (targetMethod == null) {
                throw new IllegalStateException("Could not find Firestore Transaction.Function update/apply method");
            }
            String result = (String) targetMethod.invoke(func, transaction);
            return ApiFutures.immediateFuture(result);
        });

        // Mock collections and document references
        when(firestore.collection("checkouts")).thenReturn(checkoutsCollection);
        when(checkoutsCollection.document("checkout123")).thenReturn(checkoutRef);
        when(transaction.get(checkoutRef)).thenReturn(futureDoc);
        when(futureDoc.get()).thenReturn(checkoutDoc);
        when(checkoutDoc.exists()).thenReturn(true);
        when(checkoutDoc.getId()).thenReturn("checkout123");
        when(checkoutDoc.getString("status")).thenReturn("CHECKED_OUT");
        when(checkoutDoc.getString("bookId")).thenReturn("9783161484100");
        lenient().when(checkoutDoc.getLong("copyNo")).thenReturn(1L); // Expected copy is Copy #1
        when(checkoutRef.getId()).thenReturn("checkout123");

        // Mock resolveBookDocument lookup inside CheckoutService
        when(firestore.collection("books")).thenReturn(booksCollection);
        Query queryMock = mock(Query.class);
        when(booksCollection.whereEqualTo(anyString(), anyString())).thenReturn(queryMock);
        when(queryMock.limit(anyInt())).thenReturn(queryMock);

        ApiFuture<QuerySnapshot> futureQuerySnap = mock(ApiFuture.class);
        QuerySnapshot querySnap = mock(QuerySnapshot.class);
        when(transaction.get(queryMock)).thenReturn(futureQuerySnap);
        when(futureQuerySnap.get()).thenReturn(querySnap);
        when(querySnap.isEmpty()).thenReturn(false);
        when(querySnap.getDocuments()).thenReturn(Arrays.asList(bookDoc));
        when(bookDoc.exists()).thenReturn(true);
        when(bookDoc.getReference()).thenReturn(bookRef);

        // Mock BookCopy array with 2 copies
        BookCopy copy1 = BookCopy.builder().copyNo(1).ntagUid("042A3B4C5D6E7F").status("CHECKED_OUT").build();
        BookCopy copy2 = BookCopy.builder().copyNo(2).ntagUid("04FFFFFFFFFFFF").status("AVAILABLE").build(); // User scans barcode mapping to Copy #2
        when(bookService.getOrCreateBookCopies(bookDoc)).thenReturn(Arrays.asList(copy1, copy2));

        // Mock final read in getCheckoutById inside verifiedReturn
        ApiFuture<DocumentSnapshot> futureGet = mock(ApiFuture.class);
        when(checkoutRef.get()).thenReturn(futureGet);
        when(futureGet.get()).thenReturn(checkoutDoc);

        // Create return request with BARCODE flag (bypasses copy check)
        ReturnRequestDto request = new ReturnRequestDto();
        request.setCheckoutId("checkout123");
        request.setBookId("978-3-16-148410-0");
        request.setMemberId("member123");
        request.setNtagUid("04:FF:FF:FF:FF:FF:FF"); // User scanned barcode but mapped to copy 2
        request.setNfcOrBarcode("BARCODE");

        // Execute verifiedReturn
        Checkout returnedCheckout = checkoutService.verifiedReturn(request);

        // Verify successful execution even on mismatch because requestType is BARCODE
        assertNotNull(returnedCheckout);
        verify(transaction, atLeastOnce()).update(eq(checkoutRef), anyString(), any(), anyString(), any(), anyString(), any(), anyString(), any(), anyString(), any());
    }

    @Test
    @SuppressWarnings("unchecked")
    void testCancelCheckout_Success() throws Exception {
        DocumentReference checkoutRef = mock(DocumentReference.class);
        DocumentSnapshot checkoutDoc = mock(DocumentSnapshot.class);
        DocumentReference bookRef = mock(DocumentReference.class);
        QueryDocumentSnapshot bookDoc = mock(QueryDocumentSnapshot.class);
        CollectionReference checkoutsCollection = mock(CollectionReference.class);
        CollectionReference booksCollection = mock(CollectionReference.class);
        Transaction transaction = mock(Transaction.class);
        ApiFuture<DocumentSnapshot> futureDoc = mock(ApiFuture.class);

        when(firestore.runTransaction(any())).thenAnswer(invocation -> {
            Object func = invocation.getArgument(0);
            java.lang.reflect.Method[] methods = func.getClass().getDeclaredMethods();
            java.lang.reflect.Method targetMethod = null;
            for (java.lang.reflect.Method m : methods) {
                if ("updateCallback".equals(m.getName()) || (m.getParameterCount() == 1 && m.getParameterTypes()[0].equals(Transaction.class))) {
                    targetMethod = m;
                    break;
                }
            }
            if (targetMethod != null) {
                targetMethod.setAccessible(true);
                targetMethod.invoke(func, transaction);
            }
            return ApiFutures.immediateFuture(null);
        });

        when(firestore.collection("checkouts")).thenReturn(checkoutsCollection);
        when(checkoutsCollection.document("chk123")).thenReturn(checkoutRef);
        when(transaction.get(checkoutRef)).thenReturn(futureDoc);
        when(futureDoc.get()).thenReturn(checkoutDoc);
        when(checkoutDoc.exists()).thenReturn(true);
        when(checkoutDoc.getString("status")).thenReturn("CHECKED_OUT");
        when(checkoutDoc.getString("memberId")).thenReturn("member123");
        when(checkoutDoc.getString("bookId")).thenReturn("9783161484100");
        when(checkoutDoc.getLong("copyNo")).thenReturn(1L);

        when(firestore.collection("books")).thenReturn(booksCollection);
        Query queryMock = mock(Query.class);
        when(booksCollection.whereEqualTo(anyString(), anyString())).thenReturn(queryMock);
        when(queryMock.limit(anyInt())).thenReturn(queryMock);

        ApiFuture<QuerySnapshot> futureQuerySnap = mock(ApiFuture.class);
        QuerySnapshot querySnap = mock(QuerySnapshot.class);
        when(transaction.get(queryMock)).thenReturn(futureQuerySnap);
        when(futureQuerySnap.get()).thenReturn(querySnap);
        when(querySnap.isEmpty()).thenReturn(false);
        when(querySnap.getDocuments()).thenReturn(Arrays.asList(bookDoc));
        when(bookDoc.exists()).thenReturn(true);
        when(bookDoc.getReference()).thenReturn(bookRef);
        when(bookDoc.getLong("availableCopies")).thenReturn(2L);
        when(bookDoc.getLong("totalCopies")).thenReturn(3L);

        BookCopy copy1 = BookCopy.builder().copyNo(1).ntagUid("04A3B2C1D0E980").qrId(100000001L).status("CHECKED_OUT").currentCheckoutId("chk123").build();
        when(bookService.getOrCreateBookCopies(bookDoc)).thenReturn(Arrays.asList(copy1));
        when(bookService.copiesToListOfMaps(any())).thenReturn(Arrays.asList(copy1.toMap()));

        ApiFuture<DocumentSnapshot> futureGet = mock(ApiFuture.class);
        when(checkoutRef.get()).thenReturn(futureGet);
        when(futureGet.get()).thenReturn(checkoutDoc);
        when(checkoutDoc.getId()).thenReturn("chk123");

        Checkout cancelled = checkoutService.cancelCheckout("chk123", "member123");
        assertNotNull(cancelled);
        verify(transaction).update(eq(checkoutRef), eq("status"), eq("CANCELLED"), eq("cancelledAt"), any(), eq("cancelReason"), any());
        verify(transaction).update(eq(bookRef), eq("availableCopies"), eq(3L));
    }

    @Test
    @SuppressWarnings("unchecked")
    void testCancelReturn_Success() throws Exception {
        DocumentReference checkoutRef = mock(DocumentReference.class);
        DocumentSnapshot checkoutDoc = mock(DocumentSnapshot.class);
        DocumentReference bookRef = mock(DocumentReference.class);
        QueryDocumentSnapshot bookDoc = mock(QueryDocumentSnapshot.class);
        CollectionReference checkoutsCollection = mock(CollectionReference.class);
        CollectionReference booksCollection = mock(CollectionReference.class);
        Transaction transaction = mock(Transaction.class);
        ApiFuture<DocumentSnapshot> futureDoc = mock(ApiFuture.class);

        when(firestore.runTransaction(any())).thenAnswer(invocation -> {
            Object func = invocation.getArgument(0);
            java.lang.reflect.Method[] methods = func.getClass().getDeclaredMethods();
            java.lang.reflect.Method targetMethod = null;
            for (java.lang.reflect.Method m : methods) {
                if ("updateCallback".equals(m.getName()) || (m.getParameterCount() == 1 && m.getParameterTypes()[0].equals(Transaction.class))) {
                    targetMethod = m;
                    break;
                }
            }
            if (targetMethod != null) {
                targetMethod.setAccessible(true);
                targetMethod.invoke(func, transaction);
            }
            return ApiFutures.immediateFuture(null);
        });

        when(firestore.collection("checkouts")).thenReturn(checkoutsCollection);
        when(checkoutsCollection.document("chk123")).thenReturn(checkoutRef);
        when(transaction.get(checkoutRef)).thenReturn(futureDoc);
        when(futureDoc.get()).thenReturn(checkoutDoc);
        when(checkoutDoc.exists()).thenReturn(true);
        when(checkoutDoc.getString("status")).thenReturn("RETURNED");
        when(checkoutDoc.getString("memberId")).thenReturn("member123");
        when(checkoutDoc.getString("bookId")).thenReturn("9783161484100");
        when(checkoutDoc.getLong("copyNo")).thenReturn(1L);

        when(firestore.collection("books")).thenReturn(booksCollection);
        Query queryMock = mock(Query.class);
        when(booksCollection.whereEqualTo(anyString(), anyString())).thenReturn(queryMock);
        when(queryMock.limit(anyInt())).thenReturn(queryMock);

        ApiFuture<QuerySnapshot> futureQuerySnap = mock(ApiFuture.class);
        QuerySnapshot querySnap = mock(QuerySnapshot.class);
        when(transaction.get(queryMock)).thenReturn(futureQuerySnap);
        when(futureQuerySnap.get()).thenReturn(querySnap);
        when(querySnap.isEmpty()).thenReturn(false);
        when(querySnap.getDocuments()).thenReturn(Arrays.asList(bookDoc));
        when(bookDoc.exists()).thenReturn(true);
        when(bookDoc.getReference()).thenReturn(bookRef);
        when(bookDoc.getLong("availableCopies")).thenReturn(3L);

        BookCopy copy1 = BookCopy.builder().copyNo(1).ntagUid("04A3B2C1D0E980").qrId(100000001L).status("AVAILABLE").build();
        when(bookService.getOrCreateBookCopies(bookDoc)).thenReturn(Arrays.asList(copy1));
        when(bookService.copiesToListOfMaps(any())).thenReturn(Arrays.asList(copy1.toMap()));

        ApiFuture<DocumentSnapshot> futureGet = mock(ApiFuture.class);
        when(checkoutRef.get()).thenReturn(futureGet);
        when(futureGet.get()).thenReturn(checkoutDoc);
        when(checkoutDoc.getId()).thenReturn("chk123");

        Checkout restored = checkoutService.cancelReturn("chk123", "member123");
        assertNotNull(restored);
        verify(transaction).update(eq(checkoutRef), eq("status"), eq("CHECKED_OUT"), eq("returnedAt"), isNull(), eq("approvedAt"), any(), eq("approvedBy"), any());
        verify(transaction).update(eq(bookRef), eq("availableCopies"), eq(2L));
    }
}
