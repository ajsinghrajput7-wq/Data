
export interface AirportRecord {
  airportName: string;
  category: string;
  timePeriod: string; // e.g., "September 2024"
  sourceFile: string; // Track which file this came from
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

export interface ProcessedFileMeta {
  id: string;
  name: string;
  processedAt: string;
  recordCount: number;
}

export interface ExtractionResponse {
  data: AirportRecord[];
  metadata: {
    sourceFile: string;
    extractedAt: string;
    totalRecords: number;
  };
}
