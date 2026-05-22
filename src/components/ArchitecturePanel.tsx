import React, { useState } from 'react';
import { CODE_ARCHITECTURE, CODE_IMPLEMENTATION_CSHARP } from '../data';
import { HelpCircle, Copy, Cpu, Layers, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function ArchitecturePanel() {
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <HelpCircle className="h-7 w-7 text-indigo-400" />
          Proposta de Arquitetura & Implementação C#
        </h2>
        <p className="text-sm text-slate-400">
          Fundamentação teórica de engenharia com as melhores práticas de desenvolvimento corporativo multi-camadas (WPF / Dapper / ACID).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Architecture details and layer definitions */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md space-y-4">
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Layers className="h-4.5 w-4.5 text-indigo-400" />
              FLUXO DAS 3 CAMADAS (SOLID)
            </h3>

            <div className="space-y-3 text-xs leading-relaxed text-slate-350">
              <div>
                <span className="font-bold text-slate-200 block">1. Camada de UI (Apresentação)</span>
                <p className="text-slate-400 mt-0.5">
                  WPF (XAML) ou Windows Forms. Lida com interações, captura dados, e faz o bind de eventos de entrega. Evita completamente misturar conexões de banco com as janelas.
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-200 block">2. Camada de Aplicação e Negócio</span>
                <p className="text-slate-400 mt-0.5">
                  Contém os Serviços cruciais (ex: <code className="text-indigo-400">UniformDeliveryService</code>). Implementa o cálculo contracional dos 3 meses e garante a atomicidade em transações.
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-200 block">3. Camada de Infra (Persistência)</span>
                <p className="text-slate-400 mt-0.5">
                  Abstraída por Repositórios (Dapper / ADO.NET). Evita frameworks ORM pesados para maior performance de escrita e leitura, realizando apenas leituras com filtros explícitos (grades do estoque).
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md space-y-4">
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <ShieldAlert className="h-4.5 w-4.5 text-amber-400" />
              GARANTIA DE TRANSAÇÃO (ACID)
            </h3>

            <p className="text-xs leading-relaxed text-slate-300">
              O controle de uniformes exige rigor transacional. É inadmissível diminuir o estoque se o insert histórico falhar. O código utiliza o elemento nativo:
            </p>

            <ul className="text-xs space-y-1.5 text-slate-400 list-disc list-inside">
              <li><code className="text-amber-400 font-semibold font-mono">IsolationLevel.RepeatableRead</code> para evitar "Dirty Reads" de estoque por terminais concorrentes.</li>
              <li>Estrutura <code className="text-amber-400 font-semibold font-mono">try-catch-rollback</code> para estornar qualquer peça deduzida se houver pane operacional.</li>
              <li>Padrão ACID de transações com controle absoluto do pool de conexões.</li>
            </ul>
          </div>
        </div>

        {/* Code View Area */}
        <div className="lg:col-span-2 bg-slate-950 rounded-xl border border-slate-800 p-6 shadow-md flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-indigo-400 font-mono uppercase tracking-wide flex items-center gap-1.5">
                  <Cpu className="h-4.5 w-4.5" />
                  Código de Serviço Transacional (C# Backend)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Implementação completa da regra de experiência com validação atômica de banco.</p>
              </div>
              <button
                onClick={() => handleCopy(CODE_IMPLEMENTATION_CSHARP)}
                className="p-1 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded font-sans font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? 'Copiado!' : 'Copiar Código'}
              </button>
            </div>

            {/* Code highlighter box */}
            <div className="rounded-lg bg-slate-900 border border-slate-850 p-4 font-mono text-xs text-emerald-400 h-[480px] overflow-y-auto leading-relaxed select-all">
              <pre>{CODE_IMPLEMENTATION_CSHARP}</pre>
            </div>
          </div>
        </div>
      </div>

      {/* Interface Visualizer Layout (Requirement 5) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-md space-y-4">
        <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider border-b border-slate-800 pb-3">
          DESCRIÇÃO DA INTERFACE DO USUÁRIO (WPF DESKTOP)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed text-slate-350">
          <div className="space-y-2">
            <span className="font-bold text-indigo-400 block uppercase">1. Tela de Registro de Entrega Multipeças</span>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300">
              <li>
                <strong className="text-white">Seletor Autocompletar de Funcionários:</strong> Exibe Nome, Matrícula e automaticamente sinaliza em cor contrastante se o funcionário está em tempo de <span className="text-yellow-400 font-bold">Experiência</span> ou se é <span className="text-emerald-400 font-bold">Efetivo</span>.
              </li>
              <li>
                <strong className="text-white">Grid Tipo Checkbox Independentes:</strong> Uma linha para cada item (Camiseta, Calça, Bermuda) habilitada via checkbox, permitindo selecionar o tamanho adequado para cada categoria de peça individual na mesma transação.
              </li>
              <li>
                <strong className="text-white">Verificação de Saldo Inline:</strong> Ao trocar o tamanho/tipo de peça no grid, o sistema realiza uma consulta assíncrona ultra veloz da grade de estoque, sinalizando saldo disponível ou vermelho se estiver esgotado.
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <span className="font-bold text-indigo-400 block uppercase">2. Dashboard Consolidado de Alertas Preventivos</span>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300">
              <li>
                <strong className="text-white">Painel de Efetivação dos 3 meses:</strong> Exibe a listagem filtrada de colaboradores ativos cuja data de contratação ultrapassou 90 dias, e que ainda não receberam uniforme Novo. Fornece o botão de ação rápida "Entregar Uniforme Novo" com tamanhos sugeridos do perfil.
              </li>
              <li>
                <strong className="text-white">Painel de Troca Anual (365 Dias):</strong> Uma grade de auditoria temporal. Mostra a peça específica do colaborador que já possui tempo de vida ativo &gt; 365 dias, destacando a data da última entrega e a quantidade de dias restantes para renovação em colorway amarelo/vermelho.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
