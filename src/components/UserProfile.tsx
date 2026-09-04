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
    <div className="space-y-4 sm:space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative group/avatar shrink-0">
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
                "w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-[#1F2228] p-0.5 relative overflow-hidden transition-all border-2",
                rankConfig.avatarBorder,
                rankConfig.frameClass,
                !readOnly ? "cursor-pointer hover:scale-105" : "cursor-default"
              )}
            >
              <div className="w-full h-full rounded-lg bg-[#0A0B0E] flex items-center justify-center overflow-hidden">
                {profile.avatar || googlePhotoURL ? (
                  <img src={profile.avatar || googlePhotoURL} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-7 h-7 sm:w-8 sm:h-8 text-[#636A78]" />
                )}
              </div>
              {!readOnly && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              )}
            </button>
            <div 
              className={cn(
                "absolute -bottom-1.5 -right-1.5 px-1.5 py-0.2 rounded-md text-[8.5px] font-black uppercase border-2 border-[#0A0B0E] shadow-xl transition-colors",
                rankConfig.borderColor.replace('border-', 'bg-'),
                rankName.includes('GOLD') || rankName.includes('LEGENDARY') || rankName.includes('SUPREME') ? 'text-[#0A0B0E]' : 'text-white'
              )}
              style={{ backgroundColor: rankConfig.accentColor }}
            >
              LV.{profile.level}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    autoFocus
                    className="bg-[#0A0B0E] border border-[#10B981] rounded px-1.5 py-0.5 text-lg sm:text-2xl font-black text-white tracking-tighter uppercase italic outline-none w-full max-w-[240px]"
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
                <div className="flex items-center gap-1.5">
                  <h1 
                    onClick={() => !readOnly && setIsEditingName(true)}
                    className={cn(
                      "text-xl sm:text-2xl font-black text-white tracking-tighter uppercase italic leading-none truncate transition-colors",
                      !readOnly ? "cursor-pointer hover:text-[#10B981]" : "cursor-default"
                    )}
                  >
                    {profile.name}
                  </h1>
                  { (profile.name.toLowerCase().includes('rapeepat') || profile.name.toLowerCase().includes('rapeedat')) && (
                    <div className="w-4 h-4 rounded-full bg-[#10B981] flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                      <Star className="w-2.5 h-2.5 text-[#0A0B0E] fill-current" />
                    </div>
                  )}
                </div>
              )}
              <div className="hidden sm:block h-4 w-[1.5px] bg-[#1F2228]" />
              <div className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-[0.15em] relative overflow-hidden",
                rankConfig.borderColor,
                "bg-black/40 backdrop-blur-sm shadow-sm",
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
            
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex flex-col gap-0.5 w-full max-w-[220px]">
                <div className="flex justify-between items-center px-0.5 gap-2">
                  <span className="text-[8px] font-bold text-[#636A78] uppercase truncate">Experience Point</span>
                  <span className="text-[8px] font-mono text-[#636A78] whitespace-nowrap">{profile.exp} / {nextLevelExp}</span>
                </div>
                <div className="relative w-full h-1.5 bg-[#1F2228] rounded-full overflow-hidden border border-[#1F2228]">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    className="absolute inset-y-0 left-0 shadow-sm"
                    style={{ background: rankConfig.accentColor }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex p-0.5 bg-[#14161A] border border-[#1F2228] rounded-xl overflow-hidden self-start sm:self-auto w-full sm:w-auto">
          {['status', 'quests', 'ai'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={cn(
                "flex-1 sm:flex-initial px-3 py-1.5 sm:px-4 sm:py-1.5 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all text-center",
                activeTab === tab 
                  ? "bg-[#10B981] text-[#0A0B0E] shadow-sm shadow-[#10B981]/20 font-black" 
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
            className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4"
          >
            <div className="lg:col-span-2 space-y-3.5 sm:space-y-4">
              <div className="bg-[#14161A] p-4 sm:p-5 rounded-2xl border border-[#1F2228] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#10B981]/5 rounded-bl-full border-l border-b border-[#10B981]/10 flex items-center justify-center pointer-events-none">
                  <Sparkles className="w-8 h-8 text-[#10B981]/15" />
                </div>
                
                <div className="flex items-center gap-2.5 mb-4">
                  <div 
                    className={cn("h-6 w-1.5 rounded-full", rankConfig.borderColor.replace('border-', 'bg-'))}
                    style={{ backgroundColor: rankConfig.accentColor }}
                  />
                  <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">Abilities & Stats</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  {Object.entries(profile.skills).map(([key, value]) => {
                    const Icon = (skillIcons as any)[key] || Target;
                    return (
                      <div key={key} className="space-y-2 group">
                        <div className="flex justify-between items-end">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#0A0B0E] border border-[#1F2228] flex items-center justify-center text-[#10B981] group-hover:scale-105 transition-transform shrink-0">
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black text-[#636A78] uppercase tracking-wider">{skillNames[key as keyof typeof skillNames]}</span>
                              <span className="text-base font-mono font-bold text-white leading-none">{value} <span className="text-[10px] text-[#636A78]">/ ∞</span></span>
                            </div>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-[#0A0B0E] rounded-full overflow-hidden border border-[#1F2228] p-0.5">
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

            <div className="space-y-3.5 sm:space-y-4">
              <div className="bg-[#14161A] p-4 sm:p-5 rounded-2xl border border-[#1F2228]">
                <h4 className="text-[10px] font-black text-[#636A78] uppercase tracking-[.2em] mb-3.5">Growth History</h4>
                <div className="space-y-3 max-h-[220px] overflow-y-auto no-scrollbar pr-1">
                  {quests.filter(q => q.isCompleted).slice().reverse().map((q, i) => (
                    <div key={q.id ? `growth-q-${q.id}-${i}` : `growth-idx-${i}`} className="flex items-center gap-2.5 group/item relative p-1.5 rounded-lg hover:bg-[#1F2228]/40 transition-colors">
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

                      <div className="w-6 h-6 rounded-md bg-[#1F2228] flex items-center justify-center text-[#10B981] flex-shrink-0">
                        <Trophy className="w-3 h-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white leading-tight truncate">Cleared: {q.title}</p>
                        <p className="text-[9px] text-[#636A78]">Reward: +{q.rewardExp} EXP</p>
                      </div>
                      
                      {!readOnly && (
                        <div className="flex items-center gap-1 ml-auto shrink-0">
                          <button 
                            onClick={() => handleEditQuest(q)}
                            className="p-1 bg-[#1F2228]/50 hover:bg-[#10B981]/20 text-[#636A78] hover:text-[#10B981] transition-colors rounded border border-[#1F2228]"
                          >
                            <Edit className="w-2.5 h-2.5" />
                          </button>
                          <button 
                            onClick={() => setConfirmDeleteHistoryId(q.id)}
                            className="p-1 bg-[#1F2228]/50 hover:bg-rose-500/20 text-[#636A78] hover:text-rose-500 transition-colors rounded border border-[#1F2228]"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
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

              <div className="bg-[#14161A] p-4 sm:p-5 rounded-2xl border border-[#1F2228]">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-3.5 h-3.5 text-[#10B981]" />
                  <h4 className="text-[10px] font-black text-[#636A78] uppercase tracking-[.2em]">Rank Progression</h4>
                </div>
                <div className="overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#1F2228] text-[#636A78] text-[8.5px] uppercase tracking-wider">
                        <th className="pb-1.5 font-semibold">Rank Name</th>
                        <th className="pb-1.5 font-semibold">Level</th>
                        <th className="pb-1.5 font-semibold text-right">EXP Limit</th>
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
                            <td className="py-1.5 font-black flex items-center gap-1.5">
                              <span 
                                className={cn(
                                  "text-[11px] uppercase tracking-tight",
                                  isCurrentRank ? "font-black" : "text-[#E0E0E0]",
                                  rankStyle.textColor
                                )}
                              >
                                {item.name}
                              </span>
                              {isCurrentRank && (
                                <span className="text-[7px] bg-[#10B981]/15 text-[#10B981] px-1 py-0.2 rounded font-bold uppercase tracking-wider animate-pulse">
                                  ACTIVE
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 font-mono text-[9px] text-[#636A78]">{item.range}</td>
                            <td className={cn(
                              "py-1.5 font-mono text-[9px] text-right text-[#636A78]",
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

              <div className="bg-[#14161A] p-4 sm:p-5 rounded-2xl border border-[#1F2228] space-y-4">
                <div>
                  <span className="text-[9px] font-black text-[#636A78] uppercase tracking-[.2em] mb-2.5 block">Data Backup & Sync (Offline-Proof)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#10B981]/10 text-[#10B981] hover:bg-[#10B981] hover:text-black rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border border-[#10B981]/20 cursor-pointer active:scale-95"
                    >
                      <Download className="w-3 h-3" />
                      Backup (.json)
                    </button>

                    <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#1F2228] text-[#E0E0E0] hover:text-white hover:bg-[#2A2E37] rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border border-[#1F2228] cursor-pointer active:scale-95">
                      <Upload className="w-3 h-3 text-[#10B981]" />
                      Restore (.json)
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
                  <p className="text-[9px] text-[#636A78] mt-1.5">
                    💡 สำรองข้อมูลเพื่อนำไปใช้บนอุปกรณ์อื่นได้ทันที
                  </p>
                </div>

                <div className="pt-3 border-t border-[#1F2228]">
                  <span className="text-[9px] font-black text-[#636A78] uppercase tracking-[.2em] mb-2 block">Account Control</span>
                  {readOnly ? (
                    <p className="text-[9px] text-[#636A78] font-bold uppercase tracking-widest italic py-1">
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
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border border-rose-500/20 w-full"
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
            className="space-y-4"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="h-6 w-1.5 bg-[#10B981] rounded-full" />
                <h3 className="text-lg sm:text-xl font-black text-white uppercase italic">Active Directives</h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex gap-1 bg-[#14161A] p-0.5 rounded-lg border border-[#1F2228]">
                  {['all', 'main', 'sub', 'daily'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setQuestFilter(filter as any)}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[8.5px] font-black uppercase tracking-wider transition-all",
                        questFilter === filter
                          ? "bg-[#10B981] text-[#0A0B0E]"
                          : "text-[#636A78] hover:text-white"
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
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#0A0B0E] rounded-lg text-[10px] font-black tracking-wider hover:scale-105 transition-transform"
                  >
                    <Plus className="w-3.5 h-3.5" /> NEW MISSION
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
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
                      "group relative p-4 rounded-2xl border transition-all overflow-hidden bg-[#14161A] border-[#1F2228] hover:border-[#10B981]/50"
                    )}
                  >
                    <AnimatePresence>
                      {confirmDeleteId === quest.id && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 z-50 bg-[#0A0B0E]/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center"
                        >
                          <Trash2 className="w-6 h-6 text-rose-500 mb-2 animate-pulse" />
                          <h5 className="text-white font-black uppercase italic mb-0.5 text-xs">TERMINATE MISSION?</h5>
                          <p className="text-[8px] text-[#636A78] font-bold uppercase tracking-wider mb-3">Purge all operational data for this directive?</p>
                          <div className="flex gap-2 w-full max-w-[200px]">
                            <button 
                              onClick={() => setConfirmDeleteId(null)}
                              className="flex-1 py-1.5 bg-[#1F2228] text-[#636A78] rounded-lg text-[8px] font-black uppercase tracking-wider hover:text-white transition-colors"
                            >
                              ABORT
                            </button>
                            <button 
                              onClick={() => {
                                onDeleteQuest(quest.id);
                                setConfirmDeleteId(null);
                              }}
                              className="flex-1 py-1.5 bg-rose-500 text-white rounded-lg text-[8px] font-black uppercase tracking-wider hover:scale-[1.02] transition-transform shadow-lg shadow-rose-500/20"
                            >
                              CONFIRM
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                      {!readOnly && (
                        <div className={cn(
                          "absolute top-0 right-0 py-0.5 flex items-center bg-[#0A0B0E]/50 rounded-bl-lg overflow-hidden",
                        )}>
                          <button 
                            onClick={() => handleEditQuest(quest)}
                            className="p-1 px-1.5 hover:bg-[#10B981]/20 text-[#636A78] hover:text-[#10B981] transition-colors"
                          >
                            <Edit className="w-2.5 h-2.5" />
                          </button>
                          <button 
                            onClick={() => setConfirmDeleteId(quest.id)}
                            className="p-1 px-1.5 hover:bg-rose-500/20 text-[#636A78] hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                          <div className={cn(
                            "px-2 h-full flex items-center text-[7.5px] font-black uppercase tracking-wider",
                            quest.type === 'main' ? "bg-[#FFD700] text-black" : quest.type === 'sub' ? "bg-blue-500 text-white" : "bg-purple-500 text-white"
                          )}>
                            {quest.type}
                          </div>
                        </div>
                      )}
                      {readOnly && (
                        <div className={cn(
                          "absolute top-0 right-0 py-0.5 flex items-center bg-[#0A0B0E]/50 rounded-bl-lg overflow-hidden px-2 h-full text-[7.5px] font-black uppercase tracking-wider",
                          quest.type === 'main' ? "bg-[#FFD700] text-black" : quest.type === 'sub' ? "bg-blue-500 text-white" : "bg-purple-500 text-white"
                        )}>
                          {quest.type}
                        </div>
                      )}

                    <div className="flex flex-col h-full space-y-3">
                      <div className="flex gap-3">
                        <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#0A0B0E] border border-[#1F2228]",
                          quest.isCompleted ? "text-[#10B981]" : "text-[#636A78]"
                        )}>
                          {quest.isCompleted ? <Trophy className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0 pr-12">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-sm font-black text-white leading-tight uppercase truncate">{quest.title}</h4>
                            {quest.isRecurring && (
                              <div className="px-1.5 py-0.2 bg-[#10B981]/10 border border-[#10B981]/20 rounded text-[6.5px] font-black text-[#10B981] uppercase tracking-tight shrink-0">
                                Daily
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col mt-0.5">
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-2.5 h-2.5 text-[#10B981] fill-current" />
                              <span className="text-[9px] font-mono text-[#10B981]">+{quest.rewardExp} EXP</span>
                            </div>
                            {(quest.rewardStats || quest.rewardStat) && (
                              <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                                {(quest.rewardStats || [quest.rewardStat!]).filter(Boolean).map((stat, idx) => (
                                  <div key={idx} className="flex items-center gap-0.5">
                                    <Plus className="w-2 h-2 text-blue-400" />
                                    <span className="text-[8px] font-mono text-blue-400 uppercase">
                                      {quest.rewardStatValue} {skillNames[stat as keyof typeof skillNames]}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-[#636A78] leading-relaxed line-clamp-2">{quest.description}</p>
                      
                      {!quest.isCompleted && (
                        <button 
                          onClick={() => !readOnly && onCompleteQuest(quest.id)}
                          className={cn(
                            "mt-auto w-full py-2 bg-[#1F2228] text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                            !readOnly ? "group-hover:bg-[#10B981] group-hover:text-[#0A0B0E] cursor-pointer" : "opacity-50 cursor-default"
                          )}
                        >
                          {readOnly ? 'Objective Pending' : 'Claim Objective'}
                        </button>
                      )}
                      {quest.isCompleted && (
                        <div className="mt-auto flex items-center justify-center py-2 text-[9px] font-black text-[#10B981] uppercase italic">
                          Mission Accomplished
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {quests.filter(q => (questFilter === 'all' || q.type === questFilter) && !q.isCompleted).length === 0 && (
                <div className="col-span-full py-8 flex flex-col items-center justify-center bg-[#14161A]/50 rounded-2xl border border-dashed border-[#1F2228]">
                  <Trophy className="w-8 h-8 text-[#636A78] mb-2 opacity-20" />
                  <p className="text-white font-black uppercase italic tracking-wider text-xs mb-0.5">ALL DIRECTIVES CLEARED</p>
                  <p className="text-[9px] text-[#636A78] font-bold uppercase tracking-wider">Deployment complete. Await further instructions.</p>
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
            className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4"
          >
            <div className="lg:col-span-2 bg-[#14161A] p-4 sm:p-5 rounded-2xl border border-[#1F2228] relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-[#10B981]/10 flex items-center justify-center text-[#10B981]">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">AI Mental Guardian</h3>
                  <p className="text-[10px] text-[#636A78]">Synchronizing consciousness data...</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-[#0A0B0E]/50 p-3.5 rounded-xl border border-[#1F2228] text-xs leading-relaxed italic text-[#E0E0E0] relative group">
                  <div className="absolute -left-1 inset-y-4 w-1 bg-[#10B981] rounded-full" />
                  "Current synchronization level: {Math.floor(profile.level * 3.5)}%. Analyzing recent market interactions. {profile.skills.discipline < 50 ? 'I detect low focus on disciplinary parameters. Recommend initiating high-priority training quests.' : 'Your discipline matrix is steady. Excellent work.'} Your growth potential is currently at Peak levels."
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-[#1F2228]/50 p-3 rounded-xl border border-[#1F2228]">
                    <span className="text-[9px] font-black text-[#636A78] uppercase mb-1 block">Optimal Strategy</span>
                    <p className="text-white text-xs font-bold font-mono uppercase">Scale-in on high conviction setups</p>
                  </div>
                  <div className="bg-[#1F2228]/50 p-3 rounded-xl border border-[#1F2228]">
                    <span className="text-[9px] font-black text-[#636A78] uppercase mb-1 block">Mental Hazard</span>
                    <p className="text-rose-400 text-xs font-bold font-mono uppercase">FOMO tendency on Monday mornings</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#14161A] p-4 sm:p-5 rounded-2xl border border-[#1F2228]">
              <h4 className="text-[10px] font-black text-[#636A78] uppercase tracking-[.2em] mb-4">Neural Enhancements</h4>
              <div className="space-y-2.5">
                {[
                  { title: 'Flow State Induction', level: 'ADVANCED', xp: '500' },
                  { title: 'Logic Processing V2', level: 'ELITE', xp: '1200' },
                  { title: 'Emotional Firewall', level: 'MASTERY', xp: '2500' },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-2.5 rounded-lg bg-[#0A0B0E] border border-[#1F2228] cursor-pointer hover:border-[#10B981]/50 transition-colors">
                    <div>
                      <p className="text-xs font-bold text-white uppercase">{item.title}</p>
                      <span className="text-[8px] font-mono text-[#636A78] uppercase">Unlocked at Rank 3</span>
                    </div>
                    <span className="text-[9px] font-black text-[#10B981] uppercase tracking-wider">{item.level}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddingQuest && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-start sm:justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-[#14161A] rounded-2xl border border-[#1F2228] p-5 sm:p-6 shadow-2xl relative my-auto"
            >
              <button 
                onClick={() => {
                  setIsAddingQuest(false);
                  setEditingQuestId(null);
                }}
                className="absolute top-4 right-4 text-[#636A78] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg sm:text-xl font-black text-white italic uppercase mb-5">
                {editingQuestId ? 'Reconfigure Mission' : 'Formulate New Mission'}
              </h3>

              <form onSubmit={handleCreateQuest} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-[#636A78] uppercase tracking-wider px-1">Mission Objective</label>
                  <input 
                    type="text"
                    required
                    onFocus={handleFocus}
                    placeholder="Enter short mission title..."
                    className="w-full bg-[#0A0B0E] border border-[#1F2228] rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-[#10B981] transition-all placeholder:text-[#2D3139]"
                    value={newQuest.title}
                    onChange={(e) => setNewQuest(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-[#636A78] uppercase tracking-wider px-1">Briefing Details</label>
                  <textarea 
                    rows={2}
                    onFocus={handleFocus}
                    placeholder="Describe mission requirements..."
                    className="w-full bg-[#0A0B0E] border border-[#1F2228] rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-[#10B981] transition-all placeholder:text-[#2D3139] resize-none"
                    value={newQuest.description}
                    onChange={(e) => setNewQuest(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-[#636A78] uppercase tracking-wider px-1">Mission Type</label>
                    <select 
                      onFocus={handleFocus}
                      className="w-full bg-[#0A0B0E] border border-[#1F2228] rounded-lg p-2 text-white text-xs focus:outline-none focus:border-[#10B981] transition-all"
                      value={newQuest.type}
                      onChange={(e) => setNewQuest(prev => ({ ...prev, type: e.target.value as any }))}
                    >
                      <option value="daily">Daily Directive</option>
                      <option value="sub">Sub Quest</option>
                      <option value="main">Main Story</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-[#636A78] uppercase tracking-wider px-1">Exp Reward</label>
                    <input 
                      type="number"
                      onFocus={handleFocus}
                      className="w-full bg-[#0A0B0E] border border-[#1F2228] rounded-lg p-2 text-white text-xs focus:outline-none focus:border-[#10B981] transition-all"
                      value={newQuest.rewardExp}
                      onChange={(e) => setNewQuest(prev => ({ ...prev, rewardExp: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2.5 bg-[#0A0B0E] border border-[#1F2228] rounded-lg p-3">
                  <input 
                    type="checkbox"
                    id="isRecurring"
                    className="w-4 h-4 rounded border-[#1F2228] bg-[#0A0B0E] text-[#10B981] focus:ring-[#10B981] accent-[#10B981]"
                    checked={newQuest.isRecurring}
                    onChange={(e) => setNewQuest(prev => ({ ...prev, isRecurring: e.target.checked }))}
                  />
                  <label htmlFor="isRecurring" className="flex flex-col cursor-pointer">
                    <span className="text-[9px] font-black text-white uppercase tracking-wider">Recurring Daily Mission</span>
                    <span className="text-[8px] text-[#636A78] font-bold uppercase tracking-wider">Resets every day at 06:00 AM (TH)</span>
                  </label>
                </div>

                <div className="space-y-2.5">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-[#636A78] uppercase tracking-wider px-1 block">Ability Reward (Select Multiple)</label>
                    <div className="grid grid-cols-2 gap-1.5">
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
                              "px-2.5 py-1.5 rounded-lg border text-[9px] font-bold uppercase transition-all text-left truncate",
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
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-[#636A78] uppercase tracking-wider px-1">Stat Multiplier (Per Ability)</label>
                    <input 
                      type="number"
                      onFocus={handleFocus}
                      className="w-full bg-[#0A0B0E] border border-[#1F2228] rounded-lg p-2 text-white text-xs focus:outline-none focus:border-[#10B981] transition-all"
                      value={newQuest.rewardStatValue}
                      onChange={(e) => setNewQuest(prev => ({ ...prev, rewardStatValue: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-2.5 bg-[#10B981] text-[#0A0B0E] rounded-xl text-[10px] font-black uppercase tracking-wider hover:scale-[1.01] transition-transform shadow-md shadow-[#10B981]/20 mt-2"
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
