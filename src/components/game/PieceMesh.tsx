import React, { useRef, useState, useEffect, useMemo, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Cylinder, Box, Torus, Cone } from '@react-three/drei';
import { PieceType, Side, useGameStore, CustomModel } from '../../store/gameStore';
import * as THREE from 'three';
import { loadAndNormalizeModel, loadPBRTexture } from '../../utils/threeModelLoader';
import { 
  resolvePieceR2Url, 
  cloneCachedR2Model, 
  loadR2GlbModel, 
  PIECE_SCALE_HEIGHTS 
} from '../../utils/r2GlbLoader';

interface R2GlbPieceRendererProps {
  url: string;
  type: PieceType;
  side: Side;
  color: string;
}

const R2GlbPieceRenderer = memo(({ url, type, side, color }: R2GlbPieceRendererProps) => {
  const [modelGroup, setModelGroup] = useState<THREE.Group | null>(() => {
    return cloneCachedR2Model(url, PIECE_SCALE_HEIGHTS[type]);
  });
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const height = PIECE_SCALE_HEIGHTS[type] || 1.4;

    const cached = cloneCachedR2Model(url, height);
    if (cached) {
      setModelGroup(cached);
      setLoadFailed(false);
      return;
    }

    // Load asynchronously from R2 if not yet cached
    loadR2GlbModel(url, height)
      .then(() => {
        if (active) {
          const fresh = cloneCachedR2Model(url, height);
          setModelGroup(fresh);
          setLoadFailed(false);
        }
      })
      .catch((err) => {
        console.warn(`Failed loading R2 GLB piece (${type}, ${side}):`, err);
        if (active) {
          setLoadFailed(true);
        }
      });

    return () => {
      active = false;
    };
  }, [url, type, side]);

  // If loading or load failed, render fallback geometry
  if (loadFailed || !modelGroup) {
    return (
      <group position={[0, 0.4, 0]}>
        <Cylinder args={[0.25, 0.35, 0.8, 16]}>
          <meshStandardMaterial 
            color={color} 
            roughness={0.4} 
            metalness={0.3} 
            wireframe={!modelGroup} 
            opacity={modelGroup ? 1 : 0.6}
            transparent={!modelGroup}
          />
        </Cylinder>
      </group>
    );
  }

  return (
    <group>
      {/* 3D R2 GLB Character Model */}
      <primitive object={modelGroup} />

      {/* Team Side Pedestal Trim for instant tactical identification */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.32, 0.44, 32]} />
        <meshStandardMaterial 
          color={side === 'white' ? '#fef08a' : '#f43f5e'} 
          emissive={side === 'white' ? '#ca8a04' : '#991b1b'}
          emissiveIntensity={0.6}
          roughness={0.2}
          metalness={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
});

interface PieceMeshProps {
  type: PieceType;
  side: Side;
  weapon: string;
  isSelected?: boolean;
}

export const PieceMesh = memo(({ type, side, weapon, isSelected }: PieceMeshProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const { settings } = useGameStore();
  const color = side === 'white' ? '#f8fafc' : '#18181b';

  // Opposing Army Facing Orientation: White faces North (PI), Black faces South (0)
  const baseRotationY = side === 'white' ? Math.PI : 0;

  // Lightweight breathing/hover only when selected
  useFrame((state) => {
    if (groupRef.current) {
      if (isSelected) {
        groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 4) * 0.05 + 0.12;
        groupRef.current.rotation.y = baseRotationY + Math.sin(state.clock.elapsedTime * 2) * 0.15;
      } else {
        // Direct contact with quadrilateral square at y = 0.0
        groupRef.current.position.y = 0.0;
        groupRef.current.rotation.y = baseRotationY;
      }
    }
  });

  // Resolve Cloudflare R2 GLB model URL for this piece
  const r2GlbUrl = useMemo(() => {
    return resolvePieceR2Url(type, side, settings.pieceGlbUrls);
  }, [type, side, settings.pieceGlbUrls]);

  return (
    <group ref={groupRef}>
      {r2GlbUrl ? (
        <R2GlbPieceRenderer 
          url={r2GlbUrl} 
          type={type} 
          side={side} 
          color={color} 
        />
      ) : (
        <>
          {/* Fallback Procedural Body */}
          <Cylinder args={[0.3, 0.38, 0.7, 16]} position={[0, 0.35, 0]}>
            <meshStandardMaterial color={color} metalness={0.6} roughness={0.2} />
          </Cylinder>
          
          {type === 'pawn' && (
            <Sphere args={[0.22, 16, 16]} position={[0, 0.85, 0]}>
              <meshStandardMaterial color={color} />
            </Sphere>
          )}
          {type === 'rook' && (
            <Box args={[0.38, 0.3, 0.38]} position={[0, 0.85, 0]}>
              <meshStandardMaterial color={color} />
            </Box>
          )}
          {type === 'knight' && (
            <group position={[0, 0.8, 0.08]} rotation={[-0.35, 0, 0]}>
              <Box args={[0.24, 0.38, 0.38]}>
                <meshStandardMaterial color={color} />
              </Box>
              <Box args={[0.14, 0.18, 0.1]} position={[0, 0.18, 0.08]}>
                <meshStandardMaterial color={color} />
              </Box>
            </group>
          )}
          {type === 'bishop' && (
            <Cone args={[0.22, 0.55, 16]} position={[0, 0.9, 0]}>
              <meshStandardMaterial color={color} />
            </Cone>
          )}
          {type === 'queen' && (
            <group position={[0, 0.85, 0]}>
              <Torus args={[0.18, 0.05, 16, 32]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.18, 0]}>
                <meshStandardMaterial color={color} />
              </Torus>
              <Sphere args={[0.18, 16, 16]}>
                <meshStandardMaterial color={color} />
              </Sphere>
            </group>
          )}
          {type === 'king' && (
            <group position={[0, 0.85, 0]}>
              <Box args={[0.08, 0.26, 0.08]} position={[0, 0.35, 0]}>
                <meshStandardMaterial color="gold" />
              </Box>
              <Box args={[0.26, 0.08, 0.08]} position={[0, 0.35, 0]}>
                <meshStandardMaterial color="gold" />
              </Box>
              <Cylinder args={[0.28, 0.28, 0.25, 8]}>
                <meshStandardMaterial color={color} />
              </Cylinder>
            </group>
          )}
        </>
      )}

      {/* Glow highlight for selected piece flush on quadrilateral */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
          <ringGeometry args={[0.38, 0.52, 32]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
});
