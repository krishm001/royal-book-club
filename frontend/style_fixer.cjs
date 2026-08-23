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

  let hasChanges = false;

  traverse(ast, {
    ObjectProperty(path) {
      if (t.isIdentifier(path.node.key) || t.isStringLiteral(path.node.key)) {
        const keyName = path.node.key.name || path.node.key.value;
        if (t.isStringLiteral(path.node.value) || t.isTemplateLiteral(path.node.value)) {
            let val = '';
            if (t.isStringLiteral(path.node.value)) {
                val = path.node.value.value;
            } else if (t.isTemplateLiteral(path.node.value) && path.node.value.quasis.length === 1) {
                val = path.node.value.quasis[0].value.raw;
            }

            if (!val) return;

            let newVal = val;

            if (keyName === 'background' || keyName === 'backgroundColor') {
                if (/rgba\(0,\s*0,\s*0,\s*0\.[0-9]+\)/.test(val)) {
                    newVal = 'var(--glass-bg)';
                } else if (/rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)/.test(val)) {
                    newVal = 'var(--glass-bg)';
                } else if (val.toLowerCase() === '#fff' || val.toLowerCase() === '#ffffff' || val.toLowerCase() === 'white') {
                    newVal = 'var(--surface)';
                } else if (val.toLowerCase() === '#000' || val.toLowerCase() === '#000000' || val.toLowerCase() === 'black') {
                    newVal = 'var(--surface-elevated)';
                }
            }

            if (keyName === 'color') {
                if (val.toLowerCase() === '#fff' || val.toLowerCase() === '#ffffff' || val.toLowerCase() === 'white') {
                    newVal = 'var(--text-primary)';
                } else if (val.toLowerCase() === '#000' || val.toLowerCase() === '#000000' || val.toLowerCase() === 'black') {
                    newVal = 'var(--text-primary)';
                } else if (/rgba\(255,\s*255,\s*255,\s*0\.[789]\)/.test(val) || /rgba\(0,\s*0,\s*0,\s*0\.[789]\)/.test(val)) {
                    newVal = 'var(--text-primary)';
                } else if (/rgba\(255,\s*255,\s*255,\s*0\.[456]\)/.test(val) || /rgba\(0,\s*0,\s*0,\s*0\.[456]\)/.test(val)) {
                    newVal = 'var(--text-secondary)';
                } else if (/rgba\(255,\s*255,\s*255,\s*0\.[123]\)/.test(val) || /rgba\(0,\s*0,\s*0,\s*0\.[123]\)/.test(val)) {
                    newVal = 'var(--text-muted)';
                }
            }

            if (keyName === 'borderColor' || keyName === 'border') {
                if (/rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)/.test(val)) {
                    newVal = val.replace(/rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)/, 'var(--glass-border)');
                } else if (/rgba\(0,\s*0,\s*0,\s*0\.[0-9]+\)/.test(val)) {
                    newVal = val.replace(/rgba\(0,\s*0,\s*0,\s*0\.[0-9]+\)/, 'var(--glass-border)');
                }
            }
            
            if (keyName === 'boxShadow') {
                if (/rgba\(0,\s*0,\s*0,\s*0\.[0-9]+\)/.test(val)) {
                    newVal = val.replace(/rgba\(0,\s*0,\s*0,\s*0\.[0-9]+\)/, 'var(--card-shadow)');
                }
            }

            if (newVal !== val) {
                if (t.isStringLiteral(path.node.value)) {
                    path.node.value = t.stringLiteral(newVal);
                } else {
                    path.node.value = t.templateLiteral([t.templateElement({raw: newVal, cooked: newVal})], []);
                }
                hasChanges = true;
            }
        }
      }
    }
  });

  if (hasChanges) {
    const output = generate(ast, { retainLines: false }).code;
    fs.writeFileSync(file, output, 'utf8');
  }
});
console.log("Style fixes applied.");
