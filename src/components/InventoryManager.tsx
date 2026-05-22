import React, { useState } from 'react';
import { StockItem, StockMovement, UniformType, UniformCondition, MovementType, UniformGender } from '../types';
import { 
  Package, 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  Minus, 
  Search, 
  ClipboardList, 
  Info, 
  SlidersHorizontal,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface InventoryManagerProps {
  stock: StockItem[];
  setStock: React.Dispatch<React.SetStateAction<StockItem[]>>;
  movements: StockMovement[];
  setMovements: React.Dispatch<React.SetStateAction<StockMovement[]>>;
  currentSimulatedDate: string;
  onLogMessage: (msg: string) => void;
}

export default function InventoryManager({
  stock,
  setStock,
  movements,
  setMovements,
  currentSimulatedDate,
  onLogMessage,
}: InventoryManagerProps) {
  // Input states
  const [selectedType, setSelectedType] = useState<UniformType>('Camiseta');
  const [selectedGender, setSelectedGender] = useState<UniformGender>('Masculino');
  const [selectedSize, setSelectedSize] = useState<string>('M');
  const [selectedCondition, setSelectedCondition] = useState<UniformCondition>('Novo');
  const [inputQty, setInputQty] = useState<number>(1);
  const [selectedMoveType, setSelectedMoveType] = useState<Exclude<MovementType, 'Saída por Entrega'>>('Entrada por Compra');
  const [reasonDescription, setReasonDescription] = useState<string>('');

  // Local feedback log
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters for the transaction history list
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string>('Todos');
  const [historyMoveTypeFilter, setHistoryMoveTypeFilter] = useState<string>('Todos');

  // Dynamic sizes helper based on business rules
  const getSizesForType = (itemType: UniformType): string[] => {
    if (itemType === 'Botina') {
      return ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44'];
    }
    return ['PP', 'P', 'M', 'G', 'GG', 'EG', 'EXG'];
  };

  const handleTypeChange = (type: UniformType) => {
    setSelectedType(type);
    const available = getSizesForType(type);
    // If current selected size is not in the new available list, auto-select first one
    if (!available.includes(selectedSize)) {
      setSelectedSize(available[0]);
    }
  };

  // Helper uuid generator
  const generateId = () => Math.random().toString(36).substring(2, 11);

  // Core Service Method doing the manual movement handling
  const executeStockAdjustment = (
    itemType: UniformType,
    tamanho: string,
    condicao: UniformCondition,
    genero: UniformGender,
    tipo: Exclude<MovementType, 'Saída por Entrega'>,
    qtd: number,
    descricao: string
  ) => {
    // 1. Validation
    if (qtd <= 0) {
      setFeedback({ type: 'error', message: 'A quantidade deve ser um valor inteiro maior que zero.' });
      return;
    }

    const cleanSize = tamanho.trim().toUpperCase();
    if (!cleanSize) {
      setFeedback({ type: 'error', message: 'O tamanho da peça precisa ser especificado.' });
      return;
    }

    // Critical rule block: Masculino PP cannot exist
    if (genero === 'Masculino' && cleanSize === 'PP') {
      setFeedback({ 
        type: 'error', 
        message: 'Regra de negócio violada: O tamanho PP não existe para fardamento de modelagem Masculina (exclusivo modelagem Feminina).' 
      });
      return;
    }

    const isExit = (tipo || '').startsWith('Saída') || (tipo === 'Ajuste de Inventário' && qtd < 0);
    const absoluteQty = Math.abs(qtd);

    let success = false;
    let computedNewQty = 0;

    // We do localized transactional manipulation in-place:
    setStock((currentStock) => {
      const matchedIndex = currentStock.findIndex(
        (item) => 
          item.itemType === itemType && 
          item.genero === genero &&
          item.tamanho.toUpperCase() === cleanSize && 
          item.condicao === condicao
      );

      // Clone original state
      const updatedStock = [...currentStock];

      if (matchedIndex > -1) {
        const currentQty = updatedStock[matchedIndex].quantidade;
        
        if (isExit && currentQty < absoluteQty) {
          // Prevention of negative stock (referencing constraints CHK_quantidade_positivo)
          setFeedback({ 
            type: 'error', 
            message: `Saldo insuficiente para a saída executada. Qtd disponível: ${currentQty} peças.` 
          });
          return currentStock; // Stop transaction
        }

        const newQtyValue = isExit ? currentQty - absoluteQty : currentQty + absoluteQty;
        computedNewQty = newQtyValue;

        updatedStock[matchedIndex] = {
          ...updatedStock[matchedIndex],
          quantidade: newQtyValue
        };
        success = true;
      } else {
        // Variation does not exist in stock table
        if (isExit) {
          setFeedback({ 
            type: 'error', 
            message: `Impossível realizar saída preventiva. Variação selecionada não possui registro de saldo disponível (0 peças).` 
          });
          return currentStock; // Stop transaction
        }

        // Positive movement creating a new row
        const newStockItem: StockItem = {
          id: `s-${generateId()}`,
          itemType,
          tamanho: cleanSize,
          condicao,
          genero,
          quantidade: absoluteQty
        };
        
        computedNewQty = absoluteQty;
        updatedStock.push(newStockItem);
        success = true;
      }

      return updatedStock;
    });

    if (success) {
      // Create movement transaction tracking record
      const actualQtyLog = isExit ? -absoluteQty : absoluteQty;
      const cleanDesc = descricao.trim() || `${tipo} avulso de fardamento fábrica.`;

      const newLogRecord: StockMovement = {
        id: `move-${generateId()}`,
        itemType,
        tamanho: cleanSize,
        condicao,
        genero,
        tipoMovimentacao: tipo,
        quantidade: actualQtyLog,
        motivoDescricao: cleanDesc,
        dataMovimentacao: currentSimulatedDate
      };

      setMovements((prev) => [newLogRecord, ...prev]);
      
      const successMessage = `Movimentação salva: ${actualQtyLog > 0 ? '+' : ''}${actualQtyLog} ${itemType} ${genero} (${cleanSize} - ${condicao}) | Motivo: ${tipo}`;
      setFeedback({ type: 'success', message: successMessage });
      onLogMessage(`Sucesso SQL: UPDATE estoque_grade SET quantidade = ${computedNewQty} WHERE tipo = '${itemType}' AND genero = '${genero}' AND tamanho = '${cleanSize}'...`);

      // Reset fields
      setInputQty(1);
      setReasonDescription('');
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    executeStockAdjustment(
      selectedType,
      selectedSize,
      selectedCondition,
      selectedGender,
      selectedMoveType,
      inputQty,
      reasonDescription
    );
  };

  // Pre-configured templates to expedite demo clicks
  const triggerQuickMovement = (
    type: UniformType, 
    size: string, 
    cond: UniformCondition, 
    gen: UniformGender,
    mType: Exclude<MovementType, 'Saída por Entrega'>, 
    qty: number, 
    desc: string
  ) => {
    setFeedback(null);
    setSelectedType(type);
    setSelectedGender(gen);
    setSelectedSize(size);
    setSelectedCondition(cond);
    setSelectedMoveType(mType);
    setInputQty(Math.abs(qty));
    setReasonDescription(desc);
  };

  // Filter movements
  const filteredMovements = movements.filter((move) => {
    if (!move) return false;
    const query = (filterQuery || '').toLowerCase();
    const matchesQuery = 
      (move.motivoDescricao || '').toLowerCase().includes(query) ||
      (move.tamanho || '').toLowerCase().includes(query) ||
      (move.itemType || '').toLowerCase().includes(query);
    
    const matchesType = historyTypeFilter === 'Todos' || move.itemType === historyTypeFilter;
    const matchesMoveType = historyMoveTypeFilter === 'Todos' || move.tipoMovimentacao === historyMoveTypeFilter;

    return matchesQuery && matchesType && matchesMoveType;
  });

  return (
    <div className="space-y-6">
      
      {/* Page Title Intro */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-500/10 rounded-lg border border-teal-500/15 text-teal-400 shrink-0">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white font-sans">
              Gestão de Inventário & Ajustes Manuais
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Controle absoluto de estoque atacadista, devoluções, descartes, compras e trilha de auditoria
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-350 leading-relaxed font-sans max-w-4xl">
          Esta ferramenta gerencia de forma detalhada o saldo físico de uniformes, permitindo alimentar o almoxarifado 
          com novos fardamentos oriundos do fornecedor ou recolher fardas antigas recolocadas como Usadas no almoxarifado. 
          Todas as alterações geram uma entrada sequencial com estampa do simulador do cronômetro para auditoria futura de contabilidade.
        </p>
      </div>

      {/* Main Form Grid and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Step 1 Form Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-md h-fit space-y-5 lg:col-span-2">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
              <span>🛠️</span> AJUSTAR SALDO INDIVIDUAL
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              Unique constraint
            </span>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4 text-xs font-mono">
            {/* Uniform Type */}
            <div>
              <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">Item do Uniforme</label>
              <select
                value={selectedType}
                onChange={(e) => handleTypeChange(e.target.value as UniformType)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="Camiseta">Camiseta</option>
                <option value="Bermuda">Bermuda</option>
                <option value="Calça">Calça</option>
                <option value="Camiseta Polo">Camiseta Polo</option>
                <option value="Botina">Botina</option>
              </select>
            </div>

            {/* Gender model Selection */}
            <div>
              <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">Gênero / Modelagem</label>
              <select
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value as UniformGender)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
              </select>
            </div>

            {/* Sizes & Conditions */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">Tamanho exato</label>
                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  {getSizesForType(selectedType).map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">Condição</label>
                <select
                  value={selectedCondition}
                  onChange={(e) => setSelectedCondition(e.target.value as UniformCondition)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Novo">Novo</option>
                  <option value="Usado">Usado</option>
                </select>
              </div>
            </div>

            {/* Movement Reason and Absolute Quantity */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">Motivo / Tipo</label>
                <select
                  value={selectedMoveType}
                  onChange={(e) => setSelectedMoveType(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 text-[11px]"
                >
                  <option value="Entrada por Compra">Compra (Entrada)</option>
                  <option value="Entrada por Devolução">Devolução (Entrada)</option>
                  <option value="Saída por Descarte">Descarte (Saída)</option>
                  <option value="Ajuste de Inventário">Ajuste de Saldo</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">Qtd Movimentada</label>
                <input
                  type="number"
                  value={inputQty}
                  onChange={(e) => setInputQty(Number(e.target.value))}
                  min="1"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 font-bold"
                  required
                />
              </div>
            </div>

            {/* Description reason detail */}
            <div>
              <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">Detalhe / Descrição do Motivo</label>
              <textarea
                value={reasonDescription}
                onChange={(e) => setReasonDescription(e.target.value)}
                placeholder="Ex Nome fornecedor, num da NF, devolução do colaborador x por tamanho inadequado..."
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 font-sans text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-sans font-bold py-2.5 rounded-lg transition shadow-md shadow-teal-600/20 cursor-pointer text-xs"
            >
              Registrar Movimentação
            </button>
          </form>

          {/* Local Feedbacks warnings */}
          {feedback && (
            <div className={`p-3.5 border rounded-lg text-xs leading-relaxed ${
              feedback.type === 'success' 
                ? 'bg-emerald-950/10 text-emerald-400 border-emerald-500/15'
                : 'bg-rose-950/10 text-rose-400 border-rose-500/15'
            }`}>
              <span className="font-bold uppercase tracking-wider block mb-0.5">
                {feedback.type === 'success' ? '🚨 SUCESSO DE TRANSAÇÃO' : '⚠️ FALHA OPERACIONAL'}
              </span>
              {feedback.message}
            </div>
          )}
        </div>

        {/* Third Column: Fast summary counts stats */}
        <div className="space-y-4">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-3 font-sans">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              AUDITORIA DO ALMOXARIFADO
            </h4>
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono">Total de Movimentações Registradas</span>
                <span className="font-bold text-white font-mono">{movements.length} transações</span>
              </div>
              
              <div className="flex justify-between items-center text-xs border-t border-slate-850 pt-2.5">
                <span className="text-slate-400 font-mono">Compras / Abastecimentos</span>
                <span className="font-bold text-teal-400 font-mono">
                  {movements.filter(m => m.tipoMovimentacao === 'Entrada por Compra').reduce((acc, current) => acc + current.quantidade, 0)} un
                </span>
              </div>

              <div className="flex justify-between items-center text-xs border-t border-slate-850 pt-2.5">
                <span className="text-slate-400 font-mono">Retornos / Devoluções</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {movements.filter(m => m.tipoMovimentacao === 'Entrada por Devolução').reduce((acc, current) => acc + current.quantidade, 0)} un
                </span>
              </div>

              <div className="flex justify-between items-center text-xs border-t border-slate-850 pt-2.5">
                <span className="text-slate-400 font-mono">Entregas aos Colaboradores</span>
                <span className="font-bold text-indigo-400 font-mono">
                  {Math.abs(movements.filter(m => m.tipoMovimentacao === 'Saída por Entrega').reduce((acc, current) => acc + current.quantidade, 0))} un
                </span>
              </div>

              <div className="flex justify-between items-center text-xs border-t border-slate-850 pt-2.5">
                <span className="text-slate-400 font-mono">Descartes / Sucatas</span>
                <span className="font-bold text-rose-400 font-mono">
                  {Math.abs(movements.filter(m => m.tipoMovimentacao === 'Saída por Descarte').reduce((acc, current) => acc + current.quantidade, 0))} un
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-teal-950/25 border border-teal-850/50 rounded-xl text-teal-300 text-xs font-sans leading-relaxed flex items-start gap-2.5">
            <span className="text-teal-400">📜</span>
            <span>
              <strong>Garantia de Rastreabilidade:</strong> Não é permitido alterar ou apagar registros salvos de movimentações históricas. Para corrigir valores informados indevidamente, realize um contra-registro explicitando no campo de descrição a correção correspondente.
            </span>
          </div>
        </div>

      </div>

      {/* Auditing Movement History Ledger */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-md space-y-4">
        
        {/* Ledger Header Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-teal-400" />
            <h3 className="text-sm font-bold text-slate-300 font-mono uppercase tracking-wider">
              TRILHA DE AUDITORIA: HISTÓRICO DE AJUSTES
            </h3>
          </div>

          {/* Filters controls row */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input filter */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filtrar descrição..."
                className="bg-slate-800 border border-slate-700 hover:border-slate-600 focus:border-indigo-500 rounded-lg pl-8 pr-3.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none w-48 font-sans"
              />
            </div>

            {/* Item Type filter */}
            <select
              value={historyTypeFilter}
              onChange={(e) => setHistoryTypeFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 font-mono focus:outline-none"
            >
              <option value="Todos">Todas as Peças</option>
              <option value="Camiseta">Camiseta</option>
              <option value="Bermuda">Bermuda</option>
              <option value="Calça">Calça</option>
              <option value="Camiseta Polo">Camiseta Polo</option>
              <option value="Botina">Botina</option>
            </select>

            {/* Movement reason filter */}
            <select
              value={historyMoveTypeFilter}
              onChange={(e) => setHistoryMoveTypeFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 font-mono focus:outline-none"
            >
              <option value="Todos">Todos os Motivos</option>
              <option value="Entrada por Compra">Entrada por Compra</option>
              <option value="Entrada por Devolução">Entrada por Devolução</option>
              <option value="Saída por Descarte">Saída por Descarte</option>
              <option value="Saída por Entrega">Saída por Entrega</option>
              <option value="Ajuste de Inventário">Ajuste de Inventário</option>
            </select>
          </div>
        </div>

        {/* Ledger table */}
        <div className="overflow-x-auto">
          {filteredMovements.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-slate-500">
              Nenhuma movimentação localizada no histórico para os filtros selecionados.
            </div>
          ) : (
            <table className="w-full text-left font-sans text-xs">
              <thead>
                <tr className="border-b border-slate-800 font-mono text-slate-500 uppercase tracking-widest text-[10px] pb-2">
                  <th className="py-3">Data</th>
                  <th className="py-3">Peça / Grade</th>
                  <th className="py-3">Motivo da Movimentação</th>
                  <th className="py-3">Quantidade de Peças</th>
                  <th className="py-3">Notas de Detalhamento / Lançamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-300">
                {filteredMovements.map((move) => {
                  const isPositive = move.quantidade > 0;
                  
                  return (
                    <tr key={move.id} className="hover:bg-slate-800/10 transition">
                      <td className="py-3 font-mono font-medium text-slate-400">
                        {move.dataMovimentacao}
                      </td>
                      <td className="py-3 font-mono">
                        <span className="font-bold text-white">{move.itemType}</span>{' '}
                        <span className="text-slate-400 font-sans">({move.genero === 'Masculino' ? 'Masc' : 'Fem'} / {move.tamanho} - {move.condicao})</span>
                      </td>
                      <td className="py-3 font-sans">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                          (move.tipoMovimentacao || '').startsWith('Entrada')
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                            : move.tipoMovimentacao === 'Saída por Entrega'
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/15'
                            : move.tipoMovimentacao === 'Saída por Descarte'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/15'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {(move.tipoMovimentacao || '').startsWith('Entrada') ? (
                            <ArrowUpRight className="h-3 w-3 shrink-0" />
                          ) : (
                            <ArrowDownLeft className="h-3 w-3 shrink-0" />
                          )}
                          {move.tipoMovimentacao || 'Movimento'}
                        </span>
                      </td>
                      <td className="py-3 font-mono">
                        <span className={`font-bold text-sm ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isPositive ? `+${move.quantidade}` : move.quantidade}
                        </span>
                      </td>
                      <td className="py-3 font-sans text-slate-400 max-w-sm font-normal">
                        {move.motivoDescricao}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>

    </div>
  );
}
