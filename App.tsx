
import React, { useState, useMemo } from 'react';
import { Upload, FileText, FileSpreadsheet, Download, RefreshCw, BarChart3, ChevronRight, AlertCircle, Plane, Package, Users, Calendar, Plus, X, Layers, TrendingUp, Loader2, Table as TableIcon, History, ArrowUpDown, ChevronUp, ChevronDown, Activity, ArrowUpRight, ArrowDownRight, LayoutDashboard, Database, PieChart, CheckCircle2 } from 'lucide-react';
import { extractAirportData } from './services/geminiService';
import { exportToExcel, readSheetData } from './services/excelService';
import { extractTextFromPdf } from './services/pdfService';
import { AirportRecord } from './types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';

type SortKey = 'year' | 'month' | 'airportName' | 'totalPax' | 'paxYoY' | 'domPax' | 'intlPax' | 'totalCargo' | 'cargoYoY' | 'domCargo' | 'intlCargo' | 'totalAtm' | 'atmYoY' | 'domAtm' | 'intlAtm' | 'domPaxAtm' | 'domCargoAtm' | 'intlPaxAtm' | 'intlCargoAtm';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

const App: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [allRecords, setAllRecords] = useState<AirportRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'table' | 'charts'>('table');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'year', direction: 'desc' });

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const getMonthIndex = (m: string) => {
    const found = months.findIndex(name => m?.toLowerCase().startsWith(name.toLowerCase()));
    return found === -1 ? 0 : found;
  };

  const uniqueAirports = useMemo(() => Array.from(new Set(allRecords.map(r => r.airportName))).sort(), [allRecords]);
  const chartColors = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6', '#ef4444'];

  const sortedRecords = useMemo(() => {
    const items = [...allRecords];
    return items.sort((a, b) => {
      let valA: any, valB: any;
      switch (sortConfig.key) {
        case 'year': valA = a.year; valB = b.year; break;
        case 'month':
          if (a.year !== b.year) return sortConfig.direction === 'asc' ? a.year - b.year : b.year - a.year;
          valA = getMonthIndex(a.month); valB = getMonthIndex(b.month); break;
        case 'airportName': valA = a.airportName.toLowerCase(); valB = b.airportName.toLowerCase(); break;
        case 'totalPax': valA = a.passengers.total; valB = b.passengers.total; break;
        case 'domPax': valA = a.passengers.domestic; valB = b.passengers.domestic; break;
        case 'intlPax': valA = a.passengers.international; valB = b.passengers.international; break;
        case 'paxYoY': valA = a.passengers.growthPercentage || 0; valB = b.passengers.growthPercentage || 0; break;
        case 'totalCargo': valA = a.cargo.total; valB = b.cargo.total; break;
        case 'domCargo': valA = a.cargo.domestic.total; valB = b.cargo.domestic.total; break;
        case 'intlCargo': valA = a.cargo.international.total; valB = b.cargo.international.total; break;
        case 'cargoYoY': valA = a.cargo.growthPercentage || 0; valB = b.cargo.growthPercentage || 0; break;
        case 'totalAtm': valA = a.atms.total; valB = b.atms.total; break;
        case 'atmYoY': valA = a.atms.growthPercentage || 0; valB = b.atms.growthPercentage || 0; break;
        case 'domAtm': valA = a.atms.domestic.total; valB = b.atms.domestic.total; break;
        case 'intlAtm': valA = a.atms.international.total; valB = b.atms.international.total; break;
        case 'domPaxAtm': valA = a.atms.domestic.pax; valB = b.atms.domestic.pax; break;
        case 'domCargoAtm': valA = a.atms.domestic.cargo; valB = b.atms.domestic.cargo; break;
        case 'intlPaxAtm': valA = a.atms.international.pax; valB = b.atms.international.pax; break;
        case 'intlCargoAtm': valA = a.atms.international.cargo; valB = b.atms.international.cargo; break;
        default: valA = 0; valB = 0;
      }
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [allRecords, sortConfig]);

  const performanceTrends = useMemo(() => {
    const periodMap: Record<string, any> = {};
    allRecords.forEach(r => {
      const key = `${r.month} ${r.year}`;
      const sortKey = r.year * 100 + getMonthIndex(r.month);
      if (!periodMap[key]) periodMap[key] = { period: key, sortKey };
      periodMap[key][`pax_${r.airportName}`] = r.passengers.total;
      periodMap[key][`cargo_${r.airportName}`] = r.cargo.total;
      periodMap[key][`atm_${r.airportName}`] = r.atms.total;
    });
    return Object.values(periodMap).sort((a, b) => a.sortKey - b.sortKey);
  }, [allRecords]);

  const requestSort = (key: SortKey) => {
    let dir: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') dir = 'desc';
    setSortConfig({ key, direction: dir });
  };

  const getSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-20" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="ml-1 h-3 w-3 text-indigo-600" /> : <ChevronDown className="ml-1 h-3 w-3 text-indigo-600" />;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        setError(null);
        setSuccessMsg(null);
    }
  };

  const processFiles = async () => {
    if (!files.length) return;
    setIsProcessing(true);
    setError(null);
    setSuccessMsg(null);
    
    const newRecordsBatch: AirportRecord[] = [];
    let skipCount = 0;
    
    // Create a robust lookup of existing keys normalized by month index
    const existingKeys = new Set(allRecords.map(r => `${r.airportName.trim()}-${getMonthIndex(r.month)}-${r.year}`.toLowerCase()));

    try {
      for (let i = 0; i < files.length; i++) {
        setProcessingStatus(`Consolidating ${i + 1}/${files.length}: ${files[i].name}`);
        const ext = files[i].name.split('.').pop()?.toLowerCase();
        let text = "";
        if (ext === 'pdf') text = await extractTextFromPdf(files[i]);
        else if (['xlsx', 'xls', 'csv'].includes(ext || '')) text = await readSheetData(files[i]);
        
        const extractedData = await extractAirportData(text);
        
        extractedData.forEach(record => {
          // Normalize the unique key using month index for consistency
          const uniqueKey = `${record.airportName.trim()}-${getMonthIndex(record.month)}-${record.year}`.toLowerCase();
          
          if (!existingKeys.has(uniqueKey)) {
            newRecordsBatch.push(record);
            existingKeys.add(uniqueKey); // Prevent duplicates within the same upload batch
          } else {
            skipCount++;
          }
        });
      }

      if (newRecordsBatch.length === 0 && skipCount > 0) {
        setError(`Processing complete: All ${skipCount} data points were already present in the database. No new records added.`);
      } else if (newRecordsBatch.length > 0) {
        setAllRecords(prev => [...prev, ...newRecordsBatch]);
        setSuccessMsg(`Successfully imported ${newRecordsBatch.length} new records.${skipCount > 0 ? ` (Skipped ${skipCount} duplicates)` : ''}`);
      }
      
      setFiles([]);
    } catch (err: any) {
      setError(err.message || "Failed to structure files");
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  const clearAll = () => { if (window.confirm("Purge all master records?")) { setAllRecords([]); setSuccessMsg(null); setError(null); } };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 backdrop-blur-md bg-white/90">
        <div className="max-w-[2000px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-100">
              <Layers className="text-white h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">AAI Aviation Intelligence</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Consolidated Master Flow</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {allRecords.length > 0 && (
              <>
                <button onClick={() => document.getElementById('fi')?.click()} className="bg-white px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold flex items-center hover:bg-slate-50 transition-colors">
                  <Plus className="mr-2 h-4 w-4 text-indigo-600" /> Add Reports
                  <input id="fi" type="file" multiple hidden onChange={handleFileChange} />
                </button>
                <button onClick={() => exportToExcel(allRecords, 'AAI_Master_Database')} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all">
                  <Download className="mr-2 h-4 w-4" /> Export Master
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[2000px] mx-auto w-full p-6 space-y-6">
        {/* Unified Upload Area */}
        {(allRecords.length === 0 || files.length > 0) && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden max-w-2xl mx-auto mt-6 animate-in slide-in-from-top-4 duration-500">
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6"><Upload className="h-8 w-8" /></div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">Build Chronological Database</h2>
              <p className="text-slate-500 text-sm mb-10 max-w-sm mx-auto">Upload multiple monthly reports. The system automatically detects and skips duplicate records based on Airport, Month, and Year.</p>
              
              <div className="relative group max-w-lg mx-auto mb-8 cursor-pointer">
                <input type="file" multiple onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                <div className="border-2 border-dashed border-slate-300 rounded-3xl p-14 transition-all group-hover:border-indigo-400 group-hover:bg-indigo-50/10">
                  <FileSpreadsheet className="h-10 text-slate-300 mx-auto mb-4" />
                  <p className="text-sm font-bold text-slate-600">Select Multiple PDF/Excel Reports</p>
                </div>
              </div>

              {files.length > 0 && (
                <div className="mb-8 max-w-lg mx-auto text-left bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center"><History className="h-4 w-4 mr-2 text-indigo-500" /> Pending Processing ({files.length})</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-600 truncate">{f.name}</span>
                        <X className="h-3.5 w-3.5 text-slate-300 hover:text-rose-500 cursor-pointer" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={processFiles} disabled={isProcessing || !files.length} className="w-full max-w-lg py-4 rounded-2xl font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center">
                {isProcessing ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> {processingStatus}</> : "Process All Files"}
              </button>
            </div>
          </div>
        )}

        {/* Notifications */}
        <div className="max-w-2xl mx-auto space-y-4">
            {error && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center text-amber-800 text-sm animate-in fade-in zoom-in-95 duration-300">
                <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                <span className="font-medium">{error}</span>
                <button onClick={() => setError(null)} className="ml-auto text-amber-400 hover:text-amber-600"><X className="h-4 w-4" /></button>
            </div>
            )}
            {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center text-emerald-800 text-sm animate-in fade-in zoom-in-95 duration-300">
                <CheckCircle2 className="h-5 w-5 mr-3 flex-shrink-0" />
                <span className="font-medium">{successMsg}</span>
                <button onClick={() => setSuccessMsg(null)} className="ml-auto text-emerald-400 hover:text-emerald-600"><X className="h-4 w-4" /></button>
            </div>
            )}
        </div>

        {allRecords.length > 0 && (
          <div className="space-y-6 animate-in fade-in duration-1000">
            {/* Toolbar: Navigation Tabs & Actions */}
            <div className="flex flex-col lg:flex-row justify-between items-center bg-white p-4 rounded-3xl border border-slate-200 shadow-sm gap-4">
              <div className="flex items-center space-x-6">
                <div className="bg-slate-50 p-1.5 rounded-2xl flex space-x-1">
                  <button onClick={() => setActiveTab('table')} className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center ${activeTab === 'table' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}>
                    <TableIcon className="h-4 w-4 mr-2" /> Data Explorer
                  </button>
                  <button onClick={() => setActiveTab('charts')} className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center ${activeTab === 'charts' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}>
                    <BarChart3 className="h-4 w-4 mr-2" /> Analytics Hub
                  </button>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-indigo-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{allRecords.length} Consolidated Records</span>
                </div>
              </div>
              <button onClick={clearAll} className="px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all text-xs font-bold flex items-center">
                <RefreshCw className="h-3.5 w-3.5 mr-2" /> Clear Master Data
              </button>
            </div>

            {activeTab === 'table' ? (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[3000px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 backdrop-blur-md">
                      <th onClick={() => requestSort('year')} className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer bg-slate-50 hover:bg-slate-100 border-r border-slate-200">Year {getSortIcon('year')}</th>
                      <th onClick={() => requestSort('month')} className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer bg-slate-50 hover:bg-slate-100 border-r border-slate-200">Month {getSortIcon('month')}</th>
                      <th onClick={() => requestSort('airportName')} className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer sticky left-0 z-20 bg-slate-50 border-r border-slate-200">Airport {getSortIcon('airportName')}</th>
                      
                      <th onClick={() => requestSort('totalPax')} className="px-6 py-5 text-[10px] font-black text-indigo-600 uppercase tracking-widest text-center cursor-pointer bg-indigo-50/20 border-r border-slate-200">Total Pax</th>
                      <th onClick={() => requestSort('paxYoY')} className="px-6 py-5 text-[10px] font-black text-indigo-500 uppercase tracking-widest text-center cursor-pointer bg-indigo-50/10 border-r border-slate-200">Pax YoY%</th>
                      <th onClick={() => requestSort('domPax')} className="px-6 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center cursor-pointer border-r border-slate-200">DOM Pax</th>
                      <th onClick={() => requestSort('intlPax')} className="px-6 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center cursor-pointer border-r border-slate-200">INTL Pax</th>
                      
                      <th onClick={() => requestSort('totalCargo')} className="px-6 py-5 text-[10px] font-black text-emerald-600 uppercase tracking-widest text-center cursor-pointer bg-emerald-50/20 border-r border-slate-200">Total Cargo</th>
                      <th onClick={() => requestSort('cargoYoY')} className="px-6 py-5 text-[10px] font-black text-emerald-500 uppercase tracking-widest text-center cursor-pointer bg-emerald-50/10 border-r border-slate-200">Cargo YoY%</th>
                      <th onClick={() => requestSort('domCargo')} className="px-6 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center cursor-pointer border-r border-slate-200">DOM Cargo</th>
                      <th onClick={() => requestSort('intlCargo')} className="px-6 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center cursor-pointer border-r border-slate-200">INTL Cargo</th>

                      <th onClick={() => requestSort('totalAtm')} className="px-6 py-5 text-[10px] font-black text-slate-900 uppercase tracking-widest text-center cursor-pointer bg-slate-100 border-r border-slate-200">Total ATMs</th>
                      <th onClick={() => requestSort('atmYoY')} className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center cursor-pointer border-r border-slate-200">ATM YoY%</th>
                      <th onClick={() => requestSort('domAtm')} className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center cursor-pointer border-r border-slate-200">DOM ATMs</th>
                      <th onClick={() => requestSort('intlAtm')} className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center cursor-pointer border-r border-slate-200">INTL ATMs</th>
                      <th onClick={() => requestSort('domPaxAtm')} className="px-6 py-5 text-[10px] font-black text-blue-500 uppercase tracking-widest text-center cursor-pointer border-r border-slate-200">DOM Pax ATM</th>
                      <th onClick={() => requestSort('domCargoAtm')} className="px-6 py-5 text-[10px] font-black text-emerald-500 uppercase tracking-widest text-center cursor-pointer border-r border-slate-200">DOM Cargo ATM</th>
                      <th onClick={() => requestSort('intlPaxAtm')} className="px-6 py-5 text-[10px] font-black text-blue-600 uppercase tracking-widest text-center cursor-pointer border-r border-slate-200">INTL Pax ATM</th>
                      <th onClick={() => requestSort('intlCargoAtm')} className="px-6 py-5 text-[10px] font-black text-emerald-600 uppercase tracking-widest text-center cursor-pointer">INTL Cargo ATM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedRecords.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4 text-[11px] font-medium text-slate-500 border-r border-slate-100">{r.year}</td>
                        <td className="px-6 py-4 text-[11px] font-medium text-slate-500 border-r border-slate-100">{r.month}</td>
                        <td className="px-6 py-4 text-[11px] font-bold text-slate-900 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">{r.airportName}</td>
                        
                        <td className="px-6 py-4 text-[11px] font-black text-indigo-600 text-center bg-indigo-50/5 border-r border-slate-100">{r.passengers.total.toLocaleString()}</td>
                        <td className={`px-6 py-4 text-[10px] font-black text-center border-r border-slate-100 ${r.passengers.growthPercentage >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          <div className="flex items-center justify-center space-x-1">
                            {r.passengers.growthPercentage > 0 ? <ArrowUpRight className="h-3 w-3" /> : r.passengers.growthPercentage < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                            <span>{r.passengers.growthPercentage !== undefined ? `${Math.abs(r.passengers.growthPercentage)}%` : '—'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[11px] font-bold text-slate-600 text-center border-r border-slate-100">{r.passengers.domestic.toLocaleString()}</td>
                        <td className="px-6 py-4 text-[11px] font-bold text-slate-600 text-center border-r border-slate-100">{r.passengers.international.toLocaleString()}</td>
                        
                        <td className="px-6 py-4 text-[11px] font-black text-emerald-600 text-center bg-emerald-50/5 border-r border-slate-100">{r.cargo.total.toLocaleString()}</td>
                        <td className={`px-6 py-4 text-[10px] font-black text-center border-r border-slate-100 ${r.cargo.growthPercentage >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          <div className="flex items-center justify-center space-x-1">
                            {r.cargo.growthPercentage > 0 ? <ArrowUpRight className="h-3 w-3" /> : r.cargo.growthPercentage < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                            <span>{r.cargo.growthPercentage !== undefined ? `${Math.abs(r.cargo.growthPercentage)}%` : '—'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[11px] font-bold text-slate-600 text-center border-r border-slate-100">{r.cargo.domestic.total.toLocaleString()}</td>
                        <td className="px-6 py-4 text-[11px] font-bold text-slate-600 text-center border-r border-slate-100">{r.cargo.international.total.toLocaleString()}</td>

                        <td className="px-6 py-4 text-[11px] font-black text-slate-900 text-center border-r border-slate-100 bg-slate-50/30">{r.atms.total.toLocaleString()}</td>
                        <td className={`px-6 py-4 text-[10px] font-black text-center border-r border-slate-100 ${r.atms.growthPercentage >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {r.atms.growthPercentage !== undefined ? `${r.atms.growthPercentage > 0 ? '+' : ''}${r.atms.growthPercentage}%` : '—'}
                        </td>
                        <td className="px-6 py-4 text-[11px] font-medium text-slate-600 text-center border-r border-slate-100">{r.atms.domestic.total.toLocaleString()}</td>
                        <td className="px-6 py-4 text-[11px] font-medium text-slate-600 text-center border-r border-slate-100">{r.atms.international.total.toLocaleString()}</td>
                        <td className="px-6 py-4 text-[11px] font-bold text-blue-500 text-center border-r border-slate-100">{r.atms.domestic.pax.toLocaleString()}</td>
                        <td className="px-6 py-4 text-[11px] font-bold text-emerald-500 text-center border-r border-slate-100">{r.atms.domestic.cargo.toLocaleString()}</td>
                        <td className="px-6 py-4 text-[11px] font-bold text-blue-600 text-center border-r border-slate-100">{r.atms.international.pax.toLocaleString()}</td>
                        <td className="px-6 py-4 text-[11px] font-bold text-emerald-600 text-center">{r.atms.international.cargo.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><Users className="h-5 w-5" /></div>
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Pax (Consolidated)</h3>
                    </div>
                    <p className="text-4xl font-black text-slate-900">{allRecords.reduce((a, b) => a + b.passengers.total, 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><Package className="h-5 w-5" /></div>
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Cargo (MT)</h3>
                    </div>
                    <p className="text-4xl font-black text-slate-900">{allRecords.reduce((a, b) => a + b.cargo.total, 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Plane className="h-5 w-5" /></div>
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total ATM Flow</h3>
                    </div>
                    <p className="text-4xl font-black text-slate-900">{allRecords.reduce((a, b) => a + b.atms.total, 0).toLocaleString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-black text-slate-900 mb-8">Passenger contribution split by Month</h3>
                    <div className="h-[450px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={performanceTrends}>
                          <defs>
                            {uniqueAirports.map((ap, idx) => (
                              <linearGradient key={idx} id={`g-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={chartColors[idx % chartColors.length]} stopOpacity={0.4}/>
                                <stop offset="95%" stopColor={chartColors[idx % chartColors.length]} stopOpacity={0}/>
                              </linearGradient>
                            ))}
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="period" fontSize={10} axisLine={false} tickLine={false} />
                          <YAxis fontSize={10} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                          <Legend wrapperStyle={{ paddingTop: '24px', fontSize: '10px', fontWeight: 'bold' }} />
                          {uniqueAirports.map((ap, idx) => (
                            <Area key={ap} type="monotone" dataKey={`pax_${ap}`} name={ap} stackId="1" stroke={chartColors[idx % chartColors.length]} fill={`url(#g-${idx})`} strokeWidth={2} />
                          ))}
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-black text-slate-900 mb-8">ATM Movement distribution by Month</h3>
                    <div className="h-[450px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={performanceTrends}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="period" fontSize={10} axisLine={false} tickLine={false} />
                          <YAxis fontSize={10} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                          <Legend wrapperStyle={{ paddingTop: '24px', fontSize: '10px', fontWeight: 'bold' }} />
                          {uniqueAirports.map((ap, idx) => (
                            <Bar key={ap} dataKey={`atm_${ap}`} name={ap} stackId="atm" fill={chartColors[idx % chartColors.length]} radius={idx === uniqueAirports.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]} />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-10 mt-auto">
        <div className="max-w-[2000px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
          <p>© 2024 Aviation Intelligence Hub • v2.9.0 • Duplicate-Safe Engine</p>
          <div className="flex space-x-12 mt-6 md:mt-0">
            <span className="hover:text-indigo-500 transition-colors cursor-pointer">Security Protocol</span>
            <span className="hover:text-indigo-500 transition-colors cursor-pointer">Master Analytics</span>
            <span className="hover:text-indigo-500 transition-colors cursor-pointer">Export Logs</span>
          </div>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
};

export default App;
