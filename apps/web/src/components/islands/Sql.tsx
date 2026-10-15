import { useState } from 'react';
import { format, type SqlLanguage } from 'sql-formatter';
import './Texto.css';

/**
 * Formatador de SQL. A query é formatada aqui no navegador — nenhuma linha
 * dela sai da máquina, o que importa quando o texto traz nome de tabela, de
 * coluna ou valor de produção.
 */

const DIALETOS: Array<{ valor: SqlLanguage; nome: string }> = [
  { valor: 'tsql', nome: 'SQL Server (T-SQL)' },
  { valor: 'postgresql', nome: 'PostgreSQL' },
  { valor: 'mysql', nome: 'MySQL' },
  { valor: 'sqlite', nome: 'SQLite' },
  { valor: 'plsql', nome: 'Oracle (PL/SQL)' },
  { valor: 'mariadb', nome: 'MariaDB' },
  { valor: 'bigquery', nome: 'BigQuery' },
  { valor: 'sql', nome: 'SQL padrão' },
];

const EXEMPLO =
  'select p.id, p.nome, count(v.id) as vendas from produtos p left join vendas v on v.produto_id = p.id where p.ativo = 1 and v.data >= @inicio group by p.id, p.nome having count(v.id) > 0 order by vendas desc';

export default function Sql() {
  const [entrada, setEntrada] = useState('');
  const [saida, setSaida] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [dialeto, setDialeto] = useState<SqlLanguage>('tsql');
  const [maiusculas, setMaiusculas] = useState(true);
  const [copiado, setCopiado] = useState(false);

  const formatar = () => {
    setCopiado(false);

    if (entrada.trim() === '') {
      setErro('Cole uma query para formatar.');
      setSaida('');
      return;
    }

    try {
      setSaida(
        format(entrada, {
          language: dialeto,
          keywordCase: maiusculas ? 'upper' : 'preserve',
          tabWidth: 2,
        }),
      );
      setErro(null);
    } catch (falha) {
      setSaida('');
      setErro(
        falha instanceof Error
          ? `Não consegui interpretar a query: ${falha.message}`
          : 'Não consegui interpretar a query.',
      );
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
        <button type="button" className="botao botao-primario" onClick={formatar}>
          Formatar
        </button>

        <label className="seletor">
          Dialeto
          <select
            className="campo campo-curto"
            value={dialeto}
            onChange={(evento) => setDialeto(evento.target.value as SqlLanguage)}
          >
            {DIALETOS.map((item) => (
              <option key={item.valor} value={item.valor}>
                {item.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="interruptor">
          <input
            type="checkbox"
            checked={maiusculas}
            onChange={(evento) => setMaiusculas(evento.target.checked)}
          />
          Palavras-chave em maiúsculas
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
          <label className="rotulo" htmlFor="sql-entrada">
            Query
          </label>
          <textarea
            id="sql-entrada"
            className="campo area"
            spellCheck={false}
            placeholder="Cole sua query aqui"
            value={entrada}
            onChange={(evento) => {
              setEntrada(evento.target.value);
              setErro(null);
            }}
          />
        </div>

        <div className="painel-texto">
          <div className="painel-topo">
            <span className="rotulo">Formatada</span>
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
          <p className="erro-mensagem">{erro}</p>
        </div>
      )}
    </div>
  );
}
