import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Plus, 
  Trash2, 
  Edit2, 
  Search, 
  Filter, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Clock, 
  Layers, 
  Info, 
  X, 
  CheckCircle2, 
  Activity, 
  FileText, 
  Award,
  BookOpen,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { db, handleFirestoreError, OperationType, sanitizeData } from '../lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  onSnapshot, 
  orderBy 
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { TRADING_SYMBOLS } from '../constants/symbols';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface BacktestRecord {
  id: string;
  symbol: string;
  setup: string;
  dateTime: string;
  session: string;
  zone: string;
  rr: number;
  actualRr?: number;
  result: 'win' | 'loss' | 'breakeven';
  position?: 'buy' | 'sell';
  notes?: string;
  createdAt: string;
}

interface AnalystProps {
  setups?: string[];
}

const defaultSetups = ['Breakout', 'Pullback', 'Reversal', 'Scalp', 'Trend Following'];
const sessions = ['London', 'New York', 'Asia', 'Sydney'];
const zones = ['Orderblock (OB)', 'FVG (Fair Value Gap)', 'Support/Resistance (S/R)', 'Key Level', 'Premium/Discount', 'Trendline', 'Liquidity Pool'];

const getLocalDatetimeString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export function Analyst({ setups }: AnalystProps) {
  const { user } = useAuth();
  const [backtests, setBacktests] = useState<BacktestRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [symbol, setSymbol] = useState('XAUUSD');
  const [customSymbol, setCustomSymbol] = useState('');
  const [useCustomSymbol, setUseCustomSymbol] = useState(false);
  const [setup, setSetup] = useState('');
  const [customSetup, setCustomSetup] = useState('');
  const [useCustomSetup, setUseCustomSetup] = useState(false);
  const [dateTime, setDateTime] = useState(getLocalDatetimeString());
  const [session, setSession] = useState('London');
  const [zone, setZone] = useState('Orderblock (OB)');
  const [customZone, setCustomZone] = useState('');
  const [useCustomZone, setUseCustomZone] = useState(false);
  const [rr, setRr] = useState('2.0');
  const [actualRr, setActualRr] = useState('2.0');
  const [result, setResult] = useState<'win' | 'loss' | 'breakeven'>('win');
  const [position, setPosition] = useState<'buy' | 'sell'>('buy');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  // Filters State
  const [searchSymbol, setSearchSymbol] = useState('');
  const [filterSetup, setFilterSetup] = useState('all');
  const [filterSession, setFilterSession] = useState('all');
  const [filterResult, setFilterResult] = useState('all');
  const [filterPosition, setFilterPosition] = useState<'all' | 'buy' | 'sell'>('all');

  // Pagination State (10 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchSymbol, filterSetup, filterSession, filterResult, filterPosition]);

  const activeSetups = setups && setups.length > 0 ? setups : defaultSetups;

  // Initialize Setup state
  useEffect(() => {
    if (activeSetups.length > 0 && !setup) {
      setSetup(activeSetups[0]);
    }
  }, [activeSetups, setup]);

  // Load backtest data in real-time
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const backtestsRef = collection(db, 'users', user.uid, 'backtests');
    const q = query(backtestsRef, orderBy('dateTime', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => {
        const data = doc.data() as BacktestRecord;
        return {
          id: doc.id,
          ...data,
          session: data.session === 'Asian' ? 'Asia' : data.session
        } as BacktestRecord;
      });
      setBacktests(records);
      setIsLoading(false);
    }, (error) => {
      console.error("Failed to load backtests:", error);
      handleFirestoreError(error, OperationType.GET, 'backtests', false);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const finalSymbol = useCustomSymbol ? customSymbol.trim().toUpperCase() : symbol;
    const finalSetup = useCustomSetup ? customSetup.trim() : setup;

    if (!finalSymbol) {
      alert("กรุณากรอกหรือเลือกสินทรัพย์");
      return;
    }
    if (!finalSetup) {
      alert("กรุณากรอกหรือเลือกระบบเทรด");
      return;
    }

    const numericRr = parseFloat(rr);
    if (isNaN(numericRr) || numericRr < 0) {
      alert("กรุณากรอกอัตรา Risk-Reward ที่ถูกต้อง");
      return;
    }

    const numericActualRr = parseFloat(actualRr);
    if (isNaN(numericActualRr)) {
      alert("กรุณากรอกอัตรา R:R ที่ทำได้ที่ถูกต้อง");
      return;
    }

    setShowSaveConfirm(true);
  };

  const executeSave = async () => {
    if (!user) return;

    const finalSymbol = useCustomSymbol ? customSymbol.trim().toUpperCase() : symbol;
    const finalSetup = useCustomSetup ? customSetup.trim() : setup;
    const finalZone = useCustomZone ? customZone.trim() : zone;
    const numericRr = parseFloat(rr);
    const numericActualRr = parseFloat(actualRr);

    const recordId = generateId();
    const newRecord: BacktestRecord = {
      id: recordId,
      symbol: finalSymbol,
      setup: finalSetup,
      dateTime,
      session,
      zone: finalZone,
      rr: numericRr,
      actualRr: numericActualRr,
      result,
      position,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'users', user.uid, 'backtests', recordId), sanitizeData(newRecord));
      
      // Reset Form (Except default variables for fast sequential logging)
      setNotes('');
      setCustomSymbol('');
      setCustomSetup('');
      setCustomZone('');
      setRr('2.0');
      setActualRr('2.0');
      setResult('win');
      setPosition('buy');
      setShowSaveConfirm(false);
    } catch (error) {
      console.error("Failed to save backtest record:", error);
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/backtests/${recordId}`);
    }
  };

  const handleSaveEdit = async (updatedRecord: BacktestRecord) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'backtests', updatedRecord.id), sanitizeData(updatedRecord));
      setEditingId(null);
    } catch (error) {
      console.error("Failed to update backtest record:", error);
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/backtests/${updatedRecord.id}`);
    }
  };

  const handleEdit = (rec: BacktestRecord) => {
    setEditingId(rec.id);
  };

  const handleDelete = async (id: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'backtests', id));
      if (editingId === id) {
        setEditingId(null);
      }
    } catch (error) {
      console.error("Failed to delete backtest record:", error);
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/backtests/${id}`);
    }
  };

  // ----------------------------------------------------
  // Statistics Computations
  // ----------------------------------------------------
  const totalTrades = backtests.length;
  const wins = backtests.filter(b => b.result === 'win');
  const losses = backtests.filter(b => b.result === 'loss');
  const breakevens = backtests.filter(b => b.result === 'breakeven');

  const winCount = wins.length;
  const lossCount = losses.length;
  const beCount = breakevens.length;

  const buyCount = backtests.filter(b => (b.position || 'buy') === 'buy').length;
  const sellCount = backtests.filter(b => b.position === 'sell').length;

  const winRate = totalTrades > 0 ? Math.round((winCount / totalTrades) * 100) : 0;
  
  // Calculate average R:R of completed trades (using actualRr if available)
  const avgRR = totalTrades > 0 
    ? parseFloat((backtests.reduce((acc, b) => acc + (b.actualRr !== undefined ? b.actualRr : b.rr), 0) / totalTrades).toFixed(2))
    : 0;

  // Net R-Multiple: Use actualRr if defined; otherwise fallback (Wins add their RR, Losses subtract 1)
  const netRMultiple = parseFloat(backtests.reduce((acc, b) => {
    if (b.actualRr !== undefined) return acc + b.actualRr;
    if (b.result === 'win') return acc + b.rr;
    if (b.result === 'loss') return acc - 1;
    return acc;
  }, 0).toFixed(1));

  // Breakdown Calculations helper
  const getWinRateForGroup = (filteredList: BacktestRecord[]) => {
    const total = filteredList.length;
    const winsNum = filteredList.filter(b => b.result === 'win').length;
    return {
      total,
      winRate: total > 0 ? Math.round((winsNum / total) * 100) : 0
    };
  };

  // Setup Breakdown
  const setupsBreakdown = Array.from(new Set(backtests.map(b => b.setup))).map(sName => {
    const list = backtests.filter(b => b.setup === sName);
    return { name: sName, ...getWinRateForGroup(list) };
  }).sort((a, b) => b.total - a.total);

  // Session Breakdown
  const sessionsBreakdown = sessions.map(sName => {
    const list = backtests.filter(b => b.session === sName);
    return { name: sName, ...getWinRateForGroup(list) };
  }).filter(s => s.total > 0);

  // Zone Breakdown
  const zonesBreakdown = Array.from(new Set(backtests.map(b => b.zone))).map(zName => {
    const list = backtests.filter(b => b.zone === zName);
    return { name: zName, ...getWinRateForGroup(list) };
  }).sort((a, b) => b.total - a.total);

  // ----------------------------------------------------
  // Filtering & Pagination Backtests
  // ----------------------------------------------------
  const filteredBacktests = backtests.filter(b => {
    const matchSearch = b.symbol.toLowerCase().includes(searchSymbol.toLowerCase()) || 
      (b.notes && b.notes.toLowerCase().includes(searchSymbol.toLowerCase()));
    
    const matchSetup = filterSetup === 'all' || b.setup === filterSetup;
    const matchSession = filterSession === 'all' || b.session === filterSession;
    const matchResult = filterResult === 'all' || b.result === filterResult;
    const matchPosition = filterPosition === 'all' || (b.position || 'buy') === filterPosition;

    return matchSearch && matchSetup && matchSession && matchResult && matchPosition;
  });

  const totalPages = Math.ceil(filteredBacktests.length / itemsPerPage) || 1;
  const paginatedBacktests = filteredBacktests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-[#10B981]/20 to-[#3B82F6]/20 rounded-xl flex items-center justify-center border border-[#10B981]/30 shadow-md shadow-[#10B981]/5">
            <Brain className="text-[#10B981] w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-black tracking-tight italic text-white flex items-center gap-2">
              AI Raphael Backtest
            </h2>
            <p className="text-[#636A78] text-[10px] uppercase tracking-[0.18em] font-bold">
              สถิติและเครื่องมือวิเคราะห์ทดสอบย้อนหลังระดับโปร
            </p>
          </div>
        </div>
      </header>

      {/* Stats Dashboard */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Backtests */}
        <div className="bg-[#14161A] p-3.5 sm:p-4 rounded-xl border border-[#1F2228] relative overflow-hidden group hover:border-[#10B981]/30 transition-all duration-300">
          <div className="absolute top-3 right-3 p-1.5 bg-[#1F2228] rounded-lg text-[#636A78] group-hover:bg-[#10B981]/10 group-hover:text-[#10B981] transition-all">
            <Activity className="w-4 h-4" />
          </div>
          <p className="text-[9px] font-bold text-[#636A78] uppercase tracking-[0.15em] mb-0.5">Total Backtests</p>
          <p className="text-2xl sm:text-3xl font-serif font-black italic text-white leading-none mt-1">{totalTrades}</p>
          <p className="text-[9px] text-[#636A78] mt-2 flex items-center gap-1 font-mono">
            <span>{winCount} Wins</span> • <span>{lossCount} Losses</span> • <span>{beCount} BE</span>
          </p>
        </div>

        {/* Win Rate */}
        <div className="bg-[#14161A] p-3.5 sm:p-4 rounded-xl border border-[#1F2228] relative overflow-hidden group hover:border-[#10B981]/30 transition-all duration-300">
          <div className="absolute top-3 right-3 p-1.5 bg-[#1F2228] rounded-lg text-[#636A78] group-hover:bg-[#10B981]/10 group-hover:text-[#10B981] transition-all">
            <Award className="w-4 h-4" />
          </div>
          <p className="text-[9px] font-bold text-[#636A78] uppercase tracking-[0.15em] mb-0.5">Win Rate</p>
          <p className={cn(
            "text-2xl sm:text-3xl font-serif font-black italic leading-none mt-1",
            winRate >= 50 ? "text-[#10B981]" : winRate > 35 ? "text-[#F59E0B]" : "text-rose-500"
          )}>
            {winRate}%
          </p>
          {/* Radial representation */}
          <div className="w-full bg-[#1F2228]/50 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-500",
                winRate >= 50 ? "bg-[#10B981]" : winRate > 35 ? "bg-[#F59E0B]" : "bg-rose-500"
              )}
              style={{ width: `${winRate}%` }}
            />
          </div>
        </div>

        {/* Avg R:R */}
        <div className="bg-[#14161A] p-3.5 sm:p-4 rounded-xl border border-[#1F2228] relative overflow-hidden group hover:border-[#10B981]/30 transition-all duration-300">
          <div className="absolute top-3 right-3 p-1.5 bg-[#1F2228] rounded-lg text-[#636A78] group-hover:bg-[#10B981]/10 group-hover:text-[#10B981] transition-all">
            <Target className="w-4 h-4" />
          </div>
          <p className="text-[9px] font-bold text-[#636A78] uppercase tracking-[0.15em] mb-0.5">Avg Risk-Reward</p>
          <p className="text-2xl sm:text-3xl font-serif font-black italic text-white leading-none mt-1">1:{avgRR}</p>
          <p className="text-[9px] text-[#636A78] mt-2 font-mono">
            สัดส่วนเฉลี่ยของกำไรเทียบกับความเสี่ยง
          </p>
        </div>

        {/* Net R-Multiple */}
        <div className="bg-[#14161A] p-3.5 sm:p-4 rounded-xl border border-[#1F2228] relative overflow-hidden group hover:border-[#10B981]/30 transition-all duration-300">
          <div className="absolute top-3 right-3 p-1.5 bg-[#1F2228] rounded-lg text-[#636A78] group-hover:bg-[#10B981]/10 group-hover:text-[#10B981] transition-all">
            {netRMultiple >= 0 ? <TrendingUp className="w-4 h-4 text-[#10B981]" /> : <TrendingDown className="w-4 h-4 text-rose-500" />}
          </div>
          <p className="text-[9px] font-bold text-[#636A78] uppercase tracking-[0.15em] mb-0.5">Net R-Multiple</p>
          <p className={cn(
            "text-2xl sm:text-3xl font-serif font-black italic leading-none mt-1",
            netRMultiple >= 0 ? "text-[#10B981]" : "text-rose-500"
          )}>
            {netRMultiple >= 0 ? `+${netRMultiple}` : netRMultiple}R
          </p>
          <p className="text-[9px] text-[#636A78] mt-2 font-mono">
            ประสิทธิภาพความคุ้มค่ารวม (Total R)
          </p>
        </div>
      </section>

      {/* Visual Analytics / Charts breakdown */}
      {totalTrades > 0 && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Win / Loss / BE Proportions Bar */}
          <div className="bg-[#14161A] p-6 rounded-3xl border border-[#1F2228] flex flex-col justify-between shadow-sm">
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-[#636A78] mb-4 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#10B981]" /> สัดส่วนแพ้ชนะ (Proportions)
              </h4>
              <p className="text-xs text-[#636A78] leading-relaxed mb-6">
                การกระจายของผลลัพธ์ใน Backtest เพื่อระบุประสิทธิภาพของระบบเทรดโดยภาพรวม
              </p>
            </div>

            <div className="space-y-4">
              {/* Stacked Bar */}
              <div className="w-full h-8 bg-[#1F2228] rounded-2xl overflow-hidden flex font-mono text-[10px] font-bold text-white">
                {winCount > 0 && (
                  <div 
                    className="bg-[#10B981] text-black flex items-center justify-center transition-all hover:brightness-110 font-black" 
                    style={{ width: `${(winCount / totalTrades) * 100}%` }}
                    title={`Wins: ${winCount}`}
                  >
                    {Math.round((winCount / totalTrades) * 100)}%
                  </div>
                )}
                {beCount > 0 && (
                  <div 
                    className="bg-[#3B82F6] text-white flex items-center justify-center transition-all hover:brightness-110" 
                    style={{ width: `${(beCount / totalTrades) * 100}%` }}
                    title={`Breakeven: ${beCount}`}
                  >
                    {Math.round((beCount / totalTrades) * 100)}%
                  </div>
                )}
                {lossCount > 0 && (
                  <div 
                    className="bg-rose-500 text-white flex items-center justify-center transition-all hover:brightness-110" 
                    style={{ width: `${(lossCount / totalTrades) * 100}%` }}
                    title={`Losses: ${lossCount}`}
                  >
                    {Math.round((lossCount / totalTrades) * 100)}%
                  </div>
                )}
              </div>

              {/* Legend with absolute counts */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="bg-[#0A0B0E] p-2 rounded-xl border border-[#1F2228] text-center">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#10B981] mr-1.5" />
                  <span className="text-[10px] font-bold text-[#636A78] uppercase">Win</span>
                  <p className="text-xs font-mono font-bold text-white mt-0.5">{winCount} Trades</p>
                </div>
                <div className="bg-[#0A0B0E] p-2 rounded-xl border border-[#1F2228] text-center">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#3B82F6] mr-1.5" />
                  <span className="text-[10px] font-bold text-[#636A78] uppercase">BE</span>
                  <p className="text-xs font-mono font-bold text-white mt-0.5">{beCount} Trades</p>
                </div>
                <div className="bg-[#0A0B0E] p-2 rounded-xl border border-[#1F2228] text-center">
                  <span className="inline-block w-2 h-2 rounded-full bg-rose-500 mr-1.5" />
                  <span className="text-[10px] font-bold text-[#636A78] uppercase">Loss</span>
                  <p className="text-xs font-mono font-bold text-white mt-0.5">{lossCount} Trades</p>
                </div>
              </div>
            </div>
          </div>

          {/* Setup & Session Performance */}
          <div className="bg-[#14161A] p-6 rounded-3xl border border-[#1F2228] flex flex-col justify-between shadow-sm">
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-[#636A78] mb-4 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#10B981]" /> ประสิทธิภาพตามช่วงเวลาและระบบ (Session & Setup)
              </h4>
            </div>

            <div className="space-y-4">
              {/* Session Winrates */}
              <div>
                <p className="text-[10px] font-bold text-[#636A78] uppercase tracking-wider mb-2">Sessions Performance</p>
                <div className="space-y-2">
                  {sessions.map(s => {
                    const data = sessionsBreakdown.find(bd => bd.name === s) || { name: s, total: 0, winRate: 0 };
                    return (
                      <div key={s} className="flex items-center justify-between text-xs font-medium">
                        <span className="text-white flex items-center gap-1.5">
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            s === 'London' ? "bg-blue-500" : s === 'New York' ? "bg-yellow-500" : (s === 'Asian' || s === 'Asia') ? "bg-pink-500" : "bg-teal-400"
                          )} />
                          {s} <span className="text-[#636A78] text-[10px] font-mono">({data.total} Trades)</span>
                        </span>
                        <span className="font-mono font-bold text-white">
                          {data.total > 0 ? `${data.winRate}% Win` : 'No Trades'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Setups Breakdown Mini List */}
              <div className="border-t border-[#1F2228] pt-3">
                <p className="text-[10px] font-bold text-[#636A78] uppercase tracking-wider mb-2">Top Performance Setups</p>
                <div className="space-y-2 max-h-[100px] overflow-y-auto">
                  {setupsBreakdown.slice(0, 3).map((setupData, sIdx) => (
                    <div key={`setup-bd-${setupData.name || 'unnamed'}-${sIdx}`} className="flex items-center justify-between text-xs">
                      <span className="text-[#A1A8B6] font-medium truncate max-w-[150px]">{setupData.name}</span>
                      <span className="text-[#10B981] font-mono font-bold">{setupData.winRate}% Win <span className="text-[#636A78] font-normal text-[10px]">({setupData.total}T)</span></span>
                    </div>
                  ))}
                  {setupsBreakdown.length === 0 && (
                    <p className="text-xs text-[#636A78] italic">ไม่มีข้อมูลระบบเทรด</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Zones Breakdown */}
          <div className="bg-[#14161A] p-6 rounded-3xl border border-[#1F2228] flex flex-col justify-between shadow-sm">
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-[#636A78] mb-4 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#10B981]" /> วิเคราะห์ตามจุดทดสอบ (Zone Performance)
              </h4>
            </div>

            <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
              {zonesBreakdown.map((zoneData, zIdx) => (
                <div key={`zone-bd-${zoneData.name || 'unnamed'}-${zIdx}`} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-white truncate max-w-[180px]">{zoneData.name}</span>
                    <span className="font-mono text-[#10B981] font-bold">
                      {zoneData.winRate}% Win <span className="text-[#636A78] font-normal text-[10px]">({zoneData.total}T)</span>
                    </span>
                  </div>
                  <div className="w-full bg-[#1F2228] h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#10B981] h-full rounded-full transition-all duration-300"
                      style={{ width: `${zoneData.winRate}%` }}
                    />
                  </div>
                </div>
              ))}
              {zonesBreakdown.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <Layers className="w-8 h-8 text-[#1F2228] mb-2" />
                  <p className="text-xs text-[#636A78] italic">ไม่มีข้อมูลโซนหรือจุดทดสอบ</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Main Grid: Form Left, History Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Card */}
        <div ref={formRef} className="lg:col-span-4">
          <div className="bg-[#14161A] p-6 rounded-[2rem] border border-[#1F2228] shadow-xl space-y-6">
            <h3 className="text-xs font-black text-[#636A78] uppercase tracking-[0.2em] flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#10B981]" />
              บันทึกการทดสอบย้อนหลัง (Backtest)
            </h3>

            <form onSubmit={handleSave} className="space-y-5">
              {/* Asset (Symbol) Selector */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78]">สินทรัพย์ (Asset)</label>
                  <button 
                    type="button"
                    onClick={() => {
                      setUseCustomSymbol(!useCustomSymbol);
                      setSymbol('XAUUSD');
                    }}
                    className="text-[10px] font-black uppercase text-[#10B981] hover:underline"
                  >
                    {useCustomSymbol ? 'เลือกจากรายการ' : 'ระบุเอง'}
                  </button>
                </div>
                {useCustomSymbol ? (
                  <input
                    type="text"
                    required
                    placeholder="เช่น GC, MGC, NQ, MNQ"
                    className="w-full bg-[#0A0B0E] px-4 py-3 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-sm font-semibold uppercase text-white font-mono"
                    value={customSymbol}
                    onChange={e => setCustomSymbol(e.target.value)}
                  />
                ) : (
                  <select
                    className="w-full bg-[#0A0B0E] px-4 py-3 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-sm font-semibold text-white cursor-pointer"
                    value={symbol}
                    onChange={e => setSymbol(e.target.value)}
                  >
                    {TRADING_SYMBOLS.map(ts => (
                      <option key={ts.symbol} value={ts.symbol} className="bg-[#14161A]">
                        {ts.symbol} - {ts.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Trading Setup (System) Selector */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78]">ระบบเทรด (Trading Setup)</label>
                  <button 
                    type="button"
                    onClick={() => {
                      setUseCustomSetup(!useCustomSetup);
                      if (activeSetups.length > 0) setSetup(activeSetups[0]);
                    }}
                    className="text-[10px] font-black uppercase text-[#10B981] hover:underline"
                  >
                    {useCustomSetup ? 'เลือกจากระบบ' : 'ระบุเอง'}
                  </button>
                </div>
                {useCustomSetup ? (
                  <input
                    type="text"
                    required
                    placeholder="ระบุระบบหรือเงื่อนไขการเทรด"
                    className="w-full bg-[#0A0B0E] px-4 py-3 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-sm font-semibold text-white"
                    value={customSetup}
                    onChange={e => setCustomSetup(e.target.value)}
                  />
                ) : (
                  <select
                    className="w-full bg-[#0A0B0E] px-4 py-3 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-sm font-semibold text-white cursor-pointer"
                    value={setup}
                    onChange={e => setSetup(e.target.value)}
                  >
                    {activeSetups.map(s => (
                      <option key={s} value={s} className="bg-[#14161A]">{s}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* DateTime */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] px-1">วันและเวลา (Date & Time)</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#636A78]" />
                  <input
                    type="datetime-local"
                    required
                    className="w-full bg-[#0A0B0E] pl-11 pr-4 py-3 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-sm font-medium text-white font-mono cursor-pointer"
                    value={dateTime}
                    onChange={e => setDateTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Session & Zone Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Session */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] px-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#636A78]" /> Session
                  </label>
                  <select
                    className="w-full bg-[#0A0B0E] px-3 py-3 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-xs font-semibold text-white cursor-pointer"
                    value={session}
                    onChange={e => setSession(e.target.value)}
                  >
                    {sessions.map(s => (
                      <option key={s} value={s} className="bg-[#14161A]">{s}</option>
                    ))}
                  </select>
                </div>

                {/* Zone */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] flex items-center gap-1">
                      <Layers className="w-3 h-3 text-[#636A78]" /> Zone
                    </label>
                    <button 
                      type="button"
                      onClick={() => {
                        setUseCustomZone(!useCustomZone);
                        setZone('Orderblock (OB)');
                      }}
                      className="text-[9px] font-bold uppercase text-[#10B981] hover:underline"
                    >
                      {useCustomZone ? 'เลือก' : 'พิมพ์'}
                    </button>
                  </div>
                  {useCustomZone ? (
                    <input
                      type="text"
                      required
                      placeholder="เช่น Support, Demand"
                      className="w-full bg-[#0A0B0E] px-3 py-2.5 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-xs font-semibold text-white"
                      value={customZone}
                      onChange={e => setCustomZone(e.target.value)}
                    />
                  ) : (
                    <select
                      className="w-full bg-[#0A0B0E] px-3 py-3 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-xs font-semibold text-white cursor-pointer"
                      value={zone}
                      onChange={e => setZone(e.target.value)}
                    >
                      {zones.map(z => (
                        <option key={z} value={z} className="bg-[#14161A]">{z}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Risk-Reward Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Risk-Reward */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] px-1">R:R ที่วางแผน (Planned R:R)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="0"
                    placeholder="เช่น 2.0"
                    className="w-full bg-[#0A0B0E] px-4 py-3 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-sm font-semibold text-white font-mono"
                    value={rr}
                    onChange={e => {
                      setRr(e.target.value);
                      if (result === 'win') {
                        setActualRr(e.target.value);
                      }
                    }}
                  />
                </div>

                {/* Achieved/Actual R:R */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#10B981] px-1">RR ที่ทำได้ (Achieved RR)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="เช่น 2.0"
                    className="w-full bg-[#0A0B0E] px-4 py-3 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-sm font-semibold text-white font-mono"
                    value={actualRr}
                    onChange={e => setActualRr(e.target.value)}
                  />
                </div>
              </div>

              {/* Result Option Buttons */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] px-1">ผลลัพธ์ (Result)</label>
                <div className="flex gap-1.5 h-[46px]">
                  <button
                    type="button"
                    onClick={() => {
                      setResult('win');
                      setActualRr(rr);
                    }}
                    className={cn(
                      "flex-1 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center border",
                      result === 'win'
                        ? "bg-[#10B981]/10 border-[#10B981] text-[#10B981]"
                        : "bg-[#0A0B0E] border-[#1F2228] text-[#636A78] hover:border-[#636A78]/30"
                    )}
                  >
                    Win
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResult('breakeven');
                      setActualRr('0.0');
                    }}
                    className={cn(
                      "flex-1 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center border",
                      result === 'breakeven'
                        ? "bg-[#3B82F6]/10 border-[#3B82F6] text-[#3B82F6]"
                        : "bg-[#0A0B0E] border-[#1F2228] text-[#636A78] hover:border-[#636A78]/30"
                    )}
                  >
                    BE
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResult('loss');
                      setActualRr('-1.0');
                    }}
                    className={cn(
                      "flex-1 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center border",
                      result === 'loss'
                        ? "bg-rose-500/10 border-rose-500 text-rose-500"
                        : "bg-[#0A0B0E] border-[#1F2228] text-[#636A78] hover:border-[#636A78]/30"
                    )}
                  >
                    Loss
                  </button>
                </div>
              </div>

              {/* Position (Buy/Sell) */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] px-1">ทิศทาง (Position)</label>
                <div className="flex gap-1.5 h-[46px]">
                  <button
                    type="button"
                    onClick={() => setPosition('buy')}
                    className={cn(
                      "flex-1 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center border gap-1.5 cursor-pointer",
                      position === 'buy'
                        ? "bg-[#10B981]/10 border-[#10B981] text-[#10B981]"
                        : "bg-[#0A0B0E] border-[#1F2228] text-[#636A78] hover:border-[#636A78]/30"
                    )}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    Buy / Long
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosition('sell')}
                    className={cn(
                      "flex-1 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center border gap-1.5 cursor-pointer",
                      position === 'sell'
                        ? "bg-rose-500/10 border-rose-500 text-rose-500"
                        : "bg-[#0A0B0E] border-[#1F2228] text-[#636A78] hover:border-[#636A78]/30"
                    )}
                  >
                    <TrendingDown className="w-3.5 h-3.5" />
                    Sell / Short
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] px-1">โน้ตเพิ่มเติม (Notes)</label>
                <textarea
                  rows={3}
                  placeholder="รายละเอียด ข้อควรระวัง อารมณ์ ความคิดเห็นในการเทรดไม้สัญญานี้..."
                  className="w-full bg-[#0A0B0E] px-4 py-3 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-sm text-[#A1A8B6] font-medium resize-none"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#10B981] text-white rounded-2xl text-xs font-black uppercase tracking-[0.15em] hover:bg-[#10B981]/90 shadow-lg shadow-[#10B981]/15 transition-all cursor-pointer"
                >
                  บันทึกผลทดสอบ
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: History list */}
        <div className="lg:col-span-8 flex flex-col space-y-6">
          {/* Filter Bar */}
          <div className="bg-[#14161A] p-5 rounded-3xl border border-[#1F2228] space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search input */}
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#636A78]" />
                <input
                  type="text"
                  placeholder="ค้นหาตามสินทรัพย์ หรือโน้ตเพิ่มเติม..."
                  className="w-full bg-[#0A0B0E] pl-11 pr-4 py-3 rounded-2xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-xs font-medium text-white"
                  value={searchSymbol}
                  onChange={e => setSearchSymbol(e.target.value)}
                />
              </div>

              {/* Setups dropdown filter */}
              <div className="sm:w-48">
                <select
                  className="w-full bg-[#0A0B0E] px-4 py-3 rounded-2xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-xs font-semibold text-white cursor-pointer"
                  value={filterSetup}
                  onChange={e => setFilterSetup(e.target.value)}
                >
                  <option value="all">ระบบเทรดทั้งหมด</option>
                  {Array.from(new Set(backtests.map(b => b.setup).filter(Boolean))).map((setupName, sIdx) => (
                    <option key={`filter-setup-${setupName}-${sIdx}`} value={setupName}>{setupName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] mr-2">ตัวกรอง:</span>
              
              {/* Session Filter Row */}
              <div className="flex gap-1.5">
                <button
                  onClick={() => setFilterSession('all')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase border transition-all",
                    filterSession === 'all'
                      ? "bg-[#10B981]/10 border-[#10B981]/40 text-[#10B981]"
                      : "bg-[#0A0B0E] border-[#1F2228] text-[#636A78] hover:border-[#636A78]/30"
                  )}
                >
                  All Sessions
                </button>
                {sessions.map(s => {
                  const count = backtests.filter(b => b.session === s).length;
                  const activeClass = s === 'London' ? "bg-blue-500/10 border-blue-500/40 text-blue-400" :
                                      s === 'New York' ? "bg-yellow-500/10 border-yellow-500/40 text-yellow-400" :
                                      (s === 'Asian' || s === 'Asia') ? "bg-pink-500/10 border-pink-500/40 text-pink-400" :
                                      "bg-teal-500/10 border-teal-500/40 text-teal-400";
                  return (
                    <button
                      key={s}
                      onClick={() => setFilterSession(s)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase border transition-all",
                        filterSession === s
                          ? activeClass
                          : "bg-[#0A0B0E] border-[#1F2228] text-[#636A78] hover:border-[#636A78]/30"
                      )}
                    >
                      {s} <span className="text-[#636A78]/60 font-mono text-[9px]">({count})</span>
                    </button>
                  );
                })}
              </div>

              <div className="h-4 w-[1px] bg-[#1F2228] mx-2" />

              {/* Result Filter Row */}
              <div className="flex gap-1.5">
                <button
                  onClick={() => setFilterResult('all')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase border transition-all",
                    filterResult === 'all'
                      ? "bg-white/10 border-white/20 text-white"
                      : "bg-[#0A0B0E] border-[#1F2228] text-[#636A78] hover:border-[#636A78]/30"
                  )}
                >
                  All Results
                </button>
                <button
                  onClick={() => setFilterResult('win')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase border transition-all",
                    filterResult === 'win'
                      ? "bg-[#10B981]/10 border-[#10B981]/40 text-[#10B981]"
                      : "bg-[#0A0B0E] border-[#1F2228] text-[#636A78] hover:border-[#636A78]/30"
                  )}
                >
                  Wins ({winCount})
                </button>
                <button
                  onClick={() => setFilterResult('breakeven')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase border transition-all",
                    filterResult === 'breakeven'
                      ? "bg-[#3B82F6]/10 border-[#3B82F6]/40 text-[#3B82F6]"
                      : "bg-[#0A0B0E] border-[#1F2228] text-[#636A78] hover:border-[#636A78]/30"
                  )}
                >
                  BEs ({beCount})
                </button>
                <button
                  onClick={() => setFilterResult('loss')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase border transition-all",
                    filterResult === 'loss'
                      ? "bg-rose-500/10 border-rose-500/40 text-rose-500"
                      : "bg-[#0A0B0E] border-[#1F2228] text-[#636A78] hover:border-[#636A78]/30"
                  )}
                >
                  Losses ({lossCount})
                </button>
              </div>

              <div className="h-4 w-[1px] bg-[#1F2228] mx-2" />

              {/* Position Filter Row */}
              <div className="flex gap-1.5">
                <button
                  onClick={() => setFilterPosition('all')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase border transition-all",
                    filterPosition === 'all'
                      ? "bg-white/10 border-white/20 text-white"
                      : "bg-[#0A0B0E] border-[#1F2228] text-[#636A78] hover:border-[#636A78]/30"
                  )}
                >
                  All Positions
                </button>
                <button
                  onClick={() => setFilterPosition('buy')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase border transition-all flex items-center gap-1",
                    filterPosition === 'buy'
                      ? "bg-[#10B981]/10 border-[#10B981]/40 text-[#10B981]"
                      : "bg-[#0A0B0E] border-[#1F2228] text-[#636A78] hover:border-[#636A78]/30"
                  )}
                >
                  <TrendingUp className="w-2.5 h-2.5" />
                  Buy ({buyCount})
                </button>
                <button
                  onClick={() => setFilterPosition('sell')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase border transition-all flex items-center gap-1",
                    filterPosition === 'sell'
                      ? "bg-rose-500/10 border-rose-500/40 text-rose-500"
                      : "bg-[#0A0B0E] border-[#1F2228] text-[#636A78] hover:border-[#636A78]/30"
                  )}
                >
                  <TrendingDown className="w-2.5 h-2.5" />
                  Sell ({sellCount})
                </button>
              </div>
            </div>
          </div>

          {/* List Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <p className="text-[10px] font-black text-[#636A78] uppercase tracking-widest">
                รายการประวัติการทดสอบ ({filteredBacktests.length} รายการ)
              </p>
              {totalPages > 1 && (
                <span className="text-[10px] font-mono text-[#636A78]">
                  หน้า {currentPage} / {totalPages}
                </span>
              )}
            </div>

            <AnimatePresence mode="popLayout">
              {isLoading ? (
                <div className="py-24 text-center">
                  <div className="w-10 h-10 border-4 border-[#10B981]/15 border-t-[#10B981] rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-xs text-[#636A78] font-bold animate-pulse">กำลังดึงข้อมูลการทดสอบย้อนหลัง...</p>
                </div>
              ) : filteredBacktests.length > 0 ? (
                <div className="space-y-3.5">
                  {paginatedBacktests.map((b, bIdx) => {
                    const formattedDate = format(new Date(b.dateTime), 'MMM dd, yyyy HH:mm');
                    return (
                      <motion.div
                        key={b.id ? `bt-card-${b.id}-${bIdx}` : `bt-card-idx-${bIdx}`}
                        layout
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={cn(
                          "bg-[#14161A] p-5 rounded-[2rem] border transition-all duration-300 relative group overflow-hidden",
                          editingId === b.id ? "border-[#10B981] shadow-lg shadow-[#10B981]/5" : "border-[#1F2228]"
                        )}
                      >
                        {/* Status border accent on card */}
                        <div className={cn(
                          "absolute top-0 bottom-0 left-0 w-1",
                          b.result === 'win' ? "bg-[#10B981]" : b.result === 'breakeven' ? "bg-[#3B82F6]" : "bg-rose-500"
                        )} />

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-2">
                            {/* Symbol & Date Row */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-lg font-black tracking-tight text-white font-mono">{b.symbol}</span>
                              <span className="text-[10px] font-bold text-[#636A78] font-mono">{formattedDate}</span>
                              
                              {/* Position Badge */}
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg flex items-center gap-1",
                                (b.position || 'buy') === 'sell'
                                  ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                                  : "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20"
                              )}>
                                {(b.position || 'buy') === 'sell' ? (
                                  <>
                                    <TrendingDown className="w-2.5 h-2.5" />
                                    Sell
                                  </>
                                ) : (
                                  <>
                                    <TrendingUp className="w-2.5 h-2.5" />
                                    Buy
                                  </>
                                )}
                              </span>

                              {/* Session Badge */}
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg",
                                b.session === 'London' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                                b.session === 'New York' ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" :
                                (b.session === 'Asian' || b.session === 'Asia') ? "bg-pink-500/10 text-pink-400 border border-pink-500/20" :
                                "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                              )}>
                                {b.session}
                              </span>

                              {/* Zone Badge */}
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-[#1F2228] text-[#A1A8B6] border border-[#2F333C]">
                                {b.zone}
                              </span>
                            </div>

                            {/* Setup Row */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-[#636A78] uppercase tracking-wider">Setup:</span>
                              <span className="text-xs font-semibold text-[#A1A8B6]">{b.setup}</span>
                            </div>
                          </div>

                          {/* RR and Results Block */}
                          <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 border-[#1F2228]/60 pt-3 sm:pt-0">
                            <div className="text-left sm:text-right">
                              <p className="text-[9px] font-bold text-[#636A78] uppercase tracking-widest">Planned R:R</p>
                              <p className="text-sm font-mono font-bold text-white">1:{b.rr}</p>
                            </div>

                            <div className="text-left sm:text-right">
                              <p className="text-[9px] font-bold text-[#10B981] uppercase tracking-widest">Achieved R:R</p>
                              <p className="text-sm font-mono font-bold text-[#10B981]">
                                {b.actualRr !== undefined ? `${b.actualRr > 0 ? '+' : ''}${b.actualRr}R` : (b.result === 'win' ? `+${b.rr}R` : b.result === 'breakeven' ? '0R' : '-1.0R')}
                              </p>
                            </div>

                            <div className="text-left sm:text-right">
                              <p className="text-[9px] font-bold text-[#636A78] uppercase tracking-widest">Result</p>
                              <span className={cn(
                                "text-xs font-black uppercase tracking-widest font-mono",
                                b.result === 'win' ? "text-[#10B981]" : b.result === 'breakeven' ? "text-[#3B82F6]" : "text-rose-500"
                              )}>
                                {b.result === 'win' ? 'Win' : b.result === 'breakeven' ? 'BE' : 'Loss'}
                              </span>
                            </div>

                            {/* Actions Buttons */}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleEdit(b)}
                                title="แก้ไข"
                                className="p-2 bg-[#1F2228]/50 text-[#636A78] hover:text-[#10B981] hover:bg-[#10B981]/5 rounded-xl border border-[#2F333C] transition-all cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(b.id)}
                                title="ลบ"
                                className="p-2 bg-[#1F2228]/50 text-[#636A78] hover:text-rose-500 hover:bg-rose-500/5 rounded-xl border border-[#2F333C] transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Notes Row if present */}
                        {b.notes && (
                          <div className="mt-4 bg-[#0A0B0E]/60 p-3 rounded-2xl border border-[#1F2228]/40 flex gap-2">
                            <FileText className="w-4 h-4 text-[#636A78] shrink-0 mt-0.5" />
                            <p className="text-xs text-[#A1A8B6] font-medium leading-relaxed whitespace-pre-wrap">{b.notes}</p>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-24 bg-[#14161A]/30 rounded-[3rem] border border-dashed border-[#1F2228]/80">
                  <div className="w-16 h-16 bg-[#1F2228] rounded-full flex items-center justify-center mb-4 mx-auto">
                    <BookOpen className="w-7 h-7 text-[#636A78]" />
                  </div>
                  <h4 className="text-base font-serif text-white italic mb-1.5">ไม่พบประวัติการทดสอบย้อนหลัง</h4>
                  <p className="text-[#636A78] text-xs max-w-xs mx-auto">
                    {searchSymbol || filterSetup !== 'all' || filterSession !== 'all' || filterResult !== 'all' || filterPosition !== 'all'
                      ? 'ไม่พบข้อมูลที่ค้นหาหรือเข้าตามตัวกรองที่เลือก ลองเปลี่ยนเงื่อนไขค้นหา'
                      : 'เริ่มบันทึกการทดสอบย้อนหลังของคุณทางฝั่งซ้ายเพื่อดูสถิติและเปรียบเทียบผลลัพธ์'}
                  </p>
                </div>
              )}
            </AnimatePresence>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-3 py-2.5 sm:px-4 sm:py-3 rounded-2xl border border-[#1F2228] flex flex-wrap items-center justify-between gap-2 bg-[#14161A] mt-4 shadow-sm">
                <div className="text-[11px] sm:text-xs text-[#636A78] font-medium tracking-tight">
                  Page <span className="text-white font-bold">{currentPage}</span> / <span className="text-white font-bold">{totalPages}</span>
                  <span className="hidden xs:inline text-[#636A78]/70 ml-1">({filteredBacktests.length} tests)</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5 ml-auto">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="hidden sm:flex p-1.5 rounded-lg bg-[#0A0B0E] border border-[#1F2228] text-[#E0E0E0] hover:text-white hover:bg-[#1F2228] disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                    title="First Page"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center justify-center w-7 h-7 sm:w-auto sm:px-2.5 sm:py-1.5 rounded-lg bg-[#0A0B0E] border border-[#1F2228] text-xs font-bold text-[#E0E0E0] hover:text-white hover:bg-[#1F2228] disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline ml-0.5 text-[11px]">Prev</span>
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => {
                        if (totalPages <= 4) return true;
                        if (p === 1 || p === totalPages) return true;
                        return Math.abs(p - currentPage) <= 1;
                      })
                      .map((pageNum, idx, arr) => {
                        const prev = arr[idx - 1];
                        const showEllipsis = prev && pageNum - prev > 1;

                        return (
                          <React.Fragment key={`an-page-${pageNum}-${idx}`}>
                            {showEllipsis && <span className="text-[10px] text-[#636A78] px-0.5">...</span>}
                            <button
                              onClick={() => setCurrentPage(pageNum)}
                              className={cn(
                                "w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-[11px] sm:text-xs font-bold transition-all border",
                                currentPage === pageNum
                                  ? "bg-[#10B981] text-black border-[#10B981] shadow-sm font-black"
                                  : "bg-[#0A0B0E] text-[#636A78] border-[#1F2228] hover:bg-[#1F2228] hover:text-white"
                              )}
                            >
                              {pageNum}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center justify-center w-7 h-7 sm:w-auto sm:px-2.5 sm:py-1.5 rounded-lg bg-[#0A0B0E] border border-[#1F2228] text-xs font-bold text-[#E0E0E0] hover:text-white hover:bg-[#1F2228] disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                    title="Next Page"
                  >
                    <span className="hidden sm:inline mr-0.5 text-[11px]">Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="hidden sm:flex p-1.5 rounded-lg bg-[#0A0B0E] border border-[#1F2228] text-[#E0E0E0] hover:text-white hover:bg-[#1F2228] disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                    title="Last Page"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-[#14161A] rounded-2xl p-8 border border-[#1F2228] shadow-2xl"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-rose-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">ลบรายการทดสอบ?</h3>
                  <p className="text-[#636A78] text-sm mt-2 font-medium leading-relaxed">
                    การดำเนินการนี้ไม่สามารถย้อนกลับได้ ข้อมูลผลลัพธ์การทดสอบย้อนหลังนี้จะถูกลบออกจากบัญชีของคุณอย่างถาวร
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full mt-2">
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="py-3 px-4 rounded-xl bg-[#0A0B0E] text-[#636A78] font-bold text-xs hover:bg-[#1F2228] transition-all border border-[#1F2228] cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={() => {
                      handleDelete(deleteConfirmId);
                      setDeleteConfirmId(null);
                    }}
                    className="py-3 px-4 rounded-xl bg-rose-500 text-white font-bold text-xs hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 cursor-pointer"
                  >
                    ลบข้อมูล
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showSaveConfirm && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSaveConfirm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-[#14161A] rounded-2xl p-8 border border-[#1F2228] shadow-2xl"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[#10B981]/10 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">ยืนยันการบันทึกข้อมูล?</h3>
                  <p className="text-[#636A78] text-sm mt-2 font-medium leading-relaxed">
                    คุณต้องการบันทึกข้อมูลผลการทดสอบนี้ลงในระบบใช่หรือไม่?
                  </p>
                </div>

                <div className="w-full bg-[#0A0B0E] rounded-xl p-4 border border-[#1F2228] text-left space-y-2 mt-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#636A78]">สินทรัพย์:</span>
                    <span className="text-white font-bold">{useCustomSymbol ? customSymbol.trim().toUpperCase() : symbol}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#636A78]">ประเภท (Position):</span>
                    <span className={cn(
                      "font-bold uppercase tracking-wider flex items-center gap-1",
                      position === 'buy' ? "text-[#10B981]" : "text-rose-500"
                    )}>
                      {position === 'buy' ? <><TrendingUp className="w-3 h-3" /> Buy / Long</> : <><TrendingDown className="w-3 h-3" /> Sell / Short</>}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#636A78]">ระบบเทรด:</span>
                    <span className="text-white font-medium">{useCustomSetup ? customSetup.trim() : setup}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#636A78]">ช่วงเวลา (Session):</span>
                    <span className="text-white font-medium">{session}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#636A78]">R:R (Planned / Achieved):</span>
                    <span className="text-white font-mono">1:{rr} / {parseFloat(actualRr) > 0 ? '+' : ''}{actualRr}R</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#636A78]">ผลลัพธ์:</span>
                    <span className={cn(
                      "font-bold uppercase tracking-wider",
                      result === 'win' ? "text-[#10B981]" : result === 'breakeven' ? "text-blue-400" : "text-rose-500"
                    )}>
                      {result === 'win' ? 'Win' : result === 'breakeven' ? 'BE' : 'Loss'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full mt-2">
                  <button
                    onClick={() => setShowSaveConfirm(false)}
                    className="py-3 px-4 rounded-xl bg-[#0A0B0E] text-[#636A78] font-bold text-xs hover:bg-[#1F2228] transition-all border border-[#1F2228] cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={executeSave}
                    className="py-3 px-4 rounded-xl bg-[#10B981] text-black font-black text-xs hover:bg-[#10B981]/90 transition-all shadow-lg shadow-[#10B981]/20 cursor-pointer"
                  >
                    ยืนยันบันทึก
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {editingId && backtests.find(b => b.id === editingId) && (
          <EditBacktestModal
            record={backtests.find(b => b.id === editingId)!}
            onClose={() => setEditingId(null)}
            onSave={handleSaveEdit}
            activeSetups={activeSetups}
            sessions={sessions}
            zones={zones}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface EditBacktestModalProps {
  record: BacktestRecord;
  onClose: () => void;
  onSave: (updatedRecord: BacktestRecord) => Promise<void>;
  activeSetups: string[];
  sessions: string[];
  zones: string[];
}

function EditBacktestModal({
  record,
  onClose,
  onSave,
  activeSetups,
  sessions,
  zones
}: EditBacktestModalProps) {
  const [symbol, setSymbol] = useState(record.symbol);
  const [customSymbol, setCustomSymbol] = useState('');
  const [useCustomSymbol, setUseCustomSymbol] = useState(false);
  const [setup, setSetup] = useState(record.setup);
  const [customSetup, setCustomSetup] = useState('');
  const [useCustomSetup, setUseCustomSetup] = useState(false);
  const [dateTime, setDateTime] = useState(record.dateTime);
  const [session, setSession] = useState(record.session);
  const [zone, setZone] = useState(record.zone);
  const [customZone, setCustomZone] = useState('');
  const [useCustomZone, setUseCustomZone] = useState(false);
  const [rr, setRr] = useState(record.rr.toString());
  const [actualRr, setActualRr] = useState(record.actualRr !== undefined ? record.actualRr.toString() : '');
  const [result, setResult] = useState<'win' | 'loss' | 'breakeven'>(record.result);
  const [position, setPosition] = useState<'buy' | 'sell'>(record.position || 'buy');
  const [notes, setNotes] = useState(record.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize custom states based on record values
  useEffect(() => {
    const hasSymbol = TRADING_SYMBOLS.some(s => s.symbol === record.symbol);
    if (hasSymbol) {
      setSymbol(record.symbol);
      setUseCustomSymbol(false);
    } else {
      setCustomSymbol(record.symbol);
      setUseCustomSymbol(true);
    }

    const hasSetup = activeSetups.includes(record.setup);
    if (hasSetup) {
      setSetup(record.setup);
      setUseCustomSetup(false);
    } else {
      setCustomSetup(record.setup);
      setUseCustomSetup(true);
    }

    const hasZone = zones.includes(record.zone);
    if (hasZone) {
      setZone(record.zone);
      setUseCustomZone(false);
    } else {
      setCustomZone(record.zone);
      setUseCustomZone(true);
    }

    setDateTime(record.dateTime);
    setSession(record.session);
    setRr(record.rr.toString());
    setActualRr(record.actualRr !== undefined ? record.actualRr.toString() : (record.result === 'win' ? record.rr.toString() : record.result === 'breakeven' ? '0.0' : '-1.0'));
    setResult(record.result);
    setPosition(record.position || 'buy');
    setNotes(record.notes || '');
  }, [record, activeSetups, zones]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const finalSymbol = useCustomSymbol ? customSymbol.trim().toUpperCase() : symbol;
    const finalSetup = useCustomSetup ? customSetup.trim() : setup;
    const finalZone = useCustomZone ? customZone.trim() : zone;

    const numericRr = parseFloat(rr) || 0;
    const numericActualRr = parseFloat(actualRr) || 0;

    const updatedRecord: BacktestRecord = {
      ...record,
      symbol: finalSymbol,
      setup: finalSetup,
      dateTime,
      session,
      zone: finalZone,
      rr: numericRr,
      actualRr: numericActualRr,
      result,
      position,
      notes: notes.trim() || undefined,
    };

    try {
      await onSave(updatedRecord);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-[#14161A] border border-[#1F2228] rounded-[2.5rem] p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          type="button"
          className="absolute top-6 right-6 p-2 bg-[#1F2228]/50 text-[#636A78] hover:text-white rounded-full hover:bg-[#1F2228] transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-xs font-black text-[#636A78] uppercase tracking-[0.2em] flex items-center gap-2 mb-6">
          <Edit2 className="w-4 h-4 text-[#10B981]" />
          แก้ไขรายการทดสอบ
        </h3>

        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          {/* Asset Selector */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78]">สินทรัพย์ (Asset)</label>
              <button 
                type="button"
                onClick={() => {
                  setUseCustomSymbol(!useCustomSymbol);
                  setSymbol('XAUUSD');
                }}
                className="text-[10px] font-black uppercase text-[#10B981] hover:underline"
              >
                {useCustomSymbol ? 'เลือกจากรายการ' : 'ระบุเอง'}
              </button>
            </div>
            {useCustomSymbol ? (
              <input
                type="text"
                required
                placeholder="เช่น GC, MGC, NQ, MNQ"
                className="w-full bg-[#0A0B0E] px-4 py-3 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-sm font-semibold uppercase text-white font-mono"
                value={customSymbol}
                onChange={e => setCustomSymbol(e.target.value)}
              />
            ) : (
              <select
                className="w-full bg-[#0A0B0E] px-4 py-3 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-sm font-semibold text-white cursor-pointer"
                value={symbol}
                onChange={e => setSymbol(e.target.value)}
              >
                {TRADING_SYMBOLS.map(ts => (
                  <option key={ts.symbol} value={ts.symbol} className="bg-[#14161A]">
                    {ts.symbol} - {ts.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Setup Selector */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78]">ระบบเทรด (Trading Setup)</label>
              <button 
                type="button"
                onClick={() => {
                  setUseCustomSetup(!useCustomSetup);
                  if (activeSetups.length > 0) setSetup(activeSetups[0]);
                }}
                className="text-[10px] font-black uppercase text-[#10B981] hover:underline"
              >
                {useCustomSetup ? 'เลือกจากระบบ' : 'ระบุเอง'}
              </button>
            </div>
            {useCustomSetup ? (
              <input
                type="text"
                required
                placeholder="ระบุระบบหรือเงื่อนไขการเทรด"
                className="w-full bg-[#0A0B0E] px-4 py-3 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-sm font-semibold text-white"
                value={customSetup}
                onChange={e => setCustomSetup(e.target.value)}
              />
            ) : (
              <select
                className="w-full bg-[#0A0B0E] px-4 py-3 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-sm font-semibold text-white cursor-pointer"
                value={setup}
                onChange={e => setSetup(e.target.value)}
              >
                {activeSetups.map(s => (
                  <option key={s} value={s} className="bg-[#14161A]">{s}</option>
                ))}
              </select>
            )}
          </div>

          {/* DateTime */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] px-1">วันและเวลา (Date & Time)</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#636A78]" />
              <input
                type="datetime-local"
                required
                className="w-full bg-[#0A0B0E] pl-11 pr-4 py-3 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-sm font-medium text-white font-mono cursor-pointer"
                value={dateTime}
                onChange={e => setDateTime(e.target.value)}
              />
            </div>
          </div>

          {/* Session & Zone Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Session */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] px-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#636A78]" /> Session
              </label>
              <select
                className="w-full bg-[#0A0B0E] px-3 py-3 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-xs font-semibold text-white cursor-pointer"
                value={session}
                onChange={e => setSession(e.target.value)}
              >
                {sessions.map(s => (
                  <option key={s} value={s} className="bg-[#14161A]">{s}</option>
                ))}
              </select>
            </div>

            {/* Zone */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] flex items-center gap-1">
                  <Layers className="w-3 h-3 text-[#636A78]" /> Zone
                </label>
                <button 
                  type="button"
                  onClick={() => {
                    setUseCustomZone(!useCustomZone);
                    setZone('Orderblock (OB)');
                  }}
                  className="text-[9px] font-bold uppercase text-[#10B981] hover:underline"
                >
                  {useCustomZone ? 'เลือก' : 'พิมพ์'}
                </button>
              </div>
              {useCustomZone ? (
                <input
                  type="text"
                  required
                  placeholder="เช่น Support, Demand"
                  className="w-full bg-[#0A0B0E] px-3 py-2.5 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-xs font-semibold text-white"
                  value={customZone}
                  onChange={e => setCustomZone(e.target.value)}
                />
              ) : (
                <select
                  className="w-full bg-[#0A0B0E] px-3 py-3 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-xs font-semibold text-white cursor-pointer"
                  value={zone}
                  onChange={e => setZone(e.target.value)}
                >
                  {zones.map(z => (
                    <option key={z} value={z} className="bg-[#14161A]">{z}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Risk-Reward Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Risk-Reward */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] px-1">R:R ที่วางแผน (Planned R:R)</label>
              <input
                type="number"
                step="any"
                required
                min="0"
                placeholder="เช่น 2.0"
                className="w-full bg-[#0A0B0E] px-4 py-3 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-sm font-semibold text-white font-mono"
                value={rr}
                onChange={e => {
                  setRr(e.target.value);
                  if (result === 'win') {
                    setActualRr(e.target.value);
                  }
                }}
              />
            </div>

            {/* Achieved/Actual R:R */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#10B981] px-1">RR ที่ทำได้ (Achieved RR)</label>
              <input
                type="number"
                step="any"
                required
                placeholder="เช่น 2.0"
                className="w-full bg-[#0A0B0E] px-4 py-3 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-sm font-semibold text-white font-mono"
                value={actualRr}
                onChange={e => setActualRr(e.target.value)}
              />
            </div>
          </div>

          {/* Result Option Buttons */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] px-1">ผลลัพธ์ (Result)</label>
            <div className="flex gap-1.5 h-[46px]">
              <button
                type="button"
                onClick={() => {
                  setResult('win');
                  setActualRr(rr);
                }}
                className={cn(
                  "flex-1 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center border",
                  result === 'win'
                    ? "bg-[#10B981]/10 border-[#10B981] text-[#10B981]"
                    : "bg-[#0A0B0E] border-[#1F2228] text-[#636A78] hover:border-[#636A78]/30"
                )}
              >
                Win
              </button>
              <button
                type="button"
                onClick={() => {
                  setResult('breakeven');
                  setActualRr('0.0');
                }}
                className={cn(
                  "flex-1 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center border",
                  result === 'breakeven'
                    ? "bg-[#3B82F6]/10 border-[#3B82F6] text-[#3B82F6]"
                    : "bg-[#0A0B0E] border-[#1F2228] text-[#636A78] hover:border-[#636A78]/30"
                )}
              >
                BE
              </button>
              <button
                type="button"
                onClick={() => {
                  setResult('loss');
                  setActualRr('-1.0');
                }}
                className={cn(
                  "flex-1 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center border",
                  result === 'loss'
                    ? "bg-rose-500/10 border-rose-500 text-rose-500"
                    : "bg-[#0A0B0E] border-[#1F2228] text-[#636A78] hover:border-[#636A78]/30"
                )}
              >
                Loss
              </button>
            </div>
          </div>

          {/* Position (Buy/Sell) */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] px-1">ทิศทาง (Position)</label>
            <div className="flex gap-1.5 h-[46px]">
              <button
                type="button"
                onClick={() => setPosition('buy')}
                className={cn(
                  "flex-1 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center border gap-1.5 cursor-pointer",
                  position === 'buy'
                    ? "bg-[#10B981]/10 border-[#10B981] text-[#10B981]"
                    : "bg-[#0A0B0E] border-[#1F2228] text-[#636A78] hover:border-[#636A78]/30"
                )}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Buy / Long
              </button>
              <button
                type="button"
                onClick={() => setPosition('sell')}
                className={cn(
                  "flex-1 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center border gap-1.5 cursor-pointer",
                  position === 'sell'
                    ? "bg-rose-500/10 border-rose-500 text-rose-500"
                    : "bg-[#0A0B0E] border-[#1F2228] text-[#636A78] hover:border-[#636A78]/30"
                )}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                Sell / Short
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] px-1">โน้ตเพิ่มเติม (Notes)</label>
            <textarea
              rows={3}
              placeholder="รายละเอียด ข้อควรระวัง อารมณ์ ความคิดเห็นในการเทรดไม้สัญญานี้..."
              className="w-full bg-[#0A0B0E] px-4 py-3 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-sm text-[#A1A8B6] font-medium resize-none"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 bg-transparent border border-[#1F2228] rounded-2xl text-xs font-black uppercase tracking-wider text-[#636A78] hover:bg-[#1F2228] transition-all"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-[2] py-3.5 bg-[#10B981] text-white rounded-2xl text-xs font-black uppercase tracking-[0.15em] hover:bg-[#10B981]/90 shadow-lg shadow-[#10B981]/15 transition-all flex items-center justify-center cursor-pointer"
            >
              {isSaving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
