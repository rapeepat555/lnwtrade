import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, ChevronDown, BrainCircuit, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

declare global {
  interface Window {
    TradingView: any;
  }
}

const COMMON_SYMBOLS = [
  { symbol: 'EIGHTCAP:XAUUSD', label: 'XAU/USD (Eightcap)' },
  { symbol: 'BINANCE:BTCUSDT', label: 'BTC/USDT' },
  { symbol: 'BINANCE:ETHUSDT', label: 'ETH/USDT' },
  { symbol: 'BINANCE:SOLUSDT', label: 'SOL/USDT' },
  { symbol: 'BINANCE:BNBUSDT', label: 'BNB/USDT' },
  { symbol: 'BINANCE:ADAUSDT', label: 'ADA/USDT' },
  { symbol: 'BINANCE:XRPUSDT', label: 'XRP/USDT' },
  { symbol: 'BINANCE:DOTUSDT', label: 'DOT/USDT' },
  { symbol: 'BINANCE:DOGEUSDT', label: 'DOGE/USDT' },
  { symbol: 'FOREXCOM:XAUUSD', label: 'Gold (FOREX.com)' },
  { symbol: 'FOREXCOM:XAGUSD', label: 'Silver (XAG)' },
  { symbol: 'FX_IDC:USDTHB', label: 'USD/THB' },
  { symbol: 'NASDAQ:AAPL', label: 'Apple' },
  { symbol: 'NASDAQ:TSLA', label: 'Tesla' },
  { symbol: 'NASDAQ:NVDA', label: 'Nvidia' },
  { symbol: 'NASDAQ:MSFT', label: 'Microsoft' },
  { symbol: 'NASDAQ:GOOGL', label: 'Google' },
  { symbol: 'INDEX:SPX', label: 'S&P 500' },
  { symbol: 'INDEX:DXY', label: 'DXY' },
];

export function TradingViewChart({ 
  symbol: externalSymbol, 
  onSymbolChange,
  interval: externalInterval,
  onIntervalChange,
  onAnalyze
}: { 
  symbol?: string, 
  onSymbolChange?: (symbol: string) => void,
  interval?: string,
  onIntervalChange?: (interval: string) => void,
  onAnalyze?: (symbol: string, interval: string) => void
}) {
  const [localSymbol, setLocalSymbol] = useState('EIGHTCAP:XAUUSD');
  const [localInterval, setLocalInterval] = useState('D');
  
  const symbol = externalSymbol || localSymbol;
  const interval = externalInterval || localInterval;
  
  const setSymbol = (s: string) => {
    if (onSymbolChange) {
      onSymbolChange(s);
    } else {
      setLocalSymbol(s);
    }
  };

  const setInterval = (i: string) => {
    if (onIntervalChange) {
      onIntervalChange(i);
    } else {
      setLocalInterval(i);
    }
  };
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [customSymbol, setCustomSymbol] = useState('');
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let script: HTMLScriptElement;
    
    const initWidget = () => {
      if (container.current && window.TradingView) {
        // Clear previous widget
        container.current.innerHTML = '';
        const widgetContainer = document.createElement('div');
        widgetContainer.id = 'tradingview_advanced_chart';
        widgetContainer.className = "w-full h-full";
        container.current.appendChild(widgetContainer);

        new window.TradingView.widget({
          "autosize": true,
          "symbol": symbol,
          "interval": interval,
          "timezone": "Etc/UTC",
          "theme": "dark",
          "style": "1",
          "locale": "en",
          "toolbar_bg": "#14161A",
          "enable_publishing": false,
          "hide_side_toolbar": false,
          "allow_symbol_change": true,
          "container_id": "tradingview_advanced_chart",
          "backgroundColor": "#0A0B0E",
          "gridColor": "rgba(31, 34, 40, 0.4)",
          "hide_top_toolbar": false,
          "save_image": true,
          "details": true,
          "hotlist": false,
          "calendar": false,
          "show_popup_button": true,
        });
      }
    };

    if (!window.TradingView) {
      if (!document.getElementById('tradingview-sdk')) {
        script = document.createElement("script");
        script.id = 'tradingview-sdk';
        script.src = "https://s3.tradingview.com/tv.js";
        script.type = "text/javascript";
        script.async = true;
        script.onload = initWidget;
        document.head.appendChild(script);
      }
    } else {
      initWidget();
    }

    return () => {
      if (container.current) {
        container.current.innerHTML = '';
      }
    };
  }, [symbol, interval]);

  const handleCustomSymbolSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customSymbol.trim()) {
      setSymbol(customSymbol.toUpperCase());
      setIsSelectorOpen(false);
      setCustomSymbol('');
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col bg-[#0A0B0E] relative overflow-hidden">
      {/* Header with Symbol Selector */}
      <div className="px-3 py-2 sm:px-4 sm:py-3 border-b border-[#1F2228] bg-[#14161A]/50 flex items-center justify-between gap-2 shrink-0 relative z-[60]">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex flex-col">
            <h2 className="text-[10px] sm:text-lg font-serif text-white tracking-widest uppercase italic leading-tight">Neural Terminal</h2>
            <p className="text-[7px] sm:text-[9px] uppercase tracking-[0.2em] font-bold text-[#636A78]">Intelligence v4.2</p>
          </div>
          
          <button 
            onClick={() => onAnalyze?.(symbol, interval)}
            className="sm:hidden flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg transition-all active:scale-95"
          >
            <BrainCircuit className="w-3.5 h-3.5 text-[#10B981] animate-pulse" />
            <span className="text-[8px] font-black text-white tracking-tighter">AI</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => onAnalyze?.(symbol, interval)}
            className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-500/10 to-emerald-500/10 border border-[#1F2228] hover:border-emerald-500/50 rounded-xl transition-all group"
          >
            <BrainCircuit className="w-4 h-4 text-[#10B981] animate-pulse" />
            <span className="text-xs font-bold text-white group-hover:text-emerald-400 uppercase tracking-tight">Neural Matrix Analysis</span>
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setIsSelectorOpen(!isSelectorOpen)}
              className="flex items-center justify-between gap-2 px-2 py-1.5 sm:px-4 sm:py-2.5 bg-[#0A0B0E] border border-[#1F2228] rounded-lg sm:rounded-xl hover:border-[#10B981]/50 transition-all group min-w-[80px] sm:min-w-[140px]"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#10B981]" />
                <span className="text-[10px] sm:text-sm font-bold text-white truncate max-w-[60px] sm:max-w-[120px]">
                  {COMMON_SYMBOLS.find(s => s.symbol === symbol)?.label.split(' ')[0] || symbol.split(':')[1] || symbol}
                </span>
              </div>
              <ChevronDown className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#636A78] transition-transform", isSelectorOpen && "rotate-180")} />
            </button>

            {isSelectorOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setIsSelectorOpen(false)} />
                <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-full sm:w-64 bg-[#14161A] border border-[#1F2228] rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 flex flex-col max-h-[70vh]">
                <div className="px-4 py-3 border-b border-[#1F2228] bg-[#14161A]">
                  <p className="text-[9px] font-black uppercase text-[#636A78] tracking-widest mb-2">Custom Symbol</p>
                  <form onSubmit={handleCustomSymbolSubmit} className="flex gap-2">
                    <input 
                      autoFocus
                      placeholder="e.g. BINANCE:SOLUSDT"
                      className="flex-1 bg-[#0A0B0E] border border-[#1F2228] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#10B981]/50"
                      value={customSymbol}
                      onChange={(e) => setCustomSymbol(e.target.value)}
                    />
                    <button type="submit" className="bg-[#10B981] text-[#0A0B0E] font-bold text-[10px] px-2 rounded-lg">GO</button>
                  </form>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
                  <div className="px-4 py-1 mb-1">
                    <p className="text-[9px] font-black uppercase text-[#636A78] tracking-widest">Quick Select</p>
                  </div>
                  {COMMON_SYMBOLS.map((s) => (
                    <button
                      key={s.symbol}
                      onClick={() => {
                        setSymbol(s.symbol);
                        setIsSelectorOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#10B981]/10 transition-colors text-left border-l-2",
                        symbol === s.symbol ? "text-[#10B981] bg-[#10B981]/5 border-[#10B981]" : "text-[#E0E0E0] border-transparent"
                      )}
                    >
                      <span className="text-sm font-bold">{s.label}</span>
                      <span className="text-[10px] font-mono text-[#636A78]">{s.symbol.split(':')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>

    {/* Chart Container */}
    <div className="flex-1 relative z-10 overflow-hidden px-0 pb-0">
      <div 
        ref={container} 
        className="w-full h-full sm:rounded-xl overflow-hidden sm:border border-[#1F2228] bg-[#0A0B0E]"
      ></div>
    </div>
  </div>
  );
}
