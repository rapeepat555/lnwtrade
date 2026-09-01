import React, { useState, useEffect } from 'react';
import { Trade, Portfolio, Stats, TradeResult } from './types';
import { GoogleGenAI } from "@google/genai";
import { db, handleFirestoreError, OperationType, sanitizeData } from './lib/firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  writeBatch,
  getDoc,
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { User } from 'firebase/auth';

const STORAGE_KEY = 'tradetrack_pro_data';

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
};

export function useTradingData(user: User | null, targetUserId?: string | null) {
  const [loading, setLoading] = useState(true);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [setups, setSetups] = useState<string[]>(['Breakout', 'Pullback', 'Reversal', 'Scalp', 'Trend Following']);
  const [activePortfolioId, setActivePortfolioId] = useState<string>('default');

  useEffect(() => {
    if (portfolios.length > 0) {
      const exists = portfolios.some(p => p.id === activePortfolioId);
      if (!exists && activePortfolioId !== 'all') {
        setActivePortfolioId(portfolios[0].id);
      }
    }
  }, [portfolios, activePortfolioId]);

  const effectiveUserId = targetUserId || user?.uid;

  useEffect(() => {
    if (!effectiveUserId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Portfolios Listener
    const portfoliosRef = collection(db, 'users', effectiveUserId, 'portfolios');
    const unsubscribePortfolios = onSnapshot(portfoliosRef, (snapshot) => {
      if (!snapshot.empty) {
        setPortfolios(snapshot.docs.map(doc => {
          const data = doc.data() as Portfolio;
          // Self-healing: Ensure all transactions have IDs and proper numeric amounts
          if (data.transactions) {
            data.transactions = data.transactions.map((tx, idx) => {
              const amount = Number(tx.amount || 0);
              // Stable ID for legacy data: avoid using array index which shifts on new entries, but append idx to be absolutely unique
              return {
                ...tx,
                amount,
                portfolioId: tx.portfolioId || doc.id,
                id: tx.id || `tx-legacy-${doc.id}-${tx.date}-${amount}-${tx.type}-${idx}`
              };
            });
          }
          return { id: doc.id, ...data };
        }));
      } else if (!targetUserId && user) {
        // Initial setup for new user
        const initialPortfolio: Portfolio = {
          id: 'default',
          name: 'Main Wallet',
          balance: 10000,
          initialBalance: 10000,
          currency: 'USD',
          transactions: []
        };
        setDoc(doc(db, 'users', user.uid, 'portfolios', 'default'), initialPortfolio);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'portfolios', false);
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.portfolios && parsed.portfolios.length > 0) {
            setPortfolios(parsed.portfolios);
          }
        }
      } catch (e) {
        console.warn("Offline portfolio fallback failed:", e);
      }
    });

    // 2. Trades Listener
    const tradesRef = collection(db, 'users', effectiveUserId, 'trades');
    const unsubscribeTrades = onSnapshot(tradesRef, async (snapshot) => {
      if (snapshot.empty && !targetUserId && user) {
        // Check local storage for migration
        try {
          const savedDataRaw = localStorage.getItem(STORAGE_KEY);
          const savedData = savedDataRaw ? JSON.parse(savedDataRaw) : null;
          if (savedData && savedData.trades && savedData.trades.length > 0) {
            const batch = writeBatch(db);
            savedData.trades.forEach((t: Trade) => {
              batch.set(doc(db, 'users', user.uid, 'trades', t.id), sanitizeData(t));
            });
            await batch.commit();
          }
        } catch (err) {
          console.warn("Migration check skip or failed:", err);
        }
      }
      
      const rawTrades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trade));
      const processedTrades = rawTrades.map(t => {
        // If it looks closed but isn't fully processed, fix it in memory
        if (t.exitPrice != null && (t.pnl == null || t.status !== 'closed')) {
          const rawPnl = t.type === 'long' 
            ? (t.exitPrice - t.entryPrice) * t.quantity * 100
            : (t.entryPrice - t.exitPrice) * t.quantity * 100;
          const pnl = t.pnl ?? (rawPnl - (t.commission || 0));
          return { 
            ...t, 
            pnl, 
            result: pnl > 0 ? ('win' as const) : pnl < 0 ? ('loss' as const) : ('breakeven' as const), 
            status: 'closed' as const,
            exitDate: t.exitDate || new Date().toISOString()
          };
        }
        return t;
      });
      setTrades(processedTrades);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'trades', false);
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.trades && parsed.trades.length > 0) {
            setTrades(parsed.trades);
          }
        }
      } catch (e) {
        console.warn("Offline trades fallback failed:", e);
      }
    });

    // 3. Setups Listener
    const setupsRef = doc(db, 'users', effectiveUserId, 'settings', 'setups');
    const unsubscribeSetups = onSnapshot(setupsRef, async (snapshot) => {
      if (snapshot.exists()) {
        const list = snapshot.data().list || [];
        // Ensure unique setups and filter empty values with trimming
        const uniqueSetups = Array.from(new Set<string>(
          list
            .filter((s: any) => typeof s === 'string')
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0)
        ));
        setSetups(uniqueSetups);
      } else if (!targetUserId && user) {
        // Try migration
        try {
          const savedDataRaw = localStorage.getItem(STORAGE_KEY);
          const savedData = savedDataRaw ? JSON.parse(savedDataRaw) : null;
          if (savedData && savedData.setups) {
            const uniqueMigrated = Array.from(new Set(
              savedData.setups
                .filter((s: any) => typeof s === 'string')
                .map((s: string) => s.trim())
                .filter((s: string) => s.length > 0)
            ));
            await setDoc(setupsRef, sanitizeData({ list: uniqueMigrated }));
          }
        } catch (err) {
          console.warn("Setups migration skip or failed:", err);
        }
      }
      setLoading(false); // Fully loaded once all major listeners report back
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'setups', false);
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.setups && parsed.setups.length > 0) {
            setSetups(parsed.setups);
          }
        }
      } catch (e) {
        console.warn("Offline setups fallback failed:", e);
      }
      setLoading(false);
    });

    return () => {
      unsubscribePortfolios();
      unsubscribeTrades();
      unsubscribeSetups();
    };
  }, [user, effectiveUserId, targetUserId]);

  const activePortfolio = portfolios.find(p => p.id === activePortfolioId) || portfolios[0];

  // Helper to sync single trade
  const syncTrade = async (trade: Trade) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'trades', trade.id), sanitizeData(trade));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/trades/${trade.id}`);
    }
  };

  // Helper to sync portfolio
  const syncPortfolio = async (portfolio: Portfolio) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'portfolios', portfolio.id), sanitizeData(portfolio));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/portfolios/${portfolio.id}`);
    }
  };

  const syncSetups = async (newList: string[]) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'setups'), sanitizeData({ list: newList }));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/settings/setups`);
    }
  };

  const addTrade = async (tradeData: Omit<Trade, 'id' | 'pnl' | 'result'>) => {
    if (!user) return;
    const targetPortfolioId = tradeData.portfolioId || activePortfolioId;
    let pnl: number | null = null;
    let result: TradeResult = 'pending';

    const newId = generateId();
    let rr: number | null = null;

    if (tradeData.entryPrice) {
      const risk = tradeData.stopLoss ? Math.abs(tradeData.entryPrice - tradeData.stopLoss) : (tradeData.entryPrice * 0.01); // Default to 1% risk if no SL
      if (risk > 0) {
        const exit = tradeData.exitPrice ?? tradeData.takeProfit;
        if (exit != null) {
          const reward = tradeData.type === 'long' 
            ? (exit - tradeData.entryPrice) 
            : (tradeData.entryPrice - exit);
          rr = reward / risk;
        }
      }
    }
    
    if (tradeData.exitPrice !== undefined && tradeData.exitPrice !== null) {
      const grossPnl = tradeData.type === 'long' 
        ? (tradeData.exitPrice - tradeData.entryPrice) * tradeData.quantity * 100
        : (tradeData.entryPrice - tradeData.exitPrice) * tradeData.quantity * 100;
      pnl = grossPnl - (tradeData.commission || 0);
      result = (pnl || 0) > 0 ? 'win' : (pnl || 0) < 0 ? 'loss' : 'breakeven';
      
      const pToUpdate = portfolios.find(p => p.id === targetPortfolioId);
      if (pToUpdate) {
        const updated = { ...pToUpdate, balance: pToUpdate.balance + (pnl || 0) };
        await syncPortfolio(updated);
      }
      
      // Force status to closed if exit price is set
      tradeData.status = 'closed';
      if (!tradeData.exitDate) (tradeData as any).exitDate = new Date().toISOString();
    }

    const newTrade: Trade = {
      ...tradeData,
      id: newId,
      portfolioId: targetPortfolioId,
      pnl,
      result,
      rr,
    };
    return await syncTrade(newTrade);
  };

  const closeTrade = async (id: string, exitPrice: number, exitDate: string) => {
    const trade = trades.find(t => t.id === id);
    if (!trade) return;

    const grossPnl = trade.type === 'long' 
      ? (exitPrice - trade.entryPrice) * trade.quantity * 100
      : (trade.entryPrice - exitPrice) * trade.quantity * 100;
    const pnl = grossPnl - (trade.commission || 0);
    
    const result = pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'breakeven';
    
    let rr = trade.rr;
    if (trade.entryPrice) {
      const risk = trade.stopLoss ? Math.abs(trade.entryPrice - trade.stopLoss) : (trade.entryPrice * 0.01);
      if (risk > 0) {
        const reward = trade.type === 'long' 
          ? (exitPrice - trade.entryPrice) 
          : (trade.entryPrice - exitPrice);
        rr = reward / risk;
      }
    }

    // Update wallet balance via sync
    const p = portfolios.find(p => p.id === trade.portfolioId);
    if (p) {
      const updated = { ...p, balance: p.balance + pnl };
      await syncPortfolio(updated);
    }

    const updatedTrade: Trade = {
      ...trade,
      status: 'closed',
      exitPrice,
      exitDate,
      pnl,
      result,
      rr
    };

    await syncTrade(updatedTrade);
  };

  const deleteTrade = async (id: string) => {
    if (!user) return;
    const trade = trades.find(t => t.id === id);
    if (trade && trade.status === 'closed' && trade.pnl) {
      const p = portfolios.find(p => p.id === trade.portfolioId);
      if (p) {
        syncPortfolio({ ...p, balance: p.balance - trade.pnl! });
      }
    }
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'trades', id));
    } catch (err) {
      console.error("Failed to sync trade delete:", err);
    }
  };

  const stats: Stats = React.useMemo(() => {
    const closedTrades = trades
      .filter(t => (t.status === 'closed' || t.pnl != null) && t.portfolioId === activePortfolioId)
      .sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
    
    const wins = closedTrades.filter(t => t.result === 'win').length;
    const totalPnl = closedTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
    const rrValues = closedTrades.map(t => t.rr).filter((v): v is number => v !== undefined && v !== null);
    
    // Calculate Max Drawdown
    let maxDrawdown = 0;
    const currentPortfolio = portfolios.find(p => p.id === activePortfolioId) || portfolios[0];
    const transactions = (currentPortfolio?.transactions || []).map(tx => ({
      date: new Date(tx.date),
      amount: tx.amount,
      type: 'transaction' as const
    }));
    const tradesList = closedTrades.map(t => ({
      date: new Date(t.exitDate || t.entryDate),
      amount: t.pnl || 0,
      type: 'trade' as const
    }));

    const events = [...transactions, ...tradesList].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    const initialStart = Number(currentPortfolio?.initialBalance || 0) - (currentPortfolio?.transactions || []).reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
    let peak = initialStart;
    let currentBalance = initialStart;

    events.forEach(event => {
      currentBalance += event.amount;
      if (event.type === 'transaction') {
        peak += event.amount;
      }
      if (currentBalance > peak) {
        peak = currentBalance;
      }
      const dd = peak - currentBalance;
      if (dd > maxDrawdown) {
        maxDrawdown = dd;
      }
    });

    const totalInitialBalance = Number(currentPortfolio?.initialBalance || 0);
    
    return {
      totalTrades: closedTrades.length,
      winRate: closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0,
      totalPnl,
      avgRr: rrValues.length > 0 ? rrValues.reduce((a, b) => a + b, 0) / rrValues.length : 0,
      bestTrade: Math.max(0, ...closedTrades.map(t => Number(t.pnl || 0))),
      worstTrade: Math.min(0, ...closedTrades.map(t => Number(t.pnl || 0))),
      maxDrawdown,
      totalPnlPercent: totalInitialBalance > 0 ? (totalPnl / totalInitialBalance) * 100 : 0
    };
  }, [trades, activePortfolioId, portfolios]);

  return {
    loading,
    trades,
    setups,
    portfolios,
    activePortfolioId,
    activePortfolio,
    stats,
    setActivePortfolio: setActivePortfolioId,
    addPortfolio: async (name: string, initialBalance: number, currency: string) => {
      const newPortfolio: Portfolio = {
        id: generateId(),
        name,
        balance: initialBalance,
        initialBalance,
        currency,
        transactions: []
      };
      setActivePortfolioId(newPortfolio.id);
      await syncPortfolio(newPortfolio);
    },
    addTransaction: async (portfolioId: string, type: 'deposit' | 'withdraw' | 'adjustment', amount: number) => {
      const p = portfolios.find(p => p.id === portfolioId);
      if (!p) return;

      const newTransaction = {
        id: generateId(),
        type,
        amount: type === 'withdraw' ? -Math.abs(amount) : amount,
        date: new Date().toISOString(),
        portfolioId
      };
      
      const balanceAdj = type === 'withdraw' ? -Math.abs(amount) : amount;
      const initialAdj = balanceAdj;

      await syncPortfolio({
        ...p,
        balance: p.balance + balanceAdj,
        initialBalance: p.initialBalance + initialAdj,
        transactions: [newTransaction, ...(p.transactions || [])]
      });
    },
    deleteTransaction: async (portfolioId: string, transactionId: string | null) => {
      if (!transactionId) return;
      console.log("Attempting to delete transaction:", transactionId, "from specified portfolio:", portfolioId);
      
      // Resilient search: ignore the provided portfolioId if it's wrong and find where the transaction actually is
      let p = portfolios.find(p => p.id === portfolioId);
      let txToDelete = p?.transactions?.find(t => t.id === transactionId);

      if (!txToDelete) {
        console.warn("Transaction not found in specified portfolio. Searching all portfolios.");
        for (const port of portfolios) {
          const found = port.transactions?.find(t => t.id === transactionId);
          if (found) {
            p = port;
            txToDelete = found;
            break;
          }
        }
      }

      if (!p || !txToDelete) {
        console.error("Transaction not found for deletion anywhere:", transactionId);
        return;
      }

      const transactions = p.transactions || [];

      // To reverse a transaction, we subtract its amount from the balance
      // (Deposits are positive, withdrawals/adjustments can be negative)
      const adj = -Number(txToDelete.amount || 0);

      try {
        await syncPortfolio({
          ...p,
          balance: p.balance + adj,
          initialBalance: p.initialBalance + adj,
          transactions: transactions.filter(t => t.id !== transactionId)
        });
        console.log("Transaction deleted successfully");
      } catch (err) {
        console.error("Failed to delete transaction:", err);
      }
    },
    updatePortfolio: async (id: string, updates: Partial<Portfolio>) => {
      const p = portfolios.find(p => p.id === id);
      if (!p) return;
      await syncPortfolio({ ...p, ...updates });
    },
    archivePortfolio: async (id: string, isArchived: boolean = true) => {
      const p = portfolios.find(port => port.id === id);
      if (!p) return;
      const updated: Portfolio = {
        ...p,
        isArchived,
        archivedAt: isArchived ? new Date().toISOString() : undefined
      };
      
      // If archiving the currently active portfolio, switch to the first remaining unarchived wallet
      if (isArchived && activePortfolioId === id) {
        const remainingActive = portfolios.filter(port => port.id !== id && !port.isArchived);
        if (remainingActive.length > 0) {
          setActivePortfolioId(remainingActive[0].id);
        }
      }
      
      await syncPortfolio(updated);
    },
    deletePortfolio: async (id: string) => {
      if (!user || portfolios.length <= 1) return;
      if (activePortfolioId === id) {
        setActivePortfolioId(portfolios.find(p => p.id !== id)?.id || 'default');
      }
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'portfolios', id));
      } catch (err) {
        console.error("Failed to sync portfolio delete:", err);
      }
    },
    addTrade,
    closeTrade,
    updateTrade: async (id: string, updatedTrade: Partial<Trade>) => {
      const trade = trades.find(t => t.id === id);
      if (!trade) return;

      const merged = { ...trade, ...updatedTrade };
      
      if (merged.entryPrice) {
        const risk = merged.stopLoss ? Math.abs(merged.entryPrice - merged.stopLoss) : (merged.entryPrice * 0.01);
        if (risk > 0) {
          const exit = merged.exitPrice ?? merged.takeProfit;
          if (exit != null) {
            const reward = merged.type === 'long' 
              ? (exit - merged.entryPrice) 
              : (merged.entryPrice - exit);
            merged.rr = reward / risk;
          }
        }
      }

      if (merged.exitPrice !== undefined && merged.exitPrice !== null) {
        const grossPnl = merged.type === 'long' 
          ? (merged.exitPrice - merged.entryPrice) * merged.quantity * 100
          : (merged.entryPrice - merged.exitPrice) * merged.quantity * 100;
        const pnl = grossPnl - (merged.commission || 0);
        
        // Force status to closed if exit price is set
        merged.status = 'closed';
        if (!merged.exitDate) merged.exitDate = new Date().toISOString();

        if (trade.pnl !== undefined && trade.pnl !== null) {
          const diff = pnl - trade.pnl;
          const p = portfolios.find(p => p.id === merged.portfolioId);
          if (p) {
             await syncPortfolio({ ...p, balance: p.balance + diff });
          }
        } else {
          const p = portfolios.find(p => p.id === merged.portfolioId);
          if (p) {
             await syncPortfolio({ ...p, balance: p.balance + pnl });
          }
        }

        merged.pnl = pnl;
        merged.result = pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'breakeven';
      }

      return await syncTrade(merged);
    },
    deleteTrade,
    addSetup: (name: string) => {
      const cleanName = name.trim();
      if (!cleanName) return;
      const newList = !setups.find(s => s.toLowerCase() === cleanName.toLowerCase()) 
        ? [...setups, cleanName] 
        : setups;
      syncSetups(newList);
    },
    deleteSetup: (name: string) => {
      const newList = setups.filter(s => s !== name);
      syncSetups(newList);
    },
    updateSetup: (oldName: string, newName: string) => {
      const newList = setups.map(s => s === oldName ? newName : s);
      syncSetups(newList);
    },
    updateBalance: async (amount: number) => {
      const p = portfolios.find(port => port.id === activePortfolioId) || portfolios[0];
      if (!p) return;

      const portfolioTrades = trades.filter(t => t.portfolioId === p.id && (t.status === 'closed' || t.pnl != null));
      const tradesPnl = portfolioTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
      const currentCalculated = (p.initialBalance || 0) + tradesPnl;
      
      const diff = amount - currentCalculated;
      if (Math.abs(diff) > 0.001) {
        const newTransaction = {
          id: generateId(),
          type: 'adjustment' as const,
          amount: diff,
          date: new Date().toISOString(),
          portfolioId: p.id
        };
        await syncPortfolio({
          ...p,
          balance: amount,
          initialBalance: (p.initialBalance || 0) + diff,
          transactions: [newTransaction, ...(p.transactions || [])]
        });
      }
    }
  };
}

export async function getAiAnalysis(trades: Trade[]) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const closedTrades = trades.filter(t => t.status === 'closed');
  
  const prompt = `คุณคือโค้ชเทรดมืออาชีพ โปรดวิเคราะห์รายการเทรดเหล่านี้และให้คำแนะนำที่นำไปใช้ได้จริง 3 ข้อ เพื่อพัฒนาประสิทธิภาพการเทรด ให้ข้อมูลที่กระชับแต่มีความเป็นเทคนิคเชิงลึกที่เหมาะสม โปรดตอบเป็นภาษาไทยเท่านั้น

  Trades: ${JSON.stringify(closedTrades.slice(0, 50).map(t => ({
    symbol: t.symbol,
    type: t.type,
    result: t.result,
    pnl: t.pnl,
    setup: t.setup,
    entryPrice: t.entryPrice,
    exitPrice: t.exitPrice,
    rr: t.rr
  })))}
  
  รูปแบบการตอบ:
  1. [ข้อแนะนำที่ 1]
  2. [ข้อแนะนำที่ 2]
  3. [ข้อแนะนำที่ 3]`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });
    return response.text || "ไม่สามารถวิเคราะห์ได้ในขณะนี้";
  } catch (error) {
    console.error("AI Error:", error);
    return "การวิเคราะห์โดย AI ล้มเหลว โปรดตรวจสอบข้อมูลหรือการเชื่อมต่อของคุณ";
  }
}
