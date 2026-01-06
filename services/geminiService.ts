
import { GoogleGenAI, Type } from "@google/genai";
import { AirportRecord, AAIRecord } from "../types";

const APAO_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    data: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          airportName: { type: Type.STRING },
          category: { type: Type.STRING },
          timePeriod: { type: Type.STRING },
          passengers: {
            type: Type.OBJECT,
            properties: {
              domestic: { type: Type.NUMBER },
              international: { type: Type.NUMBER },
              total: { type: Type.NUMBER },
              previousYear: { type: Type.NUMBER },
              previousMonth: { type: Type.NUMBER },
              growthPercentage: { type: Type.NUMBER }
            }
          },
          cargo: {
            type: Type.OBJECT,
            properties: {
              international: {
                type: Type.OBJECT,
                properties: { inbound: { type: Type.NUMBER }, outbound: { type: Type.NUMBER }, total: { type: Type.NUMBER } }
              },
              domestic: {
                type: Type.OBJECT,
                properties: { inbound: { type: Type.NUMBER }, outbound: { type: Type.NUMBER }, total: { type: Type.NUMBER } }
              },
              total: { type: Type.NUMBER },
              previousYear: { type: Type.NUMBER },
              growthPercentage: { type: Type.NUMBER }
            }
          },
          atms: {
            type: Type.OBJECT,
            properties: {
              domestic: {
                type: Type.OBJECT,
                properties: { 
                  pax: { type: Type.NUMBER, description: "Domestic Pax ATM" }, 
                  cargo: { type: Type.NUMBER, description: "Domestic Cargo ATM" }, 
                  total: { type: Type.NUMBER, description: "Total Domestic ATM" } 
                }
              },
              international: {
                type: Type.OBJECT,
                properties: { 
                  pax: { type: Type.NUMBER, description: "International Pax ATM" }, 
                  cargo: { type: Type.NUMBER, description: "International Cargo ATM" }, 
                  total: { type: Type.NUMBER, description: "Total International ATM" } 
                }
              },
              total: { type: Type.NUMBER },
              previousYear: { type: Type.NUMBER },
              growthPercentage: { type: Type.NUMBER }
            }
          },
          month: { type: Type.STRING },
          year: { type: Type.NUMBER },
          reportType: { type: Type.STRING }
        }
      }
    }
  }
};

const AAI_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    records: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          airportName: { type: Type.STRING },
          airportType: { type: Type.STRING, description: "Must be one of: International Airports, JV International Airports, Custom Airports, or Domestic Airports" },
          category: { type: Type.STRING, enum: ["Domestic", "International", "Total"] },
          monthValue: { type: Type.NUMBER },
          prevMonthValue: { type: Type.NUMBER },
          monthChange: { type: Type.NUMBER },
          ytdValue: { type: Type.NUMBER },
          prevYtdValue: { type: Type.NUMBER },
          ytdChange: { type: Type.NUMBER }
        },
        required: ["airportName", "airportType", "category", "monthValue", "prevMonthValue", "monthChange", "ytdValue", "prevYtdValue", "ytdChange"]
      }
    }
  }
};

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.status === 429 || error.status >= 500)) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export const extractAirportData = async (text: string): Promise<AirportRecord[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract APAO aviation traffic data from this text. Capture all airports and detailed columns including Passenger, Cargo, and ATM (split by Pax/Cargo for both Domestic and International). Text: ${text}`,
      config: { responseMimeType: "application/json", responseSchema: APAO_SCHEMA },
    });
    const result = JSON.parse(response.text || "{}");
    return result.data || [];
  });
};

export const extractAAIData = async (text: string, dataType: string): Promise<any[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Extract AAI ${dataType} statistics for ALL airports.
      
      CRITICAL INSTRUCTIONS:
      1. EXHAUSTIVE EXTRACTION: Do not skip any airports. Extract every row from the tables.
      2. AIRPORT TYPE CLASSIFICATION: Monitor the section headers in the text. 
         Identify if the airport belongs to:
         - "International Airports"
         - "JV International Airports"
         - "Custom Airports"
         - "Domestic Airports"
      3. CATEGORY DETECTION: Each airport row might have 'Domestic', 'International', and 'Total' sub-rows. Extract all of them correctly.
      4. VALUES: Extract Current Month Value, Previous Year Month Value, % Change, Current YTD, Previous YTD, YTD % Change.
      
      Input text:
      ${text}`,
      config: { 
        responseMimeType: "application/json", 
        responseSchema: AAI_SCHEMA,
        thinkingConfig: { thinkingBudget: 4000 }
      },
    });
    const result = JSON.parse(response.text || "{}");
    return result.records || [];
  });
};
