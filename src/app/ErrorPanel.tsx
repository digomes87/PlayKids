import { Link } from 'react-router-dom';

interface ErrorPanelProps {
  readonly message: string;
  readonly onRetry?: () => void;
}

export function ErrorPanel({ message, onRetry }: ErrorPanelProps) {
  return (
    <main className="screen screen--center">
      <section className="panel panel--error" role="alert">
        <h1>Ops, algo deu errado</h1>
        <p className="panel__detail">{message}</p>
        <div className="panel__actions">
          {onRetry && (
            <button type="button" className="button button--sun" onClick={onRetry}>
              Tentar de novo
            </button>
          )}
          <Link to="/" className="button">
            Voltar ao início
          </Link>
        </div>
      </section>
    </main>
  );
}
