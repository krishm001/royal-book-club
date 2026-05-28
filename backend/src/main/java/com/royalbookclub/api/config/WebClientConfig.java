package com.royalbookclub.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * Configuration for reactive WebClient instances.
 */
@Configuration
public class WebClientConfig {

    @Value("${openlibrary.base-url:https://openlibrary.org}")
    private String openLibraryBaseUrl;

    /**
     * WebClient bean specifically configured for Open Library queries.
     */
    @Bean
    public WebClient openLibraryWebClient(WebClient.Builder builder) {
        return builder.baseUrl(openLibraryBaseUrl).build();
    }
}
