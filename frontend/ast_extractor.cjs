const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const srcDir = '/Users/deepikakumari/royalbookclub/frontend/src';

function walkSync(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    try {
      filelist = fs.statSync(dirFile).isDirectory()
        ? walkSync(dirFile, filelist)
        : filelist.concat(dirFile);
    } catch (err) {}
  });
  return filelist;
}

const files = walkSync(srcDir).filter(f => f.endsWith('.jsx'));
let globalCounter = 5000;
const extractedKeys = {};

function cleanString(str) {
  return str.replace(/\s+/g, ' ').trim();
}

const isLikelyCode = (str) => {
    return /^auto_/.test(str) || /^var\(/.test(str) || /^#\w+/.test(str) || /^rgba\(/.test(str);
};

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = parser.parse(content, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });
  } catch(e) {
    console.error("Parse error in", file, e);
    return;
  }

  let hasChanges = false;
  let hasUseLanguage = false;

  traverse(ast, {
    ImportDeclaration(path) {
      if (path.node.source.value.includes('LanguageContext')) {
        path.node.specifiers.forEach(specifier => {
          if (specifier.local.name === 'useLanguage') {
            hasUseLanguage = true;
          }
        });
      }
    },
    JSXText(path) {
      const text = path.node.value;
      if (text.trim().length > 1 && /[a-zA-Z]/.test(text) && !isLikelyCode(text.trim())) {
        const cleaned = cleanString(text);
        // Only extract if it doesn't look like code or existing translation
        if (!cleaned.includes('{t(') && cleaned !== 't') {
            const key = `str_${globalCounter++}`;
            extractedKeys[key] = cleaned;
            
            const callExp = t.callExpression(t.identifier('t'), [
                t.stringLiteral(key),
                t.stringLiteral(cleaned)
            ]);
            
            // Preserve leading/trailing spaces in JSX
            const leadingSpace = text.match(/^\s+/) ? ' ' : '';
            const trailingSpace = text.match(/\s+$/) ? ' ' : '';
            
            const container = t.jsxExpressionContainer(callExp);
            
            const replacements = [];
            if (leadingSpace) replacements.push(t.jsxText(' '));
            replacements.push(container);
            if (trailingSpace) replacements.push(t.jsxText(' '));
            
            path.replaceWithMultiple(replacements);
            hasChanges = true;
        }
      }
    },
    JSXAttribute(path) {
      const name = path.node.name.name;
      if (['placeholder', 'title', 'alt', 'label', 'aria-label'].includes(name)) {
        if (path.node.value && path.node.value.type === 'StringLiteral') {
          const text = path.node.value.value.trim();
          if (text.length > 0 && /[a-zA-Z]/.test(text) && !isLikelyCode(text)) {
            const key = `str_${globalCounter++}`;
            extractedKeys[key] = text;
            const callExp = t.callExpression(t.identifier('t'), [
                t.stringLiteral(key),
                t.stringLiteral(text)
            ]);
            path.node.value = t.jsxExpressionContainer(callExp);
            hasChanges = true;
          }
        }
      }
    }
  });

  if (hasChanges) {
    let output = generate(ast, { retainLines: false }).code;
    
    // Auto-inject useLanguage if missing
    if (!hasUseLanguage) {
      const depth = file.replace(srcDir, '').split('/').length - 2;
      const relativeContextPath = depth === 0 ? './i18n/LanguageContext' : '../'.repeat(depth) + 'i18n/LanguageContext';
      output = `import { useLanguage } from '${relativeContextPath}';\n` + output;
    }
    
    if (!output.match(/const\s*{\s*[^}]*t\b[^}]*}\s*=\s*useLanguage\(\)/)) {
        // Simple regex replace for hook injection
        const componentRegex = /(?:export\s+default\s+)?(?:function\s+[A-Z]\w*\s*\([^)]*\)\s*{|const\s+[A-Z]\w*\s*=\s*\([^)]*\)\s*=>\s*{)/;
        if (componentRegex.test(output)) {
            output = output.replace(componentRegex, (match) => `${match}\n  const { t } = useLanguage();\n`);
        }
    }
    
    fs.writeFileSync(file, output, 'utf8');
  }
});

fs.writeFileSync('/tmp/extracted_strings.json', JSON.stringify(extractedKeys, null, 2));
console.log(`Extracted ${Object.keys(extractedKeys).length} strings.`);
