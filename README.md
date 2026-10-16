# PlayKids — Matemática no Ritmo

Jogo musical de matemática para crianças. A música toca, um desafio aparece (contar figuras, resolver uma conta, reconhecer um número falado, dizer qual número é maior, completar uma sequência) e a criança responde no ritmo. A velocidade da música se adapta ao desempenho.

Esta fase é um **protótipo 100% estático** (sem backend), publicado no GitHub Pages, para validar a ideia com crianças reais. Sem analytics, sem SDKs de terceiros, sem fontes ou scripts de CDN: tudo é servido pelo próprio site e o progresso fica só no aparelho.

**Jogar:** https://digomes87.github.io/PlayKids/

## Como rodar

Requer Node 22+.

```bash
npm install
npm run dev        # http://localhost:5173/PlayKids/
npm test           # testes do motor, conteúdo, progresso e calibração (Vitest)
npm run test:e2e   # E2E no build de produção: iPad (WebKit) e tablet Android (Chromium)
npm run build      # typecheck + build de produção em dist/
npm run preview    # serve o build (necessário para testar PWA/offline)
```

Para testar num tablet na mesma rede: `npm run dev -- --host` e abra o endereço mostrado. O service worker só existe no build (`npm run preview`), e instalar o PWA exige HTTPS — use a versão publicada para isso.

## Como publicar

O workflow `.github/workflows/deploy.yml` roda os testes, faz o build e publica no GitHub Pages a cada push na `main`.

1. No repositório: **Settings → Pages → Source: GitHub Actions** (só na primeira vez).
2. `git push origin main`.

O `base` do Vite vem de `VITE_BASE`, que o workflow define como `/<nome-do-repo>/`. Para publicar em outro caminho (domínio próprio, outra hospedagem), rode `VITE_BASE=/ npm run build`. As rotas usam `HashRouter`, então não é preciso `404.html`.

## Arquitetura

```
src/
  engine/       Motor em TypeScript puro: relógio pelo tempo da mídia, agenda de desafios,
                janela de acerto, tempo adaptativo, eventos. Sem React e sem DOM.
  audio/        Player web (HTMLAudioElement) que implementa a interface do motor; voz.
  content/      Schema zod dos capítulos, carregamento e gerador de desafios.
  renderers/    Um componente React por prompt.type + o mapa tipo -> componente.
  game/         Liga motor, áudio, store (Zustand) e tela do jogo.
  story/        Início, intro do capítulo e recompensa.
  progress/     Interface ProgressRepository, implementação IndexedDB, domínio por skill.
  parents/      Área dos pais: portão, relatório, exportar/importar JSON.
  calibration/  Tela e cálculo da calibração de latência.
  app/          Shell: rotas, configurações, bloqueio de zoom, aviso de girar o tablet.
public/content/ Pacotes de conteúdo: index.json, capítulos, áudio e imagens.
scripts/        Geradores: desafios, áudio placeholder e ícones.
```

Decisões que permitem migrar depois sem reescrever o motor:

- **O motor só conhece a interface `AudioPlayer`** (`src/engine/types.ts`). No navegador ela é implementada por `WebAudioPlayer`; em React Native basta outra implementação. Os testes usam um player falso.
- **O relógio do jogo é `audio.currentTime`** (tempo da mídia). Timestamps e janelas são escritos em 1.0x e continuam valendo em qualquer velocidade, sem conversão.
- **A UI só conhece `ProgressRepository`** (`src/progress/types.ts`). Trocar o IndexedDB por uma versão com sync remoto é mudar uma linha em `src/progress/index.ts`.

### Tempo adaptativo

Um único arquivo de áudio por música; a velocidade muda com `playbackRate` e `preservesPitch = true`. Níveis 0.75, 0.9 e 1.0, começando em 0.9. Dois erros (ou desafios sem resposta) seguidos descem um nível; cinco acertos seguidos sobem um. A regra fica em `src/engine/tempo.ts`.

### Latência

Em **Área dos pais → Calibrar**, o adulto toca junto com 12 cliques; a mediana dos desvios (descartando os 4 primeiros) vira o offset, salvo no IndexedDB. O motor desconta esse offset de cada resposta e estende o fechamento da janela na mesma medida.

### Compartilhar resultado

Na tela de recompensa, **Compartilhar** abre a folha de compartilhamento nativa do aparelho (Web Share API) com estrelas, placar e link do jogo — sem SDK de rede social e sem nenhum dado da criança. Como leva para fora do jogo, passa antes pelo portão dos pais. Onde a Web Share API não existe (ex.: Firefox no desktop), o texto é copiado para a área de transferência.

### Domínio por skill

Cada resposta é gravada com skill, resultado, tempo de reação e velocidade. O domínio considera as últimas 20 respostas de cada skill: *Começando* (menos de 3), *Dominado* (8+ respostas e 80%+ de acerto) ou *Praticando*. Ver `src/progress/mastery.ts`.

## Como adicionar um capítulo

1. Coloque o áudio em `public/content/audio/` e as imagens em `public/content/images/`.
2. Crie `public/content/chapters/<id>.json` com os metadados e `"challenges": []`:

   ```json
   {
     "schemaVersion": 1,
     "id": "chapter-02",
     "title": "O Mar de Números",
     "intro": { "text": "Os peixes querem cantar!", "image": "images/fish.svg" },
     "reward": { "text": "Você fez o mar cantar!", "sticker": "images/sticker-rocket.svg" },
     "audio": { "src": "audio/chapter-02.mp3", "bpm": 100, "durationSec": 75 },
     "challenges": []
   }
   ```

3. Liste as batidas em que a criança deve responder, uma por linha, em `content-src/chapter-02.timestamps.txt`. Formato: `<segundos> [tipo] [skill]`; `#` inicia comentário.

   ```
   8.4   image_count
   13.2  equation addition
   18.0  number_audio
   22.8  equation subtraction
   ```

4. Gere os desafios (o script valida o capítulo inteiro com o schema e recusa janelas sobrepostas):

   ```bash
   npm run gen:challenges -- \
     --timestamps content-src/chapter-02.timestamps.txt \
     --chapter public/content/chapters/chapter-02.json \
     --images images/fish.svg,images/star.svg --max 5 --lead 2 --after 1.3 --seed 7
   ```

   | Flag | Padrão | Significado |
   |------|--------|-------------|
   | `--type` | `image_count` | Tipo das linhas sem tipo |
   | `--lead` | `2` | Segundos entre o prompt aparecer e a batida |
   | `--after` | `1.333` | Tolerância depois da batida |
   | `--max` | `5` | Maior resultado permitido |
   | `--options` | `3` | Quantidade de alternativas (2 a 4) |
   | `--images` | `images/star.svg` | Imagens sorteadas em `image_count` |
   | `--seed` | `1` | Semente: mesmo seed, mesmo capítulo |
   | `--out` | — | Grava só o array de desafios, em vez de `--chapter` |

   Os desafios também podem ser escritos ou ajustados à mão; cada um tem `showAt`, `targetAt`, `closeAt` (segundos a 1.0x), `prompt`, `options` e `answer`.

5. Registre o capítulo em `public/content/index.json`.
6. Rode `npm test`: um teste valida todo o conteúdo publicado contra o schema e a agenda do motor.

O áudio e os ícones atuais são placeholders sintetizados (`npm run gen:audio`, `npm run gen:icons`).

## Como adicionar um novo `prompt.type`

Use o `compare` (qual número é maior) como referência: é o tipo mais recente e passou por todos os passos abaixo.

1. **Schema** — em `src/content/schema.ts`, crie o schema do prompt, inclua-o em `promptSchema` e ensine `expectedAnswer` a calcular a resposta. Regras extras do tipo entram no `superRefine` do desafio (o `compare` exige números distintos e só eles como opções):

   ```ts
   export const comparePromptSchema = z.object({
     type: z.literal('compare'),
     left: smallInt,
     right: smallInt,
   });
   ```

2. **Renderer** — crie `src/renderers/<Tipo>Renderer.tsx` recebendo `PromptRendererProps<'compare'>` e registre em `RENDERERS` (`src/renderers/registry.tsx`). O mapa é tipado por `PromptType`: enquanto o renderer não for registrado, o projeto não compila.
3. **Gerador** (opcional) — adicione o caso em `buildPrompt` e a skill padrão em `DEFAULT_SKILL` (`src/content/generateChallenges.ts`); `parseTimestamps` aceita automaticamente todo tipo que estiver em `DEFAULT_SKILL`. Se as opções não forem "resposta + vizinhos", trate o tipo em `buildChoices`.
4. **Rótulo** (opcional) — se criou uma skill nova, dê um nome a ela em `SKILL_LABEL` (`src/parents/ParentsDashboard.tsx`).

O motor não muda: ele trata `prompt` como dado opaco e só compara `answer` com a opção tocada.

## Navegadores

- **Áudio no iOS/Safari**: a música só começa depois do toque no botão "Começar", que só é liberado quando o áudio do capítulo já foi baixado.
- **Paisagem**: em retrato aparece uma tela pedindo para girar o tablet.
- **Zoom e seleção de texto** ficam bloqueados.
- **Offline**: depois do primeiro acesso, o service worker serve app, JSON, áudio e imagens do cache. Para instalar: Safari → Compartilhar → *Adicionar à Tela de Início*; Chrome → *Instalar app*.
- **Atualizações**: o app procura versão nova ao abrir, ao voltar para a frente e a cada 30 minutos (`src/app/serviceWorker.ts`). Quando ela termina de baixar, o app recarrega sozinho — mas nunca no meio de uma partida: espera a criança sair do capítulo.
- **`number_audio`** usa a gravação indicada em `prompt.audio`; sem ela, usa a síntese de voz do aparelho (pt-BR). Para o jogo final, prefira gravações: a voz sintetizada varia entre aparelhos e pode não estar disponível offline.

Alvos de teste: Safari no iPad e Chrome no Android.

### Diagnóstico

O app guarda no próprio aparelho (`localStorage`) os ~600 eventos técnicos mais recentes: início/pausa/fim da partida, cada desafio aberto e resolvido, eventos do elemento de áudio (`play`, `pause`, `waiting`, `stalled`…), fala da voz do aparelho, erros não tratados e a versão (`build`, o commit do deploy). Nada é enviado para fora. Em **Área dos pais → Diagnóstico** dá para exportar o JSON, copiar ou limpar. Ver `src/diagnostics/`.

Quando a música é pausada por fora do jogo (a voz do aparelho falando o número, uma notificação, a Siri), o relógio do jogo pararia junto. A partida detecta isso — pelo evento `pause` que o jogo não pediu e por um vigia que nota o tempo da música parado por 1,5 s — e volta a tocar assim que a voz termina; se o aparelho não deixar, mostra a tela de pausa.

### Testes E2E

Ficam em `e2e/` e rodam com Playwright contra `vite preview` (o build de produção), em paisagem, nos dois alvos. Na primeira vez, baixe os navegadores com `npx playwright install chromium webkit`.

Os testes de partida trocam os desafios do capítulo 1 por dois curtos (`e2e/fixtures.ts`), para a partida acabar em segundos; o áudio continua o de verdade, porque é ele o relógio do jogo. Cobrem: lista de capítulos, intro, aviso de girar o tablet, um desafio de cada `prompt.type` até o fim, acerto/erro/tempo esgotado, pausa (o relógio para de verdade), música pausada por fora do jogo (tem de se recuperar, nunca congelar), tela de recompensa, progresso no relatório, exportação do diagnóstico e o portão dos pais. Ao criar um `prompt.type`, inclua-o em `EVERY_PROMPT_TYPE` (`e2e/fixtures.ts`). No CI eles rodam antes do deploy; se falharem, o trace fica nos artefatos do workflow.
