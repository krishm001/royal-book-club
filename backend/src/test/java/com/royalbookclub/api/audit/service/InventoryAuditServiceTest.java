package com.royalbookclub.api.audit.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.CollectionReference;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.firestore.WriteResult;
import com.royalbookclub.api.audit.model.InventoryAudit;
import com.royalbookclub.api.book.model.Book;
import com.royalbookclub.api.book.service.BookService;
import com.royalbookclub.api.common.exception.BusinessRuleException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class InventoryAuditServiceTest {

    @Mock
    private Firestore firestore;

    @Mock
    private BookService bookService;

    @Mock
    private CollectionReference collectionReference;

    @Mock
    private DocumentReference documentReference;

    @Mock
    private ApiFuture<WriteResult> writeFuture;

    @Mock
    private ApiFuture<DocumentSnapshot> documentFuture;

    @Mock
    private DocumentSnapshot documentSnapshot;

    @Mock
    private ApiFuture<QuerySnapshot> queryFuture;

    @Mock
    private QuerySnapshot querySnapshot;

    private InventoryAuditService auditService;

    @BeforeEach
    void setUp() {
        auditService = new InventoryAuditService(firestore, bookService);
    }

    @Test
    void testStartAudit() throws Exception {
        String curatorId = "curator123";
        Book book1 = Book.builder().isbn("111111").title("Book One").totalCopies(2).build();
        Book book2 = Book.builder().isbn("222222").title("Book Two").totalCopies(1).build();

        when(bookService.getAllBooks()).thenReturn(Arrays.asList(book1, book2));
        
        // Mock active audit query returning empty
        when(firestore.collection("inventory_audits")).thenReturn(collectionReference);
        when(collectionReference.whereEqualTo("curatorId", curatorId)).thenReturn(collectionReference);
        when(collectionReference.whereEqualTo("status", "ACTIVE")).thenReturn(collectionReference);
        when(collectionReference.limit(1)).thenReturn(collectionReference);
        when(collectionReference.get()).thenReturn(queryFuture);
        when(queryFuture.get()).thenReturn(querySnapshot);
        when(querySnapshot.getDocuments()).thenReturn(new ArrayList<>());

        when(collectionReference.document(anyString())).thenReturn(documentReference);
        when(documentReference.set(any())).thenReturn(writeFuture);
        when(writeFuture.get()).thenReturn(null);

        InventoryAudit audit = auditService.startAudit(curatorId);

        assertNotNull(audit);
        assertEquals("ACTIVE", audit.getStatus());
        assertEquals(curatorId, audit.getCuratorId());
        assertTrue(audit.getAuditedIsbns().isEmpty());
        assertEquals(2, audit.getMissingIsbns().size());
        assertTrue(audit.getMissingIsbns().contains("111111"));
        assertTrue(audit.getMissingIsbns().contains("222222"));
    }

    @Test
    void testScanItemByIsbn() throws Exception {
        String auditId = "audit123";
        String isbn = "111111";

        InventoryAudit existingAudit = InventoryAudit.builder()
                .id(auditId)
                .status("ACTIVE")
                .curatorId("curator123")
                .auditedIsbns(new ArrayList<>())
                .missingIsbns(new ArrayList<>(Arrays.asList(isbn)))
                .build();

        // Stub getAuditById
        when(firestore.collection("inventory_audits")).thenReturn(collectionReference);
        when(collectionReference.document(auditId)).thenReturn(documentReference);
        when(documentReference.get()).thenReturn(documentFuture);
        when(documentFuture.get()).thenReturn(documentSnapshot);
        when(documentSnapshot.exists()).thenReturn(true);
        when(documentSnapshot.getString("id")).thenReturn(auditId);
        when(documentSnapshot.getString("status")).thenReturn("ACTIVE");
        when(documentSnapshot.getString("curatorId")).thenReturn("curator123");
        when(documentSnapshot.get("auditedIsbns")).thenReturn(new ArrayList<>());
        when(documentSnapshot.get("missingIsbns")).thenReturn(new ArrayList<>(Arrays.asList(isbn)));

        // Stub Book lookup
        Book book = Book.builder().isbn(isbn).title("Book One").totalCopies(1).build();
        when(bookService.getBookByIsbn(isbn)).thenReturn(Optional.of(book));

        when(documentReference.set(any())).thenReturn(writeFuture);
        when(writeFuture.get()).thenReturn(null);

        InventoryAudit updated = auditService.scanItem(auditId, isbn);

        assertNotNull(updated);
        assertTrue(updated.getAuditedIsbns().contains(isbn));
        assertFalse(updated.getMissingIsbns().contains(isbn));
    }

    @Test
    void testCompleteAuditReconcilesStock() throws Exception {
        String auditId = "audit123";
        String isbn1 = "111111";
        String isbn2 = "222222";

        // Audit has isbn1 scanned once, but expected is 2. Isbn2 not scanned, expected is 1.
        InventoryAudit existingAudit = InventoryAudit.builder()
                .id(auditId)
                .status("ACTIVE")
                .curatorId("curator123")
                .auditedIsbns(new ArrayList<>(Arrays.asList(isbn1)))
                .missingIsbns(new ArrayList<>(Arrays.asList(isbn2)))
                .build();

        when(firestore.collection("inventory_audits")).thenReturn(collectionReference);
        when(collectionReference.document(auditId)).thenReturn(documentReference);
        when(documentReference.get()).thenReturn(documentFuture);
        when(documentFuture.get()).thenReturn(documentSnapshot);
        when(documentSnapshot.exists()).thenReturn(true);
        when(documentSnapshot.getString("id")).thenReturn(auditId);
        when(documentSnapshot.getString("status")).thenReturn("ACTIVE");
        when(documentSnapshot.getString("curatorId")).thenReturn("curator123");
        when(documentSnapshot.get("auditedIsbns")).thenReturn(new ArrayList<>(Arrays.asList(isbn1)));
        when(documentSnapshot.get("missingIsbns")).thenReturn(new ArrayList<>(Arrays.asList(isbn2)));

        Book book1 = Book.builder().isbn(isbn1).title("Book One").totalCopies(2).availableCopies(2).build();
        Book book2 = Book.builder().isbn(isbn2).title("Book Two").totalCopies(1).availableCopies(1).build();

        when(bookService.getAllBooks()).thenReturn(Arrays.asList(book1, book2));
        when(documentReference.set(any())).thenReturn(writeFuture);
        when(writeFuture.get()).thenReturn(null);

        InventoryAudit completed = auditService.completeAudit(auditId);

        assertNotNull(completed);
        assertEquals("COMPLETED", completed.getStatus());
        assertNotNull(completed.getCompletedAt());

        // Reconciled counts should update:
        // book1 expected 2, scanned 1 -> total becomes 1, available becomes 1
        verify(bookService).updateBookCopies(isbn1, 1, 1);
        // book2 expected 1, scanned 0 -> total becomes 0, available becomes 0
        verify(bookService).updateBookCopies(isbn2, 0, 0);
    }

    @Test
    void testScanItemByNtagUid() throws Exception {
        String auditId = "audit123";
        String ntagUid = "042a3b4c5d6e7f";
        String isbn = "111111";

        when(firestore.collection("inventory_audits")).thenReturn(collectionReference);
        when(collectionReference.document(auditId)).thenReturn(documentReference);
        when(documentReference.get()).thenReturn(documentFuture);
        when(documentFuture.get()).thenReturn(documentSnapshot);
        when(documentSnapshot.exists()).thenReturn(true);
        when(documentSnapshot.getString("id")).thenReturn(auditId);
        when(documentSnapshot.getString("status")).thenReturn("ACTIVE");
        when(documentSnapshot.getString("curatorId")).thenReturn("curator123");
        when(documentSnapshot.get("auditedIsbns")).thenReturn(new ArrayList<>());
        when(documentSnapshot.get("missingIsbns")).thenReturn(new ArrayList<>(Arrays.asList(isbn)));

        // Stub Book lookup
        when(bookService.getBookByIsbn(ntagUid)).thenReturn(Optional.empty());
        Book book = Book.builder().isbn(isbn).title("Book One").totalCopies(1).build();
        when(bookService.getBookByNtagUid(ntagUid)).thenReturn(book);

        when(documentReference.set(any())).thenReturn(writeFuture);
        when(writeFuture.get()).thenReturn(null);

        InventoryAudit updated = auditService.scanItem(auditId, ntagUid);

        assertNotNull(updated);
        assertTrue(updated.getAuditedIsbns().contains(isbn));
    }

    @Test
    void testScanItemNotFound() throws Exception {
        String auditId = "audit123";
        String invalidId = "unknown";

        when(firestore.collection("inventory_audits")).thenReturn(collectionReference);
        when(collectionReference.document(auditId)).thenReturn(documentReference);
        when(documentReference.get()).thenReturn(documentFuture);
        when(documentFuture.get()).thenReturn(documentSnapshot);
        when(documentSnapshot.exists()).thenReturn(true);
        when(documentSnapshot.getString("id")).thenReturn(auditId);
        when(documentSnapshot.getString("status")).thenReturn("ACTIVE");
        when(documentSnapshot.get("auditedIsbns")).thenReturn(new ArrayList<>());
        when(documentSnapshot.get("missingIsbns")).thenReturn(new ArrayList<>());

        when(bookService.getBookByIsbn(invalidId)).thenReturn(Optional.empty());
        when(bookService.getBookByNtagUid(invalidId)).thenReturn(null);

        assertThrows(BusinessRuleException.class, () -> auditService.scanItem(auditId, invalidId));
    }

    @Test
    void testScanItemSessionNotActive() throws Exception {
        String auditId = "audit123";

        when(firestore.collection("inventory_audits")).thenReturn(collectionReference);
        when(collectionReference.document(auditId)).thenReturn(documentReference);
        when(documentReference.get()).thenReturn(documentFuture);
        when(documentFuture.get()).thenReturn(documentSnapshot);
        when(documentSnapshot.exists()).thenReturn(true);
        when(documentSnapshot.getString("id")).thenReturn(auditId);
        when(documentSnapshot.getString("status")).thenReturn("COMPLETED");

        assertThrows(BusinessRuleException.class, () -> auditService.scanItem(auditId, "isbn"));
    }

    @Test
    void testCompleteAlreadyCompleted() throws Exception {
        String auditId = "audit123";

        when(firestore.collection("inventory_audits")).thenReturn(collectionReference);
        when(collectionReference.document(auditId)).thenReturn(documentReference);
        when(documentReference.get()).thenReturn(documentFuture);
        when(documentFuture.get()).thenReturn(documentSnapshot);
        when(documentSnapshot.exists()).thenReturn(true);
        when(documentSnapshot.getString("id")).thenReturn(auditId);
        when(documentSnapshot.getString("status")).thenReturn("COMPLETED");

        InventoryAudit completed = auditService.completeAudit(auditId);
        assertNotNull(completed);
        assertEquals("COMPLETED", completed.getStatus());
    }

    @Test
    void testGetAuditByIdNotFound() throws Exception {
        String auditId = "nonexistent";

        when(firestore.collection("inventory_audits")).thenReturn(collectionReference);
        when(collectionReference.document(auditId)).thenReturn(documentReference);
        when(documentReference.get()).thenReturn(documentFuture);
        when(documentFuture.get()).thenReturn(documentSnapshot);
        when(documentSnapshot.exists()).thenReturn(false);

        Optional<InventoryAudit> auditOpt = auditService.getAuditById(auditId);
        assertFalse(auditOpt.isPresent());
    }

    @Test
    void testGetActiveAuditException() throws Exception {
        when(firestore.collection("inventory_audits")).thenThrow(new RuntimeException("Firestore error"));
        Optional<InventoryAudit> activeOpt = auditService.getActiveAudit("curator123");
        assertFalse(activeOpt.isPresent());
    }

    @Test
    void testCompleteAuditUpdateBookCopiesThrowsException() throws Exception {
        String auditId = "audit123";
        String isbn1 = "111111";

        when(firestore.collection("inventory_audits")).thenReturn(collectionReference);
        when(collectionReference.document(auditId)).thenReturn(documentReference);
        when(documentReference.get()).thenReturn(documentFuture);
        when(documentFuture.get()).thenReturn(documentSnapshot);
        when(documentSnapshot.exists()).thenReturn(true);
        when(documentSnapshot.getString("id")).thenReturn(auditId);
        when(documentSnapshot.getString("status")).thenReturn("ACTIVE");
        when(documentSnapshot.get("auditedIsbns")).thenReturn(new ArrayList<>(Arrays.asList(isbn1)));
        when(documentSnapshot.get("missingIsbns")).thenReturn(new ArrayList<>());

        Book book1 = Book.builder().isbn(isbn1).title("Book One").totalCopies(2).availableCopies(2).build();

        when(bookService.getAllBooks()).thenReturn(Arrays.asList(book1));
        doThrow(new RuntimeException("Update failed")).when(bookService).updateBookCopies(anyString(), anyInt(), anyInt());

        when(documentReference.set(any())).thenReturn(writeFuture);
        when(writeFuture.get()).thenReturn(null);

        InventoryAudit completed = auditService.completeAudit(auditId);
        assertNotNull(completed);
        assertEquals("COMPLETED", completed.getStatus());
    }

    @Test
    void testStartAuditCompletesPreExistingActiveAudit() throws Exception {
        String curatorId = "curator123";
        String activeAuditId = "activeAudit123";

        // Mock active audit query returning an existing active session
        when(firestore.collection("inventory_audits")).thenReturn(collectionReference);
        when(collectionReference.whereEqualTo("curatorId", curatorId)).thenReturn(collectionReference);
        when(collectionReference.whereEqualTo("status", "ACTIVE")).thenReturn(collectionReference);
        when(collectionReference.limit(1)).thenReturn(collectionReference);
        when(collectionReference.get()).thenReturn(queryFuture);
        when(queryFuture.get()).thenReturn(querySnapshot);

        com.google.cloud.firestore.QueryDocumentSnapshot activeDoc = mock(com.google.cloud.firestore.QueryDocumentSnapshot.class);
        when(querySnapshot.getDocuments()).thenReturn(Arrays.asList(activeDoc));

        when(activeDoc.exists()).thenReturn(true);
        when(activeDoc.getString("id")).thenReturn(activeAuditId);
        when(activeDoc.getString("status")).thenReturn("ACTIVE");
        when(activeDoc.getString("curatorId")).thenReturn(curatorId);
        when(activeDoc.get("auditedIsbns")).thenReturn(new ArrayList<>());
        when(activeDoc.get("missingIsbns")).thenReturn(new ArrayList<>());

        // Mock completeAudit behavior for the pre-existing active session
        when(collectionReference.document(activeAuditId)).thenReturn(documentReference);
        when(documentReference.get()).thenReturn(documentFuture);
        when(documentFuture.get()).thenReturn(documentSnapshot);
        when(documentSnapshot.exists()).thenReturn(true);
        when(documentSnapshot.getString("id")).thenReturn(activeAuditId);
        when(documentSnapshot.getString("status")).thenReturn("ACTIVE");
        when(documentSnapshot.getString("curatorId")).thenReturn(curatorId);
        when(documentSnapshot.get("auditedIsbns")).thenReturn(new ArrayList<>());
        when(documentSnapshot.get("missingIsbns")).thenReturn(new ArrayList<>());

        Book book1 = Book.builder().isbn("111111").title("Book One").totalCopies(1).availableCopies(1).build();
        when(bookService.getAllBooks()).thenReturn(Arrays.asList(book1));

        when(collectionReference.document(anyString())).thenReturn(documentReference);
        when(documentReference.set(any())).thenReturn(writeFuture);
        when(writeFuture.get()).thenReturn(null);

        InventoryAudit audit = auditService.startAudit(curatorId);
        assertNotNull(audit);
        assertEquals("ACTIVE", audit.getStatus());
    }
}
