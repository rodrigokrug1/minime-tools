import { type ErroJson, formatarJson, formatarJsonOrdenado, minificarJson } from '@minime/core';
import { useState } from 'react';
import './Texto.css';

const EXEMPLO = '{"nome":"Maria","ativo":true,"tags":["a","b"],"saldo":10.5}';

export default function Json() {
  const [entrada, setEntrada] = useState('');
  const [saida, setSaida] = useState('');
  const [erro, setErro] = useState<ErroJson | null>(null);
  const [espacos, setEspacos] = useState(2);
  const [ordenar, setOrdenar] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const aplicar = (resultado: ReturnType<typeof formatarJson>) => {
    setCopiado(false);

    if (resultado.ok) {
      setSaida(resultado.saida);
      setErro(null);
    } else {
      setSaida('');
      setErro(resultado.erro);
    }
  };

  const formatar = () =>
    aplicar(ordenar ? formatarJsonOrdenado(entrada, espacos) : formatarJson(entrada, espacos));

  const minificar = () => aplicar(minificarJson(entrada));

  const copiar = async () => {
    await navigator.clipboard.writeText(saida);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="texto-ferramenta">
      <div className="acoes">
        <button type="button" className="botao botao-primario" onClick={formatar}>
          Formatar
        </button>
        <button type="button" className="botao botao-discreto" onClick={minificar}>
          Minificar
        </button>

        <label className="seletor">
          Indentação
          <select
            className="campo campo-curto"
            value={espacos}
            onChange={(evento) => setEspacos(Number(evento.target.value))}
          >
            <option value={2}>2 espaços</option>
            <option value={4}>4 espaços</option>
            <option value={1}>1 espaço</option>
          </select>
        </label>

        <label className="interruptor">
          <input
            type="checkbox"
            checked={ordenar}
            onChange={(evento) => setOrdenar(evento.target.checked)}
          />
          Ordenar chaves
        </label>

        <button
          type="button"
          className="botao botao-discreto"
          onClick={() => {
            setEntrada(EXEMPLO);
            setSaida('');
            setErro(null);
          }}
        >
          Usar exemplo
        </button>
      </div>

      <div className="painéis">
        <div className="painel-texto">
          <label className="rotulo" htmlFor="json-entrada">
            Entrada
          </label>
          <textarea
            id="json-entrada"
            className="campo area"
            spellCheck={false}
            placeholder="Cole seu JSON aqui"
            value={entrada}
            onChange={(evento) => {
              setEntrada(evento.target.value);
              setErro(null);
            }}
          />
        </div>

        <div className="painel-texto">
          <div className="painel-topo">
            <span className="rotulo">Saída</span>
            {saida !== '' && (
              <button type="button" className="botao botao-discreto mini" onClick={copiar}>
                {copiado ? 'Copiado' : 'Copiar'}
              </button>
            )}
          </div>
          <textarea
            className="campo area"
            readOnly
            spellCheck={false}
            placeholder="O resultado aparece aqui"
            value={saida}
          />
        </div>
      </div>

      {erro && (
        <div className="erro-bloco" role="alert">
          <p className="erro-titulo">
            Linha {erro.linha}, coluna {erro.coluna}
          </p>
          <p className="erro-mensagem">{erro.mensagem}</p>
          {erro.trecho && <pre className="erro-trecho">{erro.trecho}</pre>}
        </div>
      )}
    </div>
  );
}
