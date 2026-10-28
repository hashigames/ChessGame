import React, { useMemo, useCallback } from 'react';
import { useGameStore, Piece, PieceType, Side } from '../../store/gameStore';
import { createInitialBoard } from '../../engine/chessLogic';

// High-clarity Unicode chess symbols
const CHESS_SYMBOLS: Record<PieceType, { white: string; black: string }> = {
  king: { white: '♔', black: '♚' },
  queen: { white: '♕', black: '♛' },
  rook: { white: '♖', black: '♜' },
  bishop: { white: '♗', black: '♝' },
  knight: { white: '♘', black: '♞' },
  pawn: { white: '♙', black: '♟' },
};

export const Board2D: React.FC = () => {
  const { board, settings, selectedPos, validMoves = [], selectPiece, movePiece, turn } = useGameStore();
  const size = Math.max(8, Math.min(20, Number(settings?.boardSize) || 8));

  const currentBoard = useMemo(() => {
    if (Array.isArray(board) && board.length === size && Array.isArray(board[0])) {
      return board;
    }
    return createInitialBoard(size);
  }, [board, size]);

  const handleSquareClick = useCallback((r: number, c: number) => {
    if (selectedPos) {
      const isMove = Array.isArray(validMoves) && validMoves.some(m => m[0] === r && m[1] === c);
      if (isMove) {
        movePiece(selectedPos, [r, c]);
        return;
      }
    }
    selectPiece([r, c]);
  }, [selectedPos, validMoves, movePiece, selectPiece]);

  const files = useMemo(() => {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    return Array.from({ length: size }, (_, i) => letters[i] || `${i + 1}`);
  }, [size]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 bg-[#09090b] select-none overflow-auto">
      {/* Board Outer Frame */}
      <div className="relative flex flex-col items-center justify-center p-2 sm:p-3 bg-[#18181b] border border-[#2a2a2e] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] max-w-[min(90vw,78vh)] w-full aspect-square">
        
        {/* Top File Coordinates */}
        <div className="w-full grid px-4 py-1 text-[9px] sm:text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-widest text-center"
             style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
          {files.map((f, i) => (
            <span key={i}>{f}</span>
          ))}
        </div>

        {/* Board Grid Container */}
        <div 
          className="w-full flex-1 grid border border-zinc-800 rounded-lg overflow-hidden shadow-inner"
          style={{
            gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
          }}
        >
          {currentBoard.map((row, r) =>
            row.map((piece, c) => {
              const isWhiteTile = (r + c) % 2 === 0;
              const isSelected = selectedPos?.[0] === r && selectedPos?.[1] === c;
              const isMove = Array.isArray(validMoves) && validMoves.some(m => m[0] === r && m[1] === c);

              const tileBg = isSelected
                ? 'bg-amber-500/50'
                : isMove
                ? isWhiteTile
                  ? 'bg-emerald-500/40'
                  : 'bg-emerald-600/40'
                : isWhiteTile
                ? 'bg-[#d6d6d8]'
                : 'bg-[#27272a]';

              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => handleSquareClick(r, c)}
                  className={`relative flex items-center justify-center transition-all cursor-pointer ${tileBg} hover:opacity-90 active:scale-95 focus:outline-none`}
                  title={`${files[c]}${size - r} ${piece ? `${piece.side} ${settings.pieceNames[piece.type] || piece.type}` : 'Empty'}`}
                >
                  {/* Square Coordinate Marker on bottom-left / top-right of corners */}
                  {c === 0 && (
                    <span className={`absolute top-0.5 left-1 text-[8px] sm:text-[10px] font-mono font-bold ${isWhiteTile ? 'text-zinc-600' : 'text-zinc-400'}`}>
                      {size - r}
                    </span>
                  )}

                  {/* Move Target Marker (Empty Square) */}
                  {isMove && !piece && (
                    <div className="w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full bg-emerald-400/80 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse" />
                  )}

                  {/* Move Target Marker (Capture Square) */}
                  {isMove && piece && (
                    <div className="absolute inset-1 rounded-md border-2 border-red-400 bg-red-500/30 animate-pulse pointer-events-none" />
                  )}

                  {/* Selected Piece Highlight Ring */}
                  {isSelected && (
                    <div className="absolute inset-0 border-2 border-amber-400 shadow-[inset_0_0_12px_rgba(245,158,11,0.6)] pointer-events-none" />
                  )}

                  {/* Chess Piece Graphic */}
                  {piece && (
                    <div className="flex flex-col items-center justify-center pointer-events-none transform transition-transform">
                      <span
                        className={`text-2xl sm:text-4xl md:text-5xl select-none leading-none filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] ${
                          piece.side === 'white'
                            ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] font-medium'
                            : 'text-zinc-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)] font-bold'
                        }`}
                      >
                        {CHESS_SYMBOLS[piece.type]?.[piece.side] || '♟'}
                      </span>
                      <span className="hidden sm:block text-[7px] font-mono tracking-tighter uppercase text-zinc-500 truncate max-w-[48px]">
                        {settings.pieceNames[piece.type] || piece.type}
                      </span>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Bottom File Coordinates */}
        <div className="w-full grid px-4 py-1 text-[9px] sm:text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-widest text-center"
             style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
          {files.map((f, i) => (
            <span key={i}>{f}</span>
          ))}
        </div>
      </div>
    </div>
  );
};
