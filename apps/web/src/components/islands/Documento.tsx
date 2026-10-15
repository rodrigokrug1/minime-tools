import type { PassoDv } from '@minime/core';
import { useState } from 'react';
import Verificacao from './Verificacao';
import './Documento.css';

/**
 * Casca comum do gerador/validador de CPF e CNPJ. As duas ferramentas têm a
 * mesma forma — alterna entre gerar e validar, mostra o número e abre a conta
 * do dígito verificador — e só diferem nas funções que recebem.
 */

export type SaidaDocumento = {
  formatado: string;
  cru: string;
  passos: PassoDv[];
};

export type SaidaValidacao =
  | { ok: true; formatado: string; passos: PassoDv[]; nota?: string }
  | { ok: false; mensagem: string; passos: PassoDv[] };

type Props = {
  /** "CPF" ou "CNPJ" — usado nos rótulos. */
  rotulo: string;
  placeholder: string;
  gerar: () => SaidaDocumento;
  validar: (entrada: string) => SaidaValidacao;
  /** Controle extra do gerador, como o interruptor de alfanumérico do CNPJ. */
  opcoes?: React.ReactNode;
};

type Modo = 'gerar' | 'validar';

export default function Documento({ rotulo, placeholder, gerar, validar, opcoes }: Props) {
  const [modo, setModo] = useState<Modo>('gerar');
  const [entrada, setEntrada] = useState('');
  const [gerado, setGerado] = useState<SaidaDocumento | null>(null);
  const [validado, setValidado] = useState<SaidaValidacao | null>(null);
  const [copiado, setCopiado] = useState(false);

  const aoGerar = () => {
    setGerado(gerar());
    setCopiado(false);
  };

  const aoValidar = (texto: string) => {
    setEntrada(texto);
    setValidado(texto.trim() === '' ? null : validar(texto));
  };

  const copiar = async (texto: string) => {
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 2000);
  };

  const trocarModo = (novo: Modo) => {
    setModo(novo);
    setCopiado(false);
  };

  return (
    <div className="documento">
      <div className="abas" role="tablist" aria-label={`Modo da ferramenta de ${rotulo}`}>
        <button
          type="button"
          role="tab"
          aria-selected={modo === 'gerar'}
          className={`aba${modo === 'gerar' ? ' ativa' : ''}`}
          onClick={() => trocarModo('gerar')}
        >
          Gerar
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={modo === 'validar'}
          className={`aba${modo === 'validar' ? ' ativa' : ''}`}
          onClick={() => trocarModo('validar')}
        >
          Validar
        </button>
      </div>

      {modo === 'gerar' ? (
        <div className="painel">
          {opcoes}

          <button type="button" className="botao botao-primario" onClick={aoGerar}>
            Gerar {rotulo}
          </button>

          {gerado === null ? (
            <p className="dica">
              O número gerado passa na verificação, mas não pertence a ninguém — serve para teste.
            </p>
          ) : (
            <>
              <div className="saida assenta">
                <output className="numero">{gerado.formatado}</output>
                <div className="saida-acoes">
                  <button
                    type="button"
                    className="botao botao-discreto"
                    onClick={() => copiar(gerado.formatado)}
                  >
                    {copiado ? 'Copiado' : 'Copiar'}
                  </button>
                  <button
                    type="button"
                    className="botao botao-discreto"
                    onClick={() => copiar(gerado.cru)}
                  >
                    Copiar sem máscara
                  </button>
                </div>
              </div>

              <Verificacao passos={gerado.passos} />
            </>
          )}
        </div>
      ) : (
        <div className="painel">
          <label className="rotulo" htmlFor="entrada-documento">
            {rotulo} a verificar
          </label>
          <input
            id="entrada-documento"
            className="campo"
            type="text"
            inputMode={rotulo === 'CPF' ? 'numeric' : 'text'}
            autoComplete="off"
            spellCheck={false}
            placeholder={placeholder}
            value={entrada}
            onChange={(evento) => aoValidar(evento.target.value)}
          />

          {validado === null && (
            <p className="dica">Pode colar com ou sem pontuação. A conta aparece abaixo.</p>
          )}

          {validado !== null && !validado.ok && (
            <p className="mensagem nao-bate" role="alert">
              {validado.mensagem}
            </p>
          )}

          {validado?.ok && (
            <p className="mensagem bate" role="status">
              {validado.formatado} passa na verificação.
              {validado.nota ? ` ${validado.nota}` : ''}
            </p>
          )}

          {validado !== null && validado.passos.length > 0 && (
            <Verificacao passos={validado.passos} valido={validado.ok} />
          )}
        </div>
      )}
    </div>
  );
}
