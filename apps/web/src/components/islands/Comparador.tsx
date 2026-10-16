import {
  type Comparacao,
  compararTextos,
  type Lado,
  LIMITE_DE_LINHAS,
  type ParDeLinhas,
  saoIguais,
} from '@minime/core';
import { useState } from 'react';
import './Comparador.css';
import './Texto.css';

const EXEMPLO_A = `nome: servidor-producao
porta: 8080
timeout: 30
replicas: 2
log: info`;

const EXEMPLO_B = `nome: servidor-producao
porta: 8443
timeout: 30
replicas: 4
log: debug
tls: true`;

type Visao = 'lado-a-lado' | 'unificado';

/**
 * Uma linha renderizada, com o destaque dentro dela quando houver.
 *
 * As classes do comparador levam prefixo porque o CSS do site é global: nomes
 * curtos como `resultado` ou `resumo` já existem em outras ferramentas, e a
 * primeira versão desta tela acabou capturada pelo `.resultado` do command
 * palette, que está em toda página.
 */
function Linha({ lado, classe }: { lado: Lado | null; classe: string }) {
  if (!lado) {
    return <div className={`comparador-linha comparador-ausente ${classe}`} aria-hidden="true" />;
  }

  return (
    <div className={`comparador-linha ${classe}`}>
      <span className="comparador-numero">{lado.numero}</span>
      <span className="comparador-texto">
        {lado.pedacos
          ? lado.pedacos.map((pedaco, indice) => (
              // A posição é a identidade do trecho: ele não tem id próprio e a
              // lista é recriada inteira a cada comparação.
              // biome-ignore lint/suspicious/noArrayIndexKey: trecho sem id estável
              <span key={indice} className={pedaco.mudou ? 'comparador-mudou' : undefined}>
                {pedaco.texto}
              </span>
            ))
          : lado.texto}
        {lado.texto === '' && ' '}
      </span>
    </div>
  );
}

const CLASSE_POR_TIPO: Record<ParDeLinhas['tipo'], string> = {
  igual: 'comparador-igual',
  alterada: 'comparador-alterada',
  adicionada: 'comparador-adicionada',
  removida: 'comparador-removida',
};

export default function Comparador() {
  const [textoA, setTextoA] = useState('');
  const [textoB, setTextoB] = useState('');
  const [ignorarEspacos, setIgnorarEspacos] = useState(false);
  const [ignorarCaixa, setIgnorarCaixa] = useState(false);
  const [visao, setVisao] = useState<Visao>('lado-a-lado');
  const [resultado, setResultado] = useState<Comparacao | null>(null);

  const comparar = () =>
    setResultado(compararTextos(textoA, textoB, { ignorarEspacos, ignorarCaixa }));

  const limpar = () => {
    setTextoA('');
    setTextoB('');
    setResultado(null);
  };

  const usarExemplo = () => {
    setTextoA(EXEMPLO_A);
    setTextoB(EXEMPLO_B);
    setResultado(null);
  };

  return (
    <div className="texto-ferramenta">
      <div className="acoes">
        <button type="button" className="botao botao-primario" onClick={comparar}>
          Comparar
        </button>

        <label className="interruptor">
          <input
            type="checkbox"
            checked={ignorarEspacos}
            onChange={(evento) => setIgnorarEspacos(evento.target.checked)}
          />
          Ignorar espaços
        </label>

        <label className="interruptor">
          <input
            type="checkbox"
            checked={ignorarCaixa}
            onChange={(evento) => setIgnorarCaixa(evento.target.checked)}
          />
          Ignorar maiúsculas
        </label>

        <button type="button" className="botao botao-discreto" onClick={usarExemplo}>
          Usar exemplo
        </button>

        <button type="button" className="botao botao-discreto" onClick={limpar}>
          Limpar
        </button>
      </div>

      <div className="painéis">
        <div className="painel-texto">
          <label className="rotulo" htmlFor="comparador-a">
            Original
          </label>
          <textarea
            id="comparador-a"
            className="campo area area-entrada"
            spellCheck={false}
            placeholder="Cole aqui a primeira versão"
            value={textoA}
            onChange={(evento) => setTextoA(evento.target.value)}
          />
        </div>

        <div className="painel-texto">
          <label className="rotulo" htmlFor="comparador-b">
            Modificado
          </label>
          <textarea
            id="comparador-b"
            className="campo area area-entrada"
            spellCheck={false}
            placeholder="Cole aqui a segunda versão"
            value={textoB}
            onChange={(evento) => setTextoB(evento.target.value)}
          />
        </div>
      </div>

      {resultado?.excedeu && (
        <div className="erro-bloco" role="alert">
          <p className="erro-mensagem">
            Texto grande demais para comparar no navegador. O limite é de{' '}
            {LIMITE_DE_LINHAS.toLocaleString('pt-BR')} linhas por lado.
          </p>
        </div>
      )}

      {resultado && !resultado.excedeu && (
        <section className="comparador-resultado">
          <div className="comparador-topo">
            {saoIguais(resultado) ? (
              <p className="comparador-resumo comparador-iguais">Os dois textos são iguais.</p>
            ) : (
              <p className="comparador-resumo">
                <span className="comparador-conta comparador-conta-adicionada">
                  +{resultado.resumo.adicionadas} incluídas
                </span>
                <span className="comparador-conta comparador-conta-removida">
                  −{resultado.resumo.removidas} removidas
                </span>
                <span className="comparador-conta comparador-conta-alterada">
                  {resultado.resumo.alteradas} alteradas
                </span>
              </p>
            )}

            <div className="abas" role="tablist" aria-label="Forma de exibir">
              <button
                type="button"
                role="tab"
                aria-selected={visao === 'lado-a-lado'}
                className={`aba${visao === 'lado-a-lado' ? ' ativa' : ''}`}
                onClick={() => setVisao('lado-a-lado')}
              >
                Lado a lado
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={visao === 'unificado'}
                className={`aba${visao === 'unificado' ? ' ativa' : ''}`}
                onClick={() => setVisao('unificado')}
              >
                Unificado
              </button>
            </div>
          </div>

          <div className={`comparador-diferenca comparador-${visao}`}>
            {resultado.pares.map((par, indice) => {
              const classe = CLASSE_POR_TIPO[par.tipo];
              const chave = `${indice}-${par.tipo}`;

              if (visao === 'lado-a-lado') {
                // Numa linha alterada, a esquerda é o que saiu e a direita o
                // que entrou: vermelho e verde, como em qualquer diff. Pintar
                // os dois da mesma cor esconderia a direção da mudança.
                const esquerda = par.tipo === 'alterada' ? 'comparador-removida' : classe;
                const direita = par.tipo === 'alterada' ? 'comparador-adicionada' : classe;

                return (
                  <div className="comparador-par" key={chave}>
                    <Linha lado={par.esquerda} classe={esquerda} />
                    <Linha lado={par.direita} classe={direita} />
                  </div>
                );
              }

              // No unificado a linha alterada aparece duas vezes, a nova logo
              // abaixo da antiga — é assim que se lê um diff.
              return (
                <div className="comparador-par" key={chave}>
                  {par.esquerda && par.tipo !== 'adicionada' && (
                    <Linha
                      lado={par.esquerda}
                      classe={par.tipo === 'igual' ? classe : 'comparador-removida'}
                    />
                  )}
                  {par.direita && par.tipo !== 'igual' && (
                    <Linha lado={par.direita} classe="comparador-adicionada" />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
