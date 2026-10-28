import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore, Side, Piece, PieceType } from '../../store/gameStore';
import { Sword, Shield, Zap, Skull, Heart, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';

export const CombatScene = () => {
    const { combatData, resolveCombat, settings } = useGameStore();
    const [attackerHealth, setAttackerHealth] = useState(100);
    const [defenderHealth, setDefenderHealth] = useState(50);
    const [log, setLog] = useState<string[]>([]);
    const [phase, setPhase] = useState<'intro' | 'fight' | 'victory'>('intro');
    const [winner, setWinner] = useState<Side | null>(null);
    const [fatalityActive, setFatalityActive] = useState(false);
    const [isShaking, setIsShaking] = useState(false);
    const [attackAnim, setAttackAnim] = useState<'none' | 'lunge' | 'special'>('none');

    const fatalities: Record<PieceType, string> = {
        pawn: 'CRUSHED BY NUMBERS',
        rook: 'DEMOLISHED_GRID',
        knight: 'STAMPEDED',
        bishop: 'EXCOMMUNICATED',
        queen: 'CHECKMATED_FOREVER',
        king: 'REGICIDE_COMPLETE'
    };

    const SOUNDS = {
        GLOBAL: {
            INTRO: 'https://assets.mixkit.co/sfx/preview/mixkit-arcade-retro-changing-tab-206.mp3',
            FIGHT: 'https://assets.mixkit.co/sfx/preview/mixkit-electronic-retro-block-hit-2185.mp3',
            HIT: 'https://assets.mixkit.co/sfx/preview/mixkit-cartoon-punch-2156.mp3',
            FATALITY: 'https://assets.mixkit.co/sfx/preview/mixkit-horror-creature-male-grunt-2200.mp3',
            VICTORY: 'https://assets.mixkit.co/sfx/preview/mixkit-stadium-crowd-clapping-and-cheering-459.mp3',
            DEATH: 'https://assets.mixkit.co/sfx/preview/mixkit-body-falling-on-the-ground-with-impact-2158.mp3'
        },
        PIECES: {
            pawn: {
                attack: 'https://assets.mixkit.co/sfx/preview/mixkit-cinematic-sword-fast-hit-2794.mp3',
                special: 'https://assets.mixkit.co/sfx/preview/mixkit-fast-small-sweep-transition-166.mp3',
                hurt: 'https://assets.mixkit.co/sfx/preview/mixkit-wood-hit-free-fall-2495.mp3'
            },
            rook: {
                attack: 'https://assets.mixkit.co/sfx/preview/mixkit-heavy-punch-2155.mp3',
                special: 'https://assets.mixkit.co/sfx/preview/mixkit-falling-slowly-on-concrete-2144.mp3',
                hurt: 'https://assets.mixkit.co/sfx/preview/mixkit-falling-into-debris-2146.mp3'
            },
            knight: {
                attack: 'https://assets.mixkit.co/sfx/preview/mixkit-horse-galloping-fast-on-grass-sound-123.mp3',
                special: 'https://assets.mixkit.co/sfx/preview/mixkit-fighting-man-grunt-2139.mp3',
                hurt: 'https://assets.mixkit.co/sfx/preview/mixkit-horse-neigh-624.mp3'
            },
            bishop: {
                attack: 'https://assets.mixkit.co/sfx/preview/mixkit-magic-marimba-sweep-749.mp3',
                special: 'https://assets.mixkit.co/sfx/preview/mixkit-ethereal-fairy-dust-shimmer-2001.mp3',
                hurt: 'https://assets.mixkit.co/sfx/preview/mixkit-glass-break-with-hammer-2101.mp3'
            },
            queen: {
                attack: 'https://assets.mixkit.co/sfx/preview/mixkit-cinematic-magic-transition-754.mp3',
                special: 'https://assets.mixkit.co/sfx/preview/mixkit-horror-space-ambience-753.mp3',
                hurt: 'https://assets.mixkit.co/sfx/preview/mixkit-scream-of-a-woman-2195.mp3'
            },
            king: {
                attack: 'https://assets.mixkit.co/sfx/preview/mixkit-medieval-show-fanfare-trumpet-615.mp3',
                special: 'https://assets.mixkit.co/sfx/preview/mixkit-epic-slow-explosion-1132.mp3',
                hurt: 'https://assets.mixkit.co/sfx/preview/mixkit-man-moan-of-pain-2191.mp3'
            }
        }
    };

    const playSound = (url: string) => {
        const audio = new Audio(url);
        audio.volume = 0.5;
        audio.play().catch(e => console.warn('SFX Blocked:', e));
    };

    const fatalityAnimations: Record<PieceType, any> = {
        pawn: { 
            scale: [1, 1.2, 0], 
            rotate: [0, 15, -15, 0],
            opacity: [1, 1, 0],
            filter: ['brightness(1)', 'brightness(10)', 'brightness(0)']
        },
        rook: { 
            y: [0, -20, 150], 
            scaleY: [1, 1.2, 0.1],
            skewX: [0, 20, -20, 40],
            opacity: [1, 1, 0],
            filter: ['contrast(1)', 'contrast(5)', 'brightness(0)']
        },
        knight: { 
            x: [0, -100, 300], 
            y: [0, -100, 100],
            rotate: [0, -720], 
            scale: [1, 1.5, 0],
            opacity: [1, 1, 0]
        },
        bishop: { 
            y: [0, -300], 
            scale: [1, 0.5], 
            opacity: [1, 0],
            filter: ['blur(0px)', 'blur(20px)'],
            rotate: [0, 180]
        },
        queen: { 
            scale: [1, 3, 0], 
            rotate: [0, 1080], 
            filter: ['hue-rotate(0deg)', 'hue-rotate(360deg)', 'brightness(10)'],
            opacity: [1, 1, 0]
        },
        king: { 
            y: [0, -50, 50], 
            scaleY: [1, 0.1], 
            scaleX: [1, 2],
            rotate: [0, 10, -10, 0],
            opacity: [1, 1, 0],
            filter: ['sepia(0)', 'sepia(1)', 'brightness(0)']
        }
    };

    useEffect(() => {
        if (!combatData) {
            setPhase('intro');
            setFatalityActive(false);
            setWinner(null);
            setLog([]);
            return;
        }

        // Reset for new fight
        setAttackerHealth(100);
        setDefenderHealth(50);
        setPhase('intro');
        setLog(['COMBAT INITIATED: SYNCING...']);
        setWinner(null);
        setFatalityActive(false);

        playSound(SOUNDS.GLOBAL.INTRO);
        const fightTimer = setTimeout(() => playSound(SOUNDS.GLOBAL.FIGHT), 1500);
        const timer = setTimeout(() => setPhase('fight'), 2000);
        return () => {
            clearTimeout(timer);
            clearTimeout(fightTimer);
        };
    }, [combatData]);

    const handleAction = (type: 'attack' | 'defend' | 'special') => {
        if (!combatData || phase !== 'fight') return;

        let damage = 0;
        let enemyDamage = Math.floor(Math.random() * 15);

        const { attacker, defender } = combatData;

        const specialMoves: Record<PieceType, { name: string, power: number }> = {
            pawn: { name: 'EN PASSANT BLITZ', power: 35 },
            rook: { name: 'CASTEL CRASH', power: 45 },
            knight: { name: 'GALLOP FURY', power: 40 },
            bishop: { name: 'DIVINE JUDGMENT', power: 42 },
            queen: { name: 'SOVEREIGN SOUL_EATER', power: 55 },
            king: { name: 'ROYAL EXECUTION', power: 60 }
        };

        if (type === 'attack') {
            damage = Math.floor(Math.random() * 20) + 10;
            setLog(prev => [`Striking ${defender.type} with ${settings.pieceWeapons[attacker.type]}!`, ...prev]);
            setAttackAnim('lunge');
            playSound(SOUNDS.PIECES[attacker.type].attack);
        } else if (type === 'defend') {
            enemyDamage = Math.floor(enemyDamage / 2);
            setLog(prev => [`Bracing for heavy impact!`, ...prev]);
            setIsShaking(true);
            playSound(SOUNDS.GLOBAL.HIT);
        } else if (type === 'special') {
            const move = specialMoves[attacker.type];
            damage = Math.floor(Math.random() * 20) + move.power;
            setLog(prev => [`SPECIAL MOVE: [${move.name}]`, ...prev]);
            setAttackAnim('special');
            setIsShaking(true);
            playSound(SOUNDS.PIECES[attacker.type].special);
            
            // Flash feedback
            const body = document.querySelector('body');
            if (body) {
                body.style.filter = 'invert(1) contrast(200%)';
                setTimeout(() => body.style.filter = '', 100);
            }
        }

        setTimeout(() => {
            setAttackAnim('none');
            setIsShaking(false);
        }, 500);

        const newDefHealth = Math.max(0, defenderHealth - damage);
        const newAttHealth = Math.max(0, attackerHealth - enemyDamage);

        if (damage > 0) {
            playSound(SOUNDS.GLOBAL.HIT);
            playSound(SOUNDS.PIECES[defender.type].hurt);
        }
        if (enemyDamage > 0) {
            playSound(SOUNDS.GLOBAL.HIT);
            playSound(SOUNDS.PIECES[attacker.type].hurt);
        }

        setDefenderHealth(newDefHealth);
        setAttackerHealth(newAttHealth);

        if (newDefHealth <= 0) {
            setWinner(attacker.side);
            setPhase('victory');
            setFatalityActive(true);
            setLog(prev => [`FATALITY: ${fatalities[defender.type]}`, ...prev]);
            confetti();
            playSound(SOUNDS.GLOBAL.FATALITY);
            playSound(SOUNDS.GLOBAL.DEATH);
            setTimeout(() => playSound(SOUNDS.GLOBAL.VICTORY), 1000);
        } else if (newAttHealth <= 0) {
            setWinner(defender.side);
            setPhase('victory');
            setFatalityActive(true);
            setLog(prev => [`FATALITY: ${fatalities[attacker.type]}`, ...prev]);
            playSound(SOUNDS.GLOBAL.FATALITY);
            playSound(SOUNDS.GLOBAL.DEATH);
        }
    };

    const handleFinish = () => {
        resolveCombat(winner!);
    };

    if (!combatData) return null;
    const { attacker, defender } = combatData;

    return (
        <motion.div 
            animate={isShaking ? { x: [-5, 5, -5, 5, 0], y: [-2, 2, 0] } : {}}
            className="fixed bottom-12 left-0 right-0 h-72 z-40 bg-gradient-to-r from-red-950/40 via-sleek-bg to-blue-950/40 border-t-4 border-sleek-accent font-sans overflow-hidden"
        >
            <AnimatePresence>
                {phase === 'intro' && (
                    <motion.div 
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 2, opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center z-10"
                    >
                        <div className="text-6xl font-black italic text-white tracking-widest drop-shadow-[0_0_20px_rgba(245,158,11,0.5)] uppercase">STREET FIGHT MODE</div>
                    </motion.div>
                )}

                {phase === 'victory' && fatalityActive && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 z-30 pointer-events-none"
                    >
                        {/* Background Flash Effect */}
                        <motion.div 
                            initial={{ opacity: 1 }}
                            animate={{ opacity: 0 }}
                            transition={{ duration: 0.5 }}
                            className="absolute inset-0 bg-white"
                        />
                        
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex flex-col items-center">
                                <motion.div 
                                    initial={{ scale: 5, y: -100, opacity: 0 }}
                                    animate={{ scale: 1, y: 0, opacity: 1 }}
                                    transition={{ type: 'spring', damping: 12 }}
                                    className="relative"
                                >
                                    <motion.div 
                                        animate={{ scale: [1, 1.1, 1], rotate: [-1, 1, -1] }}
                                        transition={{ repeat: Infinity, duration: 0.2 }}
                                        className="text-9xl font-black text-red-600 italic tracking-[0.2em] drop-shadow-[0_0_40px_rgba(255,0,0,1)] uppercase"
                                    >
                                        Fatality
                                    </motion.div>
                                    {/* Shadow text for depth */}
                                    <div className="absolute -bottom-2 -right-2 text-9xl font-black text-red-900/40 italic tracking-[0.2em] uppercase select-none -z-10">
                                        Fatality
                                    </div>
                                </motion.div>
                                <motion.div 
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: 'auto', opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="text-xl font-mono text-white mt-6 bg-red-600 px-8 py-2 skew-x-[-15deg] border-2 border-white shadow-[0_0_20px_rgba(239,68,68,0.5)]"
                                >
                                    {winner === attacker.side ? fatalities[defender.type] : fatalities[attacker.type]}
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                )}

                <div className="w-full h-full flex flex-col p-6 relative">
                    <div className="absolute inset-0 flex items-center justify-between px-24">
                        {/* Character 1: Attacker */}
                        <div className="flex flex-col items-center gap-4">
                            <motion.div 
                                animate={
                                    attackerHealth <= 0 ? fatalityAnimations[attacker.type] :
                                    attackAnim === 'lunge' ? { x: [0, 100, 0], scale: [1, 1.1, 1] } :
                                    attackAnim === 'special' ? { x: [0, 150, 0], rotate: [0, 15, -15, 0], scale: [1, 1.4, 1] } :
                                    { x: [0, 5, 0] }
                                }
                                transition={{ 
                                    duration: attackerHealth <= 0 ? 0.8 : attackAnim !== 'none' ? 0.3 : 2, 
                                    repeat: attackAnim === 'none' && attackerHealth > 0 ? Infinity : 0 
                                }}
                                className="w-32 h-40 bg-zinc-900/80 rounded border-2 border-sleek-accent flex items-center justify-center text-4xl shadow-2xl backdrop-blur-sm"
                            >
                                <div className="text-white opacity-20 absolute top-2 left-2 text-[10px] font-mono">ID: {attacker.type[0].toUpperCase()}_01</div>
                                <span className={attacker.side === 'white' ? 'brightness-200' : 'grayscale'}>{attacker.type === 'knight' ? '🛡️' : '⚔️'}</span>
                            </motion.div>
                            <div className="w-64">
                                <div className="flex justify-between text-[11px] mb-1 font-black uppercase text-sleek-accent tracking-tighter">
                                    <span>{settings.pieceNames[attacker.type]} ({attacker.side})</span>
                                    <span className="font-mono">{Math.ceil(attackerHealth)}%</span>
                                </div>
                                <div className="h-2 w-full bg-zinc-900 border border-sleek-ring rounded-full overflow-hidden">
                                    <motion.div 
                                        className="h-full bg-sleek-accent shadow-[0_0_12px_#f59e0b]"
                                        animate={{ width: `${attackerHealth}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Center VS Label */}
                        <div className="flex flex-col items-center group">
                            <motion.div 
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="text-5xl font-black italic text-white italic tracking-tighter mb-2"
                            >
                                VS
                            </motion.div>
                            <div className="flex flex-col gap-1 items-center">
                                {phase === 'fight' && (
                                    <div className="grid grid-cols-3 gap-2">
                                        <button onClick={() => handleAction('attack')} className="px-3 py-1.5 bg-red-600 text-white text-[9px] font-black rounded uppercase skew-x-[-10deg] hover:bg-red-500 transition-all border border-red-400/30">Strike</button>
                                        <button onClick={() => handleAction('defend')} className="px-3 py-1.5 bg-zinc-800 text-white text-[9px] font-black rounded uppercase skew-x-[-10deg] hover:bg-zinc-700 transition-all border border-white/10">Parry</button>
                                        <button onClick={() => handleAction('special')} className="px-3 py-1.5 bg-yellow-600 text-white text-[9px] font-black rounded uppercase skew-x-[-10deg] hover:bg-yellow-500 transition-all border border-yellow-400/30 ring-2 ring-yellow-400/20 animate-pulse">Fatal</button>
                                    </div>
                                )}
                                {phase === 'victory' && (
                                    <button 
                                        onClick={handleFinish}
                                        className="bg-white text-black px-6 py-2 rounded font-black text-[10px] uppercase tracking-widest animate-bounce"
                                    >
                                        Confirm Kill
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Character 2: Defender */}
                        <div className="flex flex-col items-center gap-4">
                            <motion.div 
                                animate={
                                    defenderHealth <= 0 ? fatalityAnimations[defender.type] : 
                                    defenderHealth > 0 ? { x: [0, -10, 0] } : { y: 100, rotate: -15, opacity: 0 }
                                }
                                transition={{ 
                                    duration: defenderHealth <= 0 ? 0.8 : 2,
                                    repeat: defenderHealth > 0 ? Infinity : 0
                                }}
                                className="w-32 h-40 bg-zinc-900/80 rounded border-2 border-white/30 flex items-center justify-center text-4xl shadow-2xl backdrop-blur-sm"
                            >
                                <div className="text-white opacity-10 absolute top-2 right-2 text-[10px] font-mono">ID: {defender.type[0].toUpperCase()}_02</div>
                                <span className={defender.side === 'white' ? 'brightness-200' : 'grayscale text-red-500'}>{defender.type === 'king' ? '👑' : '💀'}</span>
                            </motion.div>
                            <div className="w-64">
                                <div className="flex justify-between text-[11px] mb-1 font-black uppercase text-white tracking-tighter">
                                    <span>{settings.pieceNames[defender.type]} ({defender.side})</span>
                                    <span className="font-mono">{Math.ceil(defenderHealth)}%</span>
                                </div>
                                <div className="h-2 w-full bg-zinc-900 border border-sleek-ring rounded-full overflow-hidden">
                                    <motion.div 
                                        className="h-full bg-red-600 shadow-[0_0_12px_#ef4444]"
                                        animate={{ width: `${defenderHealth}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Combat Log Overlay */}
                    <div className="absolute top-2 left-6 bottom-2 w-48 overflow-y-auto hidden md:block">
                        <div className="space-y-1 text-[9px] font-mono text-sleek-muted">
                            {log.map((l, i) => <div key={i} className="flex gap-2"><span>{'>'}</span> <span>{l}</span></div>)}
                        </div>
                    </div>
                </div>
            </AnimatePresence>
        </motion.div>
    );
};
