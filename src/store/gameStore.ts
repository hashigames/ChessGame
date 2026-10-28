import { create } from 'zustand';
import { saveSettingsToDB } from '../utils/db';
import { saveGameSettingsToFirebase, loadGameSettingsFromFirebase } from '../utils/firebaseSync';
import { createInitialBoard } from '../engine/chessLogic';

export type PieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
export type Side = 'white' | 'black';

export interface CustomModel {
  name: string;
  dataUrl: string; // base64 representation of the 3D file
  fileType: 'fbx' | 'obj';
  mapUrl?: string;         // Base Color / Albedo / Diffuse
  normalMapUrl?: string;   // Normal Map
  roughnessMapUrl?: string;// Roughness Map
  metalnessMapUrl?: string;// Metallic Map
  emissiveMapUrl?: string; // Emission Map
}

import { DEFAULT_PIECE_GLB_URLS } from '../utils/r2GlbLoader';

export interface GameSettings {
  boardSize: number;
  aiLevel: number;
  theme: 'park' | 'cemetery' | 'temple' | 'underworld' | 'heaven' | 'snow';
  gameName: string;
  musicVolume: number;
  musicMuted: boolean;
  selectedTrackId?: string;
  customMusicUrl?: string;
  customMusicName?: string;
  pieceNames: Record<PieceType, string>;
  pieceWeapons: Record<PieceType, string>;
  pieceModels: Record<PieceType, CustomModel | null>;
  pieceGlbUrls: Record<string, string>;
}

interface GameState {
  settings: GameSettings;
  board: (Piece | null)[][];
  turn: Side;
  selectedPos: [number, number] | null;
  validMoves: [number, number][];
  combatData: {
    active: boolean;
    attacker: Piece;
    defender: Piece;
    attackerPos: [number, number];
    defenderPos: [number, number];
  } | null;
  history: any[];
  isMaximized: boolean;
  setIsMaximized: (maximized: boolean | ((prev: boolean) => boolean)) => void;
  viewMode: '3d' | '2d';
  setViewMode: (mode: '3d' | '2d') => void;
  
  isSyncing: boolean;
  syncProgress: { status: string; percent: number } | null;
  lastSynced: string | null;
  syncError: string | null;
  saveSettingsToCloud: (customSettings?: GameSettings) => Promise<boolean>;
  loadSettingsFromCloud: () => Promise<boolean>;
  
  updateSettings: (settings: Partial<GameSettings>) => void;
  selectPiece: (pos: [number, number] | null) => void;
  movePiece: (from: [number, number], to: [number, number]) => void;
  resolveCombat: (winnerSide: Side) => void;
}

export interface Piece {
  id: string;
  type: PieceType;
  side: Side;
  health: number;
  maxHealth: number;
}

let syncTimeout: any = null;

export const useGameStore = create<GameState>((set, get) => ({
  settings: {
    boardSize: 8,
    aiLevel: 2,
    theme: 'park',
    gameName: 'Tactical Chess 3D Studio',
    musicVolume: 0.5,
    musicMuted: false,
    selectedTrackId: 'imperial_oriental',
    customMusicUrl: '',
    customMusicName: '',
    pieceNames: {
      pawn: 'Soldier',
      rook: 'Castle',
      knight: 'Horse',
      bishop: 'Priest',
      queen: 'General',
      king: 'Leader'
    },
    pieceWeapons: {
      pawn: 'Spear',
      rook: 'Shield',
      knight: 'Axe',
      bishop: 'Staff',
      queen: 'Scythe',
      king: 'Sword'
    },
    pieceModels: {
      pawn: null,
      rook: null,
      knight: null,
      bishop: null,
      queen: null,
      king: null
    },
    pieceGlbUrls: { ...DEFAULT_PIECE_GLB_URLS }
  },
  board: createInitialBoard(8),
  turn: 'white',
  selectedPos: null,
  validMoves: [],
  combatData: null,
  history: [],
  isMaximized: false,
  setIsMaximized: (maximized) => {
    if (typeof maximized === 'function') {
      set((state) => ({ isMaximized: maximized(state.isMaximized) }));
    } else {
      set({ isMaximized: maximized });
    }
  },
  viewMode: '3d',
  setViewMode: (mode) => set({ viewMode: mode }),

  isSyncing: false,
  syncProgress: null,
  lastSynced: null,
  syncError: null,

  saveSettingsToCloud: async (customSettings) => {
    const settings = customSettings || get().settings;
    set({ isSyncing: true, syncError: null, syncProgress: { status: 'Preparing cloud backup...', percent: 5 } });
    try {
      const synced = await saveGameSettingsToFirebase(settings, (status, percent) => {
        set({ syncProgress: { status, percent } });
      });
      if (synced) {
        set({ 
          isSyncing: false, 
          syncProgress: null, 
          lastSynced: new Date().toLocaleTimeString(), 
          syncError: null 
        });
        return true;
      } else {
        set({ isSyncing: false, syncProgress: null, syncError: null });
        return false;
      }
    } catch (err: any) {
      console.warn('Cloud sync issue:', err);
      set({ isSyncing: false, syncProgress: null, syncError: err?.message || 'Sync failed' });
      return false;
    }
  },

  loadSettingsFromCloud: async () => {
    set({ isSyncing: true, syncError: null, syncProgress: { status: 'Downloading character library...', percent: 10 } });
    try {
      const cloudSettings = await loadGameSettingsFromFirebase((status, percent) => {
        set({ syncProgress: { status, percent } });
      });
      if (cloudSettings) {
        get().updateSettings(cloudSettings);
        set({ 
          isSyncing: false, 
          syncProgress: null, 
          lastSynced: new Date().toLocaleTimeString(), 
          syncError: null 
        });
        return true;
      } else {
        set({ isSyncing: false, syncProgress: null });
        return false;
      }
    } catch (err: any) {
      console.warn('Cloud load error:', err);
      set({ isSyncing: false, syncProgress: null, syncError: err?.message || 'Load failed' });
      return false;
    }
  },

  updateSettings: (newSettings) => {
    set((state) => {
      const sanitizedSettings = { ...newSettings };
      if (sanitizedSettings.boardSize !== undefined) {
        const parsed = parseInt(String(sanitizedSettings.boardSize), 10);
        sanitizedSettings.boardSize = isNaN(parsed) ? 8 : Math.max(8, Math.min(20, parsed));
      }

      const updated = { 
        ...state.settings, 
        ...sanitizedSettings,
        pieceNames: { ...state.settings.pieceNames, ...sanitizedSettings.pieceNames },
        pieceWeapons: { ...state.settings.pieceWeapons, ...sanitizedSettings.pieceWeapons },
        pieceModels: { ...state.settings.pieceModels, ...sanitizedSettings.pieceModels },
        pieceGlbUrls: { ...state.settings.pieceGlbUrls, ...sanitizedSettings.pieceGlbUrls }
      };

      // 1. Immediately persist to local storage/IndexedDB
      saveSettingsToDB(updated);

      // 2. Debounced auto-backup to Firestore if signed in
      if (syncTimeout) clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        get().saveSettingsToCloud(updated);
      }, 1500);

      // If board size changed and current board dimensions mismatch, re-create board
      let nextBoard = state.board;
      if (updated.boardSize !== state.settings.boardSize || !Array.isArray(state.board) || state.board.length !== updated.boardSize) {
        nextBoard = createInitialBoard(updated.boardSize);
      }

      return { settings: updated, board: nextBoard };
    });
  },

  selectPiece: (pos) => {
    const { board, turn } = get();
    if (!pos) {
      set({ selectedPos: null, validMoves: [] });
      return;
    }
    const piece = board?.[pos[0]]?.[pos[1]];
    if (piece && piece.side === turn) {
      set({ selectedPos: pos });
    } else {
      set({ selectedPos: null, validMoves: [] });
    }
  },

  movePiece: (from, to) => {
    const { board, selectPiece } = get();
    const attacker = board?.[from[0]]?.[from[1]];
    const defender = board?.[to[0]]?.[to[1]];

    if (!attacker) return;

    if (defender) {
      // Trigger dynamic combat mode
      set({
        combatData: {
          active: true,
          attacker,
          defender,
          attackerPos: from,
          defenderPos: to
        }
      });
    } else {
      // Direct peaceful movement
      const newBoard = board.map(row => [...row]);
      newBoard[to[0]][to[1]] = attacker;
      newBoard[from[0]][from[1]] = null;

      set((state) => ({
        board: newBoard,
        turn: state.turn === 'white' ? 'black' : 'white',
        selectedPos: null,
        validMoves: []
      }));
    }
  },

  resolveCombat: (winnerSide: Side) => {
    const { combatData, board } = get();
    if (!combatData) return;

    const { attacker, defender, attackerPos, defenderPos } = combatData;
    const newBoard = board.map(row => [...row]);

    if (winnerSide === attacker.side) {
      newBoard[defenderPos[0]][defenderPos[1]] = attacker;
      newBoard[attackerPos[0]][attackerPos[1]] = null;
    } else {
      newBoard[attackerPos[0]][attackerPos[1]] = null;
    }

    set((state) => ({
      board: newBoard,
      combatData: null,
      turn: state.turn === 'white' ? 'black' : 'white',
      selectedPos: null,
      validMoves: []
    }));
  }
}));
