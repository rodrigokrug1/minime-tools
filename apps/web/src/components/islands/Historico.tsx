import { useEffect, useState } from 'react';
import { lerHistorico, limparHistorico } from '../../lib/historico';
import { buscarFerramenta, caminhoDa, type Ferramenta } from '../../lib/registry';
import IconeSvg from './IconeSvg';
import './Historico.css';

/**
 * Ferramentas usadas recentemente neste navegador.
 *
 * A leitura acontece depois da montagem porque `localStorage` não existe
 * durante a geração estática. Até lá o componente não renderiza nada — e
 * também não renderiza quando o histórico está vazio, para a home de quem
 * chega pela primeira vez não ganhar um bloco oco.
 */
export default function Historico() {
  const [slugs, setSlugs] = useState<string[] | null>(null);

  useEffect(() => {
    setSlugs(lerHistorico());
  }, []);

  if (slugs === null) return null;

  // O predicado é tipado porque um `filter` comum não estreita o tipo: o slug
  // pode ter saído do registry desde que foi gravado no navegador.
  const itens = slugs
    .map((slug) => buscarFerramenta(slug))
    .filter((item): item is Ferramenta => item !== undefined && item.status === 'ativo');

  if (itens.length === 0) return null;

  return (
    <section className="historico">
      <div className="historico-topo">
        <h2 className="rotulo">Usadas recentemente</h2>
        <button
          type="button"
          className="historico-limpar"
          onClick={() => {
            limparHistorico();
            setSlugs([]);
          }}
        >
          Limpar
        </button>
      </div>

      <ul className="historico-lista">
        {itens.map((item) => (
          <li key={item.slug}>
            <a className="historico-item" href={caminhoDa(item)}>
              <IconeSvg slug={item.slug} />
              {item.nome}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
