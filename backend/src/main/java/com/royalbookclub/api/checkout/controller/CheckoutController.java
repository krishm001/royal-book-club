package com.royalbookclub.api.checkout.controller;

import com.royalbookclub.api.checkout.dto.CheckoutRequestDto;
import com.royalbookclub.api.checkout.dto.IotKeyTokenResponseDto;
import com.royalbookclub.api.checkout.dto.ReturnRequestDto;
import com.royalbookclub.api.checkout.model.Checkout;
import com.royalbookclub.api.checkout.service.CheckoutService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Objects;

/**
 * REST Controller for managing book checkouts and returns.
 */
@RestController
@RequestMapping("/api/v1/checkout")
@Tag(name = "Checkout Transactions", description = "Endpoints to handle book checkouts, returns, and IoT hardware key emission")
public class CheckoutController {

    private static final Logger log = LoggerFactory.getLogger(CheckoutController.class);

    private final CheckoutService checkoutService;

    public CheckoutController(CheckoutService checkoutService) {
        this.checkoutService = checkoutService;
    }

    /**
     * Complete a book checkout transaction.
     */
    @PostMapping
    @Operation(summary = "Check out a book", description = "Validates inventory availability and creates a checkout record atomically.")
    public ResponseEntity<Checkout> checkoutBook(@Valid @RequestBody CheckoutRequestDto request) {
        log.info("REST request to checkout book ISBN: {} for member: {}", request.getBookId(), request.getMemberId());
        Checkout checkout = checkoutService.checkoutBook(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(checkout);
    }

    /**
     * Complete a book return transaction.
     */
    @PostMapping("/return")
    @Operation(summary = "Return a book", description = "Marks checkout record returned and increments available copies atomically.")
    public ResponseEntity<Checkout> returnBook(@Valid @RequestBody ReturnRequestDto request) {
        log.info("REST request to return book ISBN: {} for member: {}", request.getBookId(), request.getMemberId());
        Checkout checkout = checkoutService.returnBook(request);
        return ResponseEntity.ok(checkout);
    }

    /**
     * Fetch active checkouts by member ID.
     */
    @GetMapping("/member/{memberId}")
    @Operation(summary = "Get checkouts by member", description = "Retrieve all historic and active checkout records for a specific member.")
    public ResponseEntity<List<Checkout>> getCheckoutsByMember(@PathVariable String memberId) {
        return ResponseEntity.ok(checkoutService.getCheckoutsByMember(memberId));
    }

    /**
     * Get details of a specific checkout transaction.
     */
    @GetMapping("/{id}")
    @Operation(summary = "Get checkout details by ID", description = "Retrieve a specific checkout transaction by its unique Firestore document ID.")
    public ResponseEntity<Checkout> getCheckoutById(@PathVariable String id) {
        return checkoutService.getCheckoutById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Generate simulated time-bound IoT key token (Phase 2 IoT hook placeholder).
     */
    @PostMapping("/generate-key")
    @Operation(summary = "Generate simulated IoT shelf key", description = "Emits a secure time-bound Base64 token for offline RFID readers or shelf locks.")
    public ResponseEntity<IotKeyTokenResponseDto> generateIotKey(@Valid @RequestBody CheckoutRequestDto request) {
        log.info("Simulating IoT key token generation for Member: {}, Book: {}", request.getMemberId(), request.getBookId());
        
        // Expiration is set to 5 minutes (300 seconds) from now
        Instant expiresAt = Instant.now().plusSeconds(300);
        
        // Structure: MEMBER:id|BOOK:isbn|EXP:epochSeconds|SIG:simulated_mac
        String payload = String.format("MEMBER:%s|BOOK:%s|EXP:%d|SIG:%d",
                request.getMemberId(),
                request.getBookId(),
                expiresAt.getEpochSecond(),
                Objects.hash(request.getMemberId(), request.getBookId(), expiresAt.getEpochSecond())
        );
        
        String keyToken = Base64.getEncoder().encodeToString(payload.getBytes(StandardCharsets.UTF_8));
        
        IotKeyTokenResponseDto response = IotKeyTokenResponseDto.builder()
                .keyToken(keyToken)
                .expiresAt(expiresAt)
                .memberId(request.getMemberId())
                .bookId(request.getBookId())
                .status("SIMULATED_KEY_EMITTED")
                .build();
                
        return ResponseEntity.ok(response);
    }
}
