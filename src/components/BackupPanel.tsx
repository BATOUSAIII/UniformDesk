import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Employee, Delivery, StockItem } from '../types';
import { 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle, 
  FileDown, 
  UploadCloud, 
  Users, 
  Clock, 
  ShieldCheck, 
  BookOpen
} from 'lucide-react';

interface BackupPanelProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  deliveries: Delivery[];
  setDeliveries: React.Dispatch<React.SetStateAction<Delivery[]>>;
  sectors: string[];
  setSectors: React.Dispatch<React.SetStateAction<string[]>>;
  currentSimulatedDate: string;
  onLogMessage: (msg: string) => void;
}

export default function BackupPanel({
  employees,
  setEmployees,
  deliveries,
  setDeliveries,
  sectors,
  setSectors,
  currentSimulatedDate,
  onLogMessage,
}: BackupPanelProps) {
  // Tabs for the backup panel
  const [activeSubTab, setActiveSubTab] = useState<'recovery' | 'base_import' | 'specs'>('recovery');

  // File uploading states
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<'base' | 'full'>('full');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Parse result / Dry-run Preview
  const [dryRunReport, setDryRunReport] = useState<{
    success: boolean;
    errorMsg?: string;
    totalRows: number;
    employeesToInsert: number;
    employeesToUpdate: number;
    deliveriesToInsert: number;
    deliveriesToSkip: number;
    foundSectorsToRegister: string[];
    parsedEmployees: any[];
    parsedDeliveries: any[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // CPF sanitizer helper
  const cleanCPF = (raw: string): string => {
    return raw.replace(/[^\d]/g, '');
  };

  // CPF formatter helper
  const formatCPF = (raw: string): string => {
    const cleaned = cleanCPF(raw);
    if (cleaned.length !== 11) return cleaned; // Fallback
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  // Standard excel Date parsing (can be serial serial number or string)
  const parseExcelDate = (val: any): string => {
    if (!val) return currentSimulatedDate;
    
    // If it is serial number (Excel date)
    if (typeof val === 'number') {
      const dateObj = XLSX.SSF.parse_date_code(val);
      const yyyy = dateObj.y;
      const mm = String(dateObj.m).padStart(2, '0');
      const dd = String(dateObj.d).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }

    const strVal = String(val).trim();
    
    // Matches DD/MM/YYYY
    const brMatch = strVal.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
    if (brMatch) {
      const dd = brMatch[1].padStart(2, '0');
      const mm = brMatch[2].padStart(2, '0');
      const yyyy = brMatch[3];
      return `${yyyy}-${mm}-${dd}`;
    }

    // Matches YYYY-MM-DD
    const isoMatch = strVal.match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})/);
    if (isoMatch) {
      const yyyy = isoMatch[1];
      const mm = isoMatch[2].padStart(2, '0');
      const dd = isoMatch[3].padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }

    return currentSimulatedDate; // fallback
  };

  // Helper UUID-like generator
  const generateUUID = () => {
    return Math.random().toString(36).substring(2, 11);
  };

  // 1. Export Consolidated Data
  const handleExportBackup = (formatType: 'xlsx' | 'csv') => {
    try {
      const exportRows: any[] = [];

      if (employees.length === 0) {
        // Empty backup schema just for placeholders
        exportRows.push({
          Nome: 'Exemplo de Colaborador',
          CPF: '000.111.222-33',
          'Data de Admissao': '2026-05-22',
          Setor: 'Logística',
          'Peca Entregue': 'Camiseta',
          Tamanho: 'G',
          Condicao: 'Usado',
          'Data da Entrega': '2026-05-22'
        });
      } else {
        // For each employee, fetch deliveries. If none, export a single record with blank delivery fields to preserve registry
        employees.forEach(emp => {
          const empDeliveries = deliveries.filter(d => d.funcionarioId === emp.id);
          
          if (empDeliveries.length === 0) {
            exportRows.push({
              Nome: emp.nome,
              CPF: emp.cpf,
              'Data de Admissao': emp.dataAdmissao,
              Setor: emp.setor,
              'Peca Entregue': '',
              Tamanho: '',
              Condicao: '',
              'Data da Entrega': ''
            });
          } else {
            empDeliveries.forEach(del => {
              exportRows.push({
                Nome: emp.nome,
                CPF: emp.cpf,
                'Data de Admissao': emp.dataAdmissao,
                Setor: emp.setor,
                'Peca Entregue': del.itemType,
                Tamanho: del.tamanho,
                Condicao: del.condicao,
                'Data da Entrega': del.dataEntrega
              });
            });
          }
        });
      }

      // Generate Workbook
      const ws = XLSX.utils.json_to_sheet(exportRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Restauracao_Backup_UniformDesk');

      const fileDate = currentSimulatedDate.replace(/-/g, '');
      const filename = `db_backup_uniformdesk_${fileDate}`;

      if (formatType === 'xlsx') {
        XLSX.writeFile(wb, `${filename}.xlsx`);
        onLogMessage(`Sucesso SQL: Banco de dados consolidado exportado com sucesso em planilha Excel (.xlsx).`);
      } else {
        XLSX.writeFile(wb, `${filename}.csv`, { bookType: 'csv' });
        onLogMessage(`Sucesso SQL: Banco de dados consolidado exportado com sucesso em arquivo CSV (.csv).`);
      }
    } catch (err: any) {
      onLogMessage(`Erro Crítico na Exportação: ${err.message}`);
    }
  };

  // Helper download template generator
  const downloadTemplate = (type: 'base' | 'full') => {
    let rows: any[] = [];
    let filename = '';

    if (type === 'base') {
      rows = [
        { Nome: 'Carlos Alberto de Souza', CPF: '12345678901', 'Data de Admissao': '2026-02-15' },
        { Nome: 'Mariana Costa Pinheiro', CPF: '987.654.321-00', 'Data de Admissao': '2025-11-20' },
        { Nome: 'Julio Cesar Santos', CPF: '11122233344', 'Data de Admissao': '2026-05-18' }
      ];
      filename = 'modelo_importacao_inicial_lote';
    } else {
      rows = [
        {
          Nome: 'Carlos Alberto de Souza',
          CPF: '123.456.789-01',
          'Data de Admissao': '2026-02-15',
          Setor: 'Logística',
          'Peca Entregue': 'Camiseta',
          Tamanho: 'G',
          Condicao: 'Usado',
          'Data da Entrega': '2026-02-15'
        },
        {
          Nome: 'Carlos Alberto de Souza',
          CPF: '123.456.789-01',
          'Data de Admissao': '2026-02-15',
          Setor: 'Logística',
          'Peca Entregue': 'Bermuda',
          Tamanho: 'M',
          Condicao: 'Usado',
          'Data da Entrega': '2026-02-16'
        },
        {
          Nome: 'Elaine Maria Souza',
          CPF: '555.666.777-88',
          'Data de Admissao': '2025-05-15',
          Setor: 'Expedição',
          'Peca Entregue': '',
          Tamanho: '',
          Condicao: '',
          'Data da Entrega': ''
        }
      ];
      filename = 'modelo_backup_completo_restauracao';
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  // Drag-and-Drop event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  // Direct execution preview
  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    setDryRunReport(null);
    runDryRunParser(file, importType);
  };

  // DRY-RUN Programmatic Parser: Emulates SQLite analysis
  const runDryRunParser = (file: File, mode: 'base' | 'full') => {
    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('Não foi possível ler os dados do arquivo selecionado.');

        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (rows.length === 0) {
          throw new Error('A planilha selecionada está vazia ou não contém dados válidos.');
        }

        // Initialize state markers for SQL dryrun
        let empsToInsert = 0;
        let empsToUpdate = 0;
        let delsToInsert = 0;
        let delsToSkip = 0;
        const newSectorsList: string[] = [];

        // In-memory dictionaries to trace unique key constraint breaches (CPF)
        const processedCPFs = new Map<string, { id: string; nome: string; dataAdmissao: string; setor: string }>();
        const parsedEmployeesList: any[] = [];
        const parsedDeliveriesList: any[] = [];

        // Prepopulate with existing database values to emulate stateful comparisons
        employees.forEach(emp => {
          processedCPFs.set(cleanCPF(emp.cpf), {
            id: emp.id,
            nome: emp.nome,
            dataAdmissao: emp.dataAdmissao,
            setor: emp.setor
          });
        });

        // Loop rows
        rows.forEach((row, index) => {
          const rawNome = row['Nome'] || row['nome'];
          const rawCPF = row['CPF'] || row['cpf'];
          const rawDate = row['Data de Admissao'] || row['data_admissao'] || row['Data de Admissão'] || row['data_admissao_inicial'];

          if (!rawNome || !rawCPF) {
            // Unidentifiable row, ignore
            return;
          }

          const cpfClean = cleanCPF(String(rawCPF));
          if (cpfClean.length < 11) {
            // Invalid CPF format for key constraints
            return;
          }

          const formattedCPF = formatCPF(cpfClean);
          const parsedAdmission = parseExcelDate(rawDate);
          
          let resolvedSetor = 'Logística'; // Default generic fallback
          if (mode === 'full') {
            const rawSetor = row['Setor'] || row['setor'];
            if (rawSetor) {
              resolvedSetor = String(rawSetor).trim();
              if (resolvedSetor && !sectors.includes(resolvedSetor) && !newSectorsList.includes(resolvedSetor)) {
                newSectorsList.push(resolvedSetor);
              }
            }
          }

          // SQLite programmed logic: UPSERT EMPLOYEE
          let empId = '';
          if (processedCPFs.has(cpfClean)) {
            const existing = processedCPFs.get(cpfClean)!;
            empId = existing.id;
            
            // Check if updates are needed (different name, admission or sector)
            if (existing.nome !== String(rawNome).trim() || existing.dataAdmissao !== parsedAdmission || existing.setor !== resolvedSetor) {
              empsToUpdate++;
              // update local dryrun dict
              processedCPFs.set(cpfClean, {
                id: empId,
                nome: String(rawNome).trim(),
                dataAdmissao: parsedAdmission,
                setor: resolvedSetor
              });
            }
          } else {
            // NEW employee
            empId = generateUUID();
            empsToInsert++;
            processedCPFs.set(cpfClean, {
              id: empId,
              nome: String(rawNome).trim(),
              dataAdmissao: parsedAdmission,
              setor: resolvedSetor
            });
          }

          // Record for bulk commits lists
          const itemExistsInRegistry = parsedEmployeesList.some(e => e.cpf === formattedCPF);
          if (!itemExistsInRegistry) {
            parsedEmployeesList.push({
              id: empId,
              nome: String(rawNome).trim(),
              cpf: formattedCPF,
              dataAdmissao: parsedAdmission,
              setor: resolvedSetor
            });
          }

          // Full state restoration check (Uniforms integration)
          if (mode === 'full') {
            const itemTypeRaw = row['Peca Entregue'] || row['Peca_Entregue'] || row['peca_entregue'] || row['Peça Entregue'] || row['Item'];
            const sizeRaw = row['Tamanho'] || row['tamanho'] || row['Tamanho_Peca'];
            const condRaw = row['Condicao'] || row['condicao'] || row['Condição'] || row['Estado'];
            const delDateRaw = row['Data da Entrega'] || row['Date_Entrega'] || row['Data_Entrega'] || row['Data da entrega'];

            if (itemTypeRaw && String(itemTypeRaw).trim()) {
              const itemType = String(itemTypeRaw).trim() as 'Camiseta' | 'Bermuda' | 'Calça';
              const tamanho = String(sizeRaw || 'M').trim();
              const condic = (String(condRaw || 'Novo').trim().toLowerCase().startsWith('us') ? 'Usado' : 'Novo') as 'Novo' | 'Usado';
              const dataEntrega = parseExcelDate(delDateRaw);

              // Check if exact delivery already exists to prevent duplicate rows on active loops (Unique Index programmatic check)
              const alreadyExistsInDb = deliveries.some(d => 
                d.funcionarioId === empId && 
                d.itemType === itemType && 
                d.tamanho === tamanho && 
                d.condicao === condic && 
                d.dataEntrega === dataEntrega
              );

              const alreadyExistsInBatch = parsedDeliveriesList.some(d => 
                d.funcionarioId === empId && 
                d.itemType === itemType && 
                d.tamanho === tamanho && 
                d.condicao === condic && 
                d.dataEntrega === dataEntrega
              );

              if (alreadyExistsInDb || alreadyExistsInBatch) {
                delsToSkip++;
              } else {
                delsToInsert++;
                parsedDeliveriesList.push({
                  id: generateUUID(),
                  funcionarioId: empId,
                  itemType,
                  tamanho,
                  condicao: condic,
                  dataEntrega
                });
              }
            }
          }
        });

        // Set Dry Run analysis report state
        setDryRunReport({
          success: true,
          totalRows: rows.length,
          employeesToInsert: empsToInsert,
          employeesToUpdate: empsToUpdate,
          deliveriesToInsert: delsToInsert,
          deliveriesToSkip: delsToSkip,
          foundSectorsToRegister: newSectorsList,
          parsedEmployees: parsedEmployeesList,
          parsedDeliveries: parsedDeliveriesList
        });

      } catch (err: any) {
        setDryRunReport({
          success: false,
          errorMsg: err.message,
          totalRows: 0,
          employeesToInsert: 0,
          employeesToUpdate: 0,
          deliveriesToInsert: 0,
          deliveriesToSkip: 0,
          foundSectorsToRegister: [],
          parsedEmployees: [],
          parsedDeliveries: []
        });
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setDryRunReport({
        success: false,
        errorMsg: 'Ocorreu um erro físico de arquivo no navegador ao processar o upload.',
        totalRows: 0,
        employeesToInsert: 0,
        employeesToUpdate: 0,
        deliveriesToInsert: 0,
        deliveriesToSkip: 0,
        foundSectorsToRegister: [],
        parsedEmployees: [],
        parsedDeliveries: []
      });
      setIsProcessing(false);
    };

    reader.readAsBinaryString(file);
  };

  // 2. Commit transaction of Upsert
  const handleExecuteImportCommit = () => {
    if (!dryRunReport || !dryRunReport.success) return;

    try {
      const { parsedEmployees, parsedDeliveries, foundSectorsToRegister } = dryRunReport;

      // 1. Register new sectors if found
      if (foundSectorsToRegister.length > 0) {
        setSectors(prev => {
          const merged = [...prev];
          foundSectorsToRegister.forEach(s => {
            if (!merged.includes(s)) merged.push(s);
          });
          return merged;
        });
      }

      // 2. Execute SQL Upsert on core state:
      // Loop over parsedEmployees
      setEmployees(prev => {
        const updatedList = [...prev];
        parsedEmployees.forEach(item => {
          const index = updatedList.findIndex(e => cleanCPF(e.cpf) === cleanCPF(item.cpf));
          if (index !== -1) {
            // Update step
            updatedList[index] = {
              ...updatedList[index],
              nome: item.nome,
              dataAdmissao: item.dataAdmissao,
              setor: item.setor
            };
          } else {
            // Insert step
            updatedList.push(item);
          }
        });
        return updatedList;
      });

      // 3. Integrate new deliveries
      if (parsedDeliveries.length > 0) {
        setDeliveries(prev => [...prev, ...parsedDeliveries]);
      }

      // Complete feedback logs
      const summaryMsg = `SQL UPSERT TRANSATION Executada com Sucesso! ` +
        `Colaboradores: ${parsedEmployees.length} registros sincronizados (novos/atualizados). ` +
        `Controle de Estoque/Entregas: ${parsedDeliveries.length} novas fichas restauradas correspondentes às datas originais de fardamento.`;
      
      onLogMessage(summaryMsg);
      
      // Clean states
      setSelectedFile(null);
      setDryRunReport(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

    } catch (e: any) {
      onLogMessage(`Erro transacional no banco ao salvar alterações na memória persistente: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Intro Card */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 rounded-lg border border-indigo-500/15 text-indigo-400 shrink-0">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white font-sans">
                Backup, Recuperação & Importação Lote
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Módulo Administrativo de Resiliência de Dados e Sincronização Corporativa
              </p>
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => handleExportBackup('xlsx')}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold font-sans rounded-lg flex items-center gap-2 shadow-lg shadow-indigo-600/10 cursor-pointer transition"
            >
              <Download className="h-4 w-4" />
              Exportar Excel (.xlsx)
            </button>
            <button
              onClick={() => handleExportBackup('csv')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold font-sans rounded-lg flex items-center gap-2 border border-slate-700 cursor-pointer transition"
            >
              <FileDown className="h-4 w-4" />
              CSV UTF-8
            </button>
          </div>
        </div>

        <p className="text-sm text-slate-350 leading-relaxed font-sans max-w-4xl">
          Evite a perda da cronologia de fardamentos da fábrica. Exporte periodicamente a base unificada 
          para fins de auditoria interna ou utilize esta área para recuperar totalmente os vínculos em caso de reinicialização 
          ou migração de sistema. Nosso mecanismo valida integridade de chaves únicas CPF e resolve conflitos de registros em lote.
        </p>
      </div>

      {/* Selector Subtabs */}
      <div className="flex gap-2 border-b border-slate-850 pb-1">
        <button
          onClick={() => {
            setActiveSubTab('recovery');
            setImportType('full');
            setSelectedFile(null);
            setDryRunReport(null);
          }}
          className={`px-4 py-2 border-b-2 text-xs font-mono uppercase tracking-wider transition ${
            activeSubTab === 'recovery'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          ♻️ Restauração Total do Sistema
        </button>
        <button
          onClick={() => {
            setActiveSubTab('base_import');
            setImportType('base');
            setSelectedFile(null);
            setDryRunReport(null);
          }}
          className={`px-4 py-2 border-b-2 text-xs font-mono uppercase tracking-wider transition ${
            activeSubTab === 'base_import'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          📥 Importação de Base Inicial (Lote)
        </button>
        <button
          onClick={() => setActiveSubTab('specs')}
          className={`px-4 py-2 border-b-2 text-xs font-mono uppercase tracking-wider transition ${
            activeSubTab === 'specs'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          📖 Especificação das Colunas
        </button>
      </div>

      {/* Main Content Areas */}
      {activeSubTab === 'specs' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-sans">
          {/* Base specs */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-indigo-400 font-bold">
              <Users className="h-5 w-5" />
              <h3>1. Colunas para Importação Base Inicial</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-mono">
              Use este modelo para o bootstrap inicial. O sistema cadastrará as pessoas com o setor padrão de 'Logística' (reconfigurável após carga).
            </p>
            
            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs font-mono divide-y divide-slate-850">
                <thead className="bg-slate-950 text-slate-400">
                  <tr>
                    <th className="p-3">Coluna</th>
                    <th className="p-3">Tipo / Obrigatório</th>
                    <th className="p-3">Exemplo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-300">
                  <tr>
                    <td className="p-3 font-bold text-white">Nome</td>
                    <td className="p-3 text-emerald-400">Texto / SIM</td>
                    <td className="p-3">Carlos Alberto de Souza</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-white">CPF</td>
                    <td className="p-3 text-emerald-400">Texto / SIM (Chave)</td>
                    <td className="p-3">123.456.789-01</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-white">Data de Admissao</td>
                    <td className="p-3 text-slate-400">Data e Texto / SIM</td>
                    <td className="p-3">15/02/2026 ou 2026-02-15</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <button
              onClick={() => downloadTemplate('base')}
              className="w-full px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold font-mono rounded-lg flex items-center justify-center gap-2 border border-slate-700 cursor-pointer"
            >
              <FileDown className="h-4 w-4 text-slate-450" />
              Baixar Modelo Excel (.xlsx) de Cadastro
            </button>
          </div>

          {/* Full recovery Specs */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <ShieldCheck className="h-5 w-5" />
              <h3>2. Colunas para Recuperação de Desastres Unificada</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-mono">
              Comporta toda a inteligência cronológica de fardamentos na mesma linha de planilha. Evita repetições e reconstrói o banco instantaneamente.
            </p>

            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs font-mono divide-y divide-slate-850">
                <thead className="bg-slate-950 text-slate-400">
                  <tr>
                    <th className="p-3">Coluna</th>
                    <th className="p-3">Tipo / Obrigatório</th>
                    <th className="p-3">Descrição / Válido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-300">
                  <tr>
                    <td className="p-3 font-bold text-white">Nome</td>
                    <td className="p-3 text-emerald-400">Texto / SIM</td>
                    <td className="p-3">Nome do Colaborador</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-white">CPF</td>
                    <td className="p-3 text-emerald-400">Texto / SIM (Unique)</td>
                    <td className="p-3">Chave de Integridade</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-white">Data de Admissao</td>
                    <td className="p-3 text-slate-400">Data / SIM</td>
                    <td className="p-3">Prazos de Experiência</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-white">Setor</td>
                    <td className="p-3 text-slate-400">Texto / Não</td>
                    <td className="p-3">Cadastrado de forma automática</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-white">Peca Entregue</td>
                    <td className="p-3 text-slate-400">Texto / Não</td>
                    <td className="p-3">Camiseta, Bermuda, Calça</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-white">Tamanho</td>
                    <td className="p-3 text-slate-400">Texto / Não</td>
                    <td className="p-3">P, M, G, GG, 38, 40, etc.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-white">Condicao</td>
                    <td className="p-3 text-slate-400">Texto / Não</td>
                    <td className="p-3">Novo, Usado</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-white">Data da Entrega</td>
                    <td className="p-3 text-slate-400">Data / Não</td>
                    <td className="p-3">Data exata da entrega física</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <button
              onClick={() => downloadTemplate('full')}
              className="w-full px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold font-mono rounded-lg flex items-center justify-center gap-2 border border-slate-700 cursor-pointer"
            >
              <FileDown className="h-4 w-4 text-slate-450" />
              Baixar Modelo de Restauração Completa (.xlsx)
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Upload card drag action */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Upload Zone Left Side */}
            <div className="lg:col-span-2 space-y-4">
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`p-10 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center transition-all ${
                  dragActive
                    ? 'border-indigo-400 bg-indigo-950/20'
                    : 'border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700'
                }`}
              >
                <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center mb-4 text-slate-400">
                  <UploadCloud className="h-6 w-6" />
                </div>

                <div className="space-y-1.5">
                  <p className="text-sm font-bold text-white font-sans">
                    Arraste ou selecione a planilha de {importType === 'base' ? 'Importação Lote' : 'Restauração Completa'}
                  </p>
                  <p className="text-xs text-slate-400 font-mono">
                    Extensões aceitas: <span className="text-indigo-400">.xlsx, .xls, .csv</span>
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-6 px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold uppercase tracking-wider rounded-lg border border-slate-700 hover:border-slate-600 transition shadow-md cursor-pointer"
                >
                  Procurar Arquivo Local
                </button>
              </div>

              {selectedFile && (
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="text-lg">📄</span>
                    <div className="overflow-hidden">
                      <span className="text-xs font-mono font-bold text-white block truncate">{selectedFile.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono block">
                        {(selectedFile.size / 1024).toFixed(1)} KB ({selectedFile.type || 'Planilha'})
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setDryRunReport(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-xs font-mono text-slate-500 hover:text-red-400 font-bold"
                  >
                    Excluir
                  </button>
                </div>
              )}
            </div>

            {/* Instruction specs and workflow */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4 font-sans text-xs">
              <div className="flex items-center gap-2 text-indigo-400 font-bold border-b border-slate-800 pb-2">
                <BookOpen className="h-4 w-4" />
                <span>COMO A RECONSTRUÇÃO FUNCIONA</span>
              </div>
              
              <ul className="space-y-3 font-sans text-slate-350 list-decimal pl-4 leading-relaxed">
                <li>
                  <strong className="text-white font-mono">Upload do File:</strong> O sistema lê as colunas especificadas na aba e executa um parser robusto.
                </li>
                <li>
                  <strong className="text-white font-mono">DRE Engine Dry Run:</strong> É executado um diagnóstico de simulação na tela ao lado. Nada é salvo no "Banco Real" de imediato.
                </li>
                <li>
                  <strong className="text-white font-mono">UPSERT Programático:</strong> Ao clicar em 'Confirmar Restauração', o sistema atualiza se a pessoa existe ou cria se for CPF novo.
                </li>
                <li>
                  <strong className="text-white font-mono">Não Duplicação de Entregas:</strong> O motor avalia se a linha com data e peça exatas já está no histórico e ignora duplicatas.
                </li>
              </ul>

              <div className="bg-indigo-950/20 border border-indigo-850/50 p-3.5 rounded-lg text-indigo-350 leading-relaxed text-[11px] font-mono">
                💡 **Dica de Resiliência:** Você sempre pode re-importar a mesma planilha quantas vezes quiser. Ela funciona em regime idempotente (resultado idêntico sem redundâncias).
              </div>
            </div>
          </div>

          {/* DR-Engine analysis results preview */}
          {dryRunReport && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800 animate-fade-in font-sans">
              <div className="p-4 bg-slate-950 font-mono text-xs flex justify-between items-center text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                  <span className="font-bold text-white">RESTAURAÇÃO / DETECTADOS NO BANCO</span>
                </div>
                <div>Dry-run SQLite Simulator Ativo</div>
              </div>

              {dryRunReport.success ? (
                <>
                  {/* Analysis Statistics Grid */}
                  <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="p-3 bg-slate-950 border border-slate-850 rounded-lg">
                      <div className="text-slate-400 text-[10px] font-mono uppercase">Linhas Lidas</div>
                      <div className="text-2xl font-bold font-mono text-white mt-1">{dryRunReport.totalRows}</div>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-850 rounded-lg">
                      <div className="text-slate-400 text-[10px] font-mono uppercase">Novos Colaboradores</div>
                      <div className="text-2xl font-bold font-mono text-emerald-400 mt-1 flex justify-center items-center gap-1">
                        + {dryRunReport.employeesToInsert}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-850 rounded-lg">
                      <div className="text-slate-400 text-[10px] font-mono uppercase">Fichas Atualizadas</div>
                      <div className="text-2xl font-bold font-mono text-amber-500 mt-1">
                        {dryRunReport.employeesToUpdate}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-850 rounded-lg">
                      <div className="text-slate-400 text-[10px] font-mono uppercase">Novas Entregas Dedicadas</div>
                      <div className="text-2xl font-bold font-mono text-indigo-400 mt-1 flex justify-center items-center gap-1">
                        + {dryRunReport.deliveriesToInsert}
                      </div>
                    </div>
                  </div>

                  {/* Warning indicators about duplicates or sectors */}
                  <div className="p-4 bg-slate-955 px-6 space-y-2 text-xs font-mono">
                    <div className="flex items-start gap-2 text-slate-400 leading-relaxed">
                      <span className="text-amber-500 shrink-0">ℹ️</span>
                      <span>
                        O motor detectou <strong className="text-slate-300">{dryRunReport.deliveriesToSkip} registros de entregas idênticas</strong> que já existem no banco real de fardamentos e serão ignorados para impedir duplicidade cadastral (Prevenção de duplicatas ativa).
                      </span>
                    </div>

                    {dryRunReport.foundSectorsToRegister.length > 0 && (
                      <div className="flex items-start gap-2 text-slate-400 leading-relaxed">
                        <span className="text-indigo-400 shrink-0">➕</span>
                        <span>
                          Serão inseridos automaticamente <strong className="text-slate-300">{dryRunReport.foundSectorsToRegister.length} novos setores corporativos</strong> na rede de opções: [{dryRunReport.foundSectorsToRegister.join(', ')}].
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Execution actions */}
                  <div className="p-6 bg-slate-950 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white font-sans flex items-center gap-1.5">
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                        Pronto para Sincronizar!
                      </h4>
                      <p className="text-xs text-slate-400">
                        O processo utilizará conexões integradas e reescreverá fichas em lote na memória da viewport.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleExecuteImportCommit}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold tracking-wider uppercase font-sans rounded-lg shadow-lg shadow-emerald-600/10 cursor-pointer flex items-center gap-2 transition hover:scale-[1.01]"
                    >
                      <RefreshCw className="h-4 w-4 animate-spin-slow" />
                      Executar Gravação e Restaurar Banco
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-6 bg-rose-950/20 space-y-3 font-sans text-sm">
                  <div className="flex items-center gap-2 text-rose-450 font-bold">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Erro Fatal no Processamento da Planilha</span>
                  </div>
                  <p className="text-xs text-rose-300 leading-relaxed font-mono">
                    Falha na análise dos blocos de dados. Motivo: {dryRunReport.errorMsg || 'Formato de colunas corrompido ou colunas mandatórias não preenchidas.'}
                  </p>
                  <p className="text-slate-450 text-[11px] font-mono leading-relaxed">
                    Verifique se você utilizou cabeçalhos de coluna em conformidade com as regras detalhadas na aba "Especificações de Colunas" (Nome, CPF, Data de Admissao).
                  </p>
                </div>
              )}

            </div>
          )}
        </div>
      )}
    </div>
  );
}
