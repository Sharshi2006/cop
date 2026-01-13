
import React from 'react';
import { LogEntry } from '../types';

interface LogTableProps {
  entries: LogEntry[];
  onChange: (updatedEntries: LogEntry[]) => void;
}

const LogTable: React.FC<LogTableProps> = ({ entries, onChange }) => {
  const handleCellChange = (id: string, field: keyof LogEntry, value: string) => {
    const updated = entries.map(entry => {
      if (entry.id === id) {
        return { ...entry, [field]: value };
      }
      return entry;
    });
    onChange(updated);
  };

  const removeRow = (id: string) => {
    onChange(entries.filter(e => e.id !== id));
  };

  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl transition-all duration-300">
      <table className="w-full text-left border-collapse min-w-[800px]">
        <thead>
          <tr className="bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-md">
            <th className="px-6 py-5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">SC Number</th>
            <th className="px-6 py-5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">DTR Code</th>
            <th className="px-6 py-5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">Feeder Name</th>
            <th className="px-6 py-5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">Location</th>
            <th className="px-6 py-5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800 w-20"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
          {entries.map((entry) => (
            <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
              <td className="px-4 py-4">
                <div className="relative">
                  <input
                    type="text"
                    value={entry.scNo}
                    onChange={(e) => handleCellChange(entry.id, 'scNo', e.target.value)}
                    className={`w-full p-3 text-sm font-bold bg-transparent border-2 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:outline-none transition-all ${
                      entry.scNo.includes('?') 
                        ? 'border-amber-400/50 bg-amber-500/5 text-amber-900 dark:text-amber-400' 
                        : 'border-transparent dark:text-slate-100 focus:border-blue-500/50'
                    }`}
                  />
                  {entry.scNo.includes('?') && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-4">
                <input
                  type="text"
                  value={entry.dtrCode}
                  onChange={(e) => handleCellChange(entry.id, 'dtrCode', e.target.value)}
                  className="w-full p-3 text-sm font-semibold bg-transparent border-2 border-transparent dark:text-slate-300 focus:border-blue-500/50 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:outline-none transition-all"
                />
              </td>
              <td className="px-4 py-4">
                <input
                  type="text"
                  value={entry.feederName}
                  onChange={(e) => handleCellChange(entry.id, 'feederName', e.target.value)}
                  className="w-full p-3 text-sm font-medium bg-transparent border-2 border-transparent dark:text-slate-300 focus:border-blue-500/50 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:outline-none transition-all"
                />
              </td>
              <td className="px-4 py-4">
                <input
                  type="text"
                  value={entry.location}
                  onChange={(e) => handleCellChange(entry.id, 'location', e.target.value)}
                  className="w-full p-3 text-sm font-medium bg-transparent border-2 border-transparent dark:text-slate-400 focus:border-blue-500/50 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:outline-none transition-all"
                />
              </td>
              <td className="px-4 py-4 text-center">
                <button
                  onClick={() => removeRow(entry.id)}
                  className="p-3 text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-all rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-90"
                  title="Delete row"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={5} className="px-6 py-24 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center">
                    <svg className="w-10 h-10 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <p className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest text-xs">No entries found for audit</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default LogTable;
