import { EXEMPLOS_CRON, interpretarCron, MENSAGEM_CRON, proximasExecucoes } from '@minime/core';
import { useMemo, useState } from 'react';
import './Cron.css';

const FUSO_LOCAL = Intl.DateTimeFormat().resolvedOptions().timeZone;

const FORMATO = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const CAMPOS = [
  { rotulo: 'minuto', faixa: '0–59' },
  { rotulo: 'hora', faixa: '0–23' },
  { rotulo: 'dia do mês', faixa: '1–31' },
  { rotulo: 'mês', faixa: '1–12' },
  { rotulo: 'dia da semana', faixa: '0–6' },
];

export default function Cron() {
  const [entrada, setEntrada] = useState('30 8 * * 1-5');

  const resultado = useMemo(() => interpretarCron(entrada), [entrada]);

  const execucoes = useMemo(
    () => (resultado.ok ? proximasExecucoes(resultado.expressao, 5) : []),
    [resultado],
  );

  const partes = entrada.trim().replace(/\s+/g, ' ').split(' ');

  return (
    <div className="cron">
      <div className="painel-texto">
        <label className="rotulo" htmlFor="cron-entrada">
          Expressão cron
        </label>
        <input
          id="cron-entrada"
          className="campo campo-cron"
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="30 8 * * 1-5"
          value={entrada}
          onChange={(evento) => setEntrada(evento.target.value)}
        />
      </div>

      {/* Mapa dos cinco campos: mostra qual posição é qual enquanto a pessoa
          digita, que é a dúvida mais comum de quem não usa cron todo dia. */}
      <ol className="mapa">
        {CAMPOS.map((campo, indice) => (
          <li className="mapa-item" key={campo.rotulo}>
            <span className="mapa-valor">{partes[indice] ?? '·'}</span>
            <span className="mapa-rotulo">{campo.rotulo}</span>
            <span className="mapa-faixa">{campo.faixa}</span>
          </li>
        ))}
      </ol>

      {!resultado.ok && (
        <div className="erro-bloco" role="alert">
          <p className="erro-mensagem">
            {MENSAGEM_CRON[resultado.erro.motivo]}
            {resultado.erro.campo && ` Campo: ${resultado.erro.campo}.`}
            {resultado.erro.trecho && ` Trecho: ${resultado.erro.trecho}`}
          </p>
        </div>
      )}

      {resultado.ok && (
        <>
          <p className="descricao assenta" role="status">
            {resultado.descricao}
          </p>

          <div className="saida-simples">
            <span className="rotulo">Próximas execuções · {FUSO_LOCAL}</span>
            {execucoes.length === 0 ? (
              <p className="contagem">
                Esta expressão não dispara nos próximos oito anos. Confira se a combinação de dia e
                mês existe no calendário.
              </p>
            ) : (
              <ol className="execucoes">
                {execucoes.map((data) => (
                  <li key={data.toISOString()}>{FORMATO.format(data)}</li>
                ))}
              </ol>
            )}
          </div>

          <p className="contagem">
            Os horários acima usam o fuso do seu navegador. O servidor que roda o cron pode estar em
            outro — em contêiner, costuma ser UTC.
          </p>
        </>
      )}

      <div className="exemplos">
        <span className="rotulo">Exemplos</span>
        <ul className="exemplos-lista">
          {EXEMPLOS_CRON.map((exemplo) => (
            <li key={exemplo.expressao}>
              <button
                type="button"
                className="exemplo"
                onClick={() => setEntrada(exemplo.expressao)}
              >
                <code>{exemplo.expressao}</code>
                <span className="exemplo-para">{exemplo.para}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
