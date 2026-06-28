# SHTC — Simple Hyper Text Components

> **SHTC (Simple Hyper Text Components)** is a lightweight static site generator.  
> Tired of rewriting vanilla HTML, CSS, or JS every time you dynamically insert content — only to deal with **flickering**?  
> **This is the solution.**

Components are resolved at **build time** — the output is plain HTML with zero JavaScript overhead and no flickering.

---

## Install

```bash
npm install -g shtc
# or
pnpm add -g shtc
# or use directly with npx
npx shtc build
```

---

## CLI Usage

```
shtc <command> [options]
```

### Commands

| Command | Description |
|---------|-------------|
| `shtc build`         | Build the project (default command) |
| `shtc serve`         | Start dev server with live reload |
| `shtc dev`           | Alias for `serve` |
| `shtc init [dir]`    | Scaffold a new SHTC project |

### Options

| Option | Description |
|--------|-------------|
| `--input <dir>`  | Input directory (default: `src` or from config) |
| `--output <dir>` | Output directory (default: `output` or from config) |
| `--port <port>`  | Port for dev server (default: `3000`) |
| `--host <host>`  | Host for dev server (default: `localhost`) |
| `--no-clean`     | Don't clean output directory before build |
| `--force`        | Overwrite existing files on `init` |
| `-h, --help`     | Show help |
| `-v, --version`  | Show version |

### Examples

```bash
# Build the project
shtc build

# Start dev server on port 8080
shtc serve --port 8080

# Scaffold a new project
shtc init my-project

# Custom directories
shtc build --input src --output dist
```

---

## Project Structure

```
my-project/
├── components/        ← Your reusable HTML components
│   └── example/
│       └── hello.html
├── src/               ← Your source pages and assets
│   ├── index.html
│   ├── main.js
│   └── main.css
├── output/            ← Build output (generated)
├── config.cfg         ← SHTC configuration
└── package.json       ← Your project (add "shtc" as dependency)
```

---

## How Components Work

Place a `<component>` tag in your HTML:

```html
<component src="example/hello" />
```

At build time, SHTC resolves the tag and inlines the component content:

```html
<!-- Before (source) -->
<component src="example/hello" />

<!-- After (output) -->
<div class="hello-component">
    <h2>Hello from component!</h2>
</div>
```

**No flickering** — the content is already in the HTML when the browser loads it.

---

## Source Paths Reference

| Prefix | Path Resolution | Use Case |
|--------|----------------|----------|
| `src="route/to/comp"` | `components/route/to/comp` → `SHTC/BIComponents/route/to/comp` | Standard & built-in components |
| `src="#route/to/comp"` | `src/route/to/comp` | Referencing a page as component |
| `src="%route/to/comp"` | `route/to/comp` (project root) | Absolute project path |

Built-in components (shipped with SHTC) are resolved from the package's `SHTC/BIComponents/` directory as a final fallback.

---

## Programmatic API

```javascript
import { build, serve, initProject } from 'shtc';

// Build programmatically
await build({ input: 'src', output: 'dist', root: process.cwd() });

// Start dev server
const { server, close } = await serve({ port: 3000 });

// Scaffold a project
initProject('./my-project');
```

---

## License

MIT