import React from 'react';
import { motion } from 'framer-motion';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { subWeeks, subMonths, subYears, isAfter } from 'date-fns';
import { Stats, Trade, Portfolio } from '../types';
import { formatCurrency, formatPercentage, cn } from '../lib/utils';
import { TrendingUp, TrendingDown, Target, Zap, Filter, LayoutGrid, Briefcase } from 'lucide-react';
import { TradeCalendar } from './TradeCalendar';

interface DashboardProps {
  trades: Trade[];
  portfolios: Portfolio[];
  setups: string[];
  readOnly?: boolean;
}

export function Dashboard({ trades, portfolios, setups, readOnly }: DashboardProps) {
  const [selectedPortfolioId, setSelectedPortfolioId] = React.useState<string>('all');
  const [selectedSetup, setSelectedSetup] = React.useState<string>('all');
  const [selectedTimeRange, setSelectedTimeRange] = React.useState<'1W' | '1M' | '1Y' | 'ALL'>('ALL');

  const filteredTrades = React.useMemo(() => {
    return trades.filter(t => {
      const matchPortfolio = selectedPortfolioId === 'all' || t.portfolioId === selectedPortfolioId;
      const matchSetup = selectedSetup === 'all' || t.setup === selectedSetup;
      
      let matchTime = true;
      if (selectedTimeRange !== 'ALL') {
        const tradeDate = new Date(t.entryDate);
        const now = new Date();
        if (selectedTimeRange === '1W') matchTime = isAfter(tradeDate, subWeeks(now, 1));
        else if (selectedTimeRange === '1M') matchTime = isAfter(tradeDate, subMonths(now, 1));
        else if (selectedTimeRange === '1Y') matchTime = isAfter(tradeDate, subYears(now, 1));
      }

      return matchPortfolio && matchSetup && matchTime;
    });
  }, [trades, selectedPortfolioId, selectedSetup, selectedTimeRange]);

  const stats = React.useMemo(() => {
    const closedTrades = filteredTrades
      .filter(t => t.status === 'closed' || t.pnl != null)
      .sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
    
    const wins = closedTrades.filter(t => t.result === 'win').length;
    const totalPnl = closedTrades.reduce((acc, t) => acc + Number(t.pnl || 0), 0);
    const rrValues = closedTrades.map(t => Number(t.rr)).filter((v): v is number => !isNaN(v));
    
    // Calculate Max Drawdown based on combined history (trades + transactions)
    const portfoliosWithCurrency = portfolios.map(p => ({ ...p, currency: p.currency || 'USD' }));
    const relevantPortfolios = selectedPortfolioId === 'all' ? portfoliosWithCurrency : portfoliosWithCurrency.filter(p => p.id === selectedPortfolioId);
    
    const allTransactions = relevantPortfolios.flatMap(p => p.transactions || []);
    const tradesInOrder = [...filteredTrades]
      .filter(t => t.status === 'closed' || t.pnl != null)
      .map(t => ({ date: new Date(t.exitDate || t.entryDate || 0), amount: Number(t.pnl || 0) }));

    const transactionsInOrder = allTransactions.map(tx => ({ 
      date: new Date(tx.date || 0), 
      amount: Number(tx.amount || 0),
      type: 'transaction' as const
    }));
    const tradesInOrderShort = [...filteredTrades]
      .filter(t => t.status === 'closed' || t.pnl != null)
      .map(t => ({ 
        date: new Date(t.exitDate || t.entryDate || 0), 
        amount: Number(t.pnl || 0),
        type: 'trade' as const
      }));

    const allEvents = [...tradesInOrderShort, ...transactionsInOrder].sort((a, b) => a.date.getTime() - b.date.getTime());

    const currentInitialBalance = relevantPortfolios.reduce((acc, p) => acc + Number(p.initialBalance || 0), 0);
    const totalTransactionsAmount = allTransactions.reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
    const originalStartBalance = currentInitialBalance - totalTransactionsAmount;

    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;
    let peak = originalStartBalance;
    let currentBalance = originalStartBalance;

    allEvents.forEach(event => {
      // For each event (trade or transaction), update current balance
      currentBalance += event.amount;
      
      if (event.type === 'transaction') {
        // Cashflows (deposits/withdrawals) shift the peak and current balance equally
        // to maintain the same percentage drawdown level.
        peak += event.amount;
      }

      if (currentBalance > peak) {
        peak = currentBalance;
      }
      
      const dd = peak - currentBalance;
      if (dd > maxDrawdown) {
        maxDrawdown = dd;
        if (peak > 0) {
          maxDrawdownPercent = (dd / peak) * 100;
        }
      }
    });

    const bestTrade = filteredTrades.length > 0 ? Math.max(...filteredTrades.filter(t => t.pnl != null).map(t => Number(t.pnl || 0))) : 0;
    const worstTrade = filteredTrades.length > 0 ? Math.min(...filteredTrades.filter(t => t.pnl != null).map(t => Number(t.pnl || 0))) : 0;
    
    // Calculate current balance by summing (initialBalance + closed trades PNL) for each relevant portfolio
    let currentBalanceValue = 0;
    if (selectedPortfolioId === 'all') {
      currentBalanceValue = portfolios.reduce((acc, p) => {
        const pTrades = trades.filter(t => t.portfolioId === p.id && (t.status === 'closed' || t.pnl != null));
        const pTradesPnl = pTrades.reduce((sum, t) => sum + Number(t.pnl || 0), 0);
        return acc + Number(p.initialBalance || 0) + pTradesPnl;
      }, 0);
    } else {
      const p = portfolios.find(port => port.id === selectedPortfolioId);
      if (p) {
        const pTrades = trades.filter(t => t.portfolioId === p.id && (t.status === 'closed' || t.pnl != null));
        const pTradesPnl = pTrades.reduce((sum, t) => sum + Number(t.pnl || 0), 0);
        currentBalanceValue = Number(p.initialBalance || 0) + pTradesPnl;
      }
    }

    const totalInitialBalanceForRatios = relevantPortfolios.reduce((acc, p) => acc + Number(p.initialBalance || 0), 0);

    // Check if multiple currencies exist
    const uniqueCurrencies = Array.from(new Set(relevantPortfolios.map(p => p.currency)));
    const primaryCurrency = selectedPortfolioId === 'all' ? (uniqueCurrencies.length === 1 ? uniqueCurrencies[0] : 'USD') : (relevantPortfolios[0]?.currency || 'USD');
    const hasSingleCurrency = uniqueCurrencies.length <= 1;

    return {
      totalTrades: closedTrades.length,
      winRate: closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0,
      totalPnl,
      totalPnlPercent: totalInitialBalanceForRatios > 0 ? (totalPnl / totalInitialBalanceForRatios) * 100 : 0,
      avgRr: rrValues.length > 0 ? rrValues.reduce((a, b) => a + b, 0) / rrValues.length : 0,
      bestTrade,
      bestTradePercent: totalInitialBalanceForRatios > 0 ? (bestTrade / totalInitialBalanceForRatios) * 100 : 0,
      worstTrade,
      worstTradePercent: totalInitialBalanceForRatios > 0 ? (worstTrade / totalInitialBalanceForRatios) * 100 : 0,
      maxDrawdown,
      maxDrawdownPercent,
      currentBalance: currentBalanceValue,
      initialCapital: totalInitialBalanceForRatios,
      primaryCurrency,
      hasSingleCurrency
    };
  }, [trades, filteredTrades, selectedPortfolioId, portfolios]);

  const chartData = React.useMemo(() => {
    // 1. Get all relevant portfolios and their transactions
    const portfoliosWithCurrency = portfolios.map(p => ({ ...p, currency: p.currency || 'USD' }));
    const relevantPortfolios = selectedPortfolioId === 'all' 
      ? portfoliosWithCurrency 
      : portfoliosWithCurrency.filter(p => p.id === selectedPortfolioId);

    const allTransactions = relevantPortfolios.flatMap(p => p.transactions || []);
    
    // 2. Initial balance in DB already includes sum of all transactions. 
    // To find the "true original start" for the curve, we subtract all transactions first.
    const currentInitialBalance = relevantPortfolios.reduce((acc, p) => acc + Number(p.initialBalance || 0), 0);
    const totalTransactionsAmount = allTransactions.reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
    const originalStartBalance = currentInitialBalance - totalTransactionsAmount;

    // 3. Combine trades and transactions into events
    type HistoryEvent = {
      date: Date;
      amount: number;
      label: string;
      type: 'trade' | 'transaction';
    };

    const tradesInOrder = [...filteredTrades]
      .filter(t => t.status === 'closed' || t.pnl != null)
      .map(t => ({
        date: new Date(t.exitDate || t.entryDate || 0),
        amount: Number(t.pnl || 0),
        label: t.symbol,
        type: 'trade' as const
      }));

    const transactionsInOrder = allTransactions.map(tx => ({
      date: new Date(tx.date || 0),
      amount: Number(tx.amount || 0),
      label: tx.type === 'adjustment' ? 'Adjustment' : tx.type.charAt(0).toUpperCase() + tx.type.slice(1),
      type: 'transaction' as const
    }));

    const events = [...tradesInOrder, ...transactionsInOrder].sort((a, b) => a.date.getTime() - b.date.getTime());

    // 4. Build the data points
    const data: any[] = [{
      name: 'Start',
      balance: originalStartBalance,
      change: 0,
      label: 'Initial Capital',
      type: 'start'
    }];

    let current = originalStartBalance;
    events.forEach((event) => {
      current += event.amount;
      data.push({
        name: event.date.toLocaleDateString(),
        balance: current,
        change: event.amount,
        label: event.label,
        type: event.type
      });
    });

    return data;
  }, [filteredTrades, portfolios, selectedPortfolioId]);

  const winLossData = [
    { name: 'Wins', value: filteredTrades.filter(t => t.result === 'win').length },
    { name: 'Losses', value: filteredTrades.filter(t => t.result === 'loss').length },
    { name: 'Others', value: filteredTrades.filter(t => t.result === 'breakeven' || t.result === 'pending').length },
  ];

  const COLORS = ['#10B981', '#ef4444', '#1F2228'];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif text-white leading-tight">Portfolio Overview</h2>
          <p className="text-[#636A78] text-sm mt-1">Key metrics and performance visualizer</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[#14161A] border border-[#1F2228] px-3 py-2 rounded-xl">
            <Briefcase className="w-4 h-4 text-[#636A78]" />
            <select 
              value={selectedPortfolioId}
              onChange={(e) => setSelectedPortfolioId(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#E0E0E0] outline-none cursor-pointer pr-2"
            >
              <option key="portfolio-all" value="all" className="bg-[#14161A]">All Wallets</option>
              {portfolios.map((p, i) => (
                <option key={`portfolio-${p.id || 'p'}-${i}`} value={p.id} className="bg-[#14161A] text-white">
                  {p.name}{p.isArchived ? ' (จัดเก็บแล้ว)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-[#14161A] border border-[#1F2228] px-3 py-2 rounded-xl">
            <LayoutGrid className="w-4 h-4 text-[#636A78]" />
            <select 
              value={selectedSetup}
              onChange={(e) => setSelectedSetup(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#E0E0E0] outline-none cursor-pointer pr-2"
            >
              <option key="setup-all" value="all" className="bg-[#14161A]">All Setups</option>
              {setups.map((s, idx) => (
                <option key={`setup-${s}-${idx}`} value={s} className="bg-[#14161A] text-white">
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <StatCard 
          label="Current Balance" 
          value={formatCurrency(stats.currentBalance, stats.primaryCurrency)} 
          subValue="Real-time capital calculation"
          icon={Briefcase}
          color={!stats.hasSingleCurrency ? "text-amber-500" : ""}
        />
        <StatCard 
          label="Total Net Profit" 
          value={`${formatCurrency(stats.totalPnl, stats.primaryCurrency)} (${formatPercentage(stats.totalPnlPercent)})`} 
          subValue="Life-time performance"
          icon={TrendingUp}
          trend={stats.totalPnl >= 0 ? 'up' : 'down'}
        />
        <StatCard 
          label="Win Rate" 
          value={formatPercentage(stats.winRate)} 
          subValue={`${stats.totalTrades} closed trades`}
          icon={Target}
          trend={stats.winRate >= 50 ? 'up' : 'down'}
        />
        <StatCard 
          label="Avg Risk/Reward" 
          value={`1:${stats.avgRr.toFixed(2)}`} 
          subValue={`Avg R:R ratio across trades`}
          icon={Zap}
        />
        <StatCard 
          label="Best/Worst Trade" 
          value={`${formatCurrency(stats.bestTrade)} (${formatPercentage(stats.bestTradePercent)})`} 
          subValue={`${formatCurrency(stats.worstTrade)} (${formatPercentage(stats.worstTradePercent)})`}
          icon={TrendingDown}
          color="text-[#10B981]"
        />
        <StatCard 
          label="Max Drawdown" 
          value={`${formatCurrency(stats.maxDrawdown)} (${formatPercentage(stats.maxDrawdownPercent)})`} 
          subValue="Highest peak-to-trough drop"
          icon={TrendingDown}
          color="text-rose-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#14161A] p-8 rounded-2xl border border-[#1F2228]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-semibold text-[#636A78] uppercase">Equity Curve</h3>
            <div className="flex space-x-2">
              {[
                { id: '1W', label: '1W' },
                { id: '1M', label: '1M' },
                { id: '1Y', label: '1Y' },
                { id: 'ALL', label: 'ALL' }
              ].map((range) => (
                <button
                  key={range.id}
                  onClick={() => setSelectedTimeRange(range.id as any)}
                  className={cn(
                    "text-[10px] px-2 py-1 rounded transition-all font-bold",
                    selectedTimeRange === range.id 
                      ? "bg-[#10B981] text-[#0A0B0E]" 
                      : "bg-[#1F2228] text-[#E0E0E0] hover:bg-[#2D3139]"
                  )}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F2228" />
                <XAxis dataKey="name" hide />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: '1px solid #1F2228', 
                    backgroundColor: '#14161A',
                    color: '#E0E0E0'
                  }}
                  itemStyle={{ color: '#E0E0E0' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#14161A] border border-[#1F2228] p-3 rounded-xl shadow-xl">
                          <p className="text-[10px] text-[#636A78] font-bold uppercase mb-1">{data.name}</p>
                          <p className="text-sm font-bold text-[#E0E0E0] mb-1">{data.label}</p>
                          <div className="flex items-center justify-between gap-8">
                            <span className="text-[10px] text-[#636A78]">Change</span>
                            <span className={cn(
                              "text-[10px] font-bold",
                              data.change > 0 ? "text-[#10B981]" : data.change < 0 ? "text-rose-500" : "text-[#636A78]"
                            )}>
                              {data.change > 0 ? '+' : ''}{formatCurrency(data.change)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-8 mt-1">
                            <span className="text-[10px] text-[#636A78]">Balance</span>
                            <span className="text-[10px] font-bold text-white">{formatCurrency(data.balance)}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorBal)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#14161A] p-8 rounded-2xl border border-[#1F2228] flex flex-col">
          <h3 className="text-xs font-semibold text-[#636A78] uppercase mb-8">Win/Loss Ratio</h3>
          <div className="flex-1 min-h-[250px]">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={winLossData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {winLossData.map((entry, index) => (
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
            {winLossData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                  <span className="text-xs font-medium text-[#636A78]">{d.name}</span>
                </div>
                <span className="text-sm font-mono text-white">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full">
        <TradeCalendar trades={filteredTrades} />
      </div>
    </div>
  );
}

function StatCard({ label, value, subValue, icon: Icon, trend, color }: any) {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-[#14161A] p-6 rounded-2xl border border-[#1F2228]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold text-[#636A78] uppercase tracking-wider mb-2 break-words whitespace-normal">{label}</p>
          <p className={cn("text-lg sm:text-2xl font-mono text-white break-words whitespace-normal", color)}>
            {value}
          </p>
          <p className="text-[10px] text-[#636A78] mt-2 font-medium italic break-words whitespace-normal">
            {subValue}
          </p>
        </div>
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
          trend === 'up' ? "bg-emerald-500/10 text-[#10B981]" : trend === 'down' ? "bg-rose-500/10 text-rose-500" : "bg-[#1F2228] text-white"
        )}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  );
}
