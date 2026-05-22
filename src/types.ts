export type UniformType = 'Camiseta' | 'Bermuda' | 'Calça' | 'Camiseta Polo' | 'Botina';
export type UniformCondition = 'Novo' | 'Usado';
export type UniformGender = 'Masculino' | 'Feminino';

export type MovementType = 
  | 'Entrada por Compra' 
  | 'Entrada por Devolução' 
  | 'Saída por Descarte' 
  | 'Saída por Entrega' 
  | 'Ajuste de Inventário';

export interface StockItem {
  id: string;
  itemType: UniformType;
  tamanho: string;
  condicao: UniformCondition;
  genero: UniformGender;
  quantidade: number;
}

export interface StockMovement {
  id: string;
  itemType: UniformType;
  tamanho: string;
  condicao: UniformCondition;
  genero: UniformGender;
  tipoMovimentacao: MovementType;
  quantidade: number; // For safety, can be positive/negative or absolute
  motivoDescricao: string;
  dataMovimentacao: string; // ISO yyyy-mm-dd
}

export interface Employee {
  id: string;
  nome: string;
  setor: string;
  cpf: string;
  dataAdmissao: string; // ISO yyyy-mm-dd
  deleted?: boolean;
  dataDemissao?: string; // ISO yyyy-mm-dd
}

export interface Delivery {
  id: string;
  funcionarioId: string;
  itemType: UniformType;
  tamanho: string;
  condicao: UniformCondition;
  genero: UniformGender;
  dataEntrega: string; // ISO yyyy-mm-dd
  retroativa?: boolean;
}

export interface TableSchema {
  name: string;
  description: string;
  columns: {
    name: string;
    type: string;
    constraints?: string;
    description: string;
  }[];
}
