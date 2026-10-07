/** Resolve um caminho de conteúdo respeitando o `base` do Vite (GitHub Pages serve em /<repo>/). */
export function contentUrl(path: string): string {
  return `${import.meta.env.BASE_URL}content/${path}`;
}
