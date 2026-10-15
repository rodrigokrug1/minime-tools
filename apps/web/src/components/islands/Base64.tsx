import {
  codificarBase64,
  decodificarBase64,
  decodificarParaHex,
  MENSAGEM_BASE64,
  pareceBase64Url,
} from '@minime/core';
import { useState } from 'react';
import './Texto.css';

type Modo = 'codificar' | 'decodificar';

export default function Base64() {
  const [modo, setModo] = useState<Modo>('codificar');
  const [entrada, setEntrada] = useState('');
  const [saida, setSaida] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [url, setUrl] = useState(false);
  const [comoHex, setComoHex] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const converter = () => {
    setCopiado(false);

    const resultado =
      modo === 'codificar'
        ? codificarBase64(entrada, url)
        : comoHex
          ? decodificarParaHex(entrada)
          : decodificarBase64(entrada);

    if (resultado.ok) {
      setSaida(resultado.saida);
      setErro(null);
    } else {
      setSaida('');
      setErro(MENSAGEM_BASE64[resultado.motivo]);
    }
  };

  /** Joga a saída de volta na entrada para conferir a ida e volta. */
  const inverter = () => {
    setModo(modo === 'codificar' ? 'decodificar' : 'codificar');
    setEntrada(saida);
    setSaida(entrada);
    setErro(null);
    setCopiado(false);
  };

  const copiar = async () => {
    await navigator.clipboard.writeText(saida);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 2000);
  };

  const trocarModo = (novo: Modo) => {
    setModo(novo);
    setSaida('');
    setErro(null);
    setCopiado(false);
  };

  const avisoUrl =
    modo === 'decodificar' && entrada !== '' && pareceBase64Url(entrada)
      ? 'Este texto usa o alfabeto Base64URL. A decodificação já trata disso.'
      : null;

  return (
    <div className="texto-ferramenta">
      <div className="abas" role="tablist" aria-label="Modo da conversão">
        <button
          type="button"
          role="tab"
          aria-selected={modo === 'codificar'}
          className={`aba${modo === 'codificar' ? ' ativa' : ''}`}
          onClick={() => trocarModo('codificar')}
        >
          Codificar
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={modo === 'decodificar'}
          className={`aba${modo === 'decodificar' ? ' ativa' : ''}`}
          onClick={() => trocarModo('decodificar')}
        >
          Decodificar
        </button>
      </div>

      <div className="acoes">
        <button type="button" className="botao botao-primario" onClick={converter}>
          {modo === 'codificar' ? 'Codificar' : 'Decodificar'}
        </button>

        {modo === 'codificar' ? (
          <label className="interruptor">
            <input
              type="checkbox"
              checked={url}
              onChange={(evento) => setUrl(evento.target.checked)}
            />
            Base64URL (sem padding, para JWT e query string)
          </label>
        ) : (
          <label className="interruptor">
            <input
              type="checkbox"
              checked={comoHex}
              onChange={(evento) => setComoHex(evento.target.checked)}
            />
            Mostrar os bytes em hexadecimal
          </label>
        )}

        {saida !== '' && (
          <button type="button" className="botao botao-discreto" onClick={inverter}>
            Inverter
          </button>
        )}
      </div>

      <div className="painéis">
        <div className="painel-texto">
          <label className="rotulo" htmlFor="b64-entrada">
            {modo === 'codificar' ? 'Texto' : 'Base64'}
          </label>
          <textarea
            id="b64-entrada"
            className="campo area"
            spellCheck={false}
            placeholder={
              modo === 'codificar' ? 'Digite ou cole o texto' : 'Cole o Base64 ou Base64URL'
            }
            value={entrada}
            onChange={(evento) => {
              setEntrada(evento.target.value);
              setErro(null);
            }}
          />
        </div>

        <div className="painel-texto">
          <div className="painel-topo">
            <span className="rotulo">{modo === 'codificar' ? 'Base64' : 'Texto'}</span>
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

      {avisoUrl && <p className="contagem">{avisoUrl}</p>}

      {erro && (
        <div className="erro-bloco" role="alert">
          <p className="erro-mensagem">{erro}</p>
          {erro === MENSAGEM_BASE64.utf8 && (
            <p className="erro-mensagem">
              Marque a opção de hexadecimal para ver os bytes mesmo assim.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
