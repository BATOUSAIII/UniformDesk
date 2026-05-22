import React, { useState, useEffect } from 'react';
import { Employee, Delivery, StockItem, StockMovement, UniformType, UniformGender, UniformCondition } from '../types';
import { Users, UserPlus, Calendar, ShieldAlert, Award, Zap, Trash2, Edit3, Plus, Check, X, FolderEdit } from 'lucide-react';

interface EmployeePanelProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  currentSimulatedDate: string; // "2026-05-22"
  sectors: string[];
  setSectors: React.Dispatch<React.SetStateAction<string[]>>;
  deliveries: Delivery[];
  setDeliveries: React.Dispatch<React.SetStateAction<Delivery[]>>;
  stock: StockItem[];
  setStock: React.Dispatch<React.SetStateAction<StockItem[]>>;
  setMovements: React.Dispatch<React.SetStateAction<StockMovement[]>>;
}

export default function EmployeePanel({
  employees,
  setEmployees,
  currentSimulatedDate,
  sectors,
  setSectors,
  deliveries,
  setDeliveries,
  stock,
  setStock,
  setMovements,
}: EmployeePanelProps) {
  // Form states
  const [newNome, setNewNome] = useState('');
  const [newCPF, setNewCPF] = useState('');
  const [newSetor, setNewSetor] = useState('Logística');
  const [newDataAdmissao, setNewDataAdmissao] = useState('2026-05-22');
  
  // Edit mode states
  const [editingId, setEditingId] = useState<string | null>(null);

  // Sector management states
  const [showSectorMgr, setShowSectorMgr] = useState(false);
  const [newSectorName, setNewSectorName] = useState('');
  const [renamingSector, setRenamingSector] = useState<string | null>(null);
  const [renamedValue, setRenamedValue] = useState('');

  // Logging state
  const [logMsg, setLogMsg] = useState('');

  // Safe Overlay Modal States (bypassing browser dialogue sandbox filters)
  const [customConfirm, setCustomConfirm] = useState<{
    show: boolean;
    title: string;
    message: string;
    actionType: 'delete_employee' | 'delete_sector';
    targetId: string;
    targetName: string;
  } | null>(null);

  const [demissionModal, setDemissionModal] = useState<{
    show: boolean;
    employeeId: string;
    employeeName: string;
    possessions: {
      deliveryId: string;
      itemType: UniformType;
      tamanho: string;
      condicao: UniformCondition;
      genero: UniformGender;
      dataEntrega: string;
      selectedDecision: 'Usado' | 'Novo' | 'Descarte';
      quantidade: number;
    }[];
  } | null>(null);

  const [customAlert, setCustomAlert] = useState<{
    show: boolean;
    title: string;
    message: string;
  } | null>(null);

  // Set default admissions date as today
  useEffect(() => {
    if (!editingId) {
      setNewDataAdmissao(currentSimulatedDate);
    }
  }, [currentSimulatedDate, editingId]);

  // Settle time logic
  const calculateContractTime = (admissionStr: string) => {
    const admission = new Date(admissionStr);
    const simulatedToday = new Date(currentSimulatedDate);

    // Difference in milliseconds
    const diffTime = simulatedToday.getTime() - admission.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const months = parseFloat((diffDays / 30.4375).toFixed(1));
    return { days: diffDays, months };
  };

  // Helper CPF formatter on the fly
  const handleCPFChange = (value: string) => {
    const formatted = value
      .replace(/\D/g, '') // Remove non-digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .substring(0, 14);
    setNewCPF(formatted);
  };

  // Clean form
  const resetForm = () => {
    setNewNome('');
    setNewCPF('');
    setNewSetor(sectors[0] || '');
    setNewDataAdmissao(currentSimulatedDate);
    setEditingId(null);
  };

  // Select employee to edit
  const handleStartEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setNewNome(emp.nome);
    setNewCPF(emp.cpf);
    setNewSetor(emp.setor);
    setNewDataAdmissao(emp.dataAdmissao);
    setLogMsg(`Modo Edição ativado para o colaborador: ${emp.nome}`);
  };

  const handleCancelEdit = () => {
    resetForm();
    setLogMsg('Edição cancelada.');
  };

  // Submit Handler (Create or Edit)
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newNome.trim() || !newCPF.trim()) {
      setLogMsg('Erro: Preencha todos os campos obrigatórios (Nome e CPF).');
      return;
    }

    // CPF Basic format check (must match structure)
    const rawCpf = newCPF.replace(/\D/g, '');
    if (rawCpf.length !== 11) {
      setLogMsg('Erro: CPF deve conter exatamente 11 dígitos.');
      return;
    }

    // Uniqueness validation (exclude the editing ID)
    const duplicatedCPF = employees.some(
      (emp) => emp.id !== editingId && emp.cpf.replace(/\D/g, '') === rawCpf
    );

    if (duplicatedCPF) {
      setLogMsg(`Erro: O CPF "${newCPF}" já está cadastrado para outro funcionário.`);
      return;
    }

    if (editingId) {
      // EDIT MODE
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === editingId
            ? {
                ...emp,
                nome: newNome.trim(),
                cpf: newCPF,
                setor: newSetor,
                dataAdmissao: newDataAdmissao,
              }
            : emp
        )
      );
      setLogMsg(`Sucesso: Ficha de "${newNome.trim()}" atualizada.`);
      resetForm();
    } else {
      // CREATE MODE
      const newEmp: Employee = {
        id: `e-${Date.now()}`,
        nome: newNome.trim(),
        setor: newSetor,
        cpf: newCPF,
        dataAdmissao: newDataAdmissao,
      };

      setEmployees((prev) => [...prev, newEmp]);
      setLogMsg(`Funcionário [CPF: ${newEmp.cpf}] ${newEmp.nome} cadastrado com sucesso!`);
      resetForm();
    }
  };

  // Delete collaborator handler with safety validation and return to stock orchestration
  const handleRemoveEmployee = (empId: string, name: string) => {
    // 1. Gather all deliveries currently in possession
    const empDeliveries = deliveries.filter((d) => d.funcionarioId === empId);
    
    // Group by itemType to get the most recent delivery of each item type.
    const latestByType: Record<string, Delivery> = {};
    empDeliveries.forEach((d) => {
      const activeLatest = latestByType[d.itemType];
      if (!activeLatest || new Date(d.dataEntrega).getTime() > new Date(activeLatest.dataEntrega).getTime()) {
        latestByType[d.itemType] = d;
      }
    });

    const possessions = Object.values(latestByType).map((d) => ({
      deliveryId: d.id,
      itemType: d.itemType,
      tamanho: d.tamanho,
      condicao: d.condicao,
      genero: d.genero,
      dataEntrega: d.dataEntrega,
      selectedDecision: 'Usado' as 'Usado' | 'Novo' | 'Descarte', // Default: Retornar como Usada
      quantidade: d.quantidade || 1,
    }));

    setDemissionModal({
      show: true,
      employeeId: empId,
      employeeName: name,
      possessions,
    });
  };

  // Processes employee dismissal, stock recovery, and movements in a consolidated action
  const executeEmployeeDismissal = () => {
    if (!demissionModal) return;

    const { employeeId, employeeName, possessions } = demissionModal;

    // 1. Start updating stock based on selections
    let updatedStock = [...stock];
    const newMovementsList: any[] = [];

    possessions.forEach((p) => {
      const { itemType, tamanho, genero, selectedDecision, quantidade } = p;
      const qty = quantidade || 1;

      // If they decided to return to stock (either as Usado or Novo)
      if (selectedDecision === 'Usado' || selectedDecision === 'Novo') {
        const returnCondition: UniformCondition = selectedDecision;

        // Find match in stock
        const stockIndex = updatedStock.findIndex(
          (s) =>
            s.itemType === itemType &&
            s.tamanho.trim().toUpperCase() === tamanho.trim().toUpperCase() &&
            s.genero === genero &&
            s.condicao === returnCondition
        );

        if (stockIndex !== -1) {
          // Increment quantity
          updatedStock[stockIndex] = {
            ...updatedStock[stockIndex],
            quantidade: updatedStock[stockIndex].quantidade + qty,
          };
        } else {
          // If the stock entry does not exist, create a new one
          updatedStock.push({
            id: Math.random().toString(36).substring(2, 11),
            itemType,
            tamanho,
            genero,
            condicao: returnCondition,
            quantidade: qty,
          });
        }

        // Add movement log
        newMovementsList.push({
          id: Math.random().toString(36).substring(2, 11),
          itemType,
          tamanho,
          condicao: returnCondition,
          genero,
          tipoMovimentacao: 'Entrada por Devolução',
          quantidade: qty,
          dataMovimentacao: currentSimulatedDate,
          motivoDescricao: `Devolução por desligamento: ${employeeName}. Qtd: ${qty}. Origem: entrega de ${new Date(p.dataEntrega + 'T00:00:00').toLocaleDateString('pt-BR')}`,
        });
      } else {
        // Log as discard
        newMovementsList.push({
          id: Math.random().toString(36).substring(2, 11),
          itemType,
          tamanho,
          condicao: p.condicao,
          genero,
          tipoMovimentacao: 'Saída por Descarte',
          quantidade: -qty,
          dataMovimentacao: currentSimulatedDate,
          motivoDescricao: `Descarte por desligamento: ${employeeName}. Qtd: ${qty}. Peça descartada sem retorno ao estoque.`,
        });
      }
    });

    // 2. Perform soft-delete update of the employee
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id === employeeId) {
          return {
            ...emp,
            deleted: true,
            dataDemissao: currentSimulatedDate, // Mark as dismissed today
          };
        }
        return emp;
      })
    );

    // 3. Update stock and movements
    setStock(updatedStock);
    if (newMovementsList.length > 0) {
      setMovements((prev) => [...newMovementsList, ...prev]);
    }

    setLogMsg(
      `Sucesso: Colaborador "${employeeName}" desligado. ${
        possessions.length > 0
          ? `${possessions.length} uniformes devolvidos/processados no estoque.`
          : 'Nenhuma peça estava em posse dele.'
      }`
    );

    if (editingId === employeeId) {
      resetForm();
    }

    setDemissionModal(null);
  };

  const executeConfirmedAction = () => {
    if (!customConfirm) return;
    const { actionType, targetId, targetName } = customConfirm;

    if (actionType === 'delete_employee') {
      setEmployees((prev) => prev.filter((emp) => emp.id !== targetId));
      setLogMsg(`Sucesso: Colaborador "${targetName}" removido do sistema.`);
      if (editingId === targetId) {
        resetForm();
      }
    } else if (actionType === 'delete_sector') {
      setSectors((prev) => prev.filter((s) => s !== targetId));
      setLogMsg(`Sucesso: Setor "${targetId}" excluído da lista de opções.`);
      if (newSetor === targetId) {
        setNewSetor(sectors.find((s) => s !== targetId) || '');
      }
    }

    setCustomConfirm(null);
  };

  // Quick simulated shift for testing rules
  const handleShiftAdmissionDate = (empId: string, offsetMonths: number) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== empId) return emp;

        const date = new Date(emp.dataAdmissao);
        date.setMonth(date.getMonth() - offsetMonths);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const updatedDate = `${yyyy}-${mm}-${dd}`;

        return {
          ...emp,
          dataAdmissao: updatedDate,
        };
      })
    );
    setLogMsg('Data de admissão ajustada retroativamente para fins de simulação.');
  };

  // Sector Management handlers:
  const handleAddSector = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newSectorName.trim();
    if (!name) return;

    if (sectors.some((s) => s.toLowerCase() === name.toLowerCase())) {
      setCustomAlert({
        show: true,
        title: 'Setor Já Cadastrado',
        message: `O setor "${name}" já existe na lista de opções cadastradas.`,
      });
      return;
    }

    setSectors((prev) => [...prev, name]);
    setNewSectorName('');
    setLogMsg(`Aba Setor: Novo setor "${name}" cadastrado.`);
  };

  const handleStartRenameSector = (sec: string) => {
    setRenamingSector(sec);
    setRenamedValue(sec);
  };

  const handleSaveRenameSector = (oldName: string) => {
    const freshVal = renamedValue.trim();
    if (!freshVal || freshVal === oldName) {
      setRenamingSector(null);
      return;
    }

    // Cascade update the sectors array
    setSectors((prev) => prev.map((s) => (s === oldName ? freshVal : s)));

    // Cascade update all existing employees that used this oldSector name!
    setEmployees((prev) =>
      prev.map((emp) => (emp.setor === oldName ? { ...emp, setor: freshVal } : emp))
    );

    // Update active forms state if affected
    if (newSetor === oldName) {
      setNewSetor(freshVal);
    }

    setLogMsg(`CASCADING UPDATE: Setor "${oldName}" renomeado para "${freshVal}". Fichas atualizadas.`);
    setRenamingSector(null);
  };

  const handleDeleteSector = (sectorName: string) => {
    // Safety check: count active link employees
    const count = employees.filter((emp) => emp.setor === sectorName).length;
    if (count > 0) {
      setCustomAlert({
        show: true,
        title: 'Impeditivo de Exclusão de Setor',
        message: `Existem atualmente ${count} colaborador(es) vinculados ao setor "${sectorName}". Você deve migrar estes colaboradores antes de poder deletar o setor.`,
      });
      return;
    }

    setCustomConfirm({
      show: true,
      title: 'Excluir Setor Cadastrado',
      message: `Tem certeza que deseja remover o setor "${sectorName}" do pool corporativo?`,
      actionType: 'delete_sector',
      targetId: sectorName,
      targetName: sectorName,
    });
  };

  return (
    <div className="space-y-6" id="employee-panel-module">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7 text-indigo-400" />
            Configurações de Colaboradores & Organograma
          </h2>
          <p className="text-sm text-slate-400">
            Cadastre, edite informações cadastrais (como CPF único) ou gerencie os setores da empresa com atualizações automáticas em cascata.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LIST SECTION */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-md space-y-4">
          <h4 className="text-sm font-bold text-slate-300 font-mono border-b border-slate-800 pb-3 uppercase tracking-wider">
            FICHAS CADASTRAIS CADASTRADAS ({employees.filter(emp => !emp.deleted).length})
          </h4>

          {employees.filter(emp => !emp.deleted).length === 0 ? (
            <div className="p-8 text-center bg-slate-850/30 rounded-lg text-slate-500 text-xs font-mono">
              Não existem funcionários ativos cadastrados no banco de dados. Adicione um na barra lateral de cadastro.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse" id="employees-table">
                <thead>
                  <tr className="border-b border-slate-800 font-mono text-slate-500 text-xs">
                    <th className="py-2.5">Colaborador</th>
                    <th className="py-2.5">CPF Único</th>
                    <th className="py-2.5">Data Admissão</th>
                    <th className="py-2.5 text-center">Contrato</th>
                    <th className="py-2.5 text-right">Ações Operacionais / Teste</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {employees.filter(emp => !emp.deleted).map((emp) => {
                    const { days, months } = calculateContractTime(emp.dataAdmissao);
                    const isProbation = days < 90;

                    return (
                      <tr key={emp.id} className="hover:bg-slate-800/40 transition-all select-none">
                        <td className="py-3">
                          <div className="font-bold text-white text-base">{emp.nome}</div>
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold font-mono mt-1 text-indigo-400 bg-indigo-500/10 border border-indigo-500/15">
                            {emp.setor}
                          </div>
                        </td>
                        <td className="py-3 font-mono text-xs text-slate-300">
                          {emp.cpf}
                        </td>
                        <td className="py-3 font-mono text-xs text-slate-400">
                          {new Date(emp.dataAdmissao + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 text-center">
                          {isProbation ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded text-amber-400 bg-amber-500/10 border border-amber-500/15">
                              <ShieldAlert className="h-3 w-3" />
                              Experiência ({months}m)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded text-emerald-400 bg-emerald-505/10 border border-emerald-500/15">
                              <Award className="h-3 w-3" />
                              CLT Efetivo ({months}m)
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-1.5">
                            {/* Edit / Remove actions */}
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleStartEdit(emp)}
                                id={`btn-edit-${emp.id}`}
                                title={`Editar dados de ${emp.nome}`}
                                className="p-1 px-2 rounded text-xs font-mono font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-500 cursor-pointer inline-flex items-center gap-1"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                Editar
                              </button>
                              <button
                                onClick={() => handleRemoveEmployee(emp.id, emp.nome)}
                                id={`btn-del-${emp.id}`}
                                title={`Demitir / Remover ${emp.nome}`}
                                className="p-1 px-2 rounded text-xs font-mono font-bold text-rose-400 hover:text-rose-350 bg-rose-500/10 hover:bg-rose-505/15 border border-rose-500/20 hover:border-rose-500/40 cursor-pointer inline-flex items-center gap-1"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Excluir
                              </button>
                            </div>
                            
                            {/* Simulated rules shifts */}
                            <div className="flex gap-1 mt-1 sm:mt-0">
                              <button
                                onClick={() => handleShiftAdmissionDate(emp.id, 3)}
                                title="Fingir que completou mais 3 meses retroativos para testar disparos"
                                className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded text-slate-400 hover:text-indigo-400 bg-slate-950 border border-slate-800 hover:border-indigo-900 transition flex items-center gap-0.5 cursor-pointer"
                              >
                                <Zap className="h-3 w-3 text-indigo-400" />
                                +3M
                              </button>
                              <button
                                onClick={() => handleShiftAdmissionDate(emp.id, 12)}
                                title="Fingir que completou mais 1 ano retroativo para testar disparo de troca anual"
                                className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded text-slate-400 hover:text-indigo-400 bg-slate-950 border border-slate-800 hover:border-indigo-900 transition flex items-center gap-0.5 cursor-pointer"
                              >
                                <Zap className="h-3 w-3 text-indigo-400" />
                                +1A
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* COMPACT ACTIONS & FORMS COLUMN */}
        <div className="space-y-6">
          {/* Dynamic Registration Form (Create/Edit) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-md space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-300 font-mono flex items-center gap-2 uppercase tracking-wide">
                {editingId ? (
                  <>
                    <Edit3 className="h-4.5 w-4.5 text-amber-400" />
                    EDITAR COLABORADOR
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4.5 w-4.5 text-indigo-400" />
                    REGISTRAR NOVO COLABORADOR
                  </>
                )}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                {editingId 
                  ? 'Modifique os dados do colaborador selecionado e atualize a folha de registro.' 
                  : 'Insira um novo colaborador para receber uniformes temporais e auditorias.'}
              </p>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1.5 uppercase tracking-wide font-mono font-bold">Nome Completo</label>
                <input
                  type="text"
                  value={newNome}
                  onChange={(e) => setNewNome(e.target.value)}
                  placeholder="Carlos Alberto Souza"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 font-sans text-sm font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1.5 uppercase tracking-wide font-mono font-bold">CPF Funcional</label>
                  <input
                    type="text"
                    value={newCPF}
                    onChange={(e) => handleCPFChange(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono text-sm font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1.5 uppercase tracking-wide font-mono font-bold">Setor de Atuação</label>
                  <select
                    value={newSetor}
                    onChange={(e) => setNewSetor(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 text-sm font-sans"
                  >
                    {sectors.map((sec) => (
                      <option key={sec} value={sec} className="bg-slate-900 text-white">
                        {sec}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 uppercase tracking-wide flex items-center gap-1.5 font-mono font-bold">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Data de Admissão
                </label>
                <input
                  type="date"
                  value={newDataAdmissao}
                  onChange={(e) => setNewDataAdmissao(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 text-sm font-mono"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="w-1/3 bg-slate-800 hover:bg-slate-750 text-slate-300 font-sans font-bold py-2.5 rounded-lg border border-slate-700 transition cursor-pointer text-center text-xs"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  className={`font-sans font-bold py-2.5 rounded-lg transition shadow-md cursor-pointer text-center text-xs ${
                    editingId 
                      ? 'w-2/3 bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/10' 
                      : 'w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/10'
                  }`}
                >
                  {editingId ? 'Salvar Edição' : 'Concluir Admissão'}
                </button>
              </div>
            </form>
          </div>

          {/* DYNAMIC SECTORS MANAGER */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
            <button
              onClick={() => setShowSectorMgr(!showSectorMgr)}
              className="w-full flex items-center justify-between text-left focus:outline-none group cursor-pointer"
            >
              <h4 className="text-sm font-bold text-slate-300 font-mono flex items-center gap-2 uppercase tracking-wide">
                <FolderEdit className="h-4.5 w-4.5 text-indigo-400" />
                📁 Gerenciar Setores ({sectors.length})
              </h4>
              <span className="text-xs text-indigo-400 hover:text-indigo-300 font-bold font-mono">
                {showSectorMgr ? 'Recolher [-]' : 'Expandir [+]'}
              </span>
            </button>

            {showSectorMgr && (
              <div className="space-y-4 pt-2 border-t border-slate-850/60 font-mono text-xs">
                {/* Create sector */}
                <form onSubmit={handleAddSector} className="flex gap-2">
                  <input
                    type="text"
                    value={newSectorName}
                    onChange={(e) => setNewSectorName(e.target.value)}
                    placeholder="Adicionar novo setor (Ex: Compras)"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded p-1.5 text-white focus:outline-none focus:border-indigo-500 placeholder-slate-500 text-xs font-sans"
                    required
                  />
                  <button
                    type="submit"
                    className="p-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-bold rounded flex items-center gap-1 cursor-pointer hover:scale-[1.02] transition"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar
                  </button>
                </form>

                {/* SList */}
                <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
                  {sectors.map((sec) => {
                    const count = employees.filter((emp) => emp.setor === sec).length;
                    const isRenaming = renamingSector === sec;

                    return (
                      <div
                        key={sec}
                        className="bg-slate-950/40 border border-slate-800/40 hover:border-slate-805 rounded p-2 flex items-center justify-between gap-3 text-xs"
                      >
                        {isRenaming ? (
                          <div className="flex-1 flex gap-1 items-center">
                            <input
                              type="text"
                              value={renamedValue}
                              onChange={(e) => setRenamedValue(e.target.value)}
                              className="flex-1 bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-white focus:outline-none font-sans text-xs"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveRenameSector(sec)}
                              className="p-1 text-emerald-400 bg-emerald-500/10 rounded border border-emerald-500/20 hover:bg-emerald-500/20 cursor-pointer"
                              title="Salvar alteração do nome"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setRenamingSector(null)}
                              className="p-1 text-slate-400 bg-slate-800 rounded border border-slate-700 hover:bg-slate-700 cursor-pointer"
                              title="Cancelar alteração"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-100 font-sans text-sm">{sec}</span>
                              <span className="text-[10px] text-slate-500">{count} colaborador(es)</span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleStartRenameSector(sec)}
                                className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-850/80 cursor-pointer"
                                title={`Alterar nome do setor "${sec}"`}
                              >
                                <FolderEdit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteSector(sec)}
                                className="p-1 rounded text-slate-450 hover:text-rose-400 hover:bg-slate-850/80 cursor-pointer"
                                title={`Excluir setor "${sec}"`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Logs */}
          {logMsg && (
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs leading-relaxed font-mono">
              <span className="text-indigo-400 font-bold block mb-0.5">MÓDULO DE FICHAS CADASTRAIS LOG:</span>
              <p className="text-slate-350">{logMsg}</p>
            </div>
          )}
        </div>
      </div>

      {/* Custom Confirm Modal Overlay (Bypass browser dialogue sandboxes) */}
      {customConfirm && customConfirm.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" id="confirm-modal-overlay">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <ShieldAlert className="h-6 w-6 shrink-0" />
              <h3 className="text-lg font-bold text-white font-sans">{customConfirm.title}</h3>
            </div>
            
            <p className="text-sm text-slate-300 leading-relaxed font-sans">
              {customConfirm.message}
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCustomConfirm(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-350 text-xs font-semibold font-sans rounded-lg border border-slate-700 hover:border-slate-500 cursor-pointer transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeConfirmedAction}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold font-sans rounded-lg shadow-lg shadow-rose-600/10 cursor-pointer transition-all hover:scale-[1.02]"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal Overlay (Bypass browser dialogue sandboxes) */}
      {customAlert && customAlert.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" id="alert-modal-overlay">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-indigo-400">
              <ShieldAlert className="h-6 w-6 shrink-0" />
              <h3 className="text-lg font-bold text-white font-sans">{customAlert.title}</h3>
            </div>
            
            <p className="text-sm text-slate-300 leading-relaxed font-sans">
              {customAlert.message}
            </p>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setCustomAlert(null)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold font-sans rounded-lg shadow-lg shadow-indigo-600/10 cursor-pointer transition-all hover:scale-[1.02]"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demission Modal Overlay (Smart return-to-stock exclusion logic) */}
      {demissionModal && demissionModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" id="demission-modal-overlay">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 text-amber-500">
              <ShieldAlert className="h-6 w-6 shrink-0" />
              <h3 className="text-lg font-bold text-white font-sans">Confirmar Desligamento de Colaborador</h3>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed font-sans">
              Você está prestes a desligar o colaborador <span className="font-bold text-white text-base font-mono">{demissionModal.employeeName}</span> do sistema de controle.
              Por favor, defina abaixo o destino de retorno das peças de uniforme sob posse dele correspondentes aos fardamentos entregues.
            </p>

            <div className="space-y-3">
              <label className="block text-[11px] font-mono font-bold text-slate-500 uppercase tracking-widest border-b border-slate-850 pb-1">
                Uniforme em Posse Ativo ({demissionModal.possessions.length})
              </label>

              {demissionModal.possessions.length === 0 ? (
                <div className="p-4 rounded-lg bg-slate-955/50 border border-slate-800 text-center text-xs font-mono text-slate-500 italic">
                  Nenhuma peça de uniforme em posse cadastrada. O colaborador será inativado livre de fardamentos.
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {demissionModal.possessions.map((p, index) => (
                    <div key={p.deliveryId} className="p-3 bg-slate-950/40 rounded-xl border border-slate-850 space-y-2">
                      <div className="flex justify-between items-start text-xs font-mono">
                        <div>
                          <span className="font-bold text-indigo-400 text-sm block">
                            {p.itemType} {p.quantidade && p.quantidade > 1 ? `(${p.quantidade}x)` : ''}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5 block">
                            Grade: {p.genero} • Tamanho {p.tamanho} • Original {p.condicao}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 bg-slate-900 border border-slate-850 px-2 py-0.5 rounded-full">
                          Entregue em: {new Date(p.dataEntrega + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      <div className="flex bg-slate-950 rounded-lg border border-slate-850 p-0.5 mt-2 overflow-hidden shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const newPos = [...demissionModal.possessions];
                            newPos[index] = { ...newPos[index], selectedDecision: 'Usado' };
                            setDemissionModal({ ...demissionModal, possessions: newPos });
                          }}
                          className={`flex-1 text-center py-1.5 px-2 rounded-md text-[10px] font-sans font-medium transition cursor-pointer ${
                            p.selectedDecision === 'Usado'
                              ? 'bg-slate-850 text-indigo-400 border border-slate-800/80 font-bold shadow-sm'
                              : 'bg-transparent text-slate-400 border border-transparent hover:text-slate-200'
                          }`}
                        >
                          Devolver Usada
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newPos = [...demissionModal.possessions];
                            newPos[index] = { ...newPos[index], selectedDecision: 'Novo' };
                            setDemissionModal({ ...demissionModal, possessions: newPos });
                          }}
                          className={`flex-1 text-center py-1.5 px-2 rounded-md text-[10px] font-sans font-medium transition cursor-pointer ${
                            p.selectedDecision === 'Novo'
                              ? 'bg-slate-850 text-teal-400 border border-slate-800/80 font-bold shadow-sm'
                              : 'bg-transparent text-slate-400 border border-transparent hover:text-slate-200'
                          }`}
                        >
                          Devolver Nova
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newPos = [...demissionModal.possessions];
                            newPos[index] = { ...newPos[index], selectedDecision: 'Descarte' };
                            setDemissionModal({ ...demissionModal, possessions: newPos });
                          }}
                          className={`flex-1 text-center py-1.5 px-2 rounded-md text-[10px] font-sans font-medium transition cursor-pointer ${
                            p.selectedDecision === 'Descarte'
                              ? 'bg-rose-950/40 text-rose-400 border border-rose-900/40 font-bold shadow-sm'
                              : 'bg-transparent text-slate-300 border border-transparent hover:text-slate-200'
                          }`}
                        >
                          Descarte / Perda
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-855">
              <button
                type="button"
                onClick={() => setDemissionModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-755 text-slate-350 text-xs font-semibold font-sans rounded-lg border border-slate-700 hover:border-slate-500 cursor-pointer transition-all"
              >
                Voltar e Cancelar
              </button>
              <button
                type="button"
                onClick={executeEmployeeDismissal}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold font-sans rounded-lg shadow-lg shadow-amber-600/10 cursor-pointer transition-all hover:scale-[1.02]"
              >
                Confirmar Desligamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
