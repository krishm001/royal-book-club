package com.royalbookclub.api.book.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.CollectionReference;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.firestore.WriteResult;
import com.royalbookclub.api.book.dto.BookDto;
import com.royalbookclub.api.book.model.Book;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class BookServiceTest {

    @Mock
    private Firestore firestore;

    @Mock
    private CollectionReference booksCollection;

    @Mock
    private CollectionReference countersCollection;

    @Mock
    private DocumentReference bookDocRef;

    @Mock
    private DocumentReference counterDocRef;

    @Mock
    private QueryDocumentSnapshot bookDocSnapshot;

    @Mock
    private DocumentSnapshot counterDocSnapshot;

    @Mock
    private QuerySnapshot querySnapshot;

    @Mock
    private QueryDocumentSnapshot queryDocSnapshot;

    @Mock
    private ApiFuture<QuerySnapshot> queryFuture;

    @Mock
    private ApiFuture<DocumentSnapshot> docFuture;

    @Mock
    private ApiFuture<DocumentSnapshot> counterDocFuture;

    @Mock
    private ApiFuture<WriteResult> writeFuture;

    private BookService bookService;

    @BeforeEach
    void setUp() {
        bookService = new BookService(firestore);
    }

    @Test
    void testGetAllBooks() throws Exception {
        when(firestore.collection("books")).thenReturn(booksCollection);
        when(booksCollection.get()).thenReturn(queryFuture);
        when(queryFuture.get()).thenReturn(querySnapshot);
        when(querySnapshot.getDocuments()).thenReturn(Collections.singletonList(bookDocSnapshot));

        when(bookDocSnapshot.exists()).thenReturn(true);
        when(bookDocSnapshot.getString("isbn")).thenReturn("9783161484100");
        when(bookDocSnapshot.getString("title")).thenReturn("A Royal Tale");
        when(bookDocSnapshot.getLong("totalCopies")).thenReturn(3L);
        when(bookDocSnapshot.getLong("availableCopies")).thenReturn(3L);

        List<Book> books = bookService.getAllBooks();
        assertEquals(1, books.size());
        assertEquals("9783161484100", books.get(0).getIsbn());
        assertEquals("A Royal Tale", books.get(0).getTitle());
    }

    @Test
    void testGetBookByIsbn_Found() throws Exception {
        String isbn = "9783161484100";
        when(firestore.collection("books")).thenReturn(booksCollection);
        when(booksCollection.document(isbn)).thenReturn(bookDocRef);
        when(bookDocRef.get()).thenReturn(docFuture);
        when(docFuture.get()).thenReturn(bookDocSnapshot);
        when(bookDocSnapshot.exists()).thenReturn(true);

        when(bookDocSnapshot.getString("isbn")).thenReturn(isbn);
        when(bookDocSnapshot.getString("title")).thenReturn("A Royal Tale");
        when(bookDocSnapshot.getLong("totalCopies")).thenReturn(3L);
        when(bookDocSnapshot.getLong("availableCopies")).thenReturn(3L);
        when(bookDocSnapshot.getString("ntagUid")).thenReturn("042a3b4c5d6e7f");

        // mock NFC counters lookup inside populateNfcResetTimestamp
        when(firestore.collection("nfc_counters")).thenReturn(countersCollection);
        when(countersCollection.document("042a3b4c5d6e7f")).thenReturn(counterDocRef);
        when(counterDocRef.get()).thenReturn(counterDocFuture);
        when(counterDocFuture.get()).thenReturn(counterDocSnapshot);
        when(counterDocSnapshot.exists()).thenReturn(true);
        java.util.Date lastReset = new java.util.Date();
        when(counterDocSnapshot.getDate("lastResetAt")).thenReturn(lastReset);

        Optional<Book> bookOpt = bookService.getBookByIsbn(isbn);
        assertTrue(bookOpt.isPresent());
        assertEquals("A Royal Tale", bookOpt.get().getTitle());
        assertEquals(lastReset.toInstant(), bookOpt.get().getNfcCounterResetAt());
    }

    @Test
    void testGetBookByIsbn_NotFound() throws Exception {
        String isbn = "9783161484100";
        when(firestore.collection("books")).thenReturn(booksCollection);
        when(booksCollection.document(isbn)).thenReturn(bookDocRef);
        when(bookDocRef.get()).thenReturn(docFuture);
        when(docFuture.get()).thenReturn(bookDocSnapshot);
        when(bookDocSnapshot.exists()).thenReturn(false);

        Optional<Book> bookOpt = bookService.getBookByIsbn(isbn);
        assertFalse(bookOpt.isPresent());
    }

    @Test
    void testCreateOrUpdateBook_Insert() throws Exception {
        BookDto dto = BookDto.builder()
                .isbn("9783161484100")
                .title("A Royal Tale")
                .totalCopies(3)
                .ntagUid("042a3b4c5d6e7f")
                .build();

        when(firestore.collection("books")).thenReturn(booksCollection);
        when(booksCollection.document("9783161484100")).thenReturn(bookDocRef);
        when(bookDocRef.get()).thenReturn(docFuture);
        when(docFuture.get()).thenReturn(bookDocSnapshot);
        when(bookDocSnapshot.exists()).thenReturn(false);

        when(bookDocRef.set(any())).thenReturn(writeFuture);
        when(writeFuture.get()).thenReturn(null);

        Book book = bookService.createOrUpdateBook(dto);
        assertNotNull(book);
        assertEquals("9783161484100", book.getIsbn());
        assertEquals(3, book.getTotalCopies());
        assertEquals(3, book.getAvailableCopies());
    }

    @Test
    void testCreateOrUpdateBook_Update() throws Exception {
        BookDto dto = BookDto.builder()
                .isbn("9783161484100")
                .title("A Royal Tale")
                .totalCopies(5)
                .ntagUid("042a3b4c5d6e7f")
                .build();

        when(firestore.collection("books")).thenReturn(booksCollection);
        when(booksCollection.document("9783161484100")).thenReturn(bookDocRef);
        when(bookDocRef.get()).thenReturn(docFuture);
        when(docFuture.get()).thenReturn(bookDocSnapshot);
        when(bookDocSnapshot.exists()).thenReturn(true);

        when(bookDocSnapshot.getString("isbn")).thenReturn("9783161484100");
        when(bookDocSnapshot.getString("title")).thenReturn("A Royal Tale");
        when(bookDocSnapshot.getLong("totalCopies")).thenReturn(3L);
        when(bookDocSnapshot.getLong("availableCopies")).thenReturn(2L);

        when(bookDocRef.set(any())).thenReturn(writeFuture);
        when(writeFuture.get()).thenReturn(null);

        Book book = bookService.createOrUpdateBook(dto);
        assertNotNull(book);
        assertEquals("9783161484100", book.getIsbn());
        assertEquals(5, book.getTotalCopies());
        assertEquals(4, book.getAvailableCopies()); // 2 existing available + (5 - 3) totalCopies diff = 4
    }

    @Test
    void testDeleteBook() throws Exception {
        String isbn = "9783161484100";
        when(firestore.collection("books")).thenReturn(booksCollection);
        when(booksCollection.document(isbn)).thenReturn(bookDocRef);
        when(bookDocRef.delete()).thenReturn(writeFuture);
        when(writeFuture.get()).thenReturn(null);

        assertDoesNotThrow(() -> bookService.deleteBook(isbn));
    }

    @Test
    void testUpdateBookCopies() throws Exception {
        String isbn = "9783161484100";
        com.google.cloud.firestore.Transaction transaction = mock(com.google.cloud.firestore.Transaction.class);
        DocumentSnapshot doc = mock(DocumentSnapshot.class);

        when(firestore.collection("books")).thenReturn(booksCollection);
        when(booksCollection.document(isbn)).thenReturn(bookDocRef);

        // Mock Firestore transaction
        when(firestore.runTransaction(any())).thenAnswer(invocation -> {
            com.google.cloud.firestore.Transaction.Function<?> function = invocation.getArgument(0);
            Object result = function.updateCallback(transaction);
            return com.google.api.core.ApiFutures.immediateFuture(result);
        });

        // Mock transaction.get() returning a future containing our document snapshot
        com.google.api.core.ApiFuture<DocumentSnapshot> futureDoc = com.google.api.core.ApiFutures.immediateFuture(doc);
        when(transaction.get(bookDocRef)).thenReturn(futureDoc);

        when(doc.exists()).thenReturn(true);
        when(doc.getString("isbn")).thenReturn(isbn);
        when(doc.getString("title")).thenReturn("A Royal Tale");
        when(doc.getLong("totalCopies")).thenReturn(5L);
        when(doc.getLong("availableCopies")).thenReturn(4L);

        assertDoesNotThrow(() -> bookService.updateBookCopies(isbn, 10, 8));
    }

    @Test
    void testGetBookByNtagUid_PrimaryQuery() throws Exception {
        String ntagUid = "04:2a:3b:4c:5d:6e:7f";
        when(firestore.collection("books")).thenReturn(booksCollection);
        when(booksCollection.whereIn(eq("ntagUid"), anyList())).thenReturn(booksCollection);
        when(booksCollection.limit(1)).thenReturn(booksCollection);
        when(booksCollection.get()).thenReturn(queryFuture);
        when(queryFuture.get()).thenReturn(querySnapshot);
        when(querySnapshot.getDocuments()).thenReturn(Collections.singletonList(queryDocSnapshot));

        when(queryDocSnapshot.exists()).thenReturn(true);
        when(queryDocSnapshot.getString("isbn")).thenReturn("9783161484100");
        when(queryDocSnapshot.getString("title")).thenReturn("A Royal Tale");
        when(queryDocSnapshot.getString("ntagUid")).thenReturn("042a3b4c5d6e7f");

        // mock NFC counters lookup
        when(firestore.collection("nfc_counters")).thenReturn(countersCollection);
        when(countersCollection.document("042a3b4c5d6e7f")).thenReturn(counterDocRef);
        when(counterDocRef.get()).thenReturn(counterDocFuture);
        when(counterDocFuture.get()).thenReturn(counterDocSnapshot);
        when(counterDocSnapshot.exists()).thenReturn(false);

        Book book = bookService.getBookByNtagUid(ntagUid);
        assertNotNull(book);
        assertEquals("9783161484100", book.getIsbn());
    }

    @Test
    void testGetBookByNtagUid_FallbackQuery() throws Exception {
        String ntagUid = "04:2a:3b:4c:5d:6e:7f";
        when(firestore.collection("books")).thenReturn(booksCollection);
        when(booksCollection.whereIn(eq("ntagUid"), anyList())).thenReturn(booksCollection);
        when(booksCollection.limit(1)).thenReturn(booksCollection);
        when(booksCollection.get()).thenReturn(queryFuture);
        when(queryFuture.get()).thenReturn(querySnapshot);
        when(querySnapshot.getDocuments()).thenReturn(new ArrayList<>()); // Empty primary query

        // Set up array query mock
        when(booksCollection.whereArrayContainsAny(eq("ntagUids"), anyList())).thenReturn(booksCollection);
        when(booksCollection.get()).thenReturn(queryFuture);
        when(querySnapshot.getDocuments()).thenReturn(Collections.singletonList(queryDocSnapshot));

        when(queryDocSnapshot.exists()).thenReturn(true);
        when(queryDocSnapshot.getString("isbn")).thenReturn("9783161484100");
        when(queryDocSnapshot.getString("title")).thenReturn("A Royal Tale");
        when(queryDocSnapshot.getString("ntagUid")).thenReturn("042a3b4c5d6e7f");

        // mock NFC counters lookup
        when(firestore.collection("nfc_counters")).thenReturn(countersCollection);
        when(countersCollection.document("042a3b4c5d6e7f")).thenReturn(counterDocRef);
        when(counterDocRef.get()).thenReturn(counterDocFuture);
        when(counterDocFuture.get()).thenReturn(counterDocSnapshot);
        when(counterDocSnapshot.exists()).thenReturn(false);

        Book book = bookService.getBookByNtagUid(ntagUid);
        assertNotNull(book);
        assertEquals("9783161484100", book.getIsbn());
    }

    @Test
    void testGetBookByNtagUid_WithCounter_FirstSeen() throws Exception {
        String ntagUid = "042a3b4c5d6e7f";
        String counter = "0x000005";

        // Mock find book
        when(firestore.collection("books")).thenReturn(booksCollection);
        when(booksCollection.whereIn(eq("ntagUid"), anyList())).thenReturn(booksCollection);
        when(booksCollection.limit(1)).thenReturn(booksCollection);
        when(booksCollection.get()).thenReturn(queryFuture);
        when(queryFuture.get()).thenReturn(querySnapshot);
        when(querySnapshot.getDocuments()).thenReturn(Collections.singletonList(queryDocSnapshot));
        when(queryDocSnapshot.exists()).thenReturn(true);
        when(queryDocSnapshot.getString("isbn")).thenReturn("9783161484100");
        when(queryDocSnapshot.getString("title")).thenReturn("A Royal Tale");
        when(queryDocSnapshot.getString("ntagUid")).thenReturn(ntagUid);

        // Mock nfc_counters lookup
        when(firestore.collection("nfc_counters")).thenReturn(countersCollection);
        when(countersCollection.document(ntagUid)).thenReturn(counterDocRef);
        when(counterDocRef.get()).thenReturn(counterDocFuture);
        when(counterDocFuture.get()).thenReturn(counterDocSnapshot);
        
        // Let first populate timestamp return false, then the service checks counterDoc.exists()
        when(counterDocSnapshot.exists()).thenReturn(false); 
        when(counterDocRef.set(any())).thenReturn(writeFuture);
        when(writeFuture.get()).thenReturn(null);

        Book book = bookService.getBookByNtagUid(ntagUid, counter);
        assertNotNull(book);
        assertEquals("VALID", book.getNfcVerificationStatus());
    }

    @Test
    void testGetBookByNtagUid_WithCounter_NewerCounter() throws Exception {
        String ntagUid = "042a3b4c5d6e7f";
        String counter = "0x0A"; // 10 decimal

        // Mock find book
        when(firestore.collection("books")).thenReturn(booksCollection);
        when(booksCollection.whereIn(eq("ntagUid"), anyList())).thenReturn(booksCollection);
        when(booksCollection.limit(1)).thenReturn(booksCollection);
        when(booksCollection.get()).thenReturn(queryFuture);
        when(queryFuture.get()).thenReturn(querySnapshot);
        when(querySnapshot.getDocuments()).thenReturn(Collections.singletonList(queryDocSnapshot));
        when(queryDocSnapshot.exists()).thenReturn(true);
        when(queryDocSnapshot.getString("isbn")).thenReturn("9783161484100");
        when(queryDocSnapshot.getString("title")).thenReturn("A Royal Tale");
        when(queryDocSnapshot.getString("ntagUid")).thenReturn(ntagUid);

        // Mock nfc_counters lookup
        when(firestore.collection("nfc_counters")).thenReturn(countersCollection);
        when(countersCollection.document(ntagUid)).thenReturn(counterDocRef);
        when(counterDocRef.get()).thenReturn(counterDocFuture);
        when(counterDocFuture.get()).thenReturn(counterDocSnapshot);
        
        when(counterDocSnapshot.exists()).thenReturn(true);
        when(counterDocSnapshot.getLong("counter")).thenReturn(5L); // Stored counter is 5
        when(counterDocRef.update(anyMap())).thenReturn(writeFuture);
        when(writeFuture.get()).thenReturn(null);

        Book book = bookService.getBookByNtagUid(ntagUid, counter);
        assertNotNull(book);
        assertEquals("VALID", book.getNfcVerificationStatus());
    }

    @Test
    void testGetBookByNtagUid_WithCounter_Expired() throws Exception {
        String ntagUid = "042a3b4c5d6e7f";
        String counter = "5";

        // Mock find book
        when(firestore.collection("books")).thenReturn(booksCollection);
        when(booksCollection.whereIn(eq("ntagUid"), anyList())).thenReturn(booksCollection);
        when(booksCollection.limit(1)).thenReturn(booksCollection);
        when(booksCollection.get()).thenReturn(queryFuture);
        when(queryFuture.get()).thenReturn(querySnapshot);
        when(querySnapshot.getDocuments()).thenReturn(Collections.singletonList(queryDocSnapshot));
        when(queryDocSnapshot.exists()).thenReturn(true);
        when(queryDocSnapshot.getString("isbn")).thenReturn("9783161484100");
        when(queryDocSnapshot.getString("title")).thenReturn("A Royal Tale");
        when(queryDocSnapshot.getString("ntagUid")).thenReturn(ntagUid);

        // Mock nfc_counters lookup
        when(firestore.collection("nfc_counters")).thenReturn(countersCollection);
        when(countersCollection.document(ntagUid)).thenReturn(counterDocRef);
        when(counterDocRef.get()).thenReturn(counterDocFuture);
        when(counterDocFuture.get()).thenReturn(counterDocSnapshot);
        
        when(counterDocSnapshot.exists()).thenReturn(true);
        when(counterDocSnapshot.getLong("counter")).thenReturn(5L); // Same counter
        
        // age elapsed > 5 mins (300000 ms)
        java.util.Date firstSeen = new java.util.Date(System.currentTimeMillis() - 400000);
        when(counterDocSnapshot.getDate("firstSeenAt")).thenReturn(firstSeen);

        Book book = bookService.getBookByNtagUid(ntagUid, counter);
        assertNotNull(book);
        assertEquals("EXPIRED", book.getNfcVerificationStatus());
    }

    @Test
    void testGetBookByNtagUid_WithCounter_OlderCounter() throws Exception {
        String ntagUid = "042a3b4c5d6e7f";
        String counter = "3"; // Incoming is older

        // Mock find book
        when(firestore.collection("books")).thenReturn(booksCollection);
        when(booksCollection.whereIn(eq("ntagUid"), anyList())).thenReturn(booksCollection);
        when(booksCollection.limit(1)).thenReturn(booksCollection);
        when(booksCollection.get()).thenReturn(queryFuture);
        when(queryFuture.get()).thenReturn(querySnapshot);
        when(querySnapshot.getDocuments()).thenReturn(Collections.singletonList(queryDocSnapshot));
        when(queryDocSnapshot.exists()).thenReturn(true);
        when(queryDocSnapshot.getString("isbn")).thenReturn("9783161484100");
        when(queryDocSnapshot.getString("title")).thenReturn("A Royal Tale");
        when(queryDocSnapshot.getString("ntagUid")).thenReturn(ntagUid);

        // Mock nfc_counters lookup
        when(firestore.collection("nfc_counters")).thenReturn(countersCollection);
        when(countersCollection.document(ntagUid)).thenReturn(counterDocRef);
        when(counterDocRef.get()).thenReturn(counterDocFuture);
        when(counterDocFuture.get()).thenReturn(counterDocSnapshot);
        
        when(counterDocSnapshot.exists()).thenReturn(true);
        when(counterDocSnapshot.getLong("counter")).thenReturn(10L); // Stored counter is 10

        Book book = bookService.getBookByNtagUid(ntagUid, counter);
        assertNotNull(book);
        assertEquals("REUSED", book.getNfcVerificationStatus());
    }
}
