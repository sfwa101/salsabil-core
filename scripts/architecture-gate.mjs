import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper to walk directories
function walkDir(dir, filterRegex, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walkDir(filePath, filterRegex, fileList);
    } else if (filterRegex.test(filePath)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

let hasBlock = false;
let hasWarning = false;

function logResult(ruleName, status, message) {
  const statusColors = {
    PASS: '\x1b[32m[PASS]\x1b[0m',
    WARNING: '\x1b[33m[WARNING]\x1b[0m',
    BLOCK: '\x1b[31m[BLOCK]\x1b[0m'
  };
  
  const icon = status === 'PASS' ? '✅' : status === 'WARNING' ? '⚠️ ' : '❌';
  console.log(`${icon} ${ruleName}... ${statusColors[status]}`);
  if (message) {
    console.log(`   └─ ${message}`);
  }
}

console.log('\n\x1b[1m[SALSABIL ARCHITECTURE GATE]\x1b[0m');
console.log('Running automated architectural checks...\n');

// -------------------------------------------------------------------------
// Rule 1: Stem Purity (BLOCK)
// Target: src/components/ui/*Stem*.tsx and src/components/ui/*Card*.tsx
// -------------------------------------------------------------------------
let rule1Status = 'PASS';
let rule1Messages = [];
const uiDir = path.join(rootDir, 'src', 'components', 'ui');
const stemFiles = walkDir(uiDir, /(Stem|Card)\.tsx$/);

const forbiddenStemImports = [
  { regex: /useDummyCart|DummyCartContext/, name: 'Cart Context' },
  { regex: /@supabase\/supabase-js|supabase/, name: 'Supabase' },
  { regex: /import\s+.*from\s+['"]axios['"]/, name: 'Axios' },
  { regex: /fetch\(/, name: 'Fetch API' }
];

const legacyTechDebt = [];

for (const file of stemFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const basename = path.basename(file);
  
  // Skip known tech debt files to achieve a clean baseline
  if (legacyTechDebt.includes(basename)) continue;

  for (const forbidden of forbiddenStemImports) {
    if (forbidden.regex.test(content)) {
      rule1Status = 'BLOCK';
      hasBlock = true;
      rule1Messages.push(`${path.relative(rootDir, file)} contains forbidden import/usage: ${forbidden.name}`);
    }
  }
}

logResult('Checking Stem Purity', rule1Status, rule1Messages.join('\n   └─ '));


// -------------------------------------------------------------------------
// Rule 2: Contract Strictness (BLOCK)
// Target: src/sdui/actions/action-contracts.ts
// -------------------------------------------------------------------------
let rule2Status = 'PASS';
let rule2Messages = [];
const actionsDir = path.join(rootDir, 'src', 'sdui', 'actions');
const contractFiles = walkDir(actionsDir, /contracts\.ts$/);

for (const file of contractFiles) {
  const content = fs.readFileSync(file, 'utf8');
  if (/payload:\s*any/.test(content)) {
    rule2Status = 'BLOCK';
    hasBlock = true;
    rule2Messages.push(`${path.relative(rootDir, file)} uses strongly forbidden 'payload: any'.`);
  }
}

logResult('Checking Action Contracts', rule2Status, rule2Messages.join('\n   └─ '));


// -------------------------------------------------------------------------
// Rule 3: SDUI Engine Isolation (BLOCK)
// Target: src/sdui/engine/PageEngine.tsx
// -------------------------------------------------------------------------
let rule3Status = 'PASS';
let rule3Messages = [];
const pageEnginePath = path.join(rootDir, 'src', 'sdui', 'engine', 'PageEngine.tsx');

if (fs.existsSync(pageEnginePath)) {
  const content = fs.readFileSync(pageEnginePath, 'utf8');
  const forbiddenEngineImports = [
    { regex: /context\/DummyCartContext/, name: 'Reef Cart Context' },
    { regex: /services\/dummy-ui-service/, name: 'Reef Dummy Services' },
    { regex: /supabase/, name: 'Supabase' },
    { regex: /app\/\(reef\)/, name: 'Reef Application Logic' }
  ];

  for (const forbidden of forbiddenEngineImports) {
    if (forbidden.regex.test(content)) {
      rule3Status = 'BLOCK';
      hasBlock = true;
      rule3Messages.push(`PageEngine.tsx contains forbidden Reef logic: ${forbidden.name}`);
    }
  }
}

logResult('Checking Engine Isolation', rule3Status, rule3Messages.join('\n   └─ '));


// -------------------------------------------------------------------------
// Rule 4: Data Resolver Boundaries (WARNING/BLOCK)
// Target: src/app/**/*.tsx (Next.js Pages)
// -------------------------------------------------------------------------
let rule4Status = 'PASS';
let rule4Messages = [];
const appDir = path.join(rootDir, 'src', 'app');
const pageFiles = walkDir(appDir, /page\.tsx$/);

for (const file of pageFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const relPath = path.relative(rootDir, file);
  
  // Exclude portability test page from warnings as it is designed for testing
  if (relPath.includes('test-portability')) continue;

  const hasPageEngine = content.includes('PageEngine');
  const hasDataResolver = content.includes('DataResolver');
  const importsDirectStem = /import\s+.*Stem.*from\s+['"]@\/components\/ui/.test(content);
  const fetchesData = /getDummyProducts|getDummyFeedItems|fetch\(/.test(content);

  // If a page fetches data and imports UI stems directly, but does NOT use PageEngine
  if (fetchesData && importsDirectStem && !hasPageEngine) {
    // This is a legacy page or a violation of SDUI flow
    rule4Status = 'BLOCK';
    hasBlock = true;
    rule4Messages.push(`${relPath} fetches data and renders Stems directly without PageEngine (SDUI flow).`);
  }
}

logResult('Checking Data Resolver Boundaries', rule4Status, rule4Messages.join('\n   └─ '));

console.log('\n------------------------------------------------');
if (hasBlock) {
  console.log('\x1b[31m❌ Architecture Gate Failed! Architectural violations found.\x1b[0m\n');
  process.exit(1);
} else if (hasWarning) {
  console.log('\x1b[33m⚠️  Architecture Gate Passed with Warnings. Please review suspicious patterns.\x1b[0m\n');
  process.exit(0);
} else {
  console.log('\x1b[32m✅ Architecture Gate Passed! All rules respected.\x1b[0m\n');
  process.exit(0);
}
