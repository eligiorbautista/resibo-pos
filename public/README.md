# Public Directory

Files in the `public/` directory are served as static assets at the root URL path.

## Important Notes:

- Files in `public/` are **NOT processed** by Vite
- They are served **as-is** at the root path
- Use for files that need direct URL access
- Files are **NOT hashed** (no cache busting)

## Directory Structure:

```
public/
├── logos/          # Logo files (favicon, etc.)
└── images/         # Other static images
```

## Usage Examples:

### In HTML:
```html
<link rel="icon" href="/logos/favicon.ico" />
<meta property="og:image" content="/logos/logo.png" />
```

### In React (direct path):
```tsx
<img src="/logos/logo.svg" alt="Logo" />
```

### In CSS:
```css
background-image: url('/logos/background.png');
```

## Best Practices:

1. **Favicon** - Always put in `public/logos/`
2. **Meta tags** - Use `public/` for social media images
3. **Large static files** - Use `public/` if you don't need processing
4. **Component assets** - Use `assets/` for imported images

