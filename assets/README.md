# Assets Directory

This directory contains all static assets for the POS application.

## Directory Structure

```
assets/
├── logos/          # Logo images and branding assets
│   ├── logo.svg    # Main logo (recommended)
│   ├── logo.png    # Main logo (PNG version)
│   └── favicon.ico # Browser favicon
│
└── images/         # Other images
    ├── products/   # Product images
    ├── icons/      # Custom icons
    ├── backgrounds/# Background images
    └── avatars/    # User avatars
```

## Usage in Code

### Importing Assets

In Vite, you can import assets directly in your components:

```typescript
// Import logo
import logo from '../assets/logos/logo.svg';

// Use in component
<img src={logo} alt="Restaurant Logo" />
```

### Public Assets (Alternative)

You can also place assets in the `public/` directory for direct URL access:

```
public/
└── logos/
    └── logo.svg
```

**When to use `public/` vs `assets/`:**

- **`public/`** - For favicon, HTML references, direct URL access, files that shouldn't be processed
- **`assets/`** - For React component imports, files that need Vite processing/optimization

**Reference in code:**
```typescript
// From public/ (direct path)
<img src="/logos/logo.svg" alt="Restaurant Logo" />

// From assets/ (imported)
import logo from '../assets/logos/logo.svg';
<img src={logo} alt="Restaurant Logo" />
```

## Best Practices

1. **Use SVG for logos** - Scalable and crisp at any size
2. **Optimize images** - Compress PNG/JPEG files before adding
3. **Naming convention** - Use lowercase with hyphens (e.g., `logo-main.svg`)
4. **File sizes** - Keep images under 500KB when possible
5. **Formats**:
   - SVG for logos and icons
   - PNG for images with transparency
   - WebP for photos (modern browsers)
   - JPEG for photos (fallback)

