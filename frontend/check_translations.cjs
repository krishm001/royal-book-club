const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const srcDir = '/Users/deepikakumari/royalbookclub/frontend/src';
const localesDir = path.join(srcDir, 'i18n', 'locales');

const en = require(path.join(localesDir, 'en.js')).default || require(path.join(localesDir, 'en.js'));
const hi = require(path.join(localesDir, 'hi.js')).default || require(path.join(localesDir, 'hi.js'));
const kn = require(path.join(localesDir, 'kn.js')).default || require(path.join(localesDir, 'kn.js'));

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

const files = walkSync(srcDir).filter(f => f.endsWith('.jsx') || f.endsWith('.js') || f.endsWith('.tsx') || f.endsWith('.ts'));

const usedKeys = new Set();
const keyToDefault = {};
const keyLocations = {};

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = parser.parse(content, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });
  } catch(e) {
    return;
  }

  traverse(ast, {
    CallExpression(p) {
      if (p.node.callee.name === 't' && p.node.arguments.length > 0) {
        const keyNode = p.node.arguments[0];
        if (keyNode.type === 'StringLiteral') {
          const key = keyNode.value;
          usedKeys.add(key);
          
          if (!keyLocations[key]) keyLocations[key] = new Set();
          keyLocations[key].add(file.replace(srcDir, ''));

          if (p.node.arguments.length > 1) {
            const valNode = p.node.arguments[1];
            if (valNode.type === 'StringLiteral') {
              keyToDefault[key] = valNode.value;
            } else if (valNode.type === 'ObjectExpression') {
               // maybe defaultValue property
               const defaultProp = valNode.properties.find(prop => prop.key.name === 'defaultValue');
               if (defaultProp && defaultProp.value.type === 'StringLiteral') {
                 keyToDefault[key] = defaultProp.value.value;
               }
            }
          }
        }
      }
    }
  });
});

function getNested(obj, pathStr) {
  return pathStr.split('.').reduce((acc, part) => acc && acc[part], obj);
}

const missingInEn = [];
const missingInHi = [];
const missingInKn = [];

usedKeys.forEach(key => {
  const enVal = getNested(en, key);
  const hiVal = getNested(hi, key);
  const knVal = getNested(kn, key);
  
  if (!enVal) missingInEn.push(key);
  // Compare to enVal, sometimes it's identical meaning it wasn't translated
  if (!hiVal || hiVal === enVal && keyToDefault[key] !== hiVal) {
     // If hindi value is missing, or exactly the same as english (untranslated)
     if (!hiVal) missingInHi.push(key);
     else if (hiVal.match(/[a-zA-Z]/)) missingInHi.push(key + ' (untranslated)');
  }
  if (!knVal || knVal === enVal && keyToDefault[key] !== knVal) {
     if (!knVal) missingInKn.push(key);
     else if (knVal.match(/[a-zA-Z]/)) missingInKn.push(key + ' (untranslated)');
  }
});

fs.writeFileSync('/tmp/missing_translations.json', JSON.stringify({
  missingInEn: missingInEn.map(k => ({key: k, default: keyToDefault[k], locations: Array.from(keyLocations[k])})),
  missingInHi: missingInHi,
  missingInKn: missingInKn
}, null, 2));

console.log("Found", missingInEn.length, "missing in EN");
console.log("Found", missingInHi.length, "missing in HI");
console.log("Found", missingInKn.length, "missing in KN");
