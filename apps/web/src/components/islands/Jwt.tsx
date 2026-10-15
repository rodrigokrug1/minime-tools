import { DESCRICAO_CLAIM, decodificarJwt, MENSAGEM_JWT } from '@minime/core';
import { useMemo, useState } from 'react';
import './Texto.css';

const FORMATO_DATA = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'medium',
});

export default function Jwt() {
  const [entrada, setEntrada] = useState('');

  const resultado = useMemo(
    () => (entrada.trim() === '' ? null : decodificarJwt(entrada)),
    [entrada],
  );

  return (
    <div className="texto-ferramenta">
      <div className="painel-texto">
        <label className="rotulo" htmlFor="jwt-entrada">
          Token
        </label>
        <textarea
          id="jwt-entrada"
          className="campo area area-curta"
          spellCheck={false}
          placeholder="Cole o JWT aqui. O prefixo Bearer pode vir junto."
          value={entrada}
          onChange={(evento) => setEntrada(evento.target.value)}
        />
      </div>

      {resultado === null && (
        <p className="dica-jwt">
          O token é decodificado aqui no navegador. A assinatura não é verificada — isso exigiria a
          chave secreta, que você não deve colar em página nenhuma.
        </p>
      )}

      {resultado !== null && !resultado.ok && (
        <div className="erro-bloco" role="alert">
          <p className="erro-mensagem">{MENSAGEM_JWT[resultado.motivo]}</p>
        </div>
      )}

      {resultado?.ok && (
        <>
          {resultado.token.expirado !== undefined && (
            <p
              className={`estado-token ${resultado.token.expirado ? 'nao-bate' : 'bate'}`}
              role="status"
            >
              {resultado.token.expirado
                ? 'Este token já expirou.'
                : 'Este token ainda está dentro da validade.'}
            </p>
          )}

          <div className="painéis">
            <div className="painel-texto">
              <span className="rotulo">Header</span>
              <textarea
                className="campo area"
                readOnly
                spellCheck={false}
                value={JSON.stringify(resultado.token.header, null, 2)}
              />
            </div>

            <div className="painel-texto">
              <span className="rotulo">Payload</span>
              <textarea
                className="campo area"
                readOnly
                spellCheck={false}
                value={JSON.stringify(resultado.token.payload, null, 2)}
              />
            </div>
          </div>

          <div className="saida-simples">
            <span className="rotulo">Claims com significado definido</span>
            <dl className="lista-claims">
              {Object.entries(resultado.token.payload)
                .filter(([chave]) => chave in DESCRICAO_CLAIM)
                .map(([chave, valor]) => {
                  const data =
                    ['exp', 'iat', 'nbf'].includes(chave) && typeof valor === 'number'
                      ? FORMATO_DATA.format(new Date(valor * 1000))
                      : null;

                  return (
                    <div className="linha-dado" key={chave}>
                      <dt>
                        {chave} · {DESCRICAO_CLAIM[chave]}
                      </dt>
                      <dd>{data ? `${valor} (${data})` : String(valor)}</dd>
                    </div>
                  );
                })}
            </dl>
          </div>

          <div className="saida-simples">
            <span className="rotulo">Assinatura (não verificada)</span>
            <code className="assinatura">{resultado.token.assinatura}</code>
          </div>
        </>
      )}
    </div>
  );
}
