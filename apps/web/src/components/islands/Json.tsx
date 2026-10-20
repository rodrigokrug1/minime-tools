import { type ErroJson, formatarJson, formatarJsonOrdenado, minificarJson } from '@minime/core';
import { useState } from 'react';
import PainelSaida from './PainelSaida';
import './Texto.css';

const EXEMPLO = '{"nome":"Maria","ativo":true,"tags":["a","b"],"saldo":10.5}';

export default function Json() {
  const [entrada, setEntrada] = useState('');
  const [saida, setSaida] = useState('');
  const [erro, setErro] = useState<ErroJson | null>(null);
  const [desescapado, setDesescapado] = useState(false);
  const [espacos, setEspacos] = useState(2);
  const [ordenar, setOrdenar] = useState(false);

  const aplicar = (resultado: ReturnType<typeof formatarJson>) => {
    if (resultado.ok) {
      setSaida(resultado.saida);
      setErro(null);
      setDesescapado(resultado.desescapado);
    } else {
      setSaida('');
      setErro(resultado.erro);
      setDesescapado(false);
    }
  };

  const formatar = () =>
    aplicar(ordenar ? formatarJsonOrdenado(entrada, espacos) : formatarJson(entrada, espacos));

  const minificar = () => aplicar(minificarJson(entrada));

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
            setDesescapado(false);
          }}
        >
          Usar exemplo
        </button>
      </div>

      <div className="pilha">
        <div className="painel-texto">
          <label className="rotulo" htmlFor="json-entrada">
            Entrada
          </label>
          <textarea
            id="json-entrada"
            className="campo area area-entrada"
            spellCheck={false}
            placeholder="Cole seu JSON aqui"
            value={entrada}
            onChange={(evento) => {
              setEntrada(evento.target.value);
              setErro(null);
              setDesescapado(false);
            }}
          />
        </div>

        <PainelSaida rotulo="Saída" valor={saida} />
      </div>

      {desescapado && (
        <p className="aviso">
          O texto estava escapado, como sai de um log. Os escapes foram desfeitos antes de formatar.
        </p>
      )}

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
