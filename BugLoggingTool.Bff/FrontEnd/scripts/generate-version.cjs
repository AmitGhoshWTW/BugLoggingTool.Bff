// #!/usr/bin/env node
// /**
//  * scripts/generate-version.cjs
//  *
//  * Generates public/version.json before `vite build`.
//  * The Vite plugin will overwrite dist/version.json with the same data,
//  * but this script lets you inject release notes and the forceReload flag
//  * from your CI/CD pipeline before the build runs.
//  *
//  * Usage:
//  *   node scripts/generate-version.cjs
//  *   node scripts/generate-version.cjs --force-reload
//  *   node scripts/generate-version.cjs --notes "Fixed JIRA export" --notes "New screenshot blur"
//  *
//  * Azure DevOps example:
//  *   - script: node scripts/generate-version.cjs --notes "$(releaseNotes)"
//  *     displayName: 'Stamp version.json'
//  *   - script: npm run build
//  *     displayName: 'Build PWA'
//  */

// 'use strict';

// const { writeFileSync, readFileSync } = require('fs');
// const { resolve }                     = require('path');

// const pkg        = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8'));
// const args       = process.argv.slice(2);

// // ── Parse CLI args ────────────────────────────────────────────────────────────
// const forceReload = args.includes('--force-reload');
// const notes       = [];

// for (let i = 0; i < args.length; i++) {
//   if (args[i] === '--notes' && args[i + 1]) {
//     notes.push(args[i + 1]);
//     i++;
//   }
// }

// // ── Build ID ──────────────────────────────────────────────────────────────────
// // In CI, prefer BUILD_BUILDNUMBER (Azure DevOps) or GITHUB_RUN_NUMBER
// const ciBuildNum = process.env.BUILD_BUILDNUMBER
//                 || process.env.GITHUB_RUN_NUMBER
//                 || process.env.BUILD_NUMBER
//                 || Date.now().toString();

// const buildId = `${pkg.version}-${ciBuildNum}`;

// // ── Write version.json ────────────────────────────────────────────────────────
// const versionData = {
//   version:     pkg.version,
//   buildId,
//   deployedAt:  new Date().toISOString(),
//   forceReload,
//   releaseNotes: notes.length > 0 ? notes : [`v${pkg.version} release`]
// };

// const dest = resolve(__dirname, '../public/version.json');
// writeFileSync(dest, JSON.stringify(versionData, null, 2));

// console.log('✅ version.json written:');
// console.log(JSON.stringify(versionData, null, 2));

// if (forceReload) {
//   console.warn('\n⚠️  forceReload=true — ALL clients will be force-reloaded within 30s of receiving this version!\n');
// }

// #!/usr/bin/env node
/**
 * scripts/generate-version.cjs
 *
 * AUTO-INCREMENTS the patch version in package.json on every build.
 * No developer needs to manually touch the version number.
 *
 * Increment rules:
 *   --major  : 1.2.3 → 2.0.0  (breaking change)
 *   --minor  : 1.2.3 → 1.3.0  (new feature)
 *   (default): 1.2.3 → 1.2.4  (patch — every build)
 *   --no-bump: keep version as-is (CI read-only mode)
 *
 * Usage:
 *   node scripts/generate-version.cjs                  ← patch bump (default)
 *   node scripts/generate-version.cjs --minor          ← minor bump
 *   node scripts/generate-version.cjs --major          ← major bump
 *   node scripts/generate-version.cjs --no-bump        ← no bump (CI dry run)
 *   node scripts/generate-version.cjs --force-reload   ← patch + force all clients to reload
 *   node scripts/generate-version.cjs --notes "Fix X"  ← patch + release note
 *
 * Azure DevOps pipeline example:
 *   - script: node scripts/generate-version.cjs --notes "$(Build.SourceVersionMessage)"
 *     displayName: 'Auto-bump version'
 *   - script: npm run build
 *     displayName: 'Build PWA'
 */

'use strict';

const { writeFileSync, readFileSync } = require('fs');
const { resolve }                     = require('path');

const pkgPath = resolve(__dirname, '../package.json');
const pkg     = JSON.parse(readFileSync(pkgPath, 'utf8'));
const args    = process.argv.slice(2);

// ── Parse CLI flags ───────────────────────────────────────────────────────────
const forceReload = args.includes('--force-reload');
const noBump      = args.includes('--no-bump');
const bumpMajor   = args.includes('--major');
const bumpMinor   = args.includes('--minor');
const notes       = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--notes' && args[i + 1]) {
    notes.push(args[i + 1]);
    i++;
  }
}

// ── Auto-increment version ────────────────────────────────────────────────────
const [major, minor, patch] = pkg.version.split('.').map(Number);
let newVersion = pkg.version;

if (!noBump) {
  if (bumpMajor)      newVersion = `${major + 1}.0.0`;
  else if (bumpMinor) newVersion = `${major}.${minor + 1}.0`;
  else                newVersion = `${major}.${minor}.${patch + 1}`;  // default: patch

  // Write bumped version back into package.json
  pkg.version = newVersion;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`[BLT] Version bumped: ${major}.${minor}.${patch} → ${newVersion}`);
} else {
  console.log(`[BLT] No bump — keeping version: ${newVersion}`);
}

// ── Build ID ──────────────────────────────────────────────────────────────────
// CI systems inject a build number — prefer that over timestamp
// so the buildId is traceable back to the pipeline run
const ciBuildNum = process.env.BUILD_BUILDNUMBER   // Azure DevOps
                || process.env.GITHUB_RUN_NUMBER    // GitHub Actions
                || process.env.BUILD_NUMBER         // Jenkins
                || Date.now().toString();            // local dev fallback

const buildId = `${newVersion}-${ciBuildNum}`;

// ── Write public/version.json ─────────────────────────────────────────────────
// Vite plugin overwrites dist/version.json with the same data at build time.
// This copy in public/ is the source of truth for the plugin to read.
const versionData = {
  version:      newVersion,
  buildId,
  deployedAt:   new Date().toISOString(),
  forceReload,
  releaseNotes: notes.length > 0 ? notes : [`v${newVersion} release`]
};

const dest = resolve(__dirname, '../public/version.json');
writeFileSync(dest, JSON.stringify(versionData, null, 2) + '\n');

console.log('[BLT] version.json written:');
console.log(JSON.stringify(versionData, null, 2));

if (forceReload) {
  console.warn('\n⚠️  forceReload=true — ALL clients will be force-reloaded within 30s!\n');
}
