import { useEffect, useState } from 'react';

type Props = {
  /** Rótulo acima da área: "Saída", "Formatada". */
  rotulo: string;
  valor: string;
  placeholder?: string;
};

/**
 * Área de resultado com copiar e expandir.
 *
 * Compartilhada entre o formatador de JSON e o de SQL porque as duas telas
 * fazem a mesma coisa: mostrar um texto longo que a pessoa quer ler inteiro.
 * Duplicar isso significaria corrigir cada ajuste duas vezes — e ver os dois
 * saírem do lugar com o tempo.
 */
export default function PainelSaida({
  rotulo,
  valor,
  placeholder = 'O resultado aparece aqui',
}: Props) {
  const [copiado, setCopiado] = useState(false);
  const [expandido, setExpandido] = useState(false);

  const copiar = async () => {
    await navigator.clipboard.writeText(valor);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 2000);
  };

  // Esc fecha, como em qualquer sobreposição. Enquanto está aberta a página
  // atrás não rola: rolar o que está escondido desorienta ao fechar.
  useEffect(() => {
    if (!expandido) return;

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setExpandido(false);
    };

    const rolagemAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', aoTeclar);

    return () => {
      document.body.style.overflow = rolagemAnterior;
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [expandido]);

  const temConteudo = valor !== '';

  return (
    <div
      className={`painel-texto${expandido ? ' painel-expandido' : ''}`}
      {...(expandido ? { role: 'dialog', 'aria-modal': true, 'aria-label': rotulo } : {})}
    >
      <div className="painel-topo">
        <span className="rotulo">{rotulo}</span>

        {temConteudo && (
          <span className="painel-acoes">
            <button type="button" className="botao botao-discreto mini" onClick={copiar}>
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
            <button
              type="button"
              className="botao botao-discreto mini"
              onClick={() => setExpandido(!expandido)}
            >
              {expandido ? 'Recolher' : 'Expandir'}
            </button>
          </span>
        )}
      </div>

      <textarea
        className="campo area area-saida"
        readOnly
        spellCheck={false}
        placeholder={placeholder}
        value={valor}
      />

      {expandido && <p className="painel-dica">Esc para recolher</p>}
    </div>
  );
}
