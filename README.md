# MiniMe Tools

Suíte de ferramentas para desenvolvedores de [minime.cloud](https://minime.cloud),
em português. Monorepo do frontend; a API do encurtador vive em
[minime-backend](https://github.com/rodrigokrug1/minime-backend).

## 🔒 O princípio

Com uma exceção, tudo roda no navegador. O que você cola numa ferramenta não é
enviado a servidor nenhum — não por promessa, mas porque não existe endpoint
para onde mandar. Vale para o JWT que você cola para inspecionar, para a query
que você formata e para o CPF que você valida.

A exceção é o encurtador de URL, que precisa gravar o link em algum lugar. Ele
é o único que chama a API, e a interface diz isso na própria página.

## 🚀 Tecnologias

- **Astro 7** com saída estática e ilhas React 19
- **Tailwind CSS 4** (configuração em CSS, sem `tailwind.config.js`)
- **TypeScript 7** e **Biome 2** no lugar de ESLint + Prettier
- **Vitest 5** para o núcleo
- **pnpm** workspaces

Astro estático, e não uma SPA, porque o ativo do projeto é busca orgânica de
cauda longa em português. Uma SPA entrega um HTML vazio ao rastreador e
preenche a página por JavaScript; aqui cada ferramenta é um documento pronto,
com o texto já servido.

## 📁 Estrutura

```
minime-tools/
├── apps/web/                   # Site Astro
│   └── src/
│       ├── components/
│       │   ├── islands/        # Componentes React (interatividade)
│       │   └── shell/          # Componentes Astro (casca, sem estado)
│       ├── layouts/            # Base.astro (head, SEO) e Ferramenta.astro
│       ├── lib/
│       │   ├── registry.ts     # Fonte única das ferramentas
│       │   ├── estruturado.ts  # JSON-LD
│       │   ├── icones.ts       # Ícones como dados tipados
│       │   └── og.ts           # Desenho dos cartões de compartilhamento
│       └── pages/
│           ├── ferramentas/    # Uma página por ferramenta
│           ├── og/             # Cartões PNG, gerados no build
│           └── sitemap.xml.ts
├── packages/core/              # Lógica das ferramentas, em funções puras
└── scripts/                    # Deploy e configuração da CDN
```

## 🧰 Ferramentas

| Ferramenta | Rota | No navegador |
|---|---|:---:|
| Encurtador de URL | `/ferramentas/encurtador-de-url` | usa a API |
| Gerador e validador de CPF | `/ferramentas/gerador-de-cpf` | ✓ |
| Gerador e validador de CNPJ | `/ferramentas/gerador-de-cnpj` | ✓ |
| PIX copia e cola | `/ferramentas/pix-copia-e-cola` | ✓ |
| Formatador de JSON | `/ferramentas/formatador-de-json` | ✓ |
| Formatador de SQL | `/ferramentas/formatador-de-sql` | ✓ |
| Base64 encoder e decoder | `/ferramentas/base64` | ✓ |
| Decodificador de JWT | `/ferramentas/decodificador-de-jwt` | ✓ |
| Imagem de código | `/ferramentas/imagem-de-codigo` | ✓ |
| Gerador de hash | `/ferramentas/gerador-de-hash` | ✓ |
| Testador de regex | `/ferramentas/testador-de-regex` | ✓ |
| Conversor de timestamp | `/ferramentas/conversor-de-timestamp` | ✓ |
| Interpretador de cron | `/ferramentas/cron` | ✓ |
| Calculadora de horas trabalhadas | `/ferramentas/calculadora-de-horas` | ✓ |

O CNPJ cobre o formato alfanumérico que entrou em vigor em julho de 2026.

## 🏗️ Arquitetura

**Toda lógica de ferramenta mora em `packages/core`, como função pura.** Sem
React, sem DOM, sem `window`. O componente da página cuida de estado e eventos e
chama o núcleo; o núcleo não sabe que existe uma página. É o que permite testar
o cálculo do dígito verificador, o CRC do PIX e a próxima execução de um cron
sem montar nada — são 205 testes.

**O `registry.ts` é a fonte única das ferramentas.** Rail lateral, paleta de
comandos, home, sitemap, JSON-LD e cartões de compartilhamento saem todos dele.
Acrescentar uma ferramenta é acrescentar uma entrada ali e criar o `.astro`
correspondente.

## 🔧 Desenvolvimento

```bash
pnpm install
pnpm dev          # http://localhost:4321
pnpm test         # Vitest no núcleo
pnpm typecheck
pnpm lint         # Biome
pnpm build
```

## ⚙️ Variáveis de ambiente

Em `apps/web/.env` (veja `.env.example`). As duas são embutidas no HTML em tempo
de build, e só o encurtador depende delas.

| Variável | Para quê |
|---|---|
| `PUBLIC_RECAPTCHA_SITE_KEY` | Chave pública do reCAPTCHA v2 |
| `PUBLIC_API_BASE_URL` | Origem da API (padrão `https://api.minime.cloud`) |

## 📦 Deploy

O site é estático num bucket S3 privado, servido por CloudFront com Origin
Access Control.

```bash
pnpm build
pnpm publicar
```

O `scripts/publicar.mjs` descobre a distribuição pelo alias `minime.cloud` e o
bucket pela origem dela — nenhum identificador fica escrito em arquivo. Sincroniza
`_astro/` com cache de um ano, porque os nomes têm hash do conteúdo, e o resto
com revalidação a cada visita. Depois invalida a borda.

### Roteamento na CDN

```bash
pnpm configurar-roteamento
```

Roda uma vez por distribuição, não a cada deploy. O endpoint REST do S3 — o
único que aceita Origin Access Control — não tem documento de índice: o pedido
chega como `/ferramentas/base64/` e a chave que existe é
`ferramentas/base64/index.html`. Sem `ListBucket` na política, o S3 responde
AccessDenied em vez de 404. O script instala uma CloudFront Function no
viewer-request (`scripts/roteamento.js`) que reescreve a URI, manda `www` para
o apex com 301 e aponta os erros para a página 404 do site.

## 🔎 SEO

- Texto de apoio de cada ferramenta em HTML servido, nunca dentro de ilha React
- `title`, meta description e canonical por página, vindos do registry
- `sitemap.xml` com `lastmod` por página, declarado no `robots.txt`
- JSON-LD: `WebApplication` e `BreadcrumbList` nas ferramentas, `WebSite` e
  `ItemList` na home
- Cartão de compartilhamento 1200×630 por ferramenta, desenhado no build com as
  fontes do próprio site
