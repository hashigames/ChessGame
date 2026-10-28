import React, { Suspense, useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei';
import { Board } from './Board';
import { Board2D } from './Board2D';
import { useGameStore } from '../../store/gameStore';

interface SceneErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  onError?: (error: Error) => void;
}

interface SceneErrorBoundaryState {
  hasError: boolean;
}

class SceneErrorBoundary extends Component<SceneErrorBoundaryProps, SceneErrorBoundaryState> {
  public state: SceneErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): SceneErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('Three.js Scene encountered a render issue, falling back to 2D Tactical View:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function checkWebGLSupport(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch (e) {
    return false;
  }
}

import { preloadGameR2Models, PIECE_SCALE_HEIGHTS } from '../../utils/r2GlbLoader';

export const Scene: React.FC = () => {
  const { settings, viewMode, setViewMode } = useGameStore();
  const [webGLSupported, setWebGLSupported] = useState<boolean>(true);

  useEffect(() => {
    const supported = checkWebGLSupport();
    setWebGLSupported(supported);
    if (!supported && viewMode !== '2d') {
      setViewMode('2d');
    }
  }, [viewMode, setViewMode]);

  // Preload R2 GLB models with THREE.LoadingManager whenever URLs are set or change
  useEffect(() => {
    if (settings?.pieceGlbUrls) {
      preloadGameR2Models(settings.pieceGlbUrls, PIECE_SCALE_HEIGHTS);
    }
  }, [settings?.pieceGlbUrls]);

  // If user selected 2D view mode or WebGL is not available, render 2D Tactical Board directly
  if (viewMode === '2d' || !webGLSupported) {
    return <Board2D />;
  }

  const safeBoardSize = Math.max(8, Math.min(20, Number(settings?.boardSize) || 8));

  // Procedural theme background colors
  const themeBg = settings?.theme === 'heaven' ? '#1e293b' :
                  settings?.theme === 'snow' ? '#0f172a' :
                  settings?.theme === 'underworld' ? '#090507' :
                  settings?.theme === 'temple' ? '#14100c' :
                  settings?.theme === 'cemetery' ? '#0b1015' : '#09090b';

  return (
    <div className="w-full h-full bg-[#09090b] relative overflow-hidden" style={{ width: '100%', height: '100%' }}>
      <SceneErrorBoundary fallback={<Board2D />} onError={() => setViewMode('2d')}>
        <Canvas 
          shadows 
          gl={{ 
            antialias: true, 
            alpha: false, 
            powerPreference: 'default',
            preserveDrawingBuffer: false,
            failIfMajorPerformanceCaveat: false
          }}
          style={{ width: '100%', height: '100%' }}
          onCreated={({ gl }) => {
            gl.setClearColor(themeBg, 1);
          }}
        >
          <PerspectiveCamera makeDefault position={[0, safeBoardSize * 1.15, safeBoardSize * 1.1]} fov={48} />
          
          {/* Core Lighting - 100% Procedural and Network-Free */}
          <ambientLight intensity={0.8} />
          <hemisphereLight 
            color="#f1f5f9" 
            groundColor="#1e1b4b" 
            intensity={0.65} 
          />
          <directionalLight 
            position={[safeBoardSize, safeBoardSize * 1.6, safeBoardSize]} 
            intensity={1.6} 
            castShadow 
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-near={0.5}
            shadow-camera-far={100}
          />
          <pointLight 
            position={[-safeBoardSize, safeBoardSize, -safeBoardSize]} 
            intensity={0.6} 
            color="#38bdf8" 
          />
          <pointLight 
            position={[safeBoardSize, safeBoardSize * 0.5, -safeBoardSize]} 
            intensity={0.5} 
            color="#f59e0b" 
          />

          {/* Smooth Camera Controls */}
          <OrbitControls 
            enableDamping
            dampingFactor={0.05}
            rotateSpeed={0.5}
            minDistance={4}
            maxDistance={65}
            maxPolarAngle={Math.PI / 2.1}
            target={[0, 0, 0]}
          />

          {/* Procedural Stars Atmosphere */}
          {settings?.theme === 'underworld' && (
            <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
          )}

          <Suspense fallback={null}>
            <Board />
          </Suspense>
        </Canvas>
      </SceneErrorBoundary>
    </div>
  );
};
