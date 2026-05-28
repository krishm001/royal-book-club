package com.royalbookclub.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Royal Book Club API — Main Application Entry Point.
 *
 * <p>Spring Boot 3.x application with Firebase Auth + Cloud Firestore,
 * deployed on Google Cloud Run with scale-to-zero for zero-cost operation.</p>
 */
@SpringBootApplication
@EnableAsync
public class RoyalBookClubApplication {

    public static void main(String[] args) {
        SpringApplication.run(RoyalBookClubApplication.class, args);
    }
}
