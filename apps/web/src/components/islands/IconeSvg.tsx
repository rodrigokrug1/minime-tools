import { type FormaIcone, iconeDe } from '../../lib/icones';

/**
 * Versão React do ícone, para as ilhas. O equivalente em Astro é
 * components/shell/Icone.astro; ambos leem as mesmas formas de lib/icones.ts.
 */

type Props = {
  slug: string;
  tamanho?: number;
};

function Forma({ forma }: { forma: FormaIcone }) {
  switch (forma.tipo) {
    case 'path':
      return <path d={forma.d} />;
    case 'circle':
      return <circle cx={forma.cx} cy={forma.cy} r={forma.r} />;
    case 'ellipse':
      return <ellipse cx={forma.cx} cy={forma.cy} rx={forma.rx} ry={forma.ry} />;
    case 'rect':
      return (
        <rect x={forma.x} y={forma.y} width={forma.largura} height={forma.altura} rx={forma.rx} />
      );
  }
}

export default function IconeSvg({ slug, tamanho = 16 }: Props) {
  return (
    <svg
      className="icone"
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconeDe(slug).map((forma, indice) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a lista é estática e nunca reordena
        <Forma forma={forma} key={indice} />
      ))}
    </svg>
  );
}
