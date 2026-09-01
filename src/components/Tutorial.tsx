import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, BrainCircuit, TrendingUp, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '../lib/utils';

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const STEPS: TutorialStep[] = [
  {
    title: "Neural Strategy Evaluator",
    description: "ยินดีต้อนรับสู่ระบบ Raphael 4.2 ระบบประมวลผลกลยุทธ์ผ่านข่ายประสาท AI ที่ออกแบบมาเพื่อเทรดเดอร์ระดับสูง",
    icon: <BrainCircuit className="w-8 h-8 text-emerald-500" />,
    color: "emerald"
  },
  {
    title: "Raphael Analyze",
    description: "ปุ่มวิเคราะห์อัจฉริยะบนหน้ากากกราฟ ช่วยให้คุณส่งข้อมูลกราฟปัจจุบันไปให้ราฟาเอลวิเคราะห์โครงสร้างตลาดและแนวโน้มได้ทันที",
    icon: <Sparkles className="w-8 h-8 text-indigo-500" />,
    color: "indigo"
  },
  {
    title: "Neural Terminal",
    description: "หน้าจอเทรดที่ปรับจูนความเสถียรมาใหม่ แก้ไขปัญหาการเลื่อนจอ (Touch-lock) และปรับความยาวเพื่อทัศนวิสัยสูงสุด",
    icon: <TrendingUp className="w-8 h-8 text-amber-500" />,
    color: "amber"
  }
];

export function Tutorial() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('raphael_tutorial_v42');
    if (!hasSeenTutorial) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('raphael_tutorial_v42', 'true');
    setIsOpen(false);
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-md bg-[#14161A] border border-[#1F2228] rounded-3xl overflow-hidden shadow-2xl relative"
          >
            {/* Header Decorations */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-amber-500" />
            
            <button 
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 transition-colors text-[#636A78]"
            >
              <X size={20} />
            </button>

            <div className="p-8 pt-12 text-center">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col items-center"
              >
                <div className={cn(
                  "w-20 h-20 rounded-2xl flex items-center justify-center mb-6 border shadow-lg transition-all duration-500",
                  currentStep === 0 && "bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/10",
                  currentStep === 1 && "bg-indigo-500/10 border-indigo-500/20 shadow-indigo-500/10",
                  currentStep === 2 && "bg-amber-500/10 border-amber-500/20 shadow-amber-500/10"
                )}>
                  {STEPS[currentStep].icon}
                </div>

                <h3 className="text-2xl font-black text-white mb-4 italic tracking-tight uppercase">
                  {STEPS[currentStep].title}
                </h3>
                
                <p className="text-[#636A78] leading-relaxed text-sm mb-8 font-medium">
                  {STEPS[currentStep].description}
                </p>
              </motion.div>

              {/* Progress Dots */}
              <div className="flex justify-center gap-2 mb-10">
                {STEPS.map((_, i) => (
                  <div 
                    key={i}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-all duration-300",
                      i === currentStep ? "w-6 bg-emerald-500" : "bg-[#1F2228]"
                    )}
                  />
                ))}
              </div>

              {/* Controls */}
              <div className="flex gap-3">
                {currentStep > 0 && (
                  <button
                    onClick={prevStep}
                    className="flex-1 px-4 py-4 rounded-2xl bg-[#0A0B0E] border border-[#1F2228] text-white font-bold text-xs uppercase flex items-center justify-center gap-2 hover:border-white/20 transition-all"
                  >
                    <ChevronLeft size={16} />
                    ถอยหลัง
                  </button>
                )}
                
                <button
                  onClick={nextStep}
                  className="flex-[2] px-4 py-4 rounded-2xl bg-emerald-500 text-[#0A0B0E] font-bold text-xs uppercase flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                >
                  {currentStep === STEPS.length - 1 ? 'เริ่มต้นการใช้งาน' : 'เข้าใจแล้ว ไปต่อ'}
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
