// Códigos base para cada modelo de guindaste (baseado na tabela real)
export const CODIGOS_MODELOS = {
  // GSI (Internos)
  "GSI 6.5": "658100",
  "GSI 8.0": "800200", 
  "GSI 10.8": "108800",
  "GSI 8.0C": "800800", // Modelo canivete GSI
  "GSI 10.8C": "108900", // Modelo canivete GSI
  
  // GSE (Externos)
  "GSE 6.5T": "651000",
  "GSE 8.0T": "801000",
  "GSE 8.0C": "810500",
  "GSE 10.8T": "1081000",
  "GSE 10.8C": "1082000",
  "GSE 12.8T": "1281000",
  "GSE 13.0C": "131000",
  "GSE 15.0C": "151000",
  "GSE 15.8T": "1581000"
};

// Códigos para opcionais individuais (baseado na tabela real)
export const CODIGOS_OPCIONAIS = {
  "CR": "10",
  "EH": "20", 
  "ECL": "20",
  "ECS": "25",
  "Caminhão 3/4": "05"
};

// Códigos específicos para combinações pré-definidas baseados na tabela real
export const CODIGOS_COMPLETOS = {
  // GSI 6.5
  'GSI 6.5||': '658100',
  'GSI 6.5|CR': '658120',
  'GSI 6.5|ECS': '658125',
  'GSI 6.5|Caminhão 3/4': '658105',
  'GSI 6.5|Caminhão 3/4 CR': '658115',
  
  // GSI 8.0
  'GSI 8.0|Caminhão 3/4': '800260',
  'GSI 8.0|ECL': '800220',
  'GSI 8.0|ECS': '800230',
  'GSI 8.0|CR': '800210',
  'GSI 8.0|CR/ECL': '800240',
  'GSI 8.0|CR/ECS': '800250',
  'GSI 8.0|Caminhão 3/4 CR': '800270',
  
  // GSI 10.8
  'GSI 10.8|ECL': '108820',
  'GSI 10.8|ECS': '108830',
  'GSI 10.8|CR': '108810',
  'GSI 10.8|CR/ECL': '108840',
  'GSI 10.8|CR/ECS': '108850',
  
  // GSI 8.0C (Canivete)
  'GSI 8.0C|CR': '800810',
  'GSI 8.0C|CR/ECL': '800820',
  'GSI 8.0C|CR/ECS': '800830',
  'GSI 8.0C|ECL': '800840',
  'GSI 8.0C|ECS': '800850',
  'GSI 8.0C|CR/EH': '800860',
  'GSI 8.0C|EH': '800870',
  'GSI 8.0C|Caminhão 3/4': '800880',
  'GSI 8.0C|Caminhão 3/4 EH': '800890',
  
  // GSI 10.8C (Canivete)
  'GSI 10.8C|CR': '108910',
  'GSI 10.8C|CR/ECL': '108920',
  'GSI 10.8C|CR/ECS': '108930',
  'GSI 10.8C|ECL': '108940',
  'GSI 10.8C|ECS': '108950',
  
  // GSE 8.0C
  'GSE 8.0C|CR/EH': '810530',
  'GSE 8.0C|EH': '810520',
  'GSE 8.0C|Caminhão 3/4': '810540',
  'GSE 8.0C|Caminhão 3/4 EH': '810550',
  
  // GSE 10.8C
  'GSE 10.8C|CR': '1082010',
  'GSE 10.8C|CR/EH': '1082020',
  'GSE 10.8C|EH': '1082030',
  
  // GSE 13.0C
  'GSE 13.0C|EH': '131020',
  'GSE 13.0C|CR/EH': '131030',
  
  // GSE 15.0C
  'GSE 15.0C|EH': '151020',
  'GSE 15.0C|CR/EH': '151030',
  
  // GSE 6.5T
  'GSE 6.5T|Caminhão 3/4': '651040',
  'GSE 6.5T|Caminhão 3/4 CR': '651050',
  
  // GSE 8.0T
  'GSE 8.0T|Caminhão 3/4': '801040',
  'GSE 8.0T|Caminhão 3/4 CR/EH': '801050',
  'GSE 8.0T|CR': '801010',
  'GSE 8.0T|CR/EH': '801030',
  'GSE 8.0T|EH': '801020',
  
  // GSE 10.8T
  'GSE 10.8T|CR': '1081010',
  'GSE 10.8T|CR/EH': '1081030',
  'GSE 10.8T|EH': '1081020',
  
  // GSE 12.8T
  'GSE 12.8T|EH': '1281020',
  'GSE 12.8T|CR/EH': '1281030',
  'GSE 12.8T|CR/EH/P': '1281040',
  'GSE 12.8T|EH/GR': '1281050',
  
  // GSE 15.8T
  'GSE 15.8T|EH': '1581020',
  'GSE 15.8T|CR/EH': '1581030',
  'GSE 15.8T|CR/EH/P': '1581040',
  'GSE 15.8T|EH/P': '1581050'
};

// Descrições completas dos opcionais
export const DESCRICOES_OPCIONAIS = {
  "CR": "Controle Remoto",
  "EH": "Extensiva Hidráulica",
  "ECL": "Extensiva Cilindro Lateral", 
  "ECS": "Extensiva Cilindro Superior",
  "Caminhão 3/4": "Caminhão 3/4",
  "CR/ECL": "Controle Remoto + Extensiva Cilindro Lateral",
  "CR/ECS": "Controle Remoto + Extensiva Cilindro Superior",
  "CR/EH": "Controle Remoto + Extensiva Hidráulica",
  "EH/P": "Extensiva Hidráulica + Patola",
  "EH/GR": "Extensiva Hidráulica + Garra",
  "CR/EH/P": "Controle Remoto + Extensiva Hidráulica + Patola"
};

// Combinações válidas de opcionais baseadas na tabela real
export const COMBINACOES_VALIDAS = {
  "CR": ["ECL", "ECS", "EH"],
  "EH": ["CR", "P", "GR"],
  "ECL": ["CR"],
  "ECS": ["CR"],
  "Caminhão 3/4": ["CR", "EH"]
};

// Lista completa de opcionais disponíveis baseada na tabela real
export const OPCIONAIS_DISPONIVEIS = [
  { codigo: 'CR', nome: 'Controle Remoto' },
  { codigo: 'EH', nome: 'Extensiva Hidráulica' },
  { codigo: 'ECL', nome: 'Extensiva Cilindro Lateral' },
  { codigo: 'ECS', nome: 'Extensiva Cilindro Superior' },
  { codigo: 'Caminhão 3/4', nome: 'Caminhão 3/4' }
];

// Combinações pré-definidas baseadas na tabela real
export const COMBINACOES_PREDEFINIDAS = [
  { codigo: 'CR/ECL', nome: 'Controle Remoto + Extensiva Cilindro Lateral' },
  { codigo: 'CR/ECS', nome: 'Controle Remoto + Extensiva Cilindro Superior' },
  { codigo: 'CR/EH', nome: 'Controle Remoto + Extensiva Hidráulica' },
  { codigo: 'EH/P', nome: 'Extensiva Hidráulica + Patola' },
  { codigo: 'EH/GR', nome: 'Extensiva Hidráulica + Garra' },
  { codigo: 'CR/EH/P', nome: 'Controle Remoto + Extensiva Hidráulica + Patola' }
];

// Função para gerar código do produto
export const generateCodigoProduto = (modelo, opcionais = []) => {
  const sortedOpcionais = [...opcionais].sort();
  const opcionaisKey = sortedOpcionais.join('/');
  const fullKey = `${modelo}|${opcionaisKey}`;

  // Verificar se existe código específico para esta combinação
  if (CODIGOS_COMPLETOS[fullKey]) {
    return CODIGOS_COMPLETOS[fullKey];
  }

  // Se não existe código específico, gerar baseado no modelo + opcionais
  const baseCode = CODIGOS_MODELOS[modelo];
  if (!baseCode) return null;

  const sufixos = sortedOpcionais.map(opc => CODIGOS_OPCIONAIS[opc]).join('');
  return `${baseCode}${sufixos}`;
};

// Função para obter descrição completa do produto
export const getDescricaoProduto = (modelo, opcionais = []) => {
  if (opcionais.length === 0) {
    return `Guindaste ${modelo}`;
  }
  
  const opcionaisDesc = opcionais.map(opc => DESCRICOES_OPCIONAIS[opc] || opc).join(' + ');
  return `Guindaste ${modelo} ${opcionaisDesc}`;
};

// Função para validar combinação de opcionais
export const validarCombinacaoOpcionais = (opcionais) => {
  if (opcionais.length <= 1) return true;
  
  for (let i = 0; i < opcionais.length; i++) {
    for (let j = i + 1; j < opcionais.length; j++) {
      const opc1 = opcionais[i];
      const opc2 = opcionais[j];
      
      if (!COMBINACOES_VALIDAS[opc1]?.includes(opc2) && 
          !COMBINACOES_VALIDAS[opc2]?.includes(opc1)) {
        return false;
      }
    }
  }
  
  return true;
};
