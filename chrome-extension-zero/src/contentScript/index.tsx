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
