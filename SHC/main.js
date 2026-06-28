#!/usr/bin/env bun
/**
 * SHTC — Simple HTML Components (Legacy entry)
 * =============================================
 * 
 * This file is kept for backward compatibility with `bun SHTC/main.js`.
 * It delegates to the core module.
 * 
 * For the CLI, use:  shtc build
 * For npm/pnpm:      npx shtc build
 * For programmatic:  import { build } from 'shtc'
 */

import { build } from '../core/index.js';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_ROOT = process.cwd();

// Try to read config for defaults, but we just delegate to core
const configPath = join(PROJECT_ROOT, 'config.cfg');

console.log('');
console.log('  ╔═════════════════════════════════════╗');
console.log('  ║  SHTC — Simple Hyper Text Components║');
console.log('  ║  (Legacy mode — use "shtc build")   ║');
console.log('  ╚═════════════════════════════════════╝');
console.log('');

build({ root: PROJECT_ROOT }).catch(err => {
    console.error(`[SHTC] Error: ${err.message}`);
    process.exit(1);
});
