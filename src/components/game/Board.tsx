import React, { useRef, useMemo, memo, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import { PieceMesh } from './PieceMesh';
import { Box, Plane, Cylinder, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { createInitialBoard } from '../../engine/chessLogic';

interface TileProps {
  position: [number, number, number];
  color: string;
  isMove: boolean;
  isSelected: boolean;
  onClick: () => void;
}

const Tile = memo(({ position, color, isMove, isSelected, onClick }: TileProps) => {
  return (
    <Box 
      args={[1, 0.1, 1]} 
      position={position} 
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <meshStandardMaterial 
        color={isSelected ? '#44ff44' : isMove ? '#ff4444' : color} 
        roughness={0.7}
      />
    </Box>
  );
});

export const Board = () => {
  const { board, settings, selectedPos, validMoves = [], selectPiece, movePiece } = useGameStore();
  const size = Math.max(8, Math.min(20, Number(settings?.boardSize) || 8));

  const currentBoard = useMemo(() => {
    if (Array.isArray(board) && board.length === size && Array.isArray(board[0])) {
      return board;
    }
    return createInitialBoard(size);
  }, [board, size]);

  const handleTileClick = useCallback((r: number, c: number) => {
    if (selectedPos) {
      const isMove = Array.isArray(validMoves) && validMoves.some(m => m[0] === r && m[1] === c);
      if (isMove) {
        movePiece(selectedPos, [r, c]);
        return;
      }
    }
    selectPiece([r, c]);
  }, [selectedPos, validMoves, movePiece, selectPiece]);

  const environmentProps = useMemo(() => {
    const props = [];
    for (let i = 0; i < 15; i++) {
      const x = (Math.random() - 0.5) * size * 2.5;
      const z = (Math.random() - 0.5) * size * 2.5;
      if (Math.abs(x) < size / 2 + 1 && Math.abs(z) < size / 2 + 1) continue;
      props.push({ x, z, scale: 0.5 + Math.random(), type: i % 3 });
    }
    return props;
  }, [settings?.theme, size]);

  return (
    <group>
      {/* Board Base */}
      <group position={[-size / 2 + 0.5, 0, -size / 2 + 0.5]}>
        {currentBoard.map((row, r) => 
          row.map((piece, c) => {
            const isWhiteTile = (r + c) % 2 === 0;
            const tileColor = isWhiteTile ? '#eee' : '#333';
            const isMove = Array.isArray(validMoves) && validMoves.some(m => m[0] === r && m[1] === c);
            const isSelected = selectedPos?.[0] === r && selectedPos?.[1] === c;

            return (
              <group key={`${r}-${c}`} position={[c, 0, r]}>
                <Tile 
                  position={[0, -0.05, 0]} 
                  color={tileColor}
                  isMove={isMove}
                  isSelected={isSelected}
                  onClick={() => handleTileClick(r, c)}
                />
                {piece && (
                  <PieceMesh 
                    type={piece.type} 
                    side={piece.side} 
                    weapon={settings?.pieceWeapons?.[piece.type] || 'Weapon'} 
                    isSelected={isSelected}
                  />
                )}
              </group>
            );
          })
        )}
      </group>

      {/* Environment Decoration */}
      {environmentProps.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]}>
          {settings.theme === 'underworld' && (
            <Box args={[1, p.scale * 3, 1]}>
              <meshStandardMaterial color="#300" emissive="#ff0000" emissiveIntensity={0.5} />
            </Box>
          )}
          {settings.theme === 'park' && (
            <group scale={p.scale}>
              <Cylinder args={[0.1, 0.1, 1]} position={[0, 0.5, 0]}>
                <meshStandardMaterial color="#4a2a0a" />
              </Cylinder>
              <Sphere args={[0.5]} position={[0, 1.2, 0]}>
                <meshStandardMaterial color="#1a4a1a" />
              </Sphere>
            </group>
          )}
          {settings.theme === 'snow' && (
            <Box args={[1, 0.1, 1]} scale={p.scale}>
              <meshStandardMaterial color="white" />
            </Box>
          )}
        </group>
      ))}

      {/* Floor */}
      <Plane args={[100, 100]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <meshStandardMaterial color={
          settings.theme === 'underworld' ? '#110000' : 
          settings.theme === 'snow' ? '#ffffff' : 
          settings.theme === 'temple' ? '#c0c0c0' : '#1a3a1a'
        } />
      </Plane>
      
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />
      <pointLight position={[-10, 10, -10]} intensity={0.5} />
    </group>
  );
};
