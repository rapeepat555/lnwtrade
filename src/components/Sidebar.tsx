import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  History, 
  TrendingUp, 
  Wallet, 
  PlusCircle, 
  Settings,
  LineChart,
  ChevronRight,
  ChevronLeft,
  TrendingDown,
  User,
  LogOut,
  PlayCircle,
  Brain
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'history', label: 'History', icon: History },
  { id: 'analyst', label: 'Backtest', icon: Brain },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
];

export function Sidebar({ activeTab, setActiveTab, isCollapsed, setIsCollapsed }: SidebarProps) {
  const { signOut } = useAuth();
  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isCollapsed ? 80 : 256 }}
        className="hidden md:flex border-r border-[#1F2228] h-screen flex-col bg-[#0A0B0E] sticky top-0 transition-all duration-300 ease-in-out z-50 shadow-xl"
      >
        <div className={cn("p-8 flex flex-col gap-1 overflow-hidden", isCollapsed && "items-center px-4")}>
          {!isCollapsed ? (
            <>
              <h1 className="font-serif italic text-2xl text-white tracking-tight whitespace-nowrap">TraderJournal</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#636A78] whitespace-nowrap">Professional Analytics</p>
            </>
          ) : (
            <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/20">
              <PlusCircle className="text-[#10B981] w-6 h-6" />
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group text-sm font-medium overflow-hidden whitespace-nowrap",
                activeTab === item.id 
                  ? "bg-[#1F2228] text-white" 
                  : "text-[#636A78] hover:text-white",
                isCollapsed && "justify-center px-0"
              )}
            >
              <item.icon className={cn(
                "w-4 h-4 min-w-[16px] transition-colors",
                activeTab === item.id ? "text-[#10B981]" : "text-[#636A78] group-hover:text-white"
              )} />
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[#1F2228] space-y-2">
          <button 
            onClick={signOut}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[#636A78] hover:text-rose-500 text-sm font-medium transition-all group overflow-hidden whitespace-nowrap",
              isCollapsed && "justify-center px-0"
            )}
          >
            <LogOut className="w-4 h-4 min-w-[16px] transition-colors group-hover:text-rose-500" />
            {!isCollapsed && <span>Log Out</span>}
          </button>
          
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[#636A78] hover:text-[#10B981] text-sm font-medium transition-all group overflow-hidden whitespace-nowrap",
              isCollapsed && "justify-center px-0"
            )}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4 min-w-[16px]" /> : <ChevronLeft className="w-4 h-4 min-w-[16px]" />}
            {!isCollapsed && <span>Collapse</span>}
          </button>
        </div>
      </motion.aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0A0B0E] border-t border-[#1F2228] flex items-center justify-around px-2 z-[100] pb-[calc(env(safe-area-inset-bottom,24px)+4px)] pt-2 overflow-x-auto no-scrollbar shadow-[0_-8px_20px_rgba(0,0,0,0.5)]">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex flex-col items-center justify-center min-w-[64px] h-[52px] rounded-xl transition-all duration-300",
              activeTab === item.id 
                ? "text-[#10B981] bg-[#10B981]/10 scale-105" 
                : "text-[#636A78] hover:text-[#E0E0E0]"
            )}
          >
            <item.icon className={cn(
              "w-5.5 h-5.5 mb-1 transition-transform",
              activeTab === item.id && "scale-110"
            )} />
            <span className={cn(
              "text-[9px] font-black uppercase tracking-tighter",
              activeTab === item.id ? "opacity-100" : "opacity-80"
            )}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>
    </>
  );
}
