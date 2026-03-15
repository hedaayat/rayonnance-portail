# Rayonnance — Internal App Hub

A lightweight, zero-dependency browser portal for organising internal application links.
Built with plain HTML, CSS and vanilla JavaScript — no build step, no framework, no server required.

---

## How it works

| Concern | Detail |
|---|---|
| **Storage** | All links are persisted in the browser's `localStorage` under the key `rayonnance_links`. Nothing is ever sent to a server. |
| **Seed data** | On first load (empty storage) the `SEED` array in `app.js` is used to pre-populate the list. It is empty by default; add your own entries there if you want a pre-loaded starting set. |
| **Tags** | Each link can carry multiple tags (comma-separated). Tags drive the filter tab-bar at the top. |
| **Search** | The search box filters across name, description and tags simultaneously. |
| **Import / Export** | Links can be exported as a dated JSON file (`rayonnance-links-YYYY-MM-DD.json`) and re-imported later. On import you can choose to **replace** the existing list or **merge** (only new IDs are added). |

### Data shape

Each link object stored in `localStorage` has the following fields:

```jsonc
{
  "id":          "abc123xyz",          // auto-generated, do not edit manually
  "icon":        "🔧",                 // any single emoji or short string
  "name":        "My App",             // required
  "url":         "https://example.com",// required — must be a valid URL
  "description": "Short description",  // optional
  "tags":        ["productivity", "hr"]// optional array of lowercase strings
}
```

---

## Running locally

The project is a **single static page** — open it directly in any modern browser, no web server needed.

### Option 1 — Double-click (simplest)

```
index.html  →  right-click → Open with → your browser
```

### Option 2 — Local HTTP server (recommended to avoid any `file://` quirks)

Pick whichever you already have installed:

```powershell
# Python 3
python -m http.server 8080

# Node (npx, no install needed)
npx serve .

# Node (http-server)
npx http-server . -p 8080
```

Then open **http://localhost:8080** in your browser.

---

## Deployment (GitHub Pages)

The live portal is served via GitHub Pages. The `CNAME` file in the root maps the custom domain.

To update the portal, push to the `main` branch — GitHub Pages rebuilds automatically.

> **Note:** Because all data lives in `localStorage`, each browser/device maintains its own independent link list. Use **Export → Import** to migrate your list between devices.

---

## File structure

```
├── index.html   # markup — header, tab-bar, card grid, modal, confirm bar
├── app.js       # all application logic (state, rendering, CRUD, import/export)
├── style.css    # dark theme, responsive layout
├── CNAME        # custom domain for GitHub Pages
└── .gitignore
```

---

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Escape` | Close modal or dismiss delete confirmation |

---

## Security considerations

- Links open with `target="_blank" rel="noopener noreferrer"` to prevent tab-napping.
- All user-supplied text is HTML-escaped before being injected into the DOM.
- `X-DNS-Prefetch-Control: off` is set to prevent the browser from pre-resolving link destinations.
- No external scripts, fonts or trackers are loaded.
- **Do not commit real internal URLs to a public repository.** Use Export/Import to manage your personal link list outside of version control.
