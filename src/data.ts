import { StockItem, Employee, Delivery, TableSchema } from './types';

// Let's seed mock data with relative offsets to the current actual year (2026)
// Current local time: 2026-05-22

export const INITIAL_STOCK: StockItem[] = [];

export const INITIAL_EMPLOYEES: Employee[] = [];

export const INITIAL_DELIVERIES: Delivery[] = [];

// Structural documentation schemas for reference DDL
export const SCHEMAS_DDL: TableSchema[] = [
  {
    name: 'funcionarios',
    description: 'Armazena as informações básicas cadastrais dos funcionários da empresa.',
    columns: [
      { name: 'id', type: 'INT', constraints: 'PRIMARY KEY IDENTITY(1,1)', description: 'Chave primária auto-incremental.' },
      { name: 'nome', type: 'VARCHAR(150)', constraints: 'NOT NULL', description: 'Nome completo do funcionário.' },
      { name: 'setor', type: 'VARCHAR(80)', constraints: 'NOT NULL', description: 'Setor onde o colaborador atua (ex: Logística, Produção).' },
      { name: 'cpf', type: 'VARCHAR(20)', constraints: 'UNIQUE NOT NULL', description: 'CPF único do funcionário.' },
      { name: 'data_admissao', type: 'DATE', constraints: 'NOT NULL', description: 'Data de contratação oficial (usada para regra dos 3 meses de experiência).' },
    ]
  },
  {
    name: 'itens_uniforme',
    description: 'Tabela catálogo de peças disponíveis para o uniforme.',
    columns: [
      { name: 'id', type: 'INT', constraints: 'PRIMARY KEY IDENTITY(1,1)', description: 'Chave primária.' },
      { name: 'nome', type: 'VARCHAR(50)', constraints: 'UNIQUE NOT NULL', description: 'Nome do item (ex: Camiseta, Bermuda, Calça, Camiseta Polo, Botina).' },
    ]
  },
  {
    name: 'estoque_grade',
    description: 'Estoque quantitativo segregado estritamente por peça, gênero, tamanho corporativo e condição de conservação.',
    columns: [
      { name: 'id', type: 'INT', constraints: 'PRIMARY KEY IDENTITY(1,1)', description: 'Chave primária.' },
      { name: 'item_id', type: 'INT', constraints: 'FOREIGN KEY REFERENCES itens_uniforme(id)', description: 'Associação com a peça correspondente.' },
      { name: 'genero', type: 'VARCHAR(15)', constraints: "CHECK (genero IN ('Masculino', 'Feminino'))", description: 'Gênero da modelagem.' },
      { name: 'tamanho', type: 'VARCHAR(10)', constraints: 'NOT NULL', description: 'Tamanho exato (PP, P, M, G, GG, EG, EXG, ou de 35 a 44).' },
      { name: 'condicao', type: 'VARCHAR(10)', constraints: "CHECK (condicao IN ('Novo', 'Usado'))", description: 'Se a peça está Nova ou Usada.' },
      { name: 'quantidade', type: 'INT', constraints: 'NOT NULL DEFAULT 0 CHECK (quantidade >= 0)', description: 'Saldo físico em estoque. Restrição impede saldo negativo.' },
    ]
  },
  {
    name: 'historico_entregas',
    description: 'Registro individualizado temporal e auditável das peças entregues com gênero.',
    columns: [
      { name: 'id', type: 'INT', constraints: 'PRIMARY KEY IDENTITY(1,1)', description: 'Chave primária.' },
      { name: 'funcionario_id', type: 'INT', constraints: 'FOREIGN KEY REFERENCES funcionarios(id)', description: 'ID do funcionário beneficiado.' },
      { name: 'item_id', type: 'INT', constraints: 'FOREIGN KEY REFERENCES itens_uniforme(id)', description: 'Peça entregue.' },
      { name: 'genero', type: 'VARCHAR(15)', constraints: 'NOT NULL', description: 'Modelagem da peça entregue (Masculino/Feminino).' },
      { name: 'tamanho', type: 'VARCHAR(10)', constraints: 'NOT NULL', description: 'Tamanho da peça no momento da entrega.' },
      { name: 'condicao', type: 'VARCHAR(10)', constraints: 'NOT NULL', description: 'Se foi entregue Novo ou Usado.' },
      { name: 'data_entrega', type: 'DATE', constraints: 'NOT NULL', description: 'Data em que a baixa de estoque e a entrega ocorreram física e sistemicamente.' },
    ]
  },
  {
    name: 'historico_movimentacoes',
    description: 'Registro cronológico e auditável de todas as entradas e saídas do estoque com gênero.',
    columns: [
      { name: 'id', type: 'INT', constraints: 'PRIMARY KEY IDENTITY(1,1)', description: 'Chave primária.' },
      { name: 'item_id', type: 'INT', constraints: 'FOREIGN KEY REFERENCES itens_uniforme(id)', description: 'Item movimentado.' },
      { name: 'genero', type: 'VARCHAR(15)', constraints: 'NOT NULL', description: 'Modelagem da peça movimentada.' },
      { name: 'tamanho', type: 'VARCHAR(10)', constraints: 'NOT NULL', description: 'Tamanho da peça na movimentação.' },
      { name: 'condicao', type: 'VARCHAR(10)', constraints: 'NOT NULL', description: 'Condição (Novo ou Usado).' },
      { name: 'tipo_movimentacao', type: 'VARCHAR(50)', constraints: 'NOT NULL', description: 'Tipo: Entrada por Compra, Entrada por Devolução, Saída por Descarte, Saída por Entrega ou Ajuste.' },
      { name: 'quantidade', type: 'INT', constraints: 'NOT NULL', description: 'Quantidade movimentada (positivo para entradas, negativo para saídas).' },
      { name: 'motivo_descricao', type: 'VARCHAR(250)', constraints: 'NOT NULL', description: 'Justificativa textual ou notas de auditoria.' },
      { name: 'data_movimentacao', type: 'DATE', constraints: 'NOT NULL', description: 'Data do lançamento.' },
    ]
  }
];

export const SQL_QUERIES = {
  ddl: `--- 1. CRIAÇÃO DAS TABELAS (DDL - COMPATÍVEL COM SQL SERVER / T-SQL) ---

-- Tabela de Funcionários
CREATE TABLE funcionarios (
    id INT IDENTITY(1,1) PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    setor VARCHAR(80) NOT NULL,
    cpf VARCHAR(20) UNIQUE NOT NULL,
    data_admissao DATE NOT NULL
);

-- Catalogo de Itens do Uniforme
CREATE TABLE itens_uniforme (
    id INT IDENTITY(1,1) PRIMARY KEY,
    nome VARCHAR(50) UNIQUE NOT NULL
);

-- Estoque com Grade Detalhada (Gênero + Tamanho + Condição)
CREATE TABLE estoque_grade (
    id INT IDENTITY(1,1) PRIMARY KEY,
    item_id INT NOT NULL,
    genero VARCHAR(15) NOT NULL,
    tamanho VARCHAR(10) NOT NULL,
    condicao VARCHAR(10) NOT NULL,
    quantidade INT NOT NULL DEFAULT 0,
    CONSTRAINT FK_estoque_item FOREIGN KEY (item_id) REFERENCES itens_uniforme(id),
    CONSTRAINT CHK_genero CHECK (genero IN ('Masculino', 'Feminino')),
    CONSTRAINT CHK_condicao CHECK (condicao IN ('Novo', 'Usado')),
    CONSTRAINT CHK_quantidade_positivo CHECK (quantidade >= 0),
    -- Regra Crítica: Tamanho PP não existe para o gênero Masculino
    CONSTRAINT CHK_genero_tamanho_restrito CHECK (NOT (genero = 'Masculino' AND tamanho = 'PP')),
    CONSTRAINT UQ_estoque_grade UNIQUE (item_id, genero, tamanho, condicao)
);

-- Histórico de Entregas (Item/Peça Individualizada com Gênero)
CREATE TABLE historico_entregas (
    id INT IDENTITY(1,1) PRIMARY KEY,
    funcionario_id INT NOT NULL,
    item_id INT NOT NULL,
    genero VARCHAR(15) NOT NULL,
    tamanho VARCHAR(10) NOT NULL,
    condicao VARCHAR(10) NOT NULL,
    data_entrega DATE NOT NULL,
    CONSTRAINT FK_entrega_funcionario FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id),
    CONSTRAINT FK_entrega_item FOREIGN KEY (item_id) REFERENCES itens_uniforme(id),
    CONSTRAINT CHK_entrega_genero CHECK (genero IN ('Masculino', 'Feminino')),
    CONSTRAINT CHK_entrega_condicao CHECK (condicao IN ('Novo', 'Usado')),
    CONSTRAINT CHK_entrega_genero_tamanho CHECK (NOT (genero = 'Masculino' AND tamanho = 'PP'))
);

-- Histórico de Movimentações de Estoque (Auditoria Rastreável)
CREATE TABLE historico_movimentacoes (
    id INT IDENTITY(1,1) PRIMARY KEY,
    item_id INT NOT NULL,
    genero VARCHAR(15) NOT NULL,
    tamanho VARCHAR(10) NOT NULL,
    condicao VARCHAR(10) NOT NULL,
    tipo_movimentacao VARCHAR(50) NOT NULL,
    quantidade INT NOT NULL, -- Valores positivos para Entradas, negativos para Saídas
    motivo_descricao VARCHAR(250) NOT NULL,
    data_movimentacao DATE NOT NULL,
    CONSTRAINT FK_movimentacao_item FOREIGN KEY (item_id) REFERENCES itens_uniforme(id),
    CONSTRAINT CHK_movimentacao_genero CHECK (genero IN ('Masculino', 'Feminino')),
    CONSTRAINT CHK_movimentacao_condicao CHECK (condicao IN ('Novo', 'Usado')),
    CONSTRAINT CHK_movimentacao_tipo CHECK (tipo_movimentacao IN ('Entrada por Compra', 'Entrada por Devolução', 'Saída por Descarte', 'Saída por Entrega', 'Ajuste de Inventário')),
    CONSTRAINT CHK_movimentacao_genero_tamanho CHECK (NOT (genero = 'Masculino' AND tamanho = 'PP'))
);`,

  query3Months: `--- ALERTA A: ADMISSÃO EXPERIÊNCIA COMPLEMENTADA (3 MESES) ---
-- Retorna os funcionários que completaram 3 meses de experiência do cargo e precisam de uniformes novos.
-- Regra: Data de Admissão igual ou superior a 3 meses a partir de hoje e nunca receberam um uniforme NOVO antes.

-- SINTAXE T-SQL (MICROSOFT SQL SERVER):
SELECT 
    id, 
    nome, 
    cpf, 
    data_admissao, 
    DATEDIFF(month, data_admissao, GETDATE()) AS meses_admissao
FROM funcionarios
WHERE 
    DATEDIFF(month, data_admissao, GETDATE()) >= 3
    AND id NOT IN (
        -- Filtra fora todos que já receberam alguma peça "Nova" anteriormente
        SELECT DISTINCT funcionario_id 
        FROM historico_entregas 
        WHERE condicao = 'Novo'
    )
ORDER BY data_admissao ASC;

-- SINTAXE SQLITE (Para o nosso simulador em runtime):
-- SELECT id, nome, cpf, data_admissao, 
--  CAST((julianday('now') - julianday(data_admissao)) / 30.4375 AS INT) AS meses_admissao
-- FROM funcionarios 
-- WHERE (julianday('now') - julianday(data_admissao)) >= 90
--  AND id NOT IN (SELECT DISTINCT funcionario_id FROM historico_entregas WHERE condicao = 'Novo');`,

  query1Year: `--- ALERTA B: TROCA ANUAL DE MULTI-PEÇAS (365 DIAS) ---
-- Identifica quais peças individuais Novas foram entregues a mais de 365 dias para cada colaborador,
-- que necessitam de substituição/renovação anual obrigatória.

-- SINTAXE T-SQL (MICROSOFT SQL SERVER):
WITH UltimasEntregasNovas AS (
    -- Busca a data da última entrega de uniforme NOVO de cada tipo de peça para cada funcionário
    SELECT 
        funcionario_id,
        item_id,
        tamanho,
        data_entrega,
        ROW_NUMBER() OVER(PARTITION BY funcionario_id, item_id ORDER BY data_entrega DESC) as rn
    FROM historico_entregas
    WHERE condicao = 'Novo'
)
SELECT 
    f.id AS funcionario_id,
    f.nome AS funcionario_nome,
    f.cpf AS funcionario_cpf,
    i.nome AS item_tipo,
    u.tamanho AS tamanho_entregue,
    u.data_entrega AS data_ultima_entrega,
    DATEDIFF(day, u.data_entrega, GETDATE()) AS dias_com_a_peca
FROM UltimasEntregasNovas u
JOIN funcionarios f ON u.funcionario_id = f.id
JOIN itens_uniforme i ON u.item_id = i.id
WHERE 
    u.rn = 1 -- Apenas a entrega mais recente de cada tipo
    AND DATEDIFF(day, u.data_entrega, GETDATE()) >= 365 -- Há mais de 1 ano
ORDER BY dias_com_a_peca DESC, f.nome ASC;`
};

export const CODE_ARCHITECTURE = `## Arquitetura de Software Multi-Camadas (Clean Architecture / DDD)

Para o ambiente Desktop corporativo, a proposta de arquitetura de código organiza-se em camadas bem delimitadas com responsabilidade única, isolamento e alto acoplamento apenas em abstrações.

\`\`\`
  [ Camada de Apresentação: Windows Forms / WPF / AvaloniaUI (MVVM / MVP) ]
                       |
                       v
  [ Camada de Aplicação / Negócio: Services (Executa Transações, Valida Regras) ]
                       |
     +-----------------+-----------------+
     |                                   |
     v                                   v
[ Abstração de Repositórios ]     [ Entidades de Domínio ]
     |
     v
[ Camada de Infraestrutura: Repositories ADO.NET / Dapper (SQL / DB SQLite) ]
\`\`\`

### Detalhamento das Responsabilidades:
1. **View / UI (Windows Presentation Foundation - WPF ou C# Windows Forms):**
   * Responsável por capturar os comandos do usuário, estruturar campos da grade de entrega e disparar as chamadas assíncronas de serviços.
   * Não executa queries SQL diretamente. Não faz commits de transações de banco.

2. **Application Service (Ex: UniformDeliveryService):**
   * Orquestra as regras do período de experiência e controle de estoque de forma transacional.
   * Inicia e finaliza a transação do banco de dados (\`dbTransaction\`).
   * Valida se a peça está disponível nas quantidades estocadas exatas antes de baixar.

3. **Domain / Business Model:**
   * Contém os objetos de representação nativa (\`Funcionario\`, \`ItemEstoque\`, \`Entrega\`), regras de validação intrínseca de negócio (Ex: \`Funcionario.IsInProbation(DateTime dataAdmissao)\`).

4. **Repository Layer (Dapper ou Entity Framework Core):**
   * Encapsula toda as operações de persistência DDL e DML de banco. Recebe a conexão do banco de dados e a transação correspondente para realizar as atualizações atômicas.
`;

export const CODE_IMPLEMENTATION_CSHARP = `using System;
using System.Transactions; // Para gerenciamento seguro de transações
using System.Data;
using System.Data.SqlClient; // Ou Microsoft.Data.SqlClient

public class UniformDeliveryService
{
    private readonly IStockRepository _stockRepository;
    private readonly IDeliveryRepository _deliveryRepository;
    private readonly IEmployeeRepository _employeeRepository;
    private readonly string _connectionString;

    public UniformDeliveryService(
        IStockRepository stockRepository,
        IDeliveryRepository deliveryRepository,
        IEmployeeRepository employeeRepository,
        string connectionString)
    {
        _stockRepository = stockRepository;
        _deliveryRepository = deliveryRepository;
        _employeeRepository = employeeRepository;
        _connectionString = connectionString;
    }

    /// <summary>
    /// Realiza a entrega física do uniforme baixando do estoque exato e gravando o log temporal do item.
    /// Esta operação é atômica e executada sob o escopo de uma Transação ACID.
    /// </summary>
    public void RegistrarEntrega(int funcionarioId, int itemId, string tamanho, string condicaoStr)
    {
        // 1. Validação de Argumentos
        if (!Enum.TryParse(condicaoStr, true, out UniformCondition condicao))
        {
            throw new ArgumentException("Condição de uniforme inválida. Deve ser 'Novo' ou 'Usado'.");
        }

        using (var connection = new SqlConnection(_connectionString))
        {
            connection.Open();
            
            // Inicia transação explícita
            using (var transaction = connection.BeginTransaction(IsolationLevel.RepeatableRead))
            {
                try
                {
                    // 2. Busca o funcionário e valida as regras de negócios preventivas
                    var funcionario = _employeeRepository.GetById(funcionarioId, connection, transaction);
                    if (funcionario == null)
                        throw new InvalidOperationException("Funcionário não localizado no sistema.");

                    // Calcula o tempo de contrato
                    double diasContratado = (DateTime.Today - funcionario.DataAdmissao).TotalDays;
                    bool emExperiencia = diasContratado < 90;

                    // Regra: Em experiência, deve receber preferencialmente peça Usada
                    if (emExperiencia && condicao == UniformCondition.Novo)
                    {
                        // Aqui o sistema pode disparar um aviso restritivo ou registrar auditoria extra
                        throw new InvalidOperationException(
                            $"O funcionário {funcionario.Nome} está no período de Experiência ({diasContratado:0} dias de admissão) " +
                            "e deve obrigatoriamente receber uniformes USADOS.");
                    }

                    // 3. Verifica o estoque do item exato de forma segura com lock (SELECT FOR UPDATE)
                    var gradeEstoque = _stockRepository.GetGrade(itemId, tamanho, condicao.ToString(), connection, transaction);
                    if (gradeEstoque == null)
                    {
                        throw new InvalidOperationException(
                            $"Variação de estoque não localizada para Item ID {itemId}, Tamanho {tamanho} e Condição {condicao}.");
                    }

                    if (gradeEstoque.Quantidade <= 0)
                    {
                        throw new InvalidOperationException(
                            $"Saldo indisponível em estoque para: {gradeEstoque.NomeItem} ({tamanho} / {condicao}). " +
                            $"Quantidade atual: 0.");
                    }

                    // 4. Executa a baixa decrementando 1 unidade
                    bool baixadoComSucesso = _stockRepository.DecrementarEstoque(
                        gradeEstoque.Id, 
                        connection, 
                        transaction
                    );

                    if (!baixadoComSucesso)
                        throw new DataException("Erro concorrente ao atualizar estoque do item.");

                    // 5. Salva histórico individualizado de entrega do item
                    var entregaItem = new HistoricoEntrega
                    {
                        FuncionarioId = funcionarioId,
                        ItemId = itemId,
                        Tamanho = tamanho,
                        Condicao = condicao.ToString(),
                        DataEntrega = DateTime.Today
                    };
                    
                    _deliveryRepository.GravarEntrega(entregaItem, connection, transaction);

                    // Se tudo deu certo, comita as alterações no banco de dados de maneira atômica
                    transaction.Commit();
                }
                catch (Exception ex)
                {
                    // Rollback automático descarta qualquer alteração realizada se houver qualquer erro
                    transaction.Rollback();
                    throw new ApplicationException($"A baixa e entrega do uniforme falharam. Erro: {ex.Message}", ex);
                }
            }
        }
    }
}

public enum UniformCondition
{
    Novo,
    Usado
}
`;
