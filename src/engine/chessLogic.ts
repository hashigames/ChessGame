import { PieceType, Side, Piece } from '../store/gameStore';

export const INITIAL_PIECE_LAYOUT: PieceType[] = [
  'rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'
];

export function createInitialBoard(size: number): (Piece | null)[][] {
  const board: (Piece | null)[][] = Array(size).fill(null).map(() => Array(size).fill(null));

  const createPiece = (type: PieceType, side: Side): Piece => ({
    id: Math.random().toString(36).substr(2, 9),
    type,
    side,
    health: 100,
    maxHealth: 100
  });

  // White pieces (Bottom)
  for (let i = 0; i < size; i++) {
    // Pawns
    board[size - 2][i] = createPiece('pawn', 'white');
    // Main pieces
    if (i < 8) {
      board[size - 1][i] = createPiece(INITIAL_PIECE_LAYOUT[i], 'white');
    } else {
      // Filler for larger boards - more pawns or random pieces?
      // Let's stick to fill with pawns for now or repeat layout
      board[size - 1][i] = createPiece(INITIAL_PIECE_LAYOUT[i % 8], 'white');
    }
  }

  // Black pieces (Top)
  for (let i = 0; i < size; i++) {
    // Pawns
    board[1][i] = createPiece('pawn', 'black');
    // Main pieces
    if (i < 8) {
      board[0][i] = createPiece(INITIAL_PIECE_LAYOUT[i], 'black');
    } else {
      board[0][i] = createPiece(INITIAL_PIECE_LAYOUT[i % 8], 'black');
    }
  }

  return board;
}

export function getValidMoves(pos: [number, number], board: (Piece | null)[][], size: number): [number, number][] {
  const piece = board[pos[0]][pos[1]];
  if (!piece) return [];

  const moves: [number, number][] = [];
  const { type, side } = piece;

  const isEnemy = (r: number, c: number) => {
    if (r < 0 || r >= size || c < 0 || c >= size) return false;
    return board[r][c] !== null && board[r][c]?.side !== side;
  };

  const isEmpty = (r: number, c: number) => {
    if (r < 0 || r >= size || c < 0 || c >= size) return false;
    return board[r][c] === null;
  };

  const addMoveIfValid = (r: number, c: number, allowCapture: boolean = true) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      if (isEmpty(r, c) || (allowCapture && isEnemy(r, c))) {
        moves.push([r, c]);
        return true;
      }
    }
    return false;
  };

  const addLinearMoves = (dr: number, dc: number) => {
    let r = pos[0] + dr;
    let c = pos[1] + dc;
    while (r >= 0 && r < size && c >= 0 && c < size) {
      if (isEmpty(r, c)) {
        moves.push([r, c]);
      } else {
        if (isEnemy(r, c)) moves.push([r, c]);
        break;
      }
      r += dr;
      c += dc;
    }
  };

  switch (type) {
    case 'pawn':
      const dir = side === 'white' ? -1 : 1;
      // Step forward
      if (isEmpty(pos[0] + dir, pos[1])) {
        moves.push([pos[0] + dir, pos[1]]);
        // Double step
        const startRow = side === 'white' ? size - 2 : 1;
        if (pos[0] === startRow && isEmpty(pos[0] + 2 * dir, pos[1])) {
          moves.push([pos[0] + 2 * dir, pos[1]]);
        }
      }
      // Captures
      if (isEnemy(pos[0] + dir, pos[1] - 1)) moves.push([pos[0] + dir, pos[1] - 1]);
      if (isEnemy(pos[0] + dir, pos[1] + 1)) moves.push([pos[0] + dir, pos[1] + 1]);
      break;
    case 'rook':
      addLinearMoves(1, 0); addLinearMoves(-1, 0);
      addLinearMoves(0, 1); addLinearMoves(0, -1);
      break;
    case 'bishop':
      addLinearMoves(1, 1); addLinearMoves(1, -1);
      addLinearMoves(-1, 1); addLinearMoves(-1, -1);
      break;
    case 'knight':
      const knightOffsets = [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]];
      knightOffsets.forEach(([dr, dc]) => addMoveIfValid(pos[0] + dr, pos[1] + dc));
      break;
    case 'queen':
      addLinearMoves(1, 0); addLinearMoves(-1, 0);
      addLinearMoves(0, 1); addLinearMoves(0, -1);
      addLinearMoves(1, 1); addLinearMoves(1, -1);
      addLinearMoves(-1, 1); addLinearMoves(-1, -1);
      break;
    case 'king':
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          addMoveIfValid(pos[0] + dr, pos[1] + dc);
        }
      }
      break;
  }

  return moves;
}

// Simple AI logic
export function getAIMove(board: (Piece | null)[][], size: number, level: number): [ [number, number], [number, number] ] | null {
  // Level affects depth or randomness
  // For now, let's pick a random valid move for black
  const allMoves: [ [number, number], [number, number] ][] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const piece = board[r][c];
      if (piece && piece.side === 'black') {
        const moves = getValidMoves([r, c], board, size);
        moves.forEach(m => allMoves.push([[r, c], m]));
      }
    }
  }

  if (allMoves.length === 0) return null;
  return allMoves[Math.floor(Math.random() * allMoves.length)];
}
