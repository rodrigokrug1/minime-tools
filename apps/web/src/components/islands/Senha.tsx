import {
  avaliarForca,
  COMPRIMENTO_MAXIMO,
  COMPRIMENTO_MINIMO,
  COMPRIMENTO_PADRAO,
  type Forca,
  gerarSenha,
  MENSAGEM_SENHA,
  type OpcoesDeSenha,
  type ResultadoSenha,
  ROTULO_DA_FORCA,
} from '@minime/core';
import { useCallback, useEffect, useState } from 'react';
import './Senha.css';
import './Texto.css';

/**
 * As classes próprias levam prefixo `senha-` porque o CSS do site é global e
 * nomes curtos já existem em outras ferramentas. O comparador aprendeu isso da
 * forma cara, sendo capturado pelo `.resultado` do command palette.
 */

type Classe = Exclude<keyof OpcoesDeSenha, 'comprimento'>;

const CLASSES: { chave: Classe; rotulo: string }[] = [
  { chave: 'minusculas', rotulo: 'Minúsculas' },
  { chave: 'maiusculas', rotulo: 'Maiúsculas' },
  { chave: 'digitos', rotulo: 'Números' },
  { chave: 'simbolos', rotulo: 'Símbolos' },
];

const PADRAO: OpcoesDeSenha = {
  comprimento: COMPRIMENTO_PADRAO,
  minusculas: true,
  maiusculas: true,
  digitos: true,
  simbolos: true,
  semAmbiguos: false,
};

/** Proporção da barra, saturando em 128 bits — acima disso a diferença é decorativa. */
function proporcao(bits: number): number {
  return Math.min(100, Math.round((bits / 128) * 100));
}

/** Onde o cursor está entre o comprimento mínimo e o máximo, em por cento. */
function percorrido(comprimento: number): number {
  const faixa = COMPRIMENTO_MAXIMO - COMPRIMENTO_MINIMO;

  return Math.round(((comprimento - COMPRIMENTO_MINIMO) / faixa) * 100);
}

const CLASSE_DA_FORCA: Record<Forca, string> = {
  fraca: 'senha-forca-fraca',
  razoavel: 'senha-forca-razoavel',
  boa: 'senha-forca-boa',
  excelente: 'senha-forca-excelente',
};

export default function Senha() {
  const [opcoes, setOpcoes] = useState<OpcoesDeSenha>(PADRAO);
  const [resultado, setResultado] = useState<ResultadoSenha | null>(null);
  const [copiado, setCopiado] = useState(false);

  const gerar = useCallback((atuais: OpcoesDeSenha) => {
    setResultado(gerarSenha(atuais));
    setCopiado(false);
  }, []);

  // A primeira senha sai no efeito, não na renderização: o componente também é
  // renderizado no build, onde não existe Web Crypto, e gerar ali produziria
  // uma senha no HTML estático — igual para todo mundo que abrisse a página.
  useEffect(() => {
    gerar(PADRAO);
  }, [gerar]);

  const ajustar = (mudanca: Partial<OpcoesDeSenha>) => {
    const atuais = { ...opcoes, ...mudanca };

    setOpcoes(atuais);
    gerar(atuais);
  };

  const copiar = async () => {
    if (!resultado?.ok) return;

    await navigator.clipboard.writeText(resultado.senha);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 2000);
  };

  const forca = resultado?.ok ? avaliarForca(resultado.entropiaBits) : null;

  return (
    <div className="senha-ferramenta">
      <div className="senha-saida">
        <label className="rotulo" htmlFor="senha-gerada">
          Senha gerada
        </label>

        <div className="senha-linha">
          <input
            id="senha-gerada"
            className="campo senha-campo"
            type="text"
            readOnly
            spellCheck={false}
            value={resultado?.ok ? resultado.senha : ''}
            placeholder={resultado && !resultado.ok ? '—' : 'Gerando…'}
          />

          <button
            type="button"
            className="botao botao-discreto"
            onClick={copiar}
            disabled={!resultado?.ok}
          >
            {copiado ? 'Copiado' : 'Copiar'}
          </button>

          <button
            type="button"
            className="botao botao-primario"
            onClick={() => gerar(opcoes)}
            disabled={resultado !== null && !resultado.ok}
          >
            Gerar outra
          </button>
        </div>
      </div>

      {resultado && !resultado.ok && (
        <div className="erro-bloco" role="alert">
          <p className="erro-mensagem">{MENSAGEM_SENHA[resultado.erro]}</p>
        </div>
      )}

      {resultado?.ok && forca && (
        <div className="senha-forca">
          <div className="senha-barra" aria-hidden="true">
            <span
              className={`senha-barra-cheia ${CLASSE_DA_FORCA[forca]}`}
              style={{ width: `${proporcao(resultado.entropiaBits)}%` }}
            />
          </div>

          <p className="senha-medida">
            <strong className={CLASSE_DA_FORCA[forca]}>{ROTULO_DA_FORCA[forca]}</strong>
            <span className="senha-bits">
              {resultado.entropiaBits} bits de entropia · alfabeto de {resultado.tamanhoDoAlfabeto}{' '}
              caracteres
            </span>
          </p>
        </div>
      )}

      <div className="senha-controles">
        <div className="senha-comprimento">
          <label className="rotulo" htmlFor="senha-comprimento">
            Comprimento: <strong>{opcoes.comprimento}</strong>
          </label>
          <input
            id="senha-comprimento"
            className="senha-range"
            type="range"
            min={COMPRIMENTO_MINIMO}
            max={COMPRIMENTO_MAXIMO}
            value={opcoes.comprimento}
            // A posição do preenchimento é a única parte do controle que o CSS
            // sozinho não sabe: vai como variável para o gradiente do trilho.
            style={
              {
                '--preenchido': `${percorrido(opcoes.comprimento)}%`,
              } as React.CSSProperties
            }
            onChange={(evento) => ajustar({ comprimento: Number(evento.target.value) })}
          />
        </div>

        <div className="acoes">
          {CLASSES.map(({ chave, rotulo }) => (
            <label className="interruptor" key={chave}>
              <input
                type="checkbox"
                checked={opcoes[chave]}
                onChange={(evento) => ajustar({ [chave]: evento.target.checked })}
              />
              {rotulo}
            </label>
          ))}

          <label className="interruptor">
            <input
              type="checkbox"
              checked={opcoes.semAmbiguos}
              onChange={(evento) => ajustar({ semAmbiguos: evento.target.checked })}
            />
            Sem caracteres ambíguos
          </label>
        </div>
      </div>
    </div>
  );
}
