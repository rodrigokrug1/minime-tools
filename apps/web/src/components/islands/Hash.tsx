import { useState } from 'react';
import './Texto.css';

/**
 * Hash via WebCrypto, que roda no navegador e não tem MD5 nem SHA-1 por
 * decisão da especificação — algoritmos quebrados ficaram de fora de
 * propósito. Oferecer só o que a plataforma oferece evita trazer uma
 * implementação caseira de criptografia, que é sempre má ideia.
 */
const ALGORITMOS = ['SHA-256', 'SHA-384', 'SHA-512', 'SHA-1'] as const;

type Algoritmo = (typeof ALGORITMOS)[number];

function paraHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export default function Hash() {
  const [entrada, setEntrada] = useState('');
  const [algoritmo, setAlgoritmo] = useState<Algoritmo>('SHA-256');
  const [saida, setSaida] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const calcular = async () => {
    setCopiado(false);

    if (entrada === '') {
      setErro('Digite um texto para calcular o hash.');
      setSaida('');
      return;
    }

    try {
      const bytes = new TextEncoder().encode(entrada);
      const digest = await crypto.subtle.digest(algoritmo, bytes);

      setSaida(paraHex(digest));
      setErro(null);
    } catch {
      setSaida('');
      setErro('Seu navegador recusou o cálculo. Em HTTP sem TLS, a WebCrypto fica indisponível.');
    }
  };

  const copiar = async () => {
    await navigator.clipboard.writeText(saida);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="texto-ferramenta">
      <div className="acoes">
        <button type="button" className="botao botao-primario" onClick={calcular}>
          Calcular
        </button>

        <label className="seletor">
          Algoritmo
          <select
            className="campo campo-curto"
            value={algoritmo}
            onChange={(evento) => setAlgoritmo(evento.target.value as Algoritmo)}
          >
            {ALGORITMOS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="painel-texto">
        <label className="rotulo" htmlFor="hash-entrada">
          Texto
        </label>
        <textarea
          id="hash-entrada"
          className="campo area area-curta"
          spellCheck={false}
          placeholder="Digite ou cole o texto"
          value={entrada}
          onChange={(evento) => {
            setEntrada(evento.target.value);
            setErro(null);
          }}
        />
      </div>

      {erro && (
        <div className="erro-bloco" role="alert">
          <p className="erro-mensagem">{erro}</p>
        </div>
      )}

      {saida !== '' && (
        <div className="saida-simples assenta">
          <div className="painel-topo">
            <span className="rotulo">{algoritmo}</span>
            <button type="button" className="botao botao-discreto mini" onClick={copiar}>
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <code className="assinatura">{saida}</code>
        </div>
      )}

      {algoritmo === 'SHA-1' && (
        <p className="contagem">
          SHA-1 não resiste mais a colisões provocadas. Serve para conferir integridade de arquivo
          antigo, não para assinatura nem senha.
        </p>
      )}
    </div>
  );
}
