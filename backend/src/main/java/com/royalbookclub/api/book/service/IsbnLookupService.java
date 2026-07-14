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
 * Service to fetch book details merging Open Library and Google Books APIs.
 */
@Service
public class IsbnLookupService {

    private static final Logger log = LoggerFactory.getLogger(IsbnLookupService.class);
    
    private final WebClient webClient;

    public IsbnLookupService(@Qualifier("openLibraryWebClient") WebClient webClient) {
        this.webClient = webClient;
    }

    /**
     * Look up book details on both Open Library and Google Books by ISBN, zipping the results concurrently.
     *
     * @param isbn The ISBN of the book
     * @return A Mono containing the merged metadata.
     */
    public Mono<OpenLibraryBookDto> lookupIsbn(String isbn) {
        if (isbn == null || isbn.isBlank()) {
            return Mono.just(OpenLibraryBookDto.builder().build());
        }
        
        String cleanIsbn = isbn.trim().replace("-", "");
        log.info("Initiating dual-API metadata resolution for ISBN: {}", cleanIsbn);

        Mono<OpenLibraryBookDto> olMono = lookupOpenLibraryIsbnOnly(cleanIsbn);
        Mono<OpenLibraryBookDto> gbMono = lookupGoogleBooksIsbn(cleanIsbn);

        return Mono.zip(olMono, gbMono)
                .map(tuple -> {
                    OpenLibraryBookDto ol = tuple.getT1();
                    OpenLibraryBookDto gb = tuple.getT2();
                    
                    // Merge logic: prefer Open Library for some values, fallback to Google Books, and vice versa
                    String mergedTitle = (ol.getTitle() != null && !ol.getTitle().isBlank()) ? ol.getTitle() : gb.getTitle();
                    String mergedSubtitle = (ol.getSubtitle() != null && !ol.getSubtitle().isBlank()) ? ol.getSubtitle() : gb.getSubtitle();
                    if (mergedSubtitle == null || mergedSubtitle.isBlank()) {
                        mergedSubtitle = gb.getSubtitle();
                    }
                    
                    List<String> mergedAuthors = (ol.getAuthors() != null && !ol.getAuthors().isEmpty()) ? ol.getAuthors() : gb.getAuthors();
                    String mergedPublisher = (ol.getPublisher() != null && !ol.getPublisher().isBlank()) ? ol.getPublisher() : gb.getPublisher();
                    String mergedPublishDate = (ol.getPublishDate() != null && !ol.getPublishDate().isBlank()) ? ol.getPublishDate() : gb.getPublishDate();
                    String mergedCoverUrl = (ol.getCoverUrl() != null && !ol.getCoverUrl().isBlank()) ? ol.getCoverUrl() : gb.getCoverUrl();
                    Integer mergedPages = ol.getPages() != null ? ol.getPages() : gb.getPages();
                    
                    log.info("Merged dual-API metadata completed for ISBN: {} -> Title: {}", cleanIsbn, mergedTitle);
                    return OpenLibraryBookDto.builder()
                            .isbn(cleanIsbn)
                            .title(mergedTitle)
                            .subtitle(mergedSubtitle)
                            .authors(mergedAuthors)
                            .publisher(mergedPublisher)
                            .publishDate(mergedPublishDate)
                            .coverUrl(mergedCoverUrl)
                            .pages(mergedPages)
                            .build();
                });
    }

    /**
     * Search Google Books API by title, author, or keywords.
     *
     * @param query Search keywords
     * @return List of matching book metadata DTOs
     */
    public Mono<List<OpenLibraryBookDto>> searchGoogleBooks(String query) {
        if (query == null || query.isBlank()) {
            return Mono.just(new ArrayList<>());
        }
        
        log.info("Searching Google Books API for metadata matching query: {}", query);
        WebClient googleClient = WebClient.create("https://www.googleapis.com");
        
        return googleClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/books/v1/volumes")
                        .queryParam("q", query.trim())
                        .queryParam("maxResults", "10")
                        .build())
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(jsonNode -> {
                    List<OpenLibraryBookDto> results = new ArrayList<>();
                    if (jsonNode == null || !jsonNode.has("items")) {
                        return results;
                    }
                    JsonNode items = jsonNode.get("items");
                    if (items.isArray()) {
                        for (JsonNode item : items) {
                            JsonNode volumeInfo = item.get("volumeInfo");
                            if (volumeInfo == null) continue;
                            
                            String title = volumeInfo.path("title").asText(null);
                            String subtitle = volumeInfo.path("subtitle").asText(null);
                            
                            List<String> authorsList = new ArrayList<>();
                            if (volumeInfo.has("authors")) {
                                for (JsonNode authorNode : volumeInfo.get("authors")) {
                                    authorsList.add(authorNode.asText());
                                }
                            }
                            
                            String publisher = volumeInfo.path("publisher").asText(null);
                            String publishedDate = volumeInfo.path("publishedDate").asText(null);
                            Integer pageCount = volumeInfo.has("pageCount") ? volumeInfo.get("pageCount").asInt() : null;
                            
                            String coverUrl = null;
                            if (volumeInfo.has("imageLinks")) {
                                JsonNode imageLinks = volumeInfo.get("imageLinks");
                                coverUrl = imageLinks.has("thumbnail") ? imageLinks.get("thumbnail").asText() :
                                           imageLinks.has("smallThumbnail") ? imageLinks.get("smallThumbnail").asText() : null;
                                if (coverUrl != null && coverUrl.startsWith("http://")) {
                                    coverUrl = coverUrl.replace("http://", "https://");
                                }
                            }
                            
                            String foundIsbn = null;
                            if (volumeInfo.has("industryIdentifiers")) {
                                for (JsonNode idNode : volumeInfo.get("industryIdentifiers")) {
                                    String type = idNode.path("type").asText("");
                                    if ("ISBN_13".equals(type) || "ISBN_10".equals(type)) {
                                        foundIsbn = idNode.path("identifier").asText();
                                        if ("ISBN_13".equals(type)) {
                                            break;
                                        }
                                    }
                                }
                            }
                            
                            results.add(OpenLibraryBookDto.builder()
                                    .isbn(foundIsbn != null ? foundIsbn : "")
                                    .title(title)
                                    .subtitle(subtitle)
                                    .authors(authorsList)
                                    .publisher(publisher)
                                    .publishDate(publishedDate)
                                    .coverUrl(coverUrl)
                                    .pages(pageCount)
                                    .build());
                        }
                    }
                    return results;
                })
                .onErrorResume(ex -> {
                    log.error("Google Books search failed for query: {}. Error: {}", query, ex.getMessage());
                    return Mono.just(new ArrayList<>());
                });
    }

    private Mono<OpenLibraryBookDto> lookupOpenLibraryIsbnOnly(String cleanIsbn) {
        String bibkey = "ISBN:" + cleanIsbn;
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
                    log.error("Open Library metadata fetch failed for ISBN: {}. Error: {}", cleanIsbn, ex.getMessage());
                    return Mono.just(OpenLibraryBookDto.builder().isbn(cleanIsbn).build());
                });
    }

    private Mono<OpenLibraryBookDto> lookupGoogleBooksIsbn(String cleanIsbn) {
        WebClient googleClient = WebClient.create("https://www.googleapis.com");
        return googleClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/books/v1/volumes")
                        .queryParam("q", "isbn:" + cleanIsbn)
                        .build())
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(jsonNode -> {
                    if (jsonNode == null || !jsonNode.has("items")) {
                        return OpenLibraryBookDto.builder().isbn(cleanIsbn).build();
                    }
                    JsonNode items = jsonNode.get("items");
                    if (!items.isArray() || items.isEmpty()) {
                        return OpenLibraryBookDto.builder().isbn(cleanIsbn).build();
                    }
                    JsonNode volumeInfo = items.get(0).get("volumeInfo");
                    
                    String title = volumeInfo.path("title").asText(null);
                    String subtitle = volumeInfo.path("subtitle").asText(null);
                    if (subtitle == null || subtitle.isBlank()) {
                        subtitle = volumeInfo.path("description").asText(null);
                    }
                    
                    List<String> authorsList = new ArrayList<>();
                    if (volumeInfo.has("authors")) {
                        for (JsonNode authorNode : volumeInfo.get("authors")) {
                            authorsList.add(authorNode.asText());
                        }
                    }
                    
                    String publisher = volumeInfo.path("publisher").asText(null);
                    String publishedDate = volumeInfo.path("publishedDate").asText(null);
                    Integer pageCount = volumeInfo.has("pageCount") ? volumeInfo.get("pageCount").asInt() : null;
                    
                    String coverUrl = null;
                    if (volumeInfo.has("imageLinks")) {
                        JsonNode imageLinks = volumeInfo.get("imageLinks");
                        coverUrl = imageLinks.has("thumbnail") ? imageLinks.get("thumbnail").asText() :
                                   imageLinks.has("smallThumbnail") ? imageLinks.get("smallThumbnail").asText() : null;
                        if (coverUrl != null && coverUrl.startsWith("http://")) {
                            coverUrl = coverUrl.replace("http://", "https://");
                        }
                    }
                    
                    return OpenLibraryBookDto.builder()
                            .isbn(cleanIsbn)
                            .title(title)
                            .subtitle(subtitle)
                            .authors(authorsList)
                            .publisher(publisher)
                            .publishDate(publishedDate)
                            .coverUrl(coverUrl)
                            .pages(pageCount)
                            .build();
                })
                .onErrorResume(ex -> {
                    log.error("Google Books metadata fetch failed for ISBN: {}. Error: {}", cleanIsbn, ex.getMessage());
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
