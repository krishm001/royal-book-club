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
    private Date createdAt;
    private Date updatedAt;
}
