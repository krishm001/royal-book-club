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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
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
}
