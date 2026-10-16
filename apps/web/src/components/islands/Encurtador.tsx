import { MENSAGEM_POR_MOTIVO, validarUrl } from '@minime/core';
import { useEffect, useRef, useState } from 'react';
import './Encurtador.css';

/**
 * `||` e não `??` de propósito. No GitHub Actions, `${{ vars.X }}` de uma
 * variável que não existe vira string vazia, não `undefined` — e o `??` deixa
 * passar. O resultado foi um `fetch('/link')` relativo, que o CloudFront
 * respondeu com 404 enquanto a tela acusava recusa do servidor.
 */
const API_BASE_URL = (import.meta.env.PUBLIC_API_BASE_URL || 'https://api.minime.cloud')
  .trim()
  .replace(/\/$/, '');
const RECAPTCHA_SITE_KEY = (
  import.meta.env.PUBLIC_RECAPTCHA_SITE_KEY as string | undefined
)?.trim();

type Estado =
  | { nome: 'ocioso' }
  | { nome: 'enviando' }
  | { nome: 'pronto'; link: string }
  | { nome: 'erro'; mensagem: string };

declare global {
  interface Window {
    grecaptcha?: {
      render: (elemento: HTMLElement, opcoes: Record<string, unknown>) => number;
      execute: (id: number) => Promise<string>;
      reset: (id: number) => void;
    };
  }
}

/** A API passou a devolver a origem completa; o formato antigo vinha sem esquema. */
function absoluta(valor: string): string {
  return /^https?:\/\//i.test(valor) ? valor : `https://link.${valor}`;
}

export default function Encurtador() {
  const [url, setUrl] = useState('');
  const [estado, setEstado] = useState<Estado>({ nome: 'ocioso' });
  const [copiado, setCopiado] = useState(false);

  const captchaRef = useRef<HTMLDivElement>(null);
  const captchaIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY) {
      setEstado({
        nome: 'erro',
        mensagem: 'PUBLIC_RECAPTCHA_SITE_KEY não está definida. Veja o .env.example.',
      });
      return;
    }

    const renderizar = () => {
      if (
        window.grecaptcha &&
        typeof window.grecaptcha.render === 'function' &&
        captchaRef.current &&
        captchaIdRef.current === null
      ) {
        captchaIdRef.current = window.grecaptcha.render(captchaRef.current, {
          sitekey: RECAPTCHA_SITE_KEY,
          size: 'invisible',
        });
      }
    };

    if (!document.querySelector('script[data-recaptcha]')) {
      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.recaptcha = 'true';
      document.head.appendChild(script);
    }

    // O polling roda sempre: o objeto grecaptcha pode existir antes de render
    // estar disponível, e nesse caso uma checagem única nunca renderizaria.
    renderizar();
    const intervalo = window.setInterval(renderizar, 300);

    return () => window.clearInterval(intervalo);
  }, []);

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setCopiado(false);

    // Valida no navegador antes de chamar a API: resposta imediata e uma
    // requisição a menos. O servidor valida de novo — cliente não é confiável.
    const resultado = validarUrl(url);

    if (!resultado.ok) {
      setEstado({ nome: 'erro', mensagem: MENSAGEM_POR_MOTIVO[resultado.motivo] });
      return;
    }

    if (!window.grecaptcha || captchaIdRef.current === null) {
      setEstado({
        nome: 'erro',
        mensagem:
          'A verificação anti-robô ainda não carregou. Aguarde um instante e tente de novo.',
      });
      return;
    }

    setEstado({ nome: 'enviando' });

    try {
      const token = await window.grecaptcha.execute(captchaIdRef.current);
      const resposta = await fetch(`${API_BASE_URL}/link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: resultado.url.href }),
      });

      window.grecaptcha.reset(captchaIdRef.current);

      if (resposta.status === 429) {
        setEstado({
          nome: 'erro',
          mensagem: 'Muitas tentativas seguidas. Espere alguns segundos e tente de novo.',
        });
        return;
      }

      if (!resposta.ok) {
        setEstado({
          nome: 'erro',
          mensagem: 'O servidor recusou o pedido. Confira a URL e tente de novo.',
        });
        return;
      }

      const dados = (await resposta.json()) as { shortUrl: string };
      setEstado({ nome: 'pronto', link: absoluta(dados.shortUrl) });
    } catch {
      setEstado({
        nome: 'erro',
        mensagem: 'Não foi possível falar com o servidor. Verifique sua conexão.',
      });
    }
  };

  const copiar = async () => {
    if (estado.nome !== 'pronto') return;

    await navigator.clipboard.writeText(estado.link);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="encurtador">
      <form onSubmit={enviar} className="form">
        <label className="rotulo" htmlFor="url-longa">
          URL de destino
        </label>

        <div className="campo-linha">
          <input
            id="url-longa"
            className="campo"
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="exemplo.com.br/uma-pagina-com-endereco-bem-longo"
            value={url}
            onChange={(evento) => {
              setUrl(evento.target.value);
              if (estado.nome === 'erro') setEstado({ nome: 'ocioso' });
            }}
          />

          <button
            type="submit"
            className="botao botao-primario"
            disabled={estado.nome === 'enviando'}
          >
            {estado.nome === 'enviando' ? 'Encurtando' : 'Encurtar'}
          </button>
        </div>
      </form>

      {estado.nome === 'ocioso' && (
        <p className="dica">O link gerado tem seis caracteres e não expira.</p>
      )}

      {estado.nome === 'erro' && (
        <p className="mensagem erro" role="alert">
          {estado.mensagem}
        </p>
      )}

      {estado.nome === 'pronto' && (
        <div className="resultado assenta">
          <span className="rotulo">Link curto</span>
          <div className="resultado-linha">
            <a className="link" href={estado.link} target="_blank" rel="noopener noreferrer">
              {estado.link}
            </a>
            <button type="button" className="botao botao-discreto" onClick={copiar}>
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
      )}

      <div ref={captchaRef} />
    </div>
  );
}
