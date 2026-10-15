import { MENSAGEM_PIX, montarPix } from '@minime/core';
import QRCode from 'qrcode';
import { useEffect, useRef, useState } from 'react';
import './Texto.css';

export default function Pix() {
  const [chave, setChave] = useState('');
  const [nome, setNome] = useState('');
  const [cidade, setCidade] = useState('');
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [codigo, setCodigo] = useState('');
  const [avisos, setAvisos] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const gerar = () => {
    setCopiado(false);

    const numerico = valor.trim() === '' ? undefined : Number(valor.replace(',', '.'));

    if (numerico !== undefined && Number.isNaN(numerico)) {
      setErro('O valor precisa ser um número, como 49,90.');
      setCodigo('');
      return;
    }

    const resultado = montarPix({
      chave,
      nome,
      cidade,
      ...(numerico !== undefined ? { valor: numerico } : {}),
      ...(descricao.trim() !== '' ? { descricao } : {}),
    });

    if (!resultado.ok) {
      setErro(MENSAGEM_PIX[resultado.motivo]);
      setCodigo('');
      setAvisos([]);
      return;
    }

    setErro(null);
    setCodigo(resultado.codigo);
    setAvisos(resultado.avisos);
  };

  // O QR é desenhado no canvas depois que o código existe. A biblioteca roda
  // no navegador: a chave PIX não passa por servidor nenhum.
  useEffect(() => {
    if (codigo === '' || !canvasRef.current) return;

    QRCode.toCanvas(canvasRef.current, codigo, {
      width: 220,
      margin: 1,
      color: { dark: '#15141b', light: '#ffffff' },
    }).catch(() => setErro('Não consegui desenhar o QR Code, mas o código copia e cola é válido.'));
  }, [codigo]);

  const copiar = async () => {
    await navigator.clipboard.writeText(codigo);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="texto-ferramenta">
      <div className="formulario-pix">
        <div className="painel-texto">
          <label className="rotulo" htmlFor="pix-chave">
            Chave PIX
          </label>
          <input
            id="pix-chave"
            className="campo"
            type="text"
            autoComplete="off"
            placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
            value={chave}
            onChange={(evento) => setChave(evento.target.value)}
          />
        </div>

        <div className="painel-texto">
          <label className="rotulo" htmlFor="pix-nome">
            Nome do recebedor
          </label>
          <input
            id="pix-nome"
            className="campo"
            type="text"
            maxLength={25}
            autoComplete="off"
            placeholder="Como aparece na conta"
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
          />
        </div>

        <div className="painel-texto">
          <label className="rotulo" htmlFor="pix-cidade">
            Cidade
          </label>
          <input
            id="pix-cidade"
            className="campo"
            type="text"
            maxLength={15}
            autoComplete="off"
            placeholder="Novo Hamburgo"
            value={cidade}
            onChange={(evento) => setCidade(evento.target.value)}
          />
        </div>

        <div className="painel-texto">
          <label className="rotulo" htmlFor="pix-valor">
            Valor (opcional)
          </label>
          <input
            id="pix-valor"
            className="campo"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="Em branco, o pagador escolhe"
            value={valor}
            onChange={(evento) => setValor(evento.target.value)}
          />
        </div>

        <div className="painel-texto campo-largo">
          <label className="rotulo" htmlFor="pix-descricao">
            Descrição (opcional)
          </label>
          <input
            id="pix-descricao"
            className="campo"
            type="text"
            maxLength={72}
            autoComplete="off"
            placeholder="Aparece para quem paga"
            value={descricao}
            onChange={(evento) => setDescricao(evento.target.value)}
          />
        </div>
      </div>

      <button type="button" className="botao botao-primario auto" onClick={gerar}>
        Gerar código
      </button>

      {erro && (
        <div className="erro-bloco" role="alert">
          <p className="erro-mensagem">{erro}</p>
        </div>
      )}

      {codigo !== '' && (
        <div className="resultado-pix assenta">
          <div className="qr-caixa">
            <canvas ref={canvasRef} aria-label="QR Code do PIX" />
          </div>

          <div className="codigo-caixa">
            <div className="painel-topo">
              <span className="rotulo">Copia e cola</span>
              <button type="button" className="botao botao-discreto mini" onClick={copiar}>
                {copiado ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <textarea className="campo area area-curta" readOnly value={codigo} />

            {avisos.map((aviso) => (
              <p className="aviso" key={aviso}>
                {aviso}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
