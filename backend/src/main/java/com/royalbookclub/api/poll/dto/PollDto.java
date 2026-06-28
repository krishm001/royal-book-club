package com.royalbookclub.api.poll.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Data Transfer Object for creating or customizing a Guild Plebiscite.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PollDto {
    @NotBlank(message = "Poll question cannot be empty.")
    private String question;

    @NotNull(message = "Poll options cannot be null.")
    @Size(min = 4, max = 4, message = "A valid plebiscite must have exactly 4 choices.")
    private List<String> options;

    private boolean membersOnly;
}
