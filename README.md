# Roxul

> **roxul** is a lightweight static site generator.  
> Tired of rewriting vanilla HTML, CSS, or JS every time you dynamically insert content — only to deal with **flickering**?  
> **This is the solution.**

Components are resolved at **build time** — the output is plain HTML with zero JavaScript overhead and no flickering.

---

## Install

```bash
npm install -g roxul
# or
pnpm add -g roxul
# or use directly with npx
npx roxul build
```

---

## CLI Usage

```
roxul <command> [options]
```

### Commands

| Command | Description |
|---------|-------------|
| `roxul build`         | Build the project (default command) |
| `roxul serve`         | Start dev server with live reload |
| `roxul dev`           | Alias for `serve` |
| `roxul init [dir]`    | Scaffold a new roxul project |

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
roxul build

# Start dev server on port 8080
roxul serve --port 8080

# Scaffold a new project
roxul init my-project

# Custom directories
roxul build --input src --output dist
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
├── config.cfg         ← roxul configuration
└── package.json       ← Your project (add "roxul" as dependency)
```

---

## How Components Work

Place a `<component>` tag in your HTML:

```html
<component src="example/hello" />
```

At build time, roxul resolves the tag and inlines the component content:

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

## Component Attributes (Placeholders)

You can make your components dynamic by inserting **`%%variable%%`** placeholders anywhere in their HTML, and then passing values via attributes on the `<component>` tag.

### Example

Component file `components/greeting.html`:

```html
<div class="greeting">
    <h1>%%title%%</h1>
    <p>%%message%%</p>
</div>
```

Usage in your page:

```html
<component src="greeting" title="Welcome!" message="This content was injected at build time." />
```

Output (built):

```html
<div class="greeting">
    <h1>Welcome!</h1>
    <p>This content was injected at build time.</p>
</div>
```

### Behavior

- If a `%%variable%%` has a matching attribute (e.g. `title="value"`), it is replaced with the attribute value.
- If no matching attribute exists, the placeholder is left **unchanged** in the output.
- Placeholders work with any attribute **except `src`**, which is reserved for component resolution.
- Attribute names map directly to placeholder names: `alt-text="Logo"` → `%%alt-text%%`.

---

## Component Internal Files (CIF) — `<script>` and `<css>` Tags

Components can optionally include **JavaScript** and **CSS** directly inside their HTML file using `<script>` and `<css>` tags. At build time, roxul extracts these blocks, saves them as separate files in the `output/cif/` folder, and automatically injects them into the `<head>` of any page that uses the component.

### How It Works

1. **Write your component** with optional `<script>` and `<css>` blocks:

```html
<!-- components/card.html -->
<div class="card">
    <h2>%%title%%</h2>
    <p>%%content%%</p>
</div>

<css>
.card {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 16px;
    max-width: 300px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
</css>

<script>
document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
        console.log('Card clicked:', card.querySelector('h2').textContent);
    });
});
</script>
```

2. **Use the component** in your page as usual:

```html
<component src="card" title="Hello" content="World!" />
```

3. **At build time**, roxul:
   - Extracts the `<js>` content → saves to `output/cif/card.js`
   - Extracts the `<css>` content → saves to `output/cif/card.css`
   - Removes the `<js>` and `<css>` tags from the component HTML
   - Injects `<link rel="stylesheet" href="cif/card.css">` and `<script src="cif/card.js"></script>` into the page's `<head>`

### The `/cif` Folder (Component Internal Files)

The `output/cif/` directory is created automatically during build and contains:
- **`componentName.css`** — Extracted styles from `<css>` tags
- **`componentName.js`** — Extracted scripts from `<js>` tags

These files are **internal to roxul's build process** — you don't need to reference them manually. They are automatically linked in the HTML output.

### Key Features

| Feature | Description |
|---------|-------------|
| **Optional** | Components can be pure HTML — `<js>` and `<css>` tags are completely optional |
| **Auto-injection** | CSS is injected as `<link rel="stylesheet">`, JS as `<script src="">` in `<head>` |
| **Deduplication** | If a component is used multiple times on a page, its CSS/JS is only injected **once** |
| **No flickering** | Styles and scripts are in the HTML at load time — no runtime injection |
| **Scoped by component** | Each component gets its own `.css` and `.js` file named after the component |

### Example Output

**Source page:**
```html
<component src="card" title="First" content="Hello" />
<component src="card" title="Second" content="World" />
```

**Built output (`output/index.html`):**
```html
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="cif/card.css" data-roxul-component="card">
    <script src="cif/card.js" data-roxul-component="card"></script>
</head>
<body>
    <div class="card"><h2>First</h2><p>Hello</p></div>
    <div class="card"><h2>Second</h2><p>World</p></div>
</body>
</html>
```

Notice:
- Only **one** `<link>` and **one** `<script>` for `card` despite two usages
- The `data-roxul-component` attribute identifies which component the asset belongs to
- The component HTML has no `<js>` or `<css>` tags — they were stripped at build time

---

## Source Paths Reference

| Prefix | Path Resolution | Use Case |
|--------|----------------|----------|
| `src="route/to/comp"` | `components/route/to/comp` → `roxul/BIComponents/route/to/comp` | Standard & built-in components |
| `src="#route/to/comp"` | `src/route/to/comp` | Referencing a page as component |
| `src="%route/to/comp"` | `route/to/comp` (project root) | Absolute project path |

Built-in components (shipped with roxul) are resolved from the package's `roxul/BIComponents/` directory as a final fallback.

---

## Programmatic API

```javascript
import { build, serve, initProject } from 'roxul';

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