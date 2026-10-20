/**
 * Fonte única da verdade das ferramentas.
 *
 * Alimenta, sem duplicação: o rail lateral, o command palette, a home, o
 * sitemap e as meta tags de cada página. Acrescentar uma ferramenta é
 * acrescentar uma entrada aqui e criar o .astro correspondente.
 */

export type Categoria = 'documentos' | 'texto' | 'conversao' | 'rede' | 'tempo';

export type Ferramenta = {
  /** Usado na rota: /ferramentas/<slug> */
  slug: string;
  nome: string;
  /** Vira a meta description e o texto do card. Uma frase. */
  descricao: string;
  /**
   * Título da aba e do resultado de busca, quando precisa divergir do `nome`.
   *
   * Existe por um motivo medido: `json formatter` tem de 10 mil a 100 mil
   * buscas por mês vindas do Brasil, contra 100 a 1 mil de `formatador de
   * json`. Quem programa procura a ferramenta em inglês. O `nome` continua em
   * português porque alimenta o rail, o command palette e o card da home, onde
   * um título longo com dois idiomas fica ilegível.
   */
  tituloSeo?: string;
  categoria: Categoria;
  /** Termos de busca para o command palette. */
  palavrasChave: string[];
  /** false quando a ferramenta depende de servidor. */
  clientSide: boolean;
  status: 'ativo' | 'planejado';
  /**
   * Data ISO (AAAA-MM-DD) da última mudança de conteúdo desta página. Vai para
   * o `lastmod` do sitemap, que é o que faz o buscador decidir o que revisitar.
   *
   * Ausente usa a data de publicação do site. Preencher só quando a página
   * mudar de verdade: `lastmod` que avança a cada build vira ruído, e um
   * buscador que aprende a não confiar nele passa a ignorá-lo.
   */
  atualizadoEm?: string;
};

/** Data em que a suíte de ferramentas foi ao ar. */
export const PUBLICADO_EM = '2026-10-15';

export function atualizadoEm(ferramenta: Ferramenta): string {
  return ferramenta.atualizadoEm ?? PUBLICADO_EM;
}

/** Rota da ferramenta. Centralizado para rail, home, palette e sitemap não divergirem. */
export function caminhoDa(ferramenta: Ferramenta): string {
  return `/ferramentas/${ferramenta.slug}`;
}

export const ROTULO_CATEGORIA: Record<Categoria, string> = {
  documentos: 'Documentos',
  texto: 'Texto e dados',
  conversao: 'Conversão',
  rede: 'Rede',
  tempo: 'Tempo',
};

/** Ordem em que as categorias aparecem no rail. */
export const ORDEM_CATEGORIAS: Categoria[] = ['documentos', 'texto', 'conversao', 'tempo', 'rede'];

export const FERRAMENTAS: Ferramenta[] = [
  {
    slug: 'encurtador-de-url',
    nome: 'Encurtador de URL',
    descricao: 'Transforme um endereço longo em um link curto de seis caracteres.',
    categoria: 'rede',
    palavrasChave: ['url', 'link', 'encurtar', 'short', 'minime'],
    clientSide: false,
    status: 'ativo',
  },
  {
    slug: 'gerador-de-cpf',
    nome: 'Gerador e validador de CPF',
    descricao: 'Gere CPFs válidos para teste e confira o cálculo do dígito verificador.',
    categoria: 'documentos',
    palavrasChave: ['cpf', 'documento', 'dígito verificador', 'validar', 'gerar'],
    clientSide: true,
    status: 'ativo',
  },
  {
    slug: 'gerador-de-cnpj',
    nome: 'Gerador e validador de CNPJ',
    descricao: 'Gere e valide CNPJ, incluindo o formato alfanumérico.',
    categoria: 'documentos',
    palavrasChave: ['cnpj', 'alfanumérico', 'documento', 'empresa', 'validar'],
    clientSide: true,
    status: 'ativo',
  },
  {
    slug: 'pix-copia-e-cola',
    nome: 'PIX copia e cola',
    descricao: 'Monte um BR Code de PIX com QR a partir da chave e do valor.',
    categoria: 'documentos',
    palavrasChave: ['pix', 'br code', 'qr', 'pagamento', 'copia e cola'],
    clientSide: true,
    status: 'ativo',
  },
  {
    slug: 'formatador-de-json',
    nome: 'Formatador de JSON',
    tituloSeo: 'Formatador de JSON online — JSON Formatter',
    descricao: 'Indente, minifique e valide JSON sem que o conteúdo saia do navegador.',
    categoria: 'texto',
    palavrasChave: ['json', 'formatar', 'indentar', 'minificar', 'validar', 'json formatter'],
    clientSide: true,
    status: 'ativo',
    atualizadoEm: '2026-10-20',
  },
  {
    slug: 'formatador-de-sql',
    nome: 'Formatador de SQL',
    tituloSeo: 'Formatador de SQL online — SQL Formatter',
    descricao: 'Organize queries de T-SQL, PostgreSQL e outros dialetos no seu navegador.',
    categoria: 'texto',
    palavrasChave: ['sql', 'formatar', 'query', 'tsql', 'postgres', 'sql formatter'],
    clientSide: true,
    status: 'ativo',
    atualizadoEm: '2026-10-18',
  },
  {
    slug: 'base64',
    nome: 'Base64 encoder e decoder',
    tituloSeo: 'Codificar e decodificar Base64 — Base64 Encode e Decode',
    descricao: 'Converta texto para Base64 e de volta, com suporte a Base64URL.',
    categoria: 'conversao',
    palavrasChave: [
      'base64',
      'base64url',
      'codificar',
      'decodificar',
      'encode',
      'decode',
      'base64 decode',
      'base64 encode',
    ],
    clientSide: true,
    status: 'ativo',
    atualizadoEm: '2026-10-18',
  },
  {
    slug: 'decodificador-de-jwt',
    nome: 'Decodificador de JWT',
    tituloSeo: 'Decodificador de JWT online — JWT Decoder',
    descricao: 'Leia o header e o payload de um token sem enviá-lo a lugar nenhum.',
    categoria: 'texto',
    palavrasChave: ['jwt', 'token', 'decodificar', 'base64', 'claims', 'jwt decoder'],
    clientSide: true,
    status: 'ativo',
    atualizadoEm: '2026-10-18',
  },
  {
    slug: 'imagem-de-codigo',
    nome: 'Imagem de código',
    descricao: 'Transforme um trecho de código em imagem para slide, post ou documentação.',
    categoria: 'texto',
    palavrasChave: ['código', 'imagem', 'screenshot', 'print', 'snippet', 'carbon'],
    clientSide: true,
    status: 'ativo',
  },
  {
    slug: 'gerador-de-hash',
    nome: 'Gerador de hash',
    descricao: 'Calcule SHA-256, SHA-1 e MD5 de um texto ou arquivo.',
    categoria: 'conversao',
    palavrasChave: ['hash', 'sha256', 'md5', 'checksum'],
    clientSide: true,
    status: 'ativo',
  },
  {
    slug: 'comparador-de-textos',
    nome: 'Comparador de textos',
    descricao: 'Veja o que mudou entre duas versões de um texto, linha a linha.',
    categoria: 'texto',
    palavrasChave: ['comparar', 'diff', 'diferença', 'text compare', 'versões', 'mudanças'],
    clientSide: true,
    status: 'ativo',
  },
  {
    slug: 'testador-de-regex',
    nome: 'Testador de regex',
    tituloSeo: 'Testador de regex online — Regex Tester',
    descricao: 'Teste expressões regulares com destaque dos grupos capturados.',
    categoria: 'texto',
    palavrasChave: ['regex', 'expressão regular', 'testar', 'match', 'regex tester'],
    clientSide: true,
    status: 'ativo',
    atualizadoEm: '2026-10-18',
  },
  {
    slug: 'conversor-de-timestamp',
    nome: 'Conversor de timestamp',
    tituloSeo: 'Conversor de timestamp — Epoch Converter',
    descricao: 'Converta entre epoch, ISO 8601 e data legível, com fuso horário.',
    categoria: 'tempo',
    palavrasChave: [
      'timestamp',
      'epoch',
      'unix',
      'iso 8601',
      'data',
      'epoch converter',
      'timestamp converter',
    ],
    clientSide: true,
    status: 'ativo',
    atualizadoEm: '2026-10-18',
  },
  {
    slug: 'cron',
    nome: 'Interpretador de cron',
    tituloSeo: 'Interpretador de expressão cron — Cron Expression Parser',
    descricao: 'Leia uma expressão cron em português e veja as próximas execuções.',
    categoria: 'tempo',
    palavrasChave: ['cron', 'crontab', 'agendamento', 'expressão', 'schedule', 'cron expression'],
    clientSide: true,
    status: 'ativo',
    atualizadoEm: '2026-10-18',
  },
  {
    slug: 'calculadora-de-horas',
    nome: 'Calculadora de horas trabalhadas',
    descricao: 'Some entradas e saídas do dia e veja o saldo do banco de horas.',
    categoria: 'tempo',
    palavrasChave: ['horas', 'ponto', 'banco de horas', 'jornada', 'saldo'],
    clientSide: true,
    status: 'ativo',
  },
];

export const FERRAMENTAS_ATIVAS = FERRAMENTAS.filter((f) => f.status === 'ativo');

/** O que vai para a tag <title>. Cai no nome quando não há título próprio. */
export function tituloSeo(ferramenta: Ferramenta): string {
  return ferramenta.tituloSeo ?? ferramenta.nome;
}

export function buscarFerramenta(slug: string): Ferramenta | undefined {
  return FERRAMENTAS.find((f) => f.slug === slug);
}

/** Agrupa na ordem de ORDEM_CATEGORIAS, pulando categorias sem ferramenta. */
export function agruparPorCategoria(): Array<{ categoria: Categoria; itens: Ferramenta[] }> {
  return ORDEM_CATEGORIAS.map((categoria) => ({
    categoria,
    itens: FERRAMENTAS.filter((f) => f.categoria === categoria),
  })).filter((grupo) => grupo.itens.length > 0);
}
