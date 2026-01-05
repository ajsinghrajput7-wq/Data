
import { GoogleGenAI, Type } from "@google/genai";
import { AirportRecord } from "../types";

const EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    data: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          airportName: { type: Type.STRING, description: "Name of the airport" },
          category: { type: Type.STRING, description: "Airport category" },
          timePeriod: { type: Type.STRING, description: "The month and year of the report, e.g., 'Oct 2023'" },
          passengers: {
            type: Type.OBJECT,
            properties: {
              domestic: { type: Type.NUMBER },
              international: { type: Type.NUMBER },
              total: { type: Type.NUMBER },
              previousYear: { type: Type.NUMBER },
              previousMonth: { type: Type.NUMBER },
              growthPercentage: { type: Type.NUMBER }
            },
            required: ["domestic", "international", "total"]
          },
          cargo: {
            type: Type.OBJECT,
            properties: {
              international: {
                type: Type.OBJECT,
                properties: {
                  inbound: { type: Type.NUMBER },
                  outbound: { type: Type.NUMBER },
                  total: { type: Type.NUMBER }
                },
                required: ["inbound", "outbound", "total"]
              },
              domestic: {
                type: Type.OBJECT,
                properties: {
                  inbound: { type: Type.NUMBER },
                  outbound: { type: Type.NUMBER },
                  total: { type: Type.NUMBER }
                },
                required: ["inbound", "outbound", "total"]
              },
              total: { type: Type.NUMBER },
              previousYear: { type: Type.NUMBER },
              previousMonth: { type: Type.NUMBER },
              growthPercentage: { type: Type.NUMBER }
            },
            required: ["international", "domestic", "total"]
          },
          atms: {
            type: Type.OBJECT,
            properties: {
              domestic: {
                type: Type.OBJECT,
                properties: {
                  pax: { type: Type.NUMBER, description: "Domestic Passenger ATM" },
                  cargo: { type: Type.NUMBER, description: "Domestic Cargo ATM" },
                  total: { type: Type.NUMBER }
                },
                required: ["pax", "cargo", "total"]
              },
              international: {
                type: Type.OBJECT,
                properties: {
                  pax: { type: Type.NUMBER, description: "International Passenger ATM" },
                  cargo: { type: Type.NUMBER, description: "International Cargo ATM" },
                  total: { type: Type.NUMBER }
                },
                required: ["pax", "cargo", "total"]
              },
              total: { type: Type.NUMBER },
              previousYear: { type: Type.NUMBER },
              previousMonth: { type: Type.NUMBER },
              growthPercentage: { type: Type.NUMBER }
            },
            required: ["domestic", "international", "total"]
          },
          month: { type: Type.STRING },
          year: { type: Type.NUMBER },
          reportType: { type: Type.STRING, enum: ["Monthly", "Yearly"] }
        },
        required: ["airportName", "passengers", "cargo", "atms", "timePeriod"]
      }
    }
  },
  required: ["data"]
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
      contents: `You are an expert aviation data extractor. 
      Your task is to extract EVERY SINGLE ROW of traffic statistics from the provided AAI report. 
      Do not skip any airports. Ensure all columns (Domestic, International, Total, YoY Growth) are captured for Passengers, Cargo, and Aircraft Movements (ATMs).
      
      Look specifically for:
      - Passenger Traffic (DOM, INTL, TOTAL)
      - Cargo Traffic in MT (DOM, INTL, TOTAL)
      - Aircraft Movements (ATMs) with PAX/Cargo splits.
      
      If the text contains multiple tables, merge them into a single continuous list of records.
      
      Text to parse:
      ${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: EXTRACTION_SCHEMA,
      },
    });

    const textOutput = response.text;
    if (!textOutput) return [];
    const result = JSON.parse(textOutput);
    return result.data || [];
  });
};
