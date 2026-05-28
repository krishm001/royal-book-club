package com.royalbookclub.api.auth;

import com.google.firebase.auth.FirebaseToken;
import com.royalbookclub.api.user.model.User;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;

import java.util.Collection;

/**
 * Authentication token for Firebase authenticated users.
 */
public class FirebaseAuthenticationToken extends AbstractAuthenticationToken {

    private final Object principal; // Can be the User object or Firestore user ID / Email
    private final FirebaseToken credentials;

    /**
     * Creates an unauthenticated token.
     */
    public FirebaseAuthenticationToken(FirebaseToken credentials) {
        super(null);
        this.principal = credentials != null ? credentials.getUid() : null;
        this.credentials = credentials;
        setAuthenticated(false);
    }

    /**
     * Creates an authenticated token with authorities.
     */
    public FirebaseAuthenticationToken(Object principal, FirebaseToken credentials, Collection<? extends GrantedAuthority> authorities) {
        super(authorities);
        this.principal = principal;
        this.credentials = credentials;
        setAuthenticated(true);
    }

    @Override
    public Object getCredentials() {
        return credentials;
    }

    @Override
    public Object getPrincipal() {
        return principal;
    }
}
