import { readdir, readFile, lstat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const skippedDirectories = new Set(['node_modules', '.git', '.next', 'local', 'dist', 'out', 'coverage', '.cache', '.vinext']);
const blockedExtensions = new Set(['.wz', '.exe', '.dll', '.msi', '.zip', '.rar', '.7z', '.sql', '.sqlite', '.sqlite3', '.db', '.mdb', '.p12', '.pfx', '.pem', '.key']);
const textExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md', '.txt', '.css', '.html', '.svg', '.yml', '.yaml', '.toml', '.xml', '.map', '.sql']);
const secretRules = [
  ['private-key-material', /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/],
  ['github-access-token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/],
  ['api-secret-token', /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{35,}\b/],
  ['aws-access-key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['credential-bearing-url', /\b(?:mysql|mariadb|postgres(?:ql)?|https?):\/\/[^\s/:"'`]+:[^\s/@"'`]+@[^\s/"'`]+/i],
];
const publicPrivateRules = [
  ['private-machine-path', /\b[A-Z]:[\\/]+(?:Users|ChatGPT|CodexWorktrees|BuildTemp|Staging)[\\/]|\/(?:home|Users)\/[A-Za-z0-9_. -]+\//i],
  ['private-network-address', /\b(?:100\.102\.140\.42|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|127\.0\.0\.1)\b/],
  ['server-only-environment-in-browser', /\bTRIXTER_(?:REGISTRATION_(?:GATEWAY_TOKEN|CSRF_SECRET|PROXY_SECRET|URL)|READ_API_(?:URL|TOKEN)|BRIDGE_[A-Z_]+|PUBLIC_SERVER_CONFIG)\b/],
  ['database-connection-in-browser', /\b(?:MYSQL_PASSWORD|MARIADB_PASSWORD|DATABASE_URL|DB_PASSWORD)\b|\b(?:mysql|mariadb):\/\//i],
  ['development-fixture-in-browser', /DEVELOPMENT_FIXTURE_DATA_ONLY|fixturePublicReadProvider/],
];
function normalized(file) { return file.replaceAll('\\', '/'); }
function issue(file, rule, content, match) {
  const index = match?.index ?? 0;
  return { file: normalized(file), rule, line: content.slice(0, index).split('\n').length };
}

/** High-confidence rules only; findings never print the matched secret. */
export function inspectText(file, content, { browser = false, allowUnavailableLegacyProvider = false } = {}) {
  const relative = normalized(file);
  const issues = [];
  for (const [rule, pattern] of [...secretRules, ...(browser ? publicPrivateRules : [])]) {
    const match = pattern.exec(content);
    const reservedTestUrl = rule === 'credential-bearing-url' && relative.startsWith('tests/')
      && match && /@[A-Za-z0-9.-]+\.(?:invalid|test)(?::\d+)?$/.test(match[0]);
    if (match && !reservedTestUrl) issues.push(issue(relative, rule, content, match));
  }
  const executable = /\.(?:tsx?|jsx?|mjs|cjs)$/.test(relative);
  if (executable && !relative.startsWith('tests/') && !relative.startsWith('tools/')) {
    const publicSecret = /\bNEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|PASSWORD|PRIVATE_KEY|DATABASE_URL|GATEWAY_TOKEN|CSRF_TOKEN)[A-Z0-9_]*\b/.exec(content);
    if (publicSecret) issues.push(issue(relative, 'public-secret-environment', content, publicSecret));
    if (/^(?:app|components)\//.test(relative)) {
      const fixtureImport = /(?:from\s*|import\s*\()["'][^"']*(?:lib\/data\/(?:provider|fixtures)|data\/fixtures)(?:\.[cm]?[jt]sx?)?["']/.exec(content);
      const unavailableCompatibilityImport = allowUnavailableLegacyProvider && fixtureImport
        && /(?:lib\/data\/provider)(?:\.[cm]?[jt]sx?)?["']$/.test(fixtureImport[0]);
      if (fixtureImport && !unavailableCompatibilityImport) issues.push(issue(relative, 'legacy-fixture-provider-reachable', content, fixtureImport));
    }
    if (/^[\s;]*["']use client["']/.test(content)) {
      const serverImport = /(?:from\s*|import\s*\()["'][^"']*portal\/(?:registration|integrations|data)(?:\.[cm]?[jt]sx?)?["']/.exec(content);
      if (serverImport) issues.push(issue(relative, 'server-module-imported-by-client', content, serverImport));
    }
  }
  // Config examples may name secrets, but must not contain a non-placeholder value.
  if (/(?:^|\/)(?:\.env(?:\.[^/]*)?|[^/]*config[^/]*\.(?:json|ya?ml|toml))$/i.test(relative)) {
    const assignments = /(?:^|\n)[\t ]*["']?([A-Z][A-Z0-9_]*(?:PASSWORD|SECRET|TOKEN|PRIVATE_KEY))["']?[\t ]*[:=][\t ]*["']?([^\r\n"']+)/g;
    for (const match of content.matchAll(assignments)) {
      const value = match[2].trim().replace(/[,;]$/, '');
      if (value && !/^(?:#|\$|<|replace|example|placeholder|your[_-]|changeme|test[_-]|false|true|null)/i.test(value)) issues.push(issue(relative, 'literal-secret-configuration', content, match));
    }
  }
  return issues;
}

export function inspectPublicationPath(file) {
  const relative = normalized(file);
  // Only this reviewed, authored view definition is source. Database dumps remain prohibited.
  if (blockedExtensions.has(path.extname(relative).toLowerCase()) && relative !== 'bridge/schema.sql') return { file: relative, rule: 'proprietary-or-sensitive-artifact', line: 1 };
  if (/(?:^|\/)\.env(?:\.|$)/.test(relative) && !relative.endsWith('.env.example')) return { file: relative, rule: 'private-environment-file', line: 1 };
  if (/(?:^|\/)(?:database\.ini|id_rsa|id_ed25519|credentials\.json)$/i.test(relative)) return { file: relative, rule: 'private-configuration-file', line: 1 };
  return null;
}

async function walk(directory, root, files, issues, skipBuild = true) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && skippedDirectories.has(entry.name) && skipBuild) continue;
    const absolute = path.join(directory, entry.name), relative = normalized(path.relative(root, absolute));
    if (entry.isSymbolicLink()) { issues.push({ file: relative, rule: 'publishable-symbolic-link', line: 1 }); continue; }
    if (entry.isDirectory()) await walk(absolute, root, files, issues, skipBuild);
    else if (entry.isFile()) {
      // Private local env/log/cache files are excluded from publication. A tracked copy is checked below.
      if (!relative.startsWith('public/') && (/^\.env(?!\.example$)/.test(relative) || /\.(?:log|tsbuildinfo)$/.test(relative) || relative === 'next-env.d.ts')) continue;
      files.add(relative);
    }
  }
}

export async function scanProject(root = process.cwd()) {
  root = path.resolve(root);
  const files = new Set(), issues = [];
  await walk(root, root, files, issues);
  // Include ignored-but-tracked files in this repository; never inspect the parent server repository index.
  try {
    const gitRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (path.resolve(gitRoot).toLowerCase() === root.toLowerCase()) {
      const tracked = execFileSync('git', ['ls-files', '-z', '--cached'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      for (const file of tracked.split('\0').filter(Boolean)) files.add(normalized(file));
    }
  } catch { /* A fresh local copy is checked through the publishable filesystem inventory. */ }
  let sources = 0, browserBundles = 0;
  const legacyProviderPath = path.join(root, 'lib', 'data', 'provider.ts');
  const legacyProvider = existsSync(legacyProviderPath) ? await readFile(legacyProviderPath, 'utf8') : '';
  // The retained V2 compatibility adapter may return empty unavailable envelopes; it cannot load fixtures or fetch.
  const allowUnavailableLegacyProvider = /source\s*:\s*['"]unavailable['"]/.test(legacyProvider)
    && /export\s+const\s+publicReadProvider\s*=\s*unavailableProvider\s*;/.test(legacyProvider)
    && !/fixturePublicReadProvider|withFixtureFallback|DEVELOPMENT_FIXTURE_DATA_ONLY|\bfetch\s*\(|(?:from\s*|import\s*\()['"][^'"]*fixtures/.test(legacyProvider);
  for (const file of files) {
    const absolute = path.resolve(root, file);
    if (!absolute.startsWith(root + path.sep)) { issues.push({ file, rule: 'path-outside-project', line: 1 }); continue; }
    if (!existsSync(absolute)) continue; // A staged deletion has no payload to publish.
    const blocked = inspectPublicationPath(file);
    if (blocked) issues.push(blocked);
    const stat = await lstat(absolute);
    if (!stat.isFile()) continue;
    if (textExtensions.has(path.extname(file).toLowerCase()) || path.basename(file) === '.env.example') {
      if (stat.size > 10 * 1024 * 1024) { issues.push({ file, rule: 'oversized-publishable-text', line: 1 }); continue; }
      sources++;
      issues.push(...inspectText(file, await readFile(absolute, 'utf8'), { browser: file.startsWith('public/'), allowUnavailableLegacyProvider }));
    }
  }
  const staticRoot = path.join(root, '.next', 'static');
  if (existsSync(staticRoot)) {
    const browserFiles = new Set(); await walk(staticRoot, root, browserFiles, issues, false);
    for (const file of browserFiles) if (textExtensions.has(path.extname(file).toLowerCase())) {
      browserBundles++;
      issues.push(...inspectText(file, await readFile(path.join(root, file), 'utf8'), { browser: true }));
    }
  }
  return { sources, browserBundles, issues };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = await scanProject();
  for (const finding of result.issues) console.error(`${finding.file}:${finding.line}: ${finding.rule}`);
  console.log(`Security scan: ${result.sources} publishable text files; ${result.browserBundles} browser bundles; ${result.issues.length} findings.`);
  if (!result.browserBundles) console.log('Browser bundles not present. Run the production build, then repeat this scan before publishing.');
  process.exitCode = result.issues.length ? 1 : 0;
}
