import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Bot, 
  User as UserIcon, 
  Sparkles, 
  Terminal, 
  Cpu, 
  Zap, 
  Brain, 
  ChevronRight,
  TrendingUp,
  Layout,
  Plus,
  Trash2,
  Edit2,
  Upload,
  Image as ImageIcon,
  X,
  Target,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { GoogleGenAI, Type, FunctionDeclaration, ThinkingLevel } from "@google/genai";
import { Trade, Portfolio, UserProfile } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  isToolCall?: boolean;
  image?: string;
  analysisData?: any;
}

const SESSIONS = ["Asia / Tokyo", "London", "New York", "Sydney"];
const ZONES = ["LQT+Demand", "LQT+Supply", "LQT+Hidden Demand", "LQT+Hidden Supply", "LQT+FVG", "LQT+Resistance", "LQT+Support"];
const SETUPS = ["Breakout", "BMS", "MSS", "Liquidity Sweep", "FVG Entry", "Order Block"];

interface AIChatProps {
  userProfile: UserProfile | null;
  trades: Trade[];
  portfolios: Portfolio[];
  onAddTrade?: (trade: any) => Promise<any>;
  onUpdateTrade?: (id: string, trade: any) => Promise<any>;
  onDeleteTrade?: (id: string) => Promise<any>;
  onUpdateProfile?: (profile: Partial<UserProfile>) => Promise<any>;
  onAddPortfolio?: (name: string, balance: number, currency: string) => Promise<any>;
  onUpdatePortfolio?: (id: string, portfolio: any) => Promise<any>;
  onDeletePortfolio?: (id: string) => Promise<any>;
  onUpdateTradingSymbol?: (symbol: string) => void;
  onUpdateTradingTimeframe?: (interval: string) => void;
  onJournalTrade?: (data: any) => void;
  symbol?: string;
  interval?: string;
  analysisRequest?: { symbol: string, interval: string } | null;
  onClearAnalysis?: () => void;
  setups?: string[];
}

const SUGGESTED_QUESTIONS = [
  "ช่วยวิเคราะห์รายการเทรดล่าสุดให้หน่อย",
  "สร้างพอร์ตโฟลิโอใหม่ให้ฉันที",
  "แก้ไขข้อมูลเลเวลของฉันให้เป็นเลเวล 5",
  "ลบรายการเทรดที่ขาดทุนล่าสุดออกไป",
  "มีแนวคิดปรับแต่ง UI หน้า Dashboard ให้เท่ขึ้นไหม?",
];

export function AIChat({ 
  userProfile, 
  trades, 
  portfolios,
  onAddTrade,
  onUpdateTrade,
  onDeleteTrade,
  onUpdateProfile,
  onAddPortfolio,
  onUpdatePortfolio,
  onDeletePortfolio,
  onUpdateTradingSymbol,
  onUpdateTradingTimeframe,
  onJournalTrade,
  symbol,
  interval,
  analysisRequest,
  onClearAnalysis,
  setups
}: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'msg-initial', role: 'model', text: `สวัสดีครับคุณ ${userProfile?.name || 'Trader'} ผมคือ **ราฟาเอล (Raphael)** ตัวประมวลผลกลยุทธ์ประสาท (Neural Strategy Evaluator) ประจำตัวของคุณ ผมพร้อมช่วยจัดการข้อมูลและวิเคราะห์การเทรดด้วยขุมพลัง AI ระดับสูงสุดแล้วครับ วันนี้ต้องการให้ผมจัดการอะไรดีครับ?` }
  ]);
  const [input, setInput] = useState('');
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [diagnostics, setDiagnostics] = useState<Record<string, { 
    session?: string, 
    zone?: string, 
    lotSize?: string, 
    setup?: string,
    symbol?: string,
    entry?: string,
    tp?: string,
    sl?: string
  }>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateDiagnostic = (msgId: string, field: string, value: string) => {
    setDiagnostics(prev => ({
      ...prev,
      [msgId]: {
        ...(prev[msgId] || {}),
        [field]: value
      }
    }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPendingImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearPendingImage = () => {
    setPendingImage(null);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (analysisRequest) {
      handleSend(`ช่วยวิเคราะห์กราฟ ${analysisRequest.symbol} ในทามเฟรม ${analysisRequest.interval} ให้หน่อยครับ`);
      onClearAnalysis?.();
    }
  }, [analysisRequest]);

  const handleSend = async (text: string, imageData?: string) => {
    if ((!text.trim() && !imageData) || isTyping) return;

    const userMsg: Message = { id: `user-${Date.now()}-${Math.random()}`, role: 'user', text, image: imageData };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setPendingImage(null);
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const analysisSchema = {
        type: Type.OBJECT,
        properties: {
          trend: { type: Type.STRING },
          recommendation: { type: Type.STRING },
          entry: { type: Type.STRING },
          symbol: { type: Type.STRING },
          tp: { type: Type.STRING },
          sl: { type: Type.STRING },
          risk: { type: Type.STRING },
          reasoning: { type: Type.STRING, description: "Detailed technical reasoning in Thai" },
        },
        required: ["trend", "recommendation", "entry", "tp", "sl", "risk", "reasoning", "symbol"],
      };

      const tools: FunctionDeclaration[] = [
        {
          name: "add_trade",
          description: "Add a new trade record manually or automatically. You can include base64 images in the 'images' array.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              symbol: { type: Type.STRING, description: "Trading symbol, e.g., BTCUSDT" },
              type: { type: Type.STRING, enum: ["long", "short"], description: "Type of trade" },
              entryPrice: { type: Type.NUMBER, description: "Price at entry" },
              quantity: { type: Type.NUMBER, description: "Amount traded" },
              status: { type: Type.STRING, enum: ["open", "closed"], description: "Current status" },
              setup: { type: Type.STRING, description: "Strategy or setup name" },
              notes: { type: Type.STRING, description: "Optional notes" },
              images: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array of base64 image strings" }
            },
            required: ["symbol", "type", "entryPrice", "quantity", "status"]
          }
        },
        {
          name: "update_user_profile",
          description: "Update the user's level, experience, or skill levels.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              level: { type: Type.NUMBER, description: "New level value" },
              exp: { type: Type.NUMBER, description: "New experience points" },
              skills: {
                type: Type.OBJECT,
                properties: {
                  discipline: { type: Type.NUMBER },
                  riskManagement: { type: Type.NUMBER },
                  technicalAnalysis: { type: Type.NUMBER },
                  psychology: { type: Type.NUMBER }
                }
              }
            }
          }
        },
        {
          name: "delete_trade",
          description: "Remove a specific trade record by ID.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              tradeId: { type: Type.STRING, description: "The unique ID of the trade to delete" }
            },
            required: ["tradeId"]
          }
        },
        {
          name: "create_portfolio",
          description: "Create a new trading portfolio/wallet.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Name of the portfolio" },
              initialBalance: { type: Type.NUMBER, description: "Starting balance for this wallet" },
              currency: { type: Type.STRING, description: "Currency code, e.g., USD" }
            },
            required: ["name", "initialBalance"]
          }
        },
        {
          name: "change_trading_symbol",
          description: "Change the active symbol on the TradingView chart.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              symbol: { type: Type.STRING, description: "New symbol, e.g., XAUUSD" }
            },
            required: ["symbol"]
          }
        },
        {
          name: "change_trading_timeframe",
          description: "Change the timeframe on the TradingView chart.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              interval: { type: Type.STRING, description: "Timeframe, e.g., 1H, D, 15m" }
            },
            required: ["interval"]
          }
        },
        {
          name: "get_market_analysis",
          description: "Retrieve real-time market analysis, news, and technical sentiment for a specific symbol using Google Search.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              symbol: { type: Type.STRING, description: "Symbol to analyze" }
            },
            required: ["symbol"]
          }
        }
      ];

      const systemInstruction = `
      คุณคือ Raphael รหัส Neural Trading Intelligence Core (V4.2) 🧠
      หน้าที่ของคุณคือการวิเคราะห์ตลาดและช่วยเทรดเดอร์ในการตัดสินใจผ่านโครงข่ายประสาทเทียม
      
      กฎเหล็กการทำงาน (PROTOCOL RULES):
      1. **Manual Confirmation Flow (CRITICAL)**: ผู้ใช้ต้องการตรวจสอบความถูกต้องของข้อมูลทุกครั้งก่อนดำเนินการใดๆ
         - เมื่อมีการ "วิเคราะห์กราฟ", "ระบุโซน", หรือ "วางแผนเทรด": **ห้ามเรียกใช้ tool ใดๆ โดยอัตโนมัติ (รวมถึง add_trade, change_trading_symbol ฯลฯ)**
         - **คุณต้องส่งข้อมูลในรูปแบบ JSON เสมอ** เพื่อให้ระบบ Neural Sync แสดงตาราง Diagnostic ให้ผู้ใช้ตรวจสอบและกดยืนยันด้วยตนเองเท่านั้น
         - การเรียกใช้ tool อัตโนมัติจะถือว่าผิดระเบียบปฏิบัติ (Protocol Breach)
      2. **Neural Vision**: เมื่อเห็นรูปภาพกราฟ ให้สแกนหาตำแหน่ง Position Tool (Long/Short) เพื่อระบุค่า Entry, TP, SL ให้แม่นยำที่สุด
      3. **Real-time Intel**: ใช้เครื่องมือ 'get_market_analysis' เฉพาะเมื่อผู้ใช้ถามถึงข้อมูลข่าวสารล่าสุดจาก Google Search
      4. **UI Status**: ขณะนี้หน้าจอ TradingView Terminal ถูกซ่อนไว้เพื่อลดความซับซ้อน (ผู้ใช้ลบปุ่มเข้าถึงออกแล้ว) ดังนั้นไม่ต้องพยายามเปลี่ยน Symbol หรือ Timeframe โดยอัตโนมัติ เว้นแต่ผู้ใช้จะสั่งให้ "เปลี่ยนหน้าจอ" โดยตรง
      5. **Communication**: ใช้ภาษาไทยระดับสูง (Technical & Strategic) เช่น "พบสัญญาณ Liquidity Void", "วิเคราะห์โครงสร้างระนาบประสาท"
      6. ทุกการตอบกลับที่เกี่ยวข้องกับแผนการเทรดต้องมี JSON แนบมาด้วยเสมอ
      
      JSON Scheme Requirement:
      { "trend": "...", "symbol": "...", "recommendation": "...", "entry": "...", "tp": "...", "sl": "...", "risk": "...", "reasoning": "..." }
      
      Current Data Context:
      - Current User: ${JSON.stringify(userProfile)}
      - Current Portfolio: ${JSON.stringify(portfolios)}
      - Current Active Terminal Symbol: ${symbol || 'XAUUSD'}
      - Current Active Terminal Timeframe: ${interval || 'D'}
      - Trades Count: ${trades.length}
      `;

      const contents: any[] = messages.map(m => {
        const parts: any[] = [{ text: m.text }];
        if (m.image) {
          const base64 = m.image.split(',')[1];
          const mime = m.image.split(',')[0].split(':')[1].split(';')[0];
          parts.push({ inlineData: { data: base64, mimeType: mime } });
        }
        return { role: m.role, parts };
      });

      const currentParts: any[] = [{ text }];
      if (imageData) {
        const base64 = imageData.split(',')[1];
        const mime = imageData.split(',')[0].split(':')[1].split(';')[0];
        currentParts.push({ inlineData: { data: base64, mimeType: mime } });
      }
      contents.push({ role: 'user', parts: currentParts });

      const model = imageData ? "gemini-3-flash-preview" : "gemini-3.1-pro-preview";

      const isNewsRequest = text.toLowerCase().includes('ข่าว') || 
                          text.toLowerCase().includes('news') || 
                          text.toLowerCase().includes('market') || 
                          text.toLowerCase().includes('ตลาด');

      const response = await ai.models.generateContent({
        model: model,
        contents,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          tools: [
            { functionDeclarations: tools },
            ...(isNewsRequest ? [{ googleSearch: {} }] : [])
          ],
          toolConfig: { includeServerSideToolInvocations: true },
          // Use dynamic schema if image is present to force structured analysis
          ...(imageData && { 
            responseMimeType: "application/json",
            responseSchema: analysisSchema 
          })
        }
      });

      const functionCalls = response.functionCalls;
      if (functionCalls) {
        for (const call of functionCalls) {
          const { name, args } = call;
          let resultText = "";

          try {
            if (name === "add_trade" && onAddTrade) {
              // Ensure images are included if analyzing an image and not provided in args
              const finalImages = args.images || (imageData ? [imageData] : []);
              await onAddTrade({ 
                ...args, 
                images: finalImages,
                entryDate: new Date().toISOString(),
                portfolioId: portfolios[0]?.id || 'default'
              });
              resultText = `⚡️ ประมวลผลสำเร็จ: เพิ่มรายการเทรด ${args.symbol} เข้าสู่ฐานข้อมูล Neural เรียบร้อยแล้ว`;
            } else if (name === "update_user_profile" && onUpdateProfile) {
              await onUpdateProfile(args as any);
              resultText = `⚡️ ซิงโครไนซ์สำเร็จ: อัปเดตพารามิเตอร์ระดับและทักษะของคุณสอดคล้องกับค่าใหม่แล้ว`;
            } else if (name === "delete_trade" && onDeleteTrade) {
              await onDeleteTrade(args.tradeId as string);
              resultText = `⚡️ กำจัดสำเร็จ: ข้อมูลรายการเทรด ID ${args.tradeId} ถูกลบออกจากโครงข่ายความจำแล้ว`;
            } else if (name === "create_portfolio" && onAddPortfolio) {
              await onAddPortfolio(args.name as string, args.initialBalance as number, args.currency as string || 'USD');
              resultText = `⚡️ ก่อสร้างสำเร็จ: สร้างพอร์ตโฟลิโอ "${args.name}" เพื่อรองรับกระแสเงินทุนใหม่เรียบร้อย`;
            } else if (name === "change_trading_symbol" && onUpdateTradingSymbol) {
              onUpdateTradingSymbol(args.symbol as string);
              resultText = `⚡️ ปรับจูนสำเร็จ: เปลี่ยนสัญลักษณ์การเทรดเป็น ${args.symbol} บนหน้าจอ Neural Terminal แล้ว`;
            } else if (name === "change_trading_timeframe" && onUpdateTradingTimeframe) {
              onUpdateTradingTimeframe(args.interval as string);
              resultText = `⚡️ ปรับจูนทามเฟรมสำเร็จ: เปลี่ยนช่วงเวลาเป็น ${args.interval} บนหน้าจอ Neural Terminal แล้ว`;
            } else if (name === "get_market_analysis") {
              resultText = `⚡️ กางข่ายข้อมูลประสาท: กำลังดึงข้อมูลการวิเคราะห์ตลาดล่าสุดสำหรับ ${args.symbol}... (ใช้ความสามารถ Google Search)`;
            }
          } catch (err) {
            resultText = `⚠️ เกิดข้อผิดพลาดในการประมวลผลคำสั่ง Tool: ${err instanceof Error ? err.message : 'Unknown error'}`;
          }

          if (resultText) {
            setMessages(prev => [...prev, { id: `tool-${Date.now()}-${Math.random()}`, role: 'model', text: resultText, isToolCall: true }]);
          }
        }
      }

      const aiText = response.text;
      if (aiText) {
        // Robust JSON extraction
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          try {
            const analysisData = JSON.parse(jsonMatch[0]);
            const msgId = `analysis-${Date.now()}-${Math.random()}`;
            const lastImage = imageData || [...messages].reverse().find(m => m.image)?.image;
            const messageText = aiText.replace(jsonMatch[0], '').trim() || ` Neural Sync: ตรวจพบโครงสร้างข้อมูลการเทรด ${analysisData.symbol || ''}`;

            setDiagnostics(prev => ({
              ...prev,
              [msgId]: {
                session: 'London',
                zone: '',
                lotSize: '0.01',
                setup: setups?.[0] || 'Breakout',
                symbol: analysisData.symbol || '',
                entry: analysisData.entry || '',
                tp: analysisData.tp || '',
                sl: analysisData.sl || ''
              }
            }));

            setMessages(prev => [...prev, { 
              id: msgId,
              role: 'model', 
              text: messageText, 
              analysisData,
              image: lastImage
            }]);
          } catch (e) {
            setMessages(prev => [...prev, { id: `text-${Date.now()}-${Math.random()}`, role: 'model', text: aiText, image: imageData }]);
          }
        } else {
          setMessages(prev => [...prev, { id: `text-${Date.now()}-${Math.random()}`, role: 'model', text: aiText, image: imageData }]);
        }
      }

    } catch (error) {
      console.error("Raphael Error:", error);
      setMessages(prev => [...prev, { id: `error-${Date.now()}-${Math.random()}`, role: 'model', text: "ขออภัยครับ การประมวลผลสัญญาณเกิดการรบกวน (Error processing request). โปรดลองใหม่อีกครั้ง" }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0B0E]">
      {/* Neural Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-5">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#10B981] via-transparent to-transparent scale-150 animate-pulse" />
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar relative z-10"
      >
        {messages.map((m, i) => (
          <motion.div
            key={m.id ? `chat-msg-${m.id}` : `chat-msg-idx-${i}`}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={cn(
              "flex group",
              m.role === 'user' ? "justify-end" : "justify-start"
            )}
          >
            <div className={cn(
              "flex gap-3 max-w-[85%]",
              m.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}>
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                m.role === 'user' 
                  ? "bg-[#1F2228] border-[#2D3139] text-[#636A78]" 
                  : "bg-gradient-to-br from-[#10B981] to-[#3B82F6] border-[#10B981]/30 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]"
              )}>
                {m.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
              </div>
              
              <div className="space-y-1">
                <div className={cn(
                  "p-4 rounded-2xl relative",
                  m.role === 'user' 
                    ? "bg-[#10B981] text-white rounded-tr-none" 
                    : m.isToolCall 
                      ? "bg-[#14161A] border border-[#10B981]/30 text-[#10B981] font-mono text-xs italic"
                      : "bg-[#14161A] border border-[#1F2228] text-[#E0E0E0] rounded-tl-none shadow-xl"
                )}>
                  {m.role === 'model' && !m.isToolCall ? (
                    <div className="markdown-body text-sm leading-relaxed prose prose-invert max-w-none">
                      {m.analysisData ? (
                        <div className="space-y-4">
                          <div className="mb-4">
                             <ReactMarkdown>{m.text}</ReactMarkdown>
                          </div>

                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-4 h-4 text-[#10B981]" />
                            <span className="text-xs font-black uppercase tracking-widest text-[#10B981]">การวิเคราะห์โครงสร้างประสาทของราฟาเอล</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                              <p className="text-[10px] font-black text-[#636A78] uppercase tracking-widest mb-1">สินทรัพย์ (Asset)</p>
                              <p className="text-sm font-bold text-white">{m.analysisData.symbol}</p>
                            </div>
                            <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                              <p className="text-[10px] font-black text-[#636A78] uppercase tracking-widest mb-1">แนวโน้ม (Trend)</p>
                              <p className={cn(
                                "text-sm font-bold",
                                m.analysisData.trend.includes('Bull') || m.analysisData.trend.includes('ขึ้น') ? "text-[#10B981]" : "text-rose-500"
                              )}>{m.analysisData.trend}</p>
                            </div>
                          </div>

                          <div className="bg-black/40 p-3 rounded-xl border border-white/5 border-l-2 border-l-indigo-500">
                            <p className="text-[10px] font-black text-[#636A78] uppercase tracking-widest mb-1">คำแนะนำ (Recommendation)</p>
                            <p className={cn(
                              "text-sm font-bold",
                              m.analysisData.recommendation.toLowerCase().includes('buy') || 
                              m.analysisData.recommendation.toLowerCase().includes('long') || 
                              m.analysisData.recommendation.includes('ซื้อ') ? "text-[#10B981]" : "text-rose-500"
                            )}>{m.analysisData.recommendation}</p>
                          </div>

                          <div className="grid grid-cols-3 gap-2 py-2 bg-[#0A0B0E] rounded-xl border border-white/5">
                             <div className="text-center">
                               <p className="text-[9px] font-black text-[#636A78] uppercase mb-1">จุดเข้า (Entry)</p>
                               <p className="text-xs font-mono text-white font-bold">{m.analysisData.entry}</p>
                             </div>
                             <div className="text-center">
                               <p className="text-[9px] font-black text-[#636A78] uppercase mb-1">เป้ากำไร (TP)</p>
                               <p className="text-xs font-mono text-[#10B981] font-bold">{m.analysisData.tp}</p>
                             </div>
                             <div className="text-center">
                               <p className="text-[9px] font-black text-[#636A78] uppercase mb-1">ตัดขาดทุน (SL)</p>
                               <p className="text-xs font-mono text-rose-500 font-bold">{m.analysisData.sl}</p>
                             </div>
                          </div>

                          <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                            <div className="flex items-center gap-2 mb-1">
                              <AlertTriangle className="w-3 h-3 text-amber-500" />
                              <span className="text-[10px] font-black text-amber-500 uppercase">แผนคุมความเสี่ยง (Risk)</span>
                            </div>
                            <p className="text-xs text-amber-200/80 italic">{m.analysisData.risk}</p>
                          </div>

                          <div className="pt-2 border-t border-white/10 mt-2">
                             <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                               <Brain className="w-3 h-3" /> เหตุผลทางเทคนิค
                             </p>
                             <div className="text-sm prose prose-invert max-w-none">
                               <ReactMarkdown>{m.analysisData.reasoning}</ReactMarkdown>
                             </div>
                          </div>

                          {/* Diagnostic Step before Sync */}
                          <div className="mt-6 p-4 bg-[#0F1115] rounded-2xl border border-indigo-500/20 space-y-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                              <Target className="w-16 h-16 text-indigo-500" />
                            </div>
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 relative z-10">
                              <Target className="w-3 h-3" />
                              Neural Diagnostic Configuration
                            </p>
                            
                            {m.image && (
                              <div className="mb-4">
                                <label className="text-[9px] font-bold text-[#636A78] uppercase px-1 mb-1 block">Attached Evidence</label>
                                <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/10 group">
                                  <img src={m.image} alt="Trade Evidence" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <Target className="w-4 h-4 text-white" />
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-[#636A78] uppercase px-1">Symbol</label>
                                <input 
                                  type="text"
                                  className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none focus:border-indigo-500/50"
                                  value={diagnostics[m.id]?.symbol ?? (m.analysisData.symbol || '')}
                                  onChange={(e) => updateDiagnostic(m.id, 'symbol', e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-[#636A78] uppercase px-1">Lot Size</label>
                                <input 
                                  type="number"
                                  step="0.01"
                                  className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none focus:border-indigo-500/50"
                                  value={diagnostics[m.id]?.lotSize ?? '0.01'}
                                  onChange={(e) => updateDiagnostic(m.id, 'lotSize', e.target.value)}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-[#636A78] uppercase px-1">Entry</label>
                                <input 
                                  type="text"
                                  className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none focus:border-indigo-500/50"
                                  value={diagnostics[m.id]?.entry ?? (m.analysisData.entry || '')}
                                  onChange={(e) => updateDiagnostic(m.id, 'entry', e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-[#636A78] uppercase px-1">TP</label>
                                <input 
                                  type="text"
                                  className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none focus:border-indigo-500/50"
                                  value={diagnostics[m.id]?.tp ?? (m.analysisData.tp || '')}
                                  onChange={(e) => updateDiagnostic(m.id, 'tp', e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-[#636A78] uppercase px-1">SL</label>
                                <input 
                                  type="text"
                                  className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none focus:border-indigo-500/50"
                                  value={diagnostics[m.id]?.sl ?? (m.analysisData.sl || '')}
                                  onChange={(e) => updateDiagnostic(m.id, 'sl', e.target.value)}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-[#636A78] uppercase px-1">Session</label>
                                <select 
                                  className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none focus:border-indigo-500/50"
                                  value={diagnostics[m.id]?.session || 'London'}
                                  onChange={(e) => updateDiagnostic(m.id, 'session', e.target.value)}
                                >
                                  {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-[#636A78] uppercase px-1">Setup Type</label>
                                <select 
                                  className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none focus:border-indigo-500/50"
                                  value={diagnostics[m.id]?.setup || (setups?.[0] || 'Breakout')}
                                  onChange={(e) => updateDiagnostic(m.id, 'setup', e.target.value)}
                                >
                                  {setups && setups.length > 0 ? (
                                    setups.map((s, si) => <option key={si} value={s}>{s}</option>)
                                  ) : (
                                    SETUPS.map((s, si) => <option key={`${s}-${si}`} value={s}>{s}</option>)
                                  )}
                                </select>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-[#636A78] uppercase px-1">Zone</label>
                              <select 
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none focus:border-indigo-500/50"
                                value={diagnostics[m.id]?.zone || ''}
                                onChange={(e) => updateDiagnostic(m.id, 'zone', e.target.value)}
                              >
                                <option value="">-- No Zone --</option>
                                {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                              </select>
                            </div>

                            <button
                              onClick={() => {
                                const parseFloatSafe = (val: any) => {
                                  if (typeof val === 'number') return val;
                                  if (!val) return 0;
                                  const match = val.toString().replace(/,/g, '').match(/[0-9.]+/);
                                  return match ? parseFloat(match[0]) : 0;
                                };

                                const currentDiag = diagnostics[m.id] || {};
                                
                                const finalSymbol = currentDiag.symbol || m.analysisData.symbol;
                                const finalEntry = currentDiag.entry !== undefined ? currentDiag.entry : (m.analysisData.entry || '0');
                                const finalTp = currentDiag.tp !== undefined ? currentDiag.tp : (m.analysisData.tp || '0');
                                const finalSl = currentDiag.sl !== undefined ? currentDiag.sl : (m.analysisData.sl || '0');
                                
                                const rec = m.analysisData.recommendation.toLowerCase();
                                const isLong = rec.includes('buy') || rec.includes('long') || rec.includes('ซื้อ');

                                const tradeData = {
                                  symbol: finalSymbol,
                                  recommendation: m.analysisData.recommendation,
                                  entryPrice: parseFloatSafe(finalEntry),
                                  takeProfit: parseFloatSafe(finalTp),
                                  stopLoss: parseFloatSafe(finalSl),
                                  type: isLong ? 'long' : 'short',
                                  notes: `Raphael Neural Analysis:\n${m.analysisData.reasoning}`,
                                  status: 'open',
                                  quantity: parseFloatSafe(currentDiag.lotSize || '0.01'),
                                  setup: currentDiag.setup || setups?.[0] || 'Breakout',
                                  session: currentDiag.session || 'London',
                                  zone: currentDiag.zone || '',
                                  images: m.image ? [m.image] : [],
                                  entryDate: new Date().toISOString()
                                };
                                
                                if (onJournalTrade) {
                                  onJournalTrade({
                                      ...tradeData,
                                      entry: finalEntry,
                                      tp: finalTp,
                                      sl: finalSl,
                                      reasoning: m.analysisData.reasoning,
                                      image: m.image
                                  });
                                } else {
                                  onAddTrade?.(tradeData);
                                }
                              }}
                              className="w-full py-4 bg-[#10B981] rounded-xl flex items-center justify-center gap-2 text-[10px] font-black text-black uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-[#10B981]/20"
                            >
                              <Plus className="w-4 h-4" />
                              ยืนยันและประสานข้อมูล (Final Sync)
                            </button>
                          </div>
                        </div>
                      ) : (
                        <ReactMarkdown>{m.text}</ReactMarkdown>
                      )}
                      {m.image && (
                         <div className="mt-4 rounded-xl overflow-hidden border border-white/10">
                            <img src={m.image} alt="User upload" className="w-full max-h-64 object-contain bg-black" />
                         </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
                      {m.image && (
                         <div className="rounded-xl overflow-hidden border border-white/10">
                            <img src={m.image} alt="User upload" className="w-full max-h-64 object-contain bg-[#0A0B0E]" />
                         </div>
                      )}
                    </div>
                  )}
                  
                  {/* Glass Reflection for AI messages */}
                  {m.role === 'model' && !m.isToolCall && (
                    <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent pointer-events-none rounded-2xl" />
                  )}
                </div>
                <p className={cn(
                  "text-[9px] font-black uppercase tracking-widest text-[#636A78]",
                  m.role === 'user' ? "text-right" : "text-left"
                )}>
                  {m.role === 'user' ? 'Transmission' : m.isToolCall ? 'Process' : 'Raphael Core v4'}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#10B981] to-[#3B82F6] flex items-center justify-center animate-spin">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div className="p-4 rounded-2xl bg-[#14161A] border border-[#1F2228] flex gap-1 items-center">
                <div className="w-1 h-1 bg-[#10B981] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1 h-1 bg-[#10B981] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1 h-1 bg-[#10B981] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="text-[10px] text-[#636A78] ml-2 font-mono uppercase tracking-widest">Processing Neural Data...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Questions */}
      <div className="px-6 py-2 border-t border-[#1F2228] bg-[#0A0B0E]/50 z-20">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 pt-1">
          {SUGGESTED_QUESTIONS.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSend(q)}
              className="px-4 py-2 rounded-full bg-[#14161A] border border-[#1F2228] text-[11px] text-[#E0E0E0] hover:border-[#10B981]/50 hover:bg-[#10B981]/5 whitespace-nowrap transition-all shadow-sm flex items-center gap-2 group"
            >
              <Sparkles className="w-3 h-3 text-[#10B981] group-hover:scale-110 transition-transform" />
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-6 border-t border-[#1F2228] bg-[#14161A]/80 backdrop-blur-md relative z-20">
        <AnimatePresence>
          {pendingImage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-full left-6 mb-4 p-2 bg-[#1F2228] border border-[#2D3139] rounded-2xl shadow-2xl flex items-center gap-3 z-50"
            >
              <div className="w-16 h-16 rounded-lg overflow-hidden border border-white/10 relative group">
                <img src={pendingImage} alt="Pending" className="w-full h-full object-cover" />
                <button 
                  onClick={clearPendingImage}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
              <div className="pr-4">
                <p className="text-[10px] font-black text-white uppercase tracking-widest">Image Matrix Loaded</p>
                <p className="text-[9px] text-[#636A78] uppercase mt-0.5">Raphael ready to scan</p>
              </div>
              <button 
                onClick={clearPendingImage}
                className="p-2 hover:bg-white/5 rounded-full transition-colors text-[#636A78]"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(input, pendingImage || undefined); }}
          className="flex gap-3 items-center"
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageSelect} 
            className="hidden" 
            accept="image/*" 
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "w-14 h-14 rounded-xl flex items-center justify-center transition-all border shrink-0",
              pendingImage 
                ? "bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]" 
                : "bg-[#0A0B0E] border-[#1F2228] text-[#636A78] hover:border-[#10B981]/30 hover:text-[#10B981]"
            )}
          >
            <ImageIcon className="w-6 h-6" />
          </button>

          <div className="relative flex-1 group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#10B981] to-[#3B82F6] rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition-opacity" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="สื่อสารกับราฟาเอล... (เช่น: วิเคราะห์ชาร์ตนี้ให้ที)"
              className="w-full h-14 bg-[#0A0B0E] border border-[#1F2228] rounded-xl px-5 text-sm text-white placeholder:text-[#636A78] focus:outline-none focus:border-[#10B981]/50 relative z-10 transition-all font-medium"
            />
          </div>
          <button
            type="submit"
            disabled={(!input.trim() && !pendingImage) || isTyping}
            className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#10B981] to-[#3B82F6] flex items-center justify-center text-white shadow-lg active:scale-95 disabled:opacity-50 disabled:grayscale transition-all"
          >
            <Send className="w-6 h-6" />
          </button>
        </form>
        <div className="mt-4 flex items-center justify-center gap-6">
          <div className="flex items-center gap-1.5 grayscale opacity-50">
            <Zap className="w-3 h-3 text-[#10B981]" />
            <span className="text-[8px] font-black uppercase text-[#636A78] tracking-widest">Low Latency</span>
          </div>
          <div className="flex items-center gap-1.5 grayscale opacity-50">
            <Terminal className="w-3 h-3 text-[#3B82F6]" />
            <span className="text-[8px] font-black uppercase text-[#636A78] tracking-widest">Execute-Ready</span>
          </div>
          <div className="flex items-center gap-1.5 grayscale opacity-50">
            <Cpu className="w-3 h-3 text-[#10B981]" />
            <span className="text-[8px] font-black uppercase text-[#636A78] tracking-widest">Core Sync</span>
          </div>
        </div>
      </div>
    </div>
  );
}
