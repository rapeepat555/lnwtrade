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
  CreditCard as CardIcon
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
  const [txDeleteConfirmId, setTxDeleteConfirmId] = useState<string | null>(null);
  
  const activePortfolio = portfolios.find(p => p.id === activePortfolioId) || portfolios[0];
  
  const getCalculatedBalance = React.useCallback((p: Portfolio) => {
    const portfolioTrades = trades.filter(t => t.portfolioId === p.id && (t.status === 'closed' || t.pnl != null));
    const tradesPnl = portfolioTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
    return (p.initialBalance || 0) + tradesPnl;
  }, [trades]);

  const activeCalculatedBalance = getCalculatedBalance(activePortfolio);
  const [newBalance, setNewBalance] = useState(activeCalculatedBalance.toString());
  
  // Sync balance input when active portfolio or trades change
  React.useEffect(() => {
    setNewBalance(getCalculatedBalance(activePortfolio).toString());
  }, [activePortfolio.id, trades, getCalculatedBalance]);
  
  const formatValue = (val: number) => formatCurrency(val, activePortfolio.currency);

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
    // Update local state so the form reflects the new values
    setPBalance((p.initialBalance + amount).toString());
    setAdjAmount('');
  };

  const handleWithdraw = () => {
    if (!adjAmount || !editingSettings) return;
    const amount = parseFloat(adjAmount);
    addTransaction(editingSettings, 'withdraw', amount);
    
    const p = portfolios.find(p => p.id === editingSettings);
    if (!p) return;
    // Update local state
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
  };

  const handleEditPortfolio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSettings) return;
    updatePortfolio(editingSettings, {
      name: pName,
      currency: pCurrency
    });
    setEditingSettings(null);
  };

  const openSettings = (p: Portfolio) => {
    setPName(p.name);
    setPBalance(p.initialBalance.toString());
    setPCurrency(p.currency);
    setEditingSettings(p.id);
  };

  const performance = ((activePortfolio.balance - activePortfolio.initialBalance) / activePortfolio.initialBalance) * 100;

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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif text-white tracking-tight">Portfolio & Capital</h2>
          <p className="text-[#636A78] mt-1 text-sm">Manage your trading funds and allocation</p>
        </div>
        {!readOnly && (
          <button 
            onClick={() => {
              setPName('');
              setPBalance('');
              setIsAddingNew(true);
            }}
            className="flex items-center justify-center gap-2 bg-[#1F2228] border border-[#2D3139] text-[#E0E0E0] px-5 py-2.5 rounded-xl hover:bg-[#2D3139] transition-all font-bold text-xs tracking-tight"
          >
            <Plus className="w-4 h-4" />
            NEW WALLET
          </button>
        )}
      </header>

      {/* Wallets List / Horizontal Scroll */}
      <div className="relative group/wallets">
        <div className="flex overflow-x-auto gap-4 pb-6 snap-x snap-mandatory no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {portfolios.map(p => (
            <div 
              key={`wallet-card-${p.id}`}
              onClick={() => {
                setActivePortfolio(p.id);
                setNewBalance(p.balance.toString());
              }}
              className={cn(
                "min-w-[280px] sm:min-w-[320px] flex-shrink-0 p-5 rounded-2xl border transition-all cursor-pointer group relative snap-center",
                activePortfolioId === p.id 
                  ? "bg-[#14161A] border-[#10B981] shadow-lg shadow-[#10B981]/5" 
                  : "bg-[#0A0B0E] border-[#1F2228] hover:border-[#2D3139]"
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={cn(
                  "p-2 rounded-lg",
                  activePortfolioId === p.id ? "bg-[#10B981]/10 text-[#10B981]" : "bg-[#1F2228] text-[#636A78]"
                )}>
                  <CardIcon className="w-4 h-4" />
                </div>
                {!readOnly && (
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); openSettings(p); }}
                      className="p-2.5 bg-[#10B981]/10 hover:bg-[#10B981]/20 rounded-xl text-[#10B981] transition-all border border-[#10B981]/20 shadow-sm"
                      title="Edit wallet"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(p.id); }}
                      className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl text-rose-500 transition-all border border-rose-500/20 shadow-sm"
                      title="Delete wallet"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-[#636A78] mb-1">{p.name}</p>
              <h4 className="text-xl font-mono font-bold text-white mb-2">{formatCurrency(getCalculatedBalance(p), p.currency)}</h4>
              <div className="flex items-center justify-between">
              </div>
            </div>
          ))}
        </div>
        
        {/* Visual indicators for scroll */}
        <div className="absolute left-0 top-0 bottom-6 w-12 bg-gradient-to-r from-[#0A0B0E] to-transparent pointer-events-none opacity-0 group-hover/wallets:opacity-100 transition-opacity hidden sm:block" />
        <div className="absolute right-0 top-0 bottom-6 w-12 bg-gradient-to-l from-[#0A0B0E] to-transparent pointer-events-none opacity-0 group-hover/wallets:opacity-100 transition-opacity hidden sm:block" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#14161A] rounded-2xl p-8 text-white relative overflow-hidden border border-[#1F2228] shadow-2xl shadow-emerald-500/5">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <WalletIcon className="text-[#10B981] w-8 h-8" />
                {!readOnly && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => openSettings(activePortfolio)}
                      className="p-2.5 bg-[#10B981]/10 hover:bg-[#10B981]/20 rounded-xl text-[#10B981] transition-all border border-[#10B981]/20 shadow-sm"
                      title="Edit wallet"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => setDeleteConfirmId(activePortfolio.id)}
                      className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl text-rose-500 transition-all border border-rose-500/20 shadow-sm"
                      title="Delete wallet"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <CreditCard className="text-[#636A78] w-6 h-6 ml-2" />
                  </div>
                )}
                {readOnly && <CreditCard className="text-[#636A78] w-6 h-6 ml-2" />}
              </div>
              <p className="text-[#636A78] text-[10px] font-bold uppercase tracking-widest mb-2">Available Balance</p>
              {isEditing && !readOnly ? (
                <div className="flex items-center gap-3">
                  <input
                    autoFocus
                    type="number"
                    value={newBalance}
                    onChange={(e) => setNewBalance(e.target.value)}
                    className="bg-transparent text-2xl sm:text-3xl font-mono font-bold text-white border-b border-[#10B981] focus:outline-none w-full min-w-0"
                  />
                  <button onClick={handleUpdate} className="p-2 bg-[#10B981] rounded-lg shrink-0"><RefreshCw className="w-4 h-4 text-[#0A0B0E]" /></button>
                </div>
              ) : (
                <h3 
                  className={cn(
                    "text-2xl sm:text-4xl font-mono font-bold tracking-tight mb-4 break-words whitespace-normal transition-colors",
                    !readOnly ? "cursor-pointer hover:text-[#10B981]" : "cursor-default"
                  )} 
                  onClick={() => !readOnly && setIsEditing(true)}
                >
                  {formatValue(activeCalculatedBalance)}
                </h3>
              )}
              
              <div className="flex items-center gap-4 mt-8 pt-6 border-t border-[#1F2228]">
                <div className="ml-auto flex -space-x-2">
                  <div className="w-8 h-8 rounded-full border-2 border-[#14161A] bg-[#10B981]" />
                  <div className="w-8 h-8 rounded-full border-2 border-[#14161A] bg-indigo-500" />
                  <div className="w-8 h-8 rounded-full border-2 border-[#14161A] bg-[#1F2228] flex items-center justify-center text-[10px] font-bold">+2</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-[#14161A] p-8 rounded-2xl border border-[#1F2228] shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-semibold text-[#636A78] uppercase flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-[#10B981]" /> Symbol Exposure ({activePortfolio.name})
            </h3>
            <p className="text-[10px] font-medium text-[#636A78] italic">Frequency based</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    stroke="none"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#14161A', border: '1px solid #1F2228', borderRadius: '12px' }}
                    itemStyle={{ color: '#E0E0E0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-4">
              {allocationData.length === 0 ? (
                <p className="text-[#636A78] text-sm italic">No exposure data available for this wallet.</p>
              ) : allocationData.map((d, i) => (
                <div key={`allocation-${d.name}-${i}`} className="flex items-center justify-between p-3 rounded-xl bg-[#0A0B0E] border border-[#1F2228]">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                    <span className="text-sm font-bold text-[#E0E0E0]">{d.name}</span>
                  </div>
                  <span className="text-xs font-mono text-[#636A78]">{(d.value / allocationData.reduce((p, c) => p + c.value, 0) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

        <div className="bg-[#14161A] p-4 sm:p-8 rounded-2xl border border-[#1F2228] shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-semibold text-[#636A78] uppercase flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#10B981]" /> Transaction History ({activePortfolio.name})
            </h3>
            <p className="text-[10px] font-medium text-[#636A78] italic hidden sm:block">Funds adjustments</p>
          </div>
  
          <div className="space-y-3">
            {(!activePortfolio.transactions || activePortfolio.transactions.length === 0) ? (
              <div className="text-center py-12 bg-[#0A0B0E] rounded-2xl border border-[#1F2228] border-dashed">
                <p className="text-[#636A78] text-sm italic">No transaction history yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <table className="w-full text-left border-collapse min-w-[500px] sm:min-w-0">
                  <thead>
                    <tr className="border-b border-[#1F2228]">
                      <th className="pb-4 text-[10px] font-bold text-[#636A78] uppercase tracking-widest px-2 sm:px-4">Date</th>
                      <th className="pb-4 text-[10px] font-bold text-[#636A78] uppercase tracking-widest px-2 sm:px-4">Type</th>
                      <th className="pb-4 text-[10px] font-bold text-[#636A78] uppercase tracking-widest px-2 sm:px-4 text-right">Amount</th>
                      <th className="pb-4 text-[10px] font-bold text-[#636A78] uppercase tracking-widest px-2 sm:px-4 text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePortfolio.transactions.map((tx, i) => (
                      <tr key={tx.id ? `tx-${tx.id}-${i}` : `tx-idx-${i}`} className="border-b border-[#1F2228]/50 last:border-0 hover:bg-[#1F2228]/20 transition-colors group/row">
                        <td className="py-4 px-2 sm:px-4">
                          <span className="text-[10px] sm:text-xs text-[#E0E0E0] font-medium block">
                            {new Date(tx.date).toLocaleDateString()}
                          </span>
                          <span className="text-[9px] text-[#636A78] block">
                            {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="py-4 px-2 sm:px-4">
                          <div className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider",
                            tx.type === 'deposit' ? "bg-[#10B981]/10 text-[#10B981]" : 
                            tx.type === 'withdraw' ? "bg-rose-500/10 text-rose-500" :
                            "bg-indigo-500/10 text-indigo-500"
                          )}>
                            {tx.type === 'deposit' ? <ArrowUpRight className="w-3 h-3" /> : 
                             tx.type === 'withdraw' ? <ArrowDownRight className="w-3 h-3" /> :
                             <RefreshCw className="w-3 h-3" />}
                            {tx.type}
                          </div>
                        </td>
                        <td className="py-4 px-2 sm:px-4 text-right">
                          <span className={cn(
                            "text-xs sm:text-sm font-mono font-bold",
                            tx.type === 'deposit' ? "text-[#10B981]" : 
                            tx.type === 'withdraw' ? "text-rose-500" :
                            "text-indigo-500"
                          )}>
                            {tx.type === 'deposit' ? '+' : (tx.type === 'withdraw' ? '-' : '')}{formatCurrency(tx.amount, activePortfolio.currency)}
                          </span>
                        </td>
                        <td className="py-4 px-2 sm:px-4 text-right">
                          {!readOnly && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (tx.id) {
                                  setTxDeleteConfirmId(tx.id);
                                }
                              }}
                              className="p-3 sm:p-2.5 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl text-rose-500 transition-all border border-rose-500/20 shadow-sm active:scale-95"
                              title="Delete transaction"
                            >
                              <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      {/* Add / Edit Portfolio Modals */}
      <AnimatePresence>
        {txDeleteConfirmId !== null && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
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
              <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8 text-rose-500" />
              </div>
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
                <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center shadow-inner">
                  <Trash2 className="w-10 h-10 text-rose-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white tracking-tight">Delete Wallet?</h3>
                  <p className="text-[#636A78] text-sm mt-3 font-medium leading-relaxed px-2">
                    Warning: This will permanently delete <span className="text-white">"{portfolios.find(p => p.id === deleteConfirmId)?.name}"</span> and ALL all associated trade data.
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
