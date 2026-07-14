// scratch/test_excel.js
const ExcelJS = require('exceljs');
const fs = require('fs');

async function testExport() {
  console.log('Simulating Excel Export...');

  // Mock data representing bodegas
  const sortedBodegas = [
    { id: 1, nombre: 'Bodega Principal', es_virtual: false },
    { id: 2, nombre: 'Bodega Norte', es_virtual: false },
    { id: 3, nombre: 'Bodega Virtual B2C', es_virtual: true },
    { id: 4, nombre: 'Bodega Virtual B2B', es_virtual: true },
  ];

  // Mock familias data
  const familias = [
    {
      familia: 'F001-001A',
      descripcion: 'Playeras Deportivas Premium',
      total_productos: 3,
      skus: [
        { id: 101, sku_base: 'PL-3001', descripcion: 'Playera Azul M', activo: true },
        { id: 102, sku_base: 'PL-3002', descripcion: 'Playera Roja L', activo: true },
        { id: 103, sku_base: 'PL-3003', descripcion: 'Playera Verde XL', activo: false }, // Inactive
      ]
    },
    {
      familia: 'F001-002B',
      descripcion: 'Pantalones Slim Fit',
      total_productos: 1,
      skus: [
        { id: 104, sku_base: 'PA-5001', descripcion: 'Pantalon Mezclilla 32', activo: true },
      ]
    },
    {
      familia: 'F001-003A',
      descripcion: 'Accesorios de Invierno',
      total_productos: 2,
      skus: [
        { id: 105, sku_base: 'AC-1001', descripcion: 'Bufanda Lana', activo: false }, // Inactive
        { id: 106, sku_base: 'AC-1002', descripcion: 'Guantes Piel', activo: false }, // Inactive
      ]
    }
  ];

  // Stock Map mock
  const stockMap = {
    101: { 1: 5, 2: 10, 3: 0, 4: 2 },
    102: { 1: 2, 2: 0, 3: 1, 4: 0 },
    103: { 1: 15, 2: 8, 3: 12, 4: 5 },
    104: { 1: 0, 2: 0, 3: 0, 4: 0 },
    105: { 1: 3, 2: 1, 3: 0, 4: 0 },
    106: { 1: 4, 2: 0, 3: 0, 4: 0 },
  };

  const stagedMoves = {};
  const autoRenames = {};

  // We test for showInactivos = false (default) and showInactivos = true
  await generateSheet(sortedBodegas, familias, stockMap, stagedMoves, autoRenames, false, 'scratch/reporte_activos_only.xlsx');
  await generateSheet(sortedBodegas, familias, stockMap, stagedMoves, autoRenames, true, 'scratch/reporte_con_inactivos.xlsx');

  console.log('Test Excel sheets generated successfully!');
}

async function generateSheet(sortedBodegas, familias, stockMap, stagedMoves, autoRenames, mostrarInactivos, outputPath) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Familias Agrupadas', {
    views: [{ showGridLines: true }]
  });

  const columnsList = [
    { header: 'DESCRIPCION', key: 'descripcion', width: 55 },
    { header: 'ESTILO', key: 'estilo', width: 18 },
    { header: 'FAMILIA', key: 'familia', width: 18 },
  ];

  sortedBodegas.forEach(b => {
    columnsList.push({
      header: b.nombre.toUpperCase(),
      key: `b_${b.id}`,
      width: 12
    });
  });

  columnsList.push({
    header: 'GLOBAL',
    key: 'global',
    width: 14
  });

  worksheet.columns = columnsList;

  const thinStyle = 'thin';
  const mediumStyle = 'medium';

  const headerRow = worksheet.getRow(1);
  headerRow.height = 90;
  headerRow.eachCell((cell, colNumber) => {
    if (colNumber <= 3) {
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFB4C6E7' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: thinStyle, color: { argb: 'FF8596B0' } },
        left: { style: thinStyle, color: { argb: 'FF8596B0' } },
        bottom: { style: mediumStyle, color: { argb: 'FF8596B0' } },
        right: { style: thinStyle, color: { argb: 'FF8596B0' } },
      };
    } else if (colNumber === 3 + sortedBodegas.length + 1) {
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFDC2626' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEE2E2' },
      };
      cell.alignment = { textRotation: 45, horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: thinStyle, color: { argb: 'FF8596B0' } },
        left: { style: thinStyle, color: { argb: 'FF8596B0' } },
        bottom: { style: mediumStyle, color: { argb: 'FF8596B0' } },
        right: { style: thinStyle, color: { argb: 'FF8596B0' } },
      };
    } else {
      const b = sortedBodegas[colNumber - 4];
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF000000' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: b.es_virtual ? 'FFFCE4D6' : 'FFDDEBF7' },
      };
      cell.alignment = { textRotation: 45, horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: thinStyle, color: { argb: 'FF8596B0' } },
        left: { style: thinStyle, color: { argb: 'FF8596B0' } },
        bottom: { style: mediumStyle, color: { argb: 'FF8596B0' } },
        right: { style: thinStyle, color: { argb: 'FF8596B0' } },
      };
    }
  });

  const sorted = [...familias].sort((a, b) => {
    const nameA = a.familia || '';
    const nameB = b.familia || '';
    return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
  });

  let currentRow = 2;
  const thinBorder = {
    top: { style: thinStyle, color: { argb: 'FFD3D3D3' } },
    left: { style: thinStyle, color: { argb: 'FFD3D3D3' } },
    bottom: { style: thinStyle, color: { argb: 'FFD3D3D3' } },
    right: { style: thinStyle, color: { argb: 'FFD3D3D3' } },
  };

  function getColumnLetter(colIndex) {
    let temp = colIndex;
    let letter = '';
    while (temp > 0) {
      const modulo = (temp - 1) % 26;
      letter = String.fromCharCode(65 + modulo) + letter;
      temp = Math.floor((temp - modulo) / 26);
    }
    return letter;
  }

  sorted.forEach((f) => {
    const name = f.familia || 'Sin Clasificar';
    const desc = f.descripcion || '';
    
    // Filtrar skus en base a mostrarInactivos
    const skusList = (f.skus || []).filter(s => {
      const currentDest = stagedMoves[s.id];
      const isHere = currentDest !== undefined ? currentDest === f.familia : true;
      if (!isHere) return false;
      return mostrarInactivos || s.activo !== false;
    });

    // Agregar los staged moves que pertenecen a esta familia
    Object.entries(stagedMoves).forEach(([prodIdStr, destFamily]) => {
      if (destFamily === f.familia) {
        const prodId = parseInt(prodIdStr, 10);
        if (!skusList.some(s => s.id === prodId)) {
          let foundSku;
          for (const origFam of familias) {
            const item = origFam.skus?.find(s => s.id === prodId);
            if (item) {
              foundSku = item;
              break;
            }
          }
          if (foundSku && (mostrarInactivos || foundSku.activo !== false)) {
            skusList.push(foundSku);
          }
        }
      }
    });

    if (skusList.length > 0) {
      const startMerge = currentRow;
      skusList.forEach((sku, idx) => {
        const rowValues = {
          descripcion: idx === 0 ? desc : '',
          estilo: sku.sku_base,
          familia: name,
        };

        sortedBodegas.forEach(b => {
          rowValues[`b_${b.id}`] = '';
        });

        const startColLetter = getColumnLetter(4);
        const endColLetter = getColumnLetter(4 + sortedBodegas.length - 1);
        rowValues['global'] = { formula: `=SUM(${startColLetter}${currentRow}:${endColLetter}${currentRow})` };

        const row = worksheet.addRow(rowValues);
        row.height = 24;

        const maxCols = 3 + sortedBodegas.length + 1;
        for (let c = 1; c <= maxCols; c++) {
          const cell = row.getCell(c);
          cell.font = { name: 'Calibri', size: 10.5 };
          cell.border = thinBorder;
          
          if (c === 1) {
            cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
          } else if (c === 2) {
            cell.font = { 
              name: 'Calibri', 
              size: 10.5, 
              bold: true,
              color: { argb: sku.activo === false ? 'FFFF0000' : 'FF000000' }
            };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if (c === 3) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if (c === maxCols) {
            cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FFDC2626' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.font = {
              name: 'Calibri',
              size: 10.5,
              bold: false,
              color: { argb: 'FF000000' }
            };
          }
        }
        currentRow++;
      });
      const endMerge = currentRow - 1;

      if (endMerge > startMerge) {
        worksheet.mergeCells(`A${startMerge}:A${endMerge}`);
        const mergedCell = worksheet.getCell(`A${startMerge}`);
        mergedCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

        for (let r = startMerge; r <= endMerge; r++) {
          worksheet.getCell(`A${r}`).border = thinBorder;
        }
      }
    }
  });

  currentRow++;

  const totalsRowIdx = currentRow;
  const namesRowIdx = currentRow + 1;

  const totalsRow = worksheet.getRow(totalsRowIdx);
  const namesRow = worksheet.getRow(namesRowIdx);

  totalsRow.height = 24;
  namesRow.height = 24;

  const cellTotalesLabel = worksheet.getCell(totalsRowIdx, 3);
  cellTotalesLabel.value = 'TOTALES:';
  cellTotalesLabel.font = { name: 'Calibri', size: 11, bold: true };
  cellTotalesLabel.alignment = { horizontal: 'right', vertical: 'middle' };

  const cellBodegasLabel = worksheet.getCell(namesRowIdx, 3);
  cellBodegasLabel.value = 'BODEGAS:';
  cellBodegasLabel.font = { name: 'Calibri', size: 11, bold: true };
  cellBodegasLabel.alignment = { horizontal: 'right', vertical: 'middle' };

  for (let c = 1; c <= 3; c++) {
    worksheet.getCell(totalsRowIdx, c).border = thinBorder;
    worksheet.getCell(namesRowIdx, c).border = thinBorder;
  }

  sortedBodegas.forEach((b, idx) => {
    const colNumber = 4 + idx;
    const colLetter = getColumnLetter(colNumber);

    const sumCell = worksheet.getCell(totalsRowIdx, colNumber);
    sumCell.value = { formula: `=SUM(${colLetter}2:${colLetter}${totalsRowIdx - 2})` };
    sumCell.font = { name: 'Calibri', size: 11, bold: true };
    sumCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sumCell.border = thinBorder;

    const nameCell = worksheet.getCell(namesRowIdx, colNumber);
    nameCell.value = b.nombre.toUpperCase();
    nameCell.font = { name: 'Calibri', size: 9, color: { argb: 'FF555555' } };
    nameCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    nameCell.border = thinBorder;
    nameCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEAEAEA' }
    };
  });

  const globalColNumber = 4 + sortedBodegas.length;
  const globalColLetter = getColumnLetter(globalColNumber);

  const globalSumCell = worksheet.getCell(totalsRowIdx, globalColNumber);
  globalSumCell.value = { formula: `=SUM(${globalColLetter}2:${globalColLetter}${totalsRowIdx - 2})` };
  globalSumCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFDC2626' } };
  globalSumCell.alignment = { horizontal: 'center', vertical: 'middle' };
  globalSumCell.border = thinBorder;

  const globalNameCell = worksheet.getCell(namesRowIdx, globalColNumber);
  globalNameCell.value = 'TOTAL';
  globalNameCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFDC2626' } };
  globalNameCell.alignment = { horizontal: 'center', vertical: 'middle' };
  globalNameCell.border = thinBorder;
  globalNameCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFEE2E2' }
  };

  const buffer = await workbook.xlsx.writeBuffer();
  fs.writeFileSync(outputPath, buffer);
}

testExport().catch(console.error);
