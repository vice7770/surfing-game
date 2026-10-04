import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, symlinkSync } from 'node:fs';
import path from 'node:path';
import ts from '/Users/regina/Desktop/Projects/surfing-game/node_modules/typescript/lib/typescript.js';

// Source/Git extraction and metadata only. This script imports no game or Vite runtime.
const repo = '/Users/regina/Desktop/Projects/surfing-game';
const root = '/private/tmp/contact-height-demand-build-20261004';
const baseline = 'ef60d3cee120d6b157fe94386d923b6b4392205b';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => `${JSON.stringify(value, null, 2)}\n`;
const tree = new Map(execFileSync('git', ['ls-tree', '-r', '-z', baseline], { cwd: repo }).toString().split('\0').filter(Boolean).map(line => {
  const match = /^(\d+) (\w+) ([0-9a-f]+)\t(.+)$/.exec(line);
  if (!match || match[2] !== 'blob') throw new Error(`Unexpected tree entry ${line}`);
  return [match[4], { mode: match[1], blob: match[3] }];
}));
const blobs = new Map();
function blob(file) {
  if (!tree.has(file)) throw new Error(`Missing Git blob ${file}`);
  if (!blobs.has(file)) {
    const bytes = execFileSync('git', ['cat-file', 'blob', tree.get(file).blob], { cwd: repo, maxBuffer: 16 * 1024 * 1024 });
    const gitHash = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    if (gitHash !== tree.get(file).blob) throw new Error(`Git content mismatch ${file}`);
    blobs.set(file, bytes);
  }
  return blobs.get(file);
}
const normalRoot = '/private/tmp/contact-normal-demand-prototype-20261004';
const heightRoot = '/private/tmp/contact-height-demand-prototype-20261004';
const normalPins = [
  ['src/wave/barrel/sweptLoft.ts', 57487, '45f827aa2dbaae335396d41e3f1f6f757e4a1da95ac9576c82dadc9a8c3680a6'],
  ['src/wave/barrel/sweptContact.ts', 28490, '2e4cc356b2a970b5fb545703996dfb9b63129b538ba1c41bd63aefbb888aff3b'],
  ['src/physics/PhysicalSurfWater.ts', 23535, '0968979485f03ed7df681203a081b1be417bcf3d7b4ebd11bd649377bda27a57'],
  ['src/wave/SurfZoneRunner.ts', 39955, '48892eea1be50a39708376662908511900ad02ef8d24f3fc361e69260372130f'],
  ['src/game/SurfZoneWorkerCore.ts', 7117, '284675cc587b9f12c70ae518d1a8c4f128396482883f549989fc69b327437a69'],
];
const heightPins = [
  ['src/wave/barrel/sweptLoft.ts', 60183, 'b67be715acd5b325347f04a226cb484c6bbda223ffee28f8bb55124397e4932e'],
  ['src/wave/barrel/sweptContact.ts', 29165, '45ea76c0e8fe4219b633e5ee65042ed0b578bf4b164329c834725041547e42ba'],
  ['src/physics/PhysicalSurfWater.ts', 26311, '5f0857dbca9c0e7b2e6af215b60bc72101f89d8081687602983f441af054d0cb'],
];
const overlays = [], finalOverlay = new Map();
for (const [stage, sourceRoot, pins] of [['normal', normalRoot, normalPins], ['height', heightRoot, heightPins]]) {
  for (const [file, bytes, hash] of pins) {
    const source = path.join(sourceRoot, file), data = readFileSync(source);
    if (data.length !== bytes || sha(data) !== hash) throw new Error(`Frozen overlay mismatch ${source}`);
    overlays.push({ stage, source, path: file, bytes, sha256: hash });
    finalOverlay.set(file, data);
  }
}
function resolve(from, specifier) {
  const clean = specifier.split(/[?#]/, 1)[0];
  const target = clean.startsWith('/') ? clean.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(from), clean));
  const candidates = [target, ...['.ts', '.tsx', '.js', '.mjs', '.json', '.css'].map(ext => `${target}${ext}`), ...['index.ts', 'index.tsx', 'index.js'].map(name => `${target}/${name}`)];
  if (target.endsWith('.js')) candidates.push(`${target.slice(0, -3)}.ts`);
  return candidates.find(file => tree.has(file));
}
function edgesIn(file, bytes) {
  const text = bytes.toString(), edges = [], nonliteral = [], assets = [];
  const add = (kind, specifier, node) => edges.push({ from: file, kind, specifier, line: node ? ts.getLineAndCharacterOfPosition(source, node.getStart(source)).line + 1 : 1 });
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const literal = node => node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : undefined;
  if (file.endsWith('.html')) {
    for (const match of text.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/g)) add('html-script', match[1]);
  } else if (file.endsWith('.css')) {
    for (const match of text.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']/g)) add('css-import', match[1]);
    for (const match of text.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)) {
      const spec = match[1];
      if (spec.startsWith('.')) add('css-url', spec);
      else if (!spec.startsWith('data:')) assets.push({ from: file, line: text.slice(0, match.index).split('\n').length, expression: spec, kind: 'css-url' });
    }
  } else if (/\.[cm]?[jt]sx?$/.test(file)) {
    function visit(node) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) add(ts.isImportDeclaration(node) ? 'static-import' : 'export-from', literal(node.moduleSpecifier), node);
      if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) add('import-type', literal(node.argument.literal), node);
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const spec = literal(node.arguments[0]);
        if (spec === undefined) nonliteral.push({ from: file, line: ts.getLineAndCharacterOfPosition(source, node.getStart(source)).line + 1, kind: 'dynamic-import', expression: node.getText(source) });
        else add('dynamic-import', spec, node);
      }
      if (ts.isNewExpression(node) && node.expression.getText(source) === 'URL' && node.arguments?.[1]?.getText(source) === 'import.meta.url') {
        const spec = literal(node.arguments[0]);
        if (spec === undefined) nonliteral.push({ from: file, line: ts.getLineAndCharacterOfPosition(source, node.getStart(source)).line + 1, kind: 'import-meta-url', expression: node.getText(source) });
        else add('import-meta-url', spec, node);
      }
      if (ts.isCallExpression(node) && ['import.meta.glob', 'require'].includes(node.expression.getText(source))) nonliteral.push({ from: file, line: ts.getLineAndCharacterOfPosition(source, node.getStart(source)).line + 1, kind: 'unhandled-special-import', expression: node.getText(source) });
      if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && node.text.startsWith('/') && !node.text.startsWith('//') && node.text.length > 1) assets.push({ from: file, line: ts.getLineAndCharacterOfPosition(source, node.getStart(source)).line + 1, expression: node.text, kind: 'root-path-literal' });
      if (ts.isTemplateExpression(node) && node.head.text.startsWith('/') && !node.head.text.startsWith('//')) assets.push({ from: file, line: ts.getLineAndCharacterOfPosition(source, node.getStart(source)).line + 1, expression: node.getText(source), kind: 'root-path-template' });
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  return { edges, nonliteral, assets };
}
const metadata = ['package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts'];
const declarations = [...tree.keys()].filter(file => file.startsWith('src/') && file.endsWith('.d.ts'));
const arms = [];
for (const arm of ['baseline', 'candidate']) {
  const armRoot = path.join(root, arm);
  if (existsSync(armRoot)) throw new Error(`Refuse to overwrite prepared arm ${armRoot}`);
  const queue = ['index.html', ...metadata, ...declarations], seen = new Set(), edges = [], externalModules = [], blockers = [], assets = [];
  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    seen.add(file);
    const data = arm === 'candidate' && finalOverlay.has(file) ? finalOverlay.get(file) : blob(file);
    const parsed = edgesIn(file, data);
    blockers.push(...parsed.nonliteral); assets.push(...parsed.assets);
    for (const edge of parsed.edges) {
      if (typeof edge.specifier !== 'string') { blockers.push({ ...edge, reason: 'module specifier is not literal' }); continue; }
      if (edge.specifier.startsWith('.') || edge.specifier.startsWith('/')) {
        const resolved = resolve(file, edge.specifier);
        edges.push({ ...edge, resolved: resolved ?? null });
        if (resolved) queue.push(resolved); else blockers.push({ ...edge, reason: 'unresolved literal relative/root module' });
      } else externalModules.push(edge);
    }
  }
  for (const overlay of overlays) if (arm === 'candidate' && !seen.has(overlay.path)) blockers.push({ path: overlay.path, reason: 'approved overlay not reached by literal client closure' });
  const files = [];
  for (const file of [...seen].sort()) {
    const original = blob(file), data = arm === 'candidate' && finalOverlay.has(file) ? finalOverlay.get(file) : original;
    const destination = path.join(armRoot, file); mkdirSync(path.dirname(destination), { recursive: true }); writeFileSync(destination, data);
    files.push({ path: file, gitBlob: tree.get(file).blob, gitMode: tree.get(file).mode, baselineBytes: original.length, baselineSha256: sha(original), bytes: data.length, sha256: sha(data), finalOverlayStage: arm === 'candidate' && finalOverlay.has(file) ? [...overlays].reverse().find(o => o.path === file).stage : null });
  }
  symlinkSync(path.join(repo, 'node_modules'), path.join(armRoot, 'node_modules'));
  const strict = { extends: './tsconfig.json', compilerOptions: { noEmit: true, incremental: false }, include: ['src'] };
  writeFileSync(path.join(armRoot, 'tsconfig.build.json'), json(strict));
  arms.push({ arm, root: armRoot, files, literalEdges: edges, externalModules, nonliteralOrResolutionBlockers: blockers, rootPathExpressionsForAssetReview: assets, ambientDeclarations: declarations, fileCount: files.length, bytes: files.reduce((sum, f) => sum + f.bytes, 0) });
}
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo }).toString().trim();
const versions = {};
for (const name of ['vite', 'typescript', 'three']) {
  const file = path.join(repo, 'node_modules', name, 'package.json'), data = readFileSync(file);
  versions[name] = { version: JSON.parse(data).version, packageJson: file, bytes: data.length, sha256: sha(data) };
}
const result = { schema: 'contact-height-two-arm-build-source/v1', stage: 'source-only preparation; strict/build unexecuted', baseline, documentationHeadAtPreparation: head, node: process.version, versions, extraction: 'Git tree/blob SHA-1 checked; TypeScript AST literal imports/exports/import types/dynamic imports/import.meta URLs + HTML/CSS edges; no game import, typecheck, build, timing or hardware', overlaysAppliedInOrder: overlays, dependencyUse: 'Per-arm node_modules symlinks are read-only-use; proposed runner config loader and per-arm cache avoid default .vite-temp writes through these links.', publicAssetsCopied: false, fullRepositoryCopied: false, arms };
writeFileSync(path.join(root, 'source-manifest.json'), json(result));
console.log(JSON.stringify({ path: path.join(root, 'source-manifest.json'), bytes: Buffer.byteLength(json(result)), sha256: sha(Buffer.from(json(result))), arms: arms.map(a => ({ arm: a.arm, files: a.fileCount, bytes: a.bytes, edges: a.literalEdges.length, externalModules: a.externalModules.length, blockers: a.nonliteralOrResolutionBlockers, assetExpressions: a.rootPathExpressionsForAssetReview.length })), documentationHead: head, versions }));
