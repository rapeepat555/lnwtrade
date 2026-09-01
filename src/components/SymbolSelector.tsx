
import React, { useState, useMemo } from 'react';
import { Search, ChevronRight, X, Bitcoin, Coins, TrendingUp, BarChart3, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TRADING_SYMBOLS, TradingSymbol } from '../constants/symbols';
import { cn } from '../lib/utils';

interface SymbolSelectorProps {
  onSelect: (symbol: string) => void;
  onClose: () => void;
}

const CATEGORIES = ['Recent', 'Forex', 'Crypto', 'Futures', 'Stock', 'Index'] as const;

export function SymbolSelector({ onSelect, onClose }: SymbolSelectorProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<typeof CATEGORIES[number]>('Recent');

  const filteredSymbols = useMemo(() => {
    return TRADING_SYMBOLS.filter(s => {
      const matchesSearch = s.symbol.toLowerCase().includes(search.toLowerCase()) || 
                          s.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === 'Recent' ? true : s.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, activeCategory]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Crypto': return <Bitcoin className="w-5 h-5 text-orange-500" />;
      case 'Forex': return <Globe className="w-5 h-5 text-blue-500" />;
      case 'Futures': return <TrendingUp className="w-5 h-5 text-emerald-500" />;
      case 'Index': return <BarChart3 className="w-5 h-5 text-indigo-500" />;
      default: return <Coins className="w-5 h-5 text-yellow-500" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0B0E] rounded-2xl overflow-hidden border border-[#1F2228]">
      <div className="p-6 border-b border-[#1F2228]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white tracking-tight">Add Closed Trade</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#1F2228] rounded-full text-[#636A78]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#636A78]" />
          <input
            autoFocus
            type="text"
            placeholder="Symbol or name..."
            className="w-full bg-[#14161A] border border-[#1F2228] rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-[#10B981] transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map(category => (
            <button
              key={`category-${category}`}
              onClick={() => setActiveCategory(category)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all border-b-2",
                activeCategory === category 
                  ? "border-[#10B981] text-[#10B981]" 
                  : "border-transparent text-[#636A78] hover:text-white"
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredSymbols.length > 0 ? (
          filteredSymbols.map((s, idx) => (
            <button
              key={`symbol-${s.symbol}-${idx}`}
              onClick={() => onSelect(s.symbol)}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-[#14161A]/50 hover:bg-[#1F2228] border border-transparent hover:border-[#10B981]/30 transition-all group lg:min-h-[80px]"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#0A0B0E] flex items-center justify-center border border-[#1F2228]">
                  {getCategoryIcon(s.category)}
                </div>
                <div className="text-left">
                  <p className="text-white font-bold tracking-tight">{s.symbol}</p>
                  <p className="text-xs text-[#636A78] font-medium">{s.name}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-[#636A78] uppercase tracking-widest">{s.category}</span>
                <ChevronRight className="w-4 h-4 text-[#636A78] mt-1 group-hover:translate-x-1 transition-all" />
              </div>
            </button>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="w-12 h-12 text-[#1F2228] mb-4" />
            <p className="text-[#636A78] text-sm">No symbols found for "{search}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
