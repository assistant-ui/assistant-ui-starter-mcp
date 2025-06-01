# Creating Injected Scripts with WXT

Based on the documentation you've shared, here's how to work with injected scripts in the WXT framework:

## Main World vs Isolated World Scripts

WXT allows you to inject scripts into the main world of a webpage, giving your extension access to the page's JavaScript context, not just the DOM. Here's how to set this up:

### Recommended Approach: Using `injectScript`

Create two files in your entrypoints/injectedScripts folder:

1. A content script that injects your main world script
2. The unlisted script that will run in the main world

#### Step 1: Create the main world script

```typescript:entrypoints/injectedScripts/example-main-world.ts
export default defineUnlistedScript(() => {
  console.log('Hello from the main world');

  // Your main world code here - has full access to the page's JavaScript context
});
```

#### Step 2: Create the content script that injects it

```typescript:entrypoints/injectedScripts/example.content.ts
export default defineContentScript({
  matches: ['*://*/*'],
  async main() {
    console.log('Injecting script...');
    await injectScript('/example-main-world.js', {
      keepInDom: true,
    });
    console.log('Done!');

    // You can now communicate with your injected script
  },
});
```

#### Step 3: Update your WXT config

Make sure to add the script to web_accessible_resources in your config:

```typescript:wxt.config.ts
export default defineConfig({
  manifest: {
    // ... existing code ...
    web_accessible_resources: [
      {
        resources: ["example-main-world.js"],
        matches: ["*://*/*"],
      }
    ]
  }
});
```

## Additional Features You Can Implement

### Mounting UI to Dynamic Elements

If you need to attach UI components to elements that appear dynamically:

```typescript:entrypoints/injectedScripts/dynamic-ui.content.ts
export default defineContentScript({
  matches: ['<all_urls>'],

  main(ctx) {
    const ui = createIntegratedUi(ctx, {
      position: 'inline',
      anchor: '#your-target-dynamic-element',
      onMount: (container) => {
        const app = document.createElement('p');
        app.textContent = 'Your injected UI component';
        container.append(app);
      },
    });

    // Automatically mount/unmount when the target element appears/disappears
    ui.autoMount();
  },
});
```

### Handling SPAs (Single Page Applications)

For sites that use client-side routing without full page reloads:

```typescript:entrypoints/injectedScripts/spa-handler.content.ts
const targetPattern = new MatchPattern('*://example.com/specific-path*');

export default defineContentScript({
  matches: ['*://example.com/*'],
  main(ctx) {
    // Initial check
    if (targetPattern.includes(window.location.href)) {
      mountFeature(ctx);
    }

    // Listen for location changes
    ctx.addEventListener(window, 'wxt:locationchange', ({ newUrl }) => {
      if (targetPattern.includes(newUrl)) {
        mountFeature(ctx);
      }
    });
  },
});

function mountFeature(ctx: ContentScriptContext) {
  // Your feature code here
  console.log('Feature mounted on target page');
}
```

## Important Notes

1. For MV3, `injectScript` is synchronous and evaluates at the same time as your content script's `run_at`.
2. For MV2, `injectScript` is asynchronous and will not evaluate at the same time as your content script's `run_at`.
3. When using `world: 'MAIN'` directly (not recommended):
   - Only works in MV3
   - Only supported by Chromium browsers
   - Scripts lose access to extension APIs

The `injectScript` approach is recommended because it works across browser versions and extension manifest versions while maintaining communication with the extension API.
