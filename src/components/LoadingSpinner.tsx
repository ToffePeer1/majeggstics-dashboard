interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export default function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  const sizeMap = {
    sm: '24px',
    md: '40px',
    lg: '60px',
  };

  return (
    <div className="loading-container">
      <div className="spinner" style={{ width: sizeMap[size], height: sizeMap[size] }}></div>
      {text && <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>{text}</p>}
    </div>
  );
}
