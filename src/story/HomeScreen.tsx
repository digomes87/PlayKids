import { Link } from 'react-router-dom';
import { ErrorPanel } from '../app/ErrorPanel';
import { useAsync } from '../app/useAsync';
import { loadContentIndex } from '../content/loader';
import { contentUrl } from '../content/paths';
import { progressRepository, type ChapterResult } from '../progress';
import { Stars } from './Stars';
import './story.css';

async function loadChapterResults(): Promise<ChapterResult[]> {
  try {
    return await progressRepository.listChapterResults();
  } catch (error) {
    // Sem IndexedDB ainda dá para jogar; só não mostramos as estrelas.
    console.error('Não foi possível ler o progresso.', error);
    return [];
  }
}

export function HomeScreen() {
  const home = useAsync(
    async () => {
      const [index, results] = await Promise.all([loadContentIndex(), loadChapterResults()]);
      return { chapters: index.chapters, results };
    },
    [],
  );

  if (home.status === 'error') return <ErrorPanel message={home.message} onRetry={home.reload} />;

  const starsOf = (chapterId: string) =>
    home.status === 'ready' ? (home.data.results.find((result) => result.chapterId === chapterId)?.bestStars ?? 0) : 0;

  return (
    <main className="screen home">
      <header className="home__header">
        <h1 className="home__title">
          Play<span>Kids</span>
        </h1>
        <p className="home__tagline">Matemática no ritmo da música</p>
        <Link to="/parents" className="button button--small home__parents">
          Área dos pais
        </Link>
      </header>

      <nav className="home__chapters" aria-label="Capítulos" aria-busy={home.status === 'loading'}>
        {home.status === 'ready' &&
          home.data.chapters.map((chapter, index) => (
            <Link key={chapter.id} to={`/play/${chapter.id}`} className="chapter-card">
              <span className="chapter-card__number">{index + 1}</span>
              <img src={contentUrl(chapter.cover)} alt="" width={160} height={160} />
              <strong>{chapter.title}</strong>
              <Stars count={starsOf(chapter.id)} />
            </Link>
          ))}
      </nav>
    </main>
  );
}
