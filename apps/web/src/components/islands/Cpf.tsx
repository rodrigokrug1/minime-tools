import { gerarCpf, MENSAGEM_CPF, validarCpf } from '@minime/core';
import Documento, { type SaidaValidacao } from './Documento';

export default function Cpf() {
  const validar = (entrada: string): SaidaValidacao => {
    const resultado = validarCpf(entrada);

    return resultado.ok
      ? { ok: true, formatado: resultado.formatado, passos: resultado.passos }
      : { ok: false, mensagem: MENSAGEM_CPF[resultado.motivo], passos: resultado.passos };
  };

  return <Documento rotulo="CPF" placeholder="529.982.247-25" gerar={gerarCpf} validar={validar} />;
}
