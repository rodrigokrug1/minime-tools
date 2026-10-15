import { gerarCnpj, MENSAGEM_CNPJ, validarCnpj } from '@minime/core';
import { useState } from 'react';
import Documento, { type SaidaValidacao } from './Documento';

export default function Cnpj() {
  const [alfanumerico, setAlfanumerico] = useState(false);

  const validar = (entrada: string): SaidaValidacao => {
    const resultado = validarCnpj(entrada);

    if (!resultado.ok) {
      return { ok: false, mensagem: MENSAGEM_CNPJ[resultado.motivo], passos: resultado.passos };
    }

    return {
      ok: true,
      formatado: resultado.formatado,
      passos: resultado.passos,
      ...(resultado.alfanumerico ? { nota: 'É um CNPJ no formato alfanumérico.' } : {}),
    };
  };

  return (
    <Documento
      rotulo="CNPJ"
      placeholder="12.ABC.345/01DE-35"
      gerar={() => gerarCnpj(alfanumerico)}
      validar={validar}
      opcoes={
        <label className="interruptor">
          <input
            type="checkbox"
            checked={alfanumerico}
            onChange={(evento) => setAlfanumerico(evento.target.checked)}
          />
          Gerar no formato alfanumérico
        </label>
      }
    />
  );
}
