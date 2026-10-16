import { useState } from 'react';
import { downloadJson } from '../app/downloadJson';
import { clearDiagnostics, readDiagnostics } from '../diagnostics';

type Status = { readonly kind: 'ok' | 'warn'; readonly text: string };

function diagnosticsReport() {
  return { exportedAt: new Date().toISOString(), build: __BUILD_ID__, entries: readDiagnostics() };
}

/** Registro técnico do aparelho, para enviar a quem cuida do app quando algo dá errado. */
export function DiagnosticsPanel() {
  const [count, setCount] = useState(() => readDiagnostics().length);
  const [status, setStatus] = useState<Status | null>(null);

  const exportLog = () => {
    const report = diagnosticsReport();
    downloadJson(report, `playkids-diagnostico-${report.exportedAt.slice(0, 19).replace(/[:T]/g, '-')}.json`);
  };

  const copyLog = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(diagnosticsReport()));
      setStatus({ kind: 'ok', text: 'Diagnóstico copiado. Cole numa mensagem para enviar.' });
    } catch {
      setStatus({ kind: 'warn', text: 'Não foi possível copiar. Use "Exportar diagnóstico".' });
    }
  };

  const clearLog = () => {
    clearDiagnostics();
    setCount(0);
    setStatus({ kind: 'ok', text: 'Diagnóstico apagado.' });
  };

  return (
    <section className="panel" aria-labelledby="diagnostics-heading">
      <h2 id="diagnostics-heading">Diagnóstico</h2>
      <p>
        Se o jogo travar ou se comportar de um jeito estranho, exporte este registro e envie para quem cuida do app.
        Ele fica só neste aparelho e guarda os {count} eventos técnicos mais recentes (áudio, desafios, erros) — sem
        nome nem dados da criança.
      </p>
      {status && (
        <p className={`notice notice--${status.kind}`} role="status">
          {status.text}
        </p>
      )}
      <div className="panel__actions">
        <button type="button" className="button button--sun" onClick={exportLog} disabled={count === 0}>
          Exportar diagnóstico
        </button>
        <button type="button" className="button" onClick={copyLog} disabled={count === 0}>
          Copiar
        </button>
        <button type="button" className="button" onClick={clearLog} disabled={count === 0}>
          Limpar
        </button>
      </div>
    </section>
  );
}
