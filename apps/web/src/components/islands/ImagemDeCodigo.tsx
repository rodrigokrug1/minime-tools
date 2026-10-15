import { buscarTema, LINGUAGENS, type Linguagem, TEMAS, tokenizar } from '@minime/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { aguardarFontes, desenhar, nomeDoArquivo } from '../../lib/desenharCodigo';
import './ImagemDeCodigo.css';

const EXEMPLO = `public async Task<Link> CriarAsync(string url, CancellationToken ct)
{
    var link = new MinimeUrl(url);

    // attribute_not_exists impede sobrescrever um link existente
    await _client.PutItemAsync(new PutItemRequest
    {
        TableName = MinimeUrl.TableName,
        ConditionExpression = "attribute_not_exists(UId)"
    }, ct);

    return link;
}`;

const CORPOS = [13, 15, 17, 20];
const MARGENS = [
  { valor: 0, nome: 'nenhuma' },
  { valor: 24, nome: 'pequena' },
  { valor: 48, nome: 'média' },
  { valor: 80, nome: 'grande' },
];

type Estado = 'carregando' | 'pronto';

export default function ImagemDeCodigo() {
  const [codigo, setCodigo] = useState(EXEMPLO);
  const [linguagem, setLinguagem] = useState<Linguagem>('csharp');
  const [temaId, setTemaId] = useState(TEMAS[0]?.id ?? 'carimbo');
  const [corpo, setCorpo] = useState(15);
  const [margem, setMargem] = useState(48);
  const [titulo, setTitulo] = useState('');
  const [numeros, setNumeros] = useState(true);
  const [cromo, setCromo] = useState(true);
  const [estado, setEstado] = useState<Estado>('carregando');
  const [copiado, setCopiado] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const linhas = useMemo(() => tokenizar(codigo, linguagem), [codigo, linguagem]);
  const tema = useMemo(() => buscarTema(temaId), [temaId]);

  // As fontes precisam estar carregadas antes do primeiro desenho; sem esta
  // espera o canvas mede com a fonte de fallback e a imagem sai torta.
  useEffect(() => {
    let vivo = true;

    aguardarFontes(corpo).then(() => {
      if (vivo) setEstado('pronto');
    });

    return () => {
      vivo = false;
    };
  }, [corpo]);

  useEffect(() => {
    if (estado !== 'pronto' || !canvasRef.current) return;

    desenhar(canvasRef.current, {
      linhas,
      tema,
      corpo,
      mostrarNumeros: numeros,
      mostrarCromo: cromo,
      titulo,
      margem,
      // 2x deixa a imagem nítida em tela retina e ao ser ampliada num slide.
      escala: 2,
    });
  }, [estado, linhas, tema, corpo, numeros, cromo, titulo, margem]);

  const baixar = () => {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const elo = document.createElement('a');

      elo.href = url;
      elo.download = nomeDoArquivo(linguagem);
      elo.click();

      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  const copiar = () => {
    canvasRef.current?.toBlob(async (blob) => {
      if (!blob) return;

      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopiado(true);
        window.setTimeout(() => setCopiado(false), 2000);
      } catch {
        // Firefox só libera a escrita de imagem no clipboard atrás de uma
        // configuração; nesse caso o download continua funcionando.
        baixar();
      }
    }, 'image/png');
  };

  return (
    <div className="imagem-codigo">
      <div className="painel-texto">
        <label className="rotulo" htmlFor="codigo-entrada">
          Código
        </label>
        <textarea
          id="codigo-entrada"
          className="campo area-codigo"
          spellCheck={false}
          value={codigo}
          onChange={(evento) => setCodigo(evento.target.value)}
        />
      </div>

      <div className="controles">
        <label className="seletor">
          Linguagem
          <select
            className="campo campo-curto"
            value={linguagem}
            onChange={(evento) => setLinguagem(evento.target.value as Linguagem)}
          >
            {LINGUAGENS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="seletor">
          Tema
          <select
            className="campo campo-curto"
            value={temaId}
            onChange={(evento) => setTemaId(evento.target.value)}
          >
            {TEMAS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="seletor">
          Corpo
          <select
            className="campo campo-curto"
            value={corpo}
            onChange={(evento) => setCorpo(Number(evento.target.value))}
          >
            {CORPOS.map((valor) => (
              <option key={valor} value={valor}>
                {valor}px
              </option>
            ))}
          </select>
        </label>

        <label className="seletor">
          Margem
          <select
            className="campo campo-curto"
            value={margem}
            onChange={(evento) => setMargem(Number(evento.target.value))}
          >
            {MARGENS.map((item) => (
              <option key={item.valor} value={item.valor}>
                {item.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="seletor">
          Título
          <input
            className="campo campo-curto"
            type="text"
            placeholder="opcional"
            maxLength={40}
            value={titulo}
            onChange={(evento) => setTitulo(evento.target.value)}
          />
        </label>

        <label className="interruptor">
          <input
            type="checkbox"
            checked={numeros}
            onChange={(evento) => setNumeros(evento.target.checked)}
          />
          Numerar linhas
        </label>

        <label className="interruptor">
          <input
            type="checkbox"
            checked={cromo}
            onChange={(evento) => setCromo(evento.target.checked)}
          />
          Barra da janela
        </label>
      </div>

      <div className="previa">
        {estado === 'carregando' ? (
          <p className="contagem">Carregando as fontes…</p>
        ) : (
          <canvas ref={canvasRef} className="canvas" />
        )}
      </div>

      <div className="acoes">
        <button
          type="button"
          className="botao botao-primario"
          onClick={baixar}
          disabled={estado !== 'pronto'}
        >
          Baixar PNG
        </button>
        <button
          type="button"
          className="botao botao-discreto"
          onClick={copiar}
          disabled={estado !== 'pronto'}
        >
          {copiado ? 'Copiado' : 'Copiar imagem'}
        </button>
      </div>

      <p className="contagem">
        A imagem é gerada em dobro da resolução, para ficar nítida em tela retina e ao ser ampliada
        num slide.
      </p>
    </div>
  );
}
