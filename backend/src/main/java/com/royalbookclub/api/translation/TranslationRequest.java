package com.royalbookclub.api.translation;

import java.util.List;
import java.util.Map;

public class TranslationRequest {
    private Map<String, String> texts;
    private List<String> targetLanguages;

    public TranslationRequest() {}

    public TranslationRequest(Map<String, String> texts, List<String> targetLanguages) {
        this.texts = texts;
        this.targetLanguages = targetLanguages;
    }

    public Map<String, String> getTexts() {
        return texts;
    }

    public void setTexts(Map<String, String> texts) {
        this.texts = texts;
    }

    public List<String> getTargetLanguages() {
        return targetLanguages;
    }

    public void setTargetLanguages(List<String> targetLanguages) {
        this.targetLanguages = targetLanguages;
    }
}
