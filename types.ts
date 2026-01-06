
export interface AirportRecord {
  airportName: string;
  category: string;
  timePeriod: string; 
  sourceFile: string; 
  passengers: {
    domestic: number;
    international: number;
    total: number;
    previousYear: number;
    previousMonth: number;
    growthPercentage: number;
  };
  cargo: {
    international: {
      inbound: number;
      outbound: number;
      total: number;
    };
    domestic: {
      inbound: number;
      outbound: number;
      total: number;
    };
    total: number;
    previousYear: number;
    previousMonth: number;
    growthPercentage: number;
  };
  atms: {
    domestic: {
      pax: number;
      cargo: number;
      total: number;
    };
    international: {
      pax: number;
      cargo: number;
      total: number;
    };
    total: number;
    previousYear: number;
    previousMonth: number;
    growthPercentage: number;
  };
  month: string;
  year: number;
  reportType: 'Monthly' | 'Yearly';
}

export interface AAIRecord {
  id: string;
  airportName: string;
  airportType: string; // New field for International, JV, Custom, Domestic, etc.
  dataType: 'Passengers' | 'Cargo' | 'ATMs';
  category: 'Domestic' | 'International' | 'Total';
  monthValue: number;
  prevMonthValue: number;
  monthChange: number;
  ytdValue: number;
  prevYtdValue: number;
  ytdChange: number;
  sourceFile: string;
  month: string;
  year: string;
  fiscalYear: string;
}

export interface ProcessedFileMeta {
  id: string;
  name: string;
  processedAt: string;
  recordCount: number;
  type: 'AAI' | 'APAO';
}
