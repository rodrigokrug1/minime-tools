import type { PassoDv } from '@minime/core';
import './Verificacao.css';

/**
 * Mostra o cálculo do dígito verificador acontecendo: os dígitos de base, os
 * pesos, os produtos, a soma, o resto e o DV resultante.
 *
 * É o elemento-assinatura do site. Nenhum concorrente brasileiro exibe a
 * conta, e é o que separa um gerador descartável de algo que ensina.
 */

type Props = {
  passos: PassoDv[];
  /** Quando ausente, nenhum veredito é exibido (modo geração). */
  valido?: boolean;
};

export default function Verificacao({ passos, valido }: Props) {
  if (passos.length === 0) return null;

  return (
    <section className="verificacao" aria-label="Cálculo do dígito verificador">
      {passos.map((passo) => {
        const confere = passo.informado === undefined || passo.informado === passo.esperado;

        return (
          <article className="passo" key={passo.titulo}>
            <h3 className="rotulo">{passo.titulo}</h3>

            {/* Cada coluna é uma posição do documento; as linhas são o
                caractere de origem (só no CNPJ alfanumérico), o valor que
                entra na conta, o peso e o produto. */}
            <div className="conta-rolagem">
              <table className="conta">
                <caption className="sr-apenas">Dígitos, pesos e produtos de {passo.titulo}</caption>
                <tbody>
                  {passo.caracteres && (
                    <tr>
                      <th scope="row">caractere</th>
                      {passo.caracteres.map((caractere, indice) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: a posição é a identidade da célula
                        <td className="celula-caractere" key={`c-${indice}`}>
                          {caractere}
                        </td>
                      ))}
                    </tr>
                  )}
                  <tr>
                    <th scope="row">{passo.caracteres ? 'valor' : 'dígito'}</th>
                    {passo.digitos.map((digito, indice) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: a posição é a identidade da célula
                      <td key={`d-${indice}`}>{digito}</td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">peso</th>
                    {passo.pesos.map((peso, indice) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: a posição é a identidade da célula
                      <td className="celula-peso" key={`p-${indice}`}>
                        {peso}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">produto</th>
                    {passo.digitos.map((digito, indice) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: a posição é a identidade da célula
                      <td className="celula-produto" key={`x-${indice}`}>
                        {digito * (passo.pesos[indice] ?? 0)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="resumo">
              soma <strong>{passo.soma}</strong> · resto de {passo.soma} ÷ {passo.modulo} ={' '}
              <strong>{passo.resto}</strong> · dígito{' '}
              <strong className={`assenta ${confere ? 'bate' : 'nao-bate'}`}>
                {passo.esperado}
              </strong>
              {passo.informado !== undefined && !confere && (
                <>
                  {' '}
                  — a entrada traz <strong className="nao-bate">{passo.informado}</strong>
                </>
              )}
            </p>
          </article>
        );
      })}

      {valido !== undefined && (
        <p className={`veredito ${valido ? 'bate' : 'nao-bate'}`} role="status">
          {valido ? 'Todos os dígitos conferem.' : 'O documento não passa na verificação.'}
        </p>
      )}
    </section>
  );
}
