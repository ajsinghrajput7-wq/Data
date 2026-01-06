
import * as XLSX from 'xlsx';
import { AirportRecord, AAIRecord } from '../types';

export const exportToExcel = (data: (AirportRecord | AAIRecord)[], fileName: string, type: 'AAI' | 'APAO') => {
  let flattenedData: any[] = [];

  if (type === 'APAO') {
    flattenedData = (data as AirportRecord[]).map(record => ({
      'Year': record.year,
      'Month': record.month,
      'Airport': record.airportName,
      'Total Pax': record.passengers?.total || 0,
      'Pax YoY%': record.passengers?.growthPercentage || 0,
      'DOM Pax': record.passengers?.domestic || 0,
      'INTL Pax': record.passengers?.international || 0,
      'Total Cargo': record.cargo?.total || 0,
      'Cargo YoY%': record.cargo?.growthPercentage || 0,
      'DOM Cargo': record.cargo?.domestic?.total || 0,
      'INTL Cargo': record.cargo?.international?.total || 0,
      'Total ATMs': record.atms?.total || 0,
      'INTL ATMs': record.atms?.international?.total || 0,
      'DOM ATMs': record.atms?.domestic?.total || 0,
      'DOM Pax ATM': record.atms?.domestic?.pax || 0,
      'DOM Cargo ATM': record.atms?.domestic?.cargo || 0,
      'INTL Pax ATM': record.atms?.international?.pax || 0,
      'INTL Cargo ATM': record.atms?.international?.cargo || 0,
      'Source File': record.sourceFile
    }));
  } else {
    flattenedData = (data as AAIRecord[]).map(record => ({
      'Year': record.year,
      'Month': record.month,
      'Airport Name': record.airportName,
      'Airport Type': record.airportType,
      'Data Type': record.dataType,
      'Category': record.category,
      'Fiscal Year': record.fiscalYear,
      'Current Month Value': record.monthValue,
      'Prev Year Month Value': record.prevMonthValue,
      'Month Change %': record.monthChange,
      'Current YTD': record.ytdValue,
      'Prev YTD': record.prevYtdValue,
      'YTD Change %': record.ytdChange,
      'Source File': record.sourceFile
    }));
  }

  const worksheet = XLSX.utils.json_to_sheet(flattenedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Export');
  
  XLSX.writeFile(workbook, `${fileName}_${type}_Export.xlsx`);
};

export const readSheetData = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      resolve(csv);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};
