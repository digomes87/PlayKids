import { useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { useSettingsStore } from '../app/settingsStore';
import { errorMessage, useAsync } from '../app/useAsync';
import { computeSkillMastery, progressRepository, type MasteryLevel } from '../progress';
import { downloadProgress, readProgressFile } from './progressFile';

const SKILL_LABEL: Record<string, string> = {
  counting: 'Contagem',
  addition: 'Adição',
  subtraction: 'Subtração',
  number_recognition: 'Reconhecer números falados',
};

const LEVEL_LABEL: Record<MasteryLevel, string> = {
  new: 'Começando',
  practicing: 'Praticando',
  mastered: 'Dominado',
};

const percent = (fraction: number) => `${Math.round(fraction * 100)}%`;
const seconds = (ms: number | null) => (ms === null ? '—' : `${(ms / 1000).toFixed(1)} s`);

type Notice = { readonly kind: 'ok' | 'warn'; readonly text: string };

export function ParentsDashboard() {
  const latencyOffsetMs = useSettingsStore((state) => state.latencyOffsetMs);
  const reloadSettings = useSettingsStore((state) => state.load);
  const fileInput = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const report = useAsync(async () => {
    const [attempts, chapterResults] = await Promise.all([
      progressRepository.listAttempts(),
      progressRepository.listChapterResults(),
    ]);
    return { skills: computeSkillMastery(attempts), chapterResults, attemptCount: attempts.length };
  }, []);

  const run = async (task: () => Promise<string | null>) => {
    try {
      const text = await task();
      if (text) setNotice({ kind: 'ok', text });
    } catch (error) {
      console.error(error);
      setNotice({ kind: 'warn', text: errorMessage(error) });
    }
  };

  const refresh = async () => {
    await reloadSettings();
    report.reload();
  };

  const exportProgress = () =>
    run(async () => {
      downloadProgress(await progressRepository.exportAll());
      return 'Progresso exportado.';
    });

  const importProgress = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    void run(async () => {
      const data = await readProgressFile(file);
      const question = `Importar ${data.attempts.length} respostas e substituir o progresso deste aparelho?`;
      if (!window.confirm(question)) return null;
      await progressRepository.importAll(data);
      await refresh();
      return 'Progresso importado.';
    });
  };

  const clearProgress = () =>
    run(async () => {
      if (!window.confirm('Apagar todo o progresso deste aparelho? Isso não pode ser desfeito.')) return null;
      await progressRepository.clear();
      await refresh();
      return 'Progresso apagado.';
    });

  return (
    <main className="screen parents">
      <header className="parents__header">
        <Link to="/" className="icon-button" aria-label="Voltar ao jogo">
          ←
        </Link>
        <h1>Área dos pais</h1>
      </header>

      {notice && (
        <p className={`notice notice--${notice.kind}`} role="status">
          {notice.text}
        </p>
      )}

      <section className="panel" aria-labelledby="report-heading">
        <h2 id="report-heading">Relatório</h2>
        {report.status === 'loading' && <p>Carregando…</p>}
        {report.status === 'error' && (
          <p className="notice notice--warn">Não foi possível ler o progresso: {report.message}</p>
        )}
        {report.status === 'ready' && report.data.attemptCount === 0 && (
          <p>Ainda não há respostas registradas. Jogue um capítulo para ver o relatório.</p>
        )}
        {report.status === 'ready' && report.data.attemptCount > 0 && (
          <>
            <table className="report">
              <caption>Domínio por habilidade (últimas 20 respostas de cada)</caption>
              <thead>
                <tr>
                  <th scope="col">Habilidade</th>
                  <th scope="col">Nível</th>
                  <th scope="col">Acertos recentes</th>
                  <th scope="col">Tempo médio</th>
                  <th scope="col">Respostas</th>
                </tr>
              </thead>
              <tbody>
                {report.data.skills.map((skill) => (
                  <tr key={skill.skill}>
                    <th scope="row">{SKILL_LABEL[skill.skill] ?? skill.skill}</th>
                    <td>
                      <span className={`level level--${skill.level}`}>{LEVEL_LABEL[skill.level]}</span>
                    </td>
                    <td>
                      <span className="meter" aria-hidden="true">
                        <span className="meter__fill" style={{ transform: `scaleX(${skill.recentAccuracy})` }} />
                      </span>
                      {percent(skill.recentAccuracy)}
                    </td>
                    <td>{seconds(skill.averageReactionMs)}</td>
                    <td>{skill.totalAttempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="parents__chapters">
              {report.data.chapterResults.map((result) => (
                <li key={result.chapterId}>
                  <strong>{result.chapterId}</strong>: concluído {result.timesCompleted}× · última vez {result.hits}/
                  {result.total} · melhor resultado {result.bestStars} ★
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="panel" aria-labelledby="latency-heading">
        <h2 id="latency-heading">Calibração de latência</h2>
        <p>
          {latencyOffsetMs === null
            ? 'Ainda não calibrado. Fones Bluetooth e alguns tablets atrasam o som; calibre para o jogo compensar.'
            : `Atraso compensado: ${latencyOffsetMs} ms.`}
        </p>
        <Link to="/parents/calibration" className="button button--sun">
          {latencyOffsetMs === null ? 'Calibrar' : 'Calibrar de novo'}
        </Link>
      </section>

      <section className="panel" aria-labelledby="data-heading">
        <h2 id="data-heading">Dados</h2>
        <p>O progresso fica só neste aparelho. Exporte para guardar uma cópia ou levar para outro tablet.</p>
        <div className="panel__actions">
          <button type="button" className="button" onClick={exportProgress}>
            Exportar JSON
          </button>
          <button type="button" className="button" onClick={() => fileInput.current?.click()}>
            Importar JSON
          </button>
          <button type="button" className="button button--danger" onClick={clearProgress}>
            Apagar progresso
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          onChange={importProgress}
          tabIndex={-1}
          aria-label="Arquivo de progresso para importar"
        />
      </section>
    </main>
  );
}
