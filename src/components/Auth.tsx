import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Zap, Target, Shield, Brain, Github, Chrome as Google } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'forgot-password';

export function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else if (mode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
      } else if (mode === 'forgot-password') {
        await sendPasswordResetEmail(auth, email);
        setSuccess('Password reset link sent to your email.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full min-h-[100dvh] max-h-[100dvh] bg-[#0A0B0E] flex items-center justify-center p-3 sm:p-4 selection:bg-[#10B981]/20 selection:text-white overflow-y-auto overscroll-none">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#10B981]/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#3B82F6]/5 blur-[120px] rounded-full animate-pulse" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm relative z-10 my-auto"
      >
        <div className="bg-[#14161A] p-5 sm:p-7 rounded-[24px] border border-[#1F2228] shadow-2xl shadow-black/50">
          <div className="flex flex-col items-center mb-5">
            <div className="w-12 h-12 bg-[#1F2228] rounded-xl flex items-center justify-center mb-3 relative group">
              <div className="absolute inset-0 bg-[#10B981]/20 rounded-xl blur-md group-hover:bg-[#10B981]/30 transition-all" />
              <Zap className="w-6 h-6 text-[#10B981] relative z-10" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white italic tracking-tight uppercase mb-1">
              Trader Hero
            </h1>
            <p className="text-[#636A78] text-[10px] font-bold uppercase tracking-[0.2em]">
              {mode === 'login' ? 'Continue Your Ascension' : mode === 'signup' ? 'Initiate Your Career' : 'Relink Your Consciousness'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-3.5">
            <AnimatePresence mode="wait">
              {mode === 'signup' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5 overflow-hidden"
                >
                  <label className="text-[10px] font-bold text-[#636A78] uppercase tracking-wider px-1">Trader Name</label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#636A78] group-focus-within:text-[#10B981] transition-colors" />
                    <input 
                      type="text"
                      className="w-full bg-[#0A0B0E] border border-[#1F2228] rounded-xl py-2.5 sm:py-3 pl-10 pr-3 text-white text-sm focus:outline-none focus:border-[#10B981] transition-all placeholder:text-[#636A78]/50"
                      placeholder="Enter callsign..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={mode === 'signup'}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#636A78] uppercase tracking-wider px-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#636A78] group-focus-within:text-[#10B981] transition-colors" />
                <input 
                  type="email"
                  className="w-full bg-[#0A0B0E] border border-[#1F2228] rounded-xl py-2.5 sm:py-3 pl-10 pr-3 text-white text-sm focus:outline-none focus:border-[#10B981] transition-all placeholder:text-[#636A78]/50"
                  placeholder="name@terminal.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {mode !== 'forgot-password' && (
              <div className="space-y-1.5">
                <div className="flex justify-between px-1">
                  <label className="text-[10px] font-bold text-[#636A78] uppercase tracking-wider">Access Key</label>
                  {mode === 'login' && (
                    <button 
                      type="button" 
                      onClick={() => setMode('forgot-password')}
                      className="text-[10px] font-bold text-[#10B981] hover:text-[#3B82F6] uppercase tracking-wider transition-colors"
                    >
                      Lost Access?
                    </button>
                  )}
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#636A78] group-focus-within:text-[#10B981] transition-colors" />
                  <input 
                    type="password"
                    className="w-full bg-[#0A0B0E] border border-[#1F2228] rounded-xl py-2.5 sm:py-3 pl-10 pr-3 text-white text-sm focus:outline-none focus:border-[#10B981] transition-all placeholder:text-[#636A78]/50"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <AnimatePresence>
              {error && (
                <motion.p 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-rose-500 text-[10px] font-bold uppercase tracking-wider px-1"
                >
                  ERR: {error}
                </motion.p>
              )}
              {success && (
                <motion.p 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-[#10B981] text-[10px] font-bold uppercase tracking-wider px-1"
                >
                  SYS: {success}
                </motion.p>
              )}
            </AnimatePresence>

            <button 
              disabled={loading}
              className="w-full py-3 sm:py-3.5 bg-[#10B981] text-[#0A0B0E] rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all shadow-md shadow-[#10B981]/20 flex items-center justify-center gap-2 group disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Confirm Access' : mode === 'signup' ? 'Initiate Session' : 'Reset Keys'}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-[#1F2228]">
            <button 
              onClick={handleGoogleSignIn}
              className="w-full py-2.5 sm:py-3 bg-[#1F2228] hover:bg-[#252830] text-white rounded-xl text-xs font-bold tracking-wider transition-all flex items-center justify-center gap-2.5 group px-4 cursor-pointer"
            >
              <Google className="w-4 h-4 text-[#10B981]" />
              Authenticate with Google
            </button>
          </div>

          <div className="mt-4 text-center">
            {mode === 'login' ? (
              <p className="text-xs text-[#636A78] font-medium">
                New trader?{' '}
                <button 
                  onClick={() => setMode('signup')}
                  className="text-[#10B981] hover:underline uppercase tracking-wider font-bold cursor-pointer"
                >
                  Join the Terminal
                </button>
              </p>
            ) : (
              <p className="text-xs text-[#636A78] font-medium">
                Known identity?{' '}
                <button 
                  onClick={() => setMode('login')}
                  className="text-[#10B981] hover:underline uppercase tracking-wider font-bold cursor-pointer"
                >
                  Return to Access
                </button>
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-center gap-6 opacity-20 filter grayscale">
          <Target className="w-4 h-4 text-[#636A78]" />
          <Shield className="w-4 h-4 text-[#636A78]" />
          <Brain className="w-4 h-4 text-[#636A78]" />
        </div>
      </motion.div>
    </div>
  );
}
