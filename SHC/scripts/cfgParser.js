/**
 * cfgParser.js — SHTC Config Parser (legacy re-export)
 * ====================================================
 * 
 * This file is kept for backward compatibility.
 * The actual implementation is now in core/cfgParser.js.
 * 
 * Please use: import { parseConfig, readConfigSync } from 'shtc';
 */

export {
    parseConfig,
    readConfigSync,
    findConfig,
} from '../../core/cfgParser.js';
