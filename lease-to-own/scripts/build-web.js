#!/usr/bin/env node
/*
 * Builds a self-contained, deployable copy of the website.
 *
 *   node lease-to-own/scripts/build-web.js
 *
 * Copies the single-source-of-truth modules (data/cars.js, model/pricing.js)
 * into web/js/ so the static site can be hosted from web/ alone (e.g. Vercel).
 * The copies carry a banner — never edit them by hand; edit the source files
 * and re-run this script.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'web', 'js');
fs.mkdirSync(outDir, { recursive: true });

const files = [
  { src: path.join(root, 'data', 'cars.js'), dest: path.join(outDir, 'cars.js'), from: '../../data/cars.js' },
  { src: path.join(root, 'model', 'pricing.js'), dest: path.join(outDir, 'pricing.js'), from: '../../model/pricing.js' }
];

files.forEach(({ src, dest, from }) => {
  const banner = '/* AUTO-GENERATED from ' + from + ' by scripts/build-web.js — do not edit. */\n';
  fs.writeFileSync(dest, banner + fs.readFileSync(src, 'utf8'));
  console.log('built ' + path.relative(process.cwd(), dest));
});

console.log('web/ is now self-contained and ready to deploy.');
