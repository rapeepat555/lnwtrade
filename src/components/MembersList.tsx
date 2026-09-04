import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { User, ChevronRight, Search, ShieldCheck, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { UserProfile } from '../types';

interface MembersListProps {
  onSelectMember: (userId: string, profile: UserProfile) => void;
  onClose: () => void;
}

export function MembersList({ onSelectMember, onClose }: MembersListProps) {
  const [members, setMembers] = useState<{id: string, profile: UserProfile}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true);
        const usersRef = collection(db, 'users');
        const q = query(usersRef, limit(50)); // Fetch up to 50 members for now
        const snapshot = await getDocs(q);
        const memberData = snapshot.docs.map(doc => ({
          id: doc.id,
          profile: doc.data() as UserProfile
        }));
        setMembers(memberData);
      } catch (error) {
        console.error("Failed to fetch members:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  const filteredMembers = members.filter(m => 
    m.profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#14161A]">
      <div className="p-6 border-b border-[#1F2228]">
        <h2 className="text-xl font-black text-white uppercase italic tracking-tight mb-4">Member Directory</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#636A78]" />
          <input
            type="text"
            placeholder="Search by name or ID..."
            className="w-full bg-[#0A0B0E] border border-[#1F2228] rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#10B981] transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full py-12 gap-4">
            <div className="w-6 h-6 border-2 border-[#10B981]/30 border-t-[#10B981] rounded-full animate-spin" />
            <p className="text-[10px] font-black text-[#636A78] uppercase tracking-widest">Scanning Network...</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => onSelectMember(member.id, member.profile)}
                className="w-full flex items-center gap-4 p-3 hover:bg-[#1F2228] rounded-xl transition-all group text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-[#0A0B0E] border border-[#1F2228] flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:border-[#10B981]/50 transition-all">
                  {member.profile.avatar ? (
                    <img src={member.profile.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-[#636A78]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-white truncate">{member.profile.name}</p>
                    {(member.profile.name.toLowerCase().includes('rapeepat') || member.profile.name.toLowerCase().includes('rapeedat')) && (
                      <div className="w-3 h-3 rounded-full bg-[#10B981] flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.4)]">
                        <Star className="w-1.5 h-1.5 text-[#0A0B0E] fill-current" />
                      </div>
                    )}
                    <div className="px-1.5 py-0.5 bg-[#10B981]/10 rounded text-[8px] font-black text-[#10B981] uppercase tracking-tighter ml-auto">
                      LV.{member.profile.level}
                    </div>
                  </div>
                  <p className="text-[10px] text-[#636A78] font-bold uppercase tracking-widest flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> {member.profile.rank}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#636A78] group-hover:text-white transition-colors" />
              </button>
            ))}
            {filteredMembers.length === 0 && (
              <div className="py-12 text-center text-[#636A78]">
                <p className="text-xs font-bold uppercase tracking-widest italic">No matching members found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
