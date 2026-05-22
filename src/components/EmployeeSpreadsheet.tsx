import React, { useState } from 'react';
import { Employee, Delivery } from '../types';
import { Table, Search, ShieldAlert, Award, Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface EmployeeSpreadsheetProps {
  employees: Employee[];
  deliveries: Delivery[];
  currentSimulatedDate: string;
  onSelectEmployeeToDeliver: (empId: string) => void;
}

export default function EmployeeSpreadsheet({
  employees,
  deliveries,
  currentSimulatedDate,
  onSelectEmployeeToDeliver,
}: EmployeeSpreadsheetProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Experiencia' | 'Efetivados' | 'Atrasados'>('Todos');
  const [showDeleted, setShowDeleted] = useState(false);

  const simulatedToday = new Date(currentSimulatedDate);

  // Helper to get time elapsed
  const getContractDetails = (admissionStr: string) => {
    const admission = new Date(admissionStr);
    const diffTime = simulatedToday.getTime() - admission.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const months = parseFloat((diffDays / 30.4375).toFixed(1));
    const isProbation = diffDays < 90;
    return { days: diffDays, months, isProbation };
  };

  // Helper to find latest deliveries by type for an employee
  const getLatestDelivery = (empId: string, type: 'Camiseta' | 'Bermuda' | 'Calça') => {
    const sorted = deliveries
      .filter((d) => d.funcionarioId === empId && d.itemType === type)
      .sort((a, b) => new Date(b.dataEntrega).getTime() - new Date(a.dataEntrega).getTime());
    return sorted[0] || null;
  };

  // Filter & Search Logic
  const filteredEmployees = employees.filter((emp) => {
    // Soft Delete filter
    const matchesDeletedMode = showDeleted ? !!emp.deleted : !emp.deleted;
    if (!matchesDeletedMode) return false;

    const { days, isProbation } = getContractDetails(emp.dataAdmissao);
    
    // Search match
    const term = (searchTerm || '').toLowerCase();
    const matchesSearch =
      (emp.nome || '').toLowerCase().includes(term) ||
      (emp.cpf || '').replace(/[^\d]/g, '').includes(term.replace(/[^\d]/g, '')) ||
      (emp.setor || '').toLowerCase().includes(term);

    // Status filter match
    let matchesStatus = true;
    if (filterStatus === 'Experiencia') {
      matchesStatus = isProbation;
    } else if (filterStatus === 'Efetivados') {
      matchesStatus = !isProbation;
    } else if (filterStatus === 'Atrasados') {
      // Check if they need replacement ( Novo >1 year, or >90 days and no Novo pieces at all)
      const hasNew = deliveries.some((d) => d.funcionarioId === emp.id && d.condicao === 'Novo');
      const probationOverAndNoNew = !isProbation && !hasNew;

      // Check if has any active Novo piece > 365 days
      const categories: ('Camiseta' | 'Bermuda' | 'Calça')[] = ['Camiseta', 'Bermuda', 'Calça'];
      const hasOverduePiece = categories.some((cat) => {
        const latest = getLatestDelivery(emp.id, cat);
        if (latest && latest.condicao === 'Novo') {
          const diffDays = Math.floor((simulatedToday.getTime() - new Date(latest.dataEntrega).getTime()) / (1000 * 60 * 60 * 24));
          return diffDays >= 365;
        }
        return false;
      });

      matchesStatus = probationOverAndNoNew || hasOverduePiece;
    }

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Table className="h-7 w-7 text-indigo-400" />
            Planilha Consolidada de Controle Operacional
          </h2>
          <p className="text-sm text-slate-400">
            Ficha unificada contendo admissão, status contratual atualizado, tamanhos fornecidos e prazos individuais de troca para cada colaborador.
          </p>
        </div>
      </div>

      {/* Control Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-slate-500" />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por colaborador, setor ou matrícula..."
            className="w-full bg-slate-800 border border-slate-700/80 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 placeholder-slate-500 font-sans"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-slate-400 font-mono hidden lg:inline">Status:</span>
          <button
            onClick={() => {
              setShowDeleted(false);
              setFilterStatus('Todos');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition ${
              !showDeleted && filterStatus === 'Todos'
                ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/35'
                : 'bg-transparent text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            Todos Ativos ({employees.filter(e => !e.deleted).length})
          </button>
          <button
            onClick={() => {
              setShowDeleted(true);
              setFilterStatus('Todos');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition ${
              showDeleted
                ? 'bg-rose-600/20 text-rose-400 border-rose-500/35'
                : 'bg-transparent text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            Desligados / Inativos ({employees.filter(e => e.deleted).length})
          </button>
          <button
            onClick={() => setFilterStatus('Experiencia')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition ${
              filterStatus === 'Experiencia'
                ? 'bg-amber-600/20 text-amber-400 border-amber-500/35'
                : 'bg-transparent text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            Em Experiência
          </button>
          <button
            onClick={() => setFilterStatus('Efetivados')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition ${
              filterStatus === 'Efetivados'
                ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/35'
                : 'bg-transparent text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            Efetivados (Ativos)
          </button>
          <button
            onClick={() => setFilterStatus('Atrasados')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition ${
              filterStatus === 'Atrasados'
                ? 'bg-rose-600/20 text-rose-450 border-rose-500/35'
                : 'bg-transparent text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            Pendentes / Troca Atrasada
          </button>
        </div>
      </div>

      {/* Main spreadsheet grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-850/60 border-b border-slate-800 text-slate-400 text-xs font-mono tracking-wider uppercase">
                <th className="py-4 px-6">Funcionário / Identificação</th>
                <th className="py-4 px-3">Admissão & Tempo</th>
                <th className="py-4 px-3">Fase Contrato</th>
                <th className="py-4 px-4 text-center">Grade Entregue (Item / Tamanhos)</th>
                <th className="py-4 px-3">Status de Troca Individual</th>
                <th className="py-4 px-6 text-right">Ação Rápida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {filteredEmployees.map((emp) => {
                const { days, months, isProbation } = getContractDetails(emp.dataAdmissao);

                // Analyze current garments
                const camiseta = getLatestDelivery(emp.id, 'Camiseta');
                const bermuda = getLatestDelivery(emp.id, 'Bermuda');
                const calca = getLatestDelivery(emp.id, 'Calça');

                const garmenList = [
                  { label: 'Camiseta', data: camiseta },
                  { label: 'Bermuda', data: bermuda },
                  { label: 'Calça', data: calca },
                ];

                // Determine dynamic status
                let isAlerting = false;
                let alertReason = '';

                // If probation is over (>= 3 months) but never received a "Novo" item, alert efetivacao is due.
                const hasReceivedNewItem = deliveries.some((d) => d.funcionarioId === emp.id && d.condicao === 'Novo');
                if (!isProbation && !hasReceivedNewItem) {
                  isAlerting = true;
                  alertReason = 'Prazo de Experiência Vencido (Requer Kit Novo)';
                }

                // Check for individual high-age pieces
                const overdueGarments: string[] = [];
                garmenList.forEach(({ label, data }) => {
                  if (data && data.condicao === 'Novo') {
                    const elapsedDays = Math.floor((simulatedToday.getTime() - new Date(data.dataEntrega).getTime()) / (1000 * 60 * 60 * 24));
                    if (elapsedDays >= 365) {
                      isAlerting = true;
                      overdueGarments.push(label);
                    }
                  }
                });

                if (overdueGarments.length > 0) {
                  alertReason = `Troca Anual Vencida: ${overdueGarments.join(', ')}`;
                }

                return (
                  <tr key={emp.id} className="hover:bg-slate-850/40 transition-colors">
                    {/* Identification */}
                    <td className="py-4 px-6">
                      <div className="font-bold text-white text-base">{emp.nome}</div>
                      <div className="text-xs text-slate-405 font-mono mt-1 flex items-center gap-3">
                        <span>CPF: {emp.cpf}</span>
                        <span className="text-slate-600">|</span>
                        <span>Setor: {emp.setor}</span>
                      </div>
                    </td>

                    {/* Admission */}
                    <td className="py-4 px-3">
                      <div className="font-mono text-xs font-semibold text-slate-205">
                        {new Date(emp.dataAdmissao + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </div>
                      <div className="font-mono text-[11px] text-indigo-400 mt-1">
                        {months} {months === 1 ? 'mês' : 'meses'} ({days} d)
                      </div>
                    </td>

                    {/* Contract phase status */}
                    <td className="py-4 px-3">
                      {emp.deleted ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-1 rounded-full text-rose-455 bg-rose-500/10 border border-rose-500/20">
                            Desligado / Inativo
                          </span>
                          {emp.dataDemissao && (
                            <span className="text-[10px] font-mono text-slate-500 block">
                              Desligamento: {new Date(emp.dataDemissao + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      ) : isProbation ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-1 rounded-full text-amber-400 bg-amber-500/10 border border-amber-500/20">
                          <Clock className="h-3 w-3" />
                          Experiência (Usados)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-1 rounded-full text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                          <Award className="h-3 w-3" />
                          Efetivado (Novos)
                        </span>
                      )}
                    </td>

                    {/* Stock items currently delivered */}
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1.5 max-w-xs font-mono text-[11px]">
                        {garmenList.map(({ label, data }) => (
                          <div key={label} className="flex items-center justify-between gap-4 p-1 rounded bg-slate-950/40 border border-slate-800/40 px-2">
                            <span className="text-slate-400 text-[10px]">{label}:</span>
                            {data ? (
                              <div className="flex flex-col items-end text-right">
                                <span className="flex items-center gap-1 text-white font-bold">
                                  {data.quantidade && data.quantidade > 1 ? (
                                    <span className="text-[10px] text-indigo-400 font-mono font-bold">{data.quantidade}x </span>
                                  ) : null}
                                  <span>{data.tamanho}</span>
                                  <span className={`text-[9px] font-bold px-1 rounded ${
                                    data.condicao === 'Novo' ? 'text-teal-400 bg-teal-400/5 border border-teal-500/20' : 'text-amber-500 bg-amber-550/5 border border-amber-500/20'
                                  }`}>
                                    {data.condicao}
                                  </span>
                                </span>
                                <span className="text-[9px] text-slate-400 mt-0.5">
                                  Entregue: {new Date(data.dataEntrega + 'T00:00:00').toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-600 italic text-[10px]">Não entregue</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Replacements Alert warning states */}
                    <td className="py-4 px-3">
                      {emp.deleted ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-1 rounded text-slate-500 bg-slate-950/45 border border-slate-800">
                          HISTÓRICO ARQUIVADO
                        </span>
                      ) : isAlerting ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-1 rounded text-red-400 bg-red-500/10 border border-red-500/20 uppercase tracking-wide">
                            <ShieldAlert className="h-3.5 w-3.5 mr-0.5" />
                            Atenção
                          </span>
                          <p className="text-[11px] text-red-400 max-w-xs leading-tight font-sans">
                            {alertReason}
                          </p>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-1 rounded text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                          <CheckCircle className="h-3.5 w-3.5 mr-0.5" />
                          CONFORMIDADE OK
                        </span>
                      )}
                    </td>

                    {/* Quick action button */}
                    <td className="py-4 px-6 text-right">
                      {emp.deleted ? (
                        <span className="text-xs text-slate-500 italic font-mono uppercase tracking-wider">Histórico</span>
                      ) : (
                        <button
                          onClick={() => onSelectEmployeeToDeliver(emp.id)}
                          className="p-2 px-3 text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-700 hover:scale-[1.02] border border-indigo-500/20 rounded-lg shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer font-sans"
                        >
                          Nova Baixa
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
