import { converterTimestamp, MENSAGEM_TIMESTAMP } from '@minime/core';
import { useMemo, useState } from 'react';
import './Texto.css';

const FUSO_LOCAL = Intl.DateTimeFormat().resolvedOptions().timeZone;

const ORIGEM_POR_EXTENSO = {
  segundos: 'número lido como epoch em segundos',
  milissegundos: 'número lido como epoch em milissegundos',
  texto: 'texto lido como data',
} as const;

export default function Timestamp() {
  const [entrada, setEntrada] = useState('');

  const resultado = useMemo(
    () => (entrada.trim() === '' ? null : converterTimestamp(entrada)),
    [entrada],
  );

  const agora = () => setEntrada(String(Math.floor(Date.now() / 1000)));

  return (
    <div className="texto-ferramenta">
      <div className="painel-texto">
        <label className="rotulo" htmlFor="ts-entrada">
          Timestamp ou data
        </label>
        <input
          id="ts-entrada"
          className="campo"
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="1700000000 ou 2026-10-10T12:00:00Z"
          value={entrada}
          onChange={(evento) => setEntrada(evento.target.value)}
        />
      </div>

      <div className="acoes">
        <button type="button" className="botao botao-discreto" onClick={agora}>
          Usar o instante de agora
        </button>
      </div>

      {resultado !== null && !resultado.ok && (
        <div className="erro-bloco" role="alert">
          <p className="erro-mensagem">{MENSAGEM_TIMESTAMP[resultado.motivo]}</p>
        </div>
      )}

      {resultado?.ok && (
        <div className="saida-simples assenta">
          <dl className="lista-claims">
            <div className="linha-dado">
              <dt>epoch em segundos</dt>
              <dd>{resultado.instante.epochSegundos}</dd>
            </div>
            <div className="linha-dado">
              <dt>epoch em milissegundos</dt>
              <dd>{resultado.instante.epochMilissegundos}</dd>
            </div>
            <div className="linha-dado">
              <dt>ISO 8601 (UTC)</dt>
              <dd>{resultado.instante.iso}</dd>
            </div>
            <div className="linha-dado">
              <dt>seu fuso ({FUSO_LOCAL})</dt>
              <dd>
                {new Intl.DateTimeFormat('pt-BR', {
                  dateStyle: 'full',
                  timeStyle: 'long',
                }).format(new Date(resultado.instante.epochMilissegundos))}
              </dd>
            </div>
          </dl>

          <p className="contagem">
            Interpretação adotada: {ORIGEM_POR_EXTENSO[resultado.instante.origem]}.
          </p>
        </div>
      )}
    </div>
  );
}
