import React, { useState } from 'react';
import { Employee, Delivery, StockItem } from '../types';
import SqlStudio from './SqlStudio';
import ArchitecturePanel from './ArchitecturePanel';
import { Terminal, Database, HelpCircle, FileCode, CheckCircle2 } from 'lucide-react';

interface TechnicalDossierProps {
  employees: Employee[];
  deliveries: Delivery[];
  stock: StockItem[];
  currentSimulatedDate: string;
}

export default function TechnicalDossier({
  employees,
  deliveries,
  stock,
  currentSimulatedDate,
}: TechnicalDossierProps) {
  const [techTab, setTechTab] = useState<'architecture' | 'sql' | 'documentation'>('architecture');

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-md">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-indigo-650/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-mono font-bold text-indigo-450 uppercase tracking-widest block">ÁREA DO ENGENHEIRO DE PORTFÓLIO</span>
            <h2 className="text-2xl font-bold text-white tracking-tight">Dossiê de Arquitetura & Banco de Dados (SQL/C#)</h2>
          </div>
        </div>
        <p className="text-sm text-slate-400 mt-3 max-w-4xl leading-relaxed">
          Esta seção foi isolada do fluxo operacional do usuário final para garantir a fidelidade técnica do protótipo acadêmico/profissional. Aqui você encontra a especificação DDL (T-SQL), as queries solicitadas e os componentes de integração ADO.NET / C# em arquitetura em camadas.
        </p>
      </div>

      {/* Reusable Inner Sub-menu tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-1">
        <button
          onClick={() => setTechTab('architecture')}
          className={`px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-2 ${
            techTab === 'architecture'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-450 hover:text-white'
          }`}
        >
          <HelpCircle className="h-4 w-4" />
          Estrutura do Sistema & C#
        </button>

        <button
          onClick={() => setTechTab('sql')}
          className={`px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-2 ${
            techTab === 'sql'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-450 hover:text-white'
          }`}
        >
          <Terminal className="h-4 w-4" />
          Estúdio SQL Interativo
        </button>
      </div>

      {/* Render selected tech subviews */}
      <div className="transition-all duration-200">
        {techTab === 'architecture' && <ArchitecturePanel />}
        {techTab === 'sql' && (
          <SqlStudio
            employees={employees}
            deliveries={deliveries}
            stock={stock}
            currentSimulatedDate={currentSimulatedDate}
          />
        )}
      </div>
    </div>
  );
}
