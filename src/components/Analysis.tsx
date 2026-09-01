import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { getAiAnalysis } from '../hooks';
import { Trade } from '../types';
import { Sparkles, BarChart2, ShieldCheck, BrainCircuit, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, cn } from '../lib/utils';
import Markdown from 'react-markdown';

interface AnalysisProps {
  trades: Trade[];
  readOnly?: boolean;
}

export function Analysis({ trades, readOnly }: AnalysisProps) {
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const closedTrades = trades.filter(t => t.status === 'closed');
  
  const generateInsight = async () => {
    if (trades.length === 0 || readOnly) return;
    setIsLoading(true);
    const result = await getAiAnalysis(trades);
    setAiInsight(result);
    setIsLoading(false);
  };

  React.useEffect(() => {
    if (!aiInsight && closedTrades.length > 0) {
      generateInsight();
    }
  }, [closedTrades.length]);

  const setupPerformance = closedTrades.reduce((acc: any, t) => {
    const key = t.setup || 'Unknown';
    if (!acc[key]) acc[key] = { name: key, pnl: 0, count: 0, wins: 0 };
    acc[key].pnl += t.pnl || 0;
    acc[key].count += 1;
    if (t.result === 'win') acc[key].wins += 1;
    return acc;
  }, {});

  const setupData = Object.values(setupPerformance);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h2 className="text-3xl font-serif text-white tracking-tight">Advanced Analytics</h2>
        <p className="text-[#636A78] mt-1 text-sm">AI-powered insights and strategy performance</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#14161A] p-8 rounded-2xl border border-[#1F2228] shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center">
              <BrainCircuit className="text-indigo-400 w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-[#636A78] uppercase">AI Trading Coach</h3>
          </div>
          
          <div className="bg-[#0A0B0E] rounded-xl p-6 min-h-[220px] flex flex-col items-center justify-center text-center border border-[#1F2228]">
            {aiInsight ? (
              <div className="text-left w-full space-y-4">
                 <div className="markdown-body text-[#E0E0E0] text-sm leading-relaxed prose prose-invert prose-sm">
                  <Markdown>{aiInsight}</Markdown>
                </div>
                {!readOnly && (
                  <button 
                    onClick={generateInsight}
                    disabled={isLoading}
                    className="mt-2 flex items-center gap-2 px-4 py-2 bg-[#1F2228] text-[#636A78] rounded-lg text-[10px] font-bold hover:text-white transition-all disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    REFRESH ANALYSIS (UNLIMITED)
                  </button>
                )}
              </div>
            ) : (
              <>
                <Sparkles className="w-10 h-10 text-[#1F2228] mb-4" />
                <p className="text-[#636A78] text-sm font-medium max-w-xs">
                  {readOnly ? "No insights available for this member yet." : "Generate professional insights based on your recent market behavior and psychological notes."}
                </p>
                {!readOnly && (
                  <button 
                    onClick={generateInsight}
                    disabled={isLoading}
                    className="mt-6 flex items-center gap-2 px-6 py-3 bg-[#10B981] text-[#0A0B0E] rounded-lg text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    GENERATE INSIGHTS
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="bg-[#14161A] p-8 rounded-2xl border border-[#1F2228] shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <BarChart2 className="text-[#10B981] w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-[#636A78] uppercase">Strategy Performance</h3>
          </div>
          
          <div className="space-y-4">
            {setupData.map((data: any, idx) => (
              <div key={`analysis-setup-${data.name}-${idx}`} className="p-4 rounded-xl bg-[#0A0B0E] border border-[#1F2228] flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-[#636A78] uppercase tracking-widest">{data.name}</p>
                  <p className="text-sm font-mono text-white mt-1">{(data.wins / data.count * 100).toFixed(0)}% Accuracy</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-[#636A78] uppercase tracking-widest">{data.count} Trades</p>
                  <p className={cn(
                    "text-sm font-mono font-bold mt-1",
                    data.pnl >= 0 ? "text-[#10B981]" : "text-rose-500"
                  )}>
                    {data.pnl >= 0 ? '+' : ''}{formatCurrency(data.pnl)}
                  </p>
                </div>
              </div>
            ))}
            {setupData.length === 0 && (
              <p className="text-center text-[#636A78] italic py-12 text-sm">No strategy performance data yet.</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-[#0A0B0E] p-8 rounded-2xl border border-[#1F2228]">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-serif text-white flex items-center gap-2">
              <ShieldCheck className="text-[#10B981] w-6 h-6" /> Psychological Resilience
            </h3>
            <p className="text-[#636A78] text-sm mt-1">Monthly consistency and adherence score</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="bg-[#14161A] p-6 rounded-xl border border-[#1F2228] flex flex-col justify-between">
            <p className="text-[10px] font-bold text-[#636A78] uppercase tracking-widest mb-2">Max Drawdown</p>
            <p className="text-xl font-mono text-rose-400">-12.4%</p>
          </div>
          <div className="bg-[#14161A] p-6 rounded-xl border border-[#1F2228] flex flex-col justify-between">
             <p className="text-[10px] font-bold text-[#636A78] uppercase tracking-widest mb-2">Profit Factor</p>
            <p className="text-xl font-mono text-emerald-400">2.14</p>
          </div>
          <div className="bg-[#14161A] p-6 rounded-xl border border-[#1F2228] flex flex-col justify-between">
             <p className="text-[10px] font-bold text-[#636A78] uppercase tracking-widest mb-2">Consistency</p>
            <p className="text-xl font-mono text-indigo-400">82%</p>
          </div>
          <div className="bg-[#14161A] p-6 rounded-xl border border-[#1F2228] flex flex-col justify-between">
             <p className="text-[10px] font-bold text-[#636A78] uppercase tracking-widest mb-2">Daily Cap</p>
            <p className="text-xl font-mono text-white">3 Trades</p>
          </div>
        </div>
      </div>
    </div>
  );
}
