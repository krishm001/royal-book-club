package com.royalbookclub.api.config.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Configuration model for the Home page hero section.
 * Maps to the "settings" collection under document id "homeHero" in Firestore.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HeroConfig {
    private String id; // static e.g. "homeHero"
    private String title;
    private String subtitle;
    private String backgroundImageUrl;
}
