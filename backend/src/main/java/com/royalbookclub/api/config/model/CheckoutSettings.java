package com.royalbookclub.api.config.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Model representing active checkout gating settings.
 * Persisted under settings/checkoutSettings in Firestore.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckoutSettings {
    private String id;
    private boolean phoneMandatory;
    private boolean houseNoMandatory;
    private boolean streetMandatory;
    private boolean cityMandatory;
    private boolean pinCodeMandatory;
    private boolean autoModerateBlogs;
}
