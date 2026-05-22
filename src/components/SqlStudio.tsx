import React, { useState } from 'react';
import { TableSchema, Employee, Delivery, StockItem } from '../types';
import { SQL_QUERIES, SCHEMAS_DDL } from '../data';
import { Terminal, Copy, Play, Table, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SqlStudioProps {
  employees: Employee[];
  deliveries: Delivery[];
  stock: StockItem[];
  currentSimulatedDate: string;
}

export default function SqlStudio({ employees, deliveries, stock, currentSimulatedDate }: SqlStudioProps) {
  const [activeTab, setActiveTab] = useState<'ddl' | 'schema' | 'playground'>('playground');
  const [copied, setCopied] = useState(false);
  const [selectedPredefined, setSelectedPredefined] = useState<string>('query3Months');
  const [queryOutput, setQueryOutput] = useState<any[]>([]);
  const [colsOutput, setColsOutput] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState('');

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Live simulation of SQL engines inside JS
  const handleExecuteQuery = () => {
    setQueryOutput([]);
    setColsOutput([]);
    setSuccessMsg('');

    const today = new Date(currentSimulatedDate);

    if (selectedPredefined === 'query3Months') {
      // 3 Months probation complete, has no 'Novo' condition deliveries before.
      const results = employees
        .map((emp) => {
          const join = new Date(emp.dataAdmissao);
          const diffTime = today.getTime() - join.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          const monthsAdm = parseFloat((diffDays / 30.4375).toFixed(1));

          const hasNew = deliveries.some((d) => d.funcionarioId === emp.id && d.condicao === 'Novo');
          return {
            id: emp.id,
            nome: emp.nome,
            cpf: emp.cpf,
            data_admissao: emp.dataAdmissao,
            meses_admissao: monthsAdm,
            _eligible: diffDays >= 90 && !hasNew,
          };
        })
        .filter((r) => r._eligible);

      // Map clean table output
      const cleanResults = results.map(({ id, nome, cpf, data_admissao, meses_admissao }) => ({
        ID_REG: id,
        NOME_FUNCIONARIO: nome,
        CPF: cpf,
        DATA_ADMISSAO: data_admissao,
        MESES_CONTRATO: meses_admissao,
      }));

      setColsOutput(['ID_REG', 'NOME_FUNCIONARIO', 'CPF', 'DATA_ADMISSAO', 'MESES_CONTRATO']);
      setQueryOutput(cleanResults);
      setSuccessMsg(`Sucesso: Query T-SQL executada. Retornou ${cleanResults.length} registros com base no estado atual.`);
    } else if (selectedPredefined === 'query1Year') {
      // 1 Year renewal overdue
      const list: any[] = [];
      const categories: ('Camiseta' | 'Bermuda' | 'Calça')[] = ['Camiseta', 'Bermuda', 'Calça'];

      employees.forEach((emp) => {
        const empDeliveries = deliveries.filter((d) => d.funcionarioId === emp.id && d.condicao === 'Novo');

        categories.forEach((cat) => {
          const logsOfCat = empDeliveries
            .filter((d) => d.itemType === cat)
            .sort((a, b) => new Date(b.dataEntrega).getTime() - new Date(a.dataEntrega).getTime());

          if (logsOfCat.length > 0) {
            const latest = logsOfCat[0];
            const delivDate = new Date(latest.dataEntrega);
            const diffTime = today.getTime() - delivDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 365) {
              list.push({
                CPF: emp.cpf,
                COLABORADOR: emp.nome,
                PECAS_TIPO: cat,
                TAMANHO_ATUAL: latest.tamanho,
                ULTIMA_ENTREGA: latest.dataEntrega,
                DIAS_ATIVOS: diffDays,
                LIMITE_VENCIDO: diffDays - 365,
              });
            }
          }
        });
      });

      setColsOutput(['CPF', 'COLABORADOR', 'PECAS_TIPO', 'TAMANHO_ATUAL', 'ULTIMA_ENTREGA', 'DIAS_ATIVOS', 'LIMITE_VENCIDO']);
      setQueryOutput(list);
      setSuccessMsg(`Sucesso: Query CTE e DATEDIFF executada. Retornou ${list.length} registros com base nas movimentações registradas.`);
    } else if (selectedPredefined === 'queryStock') {
      // Stock critical
      const list = stock.map((s) => ({
        PECA: s.itemType,
        TAMANHO: s.tamanho,
        CONDICAO: s.condicao,
        SALDO: s.quantidade,
        REPOSICAO: s.quantidade === 0 ? 'CRÍTICA' : s.quantidade <= 3 ? 'RECOMENDADA' : 'ESTÁVEL',
      }));

      setColsOutput(['PECA', 'TAMANHO', 'CONDICAO', 'SALDO', 'REPOSICAO']);
      setQueryOutput(list);
      setSuccessMsg(`Sucesso: Consulta de estoque executada. Retornou ${list.length} variações estruturadas da grade.`);
    }
  };

  // Pre-load execution
  React.useEffect(() => {
    handleExecuteQuery();
  }, [selectedPredefined, currentSimulatedDate, employees, deliveries, stock]);

  const selectQueryCode =
    selectedPredefined === 'query3Months'
      ? SQL_QUERIES.query3Months
      : selectedPredefined === 'query1Year'
      ? SQL_QUERIES.query1Year
      : `SELECT \n    item_type AS PECA, \n    tamanho AS TAMANHO, \n    condicao AS CONDICAO, \n    quantidade AS SALDO\nFROM estoque_grade \nORDER BY quantidade ASC;`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Terminal className="h-7 w-7 text-indigo-400" />
          Estúdio SQL Console e Estrutura DDL
        </h2>
        <p className="text-sm text-slate-400">
          Analise e teste a modelagem normalizada das tabelas corporativas e as queries oficiais pedidas no escopo da solução.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800 flex gap-2">
        <button
          onClick={() => {
            setActiveTab('playground');
            setColsOutput([]);
            setQueryOutput([]);
          }}
          className={`px-4 py-2 border-b-2 text-sm font-medium transition ${
            activeTab === 'playground'
              ? 'border-indigo-500 text-indigo-405'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Console SQL Interativo
        </button>
        <button
          onClick={() => setActiveTab('ddl')}
          className={`px-4 py-2 border-b-2 text-sm font-medium transition ${
            activeTab === 'ddl'
              ? 'border-indigo-500 text-indigo-405'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Script DDL Geral (SQL Server)
        </button>
        <button
          onClick={() => setActiveTab('schema')}
          className={`px-4 py-2 border-b-2 text-sm font-medium transition ${
            activeTab === 'schema'
              ? 'border-indigo-500 text-indigo-405'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Dicionário de Dados
        </button>
      </div>

      {/* Content Area */}
      {activeTab === 'playground' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Query console editor */}
          <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-indigo-400 font-mono font-bold flex items-center gap-2">
                  <Terminal className="h-4.5 w-4.5" />
                  QUERY SELEÇÃO ATIVA
                </span>

                <div className="flex gap-2">
                  <select
                    value={selectedPredefined}
                    onChange={(e) => setSelectedPredefined(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded py-1 px-2 text-xs font-mono text-slate-300 focus:outline-none"
                  >
                    <option value="query3Months">Efetivação de Uniformes (3 Meses)</option>
                    <option value="query1Year">Troca e Renovação Anual (1 Ano)</option>
                    <option value="queryStock">Controle de Estoque Grade Crítico</option>
                  </select>

                  <button
                    onClick={() => handleCopy(selectQueryCode)}
                    className="p-1 px-2 text-xs rounded border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 transition flex items-center gap-1 font-mono"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              {/* Fake Terminal Editor */}
              <div className="rounded-lg bg-slate-900 text-xs font-mono leading-relaxed p-4 h-72 overflow-y-auto overflow-x-auto text-emerald-300 border border-slate-800 select-all">
                <pre>{selectQueryCode}</pre>
              </div>
            </div>

            <button
              onClick={handleExecuteQuery}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold font-mono rounded-lg transition cursor-pointer"
            >
              <Play className="h-4.5 w-4.5 stroke-[2.5]" />
              EXECUTAR COMMAND SQL (QUERY SIMULATION)
            </button>
          </div>

          {/* Results outputs table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-md flex flex-col h-[420px]">
            <span className="text-xs text-slate-400 font-mono font-bold border-b border-slate-800 pb-2 mb-3 flex items-center gap-2">
              <Table className="h-4.5 w-4.5 text-indigo-400" />
              RESULTADOS DO CONSOLE DE EXECUÇÃO SQL COM ADO.NET
            </span>

            {/* Success logs */}
            {successMsg && (
              <div className="p-3 mb-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-mono leading-relaxed">
                {successMsg}
              </div>
            )}

            {queryOutput.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2 opacity-70">
                <AlertCircle className="h-10 w-10 text-slate-600" />
                <p className="text-xs text-slate-400 font-mono">Nenhum registro correspondente foi retornado para os critérios estabelecidos.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-x-auto overflow-y-auto">
                <table className="w-full text-xs text-left text-slate-300 font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 uppercase">
                      {colsOutput.map((col) => (
                        <th key={col} className="py-2.5 px-3">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryOutput.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-850 border-b border-slate-850/50">
                        {colsOutput.map((col) => {
                          const val = row[col];
                          const isSpecial = col === 'LIMITE_VENCIDO' || col === 'MESES_CONTRATO';
                          return (
                            <td key={col} className={`py-2 px-3 ${isSpecial ? 'text-indigo-400 font-bold' : ''}`}>
                              {typeof val === 'number' && col !== 'ID_REG' ? val : val}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'ddl' && (
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide">Script SQL DDL Normalizado (T-SQL / SQL Server)</h3>
              <p className="text-xs text-slate-500 mt-0.5">Modelo compatível com Sql Server Enterprise, Azure SQL e SQLite local.</p>
            </div>
            <button
              onClick={() => handleCopy(SQL_QUERIES.ddl)}
              className="p-1.5 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded transition flex items-center gap-1.5 font-sans font-bold cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? 'Copiado!' : 'Copiar DDL Completo'}
            </button>
          </div>

          <div className="rounded-lg bg-slate-900 border border-slate-850 text-xs font-mono text-indigo-300 p-5 h-[380px] overflow-y-auto tracking-wide leading-relaxed">
            <pre>{SQL_QUERIES.ddl}</pre>
          </div>
        </div>
      )}

      {activeTab === 'schema' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SCHEMAS_DDL.map((schema) => (
              <div key={schema.name} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md space-y-3">
                <div className="border-b border-slate-800 pb-2">
                  <h4 className="font-bold text-white text-sm font-mono flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded bg-indigo-500" />
                    Tabela: {schema.name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">{schema.description}</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300 font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500">
                        <th className="py-1.5">Coluna</th>
                        <th className="py-1.5">Tipo</th>
                        <th className="py-1.5">Constraint</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/50">
                      {schema.columns.map((col) => (
                        <tr key={col.name} className="hover:bg-slate-850/35">
                          <td className="py-2 font-bold text-indigo-400">{col.name}</td>
                          <td className="py-2 text-slate-300">{col.type}</td>
                          <td className="py-2 text-[10px] text-slate-500 tracking-tight max-w-xs truncate">{col.constraints || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
