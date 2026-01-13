
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { AppState, LogEntry } from './types';
import { extractLogData } from './services/geminiService';
import { appendToGoogleSheet } from './services/sheetService';
import LogTable from './components/LogTable';

const SHEET_ID = "1_ZajSlwXmXnKrXs4j8SEqA_B_EUhyQ_Hzlt5PkZYtSs";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [existingLogs, setExistingLogs] = useState<LogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });

  const [manualForm, setManualForm] = useState({
    scNo: '', dtrCode: '', feederName: '', location: ''
  });
  const [activeVoiceField, setActiveVoiceField] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Robust Theme Sync
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      root.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    fetchRealData();
  }, []);

  const fetchRealData = async () => {
    setIsLoadingLogs(true);
    try {
      const response = await fetch(`${CSV_URL}&t=${Date.now()}`);
      if (!response.ok) throw new Error('Cloud Link Broken');
      const csvText = await response.text();
      const rows = parseCSV(csvText);
      
      const mappedData: LogEntry[] = rows.slice(1).map((row, index) => ({
        id: `sheet-${index}-${Date.now()}`,
        scNo: row[0] || '',
        dtrCode: row[1] || '',
        feederName: row[2] || '',
        location: row[3] || '',
        syncStatus: 'synced' as const,
        timestamp: row[4] || 'Cloud'
      })).filter(item => item.scNo || item.dtrCode);

      setExistingLogs(mappedData.reverse());
    } catch (err: any) {
      console.error("Data Fetch Error:", err);
      setError("Cloud Sync: Repository currently offline.");
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const parseCSV = (text: string) => {
    const rows: string[][] = [];
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      rows.push(values.map(v => v.replace(/^"|"$/g, '').trim()));
    }
    return rows;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setError(null);
    setAppState(AppState.PROCESSING);
    
    try {
      const fileList = Array.from(files) as File[];
      const base64Strings = await Promise.all(fileList.map(async (file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }));
      
      const extracted = await extractLogData(base64Strings);
      setEntries(extracted.map(e => ({ ...e, syncStatus: 'draft' as const })));
      setAppState(AppState.REVIEW);
    } catch (err: any) {
      setError(err.message || 'Processing Error. Ensure clear handwriting visibility.');
      setAppState(AppState.IDLE);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startVoiceTyping = (field: keyof typeof manualForm) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice Services Unavailable.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => {
      setActiveVoiceField(field);
      if (navigator.vibrate) navigator.vibrate(40);
    };
    
    recognition.onend = () => setActiveVoiceField(null);
    
    recognition.onresult = (event: any) => {
      let transcript = event.results[0][0].transcript.toLowerCase();
      
      // Expanded Industrial Digit Mapping
      const wordMap: Record<string, string> = {
        'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
        'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
        'oh': '0', 'double zero': '00', 'triple zero': '000', 'double o': '00',
        'triple o': '000', 'nought': '0'
      };

      // Replace word numbers with digits
      Object.keys(wordMap).forEach(word => {
        transcript = transcript.split(word).join(wordMap[word]);
      });

      // Strict cleaning for SC and DTR
      if (field === 'scNo' || field === 'dtrCode') {
        transcript = transcript.replace(/\s/g, ''); // Remove spaces
        if (field === 'scNo') transcript = transcript.replace(/\D/g, ''); // Digits only
      }

      setManualForm(prev => ({ ...prev, [field]: transcript.toUpperCase() }));
    };

    recognition.onerror = () => setActiveVoiceField(null);
    recognition.start();
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.scNo) {
      setError("SC Number is required.");
      return;
    }

    setError(null);
    setAppState(AppState.PROCESSING);
    
    const entry: LogEntry = {
      id: `manual-${Date.now()}`,
      ...manualForm,
      syncStatus: 'pending' as const,
      timestamp: new Date().toLocaleString()
    };

    const success = await appendToGoogleSheet([entry]);
    if (success) {
      setAppState(AppState.SUCCESS);
      setManualForm({ scNo: '', dtrCode: '', feederName: '', location: '' });
      setTimeout(fetchRealData, 3000);
    } else {
      setError("Cloud Append Failed. Check Permissions.");
      setAppState(AppState.IDLE);
    }
  };

  const handleBatchSync = async () => {
    if (entries.length === 0) return;
    setError(null);
    setAppState(AppState.PROCESSING);
    const success = await appendToGoogleSheet(entries);
    if (success) {
      setAppState(AppState.SUCCESS);
      setTimeout(fetchRealData, 3000);
    } else {
      setError("Batch Sync Failure.");
      setAppState(AppState.REVIEW);
    }
  };

  const reset = () => {
    setAppState(AppState.IDLE);
    setEntries([]);
    setError(null);
    fetchRealData();
  };

  const filteredLogs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return existingLogs.slice(0, 30);
    return existingLogs.filter(l => 
      l.scNo.toLowerCase().includes(q) || 
      l.dtrCode.toLowerCase().includes(q) ||
      l.feederName.toLowerCase().includes(q) || 
      l.location.toLowerCase().includes(q)
    );
  }, [searchQuery, existingLogs]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-500 pb-24">
      <header className="sticky top-0 z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 cursor-pointer group" onClick={reset}>
            <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div>
              <h1 className="font-black text-2xl tracking-tighter">LogAuto<span className="text-blue-600 italic">Fill</span></h1>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 -mt-1">Industrial Intelligence</p>
            </div>
          </div>
          
          <div className="hidden md:flex flex-1 max-w-xl relative group">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 pointer-events-none group-focus-within:text-blue-500 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </span>
            <input
              type="text"
              placeholder="Search history records..."
              className="w-full pl-11 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl text-sm font-semibold focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
             <button 
              onClick={fetchRealData} 
              disabled={isLoadingLogs}
              className={`p-3 rounded-2xl transition-all ${isLoadingLogs ? 'bg-blue-500/10 text-blue-500' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
            >
              <svg className={`w-5 h-5 ${isLoadingLogs ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-2xl transition-all border border-transparent dark:border-slate-800">
              {isDarkMode ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {error && (
          <div className="mb-10 p-5 bg-red-50 dark:bg-red-950/20 border-2 border-red-100 dark:border-red-900/30 rounded-3xl text-red-600 dark:text-red-400 flex items-center justify-between animate-in slide-in-from-top-4">
            <div className="flex items-center gap-3 font-bold text-sm">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
              {error}
            </div>
            <button onClick={() => setError(null)} className="p-2 hover:bg-red-100 rounded-xl transition-colors"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12"/></svg></button>
          </div>
        )}

        {appState === AppState.IDLE && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-5 space-y-8">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden">
                <h3 className="text-xl font-black mb-8 flex items-center gap-3 text-slate-900 dark:text-white">
                  <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></div>
                  Quick Log Entry
                </h3>
                
                <form onSubmit={handleManualSubmit} className="space-y-6">
                  {[
                    { id: 'scNo', label: 'Service Number (Digits)', placeholder: 'Spoken Digits Auto-detect', inputMode: 'numeric' },
                    { id: 'dtrCode', label: 'DTR ID', placeholder: 'e.g. DTR-88' },
                    { id: 'feederName', label: 'Feeder', placeholder: 'e.g. FEEDER-A' },
                    { id: 'location', label: 'Location', placeholder: 'Full Address' }
                  ].map((f) => (
                    <div key={f.id} className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-3">{f.label}</label>
                      <div className="relative group">
                        <input
                          type="text"
                          inputMode={f.inputMode as any}
                          required={f.id === 'scNo'}
                          placeholder={f.placeholder}
                          value={manualForm[f.id as keyof typeof manualForm]}
                          onChange={(e) => setManualForm(prev => ({ ...prev, [f.id]: e.target.value }))}
                          className="w-full px-5 py-4 bg-slate-100 dark:bg-slate-800/50 border-2 border-transparent dark:border-slate-800/50 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-white transition-all outline-none"
                        />
                        <div className="absolute inset-y-2 right-2 flex items-center">
                          <div className="relative">
                            {activeVoiceField === f.id && (
                              <div className="absolute inset-0 bg-red-500 rounded-xl animate-sonar scale-150"></div>
                            )}
                            <button
                              type="button"
                              onClick={() => startVoiceTyping(f.id as keyof typeof manualForm)}
                              className={`relative z-10 px-3.5 py-2.5 rounded-xl transition-all shadow-sm ${activeVoiceField === f.id ? 'bg-red-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400'}`}
                            >
                              <svg className={`w-4 h-4 ${activeVoiceField === f.id ? 'animate-bounce' : ''}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button type="submit" className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-3xl shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                    Submit Record
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 5l7 7m0 0l-7 7m7-7H3"/></svg>
                  </button>
                </form>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group cursor-pointer p-10 rounded-[2.5rem] border-2 border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-blue-500 hover:bg-blue-500/5 transition-all text-center"
              >
                <div className="w-20 h-20 mx-auto bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-all shadow-sm mb-4">
                  <svg className="w-10 h-10 text-slate-400 dark:text-slate-600 group-hover:text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                </div>
                <h4 className="font-black text-xl tracking-tight text-slate-900 dark:text-white">Industrial OCR Scan</h4>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Multi-row handwriting extraction</p>
              </div>

              <div 
                onClick={() => cameraInputRef.current?.click()}
                className="group cursor-pointer p-10 rounded-[2.5rem] border-2 border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-green-500 hover:bg-green-500/5 transition-all text-center"
              >
                <div className="w-20 h-20 mx-auto bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center group-hover:scale-110 group-hover:bg-green-100 dark:group-hover:bg-green-900/30 transition-all shadow-sm mb-4">
                  <svg className="w-10 h-10 text-slate-400 dark:text-slate-600 group-hover:text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 3c4.97 0 9 3.582 9 8s-4.03 8-9 8c-1.946 0-3.77-.577-5.3-1.559A6 6 0 0 1 3 11c0-4.418 4.03-8 9-8zm0 0c4.97 0 9 3.582 9 8s-4.03 8-9 8c-1.946 0-3.77-.577-5.3-1.559A6 6 0 0 1 3 11c0-4.418 4.03-8 9-8z"/><circle cx="12" cy="11" r="2.5" fill="none" stroke="currentColor" strokeWidth="2.5"/></svg>
                </div>
                <h4 className="font-black text-xl tracking-tight text-slate-900 dark:text-white">Camera Capture</h4>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Real-time photo upload</p>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xl font-black flex items-center gap-3 text-slate-900 dark:text-white">
                  <div className="w-2 h-7 bg-blue-600 rounded-full"></div>
                  Cloud Sync History
                </h3>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-xl overflow-hidden min-h-[500px]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-separate border-spacing-0">
                    <thead className="bg-slate-50 dark:bg-slate-950/50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b dark:border-slate-800">Status</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b dark:border-slate-800">SC Number</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b dark:border-slate-800">DTR Code</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b dark:border-slate-800">Feeder Name</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b dark:border-slate-800">Site</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredLogs.map(l => (
                        <tr key={l.id} className="hover:bg-blue-50/40 dark:hover:bg-blue-500/5 transition-all group">
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-2 h-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50"></div>
                              <span className="text-[9px] font-black text-green-600 dark:text-green-500 uppercase tracking-widest">Synced</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 font-mono text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{l.scNo}</td>
                          <td className="px-6 py-5 text-xs font-bold text-slate-600 dark:text-slate-400">{l.dtrCode}</td>
                          <td className="px-6 py-5 text-[11px] font-medium text-slate-600 dark:text-slate-400">{l.feederName}</td>
                          <td className="px-6 py-5 text-[11px] text-slate-400 font-medium italic truncate max-w-[150px]">{l.location}</td>
                        </tr>
                      ))}
                      {filteredLogs.length === 0 && !isLoadingLogs && (
                        <tr><td colSpan={5} className="py-40 text-center font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.3em] text-xs">No records found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {appState === AppState.PROCESSING && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-10 animate-in zoom-in duration-500">
            <div className="relative">
              <div className="w-32 h-32 border-[10px] border-blue-500/10 rounded-full"></div>
              <div className="absolute inset-0 w-32 h-32 border-[10px] border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="text-center space-y-3">
              <h3 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">Cloud Linking...</h3>
              <p className="text-slate-400 font-black animate-pulse text-[10px] uppercase tracking-[0.4em]">Establishing Secure Handshake</p>
            </div>
          </div>
        )}

        {appState === AppState.REVIEW && (
          <div className="space-y-10 animate-in slide-in-from-bottom-10 duration-500">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <button onClick={reset} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-md text-slate-500 active:scale-90 transition-all"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg></button>
                <div className="space-y-1">
                  <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Audit Hub</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Verification required before final sync</p>
                </div>
              </div>
              <button onClick={handleBatchSync} className="w-full sm:w-auto px-12 py-5 bg-blue-600 text-white font-black rounded-3xl shadow-xl shadow-blue-500/40 flex items-center justify-center gap-3 hover:bg-blue-700 active:scale-95 transition-all">
                Append All Data
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
              </button>
            </div>
            <LogTable entries={entries} onChange={setEntries} />
          </div>
        )}

        {appState === AppState.SUCCESS && (
          <div className="flex flex-col items-center justify-center py-32 space-y-12 animate-in zoom-in-95 duration-700">
            <div className="w-40 h-40 bg-green-100 dark:bg-green-500/10 rounded-[4rem] flex items-center justify-center text-green-600 shadow-xl relative">
              <div className="absolute inset-0 bg-green-400 rounded-[4rem] animate-ping opacity-10"></div>
              <svg className="w-20 h-20 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" d="M5 13l4 4L19 7"/></svg>
            </div>
            <div className="text-center space-y-4">
              <h3 className="text-6xl font-black tracking-tighter text-slate-900 dark:text-white">Record Sync'd</h3>
              <p className="text-xl text-slate-500 font-bold max-w-sm mx-auto leading-relaxed">The data has been successfully committed to your Google Sheets database.</p>
            </div>
            <button onClick={reset} className="px-16 py-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-[2.5rem] shadow-xl hover:scale-105 active:scale-95 transition-all text-lg tracking-tight">Return to Dashboard</button>
          </div>
        )}
      </main>

      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
    </div>
  );
};

export default App;
