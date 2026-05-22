import React, { useState, useEffect } from 'react';
import { Employee, StockItem, UniformType, UniformCondition, Delivery, StockMovement, UniformGender } from '../types';
import { ArrowUpRight, Cpu, Package, Check, HelpCircle } from 'lucide-react';

interface DeliveryFormProps {
  employees: Employee[];
  stock: StockItem[];
  setStock: React.Dispatch<React.SetStateAction<StockItem[]>>;
  deliveries: Delivery[];
  setDeliveries: React.Dispatch<React.SetStateAction<Delivery[]>>;
  setMovements?: React.Dispatch<React.SetStateAction<StockMovement[]>>;
  currentSimulatedDate: string;
  onSuccess: (msg: string) => void;
  preselectedEmployeeId?: string;
}

interface PieceSelection {
  active: boolean;
  tamanho: string;
  condicao: UniformCondition;
  genero: UniformGender;
}

export default function DeliveryForm({
  employees,
  stock,
  setStock,
  deliveries,
  setDeliveries,
  setMovements,
  currentSimulatedDate,
  onSuccess,
  preselectedEmployeeId,
}: DeliveryFormProps) {
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [logError, setLogError] = useState<string>('');
  const [logSuccess, setLogSuccess] = useState<string>('');
  const [isRetroactive, setIsRetroactive] = useState<boolean>(false);

  // Settle preselected employee
  useEffect(() => {
    if (preselectedEmployeeId) {
      setSelectedEmpId(preselectedEmployeeId);
      const emp = employees.find((e) => e.id === preselectedEmployeeId);
      if (emp) {
        setSearchTerm(emp.nome);
      }
    }
  }, [preselectedEmployeeId, employees]);

  // Click outside close listener
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#employee-search-container')) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // Selections state for individual pieces: Camiseta, Bermuda, Calça, Camiseta Polo, Botina
  const [selections, setSelections] = useState<Record<UniformType, PieceSelection>>({
    Camiseta: { active: true, tamanho: 'M', condicao: 'Usado', genero: 'Masculino' },
    Bermuda: { active: false, tamanho: 'M', condicao: 'Usado', genero: 'Masculino' },
    Calça: { active: false, tamanho: 'M', condicao: 'Usado', genero: 'Masculino' },
    'Camiseta Polo': { active: false, tamanho: 'M', condicao: 'Usado', genero: 'Masculino' },
    Botina: { active: false, tamanho: '40', condicao: 'Usado', genero: 'Masculino' },
  });

  // Selected employee metadata
  const selectedEmployee = employees.find((e) => e.id === selectedEmpId);
  const isProbation = selectedEmployee
    ? (new Date(currentSimulatedDate).getTime() - new Date(selectedEmployee.dataAdmissao).getTime()) /
        (1000 * 60 * 60 * 24) <
      90
    : false;

  // Filter employees matching search term
  const filteredEmployees = employees.filter((emp) => {
    if (!emp) return false;
    const term = (searchTerm || '').toLowerCase();
    const nomeLower = (emp.nome || '').toLowerCase();
    const setorLower = (emp.setor || '').toLowerCase();
    const cpfClean = (emp.cpf || '').replace(/[^\D]/g, '');
    const cpfRaw = (emp.cpf || '');
    return (
      nomeLower.includes(term) ||
      cpfClean.includes(term) ||
      cpfRaw.includes(term) ||
      setorLower.includes(term)
    );
  });

  // Handle default condition suggestion based on employee type
  useEffect(() => {
    if (selectedEmployee) {
      setSelections((prev) => {
        const defaultCond: UniformCondition = isProbation ? 'Usado' : 'Novo';
        return {
          Camiseta: { ...prev.Camiseta, condicao: defaultCond },
          Bermuda: { ...prev.Bermuda, condicao: defaultCond },
          Calça: { ...prev.Calça, condicao: defaultCond },
          'Camiseta Polo': { ...prev['Camiseta Polo'], condicao: defaultCond },
          Botina: { ...prev.Botina, condicao: defaultCond },
        };
      });
    }
  }, [selectedEmpId, isProbation]);

  // Helper to query live stock balance
  const getStockQty = (type: UniformType, size: string, condition: UniformCondition, gender: UniformGender): number => {
    const item = stock.find(
      (s) =>
        s.itemType === type &&
        s.genero === gender &&
        s.tamanho.toUpperCase() === size.trim().toUpperCase() &&
        s.condicao === condition
    );
    return item ? item.quantidade : 0;
  };

  const handleTogglePiece = (type: UniformType) => {
    setSelections((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        active: !prev[type].active,
      },
    }));
    setLogError('');
    setLogSuccess('');
  };

  const handleValueChange = (type: UniformType, key: 'tamanho' | 'condicao' | 'genero', value: string) => {
    setSelections((prev) => {
      const updated = {
        ...prev[type],
        [key]: value,
      };

      // Defensive check: if gender becomes Masculino and size is PP, automatically migrate size to P
      if (key === 'genero' && value === 'Masculino' && updated.tamanho === 'PP') {
        updated.tamanho = 'P';
      }

      return {
        ...prev,
        [type]: updated,
      };
    });
    setLogError('');
    setLogSuccess('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLogError('');
    setLogSuccess('');

    if (!selectedEmpId) {
      setLogError('Nenhum colaborador selecionado.');
      return;
    }

    const activePieces = (Object.entries(selections) as [UniformType, PieceSelection][]).filter(
      ([_, sel]) => sel.active
    );

    if (activePieces.length === 0) {
      setLogError('Selecione pelo menos uma peça de uniforme para entregar.');
      return;
    }

    // 1. Validations: Stock Check & Quality Check
    const stockCheckedSlices: { stockId: string; newQty: number; piece: UniformType; size: string; cond: UniformCondition }[] = [];
    const logsAdded: Delivery[] = [];
    let err = '';

    for (const [type, sel] of activePieces) {
      const sizeUpper = sel.tamanho.trim().toUpperCase();

      // Guard check: Rule forbids PP Masculino fardas
      if (sel.genero === 'Masculino' && sizeUpper === 'PP') {
        err = `Regra de Negócio Violada: O tamanho PP não existe para fardas de modelagem Masculina (exclusivo modelagem Feminina). Corrija o item ${type}.`;
        break;
      }

      const match = stock.find(
        (s) =>
          s.itemType === type &&
          s.genero === sel.genero &&
          s.tamanho.toUpperCase() === sizeUpper &&
          s.condicao === sel.condicao
      );

      if (!isRetroactive && (!match || match.quantidade <= 0)) {
        err = `Estoque insuficiente! Não há fardamento em estoque com as especificações solicitadas: ${type} (${sel.genero === 'Masculino' ? 'Masc' : 'Fem'} / ${sel.tamanho} - ${sel.condicao}).`;
        break;
      }

      // Business Rule checks
      if (isProbation && sel.condicao === 'Novo') {
        err = `Regra Bloqueada: O colaborador ${selectedEmployee?.nome} está no Período de Experiência (menor que 90 dias) e deve obrigatoriamente receber fardamento USADO.`;
        break;
      }

      if (match) {
        stockCheckedSlices.push({
          stockId: match.id,
          newQty: isRetroactive ? match.quantidade : match.quantidade - 1,
          piece: type,
          size: sizeUpper,
          cond: sel.condicao,
        });
      }

      logsAdded.push({
        id: `d-${Date.now()}-${type}-${Math.random().toString(36).substring(2, 6)}`,
        funcionarioId: selectedEmpId,
        itemType: type,
        tamanho: sizeUpper,
        condicao: sel.condicao,
        genero: sel.genero,
        dataEntrega: currentSimulatedDate,
        retroativa: isRetroactive,
      });
    }

    if (err) {
      setLogError(err);
      return;
    }

    // SIMULATED TRANSACTION (ACID) - ALL OR NOTHING:
    try {
      // Apply updates to Stock (only if NOT retroactive)
      if (!isRetroactive) {
        setStock((prevStock) =>
          prevStock.map((s) => {
            const slice = stockCheckedSlices.find((chk) => chk.stockId === s.id);
            if (slice) {
              return { ...s, quantidade: slice.newQty };
            }
            return s;
          })
        );
      }

      // Apply updates to Deliveries
      setDeliveries((prevDelivs) => [...prevDelivs, ...logsAdded]);

      if (setMovements) {
        const matchingMoves: StockMovement[] = logsAdded.map((log) => ({
          id: `move-${Date.now()}-${log.itemType}-${Math.random().toString(36).substring(2, 6)}`,
          itemType: log.itemType,
          tamanho: log.tamanho,
          condicao: log.condicao,
          genero: log.genero,
          tipoMovimentacao: 'Saída por Entrega',
          quantidade: isRetroactive ? 0 : -1,
          motivoDescricao: isRetroactive
            ? `Carga Inicial / Entrega Retroativa (Já em posse) | Colaborador: ${selectedEmployee?.nome} (CPF: ${selectedEmployee?.cpf}) | Setor: ${selectedEmployee?.setor}`
            : `Entrega de fardamento ao colaborador: ${selectedEmployee?.nome} (CPF: ${selectedEmployee?.cpf}) | Setor: ${selectedEmployee?.setor}`,
          dataMovimentacao: currentSimulatedDate
        }));
        setMovements((prev) => [...matchingMoves, ...prev]);
      }

      const receiptSummary = logsAdded
          .map((log) => `${log.itemType} (${log.genero === 'Masculino' ? 'Masc' : 'Fem'} / ${log.tamanho} - ${log.condicao})`)
          .join(', ');

      const successMsg = isRetroactive
        ? `Entrega Retroativa (Carga Inicial) registrada com sucesso! Vinculou-se a posse de [${receiptSummary}] ao colaborador ${selectedEmployee?.nome} sem alterar o saldo do estoque.`
        : `Fardamento entregue com sucesso! Foi registrada a saída e baixa automática de: [${receiptSummary}] para o colaborador ${selectedEmployee?.nome}.`;
      setLogSuccess(successMsg);
      onSuccess(successMsg);

      // Clean form on success
      setSelectedEmpId('');
      setSearchTerm('');
      setIsRetroactive(false);
    } catch (e: any) {
      setLogError(`Simulação de ROLLBACK de transação SQL por falha sistêmica: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Cpu className="h-7 w-7 text-indigo-400" />
          Registrar Baixa e Entrega Atomizada
        </h2>
        <p className="text-sm text-slate-400">
          Garante a integridade do estoque (transações integradas). Selecione tamanhos independentes para camisetas, calças ou bermudas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Delivery Form Area */}
        <form onSubmit={handleSubmit} className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-md space-y-6">
          <h4 className="text-sm font-bold text-slate-300 font-mono border-b border-slate-800 pb-3 flex items-center gap-2">
            <Package className="h-4.5 w-4.5 text-indigo-400" />
            FORMULÁRIO DE MOVIMENTAÇÃO DE ESTOQUE
          </h4>

          {/* Employee Selection */}
          <div className="space-y-4 relative" id="employee-search-container">
            <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider">
              1. Selecionar Funcionário Receptador (Busque por Nome, CPF ou Setor)
            </label>
            
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsDropdownOpen(true);
                  // If they typed and matches exactly, select it
                  const matched = employees.find((emp) => (emp?.nome || '').toLowerCase() === e.target.value.trim().toLowerCase());
                  if (matched) {
                    setSelectedEmpId(matched.id);
                  } else {
                    setSelectedEmpId('');
                  }
                }}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder="Digite o nome completo, CPF ou setor empresarial..."
                className="w-full bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-lg p-3 pr-24 text-sm text-white focus:outline-none focus:border-indigo-500 font-medium transition"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedEmpId('');
                      setIsDropdownOpen(true);
                    }}
                    className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-650 font-sans font-bold uppercase transition"
                  >
                    Limpar
                  </button>
                )}
                <span className="text-slate-600">|</span>
                <span className="text-slate-400 text-xs">🔍</span>
              </div>
            </div>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute z-30 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-slate-900 border border-slate-800 rounded-lg shadow-2xl divide-y divide-slate-850">
                {filteredEmployees.length === 0 ? (
                  <div className="p-3 text-xs text-slate-500 font-mono italic">
                    Nenhum colaborador encontrado para "{searchTerm}"
                  </div>
                ) : (
                  filteredEmployees.map((emp) => {
                    const isEmpProbation =
                      (new Date(currentSimulatedDate).getTime() - new Date(emp.dataAdmissao).getTime()) /
                        (1000 * 60 * 60 * 24) <
                      90;
                    const isSelected = emp.id === selectedEmpId;

                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => {
                          setSelectedEmpId(emp.id);
                          setSearchTerm(emp.nome);
                          setIsDropdownOpen(false);
                          setLogError('');
                          setLogSuccess('');
                        }}
                        className={`w-full text-left p-3 text-xs font-mono transition-all flex items-center justify-between hover:bg-slate-800 cursor-pointer ${
                          isSelected ? 'bg-indigo-950/40 text-indigo-400 font-bold border-l-2 border-indigo-500' : 'text-slate-300'
                        }`}
                      >
                        <div>
                          <span className="font-bold text-sm block text-white font-sans">{emp.nome}</span>
                          <span className="text-slate-400 mt-0.5 block">
                            CPF: {emp.cpf} | Setor: {emp.setor}
                          </span>
                        </div>
                        <div className="shrink-0 text-right">
                          {isEmpProbation ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-500 border border-amber-500/20 uppercase font-bold">
                              Experiência
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-500 border border-emerald-500/20 uppercase font-bold">
                              Efetivado
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* Selected Metadata Display */}
            {selectedEmployee && (
              <div className="p-4 bg-slate-800/40 border border-slate-850 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-fade-in mt-2 text-xs font-mono">
                <div className="space-y-1 text-slate-300">
                  <div className="font-sans font-bold text-white text-base">{selectedEmployee.nome}</div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span>CPF: {selectedEmployee.cpf}</span>
                    <span>•</span>
                    <span>Setor: {selectedEmployee.setor}</span>
                  </div>
                </div>

                <div className="text-left sm:border-l sm:border-slate-800 sm:pl-4 text-slate-300 space-y-0.5 shrink-0">
                  <div>
                    Data de Adm: <span className="font-bold text-white">{new Date(selectedEmployee.dataAdmissao + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div>
                    Tempo de Casa: <span className="font-bold text-indigo-400">
                      {Math.floor(
                        (new Date(currentSimulatedDate).getTime() - new Date(selectedEmployee.dataAdmissao).getTime()) /
                          (1000 * 60 * 60 * 24 * 30.4375) * 10
                      ) / 10}{' '}
                      meses
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Retroactive Delivery Option */}
            {selectedEmployee && (
              <div className="p-4 rounded-xl border border-dashed border-indigo-500/20 bg-indigo-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in mt-3" id="retroactive-toggle-container">
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
                    <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse"></span>
                    Lançamento Retroativo
                  </label>
                  <span className="text-sm font-bold text-white font-sans block">
                    Entrega Retroativa (Já em posse do funcionário)
                  </span>
                  <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                    Marque esta opção se o colaborador já possui as peças fisicamente (ex: fardamento entregue antes do sistema). O sistema vinculará a roupa na ficha dele sem debitar do saldo físico atual de estoque.
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {isRetroactive ? 'ATIVADO' : 'DESATIVADO'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRetroactive(!isRetroactive);
                      setLogError('');
                      setLogSuccess('');
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isRetroactive ? 'bg-indigo-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isRetroactive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Active Piece Selector with independent Options */}
          <div className="space-y-4">
            <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider">
              2. Itens do Uniforme & Tamanhos Independentes
            </label>

            <div className="space-y-3">
              {(() => {
                // Sizing helper
                const getSizesForType = (itemType: UniformType): string[] => {
                  if (itemType === 'Botina') {
                    return ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44'];
                  }
                  return ['PP', 'P', 'M', 'G', 'GG', 'EG', 'EXG'];
                };

                return (['Camiseta', 'Bermuda', 'Calça', 'Camiseta Polo', 'Botina'] as UniformType[]).map((type) => {
                  const sel = selections[type];
                  const availableQty = getStockQty(type, sel.tamanho, sel.condicao, sel.genero);

                  return (
                    <div
                      key={type}
                      className={`p-4 rounded-xl border transition-all ${
                        sel.active
                          ? 'bg-slate-800/60 border-indigo-500/30 shadow-sm'
                          : 'bg-slate-900 border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Checkbox wrapper */}
                        <button
                          type="button"
                          onClick={() => handleTogglePiece(type)}
                          className="flex items-center gap-3 text-left cursor-pointer group"
                        >
                          <div
                            className={`h-5 w-5 rounded-md flex items-center justify-center border transition-all ${
                              sel.active
                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                : 'border-slate-700 bg-slate-850 group-hover:border-slate-500'
                            }`}
                          >
                            {sel.active && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                          </div>
                          <div>
                            <span className="text-sm font-bold text-white block">{type}</span>
                            <span className="text-xs text-slate-400">
                              {sel.active ? 'Ativado na entrega' : 'Clique para incluir'}
                            </span>
                          </div>
                        </button>

                        {/* Dropdowns when active */}
                        {sel.active && (
                          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                            {/* Gender */}
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] text-slate-500 uppercase">Gênero</span>
                              <select
                                value={sel.genero}
                                onChange={(e) => handleValueChange(type, 'genero', e.target.value)}
                                className="bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-3 text-white focus:outline-none"
                              >
                                <option value="Masculino" className="bg-slate-900 text-white">Masc</option>
                                <option value="Feminino" className="bg-slate-900 text-white">Fem</option>
                              </select>
                            </div>

                            {/* Size */}
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] text-slate-500 uppercase">Tamanho</span>
                              <select
                                value={sel.tamanho}
                                onChange={(e) => handleValueChange(type, 'tamanho', e.target.value)}
                                className="bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-3 text-white focus:outline-none"
                              >
                                {getSizesForType(type)
                                  .filter(s => !(sel.genero === 'Masculino' && s === 'PP'))
                                  .map((sz) => (
                                    <option key={sz} value={sz} className="bg-slate-900 text-white">{sz}</option>
                                  ))
                                }
                              </select>
                            </div>

                            {/* Condition */}
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] text-slate-500 uppercase">Condição</span>
                              <select
                                value={sel.condicao}
                                onChange={(e) => handleValueChange(type, 'condicao', e.target.value as UniformCondition)}
                                className="bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-3 text-white focus:outline-none"
                              >
                                <option value="Novo" className="bg-slate-900 text-white">Novo (Efetivo)</option>
                                <option value="Usado" className="bg-slate-900 text-white">Usado (Experiência)</option>
                              </select>
                            </div>

                            {/* Real-time stock display */}
                            <div className="flex flex-col gap-1 pl-2">
                              <span className="text-[10px] text-slate-400 uppercase">Estoque Disponível</span>
                              <div className="py-1 px-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center gap-1.5">
                                {isRetroactive ? (
                                  <span className="text-xs font-bold font-mono text-slate-400 flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-slate-500"></span>
                                    {availableQty} u (Bypass)
                                  </span>
                                ) : (
                                  <span
                                    className={`text-xs font-bold font-mono ${
                                      availableQty <= 0
                                        ? 'text-red-400'
                                        : availableQty <= 3
                                        ? 'text-amber-500'
                                        : 'text-emerald-400'
                                    }`}
                                  >
                                    {availableQty} peças
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Form alert states */}
          {logError && (
            <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-lg text-xs leading-relaxed text-red-400 font-mono">
              <span className="font-bold uppercase tracking-wider block mb-1">Restrição de Validação Erro:</span>
              {logError}
            </div>
          )}

          {logSuccess && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-lg text-xs leading-relaxed text-emerald-400 font-mono">
              <span className="font-bold uppercase tracking-wider block mb-1">Sucesso:</span>
              {logSuccess}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between border-t border-slate-800 pt-5">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <HelpCircle className="h-4 w-4" />
              Sua ação baixa o estoque físico instantaneamente.
            </div>

            <button
              type="submit"
              className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/25 transition cursor-pointer"
            >
              Confirmar e Salvar Entrega
            </button>
          </div>
        </form>

        {/* Business Rule Side-view */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md">
            <h5 className="text-xs font-mono font-bold text-slate-300 tracking-wider mb-3">CHECKLIST DE REGRAS DE NEGÓCIO</h5>

            <div className="space-y-3.5 text-xs leading-relaxed text-slate-400">
              <div className="flex gap-2.5 items-start">
                <div className={`h-4.5 w-4.5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-mono font-bold ${
                  selectedEmployee && isProbation
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  1
                </div>
                <div>
                  <span className="text-white block font-semibold">Período de Experiência (3 meses)</span>
                  {selectedEmployee && isProbation ? (
                    <span className="text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded font-mono font-bold">
                      Ativo para {selectedEmployee.nome}. Somente entrega Usados!
                    </span>
                  ) : (
                    <span>Colaborador já ultrapassou o período de 3 meses. Habilitado para uniformes novos!</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2.5 items-start">
                <div className="h-4.5 w-4.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-mono font-bold">
                  2
                </div>
                <div>
                  <span className="text-white block font-semibold">Controle Multipeças Independente</span>
                  <span>O colaborador pode receber tamanhos e itens diferentes na mesma ordem. O estoque é reduzido por peça e tamanho exatos.</span>
                </div>
              </div>

              <div className="flex gap-2.5 items-start">
                <div className="h-4.5 w-4.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-mono font-bold">
                  3
                </div>
                <div>
                  <span className="text-white block font-semibold">Ciclo de Renovação de 365 Dias</span>
                  <span>A entrega de uma nova peça dispara o temporizador anual específico de revalidação para a respectiva categoria do funcionário.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Historical delivery records for this employee */}
          {selectedEmployee && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md">
              <h5 className="text-xs font-mono font-bold text-slate-300 tracking-wider mb-2.5">
                HISTÓRICO ATUAL DE {selectedEmployee.nome.toUpperCase()}
              </h5>
              
              {deliveries.filter((d) => d.funcionarioId === selectedEmpId).length === 0 ? (
                <div className="text-xs text-slate-500 italic font-mono p-4 bg-slate-850/30 rounded border border-slate-800">
                  Nenhuma entrega registrada para este colaborador ainda.
                </div>
              ) : (
                <div className="space-y-2 overflow-y-auto max-h-52 pr-1 font-mono text-xs">
                  {deliveries
                    .filter((d) => d.funcionarioId === selectedEmpId)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded bg-slate-850 border border-slate-800 hover:border-slate-700 transition"
                      >
                        <div className="flex justify-between font-bold text-white mb-0.5">
                          <span>{item.itemType} (Tam {item.tamanho})</span>
                          <span className={item.condicao === 'Novo' ? 'text-teal-400' : 'text-amber-500'}>
                            {item.condicao}
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>
                            Data: {new Date(item.dataEntrega + 'T00:00:00').toLocaleDateString('pt-BR')}
                            {item.retroativa && (
                              <span className="ml-1 px-1 py-0.5 rounded text-[8px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 uppercase font-bold text-[7.5px] font-sans">
                                Retroativo
                              </span>
                            )}
                          </span>
                          <span>ID: {item.id.substring(0, 10)}</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
