package com.royalbookclub.api.user.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

/**
 * User document model mapped to the Cloud Firestore "users" collection.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {
    private String id;
    private String email;
    private String firstName;
    private String lastName;
    private Role role;
    private String rfidToken;
    private String phone;
    private String houseNo;
    private String street;
    private String city;
    private String pinCode;
    private Date createdAt;
    private Date updatedAt;
    private Date consentAcceptedAt;
    @Builder.Default
    private String language = "en";
    @Builder.Default
    private Boolean deleted = false;


    public String getFullName() {
        String first = firstName != null ? firstName.trim() : "";
        String last = lastName != null ? lastName.trim() : "";
        if ("null".equalsIgnoreCase(first)) {
            first = "";
        }
        if ("null".equalsIgnoreCase(last)) {
            last = "";
        }
        String full = (first + " " + last).trim();
        if (full.isEmpty() || "null null".equalsIgnoreCase(full) || "null".equalsIgnoreCase(full)) {
            return email != null && email.contains("@") ? email.split("@")[0] : "Royal Patron";
        }
        return full;
    }
}
