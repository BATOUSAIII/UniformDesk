import React from 'react';
import { LayoutDashboard, Users, HelpCircle, Database, Terminal, ShieldAlert, Cpu, Download } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  alertsCount: { efectivacion: number; renewal: number };
}

export default function Sidebar({ activeTab, setActiveTab, alertsCount }: SidebarProps) {
  const totalAlerts = alertsCount.efectivacion + alertsCount.renewal;

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard & Estoque', icon: LayoutDashboard },
    { id: 'inventory_manager', name: 'Gestão de Inventário', icon: Database }, // reuse Database icon or similar standard
    { id: 'employees', name: 'Planejamento / Planilha', icon: Users },
    { id: 'delivery', name: 'Registrar Entrega', icon: Cpu },
    { id: 'alerts', name: 'Central de Alertas', icon: ShieldAlert, badge: totalAlerts },
    { id: 'backup_recovery', name: 'Backup & Restauração', icon: Download },
    { id: 'technical_dossier', name: 'Dossiê Técnico & SQL', icon: Database },
  ];

  return (
    <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
          <span className="text-white font-mono font-bold text-lg">UD</span>
        </div>
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">UniformDesk</h1>
          <p className="text-xs text-slate-400 font-mono">Arquiteto de Soluções v1.0</p>
        </div>
      </div>

      {/* Role Card */}
      <div className="mx-4 my-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
        <div className="flex items-center gap-3 text-xs text-emerald-400 font-mono mb-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          ENGENHARIA DESKTOP
        </div>
        <p className="text-xs text-slate-300">
          Proposta e protótipo interativo completo de controle de ativos corporativos sob transações ACID e SQLite.
        </p>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-4 py-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-955 text-center">
        <p className="text-[10px] text-slate-500 font-mono">
          © {new Date().getFullYear()} PROPOSTA TÉCNICA
        </p>
        <p className="text-[10px] text-slate-600 font-mono mt-0.5">
          DESKTOP ENGINE MOCK
        </p>
      </div>
    </aside>
  );
}
