/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { useGameStore } from './store/gameStore';
import { createInitialBoard, getAIMove, getValidMoves } from './engine/chessLogic';
import { Scene } from './components/game/Scene';
import { MainMenu } from './components/ui/MainMenu';
import { CombatScene } from './components/combat/CombatScene';
import { LightHouseLogo } from './components/ui/LightHouseLogo';
import { UnityExportModal } from './components/ui/UnityExportModal';
import { ModelLoadingOverlay } from './components/ui/ModelLoadingOverlay';
import { 
  Trophy, 
  Swords, 
  User as UserIcon, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Plus, 
  Minus, 
  Cloud, 
  CloudOff, 
  LogIn, 
  LogOut,
  Sparkles,
  Maximize2,
  Minimize2,
  Music,
  Upload,
  Radio,
  ListMusic,
  ChevronDown
} from 'lucide-react';
import { loadSettingsFromDB } from './utils/db';
import { loadGameSettingsFromFirebase } from './utils/firebaseSync';
import { auth, signInWithGoogle, signOutUser } from './utils/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { DEFAULT_TRACKS, getTrackById, AudioTrack } from './utils/audioLibrary';

export default function App() {
  const { 
    board, 
    settings, 
    turn, 
    combatData, 
    selectedPos,
    movePiece,
    updateSettings,
    isSyncing,
    lastSynced,
    syncError,
    saveSettingsToCloud,
    isMaximized,
    setIsMaximized,
    viewMode,
    setViewMode
  } = useGameStore();

  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(auth?.currentUser || null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isUnityExportOpen, setIsUnityExportOpen] = useState(false);
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
  const [audioFeedback, setAudioFeedback] = useState<string | null>(null);

  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Active track determination
  const activeTrack: AudioTrack = settings.customMusicUrl ? {
    id: 'custom_track',
    title: settings.customMusicName || 'Custom Uploaded Track',
    artist: 'User Library Audio',
    genre: 'Custom Battle Music',
    url: settings.customMusicUrl,
    isCustom: true
  } : getTrackById(settings.selectedTrackId);

  // Sync isMusicPlaying with actual audio element events
  useEffect(() => {
    const audio = audioRef.current || (document.getElementById('bg-music') as HTMLAudioElement);
    if (!audio) return;
    const handlePlay = () => setIsMusicPlaying(true);
    const handlePause = () => setIsMusicPlaying(false);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  // Listen to Auth State and load local or cloud settings
  useEffect(() => {
    // 1. First load local settings immediately so app starts instantly
    loadSettingsFromDB().then((saved) => {
      if (saved) {
        updateSettings(saved);
      }
    });

    // 2. Listen to Firebase auth state changes safely
    let unsubscribe = () => {};
    if (auth) {
      try {
        unsubscribe = onAuthStateChanged(auth, async (user) => {
          setCurrentUser(user);
          if (user) {
            try {
              console.log('User signed in:', user.email || user.uid);
              const cloudSaved = await loadGameSettingsFromFirebase();
              if (cloudSaved) {
                updateSettings(cloudSaved);
                console.log('Cloud settings loaded for user.');
              } else {
                // Push current local settings to the cloud for new user
                saveSettingsToCloud();
              }
            } catch (err) {
              console.error('Failed to sync cloud settings on auth change:', err);
            }
          }
        });
      } catch (authErr) {
        console.warn('Firebase auth listener skipped:', authErr);
      }
    }

    return () => unsubscribe();
  }, []);

  // Handle background music volume/mute sync
  useEffect(() => {
    const audio = audioRef.current || (document.getElementById('bg-music') as HTMLAudioElement);
    if (audio) {
      audio.volume = settings.musicMuted ? 0 : settings.musicVolume;
      audio.muted = settings.musicMuted;
      if (settings.musicMuted) {
        audio.pause();
      } else {
        audio.play().catch((err) => {
          console.log('Autoplay or play blocked by browser policy:', err);
        });
      }
    }
  }, [settings.musicVolume, settings.musicMuted, activeTrack.url]);

  // Global Keyboard Shortcuts (F / Esc for Maximize)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleMaximize();
      } else if (e.key === 'Escape' && isMaximized) {
        setIsMaximized(false);
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMaximized]);

  // Initialize Board
  useEffect(() => {
    const initialBoard = createInitialBoard(settings.boardSize);
    useGameStore.setState({ board: initialBoard });
  }, [settings.boardSize]);

  // AI Turn Logic
  useEffect(() => {
    if (turn === 'black' && !combatData) {
      const timer = setTimeout(() => {
        const aiMove = getAIMove(board, settings.boardSize, settings.aiLevel);
        if (aiMove) {
          movePiece(aiMove[0], aiMove[1]);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [turn, board, settings.boardSize, settings.aiLevel, combatData, movePiece]);

  // Update valid moves when selection changes
  useEffect(() => {
    if (selectedPos) {
      const moves = getValidMoves(selectedPos, board, settings.boardSize);
      useGameStore.setState({ validMoves: moves });
    }
  }, [selectedPos, board, settings.boardSize]);

  // Reset board function
  const handleResetBoard = () => {
    const newBoard = createInitialBoard(settings.boardSize);
    useGameStore.setState({ 
      board: newBoard, 
      turn: 'white', 
      selectedPos: null, 
      validMoves: [], 
      combatData: null 
    });
  };

  // Toggle Maximize / Fullscreen
  const toggleMaximize = () => {
    const nextState = !isMaximized;
    setIsMaximized(nextState);

    // Also trigger HTML5 Fullscreen if supported
    if (nextState) {
      try {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch((err) => {
            console.log('Native fullscreen blocked or unavailable, using theater viewport mode:', err);
          });
        }
      } catch (err) {
        console.log(err);
      }
    } else {
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      } catch (err) {
        console.log(err);
      }
    }
  };

  // Track Next / Prev Handlers
  const handleNextTrack = () => {
    const currentIndex = DEFAULT_TRACKS.findIndex(t => t.id === settings.selectedTrackId);
    const nextIndex = (currentIndex + 1) % DEFAULT_TRACKS.length;
    updateSettings({
      selectedTrackId: DEFAULT_TRACKS[nextIndex].id,
      customMusicUrl: '', // Reset custom track when switching to preset
      musicMuted: false
    });
    setAudioFeedback(`Switched to: ${DEFAULT_TRACKS[nextIndex].title}`);
    setTimeout(() => setAudioFeedback(null), 3000);
  };

  const handlePrevTrack = () => {
    const currentIndex = DEFAULT_TRACKS.findIndex(t => t.id === settings.selectedTrackId);
    const prevIndex = (currentIndex - 1 + DEFAULT_TRACKS.length) % DEFAULT_TRACKS.length;
    updateSettings({
      selectedTrackId: DEFAULT_TRACKS[prevIndex].id,
      customMusicUrl: '',
      musicMuted: false
    });
    setAudioFeedback(`Switched to: ${DEFAULT_TRACKS[prevIndex].title}`);
    setTimeout(() => setAudioFeedback(null), 3000);
  };

  // Custom Audio File Upload
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        updateSettings({
          customMusicUrl: dataUrl,
          customMusicName: file.name.replace(/\.[^/.]+$/, ""),
          musicMuted: false
        });
        setAudioFeedback(`Loaded custom track: ${file.name}`);
        setTimeout(() => setAudioFeedback(null), 3500);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={`w-full h-screen bg-sleek-bg text-sleek-text font-sans flex flex-col overflow-hidden select-none relative ${isMaximized ? 'fixed inset-0 z-50' : ''}`}>
      
      {/* Header / Top Bar (Collapsible or Sleek in Maximize Mode) */}
      {!isMaximized && (
        <header className="h-14 border-b border-sleek-border flex items-center justify-between px-6 bg-sleek-surface shrink-0 z-40 transition-all duration-300">
          <LightHouseLogo subtext={settings.gameName.toUpperCase()} size={34} />
          
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-3">
               <div className={`flex items-center gap-2 px-3 py-1 rounded border transition-all ${turn === 'white' ? 'bg-sleek-accent border-sleek-accent text-black font-bold' : 'bg-sleek-card border-sleek-ring text-sleek-muted'}`}>
                  <UserIcon size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-tighter">Player Alliance</span>
               </div>
               <Swords size={12} className="text-sleek-muted opacity-30" />
               <div className={`flex items-center gap-2 px-3 py-1 rounded border transition-all ${turn === 'black' ? 'bg-red-600 border-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] font-bold' : 'bg-sleek-card border-sleek-ring text-sleek-muted'}`}>
                  <Trophy size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-tighter">AI Core</span>
               </div>
            </div>

            <div className="h-4 w-px bg-sleek-border"></div>

            {/* 2D / 3D Mode Toggle */}
            <button
              onClick={() => setViewMode(viewMode === '3d' ? '2d' : '3d')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-mono border cursor-pointer transition-all active:scale-95 font-bold ${
                viewMode === '2d'
                  ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                  : 'bg-sleek-card hover:bg-white/10 text-white border-sleek-ring hover:border-sleek-accent'
              }`}
              title="Toggle between 3D Tactical Board and Instant 2D Board"
            >
              <span>{viewMode === '3d' ? '3D VIEW' : '2D VIEW'}</span>
            </button>

            <div className="h-4 w-px bg-sleek-border"></div>

            {/* Maximize Button in Header */}
            <button
              onClick={toggleMaximize}
              className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-500/20 to-cyan-500/20 hover:from-amber-500/30 hover:to-cyan-500/30 text-amber-300 hover:text-white rounded text-[10px] font-mono border border-amber-500/40 hover:border-cyan-400 cursor-pointer transition-all active:scale-95 shadow-[0_0_10px_rgba(245,158,11,0.15)] font-bold"
              title="Maximize Game Viewport (Hotkeys: F to maximize / Esc to exit)"
            >
              <Maximize2 size={12} className="text-amber-400 animate-pulse" />
              <span>MAXIMIZE GAME</span>
            </button>

            <div className="h-4 w-px bg-sleek-border"></div>

            {/* User Account / Google Sign-in */}
            {currentUser ? (
              <div className="flex items-center gap-3 bg-sleek-card px-3 py-1 rounded border border-sleek-ring">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="Avatar" className="w-5 h-5 rounded-full border border-sleek-accent" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon size={12} className="text-sleek-accent" />
                )}
                <span className="text-[10px] font-mono text-white/80 max-w-[100px] truncate" title={currentUser.email || currentUser.displayName || 'User'}>
                  {currentUser.displayName || currentUser.email?.split('@')[0] || 'Player'}
                </span>
                <button 
                  onClick={() => signOutUser()} 
                  className="text-sleek-muted hover:text-red-400 p-0.5 transition-colors"
                  title="Sign Out"
                >
                  <LogOut size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={async () => {
                  setIsSigningIn(true);
                  try {
                    await signInWithGoogle();
                  } catch (err: any) {
                    console.error(err);
                  } finally {
                    setIsSigningIn(false);
                  }
                }}
                disabled={isSigningIn}
                className="flex items-center gap-1.5 px-3 py-1 bg-sleek-card hover:bg-white/10 rounded text-[10px] font-mono border border-sleek-ring hover:border-sleek-accent text-sleek-accent cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                title="Sign in with Google to sync pieces & settings across devices"
              >
                <LogIn size={12} />
                <span>{isSigningIn ? 'SIGNING IN...' : 'SYNC WITH GOOGLE'}</span>
              </button>
            )}

            <div className="px-3 py-1 bg-sleek-card rounded text-[10px] font-mono border border-sleek-ring text-sleek-accent font-bold">SYSTEM: ACTIVE</div>
          </div>
        </header>
      )}

      {/* Floating HUD when Maximized */}
      {isMaximized && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-black/80 backdrop-blur-md px-4 py-2 rounded-full border border-sleek-accent/40 shadow-[0_0_25px_rgba(0,0,0,0.8)] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-[11px] font-mono font-bold text-white tracking-widest uppercase">
              MAXIMIZED THEATER MODE
            </span>
          </div>

          <div className="h-4 w-px bg-white/20"></div>

          <div className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${turn === 'white' ? 'bg-amber-400 text-black' : 'bg-red-500 text-white'}`}>
            {turn === 'white' ? 'Player Turn' : 'AI Thinking'}
          </div>

          <div className="h-4 w-px bg-white/20"></div>

          <button
            onClick={toggleMaximize}
            className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-amber-400 hover:text-black text-white text-[10px] font-mono font-bold rounded-full transition-all border border-white/20 active:scale-95"
            title="Restore Window View (Press Esc or F)"
          >
            <Minimize2 size={12} />
            <span>EXIT MAXIMIZE (ESC)</span>
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        {/* Navigation Sidebar (Collapsible in Maximize Mode) */}
        {!isMaximized && <MainMenu />}

        {/* Main Viewport */}
        <main className="flex-1 flex flex-col relative overflow-hidden">
            <div className="flex-1 relative bg-black">
                <Scene />

                {/* Overlays inside Viewport */}
                <div className="absolute top-4 left-4 z-10 pointer-events-none">
                    <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md p-2 px-3 rounded border border-white/5">
                        <div className="w-2 h-2 bg-sleek-accent rounded-full animate-pulse shadow-[0_0_8px_#f59e0b]"></div>
                        <span className="text-[10px] font-mono tracking-widest uppercase text-white/60">
                            Active Stream: {turn.toUpperCase()} UNIT MOTION
                        </span>
                    </div>
                </div>

                {/* Viewport Floating Controls */}
                <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                    {/* 2D / 3D Quick Switch */}
                    <button
                      onClick={() => setViewMode(viewMode === '3d' ? '2d' : '3d')}
                      className={`h-8 px-2.5 rounded flex items-center justify-center gap-1.5 border transition-all text-xs font-mono font-bold shadow-lg ${
                        viewMode === '2d'
                          ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                          : 'bg-black/80 text-white border-white/20 hover:border-sleek-accent hover:text-sleek-accent'
                      }`}
                      title={viewMode === '3d' ? "Switch to Instant 2D View" : "Switch to 3D View"}
                    >
                      <span>{viewMode === '3d' ? '2D View' : '3D View'}</span>
                    </button>

                    {/* Dedicated Maximize / Restore Toggle */}
                    <button 
                      onClick={toggleMaximize}
                      className={`h-8 px-2.5 rounded flex items-center justify-center gap-1.5 border transition-all text-xs font-mono font-bold shadow-lg ${
                        isMaximized 
                          ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]' 
                          : 'bg-black/80 text-white border-white/20 hover:border-sleek-accent hover:text-sleek-accent'
                      }`}
                      title={isMaximized ? "Restore Screen (Esc)" : "Maximize Game (F)"}
                    >
                      {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                      <span className="hidden sm:inline">{isMaximized ? 'Restore' : 'Maximize'}</span>
                    </button>

                    <button 
                      onClick={handleResetBoard}
                      className="w-8 h-8 bg-black/80 rounded flex items-center justify-center border border-white/10 hover:border-sleek-accent hover:text-sleek-accent transition-all text-white shadow-lg"
                      title="Reset Board"
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button 
                      onClick={() => updateSettings({ boardSize: Math.min(20, settings.boardSize + 1) })}
                      className="w-8 h-8 bg-black/80 rounded flex items-center justify-center border border-white/10 hover:border-sleek-accent hover:text-sleek-accent transition-all text-white shadow-lg"
                      title="Increase Board Size"
                    >
                      <Plus size={14} />
                    </button>
                    <button 
                      onClick={() => updateSettings({ boardSize: Math.max(8, settings.boardSize - 1) })}
                      className="w-8 h-8 bg-black/80 rounded flex items-center justify-center border border-white/10 hover:border-sleek-accent hover:text-sleek-accent transition-all text-white shadow-lg"
                      title="Decrease Board Size"
                    >
                      <Minus size={14} />
                    </button>
                </div>
            </div>

            {/* Combat Zone (Docked at bottom if active, or hidden) */}
            <CombatScene />
        </main>
      </div>

      {/* Bottom Control Bar & Audio Player */}
      <footer className="h-12 border-t border-sleek-border bg-sleek-surface flex items-center justify-between px-6 shrink-0 z-40 transition-all">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-sleek-muted uppercase font-bold tracking-widest flex items-center gap-1">
              <Radio size={12} className={isMusicPlaying && !settings.musicMuted ? "text-emerald-400 animate-pulse" : "text-slate-500"} />
              <span>Audio Broadcast</span>
            </span>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={handlePrevTrack}
                  className="text-white/60 hover:text-sleek-accent p-1 transition-colors text-xs active:scale-90"
                  title="Previous Track"
                >
                  ⏮
                </button>
                <button 
                  onClick={() => {
                    const audio = audioRef.current || (document.getElementById('bg-music') as HTMLAudioElement);
                    if (audio) {
                      if (audio.paused) {
                        if (settings.musicMuted) {
                          updateSettings({ musicMuted: false });
                        }
                        audio.play().catch(e => console.log(e));
                      } else {
                        audio.pause();
                      }
                    }
                  }}
                  className="w-7 h-7 bg-sleek-ring rounded-full flex items-center justify-center text-sleek-accent border border-sleek-accent/30 cursor-pointer hover:bg-sleek-accent hover:text-black transition-all shadow-md active:scale-90"
                  title={isMusicPlaying && !settings.musicMuted ? "Pause Track" : "Play Track"}
                >
                  {isMusicPlaying && !settings.musicMuted ? <Pause size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
                </button>
                <button 
                  onClick={handleNextTrack}
                  className="text-white/60 hover:text-sleek-accent p-1 transition-colors text-xs active:scale-90"
                  title="Next Track"
                >
                  ⏭
                </button>
              </div>

              <div className="h-4 w-px bg-sleek-border"></div>

              {/* Mute/Volume controls */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => updateSettings({ musicMuted: !settings.musicMuted })}
                  className={`p-1 rounded hover:bg-white/5 transition-colors ${settings.musicMuted ? 'text-red-400' : 'text-sleek-accent'}`}
                  title={settings.musicMuted ? "Unmute Music" : "Mute Music"}
                >
                  {settings.musicMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
                <input 
                  type="range" 
                  min="0" max="1" step="0.05"
                  value={settings.musicMuted ? 0 : settings.musicVolume}
                  onChange={(e) => {
                    const vol = parseFloat(e.target.value);
                    updateSettings({ 
                      musicVolume: vol,
                      musicMuted: vol === 0
                    });
                  }}
                  className="w-16 h-1 bg-sleek-ring accent-sleek-accent rounded-full appearance-none cursor-pointer"
                  title="Music Volume"
                />
              </div>

              <div className="h-4 w-px bg-sleek-border"></div>

              {/* Track Title & Playlist Switcher */}
              <div className="relative flex items-center gap-2">
                <button
                  onClick={() => setIsPlaylistOpen(!isPlaylistOpen)}
                  className="flex flex-col text-left hover:bg-white/5 px-2 py-1 rounded transition-colors group"
                  title="Click to view all game soundtracks or upload your own music"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-sleek-accent leading-none group-hover:text-white transition-colors truncate max-w-[170px]">
                      {activeTrack.title}
                    </span>
                    <ChevronDown size={10} className={`text-sleek-muted transition-transform ${isPlaylistOpen ? 'rotate-180' : ''}`} />
                  </div>
                  <span className="text-[8px] text-sleek-muted uppercase font-mono tracking-tight truncate max-w-[170px]">
                    {activeTrack.genre} • {activeTrack.artist}
                  </span>
                </button>

                {/* Custom Audio Upload Button */}
                <label 
                  className="flex items-center gap-1 px-2 py-1 bg-sleek-card hover:bg-sleek-accent hover:text-black text-sleek-accent text-[9px] font-mono rounded border border-sleek-ring cursor-pointer transition-all active:scale-95"
                  title="Upload any MP3 / WAV audio file to replace in-game music"
                >
                  <Upload size={10} />
                  <span className="hidden sm:inline">Upload Audio</span>
                  <input 
                    type="file" 
                    ref={audioFileInputRef}
                    accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac" 
                    onChange={handleAudioUpload} 
                    className="hidden" 
                  />
                </label>

                {/* Playlist Dropdown Menu */}
                {isPlaylistOpen && (
                  <div className="absolute bottom-12 left-0 w-72 bg-sleek-card border border-sleek-ring rounded-xl p-2 shadow-2xl z-50 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 px-1">
                      <span className="text-[10px] font-bold text-white uppercase font-mono flex items-center gap-1.5">
                        <ListMusic size={12} className="text-sleek-accent" />
                        <span>Soundtrack Library</span>
                      </span>
                      <span className="text-[8px] font-mono text-slate-400">{DEFAULT_TRACKS.length} Tracks</span>
                    </div>

                    <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                      {DEFAULT_TRACKS.map((track) => {
                        const isCurrent = !settings.customMusicUrl && settings.selectedTrackId === track.id;
                        return (
                          <button
                            key={track.id}
                            onClick={() => {
                              updateSettings({
                                selectedTrackId: track.id,
                                customMusicUrl: '',
                                musicMuted: false
                              });
                              setIsPlaylistOpen(false);
                              setAudioFeedback(`Playing: ${track.title}`);
                              setTimeout(() => setAudioFeedback(null), 3000);
                            }}
                            className={`w-full text-left p-2 rounded-lg transition-all flex items-center justify-between ${
                              isCurrent ? 'bg-sleek-accent text-black font-bold' : 'hover:bg-white/10 text-white'
                            }`}
                          >
                            <div className="flex flex-col truncate">
                              <span className="text-[10px] font-bold truncate">{track.title}</span>
                              <span className={`text-[8px] font-mono ${isCurrent ? 'text-black/70' : 'text-slate-400'}`}>
                                {track.genre}
                              </span>
                            </div>
                            {isCurrent && isMusicPlaying && !settings.musicMuted && (
                              <span className="text-[9px] font-mono font-bold animate-pulse">PLAYING</span>
                            )}
                          </button>
                        );
                      })}

                      {/* Custom Uploaded Track in list if present */}
                      {settings.customMusicUrl && (
                        <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-between">
                          <div className="flex flex-col truncate">
                            <span className="text-[10px] font-bold truncate">{settings.customMusicName || 'Custom Uploaded Audio'}</span>
                            <span className="text-[8px] font-mono text-emerald-400">Active Custom File</span>
                          </div>
                          <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 bg-emerald-500 text-black rounded">CUSTOM</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Audio feedback notification pill */}
        {audioFeedback && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-[9px] font-mono animate-in fade-in duration-200">
            <Music size={10} className="animate-spin" />
            <span>{audioFeedback}</span>
          </div>
        )}

        <div className="flex items-center gap-4">
           {/* Cloud Sync Status Indicator */}
           <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 rounded border border-sleek-ring text-[10px] font-mono">
              {currentUser ? (
                isSyncing ? (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-yellow-400 animate-bounce" />
                    <span className="text-yellow-400 font-bold uppercase tracking-wider">Cloud Syncing...</span>
                  </>
                ) : syncError ? (
                  <>
                    <CloudOff className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                    <span className="text-red-400 font-bold uppercase tracking-wider" title={syncError}>Sync Error</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-green-400 uppercase tracking-wider">
                      Cloud Synced {lastSynced ? `(${lastSynced})` : ''}
                    </span>
                  </>
                )
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5 text-sleek-muted" />
                  <span className="text-sleek-muted uppercase tracking-wider">
                    Local Storage (Sign in to Sync)
                  </span>
                </>
              )}
           </div>

           <div className="h-4 w-px bg-sleek-border"></div>

           {/* Unity Export */}
           <button 
             onClick={() => setIsUnityExportOpen(true)}
             className="text-[10px] uppercase font-black text-sleek-accent px-4 py-1.5 border border-sleek-accent/30 rounded hover:bg-sleek-accent hover:text-black transition-all tracking-widest flex items-center gap-1.5"
           >
             <Sparkles size={12} />
             <span>Unity Script Export</span>
           </button>
        </div>
      </footer>

      {/* Unity Script Export Modal */}
      <UnityExportModal 
        isOpen={isUnityExportOpen} 
        onClose={() => setIsUnityExportOpen(false)} 
      />

      {/* Cloudflare R2 Model Download Progress Overlay */}
      <ModelLoadingOverlay />

      {/* Audio Playback Element */}
      <audio 
        ref={audioRef}
        autoPlay 
        loop
        id="bg-music"
        src={activeTrack.url}
        onCanPlay={(e) => e.currentTarget.volume = settings.musicMuted ? 0 : settings.musicVolume}
      />
    </div>
  );
}

// Sub-components used in App headers
const Play = ({ size, fill }: { size: number, fill?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill || "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
);

const Pause = ({ size, fill }: { size: number, fill?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill || "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
);

