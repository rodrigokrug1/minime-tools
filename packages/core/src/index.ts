export {
  codificarBase64,
  decodificarBase64,
  decodificarParaHex,
  MENSAGEM_BASE64,
  type MotivoBase64Invalido,
  pareceBase64Url,
  type ResultadoBase64,
} from './base64/index.js';
export {
  calcularLayout,
  comprimentoDaLinha,
  type Layout,
  type OpcoesLayout,
} from './codigo/layout.js';
export { buscarTema, corDoEscopo, TEMAS, type Tema } from './codigo/temas.js';
export {
  LINGUAGENS,
  type Linguagem,
  type Linha,
  type Token,
  tokenizar,
} from './codigo/tokens.js';
export {
  type Comparacao,
  compararTextos,
  type Lado,
  LIMITE_DE_CARACTERES,
  LIMITE_DE_LINHAS,
  type OpcoesDeComparacao,
  type ParDeLinhas,
  type Pedaco,
  type Resumo,
  saoIguais,
  type TipoDePar,
} from './comparacao/index.js';
export {
  type CampoCron,
  type ErroCron,
  EXEMPLOS_CRON,
  type ExpressaoCron,
  interpretarCron,
  MENSAGEM_CRON,
  MES_POR_EXTENSO,
  type MotivoCronInvalido,
  proximasExecucoes,
  type ResultadoCron,
  SEMANA_POR_EXTENSO,
} from './cron/index.js';
export {
  formatarCnpj,
  gerarCnpj,
  MENSAGEM_CNPJ,
  type MotivoCnpjInvalido,
  type ResultadoCnpj,
  validarCnpj,
} from './documentos/cnpj.js';
export {
  formatarCpf,
  gerarCpf,
  MENSAGEM_CPF,
  type MotivoCpfInvalido,
  type ResultadoCpf,
  validarCpf,
} from './documentos/cpf.js';
export { digitoModulo11, type PassoDv, valorDoCaractere } from './documentos/dv.js';
export {
  type ErroJson,
  formatarJson,
  formatarJsonOrdenado,
  minificarJson,
  ordenarChaves,
  type ResultadoJson,
} from './json/index.js';
export {
  DESCRICAO_CLAIM,
  decodificarJwt,
  MENSAGEM_JWT,
  type MotivoJwtInvalido,
  type ResultadoJwt,
  type TokenDecodificado,
} from './jwt/index.js';
export {
  conferirCrc,
  crc16,
  type DadosPix,
  MENSAGEM_PIX,
  type MotivoPixInvalido,
  montarPix,
  type ResultadoPix,
} from './pix/index.js';
export {
  calcularJornada,
  converterTimestamp,
  type InstanteConvertido,
  type LinhaCalculada,
  type Marcacao,
  MENSAGEM_HORA,
  MENSAGEM_TIMESTAMP,
  normalizarHora,
  paraHora,
  paraMinutos,
  type ResultadoTimestamp,
  type ResumoJornada,
} from './tempo/index.js';
export {
  MENSAGEM_POR_MOTIVO,
  type MotivoInvalido,
  normalizarUrl,
  type ResultadoValidacao,
  validarUrl,
} from './url/index.js';
