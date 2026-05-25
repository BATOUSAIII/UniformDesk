import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import StockPanel from './components/StockPanel';
import InventoryManager from './components/InventoryManager';
import EmployeePanel from './components/EmployeePanel';
import DeliveryForm from './components/DeliveryForm';
import AlertsPanel from './components/AlertsPanel';
import EmployeeSpreadsheet from './components/EmployeeSpreadsheet';
import TechnicalDossier from './components/TechnicalDossier';
import BackupPanel from './components/BackupPanel';

import { INITIAL_STOCK, INITIAL_EMPLOYEES, INITIAL_DELIVERIES } from './data';
import { StockItem, Employee, Delivery, StockMovement } from './types';
import { Calendar, AlertTriangle, ShieldAlert, BadgeInfo, Play, Cpu, RotateCcw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [employeesSubTab, setEmployeesSubTab] = useState<'spreadsheet' | 'manage'>('spreadsheet');
  const [preselectedEmpId, setPreselectedEmpId] = useState<string>('');

  // Simulated DB State
  const [stock, setStock] = useState<StockItem[]>(() => {
    const saved = localStorage.getItem('db_stock');
    return saved ? JSON.parse(saved) : INITIAL_STOCK;
  });
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('db_employees');
    return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
  });
  const [deliveries, setDeliveries] = useState<Delivery[]>(() => {
    const saved = localStorage.getItem('db_deliveries');
    return saved ? JSON.parse(saved) : INITIAL_DELIVERIES;
  });
  const [sectors, setSectors] = useState<string[]>(() => {
    const saved = localStorage.getItem('db_sectors');
    return saved ? JSON.parse(saved) : ['Logística', 'Produção', 'Manutenção', 'Expedição', 'Segurança', 'Administrativo'];
  });
  const [movements, setMovements] = useState<StockMovement[]>(() => {
    const saved = localStorage.getItem('db_stock_movements');
    // Pre-populate with dummy movement log from initial deliveries history to make audit trail intuitive on load
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((m: any) => ({
            ...m,
            tipoMovimentacao: m.tipoMovimentacao || m.tipo || 'Ajuste de Inventário',
            motivoDescricao: m.motivoDescricao || m.descricao || 'Lançamento manual de fardamento.',
            dataMovimentacao: m.dataMovimentacao || m.dataRegistro || m.data || '2026-05-22'
          }));
        }
      } catch (e) {
        console.error("Error parsing/loading movements", e);
      }
    }
    
    const initialMoves: StockMovement[] = INITIAL_DELIVERIES.map((d, index) => ({
      id: `init-move-${index}`,
      itemType: d.itemType,
      tamanho: d.tamanho,
      condicao: d.condicao,
      genero: d.genero,
      tipoMovimentacao: 'Saída por Entrega',
      quantidade: -1,
      motivoDescricao: `Fardamento automático do colaborador ID: ${d.funcionarioId}`,
      dataMovimentacao: d.dataEntrega
    }));
    return initialMoves;
  });

  // Simulated Time Machine Date
  const [currentSimulatedDate, setCurrentSimulatedDate] = useState<string>(() => {
    return localStorage.getItem('db_simulated_date') || '2026-05-22';
  });
  const [globalLog, setGlobalLog] = useState<string>('Banco de dados SQLite inicializado na memória local.');

  // Initialize DB Values
  const handleResetData = () => {
    const initialMoves = INITIAL_DELIVERIES.map((d, index) => ({
      id: `init-move-${index}`,
      itemType: d.itemType,
      tamanho: d.tamanho,
      condicao: d.condicao,
      genero: d.genero,
      tipoMovimentacao: 'Saída por Entrega' as const,
      quantidade: -1,
      motivoDescricao: `Fardamento automático do colaborador ID: ${d.funcionarioId}`,
      dataMovimentacao: d.dataEntrega
    }));

    setStock(JSON.parse(JSON.stringify(INITIAL_STOCK)));
    setEmployees(JSON.parse(JSON.stringify(INITIAL_EMPLOYEES)));
    setDeliveries(JSON.parse(JSON.stringify(INITIAL_DELIVERIES)));
    setSectors(['Logística', 'Produção', 'Manutenção', 'Expedição', 'Segurança', 'Administrativo']);
    setMovements(initialMoves);
    setCurrentSimulatedDate('2026-05-22');

    localStorage.setItem('db_stock', JSON.stringify(INITIAL_STOCK));
    localStorage.setItem('db_employees', JSON.stringify(INITIAL_EMPLOYEES));
    localStorage.setItem('db_deliveries', JSON.stringify(INITIAL_DELIVERIES));
    localStorage.setItem('db_sectors', JSON.stringify(['Logística', 'Produção', 'Manutenção', 'Expedição', 'Segurança', 'Administrativo']));
    localStorage.setItem('db_stock_movements', JSON.stringify(initialMoves));
    localStorage.setItem('db_simulated_date', '2026-05-22');

    setGlobalLog('Estado do banco de dados restaurado aos padrões originais do escopo.');
  };

  useEffect(() => {
    localStorage.setItem('db_stock', JSON.stringify(stock));
  }, [stock]);

  useEffect(() => {
    localStorage.setItem('db_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('db_deliveries', JSON.stringify(deliveries));
  }, [deliveries]);

  useEffect(() => {
    localStorage.setItem('db_sectors', JSON.stringify(sectors));
  }, [sectors]);

  useEffect(() => {
    localStorage.setItem('db_stock_movements', JSON.stringify(movements));
  }, [movements]);

  useEffect(() => {
    localStorage.setItem('db_simulated_date', currentSimulatedDate);
  }, [currentSimulatedDate]);

  useEffect(() => {
    const initialized = localStorage.getItem('db_initialized_v4');
    if (!initialized) {
      handleResetData();
      localStorage.setItem('db_initialized_v4', 'true');
    }
  }, []);

  // Time Machine Simulation Handlers
  const handleFastForward = (days: number) => {
    const d = new Date(currentSimulatedDate);
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const newDate = `${yyyy}-${mm}-${dd}`;
    setCurrentSimulatedDate(newDate);
    setGlobalLog(`Máquina do tempo: Data sistêmica avançada em +${days} dias. Nova data ativa: ${dd}/${mm}/${yyyy}`);
  };

  // Dynamic calculations for alert badges
  const getAlertsCounts = () => {
    const today = new Date(currentSimulatedDate);

    // Alert A: Efetivacao (joined >= 90 days ago, no Novo deliveries)
    const probeAlerts = employees.filter((emp) => {
      const join = new Date(emp.dataAdmissao);
      const diffTime = today.getTime() - join.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const receivedNew = deliveries.some((d) => d.funcionarioId === emp.id && d.condicao === 'Novo');
      return diffDays >= 90 && !receivedNew;
    });

    // Alert B: Annual Renewal (Novo piece > 365 days ago, not replaced)
    let renewalCount = 0;
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
          const diffDays = Math.floor((today.getTime() - delivDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 365) {
            renewalCount++;
          }
        }
      });
    });

    return {
      efectivacion: probeAlerts.length,
      renewal: renewalCount,
    };
  };

  const alertCounts = getAlertsCounts();
  const rawFormattedDate = new Date(currentSimulatedDate + 'T00:00:00').toLocaleDateString('pt-BR');

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} alertsCount={alertCounts} />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Top Control Time Machine Bar */}
        <header className="bg-slate-900/60 border-b border-slate-800/80 px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-700/20 border border-indigo-500/30 flex items-center justify-center">
              <Calendar className="h-4.5 w-4.5 text-indigo-400" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-mono block uppercase tracking-wider">DATA DO SISTEMA (SIMULADA)</span>
              <span className="text-sm font-bold text-white font-mono">{rawFormattedDate}</span>
            </div>
          </div>

          {/* Time simulation actions */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-mono hidden md:inline">Testar Regras de Tempo:</span>
            <div className="flex gap-1">
              <button
                onClick={() => handleFastForward(90)}
                className="px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 hover:bg-slate-750 hover:border-slate-500 font-mono text-[10px] font-bold text-indigo-400 flex items-center gap-1.5 transition cursor-pointer"
                title="Avança o calendário em 3 meses"
              >
                +90 Dias (3 Meses)
              </button>
              <button
                onClick={() => handleFastForward(365)}
                className="px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 hover:bg-slate-750 hover:border-slate-500 font-mono text-[10px] font-bold text-indigo-400 flex items-center gap-1.5 transition cursor-pointer"
                title="Avança o calendário em 1 ano"
              >
                +365 Dias (1 Ano)
              </button>
              <button
                onClick={handleResetData}
                title="Reiniciar banco de dados"
                className="p-1.5 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-500/30 transition cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Global System Log Notice banner */}
        {globalLog && (
          <div className="bg-indigo-950/40 border-b border-indigo-850/50 px-8 py-2 flex items-center justify-between gap-4 text-xs font-mono text-indigo-350">
            <span className="flex items-center gap-2">
              <BadgeInfo className="h-4 w-4 text-indigo-400 shrink-0" />
              <span>
                <strong>LOG ATIVO:</strong> {globalLog}
              </span>
            </span>
            <button
              onClick={() => setGlobalLog('')}
              className="text-[10px] text-slate-500 hover:text-slate-300 font-bold"
            >
              dispensar
            </button>
          </div>
        )}

        {/* Core Screen Router */}
        <main className="flex-1 overflow-y-auto p-8 max-w-7xl w-full mx-auto space-y-8">
          {activeTab === 'dashboard' && (
            <StockPanel stock={stock} setStock={setStock} onReset={handleResetData} />
          )}

          {activeTab === 'inventory_manager' && (
            <InventoryManager
              stock={stock}
              setStock={setStock}
              movements={movements}
              setMovements={setMovements}
              currentSimulatedDate={currentSimulatedDate}
              onLogMessage={(msg) => setGlobalLog(msg)}
            />
          )}

          {activeTab === 'employees' && (
            <div className="space-y-6">
              {/* Inner Sub tabs for Employees */}
              <div className="flex flex-wrap gap-3 pb-3 border-b border-slate-850">
                <button
                  onClick={() => setEmployeesSubTab('spreadsheet')}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold font-mono tracking-wider transition-all duration-200 cursor-pointer shadow-sm border ${
                    employeesSubTab === 'spreadsheet'
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/25 scale-[1.02]'
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  📊 PLANILHA DE TAMANHOS & TROCAS
                </button>
                <button
                  onClick={() => setEmployeesSubTab('manage')}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold font-mono tracking-wider transition-all duration-200 cursor-pointer shadow-sm border ${
                    employeesSubTab === 'manage'
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/25 scale-[1.02]'
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  ⚙️ CADASTRAR COLABORADOR / AJUSTES
                </button>
              </div>

              {employeesSubTab === 'spreadsheet' ? (
                <EmployeeSpreadsheet
                  employees={employees}
                  deliveries={deliveries}
                  currentSimulatedDate={currentSimulatedDate}
                  onSelectEmployeeToDeliver={(empId) => {
                    setPreselectedEmpId(empId);
                    setActiveTab('delivery');
                    setGlobalLog(`Direcionado para Registrar Entrega para o funcionário selecionado.`);
                  }}
                />
              ) : (
                <EmployeePanel
                  employees={employees}
                  setEmployees={setEmployees}
                  currentSimulatedDate={currentSimulatedDate}
                  sectors={sectors}
                  setSectors={setSectors}
                  deliveries={deliveries}
                  setDeliveries={setDeliveries}
                  stock={stock}
                  setStock={setStock}
                  setMovements={setMovements}
                />
              )}
            </div>
          )}

          {activeTab === 'delivery' && (
            <DeliveryForm
              employees={employees}
              stock={stock}
              setStock={setStock}
              deliveries={deliveries}
              setDeliveries={setDeliveries}
              setMovements={setMovements}
              currentSimulatedDate={currentSimulatedDate}
              preselectedEmployeeId={preselectedEmpId}
              onSuccess={(msg) => {
                setGlobalLog(msg);
                // Clear preselected once recorded
                setPreselectedEmpId('');
              }}
            />
          )}

          {activeTab === 'alerts' && (
            <AlertsPanel
              employees={employees}
              deliveries={deliveries}
              stock={stock}
              setStock={setStock}
              setDeliveries={setDeliveries}
              currentSimulatedDate={currentSimulatedDate}
              onRefreshStats={() => setGlobalLog('Transação registrada. Alertas reavaliados.')}
            />
          )}

          {activeTab === 'backup_recovery' && (
            <BackupPanel
              employees={employees}
              setEmployees={setEmployees}
              deliveries={deliveries}
              setDeliveries={setDeliveries}
              sectors={sectors}
              setSectors={setSectors}
              currentSimulatedDate={currentSimulatedDate}
              onLogMessage={(msg) => setGlobalLog(msg)}
              stock={stock}
              setStock={setStock}
            />
          )}

          {activeTab === 'technical_dossier' && (
            <TechnicalDossier
              employees={employees}
              deliveries={deliveries}
              stock={stock}
              currentSimulatedDate={currentSimulatedDate}
            />
          )}
        </main>
      </div>
    </div>
  );
}
