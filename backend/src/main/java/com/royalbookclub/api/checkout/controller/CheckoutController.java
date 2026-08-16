package com.royalbookclub.api.checkout.controller;
import com.royalbookclub.api.checkout.dto.CheckoutRequestDto;
import com.royalbookclub.api.checkout.dto.IotKeyTokenResponseDto;
import com.royalbookclub.api.checkout.dto.ReturnRequestDto;
import com.royalbookclub.api.checkout.model.Checkout;
import com.royalbookclub.api.checkout.service.CheckoutService;
import com.royalbookclub.api.user.model.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
     * Get all checkout transactions.
     */
    @GetMapping
    @Operation(summary = "Get all checkouts", description = "Retrieve all checkout transactions in system.")
    public ResponseEntity<List<Checkout>> getAllCheckouts() {
        log.info("REST request to fetch all checkouts");
        return ResponseEntity.ok(checkoutService.getAllCheckouts());
    }

    /**
     * Submit a checkout request.
     */
    @PostMapping("/request")
    @Operation(summary = "Request book checkout", description = "Creates a pending checkout request in system.")
    public ResponseEntity<Checkout> createCheckoutRequest(@Valid @RequestBody CheckoutRequestDto request) {
        log.info("REST request to submit checkout request for Book: {}, Member: {}", request.getBookId(), request.getMemberId());
        Checkout checkout = checkoutService.createCheckoutRequest(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(checkout);
    }

    /**
     * Helper to resolve adminId from request parameter or authenticated user.
     */
    private String resolveAdminId(String adminId, User user) {
        if (adminId != null && !adminId.trim().isEmpty() && !"undefined".equals(adminId) && !"null".equals(adminId)) {
            return adminId.trim();
        }
        if (user != null && user.getId() != null) {
            return user.getId();
        }
        return "SYSTEM";
    }

    /**
     * Approve a checkout request.
     */
    @PostMapping("/approve/{id}")
    @Operation(summary = "Approve checkout request", description = "Approve pending book checkout request.")
    public ResponseEntity<Checkout> approveCheckoutRequest(
            @PathVariable String id,
            @RequestParam(required = false) String adminId,
            @AuthenticationPrincipal User user) {
        String resolvedAdminId = resolveAdminId(adminId, user);
        log.info("REST request to approve checkout request: {} by admin: {} (resolved: {})", id, adminId, resolvedAdminId);
        Checkout checkout = checkoutService.approveCheckoutRequest(id, resolvedAdminId);
        return ResponseEntity.ok(checkout);
    }

    /**
     * Reject a checkout request.
     */
    @PostMapping("/reject/{id}")
    @Operation(summary = "Reject checkout request", description = "Reject pending book checkout request.")
    public ResponseEntity<Checkout> rejectCheckoutRequest(
            @PathVariable String id,
            @RequestParam(required = false) String adminId,
            @AuthenticationPrincipal User user) {
        String resolvedAdminId = resolveAdminId(adminId, user);
        log.info("REST request to reject checkout request: {} by admin: {} (resolved: {})", id, adminId, resolvedAdminId);
        Checkout checkout = checkoutService.rejectCheckoutRequest(id, resolvedAdminId);
        return ResponseEntity.ok(checkout);
    }

    /**
     * Submit a return request.
     */
    @PostMapping("/request-return")
    @Operation(summary = "Request book return", description = "Creates a pending return request in system.")
    public ResponseEntity<Checkout> createReturnRequest(@Valid @RequestBody ReturnRequestDto request) {
        log.info("REST request to submit return request for Book: {}, Member: {}", request.getBookId(), request.getMemberId());
        Checkout checkout = checkoutService.createReturnRequest(request);
        return ResponseEntity.ok(checkout);
    }

    /**
     * Approve a return request.
     */
    @PostMapping("/approve-return/{id}")
    @Operation(summary = "Approve return request", description = "Approve pending book return request.")
    public ResponseEntity<Checkout> approveReturnRequest(
            @PathVariable String id,
            @RequestParam(required = false) String adminId,
            @AuthenticationPrincipal User user) {
        String resolvedAdminId = resolveAdminId(adminId, user);
        log.info("REST request to approve return request: {} by admin: {} (resolved: {})", id, adminId, resolvedAdminId);
        Checkout checkout = checkoutService.approveReturnRequest(id, resolvedAdminId);
        return ResponseEntity.ok(checkout);
    }

    /**
     * Submit an experience rating for a checkout transaction.
     */
    @PostMapping("/{id}/rate")
    @Operation(summary = "Rate checkout experience", description = "Submits a 1-5 star user experience rating for a checkout transaction.")
    public ResponseEntity<Void> rateCheckout(@PathVariable String id, @RequestParam Integer rating) {
        log.info("REST request to submit experience rating: {} for checkout transaction: {}", rating, id);
        checkoutService.rateCheckout(id, rating);
        return ResponseEntity.ok().build();
    }


    /**
     * Clear / Force Return an active book checkout against a member.
     */
    @PostMapping("/clear/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Clear/Force-return a checkout", description = "Forcibly return an active book checkout, updating status to RETURNED and incrementing available copies.")
    public ResponseEntity<Checkout> clearCheckout(
            @PathVariable String id,
            @RequestParam(required = false) String adminId,
            @AuthenticationPrincipal User user) {
        String resolvedAdminId = resolveAdminId(adminId, user);
        log.info("REST request to clear/force-return checkout: {} by admin: {} (resolved: {})", id, adminId, resolvedAdminId);
        Checkout checkout = checkoutService.forceClearCheckout(id, resolvedAdminId);
        return ResponseEntity.ok(checkout);
    }

    /**
     * Validate book return using physical library QR code.
     */
    @PostMapping("/validate-qr-return")
    @Operation(summary = "Validate return via QR code", description = "Validates return using the library's physical return validator QR code path name.")
    public ResponseEntity<Checkout> validateQrReturn(
            @RequestParam String checkoutId,
            @RequestParam String qrPathName) {
        log.info("REST request to validate return via QR for checkout ID: {}, QR path: {}", checkoutId, qrPathName);
        Checkout checkout = checkoutService.validateQrReturn(checkoutId, qrPathName);
        return ResponseEntity.ok(checkout);
    }

    /**
     * Complete direct verified checkout via Web NFC.
     */
    @PostMapping("/verified")
    @Operation(summary = "Direct verified checkout", description = "Direct checkout with matching Web NFC tag.")
    public ResponseEntity<Checkout> verifiedCheckout(@Valid @RequestBody CheckoutRequestDto request) {
        log.info("REST request for verified direct checkout: Book: {}, Member: {}", request.getBookId(), request.getMemberId());
        Checkout checkout = checkoutService.verifiedCheckout(request);
        return ResponseEntity.ok(checkout);
    }

    /**
     * Complete direct verified return via Web NFC.
     */
    @PostMapping("/verified-return")
    @Operation(summary = "Direct verified return", description = "Direct return with matching Web NFC tag.")
    public ResponseEntity<Checkout> verifiedReturn(@Valid @RequestBody ReturnRequestDto request) {
        log.info("REST request for verified direct return: Book: {}, Member: {}", request.getBookId(), request.getMemberId());
        Checkout checkout = checkoutService.verifiedReturn(request);
        return ResponseEntity.ok(checkout);
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
