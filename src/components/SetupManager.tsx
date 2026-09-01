
import React, { useState } from 'react';
import { X, Plus, Trash2, Edit2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

interface SetupManagerProps {
  setups: string[];
  addSetup: (name: string) => void;
  deleteSetup: (name: string) => void;
  updateSetup: (oldName: string, newName: string) => void;
  onClose: () => void;
  readOnly?: boolean;
}

export function SetupManager({ setups, addSetup, deleteSetup, updateSetup, onClose, readOnly }: SetupManagerProps) {
  const [newSetup, setNewSetup] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    if (newSetup.trim()) {
      addSetup(newSetup.trim());
      setNewSetup('');
    }
  };

  const startEdit = (index: number, value: string) => {
    if (readOnly) return;
    setEditingIndex(index);
    setEditValue(value);
  };

  const handleUpdate = (index: number) => {
    if (readOnly) return;
    if (editValue.trim()) {
      updateSetup(setups[index], editValue.trim());
      setEditingIndex(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0B0E] rounded-2xl overflow-hidden border border-[#1F2228]">
      <div className="p-6 border-b border-[#1F2228] flex items-center justify-between bg-[#14161A]/50">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">{readOnly ? 'Observed Setups' : 'Trading Setups'}</h2>
          <p className="text-xs text-[#636A78] font-medium">{readOnly ? 'Viewing member trading systems' : 'Manage your trading systems'}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-[#1F2228] rounded-full text-[#636A78]">
          <X className="w-5 h-5" />
        </button>
      </div>

      {!readOnly && (
        <div className="p-6 border-b border-[#1F2228]">
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              autoFocus
              type="text"
              placeholder="New setup name..."
              className="flex-1 bg-[#0A0B0E] border border-[#1F2228] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#10B981] transition-all text-sm"
              value={newSetup}
              onChange={(e) => setNewSetup(e.target.value)}
            />
            <button
              type="submit"
              className="bg-[#10B981] text-[#0A0B0E] p-3 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-[#10B981]/10"
            >
              <Plus className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <AnimatePresence initial={false}>
          {setups.map((setup, index) => (
            <motion.div
              key={`setup-manager-${setup}-${index}`}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center justify-between p-4 rounded-xl bg-[#14161A]/50 border border-[#1F2228] group"
            >
              {editingIndex === index ? (
                <div className="flex-1 flex gap-2">
                  <input
                    autoFocus
                    type="text"
                    className="flex-1 bg-[#0A0B0E] border border-[#10B981] rounded-lg px-2 py-1 text-white text-sm"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdate(index)}
                  />
                  <button onClick={() => handleUpdate(index)} className="text-[#10B981]">
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <span className="text-white text-sm font-medium">{setup}</span>
              )}

              {!readOnly && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEdit(index, setup)}
                    className="p-2 text-[#10B981] bg-[#10B981]/10 hover:bg-[#10B981]/20 transition-all rounded-xl border border-[#10B981]/20 shadow-sm"
                    title="Edit setup"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteSetup(setup)}
                    className="p-2 text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 transition-all rounded-xl border border-rose-500/20 shadow-sm"
                    title="Delete setup"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
