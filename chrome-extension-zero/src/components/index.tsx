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
