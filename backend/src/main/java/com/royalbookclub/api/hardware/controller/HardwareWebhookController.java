package com.royalbookclub.api.hardware.controller;

import com.royalbookclub.api.hardware.dto.ShelfEventRequestDto;
import com.royalbookclub.api.hardware.model.ShelfEvent;
import com.royalbookclub.api.hardware.service.ShelfEventService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST Webhook Controller to receive and record raw physical RFID scans from smart shelves.
 */
@RestController
@RequestMapping("/api/v1/hardware")
@Tag(name = "IoT Shelf Hardware Webhooks", description = "Endpoints handling hardware-level telemetry, such as RFID bookshelf scans.")
public class HardwareWebhookController {

    private static final Logger log = LoggerFactory.getLogger(HardwareWebhookController.class);

    private final ShelfEventService shelfEventService;

    public HardwareWebhookController(ShelfEventService shelfEventService) {
        this.shelfEventService = shelfEventService;
    }

    /**
     * Webhook to receive RFID bookshelf scan interactions.
     */
    @PostMapping("/shelf-event")
    @Operation(summary = "Log bookshelf RFID interaction", description = "Receives RFID scan payload from a bookshelf unit and records it for offline batch matching.")
    public ResponseEntity<ShelfEvent> receiveShelfEvent(@Valid @RequestBody ShelfEventRequestDto request) {
        log.info("Received hardware RFID webhook. Shelf ID: {}, Member RFID: {}, Book RFID: {}",
                request.getShelfId(), request.getMemberRfid(), request.getBookRfid());
        
        ShelfEvent recordedEvent = shelfEventService.recordShelfEvent(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(recordedEvent);
    }
}
