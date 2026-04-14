// Build script to generate index.html content for Worker
// This ensures the Worker always has the latest frontend build
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Paths
const indexPath = path.join(rootDir, 'dist', 'index.html');
const outputPath = path.join(rootDir, 'src', 'generated-index.ts');

if (!fs.existsSync(indexPath)) {
  console.error('Error: dist/index.html not found. Run "npm run build:frontend" first.');
  process.exit(1);
}

const htmlContent = fs.readFileSync(indexPath, 'utf-8');

// Escape backticks and ${} for template literal
const escaped = htmlContent
  .replace(/\\/g, '\\\\')
  .replace(/`/g, '\\`')
  .replace(/\$\{/g, '\\${');

const output = `// AUTO-GENERATED - Do not edit manually
// Generated at build time from dist/index.html
export const INDEX_HTML = \`${escaped}\`;
`;

fs.writeFileSync(outputPath, output);
console.log('Generated src/generated-index.ts successfully');
