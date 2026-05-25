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
  stock: StockItem[];
  setStock: React.Dispatch<React.SetStateAction<StockItem[]>>;
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
  stock,
  setStock,
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
    stockToRestore?: number;
    parsedStock?: StockItem[];
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
      // Aba 1 - Estoque
      const estoqueRows = (stock || []).map(item => ({
        'Tipo de Uniforme': item.itemType,
        'Gênero': item.genero,
        'Tamanho': item.tamanho,
        'Condição': item.condicao,
        'Quantidade Atual Real': item.quantidade
      }));

      // Aba 2 - Colaboradores (ignoring soft-deleted employees)
      const colaboradoresRows: any[] = [];
      const activeEmployees = (employees || []).filter(emp => !emp.deleted);

      if (activeEmployees.length === 0) {
        colaboradoresRows.push({
          'Nome': 'Exemplo de Colaborador',
          'CPF': '000.111.222-33',
          'Data de Admissão': '2026-05-22',
          'Setor': 'Logística',
          'Peça Entregue': '',
          'Quantidade': '',
          'Tamanho': '',
          'Condição': '',
          'Data da Entrega': ''
        });
      } else {
        activeEmployees.forEach(emp => {
          const empDeliveries = (deliveries || []).filter(d => d.funcionarioId === emp.id);
          
          if (empDeliveries.length === 0) {
            colaboradoresRows.push({
              'Nome': emp.nome,
              'CPF': emp.cpf,
              'Data de Admissão': emp.dataAdmissao,
              'Setor': emp.setor,
              'Peça Entregue': '',
              'Quantidade': '',
              'Tamanho': '',
              'Condição': '',
              'Data da Entrega': ''
            });
          } else {
            empDeliveries.forEach(del => {
              colaboradoresRows.push({
                'Nome': emp.nome,
                'CPF': emp.cpf,
                'Data de Admissão': emp.dataAdmissao,
                'Setor': emp.setor,
                'Peça Entregue': del.itemType,
                'Quantidade': del.quantidade || 1,
                'Tamanho': del.tamanho,
                'Condição': del.condicao,
                'Data da Entrega': del.dataEntrega
              });
            });
          }
        });
      }

      // Generate sheets
      const wsEstoque = XLSX.utils.json_to_sheet(estoqueRows);
      const wsColaboradores = XLSX.utils.json_to_sheet(colaboradoresRows);

      const fileDate = currentSimulatedDate.replace(/-/g, '');
      const filename = `db_backup_uniformdesk_${fileDate}`;

      if (formatType === 'xlsx') {
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, wsEstoque, 'Estoque');
        XLSX.utils.book_append_sheet(wb, wsColaboradores, 'Colaboradores');
        XLSX.writeFile(wb, `${filename}.xlsx`);
        onLogMessage(`Sucesso SQL: Banco de dados com estados reais exportado com sucesso em abas "Estoque" e "Colaboradores" (.xlsx).`);
      } else {
        const csvWb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(csvWb, wsColaboradores, 'Colaboradores');
        XLSX.writeFile(csvWb, `${filename}.csv`, { bookType: 'csv' });
        onLogMessage(`Sucesso SQL: Banco de dados consolidado de colaboradores exportado em arquivo CSV (.csv).`);
      }
    } catch (err: any) {
      onLogMessage(`Erro Crítico na Exportação: ${err.message}`);
    }
  };

  // Helper download template generator
  const downloadTemplate = (type: 'base' | 'full') => {
    let filename = '';

    if (type === 'base') {
      const rows = [
        { Nome: 'Carlos Alberto de Souza', CPF: '12345678901', 'Data de Admissao': '2026-02-15' },
        { Nome: 'Mariana Costa Pinheiro', CPF: '987.654.321-00', 'Data de Admissao': '2025-11-20' },
        { Nome: 'Julio Cesar Santos', CPF: '11122233344', 'Data de Admissao': '2026-05-18' }
      ];
      filename = 'modelo_importacao_inicial_lote';
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
      XLSX.writeFile(wb, `${filename}.xlsx`);
    } else {
      const colaboradoresSample = [
        {
          Nome: 'Carlos Alberto de Souza',
          CPF: '123.456.789-01',
          'Data de Admissão': '2026-02-15',
          Setor: 'Logística',
          'Peça Entregue': 'Camiseta',
          Quantidade: 1,
          Tamanho: 'G',
          'Condição': 'Usado',
          'Data da Entrega': '2026-02-15'
        },
        {
          Nome: 'Carlos Alberto de Souza',
          CPF: '123.456.789-01',
          'Data de Admissão': '2026-02-15',
          Setor: 'Logística',
          'Peça Entregue': 'Bermuda',
          Quantidade: 1,
          Tamanho: 'M',
          'Condição': 'Usado',
          'Data da Entrega': '2026-02-16'
        },
        {
          Nome: 'Elaine Maria Souza',
          CPF: '555.666.777-88',
          'Data de Admissão': '2025-05-15',
          Setor: 'Expedição',
          'Peça Entregue': '',
          Quantidade: '',
          Tamanho: '',
          'Condição': '',
          'Data da Entrega': ''
        }
      ];
      const estoqueSample = [
        { 'Tipo de Uniforme': 'Camiseta', 'Gênero': 'Masculino', Tamanho: 'G', 'Condição': 'Usado', 'Quantidade Atual Real': 15 },
        { 'Tipo de Uniforme': 'Bermuda', 'Gênero': 'Masculino', Tamanho: 'M', 'Condição': 'Novo', 'Quantidade Atual Real': 8 }
      ];
      filename = 'modelo_backup_completo_restauracao';
      const wb = XLSX.utils.book_new();
      const wsEstoque = XLSX.utils.json_to_sheet(estoqueSample);
      const wsColaboradores = XLSX.utils.json_to_sheet(colaboradoresSample);
      XLSX.utils.book_append_sheet(wb, wsEstoque, 'Estoque');
      XLSX.utils.book_append_sheet(wb, wsColaboradores, 'Colaboradores');
      XLSX.writeFile(wb, `${filename}.xlsx`);
    }
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
        let targetSheetName = workbook.SheetNames[0];
        if (workbook.SheetNames.includes('Colaboradores')) {
          targetSheetName = 'Colaboradores';
        } else if (workbook.SheetNames.includes('Restauracao_Backup_UniformDesk')) {
          targetSheetName = 'Restauracao_Backup_UniformDesk';
        } else if (workbook.SheetNames.includes('Modelo')) {
          targetSheetName = 'Modelo';
        }
        const worksheet = workbook.Sheets[targetSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (rows.length === 0 && !workbook.SheetNames.includes('Estoque')) {
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

        // Loop rows for Employees / Deliveries
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
            const genderRaw = row['Gênero'] || row['genero'] || row['Sexo'] || 'Masculino';
            const delDateRaw = row['Data da Entrega'] || row['Date_Entrega'] || row['Data_Entrega'] || row['Data da entrega'];
            const qtyRaw = row['Quantidade'] || row['quantidade'] || row['Qtd'] || row['qtd'] || 1;

            if (itemTypeRaw && String(itemTypeRaw).trim()) {
              const itemType = String(itemTypeRaw).trim() as 'Camiseta' | 'Bermuda' | 'Calça';
              const tamanho = String(sizeRaw || 'M').trim();
              const condic = (String(condRaw || 'Novo').trim().toLowerCase().startsWith('us') ? 'Usado' : 'Novo') as 'Novo' | 'Usado';
              const genero = (String(genderRaw).trim().toLowerCase().startsWith('f') ? 'Feminino' : 'Masculino') as 'Masculino' | 'Feminino';
              const dataEntrega = parseExcelDate(delDateRaw);
              const quantidade = isNaN(Number(qtyRaw)) ? 1 : Number(qtyRaw);

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
                  genero,
                  dataEntrega,
                  quantidade
                });
              }
            }
          }
        });

        // Parse Stock Sheet (Estoque) if present in full mode
        const parsedStockList: StockItem[] = [];
        let stockToRestoreCount = 0;

        if (mode === 'full') {
          const targetEstoqueSheetName = workbook.SheetNames.find(
            name => name === 'Estoque' || name.toLowerCase() === 'estoque'
          );
          if (targetEstoqueSheetName) {
            const wsEstoque = workbook.Sheets[targetEstoqueSheetName];
            const estoqueRawRows = XLSX.utils.sheet_to_json(wsEstoque) as any[];
            
            estoqueRawRows.forEach((row) => {
              const itemTypeRaw = row['Tipo de Uniforme'] || row['Tipo_Uniforme'] || row['tipo_uniforme'] || row['Tipo de uniforme'] || row['itemType'] || row['v_item_type'] || row['Item'] || row['Peca'] || row['Peça'];
              const genderRaw = row['Gênero'] || row['genero'] || row['Modelagem'] || row['Sexo'] || row['gender'] || row['Genero'];
              const sizeRaw = row['Tamanho'] || row['tamanho'] || row['Size'];
              const condRaw = row['Condição'] || row['condicao'] || row['Condicao'] || row['Estado'];
              const qtyRaw = row['Quantidade Atual Real'] || row['Quantidade_Atual_Real'] || row['quantidade'] || row['Quantidade'] || row['Qtd'] || row['qtd'] || row['Quantidade Atual'] || row['quantidade_estoque'];

              if (itemTypeRaw && String(itemTypeRaw).trim()) {
                let itemType: 'Camiseta' | 'Bermuda' | 'Calça' | 'Camiseta Polo' | 'Botina' = 'Camiseta';
                const normType = String(itemTypeRaw).trim().toLowerCase();
                
                if (normType === 'camiseta polo' || normType === 'camisatapolo') {
                  itemType = 'Camiseta Polo';
                } else if (normType === 'botina') {
                  itemType = 'Botina';
                } else if (normType === 'camiseta') {
                  itemType = 'Camiseta';
                } else if (normType === 'bermuda') {
                  itemType = 'Bermuda';
                } else if (normType === 'calça' || normType === 'calca') {
                  itemType = 'Calça';
                } else {
                  return; // Don't parse invalid item types
                }

                const genderLower = String(genderRaw || 'Masculino').trim().toLowerCase();
                const genero = (genderLower.startsWith('f') || genderLower.includes('fem')) ? 'Feminino' : 'Masculino';
                const tamanho = String(sizeRaw || 'M').trim().toUpperCase();
                const condLower = String(condRaw || 'Novo').trim().toLowerCase();
                const condicao = (condLower.startsWith('us') || condLower.includes('used')) ? 'Usado' : 'Novo';
                
                let quantidade = parseInt(String(qtyRaw), 10);
                if (isNaN(quantidade)) {
                  quantidade = 0;
                }

                parsedStockList.push({
                  id: generateUUID(),
                  itemType,
                  genero,
                  tamanho,
                  condicao,
                  quantidade
                });
                stockToRestoreCount++;
              }
            });
          }
        }

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
          parsedDeliveries: parsedDeliveriesList,
          stockToRestore: stockToRestoreCount,
          parsedStock: parsedStockList
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
          parsedDeliveries: [],
          stockToRestore: 0,
          parsedStock: []
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
        parsedDeliveries: [],
        stockToRestore: 0,
        parsedStock: []
      });
      setIsProcessing(false);
    };

    reader.readAsBinaryString(file);
  };

  // 2. Commit transaction of Upsert
  const handleExecuteImportCommit = () => {
    if (!dryRunReport || !dryRunReport.success) return;

    try {
      const { parsedEmployees, parsedDeliveries, foundSectorsToRegister, parsedStock } = dryRunReport;

      // 1. New Sectors State
      let nextSectors = [...sectors];
      if (foundSectorsToRegister.length > 0) {
        foundSectorsToRegister.forEach(s => {
          if (!nextSectors.includes(s)) nextSectors.push(s);
        });
      }

      // 2. New Employees State
      const nextEmployees = [...employees];
      parsedEmployees.forEach(item => {
        const index = nextEmployees.findIndex(e => cleanCPF(e.cpf) === cleanCPF(item.cpf));
        if (index !== -1) {
          // Update step
          nextEmployees[index] = {
            ...nextEmployees[index],
            nome: item.nome,
            dataAdmissao: item.dataAdmissao,
            setor: item.setor
          };
        } else {
          // Insert step
          nextEmployees.push(item);
        }
      });

      // 3. New Deliveries State
      const nextDeliveries = [...deliveries];
      if (parsedDeliveries.length > 0) {
        nextDeliveries.push(...parsedDeliveries);
      }

      // 4. New Stock State
      let nextStock = [...stock];
      if (parsedStock && parsedStock.length > 0) {
        nextStock = parsedStock;
      }

      // 5. Update React states
      setSectors(nextSectors);
      setEmployees(nextEmployees);
      setDeliveries(nextDeliveries);
      if (parsedStock && parsedStock.length > 0) {
        setStock(nextStock);
      }

      // 6. Explicitly write to LocalStorage to ensure immediate persistence with combined states
      localStorage.setItem('db_sectors', JSON.stringify(nextSectors));
      localStorage.setItem('db_employees', JSON.stringify(nextEmployees));
      localStorage.setItem('db_deliveries', JSON.stringify(nextDeliveries));
      if (parsedStock && parsedStock.length > 0) {
        localStorage.setItem('db_stock', JSON.stringify(nextStock));
      }

      // Complete feedback logs
      let summaryMsg = `SQL UPSERT TRANSACTION Executada com Sucesso!\n` +
        `• Colaboradores: ${parsedEmployees.length} registros sincronizados (novos/atualizados).\n` +
        `• Cadastro de Entregas: ${parsedDeliveries.length} novas fichas de fardamento restauradas.`;
        
      if (parsedStock && parsedStock.length > 0) {
        summaryMsg += `\n• Almoxarifado: ${parsedStock.length} grades de estoque restabelecidas com saldos reais correspondentes de backup.`;
      }
      
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
              <div className="p-4 bg-slate-955 font-mono text-xs flex justify-between items-center text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                  <span className="font-bold text-white">RESTAURAÇÃO / DETECTADOS NO PLANO DE BACKUP</span>
                </div>
                <div>Dry-run SQLite Simulator Ativo</div>
              </div>

              {dryRunReport.success ? (
                <>
                  {/* Analysis Statistics Grid */}
                  <div className="p-6 grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                    <div className="p-3 bg-slate-950 border border-slate-850 rounded-lg">
                      <div className="text-slate-400 text-[10px] font-mono uppercase">Linhas Lidas</div>
                      <div className="text-2xl font-bold font-mono text-white mt-1">{dryRunReport.totalRows}</div>
                    </div>

                    <div className="p-3 bg-slate-955 border border-slate-850 rounded-lg">
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
                      <div className="text-slate-400 text-[10px] font-mono uppercase">Novas Entregas</div>
                      <div className="text-2xl font-bold font-mono text-indigo-400 mt-1 flex justify-center items-center gap-1">
                        + {dryRunReport.deliveriesToInsert}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-850 rounded-lg">
                      <div className="text-slate-400 text-[10px] font-mono uppercase">Grades de Estoque</div>
                      <div className="text-2xl font-bold font-mono text-teal-400 mt-1">
                        {dryRunReport.stockToRestore || 0}
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

                    {dryRunReport.stockToRestore !== undefined && dryRunReport.stockToRestore > 0 && (
                      <div className="flex items-start gap-2 text-slate-400 leading-relaxed">
                        <span className="text-teal-400 shrink-0">📦</span>
                        <span>
                          O motor detectou a aba <strong className="text-slate-300">"Estoque" com {dryRunReport.stockToRestore} grades de produtos</strong> e irá restaurar as quantidades ativas no almoxarifado corporativo.
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
