
import * as XLSX from 'xlsx';
import { AirportRecord } from '../types';

export const exportToExcel = (data: AirportRecord[], fileName: string) => {
  const flattenedData = data.map(record => ({
    'Year': record.year,
    'Month': record.month,
    'Airport': record.airportName,
    'Total Pax': record.passengers.total,
    'Pax YoY%': record.passengers.growthPercentage,
    'DOM Pax': record.passengers.domestic,
    'INTL Pax': record.passengers.international,
    'Total Cargo': record.cargo.total,
    'Cargo YoY%': record.cargo.growthPercentage,
    'DOM Cargo': record.cargo.domestic.total,
    'INTL Cargo': record.cargo.international.total,
    'Total ATM': record.atms.total,
    'ATM YoY%': record.atms.growthPercentage,
    'DOM ATM': record.atms.domestic.total,
    'INTL ATM': record.atms.international.total,
    'DOM Pax ATM': record.atms.domestic.pax,
    'DOM Cargo ATM': record.atms.domestic.cargo,
    'INTL Pax ATM': record.atms.international.pax,
    'INTL Cargo ATM': record.atms.international.cargo
  }));

  const worksheet = XLSX.utils.json_to_sheet(flattenedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Airport Traffic Data');
  
  XLSX.writeFile(workbook, `${fileName}_Master_Export.xlsx`);
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
