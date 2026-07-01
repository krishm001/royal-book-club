package com.royalbookclub.api.config.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
    private String backgroundImageUrlSalon;
    private String backgroundImageUrlAcademic;
    
    @Builder.Default
    private List<String> featuredBookIsbns = new ArrayList<>();

    @Builder.Default
    private List<String> featuredQuotes = new ArrayList<>();

    @Builder.Default
    private Map<String, Map<String, Object>> translations = new HashMap<>();
}
