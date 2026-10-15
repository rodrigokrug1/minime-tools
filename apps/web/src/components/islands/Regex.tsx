import { useMemo, useState } from 'react';
import './Texto.css';

type Ocorrencia = {
  inicio: number;
  fim: number;
  texto: string;
  grupos: Array<string | undefined>;
  nomeados: Record<string, string | undefined>;
};

type Analise =
  | { ok: true; ocorrencias: Ocorrencia[] }
  | { ok: false; mensagem: string }
  | { ok: null };

/**
 * Uma expressão do usuário pode casar string vazia e girar para sempre, e um
 * padrão patológico pode travar a aba. O teto de ocorrências corta o primeiro
 * caso; o segundo não tem defesa em JavaScript sem worker, então vale a pena
 * manter o limite baixo.
 */
const TETO = 500;

function analisar(padrao: string, flags: string, alvo: string): Analise {
  if (padrao === '') return { ok: null };

  let expressao: RegExp;

  try {
    expressao = new RegExp(padrao, flags.includes('g') ? flags : `${flags}g`);
  } catch (falha) {
    return {
      ok: false,
      mensagem: falha instanceof Error ? falha.message : 'Expressão inválida.',
    };
  }

  const ocorrencias: Ocorrencia[] = [];
  let casa = expressao.exec(alvo);

  while (casa !== null && ocorrencias.length < TETO) {
    ocorrencias.push({
      inicio: casa.index,
      fim: casa.index + casa[0].length,
      texto: casa[0],
      grupos: casa.slice(1),
      nomeados: casa.groups ?? {},
    });

    // Um casamento de comprimento zero deixaria lastIndex parado: avança à mão.
    if (casa[0] === '') expressao.lastIndex += 1;

    casa = expressao.exec(alvo);
  }

  return { ok: true, ocorrencias };
}

export default function Regex() {
  const [padrao, setPadrao] = useState('');
  const [flags, setFlags] = useState('gm');
  const [alvo, setAlvo] = useState('');

  const analise = useMemo(() => analisar(padrao, flags, alvo), [padrao, flags, alvo]);

  const pedacos = useMemo(() => {
    if (analise.ok !== true || analise.ocorrencias.length === 0) return null;

    const saida: Array<{ texto: string; casado: boolean }> = [];
    let cursor = 0;

    for (const ocorrencia of analise.ocorrencias) {
      if (ocorrencia.inicio > cursor) {
        saida.push({ texto: alvo.slice(cursor, ocorrencia.inicio), casado: false });
      }
      if (ocorrencia.texto !== '') {
        saida.push({ texto: ocorrencia.texto, casado: true });
      }
      cursor = Math.max(cursor, ocorrencia.fim);
    }

    if (cursor < alvo.length) saida.push({ texto: alvo.slice(cursor), casado: false });

    return saida;
  }, [analise, alvo]);

  const alternarFlag = (letra: string) => {
    setFlags((atual) => (atual.includes(letra) ? atual.replace(letra, '') : `${atual}${letra}`));
  };

  return (
    <div className="texto-ferramenta">
      <div className="painel-texto">
        <label className="rotulo" htmlFor="regex-padrao">
          Expressão
        </label>
        <input
          id="regex-padrao"
          className="campo"
          type="text"
          spellCheck={false}
          autoComplete="off"
          placeholder="\d{3}\.\d{3}\.\d{3}-\d{2}"
          value={padrao}
          onChange={(evento) => setPadrao(evento.target.value)}
        />
      </div>

      <div className="acoes">
        {[
          ['g', 'todas as ocorrências'],
          ['i', 'ignora maiúsculas'],
          ['m', '^ e $ por linha'],
          ['s', '. inclui quebra'],
          ['u', 'unicode'],
        ].map(([letra, explicacao]) => (
          <label className="interruptor" key={letra}>
            <input
              type="checkbox"
              checked={flags.includes(letra as string)}
              onChange={() => alternarFlag(letra as string)}
            />
            {letra} — {explicacao}
          </label>
        ))}
      </div>

      <div className="painel-texto">
        <label className="rotulo" htmlFor="regex-alvo">
          Texto de teste
        </label>
        <textarea
          id="regex-alvo"
          className="campo area area-curta"
          spellCheck={false}
          placeholder="Cole o texto onde a expressão deve procurar"
          value={alvo}
          onChange={(evento) => setAlvo(evento.target.value)}
        />
      </div>

      {analise.ok === false && (
        <div className="erro-bloco" role="alert">
          <p className="erro-mensagem">{analise.mensagem}</p>
        </div>
      )}

      {analise.ok === true && (
        <div className="saida-simples regex-saida">
          <p className="contagem" role="status">
            {analise.ocorrencias.length === 0
              ? 'Nenhuma ocorrência no texto.'
              : `${analise.ocorrencias.length} ocorrência${analise.ocorrencias.length > 1 ? 's' : ''}${
                  analise.ocorrencias.length === TETO ? ' (limite atingido)' : ''
                }`}
          </p>

          {pedacos && (
            <p className="destaque">
              {pedacos.map((pedaco, indice) =>
                pedaco.casado ? (
                  // biome-ignore lint/suspicious/noArrayIndexKey: a ordem no texto é a identidade
                  <mark key={indice}>{pedaco.texto}</mark>
                ) : (
                  // biome-ignore lint/suspicious/noArrayIndexKey: a ordem no texto é a identidade
                  <span key={indice}>{pedaco.texto}</span>
                ),
              )}
            </p>
          )}

          {analise.ocorrencias[0] &&
            (analise.ocorrencias[0].grupos.length > 0 ||
              Object.keys(analise.ocorrencias[0].nomeados).length > 0) && (
              <>
                <span className="rotulo">Grupos da primeira ocorrência</span>
                <ul className="grupos">
                  {analise.ocorrencias[0].grupos.map((grupo, indice) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: o índice é o número do grupo
                    <li key={`g-${indice}`}>
                      <span className="indice">{indice + 1}</span>
                      <span>{grupo ?? '(não casou)'}</span>
                    </li>
                  ))}
                  {Object.entries(analise.ocorrencias[0].nomeados).map(([nome, valor]) => (
                    <li key={`n-${nome}`}>
                      <span className="indice">{nome}</span>
                      <span>{valor ?? '(não casou)'}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
        </div>
      )}
    </div>
  );
}
