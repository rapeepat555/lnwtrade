import React, { useState } from 'react';
import { UserProfile as UserProfileType, Quest, Trade, Portfolio } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Trophy, 
  Zap, 
  Target, 
  Brain, 
  ShieldCheck, 
  TrendingUp, 
  Sparkles,
  ChevronRight,
  MessageSquare,
  Award,
  Plus,
  X,
  History,
  Camera,
  Edit,
  Trash2,
  Star,
  Download,
  Upload,
  CheckCircle2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { compressImage } from '../lib/image';

interface UserProfileProps {
  profile: UserProfileType;
  quests: Quest[];
  trades?: Trade[];
  portfolios?: Portfolio[];
  setups?: string[];
  onCompleteQuest: (questId: string) => void;
  onUndoQuest: (questId: string) => void;
  onDeleteQuest: (questId: string) => void;
  onUpdateQuest: (questId: string, updates: Partial<Quest>) => void;
  onUpdateStats: (skill: string) => void;
  onAddQuest: (quest: Omit<Quest, 'id' | 'isCompleted'>) => void;
  onUpdateAvatar: (base64: string) => void;
  onUpdateName: (name: string) => void;
  googlePhotoURL?: string;
  readOnly?: boolean;
}

export function UserProfile({ 
  profile, 
  quests, 
  trades = [],
  portfolios = [],
  setups = [],
  onCompleteQuest, 
  onUndoQuest,
  onDeleteQuest, 
  onUpdateQuest, 
  onUpdateStats, 
  onAddQuest, 
  onUpdateAvatar, 
  onUpdateName, 
  googlePhotoURL,
  readOnly 
}: UserProfileProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'quests' | 'ai'>('status');
  const [questFilter, setQuestFilter] = useState<'all' | 'main' | 'sub' | 'daily'>('all');
  const [isAddingQuest, setIsAddingQuest] = useState(false);
  const [editingQuestId, setEditingQuestId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteHistoryId, setConfirmDeleteHistoryId] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(profile.name);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const promise = new Promise<string>((resolve) => {
      reader.onload = (event) => resolve(event.target?.result as string);
      reader.readAsDataURL(file);
    });

    const base64 = await promise;
    const compressed = await compressImage(base64, 400, 400, 0.7); // Smaller for avatar
    onUpdateAvatar(compressed);
  };
  const [newQuest, setNewQuest] = useState({
    title: '',
    description: '',
    type: 'daily' as Quest['type'],
    rewardExp: 100,
    rewardStats: [] as string[],
    rewardStatValue: 0,
    isRecurring: false
  });

  const nextLevelExp = profile.level * 1000;
  const progressPercentage = (profile.exp / nextLevelExp) * 100;

  const skillIcons = {
    discipline: Target,
    riskManagement: ShieldCheck,
    technicalAnalysis: TrendingUp,
    psychology: Brain,
  };

  const getRankConfig = (rankName: string) => {
    const name = rankName.toUpperCase();
    if (name.includes('LEGENDARY')) {
      return {
        borderColor: 'border-[#FCD34D]',
        textColor: 'text-transparent bg-clip-text bg-gradient-to-r from-[#FCD34D] via-[#F59E0B] to-[#FCD34D] bg-[length:200%_auto] animate-shimmer',
        avatarBorder: 'border-[#F59E0B] shadow-[0_0_20px_rgba(245,158,11,0.4)]',
        accentColor: '#F59E0B',
        frameClass: 'before:absolute before:inset-0 before:rounded-2xl before:border-2 before:border-[#F59E0B]/50 before:animate-pulse after:absolute after:inset-1 after:rounded-xl after:border after:border-[#FCD34D]/30',
        glow: 'shadow-[0_0_30px_rgba(245,158,11,0.2)]'
      };
    }
    if (name.includes('SUPREME')) {
      return {
        borderColor: 'border-rose-500',
        textColor: 'text-rose-500',
        avatarBorder: 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]',
        accentColor: '#F43F5E',
        frameClass: 'border-rose-500/50',
        glow: ''
      };
    }
    if (name.includes('DIAMOND')) {
      return {
        borderColor: 'border-cyan-400',
        textColor: 'text-cyan-400',
        avatarBorder: 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]',
        accentColor: '#22D3EE',
        frameClass: 'border-cyan-400/50',
        glow: ''
      };
    }
    if (name.includes('PLATINUM')) {
      return {
        borderColor: 'border-slate-300',
        textColor: 'text-slate-300',
        avatarBorder: 'border-slate-300',
        accentColor: '#CBD5E1',
        frameClass: 'border-slate-300/50',
        glow: ''
      };
    }
    if (name.includes('GOLD')) {
      return {
        borderColor: 'border-[#FFD700]',
        textColor: 'text-[#FFD700]',
        avatarBorder: 'border-[#FFD700] shadow-[0_0_10px_rgba(255,215,0,0.2)]',
        accentColor: '#FFD700',
        frameClass: 'border-[#FFD700]/50',
        glow: ''
      };
    }
    if (name.includes('SILVER')) {
      return {
        borderColor: 'border-slate-400',
        textColor: 'text-slate-400',
        avatarBorder: 'border-slate-400',
        accentColor: '#94A3B8',
        frameClass: 'border-slate-400/30',
        glow: ''
      };
    }
    if (name.includes('BRONZE')) {
      return {
        borderColor: 'border-[#CD7F32]',
        textColor: 'text-[#CD7F32]',
        avatarBorder: 'border-[#CD7F32]',
        accentColor: '#CD7F32',
        frameClass: 'border-[#CD7F32]/30',
        glow: ''
      };
    }
    return {
      borderColor: 'border-[#10B981]/30',
      textColor: 'text-[#10B981]',
      avatarBorder: 'border-[#10B981]/30',
      accentColor: '#10B981',
      frameClass: 'border-[#10B981]/30',
      glow: ''
    };
  };

  const rankConfig = getRankConfig(profile.rank);
  const rankName = profile.rank.toUpperCase();

  const skillNames = {
    discipline: 'Discipline',
    riskManagement: 'Risk Management',
    technicalAnalysis: 'Technical Analysis',
    psychology: 'Psychology',
    ...Object.keys(profile.skills).reduce((acc, key) => {
      if (!['discipline', 'riskManagement', 'technicalAnalysis', 'psychology'].includes(key)) {
        acc[key as keyof typeof acc] = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
      }
      return acc;
    }, {} as any)
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (window.innerWidth < 768) {
      setTimeout(() => {
        e.target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 300);
    }
  };

  const handleCreateQuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuest.title) return;
    
    if (editingQuestId) {
      onUpdateQuest(editingQuestId, {
        ...newQuest,
        rewardStats: newQuest.rewardStats.length > 0 ? newQuest.rewardStats : undefined,
        rewardStatValue: newQuest.rewardStats.length > 0 ? newQuest.rewardStatValue : undefined,
        isRecurring: newQuest.isRecurring
      });
    } else {
      onAddQuest({
        ...newQuest,
        rewardStats: newQuest.rewardStats.length > 0 ? newQuest.rewardStats : undefined,
        rewardStatValue: newQuest.rewardStats.length > 0 ? newQuest.rewardStatValue : undefined,
        isRecurring: newQuest.isRecurring
      });
    }
    
    setNewQuest({ title: '', description: '', type: 'daily', rewardExp: 100, rewardStats: [], rewardStatValue: 0, isRecurring: false });
    setIsAddingQuest(false);
    setEditingQuestId(null);
  };

  const handleEditQuest = (quest: Quest) => {
    setNewQuest({
      title: quest.title,
      description: quest.description,
      type: quest.type,
      rewardExp: quest.rewardExp,
      rewardStats: quest.rewardStats || (quest.rewardStat ? [quest.rewardStat] : []),
      rewardStatValue: quest.rewardStatValue || 0,
      isRecurring: quest.isRecurring || false
    });
    setEditingQuestId(quest.id);
    setIsAddingQuest(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="relative group/avatar">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
            />
            <button 
              onClick={() => !readOnly && fileInputRef.current?.click()}
              className={cn(
                "w-24 h-24 rounded-2xl bg-[#1F2228] p-1 relative overflow-hidden transition-all border-2",
                rankConfig.avatarBorder,
                rankConfig.frameClass,
                !readOnly ? "cursor-pointer hover:scale-105" : "cursor-default"
              )}
            >
              <div className="w-full h-full rounded-xl bg-[#0A0B0E] flex items-center justify-center overflow-hidden">
                {profile.avatar || googlePhotoURL ? (
                  <img src={profile.avatar || googlePhotoURL} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-[#636A78]" />
                )}
              </div>
              {!readOnly && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              )}
            </button>
            <div 
              className={cn(
                "absolute -bottom-2 -right-2 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border-2 border-[#0A0B0E] shadow-xl transition-colors",
                rankConfig.borderColor.replace('border-', 'bg-'),
                rankName.includes('GOLD') || rankName.includes('LEGENDARY') || rankName.includes('SUPREME') ? 'text-[#0A0B0E]' : 'text-white'
              )}
              style={{ backgroundColor: rankConfig.accentColor }}
            >
              LV.{profile.level}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    autoFocus
                    className="bg-[#0A0B0E] border border-[#10B981] rounded px-2 py-1 text-2xl font-black text-white tracking-tighter uppercase italic outline-none w-full max-w-[300px]"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onUpdateName(tempName);
                        setIsEditingName(false);
                      } else if (e.key === 'Escape') {
                        setTempName(profile.name);
                        setIsEditingName(false);
                      }
                    }}
                    onBlur={() => {
                      onUpdateName(tempName);
                      setIsEditingName(false);
                    }}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 
                    onClick={() => !readOnly && setIsEditingName(true)}
                    className={cn(
                      "text-2xl sm:text-4xl font-black text-white tracking-tighter uppercase italic leading-none truncate transition-colors",
                      !readOnly ? "cursor-pointer hover:text-[#10B981]" : "cursor-default"
                    )}
                  >
                    {profile.name}
                  </h1>
                  { profile.name.toLowerCase().includes('rapeepat') && (
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#10B981] flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                      <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#0A0B0E] fill-current" />
                    </div>
                  )}
                </div>
              )}
              <div className="hidden sm:block h-6 w-[2px] bg-[#1F2228]" />
              <div className={cn(
                "inline-flex items-center px-3 py-1 rounded-md border text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] relative overflow-hidden",
                rankConfig.borderColor,
                "bg-black/40 backdrop-blur-sm shadow-xl",
                rankConfig.glow
              )}>
                {/* Add a subtle sweep effect for high ranks */}
                {(rankName.includes('LEGENDARY') || rankName.includes('SUPREME')) && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[sweep_3s_infinite]" />
                )}
                <span className={cn("relative z-10", rankConfig.textColor)}>
                  {profile.rank}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-4 mt-3">
              <div className="flex flex-col gap-1 w-full max-w-[280px]">
                <div className="flex justify-between items-center px-1 gap-4">
                  <span className="text-[9px] font-bold text-[#636A78] uppercase truncate min-w-0">Experience Point</span>
                  <span className="text-[9px] font-mono text-[#636A78] whitespace-nowrap">{profile.exp} / {nextLevelExp}</span>
                </div>
                <div className="relative w-full max-w-[256px] h-2 bg-[#1F2228] rounded-full overflow-hidden border border-[#1F2228]">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    className="absolute inset-y-0 left-0 shadow-lg"
                    style={{ background: rankConfig.accentColor }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex p-1 bg-[#14161A] border border-[#1F2228] rounded-2xl overflow-hidden">
          {['status', 'quests', 'ai'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === tab 
                  ? "bg-[#10B981] text-[#0A0B0E] shadow-lg shadow-[#10B981]/20" 
                  : "text-[#636A78] hover:text-white"
              )}
            >
              {tab === 'status' ? 'Status Window' : tab === 'quests' ? 'Active Quests' : 'AI Analysis'}
            </button>
          ))}
        </div>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === 'status' && (
          <motion.div 
            key="status"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-[#14161A] p-8 rounded-3xl border-2 border-[#1F2228] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#10B981]/5 rounded-bl-full border-l border-b border-[#10B981]/10 flex items-center justify-center">
                  <Sparkles className="w-12 h-12 text-[#10B981]/20" />
                </div>
                
                <div className="flex items-center gap-4 mb-8">
                  <div 
                  className={cn("h-10 w-2 rounded-full", rankConfig.borderColor.replace('border-', 'bg-'))}
                  style={{ backgroundColor: rankConfig.accentColor }}
                />
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight">Abilities & Stats</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                  {Object.entries(profile.skills).map(([key, value]) => {
                    const Icon = (skillIcons as any)[key] || Target;
                    return (
                      <div key={key} className="space-y-4 group">
                        <div className="flex justify-between items-end">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#0A0B0E] border border-[#1F2228] flex items-center justify-center text-[#10B981] group-hover:scale-110 transition-transform">
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-[#636A78] uppercase tracking-widest">{skillNames[key as keyof typeof skillNames]}</span>
                              <span className="text-xl font-mono font-bold text-white leading-none">{value} <span className="text-xs text-[#636A78]">/ ∞</span></span>
                            </div>
                          </div>
                        </div>
                        <div className="w-full h-2 bg-[#0A0B0E] rounded-full overflow-hidden border border-[#1F2228] p-0.5">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `100%` }}
                            className="h-full bg-gradient-to-r from-[#10B981] to-[#3B82F6] rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-[#14161A] p-6 rounded-3xl border-2 border-[#1F2228]">
                <h4 className="text-xs font-black text-[#636A78] uppercase tracking-[.25em] mb-6">Growth History</h4>
                <div className="space-y-6">
                  {quests.filter(q => q.isCompleted).slice().reverse().map((q, i) => (
                    <div key={q.id ? `growth-q-${q.id}-${i}` : `growth-idx-${i}`} className="flex gap-4 group/item relative">
                      <AnimatePresence>
                        {confirmDeleteHistoryId === q.id && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-10 bg-[#14161A]/95 backdrop-blur-sm flex flex-col items-center justify-center p-2 text-center rounded-xl"
                          >
                            <span className="text-[8px] font-black text-rose-500 uppercase mb-2">Delete Log?</span>
                            <div className="flex gap-2 w-full">
                              <button 
                                onClick={() => setConfirmDeleteHistoryId(null)}
                                className="flex-1 py-1 bg-[#1F2228] text-[#636A78] rounded-lg text-[8px] font-black uppercase tracking-widest"
                              >
                                NO
                              </button>
                              <button 
                                onClick={() => {
                                  onUndoQuest(q.id);
                                  setConfirmDeleteHistoryId(null);
                                }}
                                className="flex-1 py-1 bg-rose-500 text-white rounded-lg text-[8px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20"
                              >
                                YES
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="w-8 h-8 rounded-lg bg-[#1F2228] flex items-center justify-center text-[#10B981] flex-shrink-0">
                        <Trophy className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white leading-tight truncate">Cleared: {q.title}</p>
                        <p className="text-[10px] text-[#636A78] mt-1">Reward obtained: +{q.rewardExp} EXP</p>
                      </div>
                      
                      {!readOnly && (
                        <div className="flex items-center gap-1 ml-auto">
                          <button 
                            onClick={() => handleEditQuest(q)}
                            className="p-1.5 bg-[#1F2228]/50 hover:bg-[#10B981]/20 text-[#636A78] hover:text-[#10B981] transition-colors rounded-lg border border-[#1F2228]"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => setConfirmDeleteHistoryId(q.id)}
                            className="p-1.5 bg-[#1F2228]/50 hover:bg-rose-500/20 text-[#636A78] hover:text-rose-500 transition-colors rounded-lg border border-[#1F2228]"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {quests.filter(q => q.isCompleted).length === 0 && (
                    <p className="text-[#636A78] text-xs italic">No records found. Complete quests to grow.</p>
                  )}
                </div>
              </div>

              <div className="bg-[#14161A] p-6 rounded-3xl border-2 border-[#1F2228]">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="w-4 h-4 text-[#10B981]" />
                  <h4 className="text-xs font-black text-[#636A78] uppercase tracking-[.25em]">Rank Progression</h4>
                </div>
                <div className="overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#1F2228] text-[#636A78] text-[9px] uppercase tracking-wider">
                        <th className="pb-2 font-semibold">Rank Name</th>
                        <th className="pb-2 font-semibold">Required Level</th>
                        <th className="pb-2 font-semibold text-right">EXP Limit / Lv</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1F2228]/40">
                      {[
                        { name: 'Bronze I', range: 'Lv. 1 - 4', exp: '1,000 - 4,000 EXP' },
                        { name: 'Bronze II', range: 'Lv. 5 - 9', exp: '5,000 - 9,000 EXP' },
                        { name: 'Silver I', range: 'Lv. 10 - 19', exp: '10,000 - 19,000 EXP' },
                        { name: 'Gold I', range: 'Lv. 20 - 39', exp: '20,000 - 39,000 EXP' },
                        { name: 'Platinum I', range: 'Lv. 40 - 59', exp: '40,000 - 59,000 EXP' },
                        { name: 'Diamond I', range: 'Lv. 60 - 79', exp: '60,000 - 79,000 EXP' },
                        { name: 'Supreme', range: 'Lv. 80 - 99', exp: '80,000 - 99,000 EXP' },
                        { name: 'Legendary', range: 'Lv. 100+', exp: '100,000+ EXP' },
                      ].map((item) => {
                        const isCurrentRank = profile.rank === item.name;
                        const rankStyle = getRankConfig(item.name);
                        return (
                          <tr 
                            key={item.name} 
                            className={cn(
                              "transition-all duration-300",
                              isCurrentRank 
                                ? "bg-[#10B981]/5" 
                                : "hover:bg-white/[0.01]"
                            )}
                          >
                            <td className="py-2.5 font-black flex items-center gap-2">
                              <span 
                                className={cn(
                                  "text-xs uppercase tracking-tight",
                                  isCurrentRank ? "font-black" : "text-[#E0E0E0]",
                                  rankStyle.textColor
                                )}
                              >
                                {item.name}
                              </span>
                              {isCurrentRank && (
                                <span className="text-[8px] bg-[#10B981]/15 text-[#10B981] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-widest animate-pulse">
                                  ACTIVE
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 font-mono text-[10px] text-[#636A78]">{item.range}</td>
                            <td className={cn(
                              "py-2.5 font-mono text-[10px] text-right text-[#636A78]",
                              isCurrentRank && "text-[#10B981] font-bold"
                            )}>
                              {item.exp}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-[#14161A] p-6 rounded-3xl border-2 border-[#1F2228] space-y-6">
                <div>
                  <span className="text-[10px] font-black text-[#636A78] uppercase tracking-[.25em] mb-4 block">Data Backup & Sync (Offline-Proof)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button 
                      onClick={() => {
                        try {
                          const journalData = localStorage.getItem('tradetrack_pro_data');
                          const profileData = localStorage.getItem('trader_profile');
                          const questsData = localStorage.getItem('trader_quests');
                          
                          let finalPortfolios = portfolios;
                          let finalTrades = trades;
                          let finalSetups = setups;
                          
                          if (journalData) {
                            try {
                              const parsedJ = JSON.parse(journalData);
                              if ((!finalPortfolios || finalPortfolios.length === 0) && Array.isArray(parsedJ.portfolios)) {
                                finalPortfolios = parsedJ.portfolios;
                              }
                              if ((!finalTrades || finalTrades.length === 0) && Array.isArray(parsedJ.trades)) {
                                finalTrades = parsedJ.trades;
                              }
                              if ((!finalSetups || finalSetups.length === 0) && Array.isArray(parsedJ.setups)) {
                                finalSetups = parsedJ.setups;
                              }
                            } catch (e) {}
                          }

                          const exportObj = {
                            version: 2,
                            exportedAt: new Date().toISOString(),
                            journal: {
                              portfolios: finalPortfolios,
                              trades: finalTrades,
                              setups: finalSetups
                            },
                            profile: profile || (profileData ? JSON.parse(profileData) : null),
                            quests: quests || (questsData ? JSON.parse(questsData) : null)
                          };

                          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
                          const downloadAnchor = document.createElement('a');
                          downloadAnchor.setAttribute("href", dataStr);
                          downloadAnchor.setAttribute("download", `trader_backup_${new Date().toISOString().split('T')[0]}.json`);
                          document.body.appendChild(downloadAnchor);
                          downloadAnchor.click();
                          downloadAnchor.remove();

                          alert(`✅ สำรองข้อมูลเรียบร้อย!\n- ประวัติการเทรด: ${finalTrades.length} รายการ\n- กระเป๋าเงิน: ${finalPortfolios.length} บัญชี\nไฟล์กำลังดาวน์โหลด...`);
                        } catch (e) {
                          alert("Export failed: " + e);
                        }
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-[#10B981]/10 text-[#10B981] hover:bg-[#10B981] hover:text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-[#10B981]/20 cursor-pointer active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Backup Data (.json)
                    </button>

                    <label className="flex items-center justify-center gap-2 px-4 py-3 bg-[#1F2228] text-[#E0E0E0] hover:text-white hover:bg-[#2A2E37] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-[#1F2228] cursor-pointer active:scale-95">
                      <Upload className="w-3.5 h-3.5 text-[#10B981]" />
                      Restore Data (.json)
                      <input 
                        type="file" 
                        accept=".json" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            try {
                              const content = event.target?.result as string;
                              const parsed = JSON.parse(content);
                              let tradeCount = 0;
                              let walletCount = 0;

                              if (parsed.journal) {
                                localStorage.setItem('tradetrack_pro_data', JSON.stringify(parsed.journal));
                                tradeCount = parsed.journal.trades?.length || 0;
                                walletCount = parsed.journal.portfolios?.length || 0;
                              } else if (parsed.trades || parsed.portfolios) {
                                localStorage.setItem('tradetrack_pro_data', JSON.stringify({
                                  trades: parsed.trades || [],
                                  portfolios: parsed.portfolios || [],
                                  setups: parsed.setups || ['Breakout', 'Pullback', 'Reversal', 'Scalp', 'Trend Following']
                                }));
                                tradeCount = parsed.trades?.length || 0;
                                walletCount = parsed.portfolios?.length || 0;
                              }

                              if (parsed.profile) {
                                localStorage.setItem('trader_profile', JSON.stringify(parsed.profile));
                              }
                              if (parsed.quests) {
                                localStorage.setItem('trader_quests', JSON.stringify(parsed.quests));
                              }

                              alert(`🎉 นำเข้าข้อมูลสำเร็จ!\n- โหลดประวัติการเทรด: ${tradeCount} รายการ\n- โหลดกระเป๋าเงิน: ${walletCount} บัญชี\nกำลังรีโหลดหน้านี้...`);
                              window.location.reload();
                            } catch (err) {
                              alert("Failed to parse JSON file: " + err);
                            }
                          };
                          reader.readAsText(file);
                        }}
                      />
                    </label>
                  </div>
                  <p className="text-[10px] text-[#636A78] mt-2">
                    💡 สามารถดาวน์โหลดไฟล์สำรองเก็บไว้ และนำไปกด Restore บน Vercel หรือเครื่องอื่นๆ ได้ทันที
                  </p>
                </div>

                <div className="pt-4 border-t border-[#1F2228]">
                  <span className="text-[10px] font-black text-[#636A78] uppercase tracking-[.25em] mb-4 block">Account Control</span>
                  {readOnly ? (
                    <p className="text-[10px] text-[#636A78] font-bold uppercase tracking-widest italic py-2">
                      Administrative access restricted in observation mode.
                    </p>
                  ) : (
                    <button 
                      onClick={() => {
                        if (confirm("Are you sure you want to reset all progress? This cannot be undone.")) {
                          localStorage.removeItem('trader_profile');
                          localStorage.removeItem('trader_quests');
                          localStorage.removeItem('tradetrack_pro_data');
                          window.location.reload();
                        }
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-rose-500/20 w-full"
                    >
                      Reset All Progress
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'quests' && (
          <motion.div 
            key="quests"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1.5 bg-[#10B981] rounded-full" />
                <h3 className="text-2xl font-black text-white uppercase italic">Active Directives</h3>
              </div>
              <div className="flex gap-2">
                {['all', 'main', 'sub', 'daily'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setQuestFilter(filter as any)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border",
                      questFilter === filter
                        ? "bg-[#10B981] text-[#0A0B0E] border-[#10B981]"
                        : "bg-[#14161A] text-[#636A78] border-[#1F2228] hover:border-[#636A78]"
                    )}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              {!readOnly && (
                <button 
                  onClick={() => {
                    setNewQuest({ title: '', description: '', type: 'daily', rewardExp: 100, rewardStats: [], rewardStatValue: 0, isRecurring: false });
                    setEditingQuestId(null);
                    setIsAddingQuest(true);
                  }}
                  className="flex items-center gap-2 px-5 py-2 bg-white text-[#0A0B0E] rounded-xl text-xs font-black tracking-widest hover:scale-105 transition-transform"
                >
                  <Plus className="w-4 h-4" /> NEW MISSION
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {quests
                  .filter(q => (questFilter === 'all' || q.type === questFilter) && !q.isCompleted)
                  .map((quest, i) => (
                  <motion.div 
                    key={quest.id ? `user-quest-${quest.id}-${i}` : `user-quest-idx-${i}`} 
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0 } }}
                    className={cn(
                      "group relative p-6 rounded-3xl border-2 transition-all overflow-hidden bg-[#14161A] border-[#1F2228] hover:border-[#10B981]/50"
                    )}
                  >
                    <AnimatePresence>
                      {confirmDeleteId === quest.id && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 z-50 bg-[#0A0B0E]/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center"
                        >
                          <Trash2 className="w-8 h-8 text-rose-500 mb-3 animate-pulse" />
                          <h5 className="text-white font-black uppercase italic mb-1 text-sm">TERMINATE MISSION?</h5>
                          <p className="text-[8px] text-[#636A78] font-bold uppercase tracking-[.2em] mb-4">Purge all operational data for this directive?</p>
                          <div className="flex gap-2 w-full">
                            <button 
                              onClick={() => setConfirmDeleteId(null)}
                              className="flex-1 py-2 bg-[#1F2228] text-[#636A78] rounded-xl text-[9px] font-black uppercase tracking-widest hover:text-white transition-colors"
                            >
                              ABORT
                            </button>
                            <button 
                              onClick={() => {
                                onDeleteQuest(quest.id);
                                setConfirmDeleteId(null);
                              }}
                              className="flex-1 py-2 bg-rose-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-[1.02] transition-transform shadow-lg shadow-rose-500/20"
                            >
                              CONFIRM
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                      {!readOnly && (
                        <div className={cn(
                          "absolute top-0 right-0 py-1 flex items-center bg-[#0A0B0E]/50 rounded-bl-xl overflow-hidden",
                        )}>
                          <button 
                            onClick={() => handleEditQuest(quest)}
                            className="p-1 px-2 hover:bg-[#10B981]/20 text-[#636A78] hover:text-[#10B981] transition-colors"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => setConfirmDeleteId(quest.id)}
                            className="p-1 px-2 hover:bg-rose-500/20 text-[#636A78] hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <div className={cn(
                            "px-3 h-full flex items-center text-[8px] font-black uppercase tracking-widest",
                            quest.type === 'main' ? "bg-[#FFD700] text-black" : quest.type === 'sub' ? "bg-blue-500 text-white" : "bg-purple-500 text-white"
                          )}>
                            {quest.type}
                          </div>
                        </div>
                      )}
                      {readOnly && (
                        <div className={cn(
                          "absolute top-0 right-0 py-1 flex items-center bg-[#0A0B0E]/50 rounded-bl-xl overflow-hidden px-3 h-full text-[8px] font-black uppercase tracking-widest",
                          quest.type === 'main' ? "bg-[#FFD700] text-black" : quest.type === 'sub' ? "bg-blue-500 text-white" : "bg-purple-500 text-white"
                        )}>
                          {quest.type}
                        </div>
                      )}

                    <div className="flex flex-col h-full space-y-4">
                      <div className="flex gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-[#0A0B0E] border border-[#1F2228]",
                          quest.isCompleted ? "text-[#10B981]" : "text-[#636A78]"
                        )}>
                          {quest.isCompleted ? <Trophy className="w-6 h-6" /> : <Target className="w-6 h-6" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-black text-white leading-tight uppercase">{quest.title}</h4>
                            {quest.isRecurring && (
                              <div className="px-2 py-0.5 bg-[#10B981]/10 border border-[#10B981]/20 rounded text-[7px] font-black text-[#10B981] uppercase tracking-tighter">
                                Daily Reset
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col mt-1">
                            <div className="flex items-center gap-2">
                              <Zap className="w-3 h-3 text-[#10B981] fill-current" />
                              <span className="text-[10px] font-mono text-[#10B981]">REWARD: {quest.rewardExp} EXP</span>
                            </div>
                            {(quest.rewardStats || quest.rewardStat) && (
                              <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1">
                                {(quest.rewardStats || [quest.rewardStat!]).filter(Boolean).map((stat, idx) => (
                                  <div key={idx} className="flex items-center gap-1">
                                    <Plus className="w-2.5 h-2.5 text-blue-400" />
                                    <span className="text-[9px] font-mono text-blue-400 uppercase">
                                      {quest.rewardStatValue} {skillNames[stat as keyof typeof skillNames]}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-[#636A78] leading-relaxed line-clamp-2">{quest.description}</p>
                      
                      {!quest.isCompleted && (
                        <button 
                          onClick={() => !readOnly && onCompleteQuest(quest.id)}
                          className={cn(
                            "mt-auto w-full py-3 bg-[#1F2228] text-white rounded-xl text-[10px] font-black uppercase tracking-[.2em] transition-all",
                            !readOnly ? "group-hover:bg-[#10B981] group-hover:text-[#0A0B0E] cursor-pointer" : "opacity-50 cursor-default"
                          )}
                        >
                          {readOnly ? 'Objective Pending' : 'Claim Objective'}
                        </button>
                      )}
                      {quest.isCompleted && (
                        <div className="mt-auto flex items-center justify-center py-3 text-[10px] font-black text-[#10B981] uppercase italic">
                          Mission Accomplished
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {quests.filter(q => (questFilter === 'all' || q.type === questFilter) && !q.isCompleted).length === 0 && (
                <div className="col-span-full py-12 flex flex-col items-center justify-center bg-[#14161A]/50 rounded-3xl border-2 border-dashed border-[#1F2228]">
                  <Trophy className="w-12 h-12 text-[#636A78] mb-4 opacity-20" />
                  <p className="text-white font-black uppercase italic tracking-widest text-sm mb-1">ALL DIRECTIVES CLEARED</p>
                  <p className="text-[10px] text-[#636A78] font-bold uppercase tracking-[.2em]">Deployment complete. Await further instructions.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'ai' && (
          <motion.div 
            key="ai"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 bg-[#14161A] p-8 rounded-3xl border-2 border-[#1F2228] relative">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-[#10B981]/10 flex items-center justify-center text-[#10B981]">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">AI Mental Guardian</h3>
                  <p className="text-xs text-[#636A78]">Synchronizing consciousness data...</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="bg-[#0A0B0E]/50 p-6 rounded-2xl border border-[#1F2228] leading-relaxed italic text-[#E0E0E0] relative group">
                  <div className="absolute -left-1 inset-y-6 w-1 bg-[#10B981] rounded-full" />
                  "Current synchronization level: {Math.floor(profile.level * 3.5)}%. Analyzing recent market interactions. {profile.skills.discipline < 50 ? 'I detect low focus on disciplinary parameters. Recommend initiating high-priority training quests.' : 'Your discipline matrix is steady. Excellent work.'} Your growth potential is currently at Peak levels."
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#1F2228]/50 p-4 rounded-2xl border border-[#1F2228]">
                    <span className="text-[10px] font-black text-[#636A78] uppercase mb-2 block">Optimal Strategy</span>
                    <p className="text-white text-xs font-bold font-mono uppercase">Scale-in on high conviction setups</p>
                  </div>
                  <div className="bg-[#1F2228]/50 p-4 rounded-2xl border border-[#1F2228]">
                    <span className="text-[10px] font-black text-[#636A78] uppercase mb-2 block">Mental Hazard</span>
                    <p className="text-rose-400 text-xs font-bold font-mono uppercase">FOMO tendency on Monday mornings</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#14161A] p-6 rounded-3xl border-2 border-[#1F2228]">
              <h4 className="text-[10px] font-black text-[#636A78] uppercase tracking-[.25em] mb-6">Neural Enhancements</h4>
              <div className="space-y-4">
                {[
                  { title: 'Flow State Induction', level: 'ADVANCED', xp: '500' },
                  { title: 'Logic Processing V2', level: 'ELITE', xp: '1200' },
                  { title: 'Emotional Firewall', level: 'MASTERY', xp: '2500' },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-[#0A0B0E] border border-[#1F2228] cursor-pointer hover:border-[#10B981]/50 transition-colors">
                    <div>
                      <p className="text-xs font-black text-white uppercase">{item.title}</p>
                      <span className="text-[8px] font-bold text-blue-400 uppercase tracking-widest">{item.level}</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#10B981]">+{item.xp} XP</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddingQuest && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-start sm:justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-[#14161A] rounded-3xl border-2 border-[#1F2228] p-8 shadow-2xl relative my-auto"
            >
              <button 
                onClick={() => {
                  setIsAddingQuest(false);
                  setEditingQuestId(null);
                }}
                className="absolute top-6 right-6 text-[#636A78] hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <h3 className="text-2xl font-black text-white italic uppercase mb-8">
                {editingQuestId ? 'Reconfigure Mission' : 'Formulate New Mission'}
              </h3>

              <form onSubmit={handleCreateQuest} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#636A78] uppercase tracking-widest px-1">Mission Objective</label>
                  <input 
                    type="text"
                    required
                    onFocus={handleFocus}
                    placeholder="Enter short mission title..."
                    className="w-full bg-[#0A0B0E] border border-[#1F2228] rounded-xl p-4 text-white text-sm focus:outline-none focus:border-[#10B981] transition-all placeholder:text-[#2D3139]"
                    value={newQuest.title}
                    onChange={(e) => setNewQuest(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#636A78] uppercase tracking-widest px-1">Briefing Details</label>
                  <textarea 
                    rows={3}
                    onFocus={handleFocus}
                    placeholder="Describe mission requirements..."
                    className="w-full bg-[#0A0B0E] border border-[#1F2228] rounded-xl p-4 text-white text-sm focus:outline-none focus:border-[#10B981] transition-all placeholder:text-[#2D3139] resize-none"
                    value={newQuest.description}
                    onChange={(e) => setNewQuest(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#636A78] uppercase tracking-widest px-1">Mission Type</label>
                    <select 
                      onFocus={handleFocus}
                      className="w-full bg-[#0A0B0E] border border-[#1F2228] rounded-xl p-4 text-white text-sm focus:outline-none focus:border-[#10B981] transition-all"
                      value={newQuest.type}
                      onChange={(e) => setNewQuest(prev => ({ ...prev, type: e.target.value as any }))}
                    >
                      <option value="daily">Daily Directive</option>
                      <option value="sub">Sub Quest</option>
                      <option value="main">Main Story</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#636A78] uppercase tracking-widest px-1">Exp Reward</label>
                    <input 
                      type="number"
                      onFocus={handleFocus}
                      className="w-full bg-[#0A0B0E] border border-[#1F2228] rounded-xl p-4 text-white text-sm focus:outline-none focus:border-[#10B981] transition-all"
                      value={newQuest.rewardExp}
                      onChange={(e) => setNewQuest(prev => ({ ...prev, rewardExp: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-[#0A0B0E] border border-[#1F2228] rounded-xl p-4">
                  <input 
                    type="checkbox"
                    id="isRecurring"
                    className="w-5 h-5 rounded border-[#1F2228] bg-[#0A0B0E] text-[#10B981] focus:ring-[#10B981] accent-[#10B981]"
                    checked={newQuest.isRecurring}
                    onChange={(e) => setNewQuest(prev => ({ ...prev, isRecurring: e.target.checked }))}
                  />
                  <label htmlFor="isRecurring" className="flex flex-col cursor-pointer">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Recurring Daily Mission</span>
                    <span className="text-[9px] text-[#636A78] font-bold uppercase tracking-widest">Resets every day at 06:00 AM (TH)</span>
                  </label>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#636A78] uppercase tracking-widest px-1 block">Ability Reward (Select Multiple)</label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.keys(profile.skills).map(key => {
                        const isSelected = newQuest.rewardStats.includes(key);
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setNewQuest(prev => ({
                                ...prev,
                                rewardStats: isSelected 
                                  ? prev.rewardStats.filter(s => s !== key)
                                  : [...prev.rewardStats, key]
                              }));
                            }}
                            className={cn(
                              "px-3 py-2 rounded-xl border text-[10px] font-bold uppercase transition-all text-left truncate",
                              isSelected 
                                ? "bg-[#10B981]/10 border-[#10B981] text-[#10B981]" 
                                : "bg-[#0A0B0E] border-[#1F2228] text-[#636A78] hover:border-[#636A78]"
                            )}
                          >
                            {skillNames[key as keyof typeof skillNames]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#636A78] uppercase tracking-widest px-1">Stat Multiplier (Per Ability)</label>
                    <input 
                      type="number"
                      onFocus={handleFocus}
                      className="w-full bg-[#0A0B0E] border border-[#1F2228] rounded-xl p-4 text-white text-sm focus:outline-none focus:border-[#10B981] transition-all"
                      value={newQuest.rewardStatValue}
                      onChange={(e) => setNewQuest(prev => ({ ...prev, rewardStatValue: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-[#10B981] text-[#0A0B0E] rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-transform shadow-lg shadow-[#10B981]/20 mt-4"
                >
                  {editingQuestId ? 'UPDATE SYSTEM DATA' : 'DEPLOY MISSION'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
