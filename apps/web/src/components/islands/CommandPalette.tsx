import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { caminhoDa, FERRAMENTAS, type Ferramenta, ROTULO_CATEGORIA } from '../../lib/registry';
import IconeSvg from './IconeSvg';
import './CommandPalette.css';

/**
 * Busca por subsequência: "fcpf" encontra "Formatador... CPF" e "gcp" encontra
 * "Gerador de CPF". Para uma lista de poucas dezenas de itens isso basta e
 * dispensa uma dependência de fuzzy search.
 */
function casa(alvo: string, termo: string): boolean {
  let indice = 0;

  for (const caractere of termo) {
    indice = alvo.indexOf(caractere, indice);
    if (indice === -1) return false;
    indice += 1;
  }

  return true;
}

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function filtrar(termo: string): Ferramenta[] {
  const busca = normalizar(termo.trim());

  if (busca === '') return FERRAMENTAS;

  return FERRAMENTAS.filter((ferramenta) => {
    const alvo = normalizar(
      [ferramenta.nome, ferramenta.descricao, ...ferramenta.palavrasChave].join(' '),
    );

    return alvo.includes(busca) || casa(alvo, busca);
  });
}

export default function CommandPalette() {
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState('');
  const [selecionado, setSelecionado] = useState(0);
  const entradaRef = useRef<HTMLInputElement>(null);

  const resultados = useMemo(() => filtrar(termo), [termo]);

  const fechar = useCallback(() => {
    setAberto(false);
    setTermo('');
    setSelecionado(0);
  }, []);

  const navegar = useCallback(
    (ferramenta: Ferramenta) => {
      if (ferramenta.status !== 'ativo') return;
      fechar();
      window.location.href = caminhoDa(ferramenta);
    },
    [fechar],
  );

  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if ((evento.metaKey || evento.ctrlKey) && evento.key.toLowerCase() === 'k') {
        evento.preventDefault();
        setAberto((anterior) => !anterior);
      }
      if (evento.key === 'Escape') fechar();
    };

    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [fechar]);

  useEffect(() => {
    if (aberto) entradaRef.current?.focus();
  }, [aberto]);

  useEffect(() => {
    setSelecionado(0);
  }, []);

  if (!aberto) {
    return (
      <button type="button" className="gatilho" onClick={() => setAberto(true)}>
        <span>Buscar ferramenta</span>
        <kbd className="atalho">Ctrl K</kbd>
      </button>
    );
  }

  const aoTeclarNaLista = (evento: React.KeyboardEvent<HTMLInputElement>) => {
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      setSelecionado((atual) => Math.min(atual + 1, resultados.length - 1));
    }
    if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      setSelecionado((atual) => Math.max(atual - 1, 0));
    }
    if (evento.key === 'Enter') {
      evento.preventDefault();
      const alvo = resultados[selecionado];
      if (alvo) navegar(alvo);
    }
  };

  return (
    <>
      <button type="button" className="gatilho" onClick={() => setAberto(true)}>
        <span>Buscar ferramenta</span>
        <kbd className="atalho">Ctrl K</kbd>
      </button>

      <div className="fundo">
        {/* O fundo é um botão de verdade, não uma div com onClick: assim fechar
            por clique também funciona por teclado, sem handler sintético. */}
        <button type="button" className="fundo-fechar" onClick={fechar} tabIndex={-1}>
          <span className="sr-apenas">Fechar busca</span>
        </button>

        <div className="painel" role="dialog" aria-modal="true" aria-label="Buscar ferramenta">
          <input
            ref={entradaRef}
            className="entrada"
            type="text"
            value={termo}
            placeholder="Buscar por nome ou palavra-chave..."
            onChange={(evento) => {
              setTermo(evento.target.value);
              setSelecionado(0);
            }}
            onKeyDown={aoTeclarNaLista}
            aria-controls="palette-resultados"
          />

          <ul className="resultados" id="palette-resultados">
            {resultados.length === 0 && (
              <li className="vazio">Nenhuma ferramenta com esse termo. Tente outra palavra.</li>
            )}
            {resultados.map((ferramenta, indice) => (
              <li key={ferramenta.slug}>
                <button
                  type="button"
                  className={`resultado${indice === selecionado ? ' selecionado' : ''}`}
                  disabled={ferramenta.status !== 'ativo'}
                  onMouseEnter={() => setSelecionado(indice)}
                  onClick={() => navegar(ferramenta)}
                >
                  <IconeSvg slug={ferramenta.slug} />
                  <span className="resultado-nome">{ferramenta.nome}</span>
                  <span className="resultado-meta">
                    {ferramenta.status === 'ativo'
                      ? ROTULO_CATEGORIA[ferramenta.categoria]
                      : 'em breve'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
