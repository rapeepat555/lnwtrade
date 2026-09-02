import React, { useState } from 'react';
import { Trade, Portfolio } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { CheckCircle2, Clock, Trash2, ArrowUpRight, ArrowDownRight, Image as ImageIcon, Edit2, AlertTriangle, X, Briefcase, LayoutGrid, Calendar, Sparkles, TrendingUp, TrendingDown, Percent, Award, Activity, FileText, PieChart, BookOpen, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface TradeHistoryProps {
  trades: Trade[];
  portfolios: Portfolio[];
  setups: string[];
  onDelete: (id: string) => void;
  onClose: (id: string, exitPrice: number, exitDate: string) => void;
  onEdit: (trade: Trade) => void;
  readOnly?: boolean;
}

export function TradeHistory({ trades, portfolios, setups, onDelete, onClose, onEdit, readOnly }: TradeHistoryProps) {
  const [closingId, setClosingId] = useState<string | null>(null);
  const [exitPrice, setExitPrice] = useState<string>('');
  const [selectedImages, setSelectedImages] = useState<string[] | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedPortfolioId, setSelectedPortfolioId] = React.useState<string>('all');
  const [selectedSetup, setSelectedSetup] = React.useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('all');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Reset page to 1 whenever filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedPortfolioId, selectedSetup, selectedPeriod]);

  const filteredTrades = React.useMemo(() => {
    const today = new Date();
    return trades
      .filter(t => {
        const matchPortfolio = selectedPortfolioId === 'all' || t.portfolioId === selectedPortfolioId;
        const matchSetup = selectedSetup === 'all' || t.setup === selectedSetup;
        
        let matchPeriod = true;
        if (selectedPeriod !== 'all') {
          const entryDate = new Date(t.entryDate);
          if (selectedPeriod === 'daily') {
            matchPeriod = entryDate.getDate() === today.getDate() &&
                          entryDate.getMonth() === today.getMonth() &&
                          entryDate.getFullYear() === today.getFullYear();
          } else if (selectedPeriod === 'weekly') {
            const diffTime = Math.abs(today.getTime() - entryDate.getTime());
            const diffDays = diffTime / (1000 * 60 * 60 * 24);
            matchPeriod = diffDays <= 7;
          } else if (selectedPeriod === 'monthly') {
            matchPeriod = entryDate.getMonth() === today.getMonth() &&
                          entryDate.getFullYear() === today.getFullYear();
          } else if (selectedPeriod === 'yearly') {
            matchPeriod = entryDate.getFullYear() === today.getFullYear();
          }
        }
        
        return matchPortfolio && matchSetup && matchPeriod;
      })
      .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
  }, [trades, selectedPortfolioId, selectedSetup, selectedPeriod]);

  const totalPages = Math.max(1, Math.ceil(filteredTrades.length / pageSize));
  
  // Ensure currentPage is within bounds
  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedTrades = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTrades.slice(startIndex, startIndex + pageSize);
  }, [filteredTrades, currentPage, pageSize]);

  const handleClose = (id: string) => {
    if (!exitPrice) return;
    onClose(id, parseFloat(exitPrice), new Date().toISOString());
    setClosingId(null);
    setExitPrice('');
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif text-white tracking-tight leading-tight">Trade History</h2>
          <p className="text-[#636A78] mt-0.5 text-xs">Detailed log of all your market executions</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Wallet Filter */}
          <div className="relative flex items-center gap-1.5 bg-[#14161A] border border-[#1F2228] px-3 py-1.5 rounded-xl w-[calc(50%-4px)] sm:w-auto min-w-0 shadow-sm hover:border-[#2D3139] transition-all">
            <Briefcase className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
            <select 
              value={selectedPortfolioId}
              onChange={(e) => setSelectedPortfolioId(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#E0E0E0] outline-none cursor-pointer pr-5 w-full truncate appearance-none"
            >
              <option key="portfolio-all" value="all" className="bg-[#14161A]">ทั้งหมด (Wallet)</option>
              {portfolios.map(p => (
                <option key={`portfolio-${p.id}`} value={p.id} className="bg-[#14161A] text-white">
                  {p.name}{p.isArchived ? ' (จัดเก็บแล้ว)' : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-[#636A78] absolute right-2 pointer-events-none" />
          </div>

          {/* Setup Filter */}
          <div className="relative flex items-center gap-1.5 bg-[#14161A] border border-[#1F2228] px-3 py-1.5 rounded-xl w-[calc(50%-4px)] sm:w-auto min-w-0 shadow-sm hover:border-[#2D3139] transition-all">
            <LayoutGrid className="w-3.5 h-3.5 text-[#3B82F6] shrink-0" />
            <select 
              value={selectedSetup}
              onChange={(e) => setSelectedSetup(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#E0E0E0] outline-none cursor-pointer pr-5 w-full truncate appearance-none"
            >
              <option key="setup-all" value="all" className="bg-[#14161A]">ทั้งหมด (Setup)</option>
              {setups.map((s, idx) => (
                <option key={`setup-${s}-${idx}`} value={s} className="bg-[#14161A] text-white">
                  {s}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-[#636A78] absolute right-2 pointer-events-none" />
          </div>

          {/* Period Filter */}
          <div className="relative flex items-center gap-1.5 bg-[#14161A] border border-[#1F2228] px-3 py-1.5 rounded-xl w-full sm:w-auto min-w-0 shadow-sm hover:border-[#2D3139] transition-all">
            <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <select 
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-[#E0E0E0] outline-none cursor-pointer pr-5 w-full truncate appearance-none"
            >
              <option value="all" className="bg-[#14161A]">ช่วงเวลาทั้งหมด (All Time)</option>
              <option value="daily" className="bg-[#14161A]">รายวัน (Today)</option>
              <option value="weekly" className="bg-[#14161A]">รายอาทิตย์ (Last 7 Days)</option>
              <option value="monthly" className="bg-[#14161A]">รายเดือน (This Month)</option>
              <option value="yearly" className="bg-[#14161A]">รายปี (This Year)</option>
            </select>
            <ChevronDown className="w-3 h-3 text-[#636A78] absolute right-2 pointer-events-none" />
          </div>

          {/* Review Button */}
          <button
            onClick={() => setShowReviewModal(true)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-[#10B981] to-emerald-600 hover:from-[#13d395] hover:to-emerald-500 text-black text-xs font-black rounded-xl hover:opacity-95 transition-all shadow-md shadow-[#10B981]/10 active:scale-95 cursor-pointer uppercase tracking-wider w-full sm:w-auto"
          >
            <BookOpen className="w-3.5 h-3.5 text-black shrink-0" />
            ทบทวน
          </button>
        </div>
      </header>

      <div className="bg-[#14161A] rounded-xl border border-[#1F2228] shadow-sm overflow-hidden">
        <div className="p-3 sm:p-3.5 border-b border-[#1F2228] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-[#636A78] uppercase">Recent Activity</h3>
            <span className="px-1.5 py-0.2 rounded-full bg-[#1F2228] text-[9px] font-bold text-[#E0E0E0]">
              {filteredTrades.length}
            </span>
          </div>
          {filteredTrades.length > 0 && (
            <span className="text-[10px] text-[#636A78] font-medium">
              Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredTrades.length)} of {filteredTrades.length}
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0A0B0E] text-[#636A78] text-[9px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2.5 font-medium">Asset</th>
                <th className="px-4 py-2.5 font-medium">Setup</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Qty</th>
                <th className="px-4 py-2.5 font-medium">Entry</th>
                <th className="px-4 py-2.5 font-medium">Exit</th>
                <th className="px-4 py-2.5 font-medium text-right">RR</th>
                <th className="px-4 py-2.5 font-medium text-right">Profit/Loss</th>
                {!readOnly && <th className="px-4 py-2.5 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="text-xs text-[#E0E0E0] divide-y divide-[#1F2228]">
              {paginatedTrades.length === 0 ? (
                <tr>
                  <td colSpan={readOnly ? 8 : 9} className="px-4 py-8 text-center text-[#636A78] italic">No trades logged yet.</td>
                </tr>
              ) : paginatedTrades.map((trade, idx) => (
                <tr 
                  key={trade.id ? `trade-row-${trade.id}-${idx}` : `trade-row-idx-${idx}`} 
                  className="hover:bg-[#1F2228] transition-colors group cursor-pointer"
                  onClick={() => setSelectedTrade(trade)}
                >
                  <td className="px-4 py-2">
                    <p className="font-bold text-white uppercase text-xs">{trade.symbol}</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {trade.session && (
                        <span className="px-1.5 py-0.2 rounded bg-[#1F2228] text-[8px] text-[#636A78] font-bold uppercase tracking-tight">
                          {trade.session}
                        </span>
                      )}
                      {trade.images && trade.images.length > 0 && (
                        <button 
                          onClick={() => setSelectedImages(trade.images || null)}
                          className="px-1.5 py-0.2 rounded bg-[#10B981]/10 text-[8px] text-[#10B981] font-bold uppercase tracking-tight flex items-center gap-1 hover:bg-[#10B981]/20 transition-all shadow-sm shadow-[#10B981]/5"
                        >
                          <ImageIcon className="w-2 h-2" /> {trade.images.length}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <p className="font-medium text-white text-xs">{trade.setup || '--'}</p>
                    {trade.zone && (
                      <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-[#1F2228] text-[8px] text-[#636A78] font-bold uppercase tracking-tight">
                        {trade.zone}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {trade.type === 'long' ? (
                      <span className="text-[#10B981] font-bold text-xs flex items-center gap-1 uppercase">
                        <ArrowUpRight className="w-3 h-3" /> BUY
                      </span>
                    ) : (
                      <span className="text-rose-500 font-bold text-xs flex items-center gap-1 uppercase">
                        <ArrowDownRight className="w-3 h-3" /> SELL
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-white">{trade.quantity}</td>
                  <td className="px-4 py-2">
                    <div>
                      <p className="font-mono text-xs text-white">{formatCurrency(trade.entryPrice)}</p>
                      <p className="text-[9px] text-[#636A78] font-medium">{format(new Date(trade.entryDate), 'MMM dd, HH:mm')}</p>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    {trade.exitPrice ? (
                      <div>
                        <p className="font-mono text-xs text-white">{formatCurrency(trade.exitPrice)}</p>
                        <p className="text-[9px] text-[#636A78] font-medium">{trade.exitDate ? format(new Date(trade.exitDate), 'MMM dd, HH:mm') : '--'}</p>
                      </div>
                    ) : (
                      !readOnly ? (
                        closingId === trade.id ? (
                          <div className="flex items-center gap-1.5">
                            <input 
                              type="number" 
                              className="w-16 px-1.5 py-0.5 text-[9px] bg-[#0A0B0E] border border-[#1F2228] rounded text-white focus:outline-none focus:border-[#10B981]" 
                              placeholder="Price"
                              value={exitPrice}
                              onChange={(e) => setExitPrice(e.target.value)}
                            />
                            <button onClick={() => handleClose(trade.id)} className="text-[9px] font-bold text-[#10B981] hover:underline underline-offset-4">CLOSE</button>
                          </div>
                        ) : (
                          <button onClick={() => setClosingId(trade.id)} className="text-[9px] font-bold text-[#10B981] hover:underline underline-offset-4">SET EXIT</button>
                        )
                      ) : (
                        <span className="text-[#1F2228] font-mono text-xs">--</span>
                      )
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      {trade.rr != null && (
                        <span className={cn(
                          "px-1.5 py-0.2 rounded text-[9px] font-black font-mono",
                          trade.rr > 0 ? "bg-[#10B981]/10 text-[#10B981]" : trade.rr < 0 ? "bg-rose-500/10 text-rose-500" : "bg-[#636A78]/10 text-[#636A78]"
                        )}>
                          {Number(trade.rr).toFixed(2)}R
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {trade.pnl !== undefined ? (
                      <span className={cn(
                        "font-bold text-xs font-mono",
                        trade.pnl > 0 ? "text-[#10B981]" : trade.pnl < 0 ? "text-rose-500" : "text-[#636A78]"
                      )}>
                        {trade.pnl > 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                      </span>
                    ) : (
                      <span className="text-[#1F2228] font-mono text-xs">--</span>
                    )}
                  </td>
                  {!readOnly && (
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(trade);
                          }}
                          className="p-1.5 bg-[#10B981]/10 text-[#10B981] hover:bg-[#10B981]/20 rounded-lg transition-all border border-[#10B981]/20 shadow-sm"
                          title="Edit trade"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(trade.id);
                          }}
                          className="p-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-lg transition-all border border-rose-500/20 shadow-sm"
                          title="Delete trade"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#1F2228] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#14161A]">
            <div className="text-xs text-[#636A78] font-medium">
              Page <span className="text-white font-bold">{currentPage}</span> of <span className="text-white font-bold">{totalPages}</span> ({filteredTrades.length} trades)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-2 rounded-xl bg-[#0A0B0E] border border-[#1F2228] text-[#E0E0E0] hover:text-white hover:bg-[#1F2228] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0A0B0E] border border-[#1F2228] text-xs font-bold text-[#E0E0E0] hover:text-white hover:bg-[#1F2228] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev</span>
              </button>

              {/* Page Number Buttons */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(pageNum => {
                    if (totalPages <= 5) return true;
                    if (pageNum === 1 || pageNum === totalPages) return true;
                    return Math.abs(pageNum - currentPage) <= 1;
                  })
                  .map((pageNum, idx, arr) => {
                    const prevNum = arr[idx - 1];
                    const showEllipsis = prevNum && pageNum - prevNum > 1;
                    return (
                      <React.Fragment key={`page-${pageNum}`}>
                        {showEllipsis && <span className="px-1 text-xs text-[#636A78]">...</span>}
                        <button
                          onClick={() => setCurrentPage(pageNum)}
                          className={cn(
                            "w-8 h-8 rounded-xl text-xs font-bold transition-all border",
                            currentPage === pageNum
                              ? "bg-[#10B981] text-black border-[#10B981] shadow-md shadow-[#10B981]/10 font-black"
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
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0A0B0E] border border-[#1F2228] text-xs font-bold text-[#E0E0E0] hover:text-white hover:bg-[#1F2228] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl bg-[#0A0B0E] border border-[#1F2228] text-[#E0E0E0] hover:text-white hover:bg-[#1F2228] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
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
                  <h3 className="text-xl font-bold text-white">Delete Execution?</h3>
                  <p className="text-[#636A78] text-sm mt-2 font-medium leading-relaxed">
                    This action cannot be undone. This trade data will be permanently removed from your history.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full mt-2">
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="py-3 px-4 rounded-xl bg-[#0A0B0E] text-[#636A78] font-bold text-xs hover:bg-[#1F2228] transition-all border border-[#1F2228]"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={() => {
                      onDelete(deleteConfirmId);
                      setDeleteConfirmId(null);
                    }}
                    className="py-3 px-4 rounded-xl bg-rose-500 text-white font-bold text-xs hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20"
                  >
                    DELETE
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {selectedTrade && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTrade(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0A0B0E] rounded-3xl border border-[#1F2228] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="px-4 py-4 sm:px-8 sm:py-6 border-b border-[#1F2228] flex items-center justify-between bg-[#14161A]/50">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className={cn(
                    "w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg",
                    selectedTrade.type === 'long' ? "bg-[#10B981]/10 text-[#10B981]" : "bg-rose-500/10 text-rose-500"
                  )}>
                    {selectedTrade.type === 'long' ? <ArrowUpRight className="w-5 h-5 sm:w-6 sm:h-6" /> : <ArrowDownRight className="w-5 h-5 sm:w-6 sm:h-6" />}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <h3 className="text-xl sm:text-2xl font-serif text-white uppercase tracking-tight">{selectedTrade.symbol}</h3>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest shrink-0",
                        selectedTrade.status === 'closed' ? "bg-[#10B981]/10 text-[#10B981]" : "bg-blue-500/10 text-blue-500"
                      )}>
                        {selectedTrade.status}
                      </span>
                    </div>
                    <p className="text-[#636A78] text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-0.5">
                      {selectedTrade.type === 'long' ? 'Buy Setup' : 'Sell Setup'} • {selectedTrade.session || 'Any Session'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedTrade(null)}
                  className="p-2 hover:bg-[#1F2228] rounded-xl text-[#636A78] transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-8 custom-scrollbar">
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#14161A] p-4 rounded-2xl border border-[#1F2228]">
                    <p className="text-[10px] font-bold text-[#636A78] uppercase tracking-widest mb-1">PnL</p>
                    <p className={cn(
                      "text-lg font-mono font-bold",
                      (selectedTrade.pnl || 0) > 0 ? "text-[#10B981]" : (selectedTrade.pnl || 0) < 0 ? "text-rose-500" : "text-white"
                    )}>
                      {(selectedTrade.pnl || 0) > 0 ? '+' : ''}{formatCurrency(selectedTrade.pnl || 0)}
                    </p>
                  </div>
                  <div className="bg-[#14161A] p-4 rounded-2xl border border-[#1F2228]">
                    <p className="text-[10px] font-bold text-[#636A78] uppercase tracking-widest mb-1">Return (R)</p>
                    <p className={cn(
                      "text-lg font-mono font-bold",
                      (selectedTrade.rr || 0) > 0 ? "text-[#10B981]" : (selectedTrade.rr || 0) < 0 ? "text-rose-500" : "text-white"
                    )}>
                      {Number(selectedTrade.rr || 0).toFixed(2)}R
                    </p>
                  </div>
                  <div className="bg-[#14161A] p-4 rounded-2xl border border-[#1F2228]">
                    <p className="text-[10px] font-bold text-[#636A78] uppercase tracking-widest mb-1">Quantity</p>
                    <p className="text-lg font-mono font-bold text-white uppercase">{selectedTrade.quantity}</p>
                  </div>
                  <div className="bg-[#14161A] p-4 rounded-2xl border border-[#1F2228]">
                    <p className="text-[10px] font-bold text-[#636A78] uppercase tracking-widest mb-1">Portfolio</p>
                    <p className="text-sm font-bold text-white truncate">
                      {portfolios.find(p => p.id === selectedTrade.portfolioId)?.name || 'Default'}
                    </p>
                  </div>
                </div>

                {/* Execution Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-[#636A78] uppercase tracking-[0.2em] flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" /> Entry Details
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-[#1F2228]/50">
                        <span className="text-xs text-[#636A78]">Entry Price</span>
                        <span className="text-sm font-mono text-white">{formatCurrency(selectedTrade.entryPrice)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-[#1F2228]/50">
                        <span className="text-xs text-[#636A78]">Date & Time</span>
                        <span className="text-sm font-medium text-white">{format(new Date(selectedTrade.entryDate), 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-[#636A78] uppercase tracking-[0.2em] flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Exit Details
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-[#1F2228]/50">
                        <span className="text-xs text-[#636A78]">Exit Price</span>
                        <span className="text-sm font-mono text-white">{selectedTrade.exitPrice ? formatCurrency(selectedTrade.exitPrice) : '--'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-[#1F2228]/50">
                        <span className="text-xs text-[#636A78]">Commission / Fee</span>
                        <span className="text-sm font-mono text-amber-500">{selectedTrade.commission ? formatCurrency(selectedTrade.commission) : '--'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-[#1F2228]/50">
                        <span className="text-xs text-[#636A78]">Date & Time</span>
                        <span className="text-sm font-medium text-white">
                          {selectedTrade.exitDate ? format(new Date(selectedTrade.exitDate), 'MMM dd, yyyy HH:mm') : '--'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Strategy Context */}
                <div className="space-y-4 bg-[#14161A] p-6 rounded-3xl border border-[#1F2228]">
                  <h4 className="text-[10px] font-bold text-[#636A78] uppercase tracking-[0.2em]">Strategy Context</h4>
                  <div className="flex flex-wrap gap-6">
                    <div>
                      <p className="text-[10px] text-[#636A78] uppercase mb-1">Setup</p>
                      <p className="text-sm font-bold text-white">{selectedTrade.setup || 'Not Specified'}</p>
                    </div>
                    {selectedTrade.zone && (
                      <div>
                        <p className="text-[10px] text-[#636A78] uppercase mb-1">Supply/Demand Zone</p>
                        <p className="text-sm font-bold text-white">{selectedTrade.zone}</p>
                      </div>
                    )}
                    {selectedTrade.timeframe && (
                      <div>
                        <p className="text-[10px] text-[#636A78] uppercase mb-1">Timeframe</p>
                        <p className="text-sm font-bold text-white">{selectedTrade.timeframe}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {selectedTrade.notes && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-[#636A78] uppercase tracking-[0.2em]">Execution Notes</h4>
                    <div className="bg-[#14161A] p-6 rounded-3xl border border-[#1F2228] text-sm text-[#E0E0E0] leading-relaxed italic">
                      "{selectedTrade.notes}"
                    </div>
                  </div>
                )}

                {/* Images */}
                {selectedTrade.images && selectedTrade.images.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-[#636A78] uppercase tracking-[0.2em]">Visual Evidence ({selectedTrade.images.length})</h4>
                    <div className="grid grid-cols-1 gap-4">
                      {selectedTrade.images.map((img, i) => (
                        <div key={selectedTrade.id ? `evidence-img-${selectedTrade.id}-${i}` : `evidence-img-idx-${i}`} className="rounded-2xl overflow-hidden border border-[#1F2228] group/img relative shadow-xl">
                          <img src={img} alt={`Trade Evidence ${i + 1}`} className="w-full h-auto" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                             <button 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 window.open(img, '_blank');
                               }}
                               className="px-4 py-2 bg-white text-black font-bold text-xs rounded-xl shadow-lg transform translate-y-4 group-hover/img:translate-y-0 transition-transform"
                             >
                               VIEW FULL SIZE
                             </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {!readOnly && (
                <div className="p-6 bg-[#14161A] border-t border-[#1F2228] flex gap-3">
                  <button 
                    onClick={() => {
                      onEdit(selectedTrade);
                      setSelectedTrade(null);
                    }}
                    className="flex-1 py-4 bg-white text-black font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-opacity-90 transition-all shadow-lg"
                  >
                    Modify Execution
                  </button>
                  <button 
                    onClick={() => {
                      setDeleteConfirmId(selectedTrade.id);
                      setSelectedTrade(null);
                    }}
                    className="px-6 py-4 bg-rose-500/10 text-rose-500 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-rose-500/20 transition-all border border-rose-500/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {selectedImages && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedImages(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-4xl max-h-[80vh] overflow-y-auto bg-[#14161A] rounded-2xl p-6 border border-[#1F2228] flex flex-col gap-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Chart Screenshots</h3>
                <button 
                  onClick={() => setSelectedImages(null)}
                  className="p-2 hover:bg-[#1F2228] rounded-full text-[#636A78]"
                >
                  <ArrowUpRight className="w-5 h-5 rotate-45" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedImages.map((img, i) => (
                  <div key={`screenshot-${i}`} className="rounded-xl overflow-hidden border border-[#1F2228]">
                    <img src={img} alt={`Chart ${i + 1}`} className="w-full h-auto" />
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {showReviewModal && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReviewModal(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-4xl bg-[#0A0B0E] rounded-3xl border border-[#1F2228] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-[#1F2228] flex items-center justify-between bg-[#14161A]/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#10B981]/20 to-emerald-600/10 flex items-center justify-center text-[#10B981] border border-[#10B981]/20 shadow-lg shrink-0">
                    <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-serif text-white tracking-tight leading-none font-bold">ทบทวนรายการเทรดแบบละเอียด</h3>
                    <p className="text-[9px] sm:text-[10px] text-[#636A78] font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                      บันทึกการเทรดที่มีอยู่ทั้งหมด {filteredTrades.length} รายการ (ตามตัวกรองของคุณ)
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowReviewModal(false)}
                  className="p-2 hover:bg-[#1F2228] rounded-xl text-[#E2E8F0] hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Filtering summary bar inside review modal */}
              {filteredTrades.length > 0 && (
                <div className="px-4 py-3 sm:px-6 bg-[#0d0e12] border-b border-[#1F2228]/40 flex flex-wrap gap-2 sm:gap-4 items-center text-xs text-[#94A3B8]">
                  <span className="font-bold">ตัวกรองพอร์ต & โมเดล:</span>
                  <span className="bg-[#14161A] border border-[#1F2228] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-white font-mono text-[10px] sm:text-[11px] font-bold">
                    Wallet: {selectedPortfolioId === 'all' ? 'ทั้งหมด' : portfolios.find(p => p.id === selectedPortfolioId)?.name || 'Default'}
                  </span>
                  <span className="bg-[#14161A] border border-[#1F2228] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-white font-mono text-[10px] sm:text-[11px] font-bold">
                    Setup: {selectedSetup === 'all' ? 'ทั้งหมด' : selectedSetup}
                  </span>
                </div>
              )}

              {/* Content body with the trades feed */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-[#07080a]">
                {filteredTrades.length === 0 ? (
                  <div className="py-24 px-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#14161A] flex items-center justify-center text-[#636A78] mx-auto mb-4 border border-[#1F2228]">
                      <BookOpen className="w-8 h-8 text-[#636A78]" />
                    </div>
                    <h4 className="text-base font-bold text-[#E0E0E0]">ไม่พบรายการเทรดในตัวกรองนี้</h4>
                    <p className="text-xs text-[#636A78] max-w-sm mx-auto mt-2 leading-relaxed">
                      โปรดสลับหรือล้างตัวกรองกระเป๋าเงิน (All Wallets) หรือเลือกโมเดล (All Setups) ด้านหลังก่อนเปิดหน้าต่างทบทวน
                    </p>
                  </div>
                ) : (
                  <div className="space-y-8 pb-12">
                    {filteredTrades.map((t, index) => {
                      const portfolioName = portfolios.find(p => p.id === t.portfolioId)?.name || 'Default Wallet';

                      return (
                        <div 
                          key={t.id ? `review-item-${t.id}-${index}` : `review-item-idx-${index}`}
                          className="bg-[#111317] border border-[#1F2228] hover:border-[#2a2e37] rounded-3xl p-6 transition-all duration-300 relative shadow-xl overflow-hidden group"
                        >
                          {/* Top-left list element tracker */}
                          <div className="absolute top-0 left-0 bg-[#1F2228] text-white text-[10px] font-mono font-bold px-3 py-1 rounded-br-2xl">
                            รายการที่ {filteredTrades.length - index}
                          </div>

                          {/* Trade Header */}
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#1F2228]/45 pb-4 pt-2">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-11 h-11 rounded-xl flex items-center justify-center font-bold shadow-lg",
                                t.type === 'long' ? "bg-[#10B981]/15 text-[#10B981]" : "bg-rose-500/15 text-rose-500"
                              )}>
                                {t.type === 'long' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-1.5 xs:gap-2">
                                  <h4 className="text-2xl font-mono text-white font-black tracking-tight uppercase leading-none">{t.symbol}</h4>
                                  <span className={cn(
                                    "px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest shrink-0",
                                    t.type === 'long' ? "bg-[#10B981] text-black font-black" : "bg-rose-500 text-white font-black"
                                  )}>
                                    {t.type === 'long' ? 'BUY / LONG' : 'SELL / SHORT'}
                                  </span>
                                  <span className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest shrink-0",
                                    t.status === 'closed' ? "bg-[#1F2228] text-[#94A3B8]" : "bg-blue-500/15 text-blue-400 animate-pulse border border-blue-500/30"
                                  )}>
                                    {t.status === 'closed' ? 'ยุติตำแหน่งแล้ว' : 'เปิดออเดอร์ค้างอยู่'}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-y-1.5 gap-x-2.5 mt-2.5 text-xs text-[#94A3B8]">
                                  <span className="flex items-center gap-1 shrink-0">
                                    <Briefcase className="w-3.5 h-3.5 text-[#636A78]" />
                                    กระเป๋า: <strong className="text-white bg-[#1F2228] px-1.5 py-0.5 rounded text-[10px]">{portfolioName}</strong>
                                  </span>
                                  {t.setup && (
                                    <>
                                      <span className="text-[#3F444E] hidden xs:inline">•</span>
                                      <span className="flex items-center gap-1 shrink-0">
                                        <LayoutGrid className="w-3.5 h-3.5 text-amber-500" />
                                        โมเดลกลยุทธ์: <strong className="text-amber-400 uppercase font-bold">{t.setup}</strong>
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Financial outcomes on the right */}
                            <div className="text-left md:text-right flex md:flex-col items-center md:items-end gap-3 md:gap-1.5">
                              {t.status === 'closed' ? (
                                <>
                                  <span className={cn(
                                    "text-2xl font-mono font-black tracking-tight",
                                    (t.pnl || 0) > 0 ? "text-[#10B981]" : (t.pnl || 0) < 0 ? "text-rose-500" : "text-white"
                                  )}>
                                    {(t.pnl || 0) > 0 ? '+' : ''}{formatCurrency(t.pnl || 0)}
                                  </span>
                                  {t.rr != null && (
                                    <span className={cn(
                                      "px-3 py-1 rounded-xl text-xs font-mono font-black uppercase tracking-wider",
                                      (t.rr || 0) > 0 ? "bg-[#10B981] text-black shadow-lg shadow-[#10B981]/15" : (t.rr || 0) < 0 ? "bg-rose-500 text-white shadow-lg shadow-rose-500/15" : "bg-[#1F2228] text-[#94A3B8]"
                                    )}>
                                      {t.rr > 0 ? '+' : ''}{t.rr.toFixed(2)}R
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="px-3 py-1 bg-blue-500/10 text-blue-400 font-bold text-[10px] uppercase tracking-widest rounded-xl animate-pulse border border-blue-500/20">
                                  OPEN POSITION
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Detail Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-5">
                            <div className="bg-[#14161A] p-4 rounded-2xl border border-[#1F2228]/60">
                              <p className="text-[10px] font-bold text-[#636A78] uppercase tracking-wider mb-1.5">ราคาเปิด (Entry Price)</p>
                              <p className="text-base font-mono font-extrabold text-white">{formatCurrency(t.entryPrice)}</p>
                            </div>
                            <div className="bg-[#14161A] p-4 rounded-2xl border border-[#1F2228]/60">
                              <p className="text-[10px] font-bold text-[#636A78] uppercase tracking-wider mb-1.5">ตัดขาดทุน (Stop Loss)</p>
                              <p className="text-base font-mono font-extrabold text-rose-400">{t.stopLoss ? formatCurrency(t.stopLoss) : '--'}</p>
                            </div>
                            <div className="bg-[#14161A] p-4 rounded-2xl border border-[#1F2228]/60">
                              <p className="text-[10px] font-bold text-[#636A78] uppercase tracking-wider mb-1.5">เป้าทำกำไร (Take Profit)</p>
                              <p className="text-base font-mono font-extrabold text-emerald-400">{t.takeProfit ? formatCurrency(t.takeProfit) : '--'}</p>
                            </div>
                            <div className="bg-[#14161A] p-4 rounded-2xl border border-[#1F2228]/60">
                              <p className="text-[10px] font-bold text-[#636A78] uppercase tracking-wider mb-1.5">ราคาปิด (Exit Price)</p>
                              <p className="text-base font-mono font-extrabold text-white">{t.exitPrice ? formatCurrency(t.exitPrice) : '--'}</p>
                            </div>
                            <div className="bg-[#14161A] p-4 rounded-2xl border border-[#1F2228]/60">
                              <p className="text-[10px] font-bold text-[#636A78] uppercase tracking-wider mb-1.5">ค่าธรรมเนียม (Commission)</p>
                              <p className="text-base font-mono font-extrabold text-amber-500">{t.commission ? formatCurrency(t.commission) : '--'}</p>
                            </div>
                          </div>

                          {/* Strategy & Meta Section */}
                          <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-medium">
                            {t.session && (
                              <span className="bg-[#0A0B0E] text-[#E2E8F0] px-3 py-1.5 rounded-xl border border-[#1F2228]">
                                🏙️ Session / เวลาตลาด: <strong className="text-white ml-0.5">{t.session}</strong>
                              </span>
                            )}
                            {t.zone && (
                              <span className="bg-[#0A0B0E] text-[#E2E8F0] px-3 py-1.5 rounded-xl border border-[#1F2228]">
                                🎯 แนวรับ-รับสำคัญ: <strong className="text-white ml-0.5">{t.zone}</strong>
                              </span>
                            )}
                            {t.timeframe && (
                              <span className="bg-[#0A0B0E] text-[#E2E8F0] px-3 py-1.5 rounded-xl border border-[#1F2228]">
                                ⏱️ ไทม์เฟรมชาร์ต (TF): <strong className="text-white ml-0.5">{t.timeframe}</strong>
                              </span>
                            )}
                            <span className="bg-[#0A0B0E] text-[#E2E8F0] px-3 py-1.5 rounded-xl border border-[#1F2228]">
                              📦 จำนวนที่เทรด (Qty): <strong className="text-white ml-0.5">{t.quantity}</strong>
                            </span>
                          </div>

                          {/* Timeline display */}
                          <div className="mt-5 pt-4 border-t border-[#1F2228]/50 flex flex-col sm:flex-row gap-y-2 gap-x-6 text-xs text-[#94A3B8] font-bold">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-[#10B981]" />
                              เวลาเข้ารับออเดอร์: <span className="text-white font-mono">{format(new Date(t.entryDate), 'dd MMM yyyy • HH:mm:ss')}</span>
                            </span>
                            {t.exitDate && (
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-rose-500" />
                                เวลาปิดทำรายการ: <span className="text-white font-mono">{format(new Date(t.exitDate), 'dd MMM yyyy • HH:mm:ss')}</span>
                              </span>
                            )}
                          </div>

                          {/* Notes/Commentary Display */}
                          <div className="mt-5 space-y-2">
                            <p className="text-xs font-black text-[#E2E8F0] uppercase tracking-wider flex items-center gap-1.5">
                              <FileText className="w-4 h-4 text-[#10B981]" /> รายละเอียดและการวิเคราะห์การจดบันทึก (Journal Commentary)
                            </p>
                            {t.notes ? (
                              <div className="bg-[#07080a] p-5 rounded-2xl border border-[#1F2228] text-sm text-[#E0E0E0] leading-relaxed whitespace-pre-wrap pl-6 relative">
                                <div className="absolute left-2.5 top-3 text-3xl font-serif text-[#10B981]/25 leading-none">“</div>
                                <span className="relative z-10">{t.notes}</span>
                              </div>
                            ) : (
                              <div className="bg-[#14161A]/30 p-4 rounded-2xl border border-[#1F2228]/30 text-xs text-[#636A78] italic">
                                ไม่มีโน๊ตบันทึกเพิ่มเติมหรือเหตุผลของการเข้าเทรด
                              </div>
                            )}
                          </div>

                          {/* Screenshots Direct Rendering! */}
                          {t.images && t.images.length > 0 && (
                            <div className="mt-5 space-y-2">
                              <p className="text-xs font-black text-[#E2E8F0] uppercase tracking-wider flex items-center gap-1.5">
                                <ImageIcon className="w-4 h-4 text-[#10B981]" /> ภาพบันทึกจุดซื้อขายกราฟและทางเทคนิค (Chart Evidence)
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {t.images.map((img, i) => (
                                  <div 
                                    key={t.id ? `review-img-${t.id}-${i}` : `review-img-idx-${index}-${i}`}
                                    className="rounded-2xl overflow-hidden border border-[#1F2228] hover:border-[#2a2e37] group/img relative shadow-md bg-[#14161A] aspect-video flex items-center justify-center cursor-zoom-in transition-all duration-300"
                                    onClick={() => setSelectedImages([img])}
                                  >
                                    <img 
                                      src={img} 
                                      alt={`Evidence ${i + 1}`} 
                                      className="w-full h-full object-cover group-hover/img:scale-[1.03] transition-transform duration-300"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                      <span className="px-4 py-2 bg-[#10B981] text-black font-black text-xs rounded-xl shadow-lg tracking-wider uppercase shadow-md shadow-[#10B981]/20 transform translate-y-2 group-hover/img:translate-y-0 transition-transform">
                                        คลิกเพื่อดูรูปภาพขนาดเต็ม
                                      </span>
                                    </div>
                                    <div className="absolute bottom-3 right-3 bg-black/85 px-2.5 py-1 rounded-xl text-[10px] text-white font-bold border border-[#1F2228]">
                                      รูปภาพหลักฐานอ้างอิง #{i + 1}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Close Footer */}
              <div className="px-6 py-4 bg-[#14161A] border-t border-[#1F2228] flex justify-end">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="px-8 py-3 bg-[#1F2228] text-white hover:bg-[#2A2E37] font-black text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 cursor-pointer border border-[#2E323A]"
                >
                  เรียบร้อย
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
