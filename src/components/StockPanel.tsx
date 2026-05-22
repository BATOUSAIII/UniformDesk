import React, { useState } from 'react';
import { StockItem, UniformType, UniformCondition, UniformGender } from '../types';
import { Package, Plus, RotateCcw, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';

interface StockPanelProps {
  stock: StockItem[];
  setStock: React.Dispatch<React.SetStateAction<StockItem[]>>;
  onReset: () => void;
}

export default function StockPanel({ stock, setStock, onReset }: StockPanelProps) {
  const [filterType, setFilterType] = useState<string>('Todos');
  const [filterCondition, setFilterCondition] = useState<string>('Todos');
  const [filterGender, setFilterGender] = useState<string>('Todos');

  // Fields for adding stock
  const [newType, setNewType] = useState<UniformType>('Camiseta');
  const [newGender, setNewGender] = useState<UniformGender>('Masculino');
  const [newSize, setNewSize] = useState<string>('M');
  const [newCondition, setNewCondition] = useState<UniformCondition>('Novo');
  const [newQty, setNewQty] = useState<number>(10);
  const [logMsg, setLogMsg] = useState<string>('');

  const getSizesForType = (itemType: UniformType): string[] => {
    if (itemType === 'Botina') {
      return ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44'];
    }
    return ['PP', 'P', 'M', 'G', 'GG', 'EG', 'EXG'];
  };

  const handleTypeChange = (type: UniformType) => {
    setNewType(type);
    const available = getSizesForType(type);
    if (!available.includes(newSize)) {
      setNewSize(available[0]);
    }
  };

  const filteredStock = stock.filter((item) => {
    const matchesType = filterType === 'Todos' || item.itemType === filterType;
    const matchesCond = filterCondition === 'Todos' || item.condicao === filterCondition;
    const matchesGender = filterGender === 'Todos' || item.genero === filterGender;
    return matchesType && matchesCond && matchesGender;
  });

  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (newQty <= 0) {
      setLogMsg('A quantidade deve ser maior que zero.');
      return;
    }

    const cleanSize = newSize.trim().toUpperCase();

    // Critical constraint check
    if (newGender === 'Masculino' && cleanSize === 'PP') {
      setLogMsg('Regra Bloqueada: O tamanho PP não existe para fardas de modelagem Masculina (exclusivo modelagem Feminina).');
      return;
    }

    setStock((prev) => {
      // Find matching item
      const idx = prev.findIndex(
        (i) =>
          i.itemType === newType &&
          i.genero === newGender &&
          i.tamanho.toUpperCase() === cleanSize &&
          i.condicao === newCondition
      );

      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          quantidade: updated[idx].quantidade + newQty,
        };
        setLogMsg(`Estoque atualizado: +${newQty} ${newType} (${newGender === 'Masculino' ? 'Masc' : 'Fem'} / ${cleanSize} - ${newCondition})`);
        return updated;
      } else {
        const newItem: StockItem = {
          id: `s-${Date.now()}`,
          itemType: newType,
          genero: newGender,
          tamanho: cleanSize,
          condicao: newCondition,
          quantidade: newQty,
        };
        setLogMsg(`Novo item adicionado ao estoque: ${newQty}x ${newType} (${newGender === 'Masculino' ? 'Masc' : 'Fem'} / ${cleanSize} - ${newCondition})`);
        return [...prev, newItem];
      }
    });

    // Reset qty
    setNewQty(10);
  };

  const totalNew = stock
    .filter((i) => i.condicao === 'Novo')
    .reduce((total, i) => total + i.quantidade, 0);
  const totalUsed = stock
    .filter((i) => i.condicao === 'Usado')
    .reduce((total, i) => total + i.quantidade, 0);
  const outOfStockCount = stock.filter((i) => i.quantidade === 0).length;

  return (
    <div className="space-y-6">
      {/* Header & Reset */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Package className="h-7 w-7 text-indigo-400" />
            Controle Físico de Estoque por Grade
          </h2>
          <p className="text-sm text-slate-400">
            Quantidade segregada estritamente por peça, tamanho corporativo e condição de conservação.
          </p>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-medium rounded-lg text-slate-400 border border-slate-700 hover:text-white hover:bg-slate-800 transition"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reiniciar Banco
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs text-slate-400 font-mono">PECAS NOVAS</span>
            <h3 className="text-3xl font-extrabold text-indigo-400 mt-1">{totalNew}</h3>
            <p className="text-xs text-slate-500 mt-1">Prontas para efetivação</p>
          </div>
          <div className="h-12 w-12 rounded-lg bg-indigo-600/15 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-indigo-400" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs text-slate-400 font-mono">PECAS USADAS</span>
            <h3 className="text-3xl font-extrabold text-amber-400 mt-1">{totalUsed}</h3>
            <p className="text-xs text-slate-500 mt-1">Regra do período de experiência</p>
          </div>
          <div className="h-12 w-12 rounded-lg bg-amber-600/15 flex items-center justify-center">
            <RotateCcw className="h-6 w-6 text-amber-400" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs text-slate-400 font-mono">VARIAÇÕES ESGOTADAS</span>
            <h3 className="text-3xl font-extrabold text-rose-400 mt-1">{outOfStockCount}</h3>
            <p className="text-xs text-slate-500 mt-1">Requerem reposição urgente</p>
          </div>
          <div className="h-12 w-12 rounded-lg bg-rose-600/15 flex items-center justify-center">
            <ShieldAlert className="h-6 w-6 text-rose-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Stock Inventory */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <h4 className="text-sm font-bold text-slate-300 font-mono">GRADE ATUAL DE MATERIAIS</h4>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-300 font-mono focus:outline-none"
              >
                <option value="Todos" className="bg-slate-900 text-white">Todas as Fardas</option>
                <option value="Camiseta" className="bg-slate-900 text-white">Camiseta</option>
                <option value="Bermuda" className="bg-slate-900 text-white">Bermuda</option>
                <option value="Calça" className="bg-slate-900 text-white">Calça</option>
                <option value="Camiseta Polo" className="bg-slate-900 text-white">Camiseta Polo</option>
                <option value="Botina" className="bg-slate-900 text-white">Botina</option>
              </select>

              <select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-300 font-mono focus:outline-none"
              >
                <option value="Todos" className="bg-slate-900 text-white">Gêneros (Todos)</option>
                <option value="Masculino" className="bg-slate-900 text-white">Masculino</option>
                <option value="Feminino" className="bg-slate-900 text-white">Feminino</option>
              </select>

              <select
                value={filterCondition}
                onChange={(e) => setFilterCondition(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-300 font-mono focus:outline-none"
              >
                <option value="Todos" className="bg-slate-900 text-white">Condição (Qualquer)</option>
                <option value="Novo" className="bg-slate-900 text-white">Novo</option>
                <option value="Usado" className="bg-slate-900 text-white">Usado</option>
              </select>
            </div>
          </div>

          {/* Grid Layout of Items */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-800 font-mono text-slate-500 text-xs">
                  <th className="py-2">Item / Uniforme</th>
                  <th className="py-2">Gênero</th>
                  <th className="py-2">Tamanho</th>
                  <th className="py-2">Condição</th>
                  <th className="py-2 text-right">Quantidade</th>
                  <th className="py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredStock.map((item) => {
                  const isOutOfStock = item.quantidade === 0;
                  const isLowStock = item.quantidade > 0 && item.quantidade <= 3;
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-800/20 transition-all ${
                        isOutOfStock ? 'opacity-65 text-slate-400' : ''
                      }`}
                    >
                      <td className="py-3 font-medium text-white flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            item.itemType === 'Camiseta'
                              ? 'bg-indigo-400'
                              : item.itemType === 'Bermuda'
                              ? 'bg-amber-400'
                              : item.itemType === 'Calça'
                              ? 'bg-teal-400'
                              : item.itemType === 'Camiseta Polo'
                              ? 'bg-emerald-400'
                              : 'bg-indigo-200'
                          }`}
                        />
                        {item.itemType}
                      </td>
                      <td className="py-3 font-mono text-slate-300">{item.genero === 'Masculino' ? 'Masculino' : 'Feminino'}</td>
                      <td className="py-3 font-mono font-medium">{item.tamanho}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                            item.condicao === 'Novo'
                              ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {item.condicao}
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono font-bold">
                        {item.quantidade}
                      </td>
                      <td className="py-3 text-right">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-mono px-2 py-0.5 rounded text-red-400 bg-red-500/15 border border-red-500/20">
                            Esgotado
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-mono px-2 py-0.5 rounded text-amber-500 bg-amber-500/15 border border-amber-500/20">
                            Crítico ({item.quantidade})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-mono px-2 py-0.5 rounded text-emerald-400 bg-emerald-500/15 border border-emerald-500/20">
                            Estável
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Form Quick Stock Input */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-md h-fit space-y-4">
          <div>
            <h4 className="text-sm font-bold text-slate-300 font-mono flex items-center gap-2">
              <Plus className="h-4 w-4 text-indigo-400" />
              REPOSIÇÃO EXPRESSA
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Simule a reposição física ou atacadista de uniformes no estoque.
            </p>
          </div>

          <form onSubmit={handleAddStock} className="space-y-4 text-xs font-mono">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">Tipo de Peça</label>
                <select
                  value={newType}
                  onChange={(e) => handleTypeChange(e.target.value as UniformType)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Camiseta" className="bg-slate-900 text-white">Camiseta</option>
                  <option value="Bermuda" className="bg-slate-900 text-white">Bermuda</option>
                  <option value="Calça" className="bg-slate-900 text-white">Calça</option>
                  <option value="Camiseta Polo" className="bg-slate-900 text-white">Camiseta Polo</option>
                  <option value="Botina" className="bg-slate-900 text-white">Botina</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">Modelagem Gênero</label>
                <select
                  value={newGender}
                  onChange={(e) => {
                    const nextGender = e.target.value as UniformGender;
                    setNewGender(nextGender);
                    if (nextGender === 'Masculino' && newSize === 'PP') {
                      setNewSize('P');
                    }
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Masculino" className="bg-slate-900 text-white">Masculino</option>
                  <option value="Feminino" className="bg-slate-900 text-white">Feminino</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">Tamanho</label>
                <select
                  value={newSize}
                  onChange={(e) => setNewSize(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  {getSizesForType(newType)
                    .filter(s => !(newGender === 'Masculino' && s === 'PP'))
                    .map((sz) => (
                      <option key={sz} value={sz} className="bg-slate-900 text-white">{sz}</option>
                    ))
                  }
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">Condição</label>
                <select
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value as UniformCondition)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Novo" className="bg-slate-900 text-white">Novo</option>
                  <option value="Usado" className="bg-slate-900 text-white">Usado</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">Quantidade a Entrada</label>
              <input
                type="number"
                value={newQty}
                onChange={(e) => setNewQty(Number(e.target.value))}
                min="1"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 font-sans font-bold"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-bold py-2.5 rounded-lg transition shadow-md shadow-indigo-600/20 cursor-pointer text-sm"
            >
              Registrar Entrada
            </button>
          </form>

          {logMsg && (
            <div className="p-3 bg-slate-800 border border-slate-700/50 rounded-lg text-xs leading-relaxed text-slate-300">
              <span className="text-indigo-400 font-bold block mb-0.5">SISTEMA LOG:</span>
              {logMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
