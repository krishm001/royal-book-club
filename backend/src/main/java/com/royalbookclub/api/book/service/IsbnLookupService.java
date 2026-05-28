package com.royalbookclub.api.book.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.royalbookclub.api.book.dto.OpenLibraryBookDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.List;

/**
 * Service to fetch book details from the Open Library API.
 */
@Service
public class IsbnLookupService {

    private static final Logger log = LoggerFactory.getLogger(IsbnLookupService.class);
    
    private final WebClient webClient;

    public IsbnLookupService(@Qualifier("openLibraryWebClient") WebClient webClient) {
        this.webClient = webClient;
    }

    /**
     * Look up book details on Open Library by ISBN.
     *
     * @param isbn The ISBN of the book
     * @return A Mono containing the populated OpenLibraryBookDto, or an empty one if not found.
     */
    public Mono<OpenLibraryBookDto> lookupIsbn(String isbn) {
        if (isbn == null || isbn.isBlank()) {
            return Mono.just(OpenLibraryBookDto.builder().build());
        }
        
        String cleanIsbn = isbn.trim().replace("-", "");
        String bibkey = "ISBN:" + cleanIsbn;
        
        log.debug("Looking up book details on Open Library for ISBN: {}", cleanIsbn);

        return webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/api/books")
                        .queryParam("bibkeys", bibkey)
                        .queryParam("format", "json")
                        .queryParam("jscmd", "data")
                        .build())
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(jsonNode -> parseOpenLibraryResponse(cleanIsbn, bibkey, jsonNode))
                .onErrorResume(ex -> {
                    log.error("Failed to fetch book metadata from Open Library for ISBN: {}. Error: {}", cleanIsbn, ex.getMessage());
                    // Fall back to returning an empty DTO with the ISBN set
                    return Mono.just(OpenLibraryBookDto.builder().isbn(cleanIsbn).build());
                });
    }

    private OpenLibraryBookDto parseOpenLibraryResponse(String isbn, String bibkey, JsonNode responseNode) {
        if (responseNode == null || !responseNode.has(bibkey)) {
            log.warn("ISBN not found on Open Library: {}", isbn);
            return OpenLibraryBookDto.builder().isbn(isbn).build();
        }
        
        JsonNode bookNode = responseNode.get(bibkey);
        
        String title = bookNode.path("title").asText(null);
        String subtitle = bookNode.path("subtitle").asText(null);
        
        List<String> authorsList = new ArrayList<>();
        if (bookNode.has("authors")) {
            for (JsonNode authorNode : bookNode.get("authors")) {
                String authorName = authorNode.path("name").asText(null);
                if (authorName != null && !authorName.isBlank()) {
                    authorsList.add(authorName);
                }
            }
        }
        
        String publisherName = null;
        if (bookNode.has("publishers")) {
            JsonNode publishersNode = bookNode.get("publishers");
            if (publishersNode.isArray() && !publishersNode.isEmpty()) {
                publisherName = publishersNode.get(0).path("name").asText(null);
            }
        }
        
        String publishDate = bookNode.path("publish_date").asText(null);
        
        String coverUrl = null;
        if (bookNode.has("cover")) {
            JsonNode coverNode = bookNode.get("cover");
            coverUrl = coverNode.has("large") ? coverNode.get("large").asText() :
                       coverNode.has("medium") ? coverNode.get("medium").asText() :
                       coverNode.has("small") ? coverNode.get("small").asText() : null;
        }
        
        Integer pages = bookNode.has("number_of_pages") ? bookNode.get("number_of_pages").asInt() : null;
        
        log.info("Successfully resolved metadata for ISBN: {} -> Title: {}", isbn, title);

        return OpenLibraryBookDto.builder()
                .isbn(isbn)
                .title(title)
                .subtitle(subtitle)
                .authors(authorsList)
                .publisher(publisherName)
                .publishDate(publishDate)
                .coverUrl(coverUrl)
                .pages(pages)
                .build();
    }
}
