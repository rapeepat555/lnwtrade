import React, { useState } from 'react';
import { Portfolio, Trade } from '../types';
import { 
  Wallet as WalletIcon, 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCw, 
  CreditCard, 
  PieChart as PieChartIcon, 
  Plus, 
  Settings2, 
  Trash2, 
  X,
  CreditCard as CardIcon,
  Archive,
  ArchiveRestore,
  FolderArchive,
  CheckCircle2
} from 'lucide-react';
import { formatCurrency, formatPercentage, cn } from '../lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

interface WalletProps {
  portfolios: Portfolio[];
  activePortfolioId: string;
  setActivePortfolio: (id: string) => void;
  addPortfolio: (name: string, initialBalance: number, currency: string) => void;
  updatePortfolio: (id: string, updates: Partial<Portfolio>) => void;
  archivePortfolio: (id: string, isArchived?: boolean) => void;
  deletePortfolio: (id: string) => void;
  updateBalance: (amount: number) => void;
  addTransaction: (portfolioId: string, type: 'deposit' | 'withdraw' | 'adjustment', amount: number) => void;
  deleteTransaction: (portfolioId: string, transactionId: string | null) => void;
  trades: Trade[];
  readOnly?: boolean;
}

export function WalletView({ 
  portfolios, 
  activePortfolioId, 
  setActivePortfolio, 
  addPortfolio, 
  updatePortfolio, 
  archivePortfolio,
  deletePortfolio,
  updateBalance, 
  addTransaction,
  deleteTransaction,
  trades,
  readOnly
}: WalletProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingSettings, setEditingSettings] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null);
  const [txDeleteConfirmId, setTxDeleteConfirmId] = useState<string | null>(null);
  const [walletFilter, setWalletFilter] = useState<'active' | 'archived'>('active');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const activePortfolios = portfolios.filter(p => !p.isArchived);
  const archivedPortfolios = portfolios.filter(p => !!p.isArchived);
  
  const displayedPortfolios = walletFilter === 'active' ? activePortfolios : archivedPortfolios;
  
  const activePortfolio = portfolios.find(p => p.id === activePortfolioId) || displayedPortfolios[0] || portfolios[0];
  
  const getCalculatedBalance = React.useCallback((p: Portfolio) => {
    if (!p) return 0;
    const portfolioTrades = trades.filter(t => t.portfolioId === p.id && (t.status === 'closed' || t.pnl != null));
    const tradesPnl = portfolioTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
    return (p.initialBalance || 0) + tradesPnl;
  }, [trades]);

  const activeCalculatedBalance = activePortfolio ? getCalculatedBalance(activePortfolio) : 0;
  const [newBalance, setNewBalance] = useState(activeCalculatedBalance.toString());
  
  // Sync balance input when active portfolio or trades change
  React.useEffect(() => {
    if (activePortfolio) {
      setNewBalance(getCalculatedBalance(activePortfolio).toString());
    }
  }, [activePortfolio?.id, trades, getCalculatedBalance]);
  
  const formatValue = (val: number) => formatCurrency(val, activePortfolio?.currency || 'USD');

  // States for new/edit portfolio
  const [pName, setPName] = useState('');
  const [pBalance, setPBalance] = useState('');
  const [pCurrency, setPCurrency] = useState('USD');
  const [adjAmount, setAdjAmount] = useState('');

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (window.innerWidth < 768) {
      setTimeout(() => {
        e.target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 300);
    }
  };

  const handleDeposit = () => {
    if (!adjAmount || !editingSettings) return;
    const amount = parseFloat(adjAmount);
    addTransaction(editingSettings, 'deposit', amount);
    
    const p = portfolios.find(p => p.id === editingSettings);
    if (!p) return;
    setPBalance((p.initialBalance + amount).toString());
    setAdjAmount('');
  };

  const handleWithdraw = () => {
    if (!adjAmount || !editingSettings) return;
    const amount = parseFloat(adjAmount);
    addTransaction(editingSettings, 'withdraw', amount);
    
    const p = portfolios.find(p => p.id === editingSettings);
    if (!p) return;
    setPBalance((p.initialBalance - amount).toString());
    setAdjAmount('');
  };

  const handleUpdate = () => {
    updateBalance(parseFloat(newBalance));
    setIsEditing(false);
  };

  const handleCreatePortfolio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName) return;
    const balance = parseFloat(pBalance) || 0;
    addPortfolio(pName, balance, pCurrency);
    setIsAddingNew(false);
    setPName('');
    setPBalance('');
    setWalletFilter('active');
    showToast(`สร้างกระเป๋า "${pName}" สำเร็จ`);
  };

  const handleEditPortfolio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSettings) return;
    updatePortfolio(editingSettings, {
      name: pName,
      currency: pCurrency
    });
    setEditingSettings(null);
    showToast('บันทึกการแก้ไขกระเป๋าเรียบร้อย');
  };

  const handleArchive = (id: string) => {
    const p = portfolios.find(port => port.id === id);
    archivePortfolio(id, true);
    setArchiveConfirmId(null);
    showToast(`จัดเก็บกระเป๋า "${p?.name || 'Wallet'}" เรียบร้อยแล้ว`);
  };

  const handleRestore = (id: string) => {
    const p = portfolios.find(port => port.id === id);
    archivePortfolio(id, false);
    setActivePortfolio(id);
    showToast(`กู้คืนกระเป๋า "${p?.name || 'Wallet'}" กลับมาใช้งานแล้ว`);
  };

  const openSettings = (p: Portfolio) => {
    setPName(p.name);
    setPBalance(p.initialBalance.toString());
    setPCurrency(p.currency);
    setEditingSettings(p.id);
  };

  // Filter trades for active portfolio exposure
  const activeTrades = trades.filter(t => t.portfolioId === activePortfolioId);
  const assetAllocation = activeTrades.reduce((acc: any, t) => {
    if (!acc[t.symbol]) acc[t.symbol] = 0;
    acc[t.symbol] += 1;
    return acc;
  }, {});

  const allocationData = Object.entries(assetAllocation).map(([name, value]) => ({
    name, value: value as number
  })).slice(0, 5);

  const COLORS = ['#10B981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-3 sm:space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-[300] bg-[#14161A] border border-[#10B981]/40 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 backdrop-blur-md"
          >
            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
            <span className="text-xs font-bold">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h2 className="text-lg sm:text-xl font-serif text-white tracking-tight leading-snug">Portfolio & Capital</h2>
          <p className="text-[#636A78] text-[11px]">Manage your trading funds, archives, and capital allocation</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Active / Archived Tab Filter Switch */}
          <div className="flex items-center bg-[#0A0B0E] p-0.5 rounded-lg border border-[#1F2228]">
            <button
              onClick={() => setWalletFilter('active')}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold transition-all",
                walletFilter === 'active' 
                  ? "bg-[#1F2228] text-[#10B981] shadow-sm" 
                  : "text-[#636A78] hover:text-[#E0E0E0]"
              )}
            >
              <WalletIcon className="w-3 h-3" />
              <span>กระเป๋าใช้งาน</span>
              <span className={cn(
                "px-1.5 py-0.2 rounded text-[8.5px] font-mono",
                walletFilter === 'active' ? "bg-[#10B981]/20 text-[#10B981]" : "bg-[#1F2228] text-[#636A78]"
              )}>
                {activePortfolios.length}
              </span>
            </button>

            <button
              onClick={() => setWalletFilter('archived')}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold transition-all",
                walletFilter === 'archived' 
                  ? "bg-[#1F2228] text-amber-400 shadow-sm" 
                  : "text-[#636A78] hover:text-[#E0E0E0]"
              )}
            >
              <FolderArchive className="w-3 h-3" />
              <span>จัดเก็บแล้ว</span>
              {archivedPortfolios.length > 0 && (
                <span className={cn(
                  "px-1.5 py-0.2 rounded text-[8.5px] font-mono",
                  walletFilter === 'archived' ? "bg-amber-500/20 text-amber-400" : "bg-[#1F2228] text-[#636A78]"
                )}>
                  {archivedPortfolios.length}
                </span>
              )}
            </button>
          </div>

          {!readOnly && (
            <button 
              onClick={() => {
                setPName('');
                setPBalance('');
                setIsAddingNew(true);
              }}
              className="flex items-center justify-center gap-1.5 bg-[#10B981] text-[#0A0B0E] hover:bg-[#10B981]/90 px-2.5 py-1.5 rounded-lg transition-all font-bold text-[11px] tracking-tight shadow-sm shadow-[#10B981]/15 cursor-pointer active:scale-95"
            >
              <Plus className="w-3 h-3 text-[#0A0B0E] stroke-[2.5]" />
              NEW WALLET
            </button>
          )}
        </div>
      </header>

      {/* Wallets List / Horizontal Scroll */}
      <div className="relative group/wallets">
        {displayedPortfolios.length === 0 ? (
          <div className="bg-[#14161A] border border-[#1F2228] rounded-xl p-5 text-center my-0.5">
            <div className="w-9 h-9 rounded-xl bg-[#0A0B0E] border border-[#1F2228] flex items-center justify-center mx-auto mb-2 text-[#636A78]">
              {walletFilter === 'archived' ? <FolderArchive className="w-4 h-4 text-amber-500/50" /> : <WalletIcon className="w-4 h-4" />}
            </div>
            <p className="text-xs font-bold text-white mb-0.5">
              {walletFilter === 'archived' ? 'ไม่มีกระเป๋าที่จัดเก็บไว้' : 'ยังไม่มีกระเป๋าเงิน'}
            </p>
            <p className="text-[11px] text-[#636A78] max-w-sm mx-auto">
              {walletFilter === 'archived' 
                ? 'คุณสามารถกดปุ่ม "จัดเก็บ" (Archive) ที่กระเป๋าเงินเพื่อย้ายมาพักไว้ที่นี่ได้ตลอดเวลา' 
                : 'คลิกปุ่ม "NEW WALLET" ด้านบนเพื่อสร้างกระเป๋าเงินใหม่สำหรับบันทึกการเทรด'}
            </p>
          </div>
        ) : (
          <div className="flex overflow-x-auto gap-2.5 pb-2 snap-x snap-mandatory no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            {displayedPortfolios.map(p => (
              <div 
                key={`wallet-card-${p.id}`}
                onClick={() => {
                  setActivePortfolio(p.id);
                  setNewBalance(p.balance.toString());
                }}
                className={cn(
                  "min-w-[210px] sm:min-w-[240px] flex-shrink-0 p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer group relative snap-center",
                  activePortfolioId === p.id 
                    ? (p.isArchived ? "bg-[#14161A] border-amber-500/80 shadow-sm shadow-amber-500/5" : "bg-[#14161A] border-[#10B981] shadow-sm shadow-[#10B981]/5")
                    : (p.isArchived ? "bg-[#0A0B0E] border-dashed border-[#2A2D35] hover:border-amber-500/50 opacity-80 hover:opacity-100" : "bg-[#0A0B0E] border-[#1F2228] hover:border-[#2D3139]")
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <div className={cn(
                      "p-1.5 rounded-lg",
                      activePortfolioId === p.id 
                        ? (p.isArchived ? "bg-amber-500/10 text-amber-400" : "bg-[#10B981]/10 text-[#10B981]") 
                        : "bg-[#1F2228] text-[#636A78]"
                    )}>
                      {p.isArchived ? <FolderArchive className="w-3.5 h-3.5" /> : <CardIcon className="w-3.5 h-3.5" />}
                    </div>
                    {p.isArchived && (
                      <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        จัดเก็บแล้ว
                      </span>
                    )}
                  </div>
                  
                  {!readOnly && (
                    <div className="flex items-center gap-1">
                      {p.isArchived ? (
                        // Actions for Archived Wallet
                        <>
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleRestore(p.id); 
                            }}
                            className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg text-[#10B981] transition-all border border-emerald-500/20 shadow-sm flex items-center gap-1 text-[9px] font-bold"
                            title="ยกเลิกการจัดเก็บ (Restore)"
                          >
                            <ArchiveRestore className="w-3 h-3" />
                            <span>กู้คืน</span>
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(p.id); }}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg text-rose-500 transition-all border border-rose-500/20 shadow-sm"
                            title="ลบถาวร (Delete wallet)"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        // Actions for Active Wallet
                        <>
                          <button 
                            onClick={(e) => { e.stopPropagation(); openSettings(p); }}
                            className="p-1.5 bg-[#10B981]/10 hover:bg-[#10B981]/20 rounded-lg text-[#10B981] transition-all border border-[#10B981]/20 shadow-sm"
                            title="แก้ไขข้อมูล (Edit wallet)"
                          >
                            <Settings2 className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setArchiveConfirmId(p.id); 
                            }}
                            className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg text-amber-400 transition-all border border-amber-500/20 shadow-sm"
                            title="จัดเก็บ Wallet (Archive)"
                          >
                            <Archive className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(p.id); }}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg text-rose-500 transition-all border border-rose-500/20 shadow-sm"
                            title="ลบกระเป๋า (Delete wallet)"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-[9px] uppercase font-bold tracking-widest text-[#636A78] mb-0.5">{p.name}</p>
                <h4 className="text-base sm:text-lg font-mono font-bold text-white mb-0.5">{formatCurrency(getCalculatedBalance(p), p.currency)}</h4>
              </div>
            ))}
          </div>
        )}
        
        {/* Visual indicators for scroll */}
        <div className="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-[#0A0B0E] to-transparent pointer-events-none opacity-0 group-hover/wallets:opacity-100 transition-opacity hidden sm:block" />
        <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-[#0A0B0E] to-transparent pointer-events-none opacity-0 group-hover/wallets:opacity-100 transition-opacity hidden sm:block" />
      </div>

      {activePortfolio && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="lg:col-span-1 space-y-4">
            <div className={cn(
              "rounded-xl p-5 text-white relative overflow-hidden border shadow-xl transition-all",
              activePortfolio.isArchived 
                ? "bg-[#14161A] border-amber-500/30 shadow-amber-500/5" 
                : "bg-[#14161A] border-[#1F2228] shadow-emerald-500/5"
            )}>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {activePortfolio.isArchived ? (
                      <FolderArchive className="text-amber-400 w-6 h-6" />
                    ) : (
                      <WalletIcon className="text-[#10B981] w-6 h-6" />
                    )}
                    {activePortfolio.isArchived && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        จัดเก็บแล้ว
                      </span>
                    )}
                  </div>

                  {!readOnly && (
                    <div className="flex items-center gap-1.5">
                      {activePortfolio.isArchived ? (
                        <button 
                          onClick={() => handleRestore(activePortfolio.id)}
                          className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg text-[#10B981] transition-all border border-emerald-500/20 shadow-sm flex items-center gap-1 text-xs font-bold"
                          title="ยกเลิกการจัดเก็บ (Restore wallet)"
                        >
                          <ArchiveRestore className="w-3 h-3" />
                          <span>กู้คืน</span>
                        </button>
                      ) : (
                        <>
                          <button 
                            onClick={() => openSettings(activePortfolio)}
                            className="p-1.5 bg-[#10B981]/10 hover:bg-[#10B981]/20 rounded-lg text-[#10B981] transition-all border border-[#10B981]/20 shadow-sm"
                            title="Edit wallet"
                          >
                            <Settings2 className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => setArchiveConfirmId(activePortfolio.id)}
                            className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg text-amber-400 transition-all border border-amber-500/20 shadow-sm"
                            title="จัดเก็บ Wallet นี้ (Archive)"
                          >
                            <Archive className="w-3 h-3" />
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => setDeleteConfirmId(activePortfolio.id)}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg text-rose-500 transition-all border border-rose-500/20 shadow-sm"
                        title="Delete wallet"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <CreditCard className="text-[#636A78] w-5 h-5 ml-1" />
                    </div>
                  )}
                  {readOnly && <CreditCard className="text-[#636A78] w-5 h-5 ml-1" />}
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-[#636A78] text-[9px] font-bold uppercase tracking-widest mb-1">
                    Available Balance • <span className="text-[#E0E0E0]">{activePortfolio.name}</span>
                  </p>
                </div>

                {isEditing && !readOnly ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      type="number"
                      value={newBalance}
                      onChange={(e) => setNewBalance(e.target.value)}
                      className="bg-transparent text-xl sm:text-2xl font-mono font-bold text-white border-b border-[#10B981] focus:outline-none w-full min-w-0"
                    />
                    <button onClick={handleUpdate} className="p-1.5 bg-[#10B981] rounded-lg shrink-0"><RefreshCw className="w-3.5 h-3.5 text-[#0A0B0E]" /></button>
                  </div>
                ) : (
                  <h3 
                    className={cn(
                      "text-xl sm:text-3xl font-mono font-bold tracking-tight mb-2 break-words whitespace-normal transition-colors",
                      !readOnly ? "cursor-pointer hover:text-[#10B981]" : "cursor-default"
                    )} 
                    onClick={() => !readOnly && setIsEditing(true)}
                  >
                    {formatValue(activeCalculatedBalance)}
                  </h3>
                )}
                
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#1F2228]">
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold text-[#636A78]">Currency</span>
                    <span className="text-xs font-mono font-bold text-white">{activePortfolio.currency}</span>
                  </div>
                  <div className="ml-auto flex -space-x-1.5">
                    <div className="w-6 h-6 rounded-full border-2 border-[#14161A] bg-[#10B981]" />
                    <div className="w-6 h-6 rounded-full border-2 border-[#14161A] bg-indigo-500" />
                    <div className="w-6 h-6 rounded-full border-2 border-[#14161A] bg-[#1F2228] flex items-center justify-center text-[8px] font-bold">+2</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-[#14161A] p-5 rounded-xl border border-[#1F2228] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-[#636A78] uppercase flex items-center gap-1.5">
                <PieChartIcon className="w-3.5 h-3.5 text-[#10B981]" /> Symbol Exposure ({activePortfolio.name})
              </h3>
              <p className="text-[9px] font-medium text-[#636A78] italic">Frequency based</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      dataKey="value"
                      stroke="none"
                    >
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#14161A', border: '1px solid #1F2228', borderRadius: '8px' }}
                      itemStyle={{ color: '#E0E0E0' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="space-y-2">
                {allocationData.length === 0 ? (
                  <p className="text-[#636A78] text-xs italic">No exposure data available for this wallet.</p>
                ) : allocationData.map((d, i) => (
                  <div key={`allocation-${d.name}-${i}`} className="flex items-center justify-between p-2 rounded-lg bg-[#0A0B0E] border border-[#1F2228]">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                      <span className="text-xs font-bold text-[#E0E0E0]">{d.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#636A78]">{(d.value / allocationData.reduce((p, c) => p + c.value, 0) * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activePortfolio && (
        <div className="bg-[#14161A] p-3.5 sm:p-5 rounded-xl border border-[#1F2228] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-[#636A78] uppercase flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-[#10B981]" /> Transaction History ({activePortfolio.name})
            </h3>
            <p className="text-[9px] font-medium text-[#636A78] italic">Deposits & Withdrawals</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#0A0B0E] text-[#636A78] text-[9px] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">Amount</th>
                  <th className="px-4 py-2 font-medium">Date</th>
                  {!readOnly && <th className="px-4 py-2 font-medium text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="text-xs text-[#E0E0E0] divide-y divide-[#1F2228]">
                {(!activePortfolio.transactions || activePortfolio.transactions.length === 0) ? (
                  <tr>
                    <td colSpan={readOnly ? 3 : 4} className="px-4 py-6 text-center text-[#636A78] italic text-xs">
                      No deposits or withdrawals recorded yet for this wallet.
                    </td>
                  </tr>
                ) : (
                  activePortfolio.transactions.map((tx, idx) => {
                    const isPos = tx.type === 'deposit' || tx.amount > 0;
                    return (
                      <tr key={tx.id ? `tx-${tx.id}` : `tx-fallback-${idx}`} className="hover:bg-[#1F2228]/50 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <div className={cn(
                              "w-5 h-5 rounded flex items-center justify-center",
                              isPos ? "bg-[#10B981]/10 text-[#10B981]" : "bg-rose-500/10 text-rose-500"
                            )}>
                              {isPos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            </div>
                            <span className="font-bold uppercase tracking-wider text-[9px]">
                              {tx.type}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 font-mono font-bold text-xs">
                          <span className={isPos ? "text-[#10B981]" : "text-rose-500"}>
                            {isPos ? '+' : ''}{formatCurrency(tx.amount, activePortfolio.currency)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-[#636A78] font-mono text-[9px]">
                          {new Date(tx.date).toLocaleDateString()} {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        {!readOnly && (
                          <td className="px-4 py-2.5 text-right">
                            <button
                              onClick={() => setTxDeleteConfirmId(tx.id)}
                              className="p-1 hover:bg-rose-500/10 text-[#636A78] hover:text-rose-500 rounded transition-colors"
                              title="Delete Transaction"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals & Dialogs */}
      <AnimatePresence>
        {/* Transaction Delete Confirm */}
        {txDeleteConfirmId && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTxDeleteConfirmId(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-[#14161A] rounded-2xl p-8 border border-[#1F2228] shadow-2xl text-center"
            >
              <h3 className="text-xl font-bold text-white mb-2">Delete Transaction?</h3>
              <p className="text-[#636A78] text-sm mb-8">
                This will remove the transaction record and adjust your wallet balance accordingly. This action cannot be undone.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setTxDeleteConfirmId(null)}
                  className="py-3 rounded-xl bg-[#0A0B0E] text-[#636A78] font-bold text-xs hover:bg-[#1F2228] border border-[#1F2228]"
                >
                  CANCEL
                </button>
                <button
                  onClick={() => {
                    deleteTransaction(activePortfolioId, txDeleteConfirmId);
                    setTxDeleteConfirmId(null);
                  }}
                  className="py-3 rounded-xl bg-rose-500 text-white font-bold text-xs hover:bg-rose-600 shadow-lg shadow-rose-500/20"
                >
                  DELETE
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Archive Wallet Confirmation Modal */}
        {archiveConfirmId && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setArchiveConfirmId(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-[#14161A] rounded-2xl p-8 border border-[#1F2228] shadow-2xl"
            >
              <div className="flex flex-col items-center text-center gap-5">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20 shadow-inner">
                  <Archive className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">จัดเก็บ Wallet?</h3>
                  <p className="text-xs text-[#94A3B8] mt-2 leading-relaxed">
                    คุณต้องการจัดเก็บ <span className="text-white font-bold">"{portfolios.find(p => p.id === archiveConfirmId)?.name}"</span> หรือไม่?
                  </p>
                  <p className="text-[11px] text-[#636A78] mt-2 font-medium bg-[#0A0B0E] p-3 rounded-xl border border-[#1F2228] text-left">
                    💡 ประวัติการเทรดและบันทึกทั้งหมดจะยังคงอยู่ครบถ้วน โดยจะถูกย้ายไปที่แท็บ <strong className="text-amber-400">"จัดเก็บแล้ว (Archived)"</strong> และสามารถกู้คืนกลับมาได้ตลอดเวลา
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full mt-2">
                  <button
                    onClick={() => setArchiveConfirmId(null)}
                    className="py-3.5 px-4 rounded-xl bg-[#0A0B0E] text-[#636A78] font-bold text-xs hover:bg-[#1F2228] transition-all border border-[#1F2228]"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={() => handleArchive(archiveConfirmId)}
                    className="py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs transition-all shadow-lg shadow-amber-500/20"
                  >
                    ยืนยันจัดเก็บ
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Wallet Confirm */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmId(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-[#14161A] rounded-2xl p-8 border border-[#1F2228] shadow-2xl"
            >
              <div className="flex flex-col items-center text-center gap-6">
                <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center shadow-inner">
                  <Trash2 className="w-8 h-8 text-rose-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white tracking-tight">Delete Wallet?</h3>
                  <p className="text-[#636A78] text-sm mt-3 font-medium leading-relaxed px-2">
                    Warning: This will permanently delete <span className="text-white">"{portfolios.find(p => p.id === deleteConfirmId)?.name}"</span> and ALL associated trade data.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full mt-2">
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="py-4 px-4 rounded-xl bg-[#0A0B0E] text-[#636A78] font-bold text-xs hover:bg-[#1F2228] transition-all border border-[#1F2228] tracking-widest"
                  >
                    NO, KEEP IT
                  </button>
                  <button
                    onClick={() => {
                      if (portfolios.length > 1) {
                        deletePortfolio(deleteConfirmId);
                        showToast('ลบกระเป๋าเรียบร้อยแล้ว');
                      }
                      setDeleteConfirmId(null);
                    }}
                    disabled={portfolios.length <= 1}
                    className="py-4 px-4 rounded-xl bg-rose-500 text-white font-bold text-xs hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {portfolios.length <= 1 ? 'CANNOT DELETE LAST' : 'YES, DELETE'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Add New / Edit Settings Modal */}
        {(isAddingNew || editingSettings) && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsAddingNew(false); setEditingSettings(null); }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-[#14161A] rounded-2xl p-8 border border-[#1F2228] shadow-2xl"
            >
              <header className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">{isAddingNew ? 'Create Workshop' : 'Edit Workshop'}</h3>
                  <p className="text-[10px] font-bold text-[#636A78] uppercase tracking-widest mt-1">Wallet Configuration</p>
                </div>
                <button 
                  onClick={() => { setIsAddingNew(false); setEditingSettings(null); }}
                  className="p-2 hover:bg-[#1F2228] rounded-xl text-[#636A78] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </header>

              <form onSubmit={isAddingNew ? handleCreatePortfolio : handleEditPortfolio} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] px-1 mb-2 block">Wallet Name</label>
                    <input 
                      type="text"
                      onFocus={handleFocus}
                      placeholder="e.g. Prop Firm, Main, Scalp..."
                      value={pName}
                      onChange={(e) => setPName(e.target.value)}
                      className="w-full bg-[#0A0B0E] border border-[#1F2228] rounded-xl p-4 text-white text-sm font-medium focus:outline-none focus:border-[#10B981] transition-all placeholder:text-[#2D3139]"
                    />
                  </div>

                  {isAddingNew && (
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] px-1 mb-2 block">Starting Balance</label>
                      <input 
                        type="number"
                        onFocus={handleFocus}
                        placeholder="0.00"
                        value={pBalance}
                        onChange={(e) => setPBalance(e.target.value)}
                        className="w-full bg-[#0A0B0E] border border-[#1F2228] rounded-xl p-4 text-white text-sm font-medium focus:outline-none focus:border-[#10B981] transition-all placeholder:text-[#2D3139]"
                      />
                    </div>
                  )}

                  {!isAddingNew && editingSettings && (
                    <div className="bg-[#0A0B0E]/50 p-4 rounded-xl border border-[#1F2228] space-y-4">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] block">Fund Management</label>
                      <div className="space-y-3">
                        <input 
                          type="number"
                          onFocus={handleFocus}
                          placeholder="Amount"
                          value={adjAmount}
                          onChange={(e) => setAdjAmount(e.target.value)}
                          className="w-full bg-[#0A0B0E] border border-[#1F2228] rounded-lg px-3 py-3 text-white text-sm focus:outline-none focus:border-[#10B981]"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={handleDeposit}
                            className="py-2.5 bg-[#10B981]/20 text-[#10B981] rounded-lg text-[10px] font-bold hover:bg-[#10B981]/30 transition-all uppercase tracking-wider"
                          >
                            Deposit
                          </button>
                          <button
                            type="button"
                            onClick={handleWithdraw}
                            className="py-2.5 bg-rose-500/10 text-rose-500 rounded-lg text-[10px] font-bold hover:bg-rose-500/20 transition-all uppercase tracking-wider"
                          >
                            Withdraw
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] px-1 mb-2 block">Currency</label>
                    <select 
                      value={pCurrency}
                      onFocus={handleFocus}
                      onChange={(e) => setPCurrency(e.target.value)}
                      className="w-full bg-[#0A0B0E] border border-[#1F2228] rounded-xl p-4 text-white text-sm font-medium focus:outline-none focus:border-[#10B981] transition-all"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="JPY">JPY (¥)</option>
                      <option value="THB">THB (฿)</option>
                    </select>
                  </div>

                  {!isAddingNew && editingSettings && (
                    <div className="pt-2 border-t border-[#1F2228]">
                      <button
                        type="button"
                        onClick={() => {
                          const targetId = editingSettings;
                          setEditingSettings(null);
                          setArchiveConfirmId(targetId);
                        }}
                        className="w-full py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl text-xs font-bold transition-all border border-amber-500/20 flex items-center justify-center gap-2"
                      >
                        <Archive className="w-4 h-4" />
                        จัดเก็บกระเป๋านี้ (Archive Wallet)
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setIsAddingNew(false); setEditingSettings(null); }}
                    className="flex-1 py-4 rounded-xl bg-[#0A0B0E] text-[#636A78] font-bold text-xs hover:bg-[#1F2228] transition-all border border-[#1F2228]"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 rounded-xl bg-[#10B981] text-[#0A0B0E] font-bold text-xs hover:opacity-90 transition-all shadow-lg shadow-[#10B981]/20"
                  >
                    {isAddingNew ? 'CREATE WALLET' : 'SAVE CHANGES'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
