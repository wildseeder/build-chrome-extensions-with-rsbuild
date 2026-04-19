# Building Chrome Extensions with Rsbuild

English | [简体中文](./README.zh-CN.md)

This repository provides a sample Chrome extension project built with Rsbuild. It shows how to use Rsbuild to build Chrome extensions and enjoy a smooth development experience with features like HMR.

[Rspack](https://rspack.dev), as its name suggests, is a high-performance build tool written in Rust as an alternative to webpack. [Rsbuild](https://rsbuild.dev) is an upper-layer wrapper around it that greatly simplifies configuration. Let’s walk through an example to see how easy building a Chrome extension with Rsbuild can be.

This guide assumes you already know how to build Chrome extensions, so it focuses only on what is different when using Rsbuild.

Create a React + TypeScript project named `chrome-extension-zero` and install dependencies:

```bash
yarn create rsbuild -d chrome-extension-zero -t react-ts
cd chrome-extension-zero
yarn
```

You should get the following structure (irrelevant files omitted):

```text
├── public
│   └── favicon.png
├── src
│   ├── App.css
│   ├── App.tsx
│   ├── env.d.ts
│   └── index.tsx
├── package.json
├── rsbuild.config.ts
└── tsconfig.json
```

At this point, you can already run it. Execute `yarn dev` and you’ll see the page. Next, convert it into a Chrome extension. This extension does one thing: when the user clicks the extension icon, it opens a built-in page.

Update `package.json` and remove the `--open` argument from the `dev` command, because you don’t need to auto-open a page when developing a Chrome extension.

Install TypeScript type packages:

```bash
echo 'nodeLinker: node-modules' > .yarnrc.yml
yarn add -D @types/chrome @types/node
```

Update `tsconfig.json` to include `chrome` and `node` types:

```diff
{
  "compilerOptions": {
    ...
    "types": [
+     "chrome",
+     "node"
    ],
    ...
  },
  ...
}
```

Delete `public/favicon.png`, move files in `src` into `src/main`, then create `src/background/index.ts` and `public/manifest.json`:

```text
├── public
│   └── manifest.json
├── src
│   ├── background
│   │   └── index.ts
│   └── main
│       ├── App.css
│       ├── App.tsx
│       ├── env.d.ts
│       └── index.tsx
├── package.json
├── rsbuild.config.ts
└── tsconfig.json
```

Update `src/background/index.ts`:

```ts
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'main.html' });
});
```

Update `public/manifest.json`:

```json
{
  "manifest_version": 3,
  "version": "1.0.0",
  "name": "Chrome Extension Zero",
  "description": "An example Chrome extension built with React and Rsbuild.",
  "background": {
    "service_worker": "static/js/background.js"
  },
  "action": {
    "default_title": "Chrome Extension Zero"
  }
}
```

Update `rsbuild.config.ts` as follows. For details, refer to the official Rsbuild documentation:

```ts
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

// Docs: https://rsbuild.rs/config/
// No need to distinguish development/production for now.
// const isProd = process.env.NODE_ENV === 'production';
const port = 3000;

export default defineConfig({
  dev: {
    client: {
      port,
      host: '0.0.0.0',
      protocol: 'ws',
    },
    writeToDisk: true,
  },
  server: {
    port,
    strictPort: true,
    publicDir: {
      copyOnBuild: false,
    },
  },
  output: {
    filenameHash: false,
  },
  environments: {
    web: {
      plugins: [pluginReact()],
      source: {
        entry: {
          main: './src/main/index.tsx',
        },
      },
      html: {
        title: 'chrome-extension-zero',
      },
      output: {
        target: 'web',
        copy: [{ from: './public' }],
      },
    },
    webworker: {
      source: {
        entry: {
          background: './src/background/index.ts',
        },
      },
      output: {
        target: 'web-worker',
      },
    },
  },
});
```

Finally, run `yarn dev`, load the `dist` directory on `chrome://extensions`, and you can start developing happily.

There is one unresolved minor drawback: each hot update generates a few `hot-update` files, and these files cannot be ignored when `writeToDisk` is enabled. This causes HMR to fail and automatically fall back to liveReload. Fortunately, these files are tiny and generally tolerable.

Too simple? Let’s try something more practical, such as helper tools for text selection translation, where you need to modify pages and render your own UI components inside them. The most troublesome part is injecting extension UI into target pages through a content script. Content scripts, like background scripts, are not HMR-friendly and require reloads for each change. Debugging UI without HMR is painful, so we should extract UI components so they can be debugged independently, and keep content-script logic as small as possible.

Next, let’s improve the example by adding a counter button to every webpage.

Update `rsbuild.config.ts` by adding `components` and `contentScript` entries:

```diff
export default defineConfig({
  ...
  environments: {
    web: {
      plugins: [pluginReact()],
      source: {
        entry: {
          main: './src/main/index.tsx',
+         components: './src/components/index.tsx',
        },
      },
      html: {
        title: '',
      },
      output: {
        target: 'web',
        copy: [{ from: './public' }],
      },
    },
    webworker: {
+     plugins: [pluginReact()],
      source: {
        entry: {
          background: './src/background/index.ts',
+         contentScript: './src/contentScript/index.tsx',
        },
      },
      output: {
        target: 'web-worker',
      },
    },
  },
});
```

Update `public/manifest.json`:

```diff
{
  "manifest_version": 3,
  ...
+ "content_scripts": [
+   {
+     "matches": ["https://*/*"],
+     "js": ["static/js/contentScript.js"],
+     "run_at": "document_start"
+   }
+ ],
+ "web_accessible_resources": [
+   {
+     "resources": ["*"],
+     "matches": ["https://*/*"]
+   }
+ ]
}
```

Add the corresponding files:

```diff
 ├── public
 │   └── manifest.json
 ├── src
 │   ├── background
 │   │   └── index.ts
+│   ├── contentScript
+│   │   └── index.tsx
+│   ├── components
+│   │   └── Button
+│   │       ├── index.css
+│   │       └── index.tsx
+│   │   ├── env.d.ts
+│   │   └── index.tsx
 │   └── main
 │       ├── App.css
 │       ├── App.tsx
 │       ├── env.d.ts
 │       └── index.tsx
 ├── package.json
 ├── rsbuild.config.ts
 └── tsconfig.json
```

Here, `src/components/env.d.ts` is copied from `src/main/env.d.ts`.

Update `src/components/Button/index.tsx`:

```tsx
import './index.css';

export interface Props {
  count: number;
  onClick: () => void;
}

export default function Button({ count, onClick }: Props) {
  return (
    <button className='primary-btn' onClick={onClick}>
      CLICK ME: {count}
    </button>
  );
}
```

Update `src/components/Button/index.css`:

```css
.primary-btn {
  padding: 1rem 2rem;
  font-size: 16px;
  color: black;
  background-color: white;
  border-color: black;
}
```

Style management in UI components is exactly the same as usual. If you want Tailwind CSS, follow the Rsbuild docs to integrate it. But when using extension-owned assets (such as images), you need to get the URL through `chrome.runtime.getURL('xxx')`.

Update `src/components/index.tsx`:

```tsx
import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import Button from './Button';

createRoot(document.getElementById('root')!).render(<Preview />);

function Preview() {
  const [count, setCount] = useState(0);
  return (
    <Button count={count} onClick={() => setCount(count+1)} />
  );
}
```

This acts as the preview entry for UI components. During development, you can open `chrome-extension://<ID>/components.html` to debug UI components. `components` supports HMR just like `main`. Do not use `http://localhost:3000/components`, because it differs from the component’s target context (content script).

Update `src/contentScript/index.tsx`:

```tsx
import { ReactNode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Button from '../components/Button';

document.addEventListener('DOMContentLoaded', () => {
  const container = appendComponent(document.body, <Root />);
  Object.assign(container.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    zIndex: '9999',
  } as CSSStyleDeclaration);
});

function appendComponent(parent: HTMLElement, component: ReactNode): HTMLElement {
  const container = document.createElement('div');
  const shadowRoot = container.attachShadow({ mode: 'open' });
  parent.appendChild(container);
  
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL('static/css/components.css');
  shadowRoot.appendChild(link);
  
  const componentRoot = document.createElement('div');
  shadowRoot.appendChild(componentRoot);
  createRoot(componentRoot).render(component);

  return container;
}

function Root() {
  const [count, setCount] = useState(0);
  return (
    <Button count={count} onClick={() => setCount(count+1)} />
  );
}
```

After extracting UI components, content-script logic becomes very simple. Each time the code runs, it injects a counter button in Shadow DOM and positions it at the top-left corner of the page.

Complete example source code: [chrome-extension-zero](https://github.com/wildseeder/build-chrome-extensions-with-rsbuild/tree/master/chrome-extension-zero).

