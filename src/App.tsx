/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Tutorial } from './components/Tutorial';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { TradeHistory } from './components/TradeHistory';
import { Analysis } from './components/Analysis';
import { WalletView } from './components/Wallet';
import { Analyst } from './components/Analyst';
import { TradeForm } from './components/TradeForm';
import { UserProfile } from './components/UserProfile';
import { TradingViewChart } from './components/TradingViewChart';
import { useTradingData } from './hooks';
import { Plus, User as UserIcon, Camera, Users, LogOut, ArrowLeft, X, Brain, TrendingUp, MessageCircleCode, Star } from 'lucide-react';
import { AIChat } from './components/AIChat';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile as UserProfileType, Quest } from './types';
import { useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { cn, formatCurrency } from './lib/utils';
import { auth as firebaseAuth, db, handleFirestoreError, OperationType, sanitizeData } from './lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  QueryDocumentSnapshot, 
  writeBatch,
  deleteDoc
} from 'firebase/firestore';
import { MembersList } from './components/MembersList';

const INITIAL_PROFILE: UserProfileType = {
  id: 'user-1',
  name: 'Trader Hero',
  level: 4,
  exp: 0,
  statPoints: 0,
  rank: 'Bronze I',
  skills: {
    discipline: 9,
    riskManagement: 9,
    technicalAnalysis: 9,
    psychology: 9,
  }
};

const INITIAL_QUESTS: Quest[] = [
  { id: 'q1', title: 'First Execution', description: 'Log your very first trade in the terminal.', rewardExp: 500, isCompleted: false, type: 'main' },
  { id: 'q2', title: 'Daily Market Check', description: 'Analyze the high-timeframe trend today.', rewardExp: 100, isCompleted: false, type: 'daily' },
  { id: 'q3', title: 'Weekly Journal', description: 'Review all trades from the past 7 days.', rewardExp: 400, isCompleted: false, type: 'sub' },
];

function recalculateLevelProgress(profile: UserProfileType): UserProfileType {
  let level = profile.level;
  let exp = profile.exp;
  let rank = profile.rank;

  while (exp >= level * 1000) {
    exp -= level * 1000;
    level += 1;
  }

  if (level < 5) rank = 'Bronze I';
  else if (level < 10) rank = 'Bronze II';
  else if (level < 20) rank = 'Silver I';
  else if (level < 40) rank = 'Gold I';
  else if (level < 60) rank = 'Platinum I';
  else if (level < 80) rank = 'Diamond I';
  else if (level < 100) rank = 'Supreme';
  else rank = 'Legendary';

  return {
    ...profile,
    level,
    exp,
    rank
  };
}

export default function App() {
  const { user, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<any>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [isMembersListOpen, setIsMembersListOpen] = useState(false);
  const [viewUserId, setViewUserId] = useState<string | null>(null);
  const [viewUserProfile, setViewUserProfile] = useState<UserProfileType | null>(null);
  const [tradingSymbol, setTradingSymbol] = useState('EIGHTCAP:XAUUSD');
  const [tradingInterval, setTradingInterval] = useState('D');
  const [aiAnalysisRequest, setAiAnalysisRequest] = useState<{symbol: string, interval: string} | null>(null);

  const handleAnalyzeChart = (symbol: string, interval: string) => {
    setAiAnalysisRequest({ symbol, interval });
    setIsAnalysisOpen(true);
  };

  // Expose setActiveTab to window for deep links/CTAs
  React.useEffect(() => {
    (window as any).setActiveTab = setActiveTab;
    return () => { delete (window as any).setActiveTab; };
  }, []);
  
  const [userProfile, setUserProfile] = useState<UserProfileType>(INITIAL_PROFILE);
  const [quests, setQuests] = useState<Quest[]>(INITIAL_QUESTS);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Check file size (limit to 1MB for base64 storage if we're doing that, or just try)
    if (file.size > 1024 * 1024) {
      alert("File is too large. Please select an image under 1MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      try {
        // We only update Firestore because Firebase Auth photoURL has a strict length limit
        // which base64 strings often exceed.
        
        // Update Firestore profile avatar
        setUserProfile(prev => ({ ...prev, avatar: base64 }));
        
        alert("Profile picture updated successfully!");
      } catch (err) {
        console.error("Failed to update profile picture:", err);
        alert("Failed to update profile picture.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateAvatar = async (base64: string) => {
    if (!user) return;
    try {
      // Only updating Firestore to avoid Firebase Auth length limits
      setUserProfile(prev => ({ ...prev, avatar: base64 }));
    } catch (err) {
      console.error("Failed to update avatar:", err);
      alert("Failed to update avatar.");
    }
  };

  const handleUpdateName = async (name: string) => {
    if (!user || !name.trim()) return;
    try {
      setUserProfile(prev => ({ ...prev, name }));
    } catch (err) {
      console.error("Failed to update name:", err);
    }
  };

  const { 
    loading: tradingLoading,
    trades, 
    setups,
    portfolios,
    activePortfolioId,
    activePortfolio,
    setActivePortfolio,
    addPortfolio,
    updatePortfolio,
    deletePortfolio,
    stats, 
    addTrade, 
    closeTrade, 
    updateTrade,
    deleteTrade, 
    addSetup,
    deleteSetup,
    updateSetup,
    updateBalance,
    addTransaction,
    deleteTransaction 
  } = useTradingData(user, viewUserId);

  const handleSelectMember = (userId: string, profile: UserProfileType) => {
    if (userId === user?.uid) {
      setViewUserId(null);
      setViewUserProfile(null);
    } else {
      setViewUserId(userId);
      setViewUserProfile(profile);
    }
    setIsMembersListOpen(false);
    setIsAccountMenuOpen(false);
    setActiveTab('dashboard'); // Reset to dashboard when viewing new member
  };

  const handleExitViewMode = () => {
    setViewUserId(null);
    setViewUserProfile(null);
  };

  // Sync data from Firestore on login
  React.useEffect(() => {
    if (!user) {
      setDataLoading(false);
      return;
    }

    const loadUserData = async () => {
      try {
        setDataLoading(true);
        // Load Profile
        const profileRef = doc(db, 'users', user.uid);
        const profileSnap = await getDoc(profileRef);
        
        if (profileSnap.exists()) {
          const profileData = profileSnap.data() as UserProfileType;
          
          // Fix: If user was previously higher level or has lower stats than requested, restore them.
          // This addresses the user complaint about level decreasing.
          const needsFix = profileData.level < 4 || Object.values(profileData.skills).some(v => v < 9);
          if (needsFix) {
            const fixedProfile = {
              ...profileData,
              level: Math.max(profileData.level, 4),
              skills: {
                discipline: Math.max(profileData.skills.discipline, 9),
                riskManagement: Math.max(profileData.skills.riskManagement, 9),
                technicalAnalysis: Math.max(profileData.skills.technicalAnalysis, 9),
                psychology: Math.max(profileData.skills.psychology, 9),
              }
            };
            const postRecalculated = recalculateLevelProgress(fixedProfile);
            setUserProfile(postRecalculated);
            await setDoc(profileRef, sanitizeData(postRecalculated));
          } else {
            const postRecalculated = recalculateLevelProgress(profileData);
            setUserProfile(postRecalculated);
            if (postRecalculated.level !== profileData.level || postRecalculated.exp !== profileData.exp) {
              await setDoc(profileRef, sanitizeData(postRecalculated));
            }
          }
        } else {
          // Check local storage for migration
          const saved = localStorage.getItem('trader_profile');
          if (saved) {
            try {
              const profile = recalculateLevelProgress(JSON.parse(saved));
              await setDoc(profileRef, sanitizeData(profile));
              setUserProfile(profile);
            } catch (e) {
              console.error("Failed to parse local profile:", e);
              await setDoc(profileRef, sanitizeData(INITIAL_PROFILE));
              setUserProfile(INITIAL_PROFILE);
            }
          } else {
            const initialProfile = {
              ...INITIAL_PROFILE,
              id: user.uid,
              name: user.displayName || user.email?.split('@')[0] || INITIAL_PROFILE.name
            };
            await setDoc(profileRef, sanitizeData(initialProfile));
            setUserProfile(initialProfile);
          }
        }

        // Load Quests
        const questsRef = collection(db, 'users', user.uid, 'quests');
        const questsSnap = await getDocs(questsRef);
        
        if (!questsSnap.empty) {
          let loadedQuests = questsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quest));
          
          // Check for recurring resets (6:00 AM TH = 23:00 UTC previous day)
          const now = new Date();
          const thOffset = 7 * 60 * 60 * 1000;
          const thNow = new Date(now.getTime() + thOffset);
          const resetTH = new Date(thNow);
          resetTH.setUTCHours(6, 0, 0, 0);
          if (thNow < resetTH) resetTH.setUTCDate(resetTH.getUTCDate() - 1);
          const lastResetThreshold = new Date(resetTH.getTime() - thOffset);

          let hasResetOccurred = false;
          loadedQuests = loadedQuests.map(q => {
            if (q.isRecurring && q.isCompleted && q.lastCompletedAt) {
              const compDate = new Date(q.lastCompletedAt);
              if (compDate < lastResetThreshold) {
                hasResetOccurred = true;
                return { ...q, isCompleted: false };
              }
            }
            return q;
          });

          if (hasResetOccurred) {
            const batch = writeBatch(db);
            loadedQuests.forEach(q => {
              const qRef = doc(db, 'users', user.uid, 'quests', q.id);
              batch.set(qRef, sanitizeData(q));
            });
            await batch.commit();
          }

          setQuests(loadedQuests);
        } else {
          // Migration from local or initial
          const savedQuestsRaw = localStorage.getItem('trader_quests');
          let questsToSave = INITIAL_QUESTS;
          if (savedQuestsRaw) {
            try {
              questsToSave = JSON.parse(savedQuestsRaw);
            } catch (e) {
              console.error("Failed to parse local quests:", e);
            }
          }
          
          const batch = writeBatch(db);
          questsToSave.forEach((q: Quest) => {
            const qRef = doc(collection(db, 'users', user.uid, 'quests'));
            batch.set(qRef, sanitizeData({ ...q, id: qRef.id }));
          });
          await batch.commit();
          setQuests(questsToSave);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'users/profile_and_quests', false);
      } finally {
        setDataLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  // Sync profile changes to Firestore
  React.useEffect(() => {
    if (!user || dataLoading || tradingLoading) return;
    
    const saveProfile = async () => {
      try {
        await setDoc(doc(db, 'users', user.uid), sanitizeData(userProfile));
        localStorage.setItem('trader_profile', JSON.stringify(userProfile));
      } catch (error) {
        console.error("Failed to sync profile:", error);
      }
    };

    saveProfile();
  }, [userProfile, user, dataLoading, tradingLoading]);

  // Saving quests locally for now as backup, but they are updated in handlers
  React.useEffect(() => {
    localStorage.setItem('trader_quests', JSON.stringify(quests));
  }, [quests]);

  if (loading || dataLoading || tradingLoading) {
    return (
      <div className="min-h-screen bg-[#0A0B0E] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-[#10B981]/30 border-t-[#10B981] rounded-full animate-spin" />
          <p className="text-[10px] font-black text-[#636A78] uppercase tracking-[.25em]">Syncing Terminal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const handlePasswordReset = async () => {
    if (user.email) {
      try {
        await sendPasswordResetEmail(firebaseAuth, user.email);
        alert(`Password reset email sent to ${user.email}`);
      } catch (error: any) {
        alert(`Error: ${error.message}`);
      }
    }
  };

  const handleCompleteQuest = (questId: string) => {
    const quest = quests.find(q => q.id === questId);
    if (!quest || quest.isCompleted) return;

    // 1. Calculate Rewards statically to avoid double-counting in React Strict Mode functional updates
    const boosts: Record<string, number> = {};
    if ((quest.rewardStats && quest.rewardStats.length > 0) || quest.rewardStat) {
      const statsToBoost = quest.rewardStats || [quest.rewardStat!];
      statsToBoost.forEach(stat => {
        if (stat) {
          boosts[stat] = (boosts[stat] || 0) + (quest.rewardStatValue || 0);
        }
      });
    } else {
      // Pick a random skill from existing skills
      const skillKeys = Object.keys(userProfile.skills);
      const randomSkill = skillKeys[Math.floor(Math.random() * skillKeys.length)];
      boosts[randomSkill] = 1;
    }

    const afterRecalculation = recalculateLevelProgress({ ...userProfile, exp: userProfile.exp + quest.rewardExp });
    const recordedLevelUp = afterRecalculation.level > userProfile.level;

    // 2. Update Profile
    setUserProfile(prev => {
      const skills = { ...prev.skills };

      // Apply pre-calculated boosts
      Object.entries(boosts).forEach(([stat, val]) => {
        if (skills[stat as keyof typeof skills] !== undefined) {
          skills[stat as keyof typeof skills] += val;
        }
      });

      const updatedWithExp = {
        ...prev,
        exp: prev.exp + quest.rewardExp,
        skills
      };

      return recalculateLevelProgress(updatedWithExp);
    });

    // 3. Update Quest state (including the record for undo)
    const completedAt = new Date().toISOString();
    const updatedQuestFields: Partial<Quest> = {
      isCompleted: true, 
      lastCompletedAt: completedAt,
      completedStatBoosts: boosts,
      completedLevelUp: recordedLevelUp
    };

    setQuests(prev => prev.map(q => q.id === questId ? { ...q, ...updatedQuestFields } : q));

    if (user) {
      const qRef = doc(db, 'users', user.uid, 'quests', questId);
      setDoc(qRef, sanitizeData(updatedQuestFields), { merge: true }).catch(err => {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/quests/${questId}`);
      });
    }
  };

  const handleUndoQuest = (questId: string) => {
    const quest = quests.find(q => q.id === questId);
    if (!quest || !quest.isCompleted) return;

    // Update profile EXP and Level (Reverse)
    setUserProfile(prev => {
      let newExp = prev.exp - quest.rewardExp;
      let newLevel = prev.level;
      let newRank = prev.rank;
      const skills = { ...prev.skills };

      // Revert Level Up
      if (quest.completedLevelUp && newLevel > 1) {
        newLevel -= 1;
        const prevLevelExpToNext = newLevel * 1000;
        newExp += prevLevelExpToNext;
      } else if (newExp < 0 && newLevel > 1) {
        // Fallback for cases where completedLevelUp wasn't set but exp is negative
        newLevel -= 1;
        const prevLevelExpToNext = newLevel * 1000;
        newExp += prevLevelExpToNext;
      }

      // Restore Exp to 0 if it somehow goes negative (shouldn't happen with above logic)
      if (newExp < 0) newExp = 0;

      // Recalculate Rank based on newLevel
      if (newLevel < 5) newRank = 'Bronze I';
      else if (newLevel < 10) newRank = 'Bronze II';
      else if (newLevel < 20) newRank = 'Silver I';
      else if (newLevel < 40) newRank = 'Gold I';
      else if (newLevel < 60) newRank = 'Platinum I';
      else if (newLevel < 80) newRank = 'Diamond I';
      else if (newLevel < 100) newRank = 'Supreme';
      else newRank = 'Legendary';

      // Revert Stat Boosts
      if (quest.completedStatBoosts) {
        Object.entries(quest.completedStatBoosts).forEach(([stat, value]) => {
          if (skills[stat as keyof typeof skills] !== undefined) {
             skills[stat as keyof typeof skills] = Math.max(0, skills[stat as keyof typeof skills] - value);
          }
        });
      }

      return {
        ...prev,
        level: newLevel,
        exp: newExp,
        rank: newRank,
        skills
      };
    });

    // Update quest status
    const updates = { 
      isCompleted: false, 
      lastCompletedAt: null,
      completedStatBoosts: null,
      completedLevelUp: null
    };

    handleUpdateQuest(questId, updates);
  };

  const handleUpdateStats = (skillKey: string) => {
    setUserProfile(prev => {
      if (prev.statPoints <= 0 && prev.skills[skillKey as keyof typeof prev.skills] !== undefined) return prev;
      
      const skills = { ...prev.skills };
      const currentPoints = prev.statPoints;
      
      // If it's a new skill, we allow adding it for 0 points if it doesn't exist? 
      // Or should it cost 1 point to "unlock/increase"?
      // Usually "Plus" means increase.
      if (currentPoints <= 0 && skills[skillKey as keyof typeof skills] === undefined) return prev;

      return {
        ...prev,
        statPoints: Math.max(0, currentPoints - 1),
        skills: {
          ...skills,
          [skillKey]: (skills[skillKey as keyof typeof skills] || 0) + 1
        }
      };
    });
  };

  const handleAddQuest = async (questData: Omit<Quest, 'id' | 'isCompleted'>) => {
    if (!user) return;

    try {
      const qRef = doc(collection(db, 'users', user.uid, 'quests'));
      const newQuest: Quest = {
        ...questData,
        id: qRef.id,
        isCompleted: false
      };
      await setDoc(qRef, sanitizeData(newQuest));
      setQuests(prev => [newQuest, ...prev]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/quests`);
    }
  };

  const handleUpdateQuest = async (questId: string, updates: Partial<Quest>) => {
    if (!user) return;

    try {
      const qRef = doc(db, 'users', user.uid, 'quests', questId);
      await setDoc(qRef, sanitizeData(updates), { merge: true });
      setQuests(prev => prev.map(q => q.id === questId ? { ...q, ...updates } : q));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/quests/${questId}`);
    }
  };

  const handleDeleteQuest = async (questId: string) => {
    if (!user) return;

    try {
      const qRef = doc(db, 'users', user.uid, 'quests', questId);
      await deleteDoc(qRef);
      setQuests(prev => prev.filter(q => q.id !== questId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/quests/${questId}`);
    }
  };

  const handleEditTrade = (trade: any) => {
    setEditingTrade(trade);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingTrade(null);
  };

  const filteredTrades = trades.filter(t => t.portfolioId === activePortfolioId);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard trades={trades} portfolios={portfolios} setups={setups} readOnly={!!viewUserId} />;
      case 'tradingview':
        return (
          <TradingViewChart 
            symbol={tradingSymbol} 
            onSymbolChange={setTradingSymbol}
            interval={tradingInterval}
            onIntervalChange={setTradingInterval}
            onAnalyze={handleAnalyzeChart}
          />
        );
      case 'history':
        return (
          <TradeHistory 
            trades={trades} 
            portfolios={portfolios} 
            setups={setups} 
            onDelete={deleteTrade} 
            onClose={closeTrade} 
            onEdit={handleEditTrade}
            readOnly={!!viewUserId}
          />
        );
      case 'analyst':
        return (
          <Analyst 
            setups={setups}
          />
        );
      case 'profile':
        return (
          <UserProfile 
            profile={viewUserProfile || userProfile} 
            quests={quests} 
            onCompleteQuest={handleCompleteQuest}
            onUndoQuest={handleUndoQuest}
            onDeleteQuest={handleDeleteQuest}
            onUpdateQuest={handleUpdateQuest}
            onUpdateStats={handleUpdateStats}
            onAddQuest={handleAddQuest}
            onUpdateAvatar={handleUpdateAvatar}
            onUpdateName={handleUpdateName}
            googlePhotoURL={viewUserProfile ? undefined : (user.photoURL || undefined)}
            readOnly={!!viewUserId}
          />
        );
      case 'wallet':
        return (
          <WalletView 
            portfolios={portfolios}
            activePortfolioId={activePortfolioId}
            setActivePortfolio={setActivePortfolio}
            addPortfolio={addPortfolio}
            updatePortfolio={updatePortfolio}
            deletePortfolio={deletePortfolio}
            updateBalance={updateBalance} 
            addTransaction={addTransaction}
            deleteTransaction={deleteTransaction}
            trades={trades} 
            readOnly={!!viewUserId}
          />
        );
      default:
        return <Dashboard trades={trades} portfolios={portfolios} setups={setups} />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row bg-[#0A0B0E] min-h-screen md:h-screen font-sans selection:bg-[#10B981]/20 selection:text-white overflow-x-hidden">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isCollapsed={sidebarCollapsed}
        setIsCollapsed={setSidebarCollapsed}
      />
      
      <main className={cn(
        "flex-1 mx-auto w-full transition-all duration-300 flex flex-col",
        activeTab === 'tradingview' 
          ? "p-0 pt-4 pb-16 max-w-none h-screen overflow-hidden" 
          : "max-w-7xl px-4 pt-10 sm:p-8 md:p-12 pb-24 md:pb-12 md:overflow-y-auto"
      )}>
        {viewUserId && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-2xl flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#0A0B0E] border border-[#F59E0B]/30 flex items-center justify-center overflow-hidden">
                {viewUserProfile?.avatar ? (
                  <img src={viewUserProfile.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-6 h-6 text-[#F59E0B]" />
                )}
              </div>
              <div>
                <p className="text-[10px] font-black text-[#F59E0B] uppercase tracking-widest mb-1">Observation Mode</p>
                <p className="text-lg font-black text-white uppercase tracking-tighter italic">Viewing {viewUserProfile?.name}'s Matrix</p>
              </div>
            </div>
            <button 
              onClick={handleExitViewMode}
              className="flex items-center gap-2 px-4 py-2 bg-[#0A0B0E] border border-[#1F2228] rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:border-[#F59E0B] transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Return to My Matrix
            </button>
          </motion.div>
        )}

        <header className={cn(
          "flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4",
          activeTab === 'tradingview' ? "px-4 sm:px-0" : "mb-8 md:mb-12"
        )}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">


            <div className="relative">
              <button 
                onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                className="flex items-center gap-3 px-3 py-1.5 bg-[#14161A] rounded-full border border-[#1F2228] w-fit hover:border-[#10B981] transition-all cursor-pointer group"
              >
                <div className="w-6 h-6 rounded-full bg-[#10B981]/20 flex items-center justify-center border border-[#10B981]/30 group-hover:bg-[#10B981]/30 group-hover:border-[#10B981]/50 transition-all overflow-hidden shrink-0">
                  {(userProfile.avatar || user.photoURL) ? (
                    <img src={userProfile.avatar || user.photoURL || undefined} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon className="w-3.5 h-3.5 text-[#10B981]" />
                  )}
                </div>
                <span className="text-[10px] font-black text-white uppercase tracking-wider truncate max-w-[150px]">
                  {userProfile.name || user.displayName || user.email?.split('@')[0]}
                </span>
                { (userProfile.name || user.displayName || user.email?.split('@')[0] || '').toLowerCase().includes('rapeepat') && (
                  <div className="w-3.5 h-3.5 rounded-full bg-[#10B981] flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.4)]">
                    <Star className="w-2 h-2 text-[#0A0B0E] fill-current" />
                  </div>
                )}
              </button>

              <AnimatePresence>
                {isAccountMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsAccountMenuOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute left-0 mt-2 w-64 bg-[#14161A] border-2 border-[#1F2228] rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-[#1F2228] bg-[#1F2228]/30">
                        <p className="text-[10px] font-black text-[#636A78] uppercase tracking-widest mb-1">Authenticated As</p>
                        <p className="text-sm font-bold text-white truncate">{user.email}</p>
                      </div>
                      
                      <div className="p-2">
                        <button 
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#1F2228] rounded-xl text-left transition-colors group"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*" 
                            onChange={handleProfilePictureUpload}
                          />
                          <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/10 flex items-center justify-center border border-[#3B82F6]/20 group-hover:border-[#3B82F6]/50">
                            <Camera className="w-4 h-4 text-[#3B82F6]" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white uppercase tracking-tighter">Profile Avatar</p>
                            <p className="text-[9px] text-[#636A78] font-bold uppercase tracking-widest">Update Identity</p>
                          </div>
                        </button>

                        <button 
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#1F2228] rounded-xl text-left transition-colors group"
                          onClick={() => setIsMembersListOpen(true)}
                        >
                          <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center border border-[#F59E0B]/20 group-hover:border-[#F59E0B]/50">
                            <Users className="w-4 h-4 text-[#F59E0B]" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white uppercase tracking-tighter">Member</p>
                            <p className="text-[9px] text-[#636A78] font-bold uppercase tracking-widest">View All Members</p>
                          </div>
                        </button>

                        <div className="h-[2px] bg-[#1F2228] my-2" />

                        <button 
                          onClick={() => {
                            setIsAccountMenuOpen(false);
                            signOut();
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-rose-500/10 rounded-xl text-left transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/20 group-hover:border-rose-500/50">
                            <LogOut className="w-4 h-4 text-rose-500" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-rose-500 uppercase tracking-tighter">Terminate Session</p>
                            <p className="text-[9px] text-[#636A78] font-bold uppercase tracking-widest">Log Out</p>
                          </div>
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          {!viewUserId && (
            <button 
              onClick={() => setIsFormOpen(true)}
              className="flex items-center justify-center gap-2 bg-[#10B981] text-[#0A0B0E] px-6 py-2.5 rounded-lg shadow-lg shadow-[#10B981]/10 hover:opacity-90 transition-all font-bold text-xs tracking-tight w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              + LOG NEW TRADE
            </button>
          )}
          {viewUserId && (
            <div className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
              <span className="text-[10px] font-black text-[#F59E0B] uppercase tracking-widest">Observation Mode</span>
            </div>
          )}
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className={activeTab === 'tradingview' ? "flex-1 flex flex-col min-h-0 w-full" : ""}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating Raphael Sphere - Tucked to the side */}
      <motion.button
        initial={{ x: 30, opacity: 0 }}
        animate={{ x: 14, opacity: 1 }}
        whileHover={{ x: 0 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsAnalysisOpen(true)}
        className="fixed right-0 bottom-48 md:bottom-1/2 md:transform md:translate-y-1/2 w-12 h-16 rounded-l-2xl bg-gradient-to-br from-[#10B981] to-[#3B82F6] flex items-center justify-start pl-2.5 border-l border-y border-[#10B981]/30 shadow-[-5px_0_15px_rgba(16,185,129,0.2)] z-[250] group overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <MessageCircleCode className="w-5 h-5 text-white relative z-10" />
        
        {/* Indicators */}
        <div className="absolute top-1.5 left-1.5 w-1 h-1 bg-white rounded-full animate-pulse shadow-[0_0_5px_white]" />
        
        {/* Label on side */}
        <div className="absolute left-8 top-1/2 -translate-y-1/2 rotate-90 whitespace-nowrap hidden group-hover:block transition-all">
          <span className="text-[8px] font-black uppercase text-white tracking-[0.2em]">Raphael AI</span>
        </div>
      </motion.button>

      {/* Raphael Chat Popup */}
      <AnimatePresence>
        {isAnalysisOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-0 md:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAnalysisOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl h-[100vh] md:h-[90vh] bg-[#0A0B0E] rounded-none md:rounded-[2.5rem] border-none md:border md:border-[#1F2228] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 md:px-8 md:py-6 border-b border-[#1F2228] flex items-center justify-between bg-[#14161A]/50 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-[#10B981]/20 to-[#3B82F6]/20 flex items-center justify-center border border-[#10B981]/30">
                    <Brain className="w-5 h-5 md:w-6 md:h-6 text-[#10B981]" />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-2xl font-serif text-white tracking-tight italic">Raphael</h2>
                    <p className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] font-bold text-[#636A78]">Neural Intelligence Core v4.2</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAnalysisOpen(false)}
                  className="p-2 md:p-3 bg-[#1F2228] hover:bg-[#2D3139] rounded-xl md:rounded-2xl text-[#636A78] hover:text-white transition-all border border-[#1F2228] hover:border-[#10B981]/30"
                >
                  <X className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              </div>
              
              <div className="flex-1 overflow-hidden">
                <AIChat 
                  userProfile={userProfile}
                  trades={filteredTrades}
                  portfolios={portfolios}
                  onAddTrade={addTrade}
                  onUpdateTrade={updateTrade}
                  onDeleteTrade={deleteTrade}
                  onUpdateProfile={async (updates) => {
                    if (userProfile) {
                      const newProfile = recalculateLevelProgress({ ...userProfile, ...updates });
                      setUserProfile(newProfile);
                      const profileRef = doc(db, 'users', userProfile.id, 'settings', 'profile');
                      await setDoc(profileRef, sanitizeData(newProfile));
                    }
                  }}
                  onAddPortfolio={addPortfolio}
                  onUpdatePortfolio={updatePortfolio}
                  onDeletePortfolio={deletePortfolio}
                  onUpdateTradingSymbol={(symbol) => {
                    setTradingSymbol(symbol);
                    // AI update shouldn't force tab switch if user is in chat
                  }}
                  onUpdateTradingTimeframe={(interval) => {
                    setTradingInterval(interval);
                    // AI update shouldn't force tab switch if user is in chat
                  }}
                   onJournalTrade={(data) => {
                    const cleanSymbol = data.symbol?.replace(/\s*\([^)]*\)/g, '').trim() || 'XAUUSD';
                    const finalImages = data.images || (data.image ? [data.image] : []);
                    setEditingTrade({
                      symbol: cleanSymbol,
                      type: (data.recommendation?.toLowerCase().includes('buy') || data.recommendation?.toLowerCase().includes('long')) ? 'long' : 'short',
                      entryPrice: data.entry?.toString().replace(/[^0-9.]/g, ''),
                      stopLoss: data.sl?.toString().replace(/[^0-9.]/g, ''),
                      takeProfit: data.tp?.toString().replace(/[^0-9.]/g, ''),
                      exitPrice: data.tp?.toString().replace(/[^0-9.]/g, ''),
                      session: data.session,
                      zone: data.zone,
                      quantity: data.quantity,
                      setup: data.setup,
                      notes: `Raphael Analysis:\n${data.reasoning || ''}`,
                      images: finalImages
                    });
                    setIsFormOpen(true);
                    setIsAnalysisOpen(false);
                  }}
                  symbol={tradingSymbol}
                  interval={tradingInterval}
                  analysisRequest={aiAnalysisRequest}
                  onClearAnalysis={() => setAiAnalysisRequest(null)}
                  setups={setups}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <TradeForm 
        isOpen={isFormOpen} 
        onClose={handleFormClose} 
        onSubmit={editingTrade?.id ? (data) => updateTrade(editingTrade.id, data) : addTrade} 
        editingTrade={editingTrade}
        setups={setups}
        portfolios={portfolios}
        activePortfolioId={activePortfolioId}
        addSetup={addSetup}
        deleteSetup={deleteSetup}
        updateSetup={updateSetup}
      />

      <AnimatePresence>
        {isMembersListOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-lg h-[600px] border-2 border-[#1F2228] rounded-3xl overflow-hidden shadow-2xl relative"
            >
              <MembersList 
                onSelectMember={handleSelectMember} 
                onClose={() => setIsMembersListOpen(false)} 
              />
              <button 
                onClick={() => setIsMembersListOpen(false)}
                className="absolute top-6 right-6 p-2 bg-[#0A0B0E] border border-[#1F2228] rounded-xl text-[#636A78] hover:text-white transition-all z-10"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <Tutorial />
    </div>
  );
}
