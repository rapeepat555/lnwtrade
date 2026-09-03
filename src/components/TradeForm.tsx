import React, { useState } from 'react';
import { X, Plus, Info, Search, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TradeType, Portfolio } from '../types';
import { SymbolSelector } from './SymbolSelector';
import { SetupManager } from './SetupManager';
import { cn, formatCurrency, formatDateTimeLocal } from '../lib/utils';
import { compressImage } from '../lib/image';

interface TradeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (trade: any) => void;
  setups: string[];
  portfolios: Portfolio[];
  activePortfolioId: string;
  addSetup: (name: string) => void;
  deleteSetup: (name: string) => void;
  updateSetup: (oldName: string, newName: string) => void;
  editingTrade?: any;
}

export function TradeForm({ 
  isOpen, 
  onClose, 
  onSubmit, 
  setups,
  portfolios,
  activePortfolioId,
  addSetup,
  deleteSetup,
  updateSetup,
  editingTrade
}: TradeFormProps) {
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isSetupManagerOpen, setIsSetupManagerOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const getRememberedWalletId = () => {
    try {
      const saved = localStorage.getItem('trade_form_last_wallet_id');
      if (saved && portfolios.some(p => p.id === saved)) {
        return saved;
      }
    } catch (e) {
      // ignore
    }
    if (activePortfolioId && portfolios.some(p => p.id === activePortfolioId)) {
      return activePortfolioId;
    }
    return portfolios[0]?.id || 'default';
  };

  const [formData, setFormData] = useState({
    symbol: '',
    type: 'long' as TradeType,
    entryPrice: '',
    stopLoss: '',
    commission: '',
    takeProfit: '',
    exitPrice: '',
    quantity: '', // used for Lot Size
    session: 'London',
    zone: '',
    timeframe: 'M5',
    setup: setups[0] || 'Breakout',
    portfolioId: getRememberedWalletId(),
    notes: '',
    images: [] as string[],
    entryDate: formatDateTimeLocal(),
    exitDate: ''
  });

  // Pre-fill form when editing
  React.useEffect(() => {
    if (editingTrade) {
      setFormData({
        symbol: editingTrade.symbol || '',
        type: editingTrade.type || 'long',
        entryPrice: editingTrade.entryPrice?.toString() || '',
        stopLoss: editingTrade.stopLoss?.toString() || '',
        commission: editingTrade.commission?.toString() || '',
        takeProfit: editingTrade.takeProfit?.toString() || '',
        exitPrice: editingTrade.exitPrice?.toString() || '',
        quantity: editingTrade.quantity?.toString() || '',
        session: editingTrade.session || 'London',
        zone: editingTrade.zone || '',
        timeframe: editingTrade.timeframe || 'M5',
        setup: editingTrade.setup || setups[0] || 'Breakout',
        portfolioId: editingTrade.portfolioId || getRememberedWalletId(),
        notes: editingTrade.notes || '',
        images: editingTrade.images || [],
        entryDate: editingTrade.entryDate ? formatDateTimeLocal(new Date(editingTrade.entryDate)) : formatDateTimeLocal(),
        exitDate: editingTrade.exitDate ? formatDateTimeLocal(new Date(editingTrade.exitDate)) : ''
      });
    } else {
      const currentWallet = getRememberedWalletId();
      setFormData({
        symbol: '',
        type: 'long',
        entryPrice: '',
        stopLoss: '',
        commission: '',
        takeProfit: '',
        exitPrice: '',
        quantity: '',
        session: 'London',
        zone: '',
        timeframe: 'M5',
        setup: setups[0] || 'Breakout',
        portfolioId: currentWallet,
        notes: '',
        images: [],
        entryDate: formatDateTimeLocal(),
        exitDate: ''
      });
    }
  }, [editingTrade, isOpen, setups, activePortfolioId, portfolios]);

  // Sync setup if the current one is deleted or setups change
  React.useEffect(() => {
    if (setups.length > 0 && !setups.includes(formData.setup)) {
      setFormData(prev => ({ ...prev, setup: setups[0] }));
    }
  }, [setups, formData.setup]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 4 - formData.images.length;
    if (remainingSlots <= 0) {
      alert("Maximum 4 images allowed per execution.");
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    for (const file of filesToProcess) {
      const reader = new FileReader();
      const promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const base64 = await promise;
      const compressed = await compressImage(base64, 800, 800, 0.6);
      
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, compressed]
      }));
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    // Only apply on mobile devices
    if (window.innerWidth < 768) {
      setTimeout(() => {
        e.target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 300);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.symbol) {
      alert("Please select a symbol before saving.");
      setIsSelectorOpen(true);
      return;
    }
    
    setIsSubmitting(true);
    try {
      const isClosed = formData.exitPrice;
      
      const tradeToSubmit = {
        ...formData,
        entryPrice: parseFloat(formData.entryPrice || '0'),
        stopLoss: formData.stopLoss ? parseFloat(formData.stopLoss) : null,
        commission: formData.commission ? parseFloat(formData.commission) : null,
        takeProfit: formData.takeProfit ? parseFloat(formData.takeProfit) : null,
        exitPrice: formData.exitPrice ? parseFloat(formData.exitPrice) : null,
        quantity: parseFloat(formData.quantity || '0'),
        images: formData.images,
        entryDate: new Date(formData.entryDate).toISOString(),
        exitDate: formData.exitDate ? new Date(formData.exitDate).toISOString() : (isClosed ? new Date().toISOString() : null),
        status: isClosed ? 'closed' : 'open',
        portfolioId: formData.portfolioId
      };
      
      try {
        localStorage.setItem('trade_form_last_wallet_id', formData.portfolioId);
      } catch (err) {
        // ignore
      }

      await onSubmit(tradeToSubmit);
      
      setFormData({
        symbol: '',
        type: 'long',
        entryPrice: '',
        stopLoss: '',
        commission: '',
        takeProfit: '',
        exitPrice: '',
        quantity: '',
        session: 'London',
        zone: '',
        timeframe: 'M5',
        setup: setups[0] || 'Breakout',
        portfolioId: formData.portfolioId,
        notes: '',
        images: [],
        entryDate: formatDateTimeLocal(),
        exitDate: ''
      });
      onClose();
    } catch (err: any) {
      console.error("Submission failed:", err);
      alert("Failed to save trade. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-1.25rem)] sm:w-full max-w-xl bg-[#14161A] rounded-2xl sm:rounded-3xl shadow-2xl z-[101] overflow-hidden border border-[#1F2228] h-[92vh] sm:h-[800px] max-h-[95vh] flex flex-col"
          >
            <div className="relative flex-1 flex flex-col min-h-0">
              <AnimatePresence mode="wait">
                {isSetupManagerOpen ? (
                  <motion.div
                    key="setup-manager"
                    initial={{ x: 300, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -300, opacity: 0 }}
                    className="absolute inset-0 flex flex-col"
                  >
                    <SetupManager 
                      setups={setups}
                      addSetup={addSetup}
                      deleteSetup={deleteSetup}
                      updateSetup={updateSetup}
                      onClose={() => setIsSetupManagerOpen(false)}
                    />
                  </motion.div>
                ) : isSelectorOpen ? (
                  <motion.div
                    key="selector"
                    initial={{ x: 300, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -300, opacity: 0 }}
                    className="absolute inset-0 flex flex-col"
                  >
                    <SymbolSelector 
                      onSelect={(symbol) => {
                        setFormData({ ...formData, symbol });
                        setIsSelectorOpen(false);
                      }}
                      onClose={() => setIsSelectorOpen(false)}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 10, opacity: 0 }}
                    className="absolute inset-0 flex flex-col overflow-hidden"
                  >
                    <div className="p-5 sm:p-6 border-b border-[#1F2228] flex items-center justify-between bg-[#0A0B0E] shrink-0">
                      <div>
                        <h3 className="text-lg sm:text-xl font-serif text-white tracking-tight">
                          {editingTrade ? 'Update Execution' : 'New Execution'}
                        </h3>
                        <p className="text-[11px] sm:text-xs text-[#636A78] font-medium">
                          {editingTrade ? 'Modify your trade data' : 'Log your market entry data'}
                        </p>
                      </div>
                      <button 
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="p-1.5 sm:p-2 hover:bg-[#1F2228] rounded-xl transition-all text-[#636A78] hover:text-white disabled:opacity-50"
                      >
                        <X className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
                      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 sm:space-y-5">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] px-1">Wallet / Workshop</label>
                          <select
                            disabled={isSubmitting}
                            onFocus={handleFocus}
                            className="w-full bg-[#0A0B0E] px-3.5 py-2.5 sm:py-3 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-xs sm:text-sm font-medium text-white appearance-none disabled:opacity-50"
                            value={formData.portfolioId}
                            onChange={e => {
                              const newWalletId = e.target.value;
                              setFormData({ ...formData, portfolioId: newWalletId });
                              try {
                                localStorage.setItem('trade_form_last_wallet_id', newWalletId);
                              } catch (err) {
                                console.warn(err);
                              }
                            }}
                          >
                            {portfolios.map(p => (
                              <option key={`form-p-${p.id}`} value={p.id} className="bg-[#14161A]">
                                {p.name}{p.isArchived ? ' (จัดเก็บแล้ว)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] px-1">Symbol</label>
                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => setIsSelectorOpen(true)}
                              className="w-full bg-[#0A0B0E] px-3.5 py-2.5 sm:py-3 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-xs sm:text-sm font-medium transition-all text-white flex items-center justify-between hover:border-[#10B981] disabled:opacity-50"
                            >
                              <span>{formData.symbol || 'Select Symbol'}</span>
                              <Search className="w-4 h-4 text-[#636A78]" />
                            </button>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] px-1">Direction</label>
                            <div className="flex bg-[#0A0B0E] p-1 rounded-xl border border-[#1F2228]">
                              <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => setFormData({ ...formData, type: 'long' })}
                                className={`flex-1 py-1.5 sm:py-2 text-xs font-bold rounded-lg transition-all disabled:opacity-50 ${formData.type === 'long' ? 'bg-[#1F2228] text-[#10B981]' : 'text-[#636A78]'}`}
                              >
                                BUY
                              </button>
                              <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => setFormData({ ...formData, type: 'short' })}
                                className={`flex-1 py-1.5 sm:py-2 text-xs font-bold rounded-lg transition-all disabled:opacity-50 ${formData.type === 'short' ? 'bg-[#1F2228] text-rose-500' : 'text-[#636A78]'}`}
                              >
                                SELL
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] px-1">Entry Price</label>
                            <input
                              required
                              disabled={isSubmitting}
                              onFocus={handleFocus}
                              type="number"
                              step="any"
                              placeholder="0.00"
                              className="w-full bg-[#0A0B0E] px-3.5 py-2.5 sm:py-3 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-xs sm:text-sm font-medium font-mono text-white disabled:opacity-50"
                              value={formData.entryPrice}
                              onChange={e => setFormData({ ...formData, entryPrice: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] px-1">Exit Price</label>
                            <input
                              type="number"
                              disabled={isSubmitting}
                              onFocus={handleFocus}
                              step="any"
                              placeholder="0.00"
                              className="w-full bg-[#0A0B0E] px-3.5 py-2.5 sm:py-3 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-xs sm:text-sm font-medium font-mono text-white disabled:opacity-50"
                              value={formData.exitPrice}
                              onChange={e => setFormData({ ...formData, exitPrice: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] px-1">Stop Loss</label>
                            <input
                              type="number"
                              disabled={isSubmitting}
                              onFocus={handleFocus}
                              step="any"
                              placeholder="0.00"
                              className="w-full bg-[#0A0B0E] px-3.5 py-2.5 sm:py-3 rounded-xl border border-[#1F2228] focus:outline-none focus:border-rose-500 text-xs sm:text-sm font-medium font-mono text-white disabled:opacity-50"
                              value={formData.stopLoss}
                              onChange={e => setFormData({ ...formData, stopLoss: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] px-1">Commission / Fee</label>
                            <input
                              type="number"
                              disabled={isSubmitting}
                              onFocus={handleFocus}
                              step="any"
                              placeholder="0.00"
                              className="w-full bg-[#0A0B0E] px-3.5 py-2.5 sm:py-3 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-xs sm:text-sm font-medium font-mono text-white disabled:opacity-50"
                              value={formData.commission}
                              onChange={e => setFormData({ ...formData, commission: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] px-1">Entry Time</label>
                            <input
                              required
                              disabled={isSubmitting}
                              onFocus={handleFocus}
                              type="datetime-local"
                              className="w-full bg-[#0A0B0E] px-3.5 py-2.5 sm:py-3 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-xs sm:text-sm font-medium text-white [color-scheme:dark] disabled:opacity-50"
                              value={formData.entryDate}
                              onChange={e => setFormData({ ...formData, entryDate: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] px-1">Exit Time</label>
                            <input
                              type="datetime-local"
                              disabled={isSubmitting}
                              onFocus={handleFocus}
                              className="w-full bg-[#0A0B0E] px-3.5 py-2.5 sm:py-3 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-xs sm:text-sm font-medium text-white [color-scheme:dark] disabled:opacity-50"
                              value={formData.exitDate}
                              onChange={e => setFormData({ ...formData, exitDate: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] px-1">Session</label>
                            <select
                              disabled={isSubmitting}
                              onFocus={handleFocus}
                              className="w-full bg-[#0A0B0E] px-3.5 py-2.5 sm:py-3 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-xs sm:text-sm font-medium text-white appearance-none disabled:opacity-50"
                              value={formData.session}
                              onChange={e => setFormData({ ...formData, session: e.target.value })}
                            >
                              <option value="Asia">Asia / Tokyo</option>
                              <option value="London">London</option>
                              <option value="New York">New York</option>
                              <option value="Sydney">Sydney</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] px-1">Zone</label>
                            <select
                              disabled={isSubmitting}
                              onFocus={handleFocus}
                              className="w-full bg-[#0A0B0E] px-3.5 py-2.5 sm:py-3 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-xs sm:text-sm font-medium text-white appearance-none disabled:opacity-50"
                              value={formData.zone}
                              onChange={e => setFormData({ ...formData, zone: e.target.value })}
                            >
                              <option value="">--</option>
                              <option value="LQT+Demand">LQT+Demand</option>
                              <option value="LQT+Supply">LQT+Supply</option>
                              <option value="LQT+Hidden Demand">LQT+Hidden Demand</option>
                              <option value="LQT+Hidden Supply">LQT+Hidden Supply</option>
                              <option value="LQT+FVG">LQT+FVG</option>
                              <option value="LQT+Resistance">LQT+Resistance</option>
                              <option value="LQT+Support">LQT+Support</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] px-1">Timeframe</label>
                            <select
                              disabled={isSubmitting}
                              onFocus={handleFocus}
                              className="w-full bg-[#0A0B0E] px-3.5 py-2.5 sm:py-3 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-xs sm:text-sm font-medium text-white appearance-none disabled:opacity-50"
                              value={formData.timeframe}
                              onChange={e => setFormData({ ...formData, timeframe: e.target.value })}
                            >
                              <option value="M1">M1</option>
                              <option value="M5">M5</option>
                              <option value="M15">M15</option>
                              <option value="M30">M30</option>
                              <option value="H1">H1</option>
                              <option value="H4">H4</option>
                              <option value="D1">D1</option>
                              <option value="W1">W1</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] px-1">Lot Size</label>
                            <input
                              required
                              disabled={isSubmitting}
                              onFocus={handleFocus}
                              type="number"
                              step="any"
                              placeholder="Volume"
                              className="w-full bg-[#0A0B0E] px-3.5 py-2.5 sm:py-3 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-xs sm:text-sm font-medium font-mono text-white disabled:opacity-50"
                              value={formData.quantity}
                              onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                            />
                          </div>
                        </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] px-1 flex items-center justify-between">
                              Setup Type
                              <button 
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => setIsSetupManagerOpen(true)}
                                className="p-1 hover:bg-[#1F2228] rounded text-[#10B981] transition-all disabled:opacity-50"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </label>
                            <select
                              disabled={isSubmitting}
                              onFocus={handleFocus}
                              className="w-full bg-[#0A0B0E] px-3.5 py-2.5 sm:py-3 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-xs sm:text-sm font-medium text-white appearance-none disabled:opacity-50"
                              value={formData.setup}
                              onChange={e => setFormData({ ...formData, setup: e.target.value })}
                            >
                              <option key="form-setup-all" value="all">All Setups</option>
                              {setups.map((setup, idx) => (
                                <option key={`form-setup-${setup}-${idx}`} value={setup} className="bg-[#14161A]">{setup}</option>
                              ))}
                            </select>
                          </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] px-1">Journal Entry</label>
                          <textarea
                            disabled={isSubmitting}
                            onFocus={handleFocus}
                            placeholder="What did you see in the charts?"
                            rows={3}
                            className="w-full bg-[#0A0B0E] px-3.5 py-2.5 sm:py-3 rounded-xl border border-[#1F2228] focus:outline-none focus:border-[#10B981] text-xs sm:text-sm font-medium resize-none transition-all text-white disabled:opacity-50"
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2 pb-4">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#636A78] px-1">Chart Screenshots</label>
                          <div className="grid grid-cols-4 gap-3">
                            {formData.images.map((img, index) => (
                              <div 
                                key={`form-img-${index}`} 
                                className="relative aspect-square rounded-lg overflow-hidden border border-[#1F2228] group cursor-pointer"
                                onClick={() => setPreviewImage(img)}
                              >
                                <img src={img} alt="Trade screenshot" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  disabled={isSubmitting}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeImage(index);
                                  }}
                                  className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-all scale-75 z-10 disabled:opacity-50"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            <label className={`aspect-square rounded-lg border-2 border-dashed border-[#1F2228] hover:border-[#10B981] hover:bg-[#10B981]/5 transition-all flex flex-col items-center justify-center cursor-pointer group ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>
                              <Plus className="w-6 h-6 text-[#636A78] group-hover:text-[#10B981]" />
                              <input
                                type="file"
                                multiple
                                disabled={isSubmitting}
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageUpload}
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 sm:p-4 border-t border-[#1F2228] bg-[#0A0B0E] shrink-0">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full bg-[#10B981] text-[#0A0B0E] py-2.5 sm:py-3 px-4 rounded-xl font-bold text-xs sm:text-sm tracking-wide hover:opacity-90 active:scale-[0.99] transition-all shadow-md shadow-[#10B981]/15 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isSubmitting ? (
                            <div className="w-4 h-4 border-2 border-[#0A0B0E]/30 border-t-[#0A0B0E] rounded-full animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                          <span>{isSubmitting ? 'SYNCING...' : editingTrade ? 'UPDATE TRADE DATA' : 'LOG NEW TRADE'}</span>
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
          <AnimatePresence>
            {previewImage && (
              <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setPreviewImage(null)}
                  className="absolute inset-0 bg-black/95 backdrop-blur-md"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative max-w-5xl max-h-[90vh] w-full flex items-center justify-center"
                >
                  <img 
                    src={previewImage} 
                    alt="Preview" 
                    className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" 
                  />
                  <button
                    onClick={() => setPreviewImage(null)}
                    className="absolute -top-12 right-0 p-2 text-white/50 hover:text-white transition-colors"
                  >
                    <X className="w-8 h-8" />
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}
