# 使用 Rsbuild 构建 Chrome 扩展程序

[English](./README.md) | 简体中文

现在开发 Chrome 扩展程序，要想得到包含 HMR 等特性的丝滑开发体验，已经不用再去找脚手架或专门的魔改方案了，用 Rsbuild 简单配置一下足矣，我认为这是目前最佳的构建方案。

[Rspack](https://rspack.dev) 不久前发布了正式版本，顾名思义，这是一个用 Rust 编写的用以替代 webpack 的高性能构建工具。[Rsbuild](https://rsbuild.dev) 是它的上层封装，大大简化了配置。下面我举一个例子，看看使用 Rsbuild 构建 Chrome 扩展程序到底能有多简单。

这里假设你已经知道如何开发 Chrome 扩展程序，所以只展示使用 Rsbuild 的不同点，不再赘述基础知识。

创建一个基于 React 和 TS，名为 chrome-extension-zero 的项目，并安装好依赖：

```bash
yarn create rsbuild -d chrome-extension-zero -t react-ts
cd chrome-extension-zero
yarn
```

得到如下的文件目录结构，很精简：

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

这时已经可以跑起来了，执行 `yarn dev` 即可看到页面。接下来要把它改成 Chrome 扩展程序，这个扩展程序只做一件事：当用户点击扩展图标时，打开内置页面。

修改 `package.json` 去掉 `dev` 命令的 `--open` 参数，因为开发 Chrome 扩展程序时不需要自动打开页面。

安装 TS 类型包：

```bash
yarn add -D @types/chrome @types/node
```

把 `src` 内的文件移动到 `src/main` 里，然后创建 `src/background/index.ts` 和 `public/manifest.json`：

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

修改 `src/background/index.ts` 的内容：

```ts
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'main.html' });
});
```

修改 `public/manifest.json` 的内容：

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

修改 `rsbuild.config.ts` 内的配置，具体的配置说明请参考 Rsbuild 的官方文档：

```ts
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

// 此处暂时不用区分开发/正式环境
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

最后执行 `yarn dev`，在 `chrome://extensions` 页面里加载 `dist` 目录，就可以愉快地开发了。

有一个尚未解决的小缺点，就是每次热更新都会新增几个 hot-update 文件，而且不能在 `writeToDisk` 时忽略这些文件，这会导致 HMR 失效并自动降级到 liveReload。好在这些文件都很小，可以忍受。

例子太简单？那我们来点更复杂的，比如划词翻译等辅助工具，需要修改网页在页面中显示自己的 UI 组件。这类需求最麻烦的点是要通过 content script 向目标页面注入插件的 UI 组件，而 content script 和 background 一样都不好做 HMR，每次改动都需要 reload。没有 HMR 调试 UI 会非常蛋疼，所以我们应该将 UI 组件剥离出去使其可以独立调试，尽可能减少 content script 内的逻辑。

接下来我们进一步完善例子，实现在每个网页上增加一个计数按钮。

修改 `rsbuild.config.ts`，新增 `components` 和 `contentScript` 两个入口：

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

修改 `public/manifest.json` 的内容：

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

添加对应的文件：

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

`src/components/env.d.ts` 是 `src/main/env.d.ts` 的拷贝。

修改 `src/components/Button/index.tsx` 的内容：

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

修改 `src/components/Button/index.css` 的内容：

```css
.primary-btn {
  padding: 1rem 2rem;
  font-size: 16px;
  color: black;
  background-color: white;
  border-color: black;
}
```

在 UI 组件中做样式管理和是平时完全一样的，如果你想用 Tailwind CSS 可以按照 Rsbuild 的文档来引入。但要使用插件自身的图片等资源时，就需要通过 `chrome.runtime.getURL('xxx')` 来获取 URL 了。

修改 `src/components/index.tsx` 的内容：

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

这充当了 UI 组件的预览入口，开发时我们可以打开 `chrome-extension://<ID>/components.html` 来调试 UI 组件，`components` 和 `main` 一样都支持 HMR。注意不要使用 `http://localhost:3000/components`，这与组件的目标上下文（content script）不同。

修改 `src/contentScript/index.tsx` 的内容：

```tsx
import { ReactNode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Button from '../components/Button';

const container = appendComponent(document.body, <Root />);
Object.assign(container.style, {
  position: 'fixed',
  top: '0',
  left: '0',
  zIndex: '9999',
} as CSSStyleDeclaration);

function Root() {
  const [count, setCount] = useState(0);
  return (
    <Button count={count} onClick={() => setCount(count+1)} />
  );
}

export function appendComponent(parent: HTMLElement, component: ReactNode): HTMLElement {
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
```

UI 剥离出去后，content script 的逻辑就很简单了，上面的代码每次运行时，会以 Shadow DOM 的形式插入计数按钮，并定位在页面左上角。

完整的示例项目源码：[chrome-extension-zero](https://github.com/wildseeder/build-chrome-extensions-with-rsbuild/tree/master/chrome-extension-zero)。
