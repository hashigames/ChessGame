import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { subscribeToModelLoading, LoadingProgressState } from '../../utils/r2GlbLoader';
import { Sparkles, Shield, Swords, FastForward, CheckCircle2 } from 'lucide-react';

export const ModelLoadingOverlay: React.FC = () => {
  const [loadingState, setLoadingState] = useState<LoadingProgressState>({
    isLoading: false,
    progressPercent: 100,
    loadedCount: 0,
    totalCount: 0,
    currentItem: '',
    errorCount: 0,
    isComplete: true,
  });

  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const unsub = subscribeToModelLoading((state) => {
      setLoadingState(state);
      if (state.isLoading) {
        setDismissed(false);
      }
    });
    return () => unsub();
  }, []);

  const shouldShow = loadingState.isLoading && !loadingState.isComplete && !dismissed;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          key="model-loading-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md select-none pointer-events-auto"
        >
          {/* Central Holographic Container */}
          <div className="max-w-md w-full mx-4 p-6 bg-gradient-to-b from-[#18181b] to-[#09090b] border border-sleek-accent/40 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.25)] flex flex-col items-center text-center space-y-4">
            {/* Spinning Sigil / Icon */}
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 border-2 border-sleek-accent/30 rounded-full animate-spin border-t-sleek-accent" />
              <div className="w-12 h-12 rounded-full bg-sleek-accent/15 flex items-center justify-center text-sleek-accent">
                <Swords size={24} className="animate-pulse" />
              </div>
            </div>

            {/* Title */}
            <div>
              <span className="text-[10px] font-mono tracking-widest text-sleek-accent uppercase font-bold block mb-1">
                Cloudflare R2 Armory
              </span>
              <h2 className="text-xl font-black text-white tracking-wide uppercase">
                Loading 3D Models
              </h2>
            </div>

            {/* Percentage Bar */}
            <div className="w-full space-y-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">
                  {loadingState.loadedCount} of {loadingState.totalCount} Models Downloaded
                </span>
                <span className="text-sleek-accent font-bold text-sm">
                  {loadingState.progressPercent}%
                </span>
              </div>

              {/* Glowing Progress Track */}
              <div className="w-full h-3 bg-black/60 rounded-full border border-sleek-ring overflow-hidden p-0.5">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.8)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(5, loadingState.progressPercent)}%` }}
                  transition={{ ease: 'easeOut', duration: 0.3 }}
                />
              </div>
            </div>

            {/* Current Item Name */}
            <div className="w-full py-1.5 px-3 bg-black/40 border border-white/10 rounded-lg text-left flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400 truncate max-w-[260px]">
                {loadingState.currentItem || 'Downloading mesh geometry...'}
              </span>
              <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold">
                GLTF/GLB
              </span>
            </div>

            {/* Quick Play Bypass Button */}
            <div className="pt-2 w-full flex justify-center">
              <button
                onClick={() => setDismissed(true)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded hover:bg-white/10 transition-colors font-mono"
              >
                <FastForward size={14} className="text-sleek-accent" />
                <span>Play in background (Ready models active)</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
