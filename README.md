# Building Chrome Extensions with Rsbuild

English | [简体中文](./README.zh-CN.md)

Nowadays, if you're aiming for a smooth Chrome extension development experience complete with features like HMR, there's no need to hunt for scaffolding or custom solutions. Rsbuild, with its simple configuration, is more than enough. In my opinion, it's currently the best build tool for the job.

[Rspack](https://rspack.dev) recently released its official version. As the name suggests, it's a high-performance build tool written in Rust, designed to replace webpack. [Rsbuild](https://rsbuild.dev) serves as a higher-level wrapper around Rspack, greatly simplifying the configuration process. Let's dive into an example to see just how effortless it is to build a Chrome extension with Rsbuild.

Assuming you're already familiar with Chrome extension development, we'll focus solely on how Rsbuild is different, skipping the basics.

Create a project named chrome-extension-zero based on React and TS, then install the dependencies:

```bash
yarn create rsbuild -d chrome-extension-zero -t react-ts
cd chrome-extension-zero
yarn
```

You'll get the following file structure, which is quite concise:

```text
├── node_modules
├── src
│   ├── App.css
│   ├── App.tsx
│   ├── env.d.ts
│   └── index.tsx
├── .gitignore
├── README.md
├── package.json
├── rsbuild.config.ts
├── tsconfig.json
└── yarn.lock
```

At this point, you can already run the project. Execute `yarn dev` and you'll see the page. Next, let's transform it into a Chrome extension. This extension will do one simple thing: when the user clicks the extension icon, it opens the built-in page.

Modify `package.json` to remove the `--open` parameter from the `dev` command, as we don't need to automatically open the page when developing a Chrome extension.

Install the TS type packages:

```bash
yarn add -D @types/chrome @types/node
```

Move the files within `src` to `src/main`, then create `src/background/index.ts` and `public/manifest.json`:

```text
├── node_modules
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
├── .gitignore
├── README.md
├── package.json
├── rsbuild.config.ts
├── tsconfig.json
└── yarn.lock
```

Modify the contents of `src/background/index.ts`:

```ts
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'main.html' });
});
```

Modify the contents of `public/manifest.json`:

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
  },
}
```

Modify the configuration within `rsbuild.config.ts`. For detailed configuration explanations, please refer to the official Rsbuild documentation:

```ts
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

// No need to distinguish between development and production environments for now
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

Finally, execute `yarn dev`. In the `chrome://extensions` page, load the `dist` directory, and you can happily start developing.

There's a minor unresolved issue: each hot update adds a few hot-update files, and these files can't be ignored during `writeToDisk`. This leads to HMR failure and automatic fallback to liveReload. Fortunately, these files are very small, so it's tolerable.

Is the example too simple? Let's try something more complex, like a translation tool that modifies web pages to display its own UI components. The trickiest part of such requirements is injecting the extension's UI components into the target page through content scripts. However, like background scripts, content scripts aren't easy to do HMR with, requiring a reload for every change. Debugging UI without HMR is quite painful, so we should separate the UI components to enable independent debugging, minimizing the logic within content scripts.

Next, let's further refine the example to add a counter button to each webpage.

Modify `rsbuild.config.ts` to add two new entries: `components` and `contentScript`:

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

Modify the contents of `public/manifest.json`:

```diff
{
  "manifest_version": 3,
  ...
+ "content_scripts": [
+   {
+     "matches": ["https://*/*"],
+     "js": ["static/js/contentScript.js"]
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
 ├── node_modules
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
 ├── .gitignore
 ├── README.md
 ├── package.json
 ├── rsbuild.config.ts
 ├── tsconfig.json
 └── yarn.lock
```

`src/components/env.d.ts` is a copy of `src/main/env.d.ts`.

Modify the contents of `src/components/Button/index.tsx`:

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

Modify the contents of `src/components/Button/index.css`:

```css
.primary-btn {
  padding: 1rem 2rem;
  font-size: 16px;
  color: black;
  background-color: white;
  border-color: black;
}
```

Managing styles within UI components is exactly the same as usual. If you prefer Tailwind CSS, you can follow the Rsbuild documentation to integrate it. However, when you need to use the extension's own resources like images, you'll need to obtain the URL through `chrome.runtime.getURL('xxx')`.

Modify the contents of `src/components/index.tsx`:

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

This serves as the preview entry point for UI components. During development, we can open `chrome-extension://<ID>/components.html` to debug UI components. Both `components` and `main` support HMR. Remember not to use `http://localhost:3000/components`, as this differs from the target context of the components (content script).

Modify the contents of `src/contentScript/index.tsx`:

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

With the UI separated, the logic within the content script becomes quite simple. The above code, upon each execution, inserts the counter button in the form of a Shadow DOM, positioning it at the top-left corner of the page.

The complete source code for the example project: [chrome-extension-zero](https://github.com/wildseeder/build-chrome-extensions-with-rsbuild/tree/master/chrome-extension-zero).
