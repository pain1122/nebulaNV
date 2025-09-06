// Emits dist/index.d.ts that re-exports from generated/*
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const dts = [
  'export * as userv1 from "../generated/user";',
  'export * as authv1 from "../generated/auth";',
  ''
].join('\n');

fs.writeFileSync(path.join(outDir, 'index.d.ts'), dts, 'utf8');
console.log('[protos] wrote dist/index.d.ts');
