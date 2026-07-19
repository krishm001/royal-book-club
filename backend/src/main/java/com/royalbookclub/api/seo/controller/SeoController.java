package com.royalbookclub.api.seo.controller;

import com.royalbookclub.api.book.model.Book;
import com.royalbookclub.api.book.service.BookService;
import com.royalbookclub.api.discourse.model.Discourse;
import com.royalbookclub.api.discourse.service.DiscourseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@Tag(name = "SEO Operations", description = "Endpoints for search engine optimization, robots.txt, and sitemap.xml")
public class SeoController {

    private final BookService bookService;
    private final DiscourseService discourseService;

    public SeoController(BookService bookService, DiscourseService discourseService) {
        this.bookService = bookService;
        this.discourseService = discourseService;
    }

    @GetMapping(value = "/robots.txt", produces = MediaType.TEXT_PLAIN_VALUE)
    @Operation(summary = "Get robots.txt", description = "Retrieves robots.txt file with sitemap links.")
    public ResponseEntity<String> getRobotsTxt() {
        String robots = "# Robots.txt configuration for royalbookclub.com\n" +
                "# Maximizes SEO indexing for standard search engines while blocking AI models and scrapers.\n\n" +
                "User-agent: Amazonbot\n" +
                "Disallow: /\n\n" +
                "User-agent: Applebot-Extended\n" +
                "Disallow: /\n\n" +
                "User-agent: Bytespider\n" +
                "Disallow: /\n\n" +
                "User-agent: CCBot\n" +
                "Disallow: /\n\n" +
                "User-agent: ClaudeBot\n" +
                "Disallow: /\n\n" +
                "User-agent: CloudflareBrowserRenderingCrawler\n" +
                "Disallow: /\n\n" +
                "User-agent: Google-Extended\n" +
                "Disallow: /\n\n" +
                "User-agent: GPTBot\n" +
                "Disallow: /\n\n" +
                "User-agent: meta-externalagent\n" +
                "Disallow: /\n\n" +
                "User-agent: *\n" +
                "Allow: /\n\n" +
                "Sitemap: https://royalbookclub.com/sitemap.xml\n";
        return ResponseEntity.ok(robots);
    }

    @GetMapping(value = "/sitemap.xml", produces = MediaType.APPLICATION_XML_VALUE)
    @Operation(summary = "Get sitemap.xml", description = "Generates dynamic sitemap.xml with catalog books and discourses.")
    public ResponseEntity<String> getSitemapXml() {
        StringBuilder xml = new StringBuilder();
        xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        xml.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");

        // Static Pages
        xml.append("  <url>\n");
        xml.append("    <loc>https://royalbookclub.com/#/</loc>\n");
        xml.append("    <changefreq>daily</changefreq>\n");
        xml.append("    <priority>1.0</priority>\n");
        xml.append("  </url>\n");

        xml.append("  <url>\n");
        xml.append("    <loc>https://royalbookclub.com/#/catalog</loc>\n");
        xml.append("    <changefreq>daily</changefreq>\n");
        xml.append("    <priority>0.8</priority>\n");
        xml.append("  </url>\n");

        xml.append("  <url>\n");
        xml.append("    <loc>https://royalbookclub.com/#/discourses</loc>\n");
        xml.append("    <changefreq>daily</changefreq>\n");
        xml.append("    <priority>0.8</priority>\n");
        xml.append("  </url>\n");

        // Dynamic Books
        try {
            List<Book> books = bookService.getAllBooks();
            if (books != null) {
                for (Book book : books) {
                    if (book.getIsbn() != null && !book.getIsbn().isBlank()) {
                        xml.append("  <url>\n");
                        xml.append("    <loc>https://royalbookclub.com/#/catalog/").append(book.getIsbn().trim()).append("</loc>\n");
                        xml.append("    <changefreq>weekly</changefreq>\n");
                        xml.append("    <priority>0.7</priority>\n");
                        xml.append("  </url>\n");
                    }
                }
            }
        } catch (Exception e) {
            // Log & handle robustly
        }

        // Dynamic Chronicles
        try {
            List<Discourse> chronicles = discourseService.getRootDiscourses("CHRONICLE");
            if (chronicles != null) {
                for (Discourse disc : chronicles) {
                    if (disc.getId() != null && !disc.getId().isBlank()) {
                        xml.append("  <url>\n");
                        xml.append("    <loc>https://royalbookclub.com/#/discourses/").append(disc.getId().trim()).append("</loc>\n");
                        xml.append("    <changefreq>weekly</changefreq>\n");
                        xml.append("    <priority>0.6</priority>\n");
                        xml.append("  </url>\n");
                    }
                }
            }
        } catch (Exception e) {
            // Log & handle robustly
        }

        // Dynamic Debates
        try {
            List<Discourse> debates = discourseService.getRootDiscourses("DEBATE");
            if (debates != null) {
                for (Discourse disc : debates) {
                    if (disc.getId() != null && !disc.getId().isBlank()) {
                        xml.append("  <url>\n");
                        xml.append("    <loc>https://royalbookclub.com/#/discourses/").append(disc.getId().trim()).append("</loc>\n");
                        xml.append("    <changefreq>weekly</changefreq>\n");
                        xml.append("    <priority>0.6</priority>\n");
                        xml.append("  </url>\n");
                    }
                }
            }
        } catch (Exception e) {
            // Log & handle robustly
        }

        xml.append("</urlset>");
        return ResponseEntity.ok(xml.toString());
    }
}
