import './index.css';

export interface Props {
  count: number;
  onClick: () => void;
}

export default function Button({ count, onClick }: Props) {
  return (
    <button className='primary-btn' onClick={onClick}>
      <img src={chrome.runtime.getURL('icon.png')} alt='icon' />
      CLICK ME: {count}
    </button>
  );
}