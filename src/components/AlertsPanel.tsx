import React from 'react';
import { Employee, Delivery, StockItem, UniformGender } from '../types';
import { ShieldAlert, Award, Calendar, RotateCcw, Check, CheckCircle } from 'lucide-react';

interface AlertsPanelProps {
  employees: Employee[];
  deliveries: Delivery[];
  stock: StockItem[];
  setStock: React.Dispatch<React.SetStateAction<StockItem[]>>;
  setDeliveries: React.Dispatch<React.SetStateAction<Delivery[]>>;
  currentSimulatedDate: string;
  onRefreshStats: () => void;
}

export default function AlertsPanel({
  employees,
  deliveries,
  stock,
  setStock,
  setDeliveries,
  currentSimulatedDate,
  onRefreshStats,
}: AlertsPanelProps) {
  const simulatedToday = new Date(currentSimulatedDate);

  // 1. Alert A: Probation Done (3 Months Completed, needs NEW uniform)
  // Find employees who joined >= 90 days ago AND don't have any 'Novo' deliveries registered
  const probationAlertsList = employees
    .map((emp) => {
      const joinDate = new Date(emp.dataAdmissao);
      const diffTime = simulatedToday.getTime() - joinDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const months = parseFloat((diffDays / 30.4375).toFixed(1));

      // Has received 'Novo' uniform?
      const receivedNew = deliveries.some((d) => d.funcionarioId === emp.id && d.condicao === 'Novo');
      const isEligible = diffDays >= 90 && !receivedNew;

      return {
        employee: emp,
        days: diffDays,
        months,
        isEligible,
      };
    })
    .filter((v) => v.isEligible);

  // 2. Alert B: Annual Renewal (1 Year completed with a NEW piece)
  // For each employee, look at the last "Novo" delivery date for EACH piece they received.
  // If it's older than 365 days, trigger alert for that specific piece.
  interface RenewalAlert {
    id: string; // Composite matching deliveries
    employee: Employee;
    itemType: 'Camiseta' | 'Bermuda' | 'Calça';
    tamanho: string;
    genero: UniformGender;
    dataEntrega: string;
    daysActive: number;
  }

  const renewalAlertsList: RenewalAlert[] = [];

  employees.forEach((emp) => {
    const empDeliveries = deliveries.filter((d) => d.funcionarioId === emp.id && d.condicao === 'Novo');

    // Categorized by Item Type
    const categories: ('Camiseta' | 'Bermuda' | 'Calça')[] = ['Camiseta', 'Bermuda', 'Calça'];

    categories.forEach((cat) => {
      // Find latest "Novo" delivery of this category
      const logsOfCat = empDeliveries
        .filter((d) => d.itemType === cat)
        .sort((a, b) => new Date(b.dataEntrega).getTime() - new Date(a.dataEntrega).getTime());

      if (logsOfCat.length > 0) {
        const latest = logsOfCat[0];
        const delivDate = new Date(latest.dataEntrega);
        const diffTime = simulatedToday.getTime() - delivDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= 365) {
          renewalAlertsList.push({
            id: latest.id,
            employee: emp,
            itemType: cat,
            tamanho: latest.tamanho,
            genero: latest.genero,
            dataEntrega: latest.dataEntrega,
            daysActive: diffDays,
          });
        }
      }
    });
  });

  // Action: Complete Probation Efetivacao Delivery (give a Camiseta M & Calça M as default, or we find available in stock)
  const handleResolveEfetivacao = (empId: string) => {
    const emp = employees.find((e) => e.id === empId);
    if (!emp) return;

    // Check sizes stock (Calça is M letter-based)
    const neededSample = [
      { type: 'Camiseta' as const, size: 'M', gender: 'Masculino' as const },
      { type: 'Calça' as const, size: 'M', gender: 'Masculino' as const },
    ];

    // Check and deduct stock
    let allAvailable = true;
    neededSample.forEach((sample) => {
      const sItem = stock.find((s) => s.itemType === sample.type && s.tamanho === sample.size && s.genero === sample.gender && s.condicao === 'Novo');
      if (!sItem || sItem.quantidade <= 0) {
        allAvailable = false;
      }
    });

    if (!allAvailable) {
      alert(
        'Falha na transação: Estoque insuficiente do Kit Padrão de Efetivação Novo (Camiseta M / Calça M). ' +
          'Favor repor estoque na aba Dashboard.'
      );
      return;
    }

    // Deduct
    setStock((prev) =>
      prev.map((s) => {
        const isMatch = neededSample.some((sample) => sample.type === s.itemType && sample.size === s.tamanho && sample.gender === s.genero && s.condicao === 'Novo');
        if (isMatch) {
          return { ...s, quantidade: s.quantidade - 1 };
        }
        return s;
      })
    );

    // Create deliveries
    const newDeliveries: Delivery[] = neededSample.map((sample) => ({
      id: `d-efet-${Date.now()}-${sample.type}`,
      funcionarioId: empId,
      itemType: sample.type,
      tamanho: sample.size,
      condicao: 'Novo',
      genero: sample.gender,
      dataEntrega: currentSimulatedDate, // Deliver today
      quantidade: 1,
    }));

    setDeliveries((prev) => [...prev, ...newDeliveries]);
    onRefreshStats();
  };

  // Action: Renew specific individual piece
  const handleResolveReplacement = (alertItem: RenewalAlert) => {
    // Deduct stock
    const sItem = stock.find(
      (s) => s.itemType === alertItem.itemType && s.tamanho === alertItem.tamanho && s.genero === alertItem.genero && s.condicao === 'Novo'
    );

    if (!sItem || sItem.quantidade <= 0) {
      window.alert(
        `Erro: Estoque insuficiente para renovar ${alertItem.itemType} (${alertItem.tamanho} - Novo). É necessário possuir saldo no estoque.`
      );
      return;
    }

    setStock((prev) =>
      prev.map((s) => {
        if (s.id === sItem.id) {
          return { ...s, quantidade: s.quantidade - 1 };
        }
        return s;
      })
    );

    // Create replacement delivery
    const renewalDelivery: Delivery = {
      id: `d-renew-${Date.now()}`,
      funcionarioId: alertItem.employee.id,
      itemType: alertItem.itemType,
      tamanho: alertItem.tamanho,
      condicao: 'Novo',
      genero: alertItem.genero,
      dataEntrega: currentSimulatedDate,
      quantidade: 1,
    };

    setDeliveries((prev) => [...prev, renewalDelivery]);
    onRefreshStats();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <ShieldAlert className="h-7 w-7 text-indigo-400" />
          Central de Alertas e Segurança Operacional
        </h2>
        <p className="text-sm text-slate-400">
          Supervisão inteligente em tempo real baseada em restrições e ciclos de vida de ativos funcionais.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Probation Alerts */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                EFETIVAÇÃO DE CONTRATO (3 MESES)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Venceram o período de teste e precisam receber kits de uniformes NOVOS.
              </p>
            </div>
            <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {probationAlertsList.length} ativos
            </span>
          </div>

          {probationAlertsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 bg-slate-850/30 rounded-xl border border-slate-850 text-center space-y-2">
              <CheckCircle className="h-8 w-8 text-slate-600" />
              <p className="text-xs text-slate-400 font-mono">Nenhum funcionário elegível para efetivação pendente de uniforme.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {probationAlertsList.map(({ employee, months, days }) => (
                <div
                  key={employee.id}
                  className="bg-slate-850 border border-slate-800 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-700 transition"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-white text-sm">{employee.nome}</div>
                    <div className="text-xs text-slate-404 font-mono">
                      Setor: {employee.setor} | CPF: {employee.cpf}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-amber-400 font-mono pt-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Admissão: {new Date(employee.dataAdmissao + 'T00:00:00').toLocaleDateString('pt-BR')} ({months} meses)
                    </div>
                  </div>

                  <button
                    onClick={() => handleResolveEfetivacao(employee.id)}
                    className="w-full sm:w-auto px-3.5 py-2 font-sans font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all shadow shadow-indigo-600/10 cursor-pointer text-center"
                  >
                    Entregar Kit Novo
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Annual Replacements Alerts */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                RENOVAÇÃO DE CICLO ANUAL (365 DIAS)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Peças individuais novas que já completaram 1 ano de uso e devem ser substituídas.
              </p>
            </div>
            <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
              {renewalAlertsList.length} itens a trocar
            </span>
          </div>

          {renewalAlertsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 bg-slate-850/30 rounded-xl border border-slate-850 text-center space-y-2">
              <CheckCircle className="h-8 w-8 text-slate-600" />
              <p className="text-xs text-slate-400 font-mono">Todas as peças de uniforme novas estão dentro do prazo de 1 ano de uso.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {renewalAlertsList.map((alertItem) => (
                <div
                  key={alertItem.id}
                  className="bg-slate-850 border border-slate-800 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-700 transition"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-white text-sm">{alertItem.employee.nome}</div>
                    <div className="text-xs text-slate-404 font-mono">
                      Setor: {alertItem.employee.setor} | CPF: {alertItem.employee.cpf}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1 font-mono text-[10px] sm:text-xs">
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold uppercase">
                        {alertItem.itemType} ({alertItem.tamanho})
                      </span>
                      <span className="text-slate-400 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        Último fornecimento: {new Date(alertItem.dataEntrega + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="text-xs text-red-400 font-mono font-semibold pt-1">
                      Tempo de posse: {alertItem.daysActive} dias (Vencido há {alertItem.daysActive - 365} dias)
                    </div>
                  </div>

                  <button
                    onClick={() => handleResolveReplacement(alertItem)}
                    className="w-full sm:w-auto px-3.5 py-2 font-sans font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all shadow shadow-indigo-600/10 cursor-pointer text-center whitespace-nowrap"
                  >
                    Renovar Peça
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
