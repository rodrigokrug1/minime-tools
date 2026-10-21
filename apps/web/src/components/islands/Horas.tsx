import {
  calcularJornada,
  type Marcacao,
  MENSAGEM_HORA,
  normalizarHora,
  paraHora,
  paraMinutos,
} from '@minime/core';
import { useMemo, useState } from 'react';
import './Texto.css';

const LINHA_VAZIA: Marcacao = { entrada: '', saida: '' };

export default function Horas() {
  const [marcacoes, setMarcacoes] = useState<Marcacao[]>([
    { entrada: '08:00', saida: '12:00' },
    { entrada: '13:00', saida: '17:00' },
  ]);
  const [jornada, setJornada] = useState('08:00');

  const jornadaMinutos = paraMinutos(jornada) ?? 480;

  // Linhas totalmente em branco não entram na conta nem acusam erro: a pessoa
  // está no meio da digitação, não errando.
  const preenchidas = useMemo(
    () => marcacoes.filter((linha) => linha.entrada !== '' || linha.saida !== ''),
    [marcacoes],
  );

  const resumo = useMemo(
    () => calcularJornada(preenchidas, jornadaMinutos),
    [preenchidas, jornadaMinutos],
  );

  /** Cálculo de uma linha isolada, para a coluna de duração. */
  const duracaoDaLinha = (linha: Marcacao) => {
    if (linha.entrada === '' && linha.saida === '') return undefined;

    return calcularJornada([linha], jornadaMinutos).linhas[0];
  };

  const atualizar = (indice: number, campo: keyof Marcacao, valor: string) => {
    setMarcacoes((atual) =>
      atual.map((linha, i) => (i === indice ? { ...linha, [campo]: valor } : linha)),
    );
  };

  /**
   * A máscara é aplicada ao sair do campo, não a cada tecla: formatar durante
   * a digitação empurra o cursor e atrapalha quem está corrigindo o meio do
   * texto. O cálculo já aceitava "830"; o que faltava era o campo mostrar
   * "08:30" depois.
   */
  const arrumar = (indice: number, campo: keyof Marcacao) =>
    atualizar(indice, campo, normalizarHora(marcacoes[indice]?.[campo] ?? ''));

  return (
    <div className="texto-ferramenta">
      <div className="acoes">
        <label className="seletor">
          Jornada esperada
          <input
            className="campo campo-curto"
            type="text"
            inputMode="numeric"
            value={jornada}
            onChange={(evento) => setJornada(evento.target.value)}
            onBlur={() => setJornada(normalizarHora(jornada))}
            aria-label="Jornada esperada no formato HH:MM"
          />
        </label>

        <button
          type="button"
          className="botao botao-discreto"
          onClick={() => setMarcacoes((atual) => [...atual, { ...LINHA_VAZIA }])}
        >
          Adicionar período
        </button>
      </div>

      <table className="tabela-horas">
        <thead>
          <tr>
            <th scope="col">Entrada</th>
            <th scope="col">Saída</th>
            <th scope="col">Duração</th>
            <th scope="col">
              <span className="sr-apenas">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {marcacoes.map((linha, indice) => {
            const calculada = duracaoDaLinha(linha);

            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: a posição na jornada é a identidade
              <tr key={indice}>
                <td>
                  <input
                    className="campo campo-hora"
                    type="text"
                    inputMode="numeric"
                    placeholder="08:00"
                    value={linha.entrada}
                    onChange={(evento) => atualizar(indice, 'entrada', evento.target.value)}
                    onBlur={() => arrumar(indice, 'entrada')}
                    aria-label={`Entrada do período ${indice + 1}`}
                  />
                </td>
                <td>
                  <input
                    className="campo campo-hora"
                    type="text"
                    inputMode="numeric"
                    placeholder="12:00"
                    value={linha.saida}
                    onChange={(evento) => atualizar(indice, 'saida', evento.target.value)}
                    onBlur={() => arrumar(indice, 'saida')}
                    aria-label={`Saída do período ${indice + 1}`}
                  />
                </td>
                <td className="duracao">
                  {calculada?.erro ? (
                    <span className="nao-bate">{MENSAGEM_HORA[calculada.erro]}</span>
                  ) : (
                    <span>{calculada ? paraHora(calculada.minutos) : '—'}</span>
                  )}
                </td>
                <td>
                  {marcacoes.length > 1 && (
                    <button
                      type="button"
                      className="botao botao-discreto mini"
                      onClick={() => setMarcacoes((atual) => atual.filter((_, i) => i !== indice))}
                    >
                      Remover
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="saida-simples">
        <dl className="lista-claims">
          <div className="linha-dado">
            <dt>total trabalhado</dt>
            <dd className="assenta">{paraHora(resumo.totalMinutos)}</dd>
          </div>
          <div className="linha-dado">
            <dt>saldo do dia</dt>
            <dd className={resumo.saldoMinutos < 0 ? 'nao-bate' : 'bate'}>
              {paraHora(resumo.saldoMinutos)}
            </dd>
          </div>
        </dl>

        {resumo.temErro && <p className="contagem">Linhas com erro ficaram fora do total.</p>}
      </div>
    </div>
  );
}
