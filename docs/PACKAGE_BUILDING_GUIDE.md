# Package Building Guide for B-MCP Monorepo

## 🚀 Quick Start

Create a new package:

```bash
./scripts/create-package.sh my-awesome-package
```

## 📦 Available Build Tools

### 1. tsup (Recommended) ⭐

Already configured in your monorepo! Best for:

- React hooks
- Utility libraries
- Simple packages without complex assets

**Pros:**

- Zero-config
- Fast (esbuild under the hood)
- Generates ESM, CJS, and TypeScript declarations
- Tree-shaking out of the box
- Small bundle sizes

### 2. Vite Library Mode

Best for:

- Component libraries with CSS
- Packages needing advanced asset handling
- When you want HMR during development

```ts
// vite.config.ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es', 'cjs'],
    },
  },
});
```

### 3. unbuild

Best for:

- Isomorphic packages
- When you need auto-detection of build requirements

```bash
pnpm add -D unbuild
```

## 🏗️ Package Structure

```
packages/
├── my-package/
│   ├── src/
│   │   └── index.ts
│   ├── dist/           # Generated
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsup.config.ts
│   └── README.md
```

## 🔧 Configuration Examples

### Basic Package (Hooks, Utils)

```json
// package.json
{
  "name": "@b-mcp/my-package",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  }
}
```

### UI Component Library

```ts
// tsup.config.ts
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true, // Enable for component libraries
  external: ['react', 'react-dom'],
  injectStyle: true, // Inject CSS as style tags
});
```

## 🛠️ Development Workflow

### 1. Internal Consumption (Monorepo)

Your web app can import directly:

```ts
import { useMcpClient } from '@b-mcp/mcp-react-hooks';
```

### 2. Watch Mode Development

In package directory:

```bash
pnpm dev  # Runs tsup --watch
```

### 3. Building All Packages

From root:

```bash
pnpm build  # Turborepo builds all packages
```

## 📤 Publishing to npm

### 1. Setup Changesets

```bash
pnpm changeset init
```

### 2. Create a Changeset

```bash
pnpm changeset
```

### 3. Version and Publish

```bash
pnpm changeset version
pnpm changeset publish
```

## 🔍 Quality Tools

### 1. publint - Validate Package Publishing

```bash
pnpm add -D publint
# Add to package.json scripts
"lint:publish": "publint"
```

### 2. size-limit - Monitor Bundle Size

```bash
pnpm add -D size-limit @size-limit/preset-small-lib
```

```json
// package.json
{
  "size-limit": [
    {
      "path": "dist/index.js",
      "limit": "10 KB"
    }
  ]
}
```

### 3. api-extractor - Generate API Documentation

```bash
pnpm add -D @microsoft/api-extractor
```

## 🎯 Best Practices

### 1. Package.json Essentials

```json
{
  "sideEffects": false, // Enable tree-shaking
  "files": ["dist"], // Only publish necessary files
  "keywords": ["react", "hooks", "mcp"],
  "repository": {
    "type": "git",
    "url": "...",
    "directory": "packages/my-package"
  }
}
```

### 2. TypeScript Configuration

Extend the base config:

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

### 3. Peer Dependencies

For React packages:

```json
{
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  }
}
```

## 🚀 Advanced Patterns

### 1. Multiple Entry Points

```ts
// tsup.config.ts
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    hooks: 'src/hooks/index.ts',
    components: 'src/components/index.ts',
  },
});
```

```json
// package.json exports
{
  "exports": {
    ".": "./dist/index.js",
    "./hooks": "./dist/hooks.js",
    "./components": "./dist/components.js"
  }
}
```

### 2. Conditional Exports

```json
{
  "exports": {
    ".": {
      "development": "./dist/index.dev.js",
      "production": "./dist/index.prod.js",
      "default": "./dist/index.js"
    }
  }
}
```

### 3. CSS Modules with tsup

```ts
export default defineConfig({
  esbuildPlugins: [
    cssModulesPlugin({
      // CSS modules configuration
    }),
  ],
});
```

## 📚 Resources

- [tsup Documentation](https://tsup.egoist.dev/)
- [Vite Library Mode](https://vitejs.dev/guide/build.html#library-mode)
- [Changesets](https://github.com/changesets/changesets)
- [publint](https://publint.dev/)
- [Turborepo Handbook](https://turbo.build/repo/docs)
