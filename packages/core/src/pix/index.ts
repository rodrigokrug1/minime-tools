/**
 * Monta o BR Code do PIX estático — o texto do "copia e cola".
 *
 * O formato é o EMV QRCPS-MPM: uma sequência de campos ID-tamanho-valor, em
 * que o tamanho tem sempre dois dígitos e campos podem conter outros campos.
 * O último campo é o CRC16 sobre todo o restante da cadeia.
 */

export type DadosPix = {
  /** Chave PIX: CPF, CNPJ, e-mail, telefone ou chave aleatória. */
  chave: string;
  /** Nome do recebedor. Até 25 caracteres no padrão. */
  nome: string;
  /** Cidade do recebedor. Até 15 caracteres no padrão. */
  cidade: string;
  /** Valor em reais. Ausente ou zero gera um código de valor livre. */
  valor?: number;
  /** Identificador da transação. Sem informar, usa '***'. */
  identificador?: string;
  /** Texto livre que acompanha o pagamento. */
  descricao?: string;
};

export type MotivoPixInvalido = 'chave-vazia' | 'nome-vazio' | 'cidade-vazia' | 'valor-negativo';

export type ResultadoPix =
  | { ok: true; codigo: string; avisos: string[] }
  | { ok: false; motivo: MotivoPixInvalido };

export const MENSAGEM_PIX: Record<MotivoPixInvalido, string> = {
  'chave-vazia': 'Informe a chave PIX que vai receber o pagamento.',
  'nome-vazio': 'Informe o nome do recebedor, como aparece na conta.',
  'cidade-vazia': 'Informe a cidade do recebedor.',
  'valor-negativo': 'O valor não pode ser negativo. Deixe em branco para o pagador escolher.',
};

/** Monta um campo no formato ID + tamanho em dois dígitos + valor. */
function campo(id: string, valor: string): string {
  return `${id}${String(valor.length).padStart(2, '0')}${valor}`;
}

/**
 * Remove acentos e símbolos fora do conjunto aceito, e corta no limite.
 *
 * Nome e cidade com acento fazem alguns aplicativos de banco recusarem a
 * leitura, então a normalização é parte do formato, não preciosismo.
 */
function sanear(texto: string, limite: number): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 $%*+\-./:]/g, '')
    .trim()
    .slice(0, limite)
    .toUpperCase();
}

/**
 * CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF), como o padrão do PIX
 * exige. O resultado entra como quatro dígitos hexadecimais maiúsculos.
 */
export function crc16(texto: string): string {
  let crc = 0xffff;

  for (let i = 0; i < texto.length; i += 1) {
    crc ^= texto.charCodeAt(i) << 8;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function montarPix(dados: DadosPix): ResultadoPix {
  const chave = dados.chave.trim();
  const nome = dados.nome.trim();
  const cidade = dados.cidade.trim();

  if (chave === '') return { ok: false, motivo: 'chave-vazia' };
  if (nome === '') return { ok: false, motivo: 'nome-vazio' };
  if (cidade === '') return { ok: false, motivo: 'cidade-vazia' };
  if (dados.valor !== undefined && dados.valor < 0) {
    return { ok: false, motivo: 'valor-negativo' };
  }

  const avisos: string[] = [];

  const nomeSaneado = sanear(nome, 25);
  const cidadeSaneada = sanear(cidade, 15);

  if (nomeSaneado !== nome.toUpperCase()) {
    avisos.push('O nome foi ajustado para o conjunto de caracteres que os bancos aceitam.');
  }
  if (cidadeSaneada !== cidade.toUpperCase()) {
    avisos.push('A cidade foi ajustada para o conjunto de caracteres que os bancos aceitam.');
  }

  // Conta do recebedor: GUI fixo do PIX, chave e, opcionalmente, descrição.
  const descricao = dados.descricao ? sanear(dados.descricao, 72) : '';
  const contaRecebedor =
    campo('00', 'br.gov.bcb.pix') + campo('01', chave) + (descricao ? campo('02', descricao) : '');

  const identificador = dados.identificador ? sanear(dados.identificador, 25) : '***';

  const partes = [
    campo('00', '01'), // versão do payload
    campo('01', '11'), // 11 = estático, reutilizável
    campo('26', contaRecebedor),
    campo('52', '0000'), // código de categoria do comerciante: não informado
    campo('53', '986'), // moeda: real
    ...(dados.valor && dados.valor > 0 ? [campo('54', dados.valor.toFixed(2))] : []),
    campo('58', 'BR'),
    campo('59', nomeSaneado),
    campo('60', cidadeSaneada),
    campo('62', campo('05', identificador)),
  ];

  // O CRC cobre a cadeia inteira incluindo o próprio ID e tamanho do campo 63.
  const semCrc = `${partes.join('')}6304`;

  return { ok: true, codigo: `${semCrc}${crc16(semCrc)}`, avisos };
}

/** Confere o CRC de um BR Code recebido de fora. */
export function conferirCrc(codigo: string): boolean {
  if (codigo.length < 8) return false;

  const corpo = codigo.slice(0, -4);
  const informado = codigo.slice(-4).toUpperCase();

  return corpo.endsWith('6304') && crc16(corpo) === informado;
}
