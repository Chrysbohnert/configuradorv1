const value = (cell) => {
  if (cell && typeof cell === 'object') {
    if ('result' in cell) return cell.result;
    if ('text' in cell) return cell.text;
  }
  return cell ?? '';
};

const number = (input) => {
  if (typeof input === 'number') return Number.isFinite(input) ? input : 0;
  const raw = String(input ?? '').trim();
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const percent = (input) => {
  
  const raw = String(input ?? '').trim();
  const parsed = number(raw.replace('%', ''));
  if (raw.endsWith('%')) return parsed;
  return Math.abs(parsed) >= 1 ? parsed : parsed * 100;
};

const percentCell = (input) => `${number(input).toLocaleString('pt-BR', { maximumFractionDigits: 6 })}%`;

const importedPercent = (input, current) => input === undefined ? number(current) : percent(input);

const rowsFromSheet = (worksheet) => {
  if (!worksheet || worksheet.rowCount < 2) return [];
  const headers = worksheet.getRow(1).values.slice(1).map((header) => String(value(header)).trim());
  const rows = [];
  worksheet.eachRow((row, index) => {
    if (index === 1) return;
    const item = {};
    headers.forEach((header, column) => {
      item[header] = value(row.getCell(column + 1).value);
    });
    if (Object.values(item).some((itemValue) => String(itemValue ?? '').trim() !== '')) rows.push(item);
  });
  return rows;
};

const addSheet = (workbook, name, columns, rows) => {
  const worksheet = workbook.addWorksheet(name);
  worksheet.columns = columns.map((header) => ({ header, key: header, width: Math.max(14, header.length + 2) }));
  rows.forEach((row) => worksheet.addRow(row));
  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
};

export async function exportarPrecificacaoExcel({ condicoes, tributacoes, parametros }) {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  addSheet(workbook, 'Condicoes', ['ID', 'ENTRADA %', 'TAXA ANUAL %'], condicoes.map((item) => ({
    ID: item.id,
    'ENTRADA %': percentCell(item.entrada_percent),
    'TAXA ANUAL %': percentCell(item.taxa_anual_percent),
  })));
  addSheet(workbook, 'Impostos', [
    'UF', 'NCM', 'CONTRIBUINTE %', 'NAO CONTRIBUINTE %', 'PIS COFINS %',
  ], tributacoes.map((item) => ({
    UF: item.uf,
    NCM: item.ncm,
    'CONTRIBUINTE %': percentCell(item.icms_contribuinte_percent),
    'NAO CONTRIBUINTE %': percentCell(item.icms_nao_contribuinte_percent),
    'PIS COFINS %': percentCell(item.pis_cofins_percent),
  })));
  addSheet(workbook, 'Parametros', [
    'IRPJ %', 'CSLL %', 'DESCONTO COMERCIAL MAX %',
    'PASSO DESCONTO POR PARCELA %', 'COMISSAO BASE %', 'DESCONTO MAX COMISSAO %',
  ], [{
    'IRPJ %': percentCell(parametros.irpj_percent),
    'CSLL %': percentCell(parametros.csll_percent),
    'DESCONTO COMERCIAL MAX %': percentCell(parametros.desconto_comercial_max_percent),
    'PASSO DESCONTO POR PARCELA %': percentCell(parametros.passo_desconto_parcela_percent),
    'COMISSAO BASE %': percentCell(parametros.comissao_base_vendedor_percent),
    'DESCONTO MAX COMISSAO %': percentCell(parametros.comissao_cedivel_max_percent),
  }]);
  const buffer = await workbook.xlsx.writeBuffer();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }));
  link.download = 'banco-de-dados-precificacao.xlsx';
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function analisarPrecificacaoExcel(file, condicoes, tributacoes, parametrosAtuais) {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const condicoesRows = rowsFromSheet(workbook.getWorksheet('Condicoes'));
  const condicoesPorId = new Map(condicoes.map((item) => [String(item.id), item]));
  const condicoesImportadas = condicoesRows.map((row) => ({
    id: String(row.ID ?? '').trim(),
    entrada_percent: percent(row['ENTRADA %'] ?? row.ENTRADA),
    taxa_anual_percent: percent(row['TAXA ANUAL %'] ?? row['TAXA ANUAL']),
  }));
  const errosCondicoes = condicoesImportadas
    .filter((item) => !item.id || !condicoesPorId.has(item.id))
    .map((item) => item.id ? `Condição ID ${item.id} não encontrada` : 'Condição sem ID estável');

  const impostosSheet = workbook.getWorksheet('Impostos') || workbook.getWorksheet('ICMS');
  const impostosPorChave = new Map(tributacoes.map((item) => [`${item.uf}|${item.ncm}`, item]));
  const tributacoesImportadas = rowsFromSheet(impostosSheet).map((row) => {
    const uf = String(row.UF ?? '').trim().toUpperCase();
    const ncm = String(row.NCM ?? 'PADRAO').trim() || 'PADRAO';
    return {
      id: impostosPorChave.get(`${uf}|${ncm}`)?.id || null,
      uf,
      ncm,
      icms_contribuinte_percent: percent(row['CONTRIBUINTE %'] ?? row.CONTRIBUINTE),
      icms_nao_contribuinte_percent: percent(row['NAO CONTRIBUINTE %'] ?? row['NAO CONTRIBUINTE']),
      pis_cofins_percent: percent(row['PIS COFINS %'] ?? row['PIS COFINS']),
    };
  }).filter((item) => item.uf);

  const parametro = rowsFromSheet(workbook.getWorksheet('Parametros'))[0];
  const parametros = parametro ? {
    irpj_percent: importedPercent(parametro['IRPJ %'], parametrosAtuais.irpj_percent),
    csll_percent: importedPercent(parametro['CSLL %'], parametrosAtuais.csll_percent),
    ipi_padrao_percent: number(parametrosAtuais.ipi_padrao_percent),
    desconto_comercial_max_percent: importedPercent(parametro['DESCONTO COMERCIAL MAX %'], parametrosAtuais.desconto_comercial_max_percent),
    passo_desconto_parcela_percent: importedPercent(parametro['PASSO DESCONTO POR PARCELA %'], parametrosAtuais.passo_desconto_parcela_percent),
    comissao_base_vendedor_percent: importedPercent(parametro['COMISSAO BASE %'], parametrosAtuais.comissao_base_vendedor_percent),
    comissao_cedivel_max_percent: importedPercent(parametro['DESCONTO MAX COMISSAO %'], parametrosAtuais.comissao_cedivel_max_percent),
  } : null;

  return {
    arquivo: file.name,
    erros: errosCondicoes,
    condicoes: condicoesImportadas,
    tributacoes: tributacoesImportadas,
    parametros,
  };
}
