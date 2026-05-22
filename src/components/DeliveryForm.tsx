import React, { useState, useEffect } from 'react';
import { Employee, StockItem, UniformType, UniformCondition, Delivery, StockMovement, UniformGender } from '../types';
import { Cpu, Package, HelpCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

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

  // Direct delivery state inputs
  const [addItemType, setAddItemType] = useState<UniformType>('Camiseta');
  const [addGender, setAddGender] = useState<UniformGender>('Masculino');
  const [addSize, setAddSize] = useState<string>('M');
  const [addCondition, setAddCondition] = useState<UniformCondition>('Novo');
  const [addQty, setAddQty] = useState<number>(1);

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

  // Handle default condition suggestion when employee changes
  useEffect(() => {
    setLogError('');
    setLogSuccess('');
    if (selectedEmployee) {
      setAddCondition(isProbation ? 'Usado' : 'Novo');
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

  // Sizing helper
  const getSizesForType = (itemType: UniformType): string[] => {
    if (itemType === 'Botina') {
      return ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44'];
    }
    return ['PP', 'P', 'M', 'G', 'GG', 'EG', 'EXG'];
  };

  const handleItemTypeChange = (itemType: UniformType) => {
    setAddItemType(itemType);
    if (itemType === 'Botina') {
      setAddSize('40');
    } else {
      setAddSize('M');
    }
    setLogError('');
    setLogSuccess('');
  };

  const handleGenderChange = (gender: UniformGender) => {
    setAddGender(gender);
    if (gender === 'Masculino' && addSize === 'PP') {
      setAddSize('P');
    }
    setLogError('');
    setLogSuccess('');
  };

  const handleSizeChange = (size: string) => {
    setAddSize(size);
    setLogError('');
    setLogSuccess('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLogError('');
    setLogSuccess('');

    if (!selectedEmpId || !selectedEmployee) {
      setLogError('Selecione o colaborador destinatário.');
      return;
    }

    const sizeUpper = addSize.trim().toUpperCase();
    const requestedQty = Math.floor(addQty);

    if (requestedQty <= 0) {
      setLogError('A quantidade de itens deve ser de pelo menos 1 peça.');
      return;
    }

    // Guard check: Rule forbids PP Masculino fardas
    if (addGender === 'Masculino' && sizeUpper === 'PP') {
      setLogError('Regra de Negócio Violada: O tamanho PP não existe para fardas de modelagem Masculina (exclusivo modelagem Feminina).');
      return;
    }

    // Business Rule checks: Probation implies only USADO
    if (isProbation && addCondition === 'Novo') {
      setLogError(`Regra Bloqueada: O colaborador ${selectedEmployee.nome} está no Período de Experiência (menor que 90 dias) e deve obrigatoriamente receber fardamento USADO.`);
      return;
    }

    // Stock check
    const availableQty = getStockQty(addItemType, sizeUpper, addCondition, addGender);
    if (!isRetroactive && availableQty < requestedQty) {
      setLogError(`Estoque insuficiente! Você tentou entregar ${requestedQty} peças, mas há apenas ${availableQty} peças disponíveis em estoque para ${addItemType} (${addGender === 'Masculino' ? 'Masc' : 'Fem'} / ${sizeUpper} - ${addCondition}).`);
      return;
    }

    // Process Transaction immediately
    try {
      // 1. Discount stock (only if NOT retroactive)
      if (!isRetroactive) {
        setStock((prevStock) =>
          prevStock.map((s) => {
            if (
              s.itemType === addItemType &&
              s.genero === addGender &&
              s.tamanho.toUpperCase() === sizeUpper &&
              s.condicao === addCondition
            ) {
              return { ...s, quantidade: Math.max(0, s.quantidade - requestedQty) };
            }
            return s;
          })
        );
      }

      // 2. Add Delivery Entry
      const newDelivery: Delivery = {
        id: `d-${Date.now()}-${addItemType}-${Math.random().toString(36).substring(2, 6)}`,
        funcionarioId: selectedEmpId,
        itemType: addItemType,
        tamanho: sizeUpper,
        condicao: addCondition,
        genero: addGender,
        dataEntrega: currentSimulatedDate,
        retroativa: isRetroactive,
        quantidade: requestedQty,
      };

      setDeliveries((prevDelivs) => [...prevDelivs, newDelivery]);

      // 3. Register Stock Movement Log
      if (setMovements) {
        const movementLog: StockMovement = {
          id: `move-${Date.now()}-${addItemType}-${Math.random().toString(36).substring(2, 6)}`,
          itemType: addItemType,
          tamanho: sizeUpper,
          condicao: addCondition,
          genero: addGender,
          tipoMovimentacao: 'Saída por Entrega',
          quantidade: isRetroactive ? 0 : -requestedQty,
          motivoDescricao: isRetroactive
            ? `Carga Inicial / Entrega Retroativa (Instantânea) | Colaborador: ${selectedEmployee.nome} (CPF: ${selectedEmployee.cpf}) | Setor: ${selectedEmployee.setor} | Qtd: ${requestedQty}`
            : `Entrega de fardamento direta ao colaborador: ${selectedEmployee.nome} (CPF: ${selectedEmployee.cpf}) | Setor: ${selectedEmployee.setor} | Qtd: ${requestedQty}`,
          dataMovimentacao: currentSimulatedDate
        };
        setMovements((prev) => [movementLog, ...prev]);
      }

      const summaryText = `${requestedQty}x ${addItemType} (${addGender === 'Masculino' ? 'Masc' : 'Fem'} / ${sizeUpper} - ${addCondition})`;
      const successMsg = isRetroactive
        ? `Entrega Retroativa registrada com sucesso! Vinculou-se a posse de [${summaryText}] ao colaborador ${selectedEmployee.nome} sem alterar o estoque.`
        : `Fardamento entregue com sucesso! Foi registrada a saída e baixa automática de: [${summaryText}] para o colaborador ${selectedEmployee.nome}.`;
      
      setLogSuccess(successMsg);
      onSuccess(successMsg);

      // Clean inputs for a fresh and ready layout state (leaving employee selected to encourage fast sequential launches if desired)
      setAddQty(1);
    } catch (e: any) {
      setLogError(`Falha no processamento da transação: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Cpu className="h-7 w-7 text-indigo-400" />
          Registrar Entrega de Uniforme (Direta)
        </h2>
        <p className="text-sm text-slate-400">
          Selecione o colaborador, especifique a peça desejada e confirme para lançar imediatamente a entrega e descontar do estoque disponível.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Delivery Form Area */}
        <form onSubmit={handleSubmit} className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-md space-y-6">
          <h4 className="text-sm font-bold text-slate-300 font-mono border-b border-slate-800 pb-3 flex items-center gap-2">
            <Package className="h-4.5 w-4.5 text-indigo-400" />
            BAIXA DE ESTOQUE E ENTREGA DIRETA DE UNIFORME
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
                    className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-650 font-sans font-bold uppercase transition focus:outline-none"
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
          </div>

          {/* Piece Settings */}
          {selectedEmployee && (
            <div className="bg-slate-850/60 border border-slate-800 rounded-xl p-5 space-y-5 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h5 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                  Especifique os Detalhes da Peça
                </h5>
                <span className="text-[10px] text-slate-550 font-mono">2. Detalhes do Uniforme</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                {/* Item Type Selector */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-slate-400 uppercase font-sans">Tipo de Uniforme</span>
                  <select
                    value={addItemType}
                    onChange={(e) => handleItemTypeChange(e.target.value as UniformType)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-3 text-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none transition"
                  >
                    <option value="Camiseta">Camiseta</option>
                    <option value="Bermuda">Bermuda</option>
                    <option value="Calça">Calça</option>
                    <option value="Camiseta Polo">Camiseta Polo</option>
                    <option value="Botina">Botina</option>
                  </select>
                </div>

                {/* Model / Gender Selector */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-slate-400 uppercase font-sans">Gênero</span>
                  <select
                    value={addGender}
                    onChange={(e) => handleGenderChange(e.target.value as UniformGender)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-3 text-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none transition"
                  >
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                  </select>
                </div>

                {/* Size Selector */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-slate-400 uppercase font-sans">Tamanho</span>
                  <select
                    value={addSize}
                    onChange={(e) => handleSizeChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-3 text-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none transition"
                  >
                    {getSizesForType(addItemType)
                      .filter((s) => !(addGender === 'Masculino' && s === 'PP'))
                      .map((sz) => (
                        <option key={sz} value={sz}>
                          {sz}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Condition Selector */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-sans font-bold text-indigo-400 uppercase">Condição</span>
                  <select
                    value={addCondition}
                    onChange={(e) => {
                      setAddCondition(e.target.value as UniformCondition);
                      setLogError('');
                    }}
                    className="w-full bg-slate-900 border border-slate-755 font-sans rounded-lg py-2.5 px-3 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none transition font-bold text-indigo-400"
                  >
                    <option value="Novo">Novo (Efetivo)</option>
                    <option value="Usado">Usado (Experiência)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-800/60">
                {/* Quantity Input */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">Quantidade a Entregar</span>
                  <input
                    type="number"
                    min="1"
                    value={addQty}
                    onChange={(e) => {
                      const val = Math.max(1, parseInt(e.target.value) || 1);
                      setAddQty(val);
                      setLogError('');
                    }}
                    className="bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-4 text-white text-sm font-bold focus:outline-none focus:border-indigo-500 w-full"
                  />
                </div>

                {/* Stock Info Visual Badge */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-slate-400 uppercase font-sans">Estoque Físico Disponível</span>
                  <div className="py-2.5 px-4 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                    {isRetroactive ? (
                      <span className="text-xs font-bold font-mono text-indigo-400 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                        Bypass Ativo (Retroativo - Sem controle de estoque)
                      </span>
                    ) : (
                      (() => {
                        const avail = getStockQty(addItemType, addSize, addCondition, addGender);
                        return (
                          <>
                            <span className="text-xs text-slate-500">Saldo atual da grade selecionada:</span>
                            <span
                              className={`text-sm font-bold font-mono flex items-center gap-1.5 ${
                                avail <= 0
                                  ? 'text-rose-400 animate-pulse'
                                  : avail <= 2
                                  ? 'text-amber-500'
                                  : 'text-emerald-400'
                              }`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                avail <= 0 ? 'bg-rose-455' : avail <= 2 ? 'bg-amber-500' : 'bg-emerald-400'
                              }`} />
                              {avail} peças
                            </span>
                          </>
                        );
                      })()
                    )}
                  </div>
                </div>
              </div>

              {/* Retroactive Delivery Option inside current pieces edit */}
              <div className="p-4 rounded-xl border border-dashed border-indigo-500/20 bg-indigo-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in" id="retroactive-toggle-container">
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
                    <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse"></span>
                    Estoque Retroativo (Sem Vazão)
                  </label>
                  <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                    Selecione esta opção se o colaborador já estiver portando estas {addQty} farda(s) de antemão e quer registrar apenas formalidade, sem baixar do saldo de estoque do almoxarifado.
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
            </div>
          )}

          {/* Form alert states */}
          {logError && (
            <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-lg text-xs leading-relaxed text-red-400 font-mono flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold uppercase tracking-wider block mb-1 text-red-500 text-[10px]">Restrição de Validação Erro:</span>
                {logError}
              </div>
            </div>
          )}

          {logSuccess && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-lg text-xs leading-relaxed text-emerald-400 font-mono flex items-start gap-2">
              <CheckCircle2 className="h-4.5 w-4.5 shrink-0 mt-0.5 text-emerald-500" />
              <div>
                <span className="font-bold uppercase tracking-wider block mb-1 text-emerald-500 text-[10px]">Sucesso:</span>
                {logSuccess}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between border-t border-slate-800 pt-5">
            <div className="flex items-center gap-1.5 text-xs text-slate-450 font-mono">
              <HelpCircle className="h-4 w-4 text-slate-500" />
              <span>Sua ação dará baixa física do item no estoque do almoxarifado em lote único.</span>
            </div>

            <button
              type="submit"
              disabled={!selectedEmpId}
              className={`px-8 py-3.5 rounded-lg font-bold text-sm shadow-md transition cursor-pointer ${
                !selectedEmpId
                  ? 'bg-slate-800 text-slate-500 shadow-none cursor-not-allowed border border-slate-750'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25 hover:shadow-lg hover:scale-[1.01]'
              }`}
            >
              Confirmar Entrega
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
                    <span className="text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-mono font-bold block mt-1">
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
                  <span className="text-white block font-semibold">Ciclo de Renovação de 365 Dias</span>
                  <span>A entrega de uma nova peça dispara o temporizador anual específico de revalidação para a respectiva categoria do funcionário.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Historical delivery records for this employee */}
          {selectedEmployee && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md animate-fade-in">
              <h5 className="text-xs font-mono font-bold text-slate-300 tracking-wider mb-2.5">
                HISTÓRICO ATUAL DE {selectedEmployee.nome.toUpperCase()}
              </h5>
              
              {deliveries.filter((d) => d.funcionarioId === selectedEmpId).length === 0 ? (
                <div className="text-xs text-slate-500 italic font-mono p-4 bg-slate-850/30 rounded border border-slate-800">
                  Nenhuma entrega registrada para este colaborador ainda.
                </div>
              ) : (
                <div className="space-y-2 overflow-y-auto max-h-64 pr-1 font-mono text-xs">
                  {deliveries
                    .filter((d) => d.funcionarioId === selectedEmpId)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded bg-slate-850 border border-slate-800 hover:border-slate-700 transition"
                      >
                        <div className="flex justify-between font-bold text-white mb-0.5">
                          <span>
                            {item.quantidade > 1 ? `${item.quantidade}x ` : ''}
                            {item.itemType} (Tam {item.tamanho})
                          </span>
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
