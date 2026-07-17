/**
 * Regenerate the *.css.js string modules from their source *.css files.
 * injectStyles.js imports these strings and injects them at runtime (Expo web
 * does not reliably import raw .css). Run after editing tokens.css / landing.css:
 *
 *   node frontend/landing/styles/gen-css-modules.js
 */
const fs = require('fs');
const path = require('path');

const files = ['tokens.css', 'landing.css'];
const dir = __dirname;

for (const file of files) {
  const cssPath = path.join(dir, file);
  const jsPath = path.join(dir, `${file}.js`);
  const css = fs.readFileSync(cssPath, 'utf8');
  const out = `export default ${JSON.stringify(css)};\n`;
  fs.writeFileSync(jsPath, out, 'utf8');
  console.log(`Generated ${file}.js (${css.length} chars)`);
}
