import fs from 'fs';
import { translate } from '@vitalets/google-translate-api';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const missingPath = '/tmp/missing_translations.json';
const missingData = JSON.parse(fs.readFileSync(missingPath, 'utf8'));

const srcDir = path.join(__dirname, 'src', 'i18n', 'locales');
const enPath = path.join(srcDir, 'en.js');
const hiPath = path.join(srcDir, 'hi.js');
const knPath = path.join(srcDir, 'kn.js');

function loadLocale(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');
    const jsonStr = code.replace(/export\s+default\s+/, '').replace(/;\s*$/, '');
    try {
        // Evaluate the JS object (carefully, this is safe since it's just strings)
        return eval('(' + jsonStr + ')');
    } catch (e) {
        console.error("Failed to parse " + filePath, e);
        return {};
    }
}

function saveLocale(filePath, obj) {
    const jsonStr = JSON.stringify(obj, null, 2);
    fs.writeFileSync(filePath, 'export default ' + jsonStr + ';\n');
}

const en = loadLocale(enPath);
const hi = loadLocale(hiPath);
const kn = loadLocale(knPath);

function setNested(obj, keyPath, value) {
    const keys = keyPath.split('.');
    let curr = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (!curr[keys[i]]) curr[keys[i]] = {};
        curr = curr[keys[i]];
    }
    curr[keys[keys.length - 1]] = value;
}

// Function to translate in batches to avoid rate limit or long strings
async function translateBatch(texts, to) {
    const results = [];
    for (let i = 0; i < texts.length; i++) {
        try {
            // Wait 200ms between requests to avoid rate limits
            await new Promise(r => setTimeout(r, 200));
            const res = await translate(texts[i], { to });
            results.push(res.text);
        } catch (e) {
            console.error("Translation error for", texts[i], e);
            results.push(texts[i]); // fallback to original
        }
    }
    return results;
}

async function run() {
    console.log("Adding missing to EN...");
    for (const item of missingData.missingInEn) {
        if (item.default) {
            setNested(en, item.key, item.default);
        } else {
            // Provide sensible defaults
            if (item.key === 'nfc.securityAlert') setNested(en, item.key, 'NFC Security Alert');
            if (item.key === 'common.back') setNested(en, item.key, 'Back');
        }
    }
    saveLocale(enPath, en);
    console.log("Saved EN.");

    // Filter hi missing: either in missingInHi or just not correctly defined
    // Many are missing in HI because they are literally english in hi.js or entirely absent.
    const keysToTranslateForHi = [];
    const stringsToTranslateForHi = [];
    
    // Instead of using missingInHi array directly, let's just collect all keys from EN that are missing in HI or match EN exactly (untranslated).
    // Actually we can do it recursively across EN
    function gatherMissing(enObj, hiObj, knObj, pathPrefix = '') {
        for (const key in enObj) {
            const currentPath = pathPrefix ? `${pathPrefix}.${key}` : key;
            const enVal = enObj[key];
            if (typeof enVal === 'object' && enVal !== null) {
                gatherMissing(enVal, hiObj?.[key], knObj?.[key], currentPath);
            } else if (typeof enVal === 'string') {
                const hiVal = hiObj?.[key];
                const knVal = knObj?.[key];
                
                // If hi is missing, or is same as en (and it contains english characters), it needs translation
                if (!hiVal || (hiVal === enVal && /[a-zA-Z]/.test(hiVal))) {
                    keysToTranslateForHi.push(currentPath);
                    stringsToTranslateForHi.push(enVal);
                }
            }
        }
    }
    gatherMissing(en, hi, kn);

    console.log(`Found ${keysToTranslateForHi.length} keys to translate to HI.`);
    const translatedHi = await translateBatch(stringsToTranslateForHi, 'hi');
    for (let i = 0; i < keysToTranslateForHi.length; i++) {
        setNested(hi, keysToTranslateForHi[i], translatedHi[i]);
    }
    saveLocale(hiPath, hi);
    console.log("Saved HI.");

    // Do same for KN
    const keysToTranslateForKn = [];
    const stringsToTranslateForKn = [];
    function gatherMissingKn(enObj, knObj, pathPrefix = '') {
        for (const key in enObj) {
            const currentPath = pathPrefix ? `${pathPrefix}.${key}` : key;
            const enVal = enObj[key];
            if (typeof enVal === 'object' && enVal !== null) {
                gatherMissingKn(enVal, knObj?.[key], currentPath);
            } else if (typeof enVal === 'string') {
                const knVal = knObj?.[key];
                if (!knVal || (knVal === enVal && /[a-zA-Z]/.test(knVal))) {
                    keysToTranslateForKn.push(currentPath);
                    stringsToTranslateForKn.push(enVal);
                }
            }
        }
    }
    gatherMissingKn(en, kn);

    console.log(`Found ${keysToTranslateForKn.length} keys to translate to KN.`);
    const translatedKn = await translateBatch(stringsToTranslateForKn, 'kn');
    for (let i = 0; i < keysToTranslateForKn.length; i++) {
        setNested(kn, keysToTranslateForKn[i], translatedKn[i]);
    }
    saveLocale(knPath, kn);
    console.log("Saved KN.");

    console.log("Done.");
}

run();
