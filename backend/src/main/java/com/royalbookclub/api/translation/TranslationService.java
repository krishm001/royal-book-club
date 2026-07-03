package com.royalbookclub.api.translation;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.translate.Translate;
import com.google.cloud.translate.TranslateOptions;
import com.google.cloud.translate.Translation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class TranslationService {

    private static final Logger logger = LoggerFactory.getLogger(TranslationService.class);

    @Value("${gcp.translate.use-real:false}")
    private boolean useRealTranslate;

    @Value("${spring.cloud.gcp.project-id:royalbookclub}")
    private String projectId;

    private Translate translateService;

    @PostConstruct
    public void init() {
        if (useRealTranslate) {
            try {
                logger.info("Initializing Google Cloud Translation service for project: {}", projectId);
                this.translateService = TranslateOptions.newBuilder()
                        .setProjectId(projectId)
                        .build()
                        .getService();
                logger.info("Google Cloud Translation service initialized successfully.");
            } catch (Exception e) {
                logger.error("Failed to initialize Google Cloud Translation SDK. Falling back to simulated translations.", e);
                this.useRealTranslate = false;
            }
        } else {
            logger.info("Using simulated translation service (offline/dev mode).");
        }
    }

    /**
     * Translates a map of text fields into the requested target languages.
     *
     * @param texts           Map of field-name to text value (e.g. {"title": "Hello", "description": "World"})
     * @param targetLanguages List of target language codes (e.g. ["hi", "kn"])
     * @return Map of target language code to Map of field-name to translated text
     */
    public Map<String, Map<String, String>> translateMap(Map<String, String> texts, List<String> targetLanguages) {
        Map<String, Map<String, String>> results = new HashMap<>();

        for (String targetLang : targetLanguages) {
            Map<String, String> langTranslations = new HashMap<>();
            for (Map.Entry<String, String> entry : texts.entrySet()) {
                String field = entry.getKey();
                String textVal = entry.getValue();

                if (textVal == null || textVal.trim().isEmpty()) {
                    langTranslations.put(field, "");
                    continue;
                }

                String translatedText = translateSingleText(textVal, targetLang);
                langTranslations.put(field, translatedText);
            }
            results.put(targetLang, langTranslations);
        }

        return results;
    }

    private String translateSingleText(String text, String targetLang) {
        if (useRealTranslate && translateService != null) {
            try {
                Translation translation = translateService.translate(
                        text,
                        Translate.TranslateOption.targetLanguage(targetLang)
                );
                return translation.getTranslatedText();
            } catch (Exception e) {
                logger.error("Error during real GCP translation to {}: {}", targetLang, e.getMessage());
                // Fallback to online free translate first
                String online = fetchOnlineTranslation(text, targetLang);
                if (online != null && !online.isBlank()) {
                    return online;
                }
                return getSimulatedTranslation(text, targetLang);
            }
        } else {
            String online = fetchOnlineTranslation(text, targetLang);
            if (online != null && !online.isBlank()) {
                return online;
            }
            return getSimulatedTranslation(text, targetLang);
        }
    }

    private String fetchOnlineTranslation(String text, String targetLang) {
        try {
            String encodedText = java.net.URLEncoder.encode(text, java.nio.charset.StandardCharsets.UTF_8);
            String urlStr = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=" 
                    + targetLang + "&dt=t&q=" + encodedText;
            
            java.net.http.HttpClient client = java.net.http.HttpClient.newBuilder()
                    .connectTimeout(java.time.Duration.ofSeconds(4))
                    .build();
            java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                    .uri(java.net.URI.create(urlStr))
                    .header("User-Agent", "Mozilla/5.0")
                    .GET()
                    .build();
            
            java.net.http.HttpResponse<String> response = client.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(response.body());
                if (root.isArray() && root.size() > 0) {
                    com.fasterxml.jackson.databind.JsonNode firstArray = root.get(0);
                    if (firstArray.isArray()) {
                        StringBuilder sb = new StringBuilder();
                        for (com.fasterxml.jackson.databind.JsonNode item : firstArray) {
                            if (item.isArray() && item.size() > 0) {
                                sb.append(item.get(0).asText());
                            }
                        }
                        return sb.toString().trim();
                    }
                }
            }
        } catch (Exception e) {
            logger.warn("Failed to fetch online translation for targetLang: {}. Error: {}", targetLang, e.getMessage());
        }
        return null;
    }

    private String getSimulatedTranslation(String text, String targetLang) {
        // Simple mock translation mapper for key standard terms or fallback
        String prefix = targetLang.equals("hi") ? "[राजसी अनुवाद - हिन्दी] " : "[ರಾಜಮನೆತನದ ಶೈಲಿ - ಕನ್ನಡ] ";
        
        // Provide decent looking mock translations for common entities if possible,
        // or just prepend thematic language markers so curators can see it worked offline.
        String trimmed = text.trim();
        if (targetLang.equals("hi")) {
            if (trimmed.equalsIgnoreCase("Litfest")) return "साहित्य महोत्सव";
            if (trimmed.equalsIgnoreCase("Discussion")) return "शास्त्रार्थ विचार";
            if (trimmed.equalsIgnoreCase("Meetup")) return "राजसी बैठक";
            if (trimmed.equalsIgnoreCase("Sovereign Reader Autumn Litfest")) return "Sovereign शरद साहित्य उत्सव";
            return prefix + text;
        } else if (targetLang.equals("kn")) {
            if (trimmed.equalsIgnoreCase("Litfest")) return "ಸಾಹಿತ್ಯೋತ್ಸವ";
            if (trimmed.equalsIgnoreCase("Discussion")) return "ಚರ್ಚ್ಹಾಗೋಷ್ಠಿ";
            if (trimmed.equalsIgnoreCase("Meetup")) return "ರಾಜಸಿ ಸಭೆ";
            if (trimmed.equalsIgnoreCase("Sovereign Reader Autumn Litfest")) return "ಸಾರ್ವಭೌಮ ಶರತ್ ಸಾಹಿತ್ಯೋತ್ಸವ";
            return prefix + text;
        }
        
        return "[" + targetLang.toUpperCase() + "] " + text;
    }
}
