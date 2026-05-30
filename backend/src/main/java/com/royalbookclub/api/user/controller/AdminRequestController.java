package com.royalbookclub.api.user.controller;

import com.royalbookclub.api.user.dto.AdminRequestDto;
import com.royalbookclub.api.user.model.AdminRequest;
import com.royalbookclub.api.user.model.AdminRequestStatus;
import com.royalbookclub.api.user.service.AdminRequestService;
import com.royalbookclub.api.user.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin-requests")
public class AdminRequestController {

    private static final Logger log = LoggerFactory.getLogger(AdminRequestController.class);

    private final AdminRequestService adminRequestService;
    private final UserService userService;

    public AdminRequestController(AdminRequestService adminRequestService, UserService userService) {
        this.adminRequestService = adminRequestService;
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<AdminRequestDto.Response> create(@RequestBody AdminRequestDto.Create createDto, Authentication auth) {
        String uid = auth.getName();
        String email = auth.getPrincipal() != null ? auth.getPrincipal().toString() : null;

        AdminRequest created = adminRequestService.createRequest(uid, email, createDto.getReason());
        AdminRequestDto.Response resp = toDto(created);
        return ResponseEntity.created(URI.create("/api/v1/admin-requests/" + created.getId())).body(resp);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AdminRequestDto.Response>> list(@RequestParam(required = false) String status) {
        AdminRequestStatus st = null;
        if (status != null) {
            st = AdminRequestStatus.valueOf(status.toUpperCase());
        }
        List<AdminRequest> results = st == null ? adminRequestService.listByStatus(AdminRequestStatus.PENDING) : adminRequestService.listByStatus(st);
        List<AdminRequestDto.Response> dtos = results.stream().map(this::toDto).collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminRequestDto.Response> get(@PathVariable String id) {
        AdminRequest r = adminRequestService.getById(id);
        return ResponseEntity.ok(toDto(r));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminRequestDto.Response> approve(@PathVariable String id, @RequestBody(required = false) AdminRequestDto.Create body, Authentication auth) {
        String adminUid = auth.getName();
        String note = body != null ? body.getReason() : null;
        AdminRequest updated = adminRequestService.approve(id, adminUid, note);
        return ResponseEntity.ok(toDto(updated));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminRequestDto.Response> reject(@PathVariable String id, @RequestBody(required = false) AdminRequestDto.Create body, Authentication auth) {
        String adminUid = auth.getName();
        String note = body != null ? body.getReason() : null;
        AdminRequest updated = adminRequestService.reject(id, adminUid, note);
        return ResponseEntity.ok(toDto(updated));
    }

    private AdminRequestDto.Response toDto(AdminRequest r) {
        return new AdminRequestDto.Response(
                r.getId(),
                r.getRequesterUid(),
                r.getRequesterEmail(),
                r.getReason(),
                r.getStatus(),
                r.getCreatedAt(),
                r.getReviewedBy(),
                r.getReviewedAt(),
                r.getNote()
        );
    }
}
