import React from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday
} from 'date-fns';
import { Trade } from '../types';
import { formatCurrency, formatCompactCurrency, formatCompactNumber, cn } from '../lib/utils';
import { ChevronLeft, ChevronRight, X, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TradeCalendarProps {
  trades: Trade[];
}

export function TradeCalendar({ trades }: TradeCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null);

  const closedTrades = trades.filter(t => t.status === 'closed' && t.exitDate);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const getDayTrades = (day: Date) => {
    return closedTrades.filter(t => isSameDay(new Date(t.exitDate!), day));
  };

  const getDayData = (day: Date) => {
    const dayTrades = getDayTrades(day);
    const pnl = dayTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
    return { pnl, count: dayTrades.length };
  };

  const monthlyPnl = closedTrades
    .filter(t => isSameMonth(new Date(t.exitDate!), currentMonth))
    .reduce((acc, t) => acc + (t.pnl || 0), 0);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const selectedDayTrades = selectedDay ? getDayTrades(selectedDay) : [];
  const selectedDayTotalPnl = selectedDayTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);

  return (
    <div className="bg-[#14161A] rounded-2xl border border-[#1F2228] overflow-hidden flex flex-col">
      <div className="p-6 border-b border-[#1F2228] flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-[#636A78] uppercase mb-1">Trading Calendar</h3>
          <div className="flex items-center gap-4">
            <span className="text-white font-serif text-xl">{format(currentMonth, 'MMMM yyyy')}</span>
            <div className="flex gap-1">
              <button onClick={prevMonth} className="p-1 hover:bg-[#1F2228] rounded text-[#636A78] hover:text-white transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={nextMonth} className="p-1 hover:bg-[#1F2228] rounded text-[#636A78] hover:text-white transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[#636A78] uppercase font-bold tracking-widest mb-1">Monthly P/L</p>
          <p className={cn(
            "text-lg font-mono font-bold",
            monthlyPnl >= 0 ? "text-[#10B981]" : "text-rose-500"
          )}>
            {monthlyPnl >= 0 ? '+' : ''}{formatCompactCurrency(monthlyPnl)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-[#1F2228] bg-[#0A0B0E]">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="py-2 text-center text-[10px] font-bold text-[#636A78] uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 flex-1">
        {days.map((day, i) => {
          const { pnl, count } = getDayData(day);
          const isCurrentMonth = isSameMonth(day, monthStart);
          
          return (
            <div 
              key={`day-${day.getTime()}-${i}`} 
              onClick={() => count > 0 && setSelectedDay(day)}
              className={cn(
                "min-h-[60px] sm:min-h-[80px] p-1 sm:p-2 border-r border-b border-[#1F2228] flex flex-col transition-colors",
                !isCurrentMonth && "opacity-20",
                isToday(day) ? "bg-[#10B981]/5" : "bg-transparent",
                count > 0 ? "cursor-pointer hover:bg-[#1F2228]/50" : "cursor-default"
              )}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={cn(
                  "text-[9px] sm:text-[10px] font-mono",
                  isToday(day) ? "text-[#10B981] font-bold" : "text-[#636A78]"
                )}>
                  {format(day, 'd')}
                </span>
              </div>
              {count > 0 && (
                <div className="mt-auto">
                  <p className={cn(
                    "text-[8px] sm:text-[10px] font-mono font-bold leading-tight truncate",
                    pnl > 0 ? "text-[#10B981]" : pnl < 0 ? "text-rose-500" : "text-white"
                  )}>
                    {pnl > 0 ? '+' : ''}{formatCompactCurrency(pnl).replace(/\$|USD/g, '').trim()}
                  </p>
                  <p className="text-[9px] text-[#636A78] leading-tight">
                    {formatCompactNumber(count)} {count === 1 ? 'trade' : 'trades'}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedDay && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDay(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="relative w-full max-w-lg bg-[#0A0B0E] rounded-3xl border border-[#1F2228] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-[#1F2228] flex items-center justify-between bg-[#14161A]/50">
                <div>
                  <h3 className="text-xl font-serif text-white tracking-tight">{format(selectedDay, 'MMMM d, yyyy')}</h3>
                  <p className={cn(
                    "text-sm font-mono mt-0.5",
                    selectedDayTotalPnl >= 0 ? "text-[#10B981]" : "text-rose-500"
                  )}>
                    Total P/L: {selectedDayTotalPnl >= 0 ? '+' : ''}{formatCurrency(selectedDayTotalPnl)}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedDay(null)}
                  className="p-2.5 hover:bg-[#1F2228] rounded-xl text-[#636A78] transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {selectedDayTrades.map((trade, idx) => (
                  <div 
                    key={trade.id ? `calendar-trade-${trade.id}-${idx}` : `calendar-trade-idx-${idx}`}
                    className="p-4 rounded-2xl bg-[#14161A] border border-[#1F2228] flex items-center justify-between group hover:border-[#10B981]/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        trade.type === 'long' ? "bg-[#10B981]/10 text-[#10B981]" : "bg-rose-500/10 text-rose-500"
                      )}>
                        {trade.type === 'long' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white uppercase">{trade.symbol}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-bold text-[#636A78] bg-[#0A0B0E] px-1.5 py-0.5 rounded uppercase tracking-widest">
                            {trade.setup || 'No Setup'}
                          </span>
                          <span className="text-[10px] text-[#636A78] flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {format(new Date(trade.exitDate!), 'HH:mm')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-sm font-mono font-bold",
                        (trade.pnl || 0) >= 0 ? "text-[#10B981]" : "text-rose-500"
                      )}>
                        {(trade.pnl || 0) >= 0 ? '+' : ''}{formatCurrency(trade.pnl || 0)}
                      </p>
                      <p className="text-[10px] font-black font-mono text-[#636A78] mt-0.5">
                        {trade.rr ? trade.rr.toFixed(2) : '0.00'}R
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
