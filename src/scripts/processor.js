/**
 * processor.js — roxul HTML Processor
 *
 * Resolves <component> tags recursively in HTML files and
 * walks the source directory tree to produce the build output.
 */

import { readFileSync, readdirSync, writeFileSync, copyFileSync, existsSync, mkdirSync, join, relative, dirname, basename } from './runtime.js';
import { MAX_COMPONENT_DEPTH } from './constants.js';
import { resolveComponentPath, resolveJsAssetPath, resolveCssAssetPath } from './resolver.js';
import { findComponentTags } from './parser.js';
import { dim, cyan } from './color.js';

/**
 * Extract <script> and <style> tags from component HTML content.
 * Handles both inline content (<script>code</script>) and external imports (<script src="..." /> or <script src="..."></script>).
 * Saves extracted content to /cif/ folder and returns cleaned HTML.
 *
 * @param {string} html         - Component HTML content
 * @param {string} componentName - Component name (used for file naming)
 * @param {string} outputDir    - Output directory root
 * @param {string} projectRoot  - Project root for path resolution
 * @param {object} log          - Logger { info, warn }
 * @returns {string} HTML with <script> and <style> tags removed
 */
function extractAndSaveComponentAssets(html, componentName, outputDir, projectRoot, log) {
    const cifDir = join(outputDir, 'cif');
    if (!existsSync(cifDir)) {
        mkdirSync(cifDir, { recursive: true });
    }

    let result = html;
    let hasChanges = false;

    // Extract <script> tags - handle:
    // 1. <script src="..." /> (self-closing)
    // 2. <script src="..."></script> (explicit closing, possibly with content)
    // 3. <script>content</script> (inline content)
    // Regex matches opening tag with src, then finds corresponding closing tag
    const scriptRegex = /<script\s+src\s*=\s*"([^"]*)"\s*\/>|<script\s+src\s*=\s*'([^']*)'\s*\/>|<script\s+src\s*=\s*"([^"]*)"\s*>([\s\S]*?)<\/script>|<script\s+src\s*=\s*'([^']*)'\s*>([\s\S]*?)<\/script>|<script>([\s\S]*?)<\/script>/gi;
    const scriptMatches = [...result.matchAll(scriptRegex)];
    if (scriptMatches.length > 0) {
        let jsContent = '';
        for (const match of scriptMatches) {
            // match[1] = double-quoted src (self-closing), match[2] = single-quoted src (self-closing)
            // match[3] = double-quoted src (explicit closing), match[4] = content for explicit closing
            // match[5] = single-quoted src (explicit closing), match[6] = content for explicit closing
            // match[7] = inline content (no src)
            const src = match[1] || match[2] || match[3] || match[5];
            const inlineContent = match[4] || match[6] || match[7];

            if (src) {
                // Resolve external JS file using component resolution logic
                const resolved = resolveJsAssetPath(src, projectRoot);
                if (resolved.path) {
                    const externalContent = readFileSync(resolved.path, 'utf-8');
                    jsContent += externalContent + '\n';
                    log.info(`  ${cyan('→')} Imported JS from ${relative(projectRoot, resolved.path).replace(/\\/g, '/')}`);
                } else {
                    log.warn(`[roxul] JS asset not found: src="${src}"`);
                }
            } else if (inlineContent) {
                jsContent += inlineContent.trim() + '\n';
            }
        }

        if (jsContent.trim()) {
            const jsPath = join(cifDir, `${componentName}.js`);
            writeFileSync(jsPath, jsContent.trim(), 'utf-8');
            log.info(`  ${cyan('→')} Generated ${relative(outputDir, jsPath).replace(/\\/g, '/')}`);
        }
        result = result.replace(scriptRegex, '');
        hasChanges = true;
    }

    // Extract <style> tags - handle:
    // 1. <style src="..." /> (self-closing)
    // 2. <style src="..."></style> (explicit closing, possibly with content)
    // 3. <style>content</style> (inline content)
    const styleRegex = /<style\s+src\s*=\s*"([^"]*)"\s*\/>|<style\s+src\s*=\s*'([^']*)'\s*\/>|<style\s+src\s*=\s*"([^"]*)"\s*>([\s\S]*?)<\/style>|<style\s+src\s*=\s*'([^']*)'\s*>([\s\S]*?)<\/style>|<style>([\s\S]*?)<\/style>/gi;
    const styleMatches = [...result.matchAll(styleRegex)];
    if (styleMatches.length > 0) {
        let cssContent = '';
        for (const match of styleMatches) {
            const src = match[1] || match[2] || match[3] || match[5];
            const inlineContent = match[4] || match[6] || match[7];

            if (src) {
                // Resolve external CSS file using component resolution logic
                const resolved = resolveCssAssetPath(src, projectRoot);
                if (resolved.path) {
                    const externalContent = readFileSync(resolved.path, 'utf-8');
                    cssContent += externalContent + '\n';
                    log.info(`  ${cyan('→')} Imported CSS from ${relative(projectRoot, resolved.path).replace(/\\/g, '/')}`);
                } else {
                    log.warn(`[roxul] CSS asset not found: src="${src}"`);
                }
            } else if (inlineContent) {
                cssContent += inlineContent.trim() + '\n';
            }
        }

        if (cssContent.trim()) {
            const cssPath = join(cifDir, `${componentName}.css`);
            writeFileSync(cssPath, cssContent.trim(), 'utf-8');
            log.info(`  ${cyan('→')} Generated ${relative(outputDir, cssPath).replace(/\\/g, '/')}`);
        }
        result = result.replace(styleRegex, '');
        hasChanges = true;
    }

    // Clean up empty lines left by removed tags
    if (hasChanges) {
        result = result.replace(/\n{3,}/g, '\n\n').trim();
    }

    return result;
}

/**
 * Inject CSS and JS links for used components into the HTML head.
 *
 * @param {string} html           - Processed HTML
 * @param {Set<string>} usedComponents - Set of component names used on this page
 * @param {string} outputDir      - Output directory root
 * @param {string} outputFilePath - Output file path (for relative path calculation)
 * @returns {string} HTML with injected assets in <head>
 */
function injectComponentAssets(html, usedComponents, outputDir, outputFilePath) {
    if (usedComponents.size === 0) return html;

    const cifDir = join(outputDir, 'cif');
    if (!existsSync(cifDir)) return html;

    // Build link and script tags for each used component
    const cssLinks = [];
    const jsScripts = [];

    for (const compName of usedComponents) {
        const cssPath = join(cifDir, `${compName}.css`);
        const jsPath = join(cifDir, `${compName}.js`);

        if (existsSync(cssPath)) {
            const relPath = relative(dirname(outputFilePath), cssPath).replace(/\\/g, '/');
            // Use a data attribute to track which component this belongs to for deduplication
            cssLinks.push(`<link rel="stylesheet" href="${relPath}" data-roxul-component="${compName}">`);
        }
        if (existsSync(jsPath)) {
            const relPath = relative(dirname(outputFilePath), jsPath).replace(/\\/g, '/');
            jsScripts.push(`<script src="${relPath}" data-roxul-component="${compName}"></script>`);
        }
    }

    if (cssLinks.length === 0 && jsScripts.length === 0) return html;

    // Deduplicate by component name (in case same component used multiple times)
    // Use separate sets for CSS and JS so a component with both CSS and JS gets both injected
    const seenCssComponents = new Set();
    const seenJsComponents = new Set();
    const uniqueCssLinks = [];
    const uniqueJsScripts = [];

    for (const link of cssLinks) {
        const match = link.match(/data-roxul-component="([^"]+)"/);
        if (match && !seenCssComponents.has(match[1])) {
            seenCssComponents.add(match[1]);
            uniqueCssLinks.push(link);
        }
    }

    for (const script of jsScripts) {
        const match = script.match(/data-roxul-component="([^"]+)"/);
        if (match && !seenJsComponents.has(match[1])) {
            seenJsComponents.add(match[1]);
            uniqueJsScripts.push(script);
        }
    }

    // Inject into <head>
    const headEndIndex = html.indexOf('</head>');
    if (headEndIndex !== -1) {
        const injection = [...uniqueCssLinks, ...uniqueJsScripts].join('\n    ');
        return html.slice(0, headEndIndex) + '\n    ' + injection + '\n' + html.slice(headEndIndex);
    }

    // If no <head>, try to inject after <html> or at start
    const htmlStartIndex = html.indexOf('<html');
    if (htmlStartIndex !== -1) {
        const gtIndex = html.indexOf('>', htmlStartIndex);
        if (gtIndex !== -1) {
            const injection = [...uniqueCssLinks, ...uniqueJsScripts].join('\n    ');
            return html.slice(0, gtIndex + 1) + '\n<head>\n    ' + injection + '\n</head>' + html.slice(gtIndex + 1);
        }
    }

    // Fallback: prepend
    const injection = [...uniqueCssLinks, ...uniqueJsScripts].join('\n    ');
    return '<head>\n    ' + injection + '\n</head>\n' + html;
}

/**
 * Process an HTML string: resolve all <component> tags recursively.
 *
 * @param {string} html         - Raw HTML
 * @param {string} projectRoot  - Project root for path resolution
 * @param {string} outputDir    - Output directory root (for saving CIF assets)
 * @param {Set<string>} usedComponents - Set to track components used on this page
 * @param {number} depth        - Recursion depth (internal)
 * @param {object} [log]        - Optional logger { info, warn }
 * @returns {string} Processed HTML
 */
export function processHtml(html, projectRoot, outputDir, usedComponents, depth = 0, log = null) {
    const logger = log || console;

    if (depth > MAX_COMPONENT_DEPTH) {
        logger.warn(
            `[roxul] Max depth (${MAX_COMPONENT_DEPTH}) reached — possible circular reference.`,
        );
        return html;
    }

    const tags = findComponentTags(html);
    if (tags.length === 0) return html;

    let result = html;

    for (let i = tags.length - 1; i >= 0; i--) {
        const { start, end, src } = tags[i];
        const resolved = resolveComponentPath(src, projectRoot);

        if (!resolved.path) {
            logger.warn(`[roxul] Component not found: src="${src}"`);
            const comment = `\n<!-- roxul: component not found "${src}" -->\n`;
            result = result.slice(0, start) + comment + result.slice(end);
            continue;
        }

        let content;
        try {
            content = readFileSync(resolved.path, 'utf-8');
        } catch (err) {
            logger.warn(`[roxul] Error reading component "${src}": ${err.message}`);
            const comment = `\n<!-- roxul: error reading component "${src}" -->\n`;
            result = result.slice(0, start) + comment + result.slice(end);
            continue;
        }

        // Extract component name from the resolved path (filename without extension)
        const componentName = basename(resolved.path, '.html').replace(/\.htm$/, '');

        // Extract <js> and <css> tags from component content and save to /cif/
        content = extractAndSaveComponentAssets(content, componentName, outputDir, projectRoot, logger);

        // Track this component as used on the current page
        usedComponents.add(componentName);

        // Replace %%placeholder%% tokens with the corresponding attribute values
        const { attrs } = tags[i];
        content = content.replace(/%%([^%]+)%%/g, (match, name) => {
            return name in attrs ? attrs[name] : match;
        });

        // Recursively process nested components, passing outputDir and usedComponents
        content = processHtml(content, projectRoot, outputDir, usedComponents, depth + 1, logger);

        // ── Indentation handling ─────────────────────────────────────────────
        // Preserve original indentation of the <component> tag and prepend it
        // to each line of the inserted content.
        let lineStart = result.lastIndexOf('\n', start - 1);
        let baseIndent = '';
        if (lineStart !== -1) {
            const beforeTag = result.slice(lineStart + 1, start);
            const m = beforeTag.match(/^[ \t]*/);
            baseIndent = m ? m[0] : '';
        } else {
            const beforeTag = result.slice(0, start);
            const m = beforeTag.match(/^[ \t]*/);
            baseIndent = m ? m[0] : '';
        }

        // Remove common leading indentation from the component content to avoid
        // double indentation on the first line.
        const lines = content.split('\n');
        let minIndent = null;
        for (const l of lines) {
            if (l.trim() === '') continue;
            const m = l.match(/^[ \t]*/);
            const indent = m ? m[0].length : 0;
            if (minIndent === null || indent < minIndent) minIndent = indent;
        }
        const dedentedLines = lines.map((l) => {
            if (minIndent && l.length >= minIndent) {
                return l.slice(minIndent);
            }
            return l;
        });

        // Build the final content: first line stays as-is, subsequent lines
        // get the baseIndent prefixed.
        let indentedContent = '';
        if (dedentedLines.length > 0) {
            indentedContent = dedentedLines[0];
            if (dedentedLines.length > 1) {
                const rest = dedentedLines
                    .slice(1)
                    .map((line) => baseIndent + line)
                    .join('\n');
                indentedContent += '\n' + rest;
            }
        }

        result = result.slice(0, start) + indentedContent + result.slice(end);

        if (logger.info) {
            const indent = '  '.repeat(depth + 2);
            const compPath = relative(projectRoot, resolved.path).replace(/\\/g, '/');
            logger.info(`${indent}${dim('└──')} ${dim(compPath)}`);
        }
    }

    return result;
}

/**
 * Recursively process a directory: build HTML files, copy non-HTML assets.
 *
 * @param {string} rootDir      - Root input directory (for computing relative paths)
 * @param {string} currentDir   - Current directory being processed
 * @param {string} outputDir    - Output directory root
 * @param {string} projectRoot  - Project root for component resolution
 * @param {object} log          - Logger { info, warn }
 */
export function processDirectory(rootDir, currentDir, outputDir, projectRoot, log) {
    let entries;
    try {
        entries = readdirSync(currentDir, { withFileTypes: true });
    } catch (err) {
        log.warn(`[roxul] Error reading directory "${currentDir}": ${err.message}`);
        return;
    }

    for (let i = 0; i < entries.length; i++) {
        const entry      = entries[i];
        const isLast     = i === entries.length - 1;
        const treePrefix = isLast ? '└── ' : '├── ';
        const fullPath     = join(currentDir, entry.name);
        const relativePath = relative(rootDir, fullPath).replace(/\\/g, '/');
        const outputPath   = join(outputDir, relativePath);

        if (entry.isDirectory()) {
            log.info(`  ${treePrefix}${cyan(entry.name + '/')}`);
            if (!existsSync(outputPath)) {
                mkdirSync(outputPath, { recursive: true });
            }
            processDirectory(rootDir, fullPath, outputDir, projectRoot, log);
        } else if (entry.isFile() && /\.html?$/i.test(entry.name)) {
            log.info(`  ${treePrefix}${relativePath}`);
            try {
                const html      = readFileSync(fullPath, 'utf-8');
                const usedComponents = new Set();
                const processed = processHtml(html, projectRoot, outputDir, usedComponents, 0, log);
                const finalHtml = injectComponentAssets(processed, usedComponents, outputDir, outputPath);
                const outDir    = dirname(outputPath);
                if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
                writeFileSync(outputPath, finalHtml, 'utf-8');
            } catch (err) {
                log.warn(`[roxul] Error processing "${relativePath}": ${err.message}`);
            }
        } else if (entry.isFile()) {
            const outDir = dirname(outputPath);
            if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
            try {
                copyFileSync(fullPath, outputPath);
            } catch {
                /* ignore */
            }
        }
    }
}
