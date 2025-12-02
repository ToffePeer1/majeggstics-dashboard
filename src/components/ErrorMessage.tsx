interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ title = 'Error', message, onRetry }: ErrorMessageProps) {
  return (
    <div className="card" style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <h2 style={{ color: 'var(--color-danger)', marginBottom: '1rem' }}>❌ {title}</h2>
      <div className="error-message">{message}</div>
      {onRetry && (
        <button onClick={onRetry} className="button button-primary" style={{ marginTop: '1rem' }}>
          Try Again
        </button>
      )}
    </div>
  );
}
