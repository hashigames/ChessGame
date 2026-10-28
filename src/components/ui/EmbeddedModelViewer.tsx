import React, { useState, useEffect, useRef, memo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid, Sphere, Cylinder, Box, Torus, Cone } from '@react-three/drei';
import { CustomModel, PieceType, useGameStore } from '../../store/gameStore';
import * as THREE from 'three';
import { 
  RotateCw, 
  RefreshCw, 
  Shield, 
  Swords, 
  Upload, 
  Maximize2, 
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  Sparkles,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { loadAndNormalizeModel, loadPBRTexture, Loaded3DModelResult } from '../../utils/threeModelLoader';
import { resolvePieceR2Url, loadR2GlbModel } from '../../utils/r2GlbLoader';

interface EmbeddedModelViewerProps {
  selectedPieceType: PieceType;
  onSelectPieceType: (type: PieceType) => void;
  onOpenFullModal: (type: PieceType) => void;
  onUploadBatch: (files: FileList | File[], targetPiece?: PieceType) => void;
  onUploadMap: (
    type: PieceType, 
    mapSlot: 'mapUrl' | 'normalMapUrl' | 'roughnessMapUrl' | 'metalnessMapUrl' | 'emissiveMapUrl', 
    file: File
  ) => void;
  onRemoveMap?: (
    type: PieceType, 
    mapSlot: 'mapUrl' | 'normalMapUrl' | 'roughnessMapUrl' | 'metalnessMapUrl' | 'emissiveMapUrl'
  ) => void;
}

interface PieceMeshRenderProps {
  type: PieceType;
  model: CustomModel | null | undefined;
  r2Url?: string;
  color: string;
  wireframe: boolean;
  onStatsLoaded?: (stats: { vertexCount: number; meshCount: number }) => void;
  onLoadStatusChange?: (status: 'loading' | 'ready' | 'error', errorMsg?: string) => void;
}

const PieceMeshRender: React.FC<PieceMeshRenderProps> = ({
  type,
  model,
  r2Url,
  color,
  wireframe,
  onStatsLoaded,
  onLoadStatusChange
}) => {
  const [loadedObject, setLoadedObject] = useState<THREE.Group | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [textures, setTextures] = useState<Record<string, THREE.Texture | null>>({});

  // 1. Load 3D model: prioritize R2 GLB URL, fallback to model.dataUrl
  useEffect(() => {
    let active = true;

    if (r2Url && r2Url.trim() !== '') {
      if (onLoadStatusChange) onLoadStatusChange('loading');
      setError(null);

      loadR2GlbModel(r2Url, 1.4)
        .then((group) => {
          if (active) {
            const cloned = group.clone(true) as THREE.Group;
            let meshCount = 0;
            let vertexCount = 0;
            cloned.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                meshCount++;
                const mesh = child as THREE.Mesh;
                if (mesh.geometry?.attributes?.position) {
                  vertexCount += mesh.geometry.attributes.position.count;
                }
              }
            });
            setLoadedObject(cloned);
            if (onStatsLoaded) onStatsLoaded({ vertexCount, meshCount });
            if (onLoadStatusChange) onLoadStatusChange('ready');
          }
        })
        .catch((err) => {
          console.warn(`Failed loading R2 GLB in viewer for ${type}:`, err);
          if (active) {
            setError(err.message || 'Error loading R2 model');
            if (onLoadStatusChange) onLoadStatusChange('error', err.message);
          }
        });

      return () => {
        active = false;
      };
    }

    if (!model || !model.dataUrl || model.dataUrl.trim() === '') {
      setLoadedObject(null);
      setError(null);
      if (onLoadStatusChange) onLoadStatusChange('ready');
      return;
    }

    if (onLoadStatusChange) onLoadStatusChange('loading');
    setError(null);

    loadAndNormalizeModel(model.dataUrl, model.fileType || 'obj', 1.4, true)
      .then((res: Loaded3DModelResult) => {
        if (active) {
          const cloned = res.object.clone(true) as THREE.Group;
          setLoadedObject(cloned);
          if (onStatsLoaded) {
            onStatsLoaded({ vertexCount: res.vertexCount, meshCount: res.meshCount });
          }
          if (onLoadStatusChange) onLoadStatusChange('ready');
        }
      })
      .catch((err) => {
        console.error(`Failed to load ${type} model:`, err);
        if (active) {
          setError(err.message || 'Error loading 3D mesh');
          if (onLoadStatusChange) onLoadStatusChange('error', err.message);
        }
      });

    return () => {
      active = false;
    };
  }, [r2Url, model?.dataUrl, model?.fileType, type]);

  // 2. Load PBR Textures
  useEffect(() => {
    if (!model) {
      setTextures({});
      return;
    }

    const map = loadPBRTexture(model.mapUrl, true, (tex) => {
      setTextures((prev) => ({ ...prev, map: tex }));
    });
    const normalMap = loadPBRTexture(model.normalMapUrl, false, (tex) => {
      setTextures((prev) => ({ ...prev, normalMap: tex }));
    });
    const roughnessMap = loadPBRTexture(model.roughnessMapUrl, false, (tex) => {
      setTextures((prev) => ({ ...prev, roughnessMap: tex }));
    });
    const metalnessMap = loadPBRTexture(model.metalnessMapUrl, false, (tex) => {
      setTextures((prev) => ({ ...prev, metalnessMap: tex }));
    });
    const emissiveMap = loadPBRTexture(model.emissiveMapUrl, true, (tex) => {
      setTextures((prev) => ({ ...prev, emissiveMap: tex }));
    });

    setTextures({
      map,
      normalMap,
      roughnessMap,
      metalnessMap,
      emissiveMap,
    });
  }, [model?.mapUrl, model?.normalMapUrl, model?.roughnessMapUrl, model?.metalnessMapUrl, model?.emissiveMapUrl]);

  // 3. Apply standard materials to loaded 3D mesh
  useEffect(() => {
    if (!loadedObject) return;

    const mat = new THREE.MeshStandardMaterial({
      color: textures.map ? '#ffffff' : new THREE.Color(color),
      map: textures.map || null,
      normalMap: textures.normalMap || null,
      roughnessMap: textures.roughnessMap || null,
      metalnessMap: textures.metalnessMap || null,
      emissiveMap: textures.emissiveMap || null,
      emissive: textures.emissiveMap ? new THREE.Color('#ffffff') : new THREE.Color('#000000'),
      emissiveIntensity: textures.emissiveMap ? 1.2 : 0.0,
      roughness: textures.roughnessMap ? 1.0 : 0.25,
      metalness: textures.metalnessMap ? 1.0 : 0.65,
      wireframe,
      side: THREE.DoubleSide,
    });
    mat.needsUpdate = true;

    loadedObject.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.material = mat;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (mesh.geometry && !mesh.geometry.attributes.normal) {
          mesh.geometry.computeVertexNormals();
        }
      }
    });

    return () => {
      mat.dispose();
    };
  }, [loadedObject, textures, color, wireframe]);

  if (error) {
    return (
      <group position={[0, 0.5, 0]}>
        <Box args={[0.8, 0.8, 0.8]}>
          <meshStandardMaterial color="#ef4444" wireframe />
        </Box>
      </group>
    );
  }

  // Render Custom 3D Mesh
  if (loadedObject) {
    return <primitive object={loadedObject} />;
  }

  // Fallback: Default procedural geometry with custom textures applied
  const defaultMatProps = {
    color: textures.map ? '#ffffff' : new THREE.Color(color),
    map: textures.map || null,
    normalMap: textures.normalMap || null,
    roughnessMap: textures.roughnessMap || null,
    metalnessMap: textures.metalnessMap || null,
    emissiveMap: textures.emissiveMap || null,
    emissive: textures.emissiveMap ? '#ffffff' : '#000000',
    emissiveIntensity: textures.emissiveMap ? 1.2 : 0.0,
    metalness: textures.metalnessMap ? 1.0 : 0.7,
    roughness: textures.roughnessMap ? 1.0 : 0.2,
    wireframe,
  };

  return (
    <group position={[0, 0.35, 0]}>
      <Cylinder args={[0.35, 0.45, 0.7, 16]} position={[0, -0.1, 0]}>
        <meshStandardMaterial {...defaultMatProps} />
      </Cylinder>
      {type === 'pawn' && (
        <Sphere args={[0.26, 16, 16]} position={[0, 0.4, 0]}>
          <meshStandardMaterial {...defaultMatProps} />
        </Sphere>
      )}
      {type === 'rook' && (
        <Box args={[0.45, 0.35, 0.45]} position={[0, 0.4, 0]}>
          <meshStandardMaterial {...defaultMatProps} />
        </Box>
      )}
      {type === 'knight' && (
        <group position={[0, 0.4, 0.08]} rotation={[-0.3, 0, 0]}>
          <Box args={[0.3, 0.42, 0.42]}>
            <meshStandardMaterial {...defaultMatProps} />
          </Box>
        </group>
      )}
      {type === 'bishop' && (
        <Cone args={[0.28, 0.65, 16]} position={[0, 0.4, 0]}>
          <meshStandardMaterial {...defaultMatProps} />
        </Cone>
      )}
      {type === 'queen' && (
        <group position={[0, 0.4, 0]}>
          <Torus args={[0.22, 0.06, 16, 32]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.22, 0]}>
            <meshStandardMaterial {...defaultMatProps} />
          </Torus>
          <Sphere args={[0.22, 16, 16]}>
            <meshStandardMaterial {...defaultMatProps} />
          </Sphere>
        </group>
      )}
      {type === 'king' && (
        <group position={[0, 0.4, 0]}>
          <Box args={[0.12, 0.35, 0.12]} position={[0, 0.45, 0]}>
            <meshStandardMaterial color="gold" wireframe={wireframe} />
          </Box>
          <Box args={[0.35, 0.12, 0.12]} position={[0, 0.45, 0]}>
            <meshStandardMaterial color="gold" wireframe={wireframe} />
          </Box>
          <Cylinder args={[0.35, 0.35, 0.35, 8]}>
            <meshStandardMaterial {...defaultMatProps} />
          </Cylinder>
        </group>
      )}
    </group>
  );
};

export const EmbeddedModelViewer: React.FC<EmbeddedModelViewerProps> = ({
  selectedPieceType,
  onSelectPieceType,
  onOpenFullModal,
  onUploadBatch,
  onUploadMap,
  onRemoveMap,
}) => {
  const { settings, updateSettings } = useGameStore();
  const currentModel = settings.pieceModels[selectedPieceType];

  const [previewSide, setPreviewSide] = useState<'white' | 'black'>('white');
  const [wireframe, setWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [is3DActive, setIs3DActive] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [meshStats, setMeshStats] = useState<{ vertexCount: number; meshCount: number } | null>(null);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'error'>('ready');
  const [loadErrorMsg, setLoadErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const pieceList: PieceType[] = ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king'];

  // Handle Drag & Drop directly over the 3D canvas viewport
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadBatch(e.dataTransfer.files, selectedPieceType);
    }
  };

  const mapSlots = [
    { key: 'mapUrl', label: 'Diffuse', active: !!currentModel?.mapUrl, color: 'text-emerald-400' },
    { key: 'normalMapUrl', label: 'Normal', active: !!currentModel?.normalMapUrl, color: 'text-cyan-400' },
    { key: 'roughnessMapUrl', label: 'Rough', active: !!currentModel?.roughnessMapUrl, color: 'text-amber-400' },
    { key: 'metalnessMapUrl', label: 'Metal', active: !!currentModel?.metalnessMapUrl, color: 'text-purple-400' },
    { key: 'emissiveMapUrl', label: 'Glow', active: !!currentModel?.emissiveMapUrl, color: 'text-rose-400' },
  ] as const;

  return (
    <div className="w-full bg-sleek-card border border-sleek-border rounded-xl overflow-hidden shadow-2xl flex flex-col">
      {/* Top Header Bar */}
      <div className="bg-black/60 px-3 py-2 border-b border-sleek-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-sleek-accent shadow-[0_0_8px_#f59e0b]"></div>
          <span className="text-[11px] font-bold text-white uppercase tracking-wider">
            {selectedPieceType.toUpperCase()} 3D STUDIO
          </span>
          {currentModel?.dataUrl && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sleek-accent/20 text-sleek-accent border border-sleek-accent/40 uppercase">
              {currentModel.fileType}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-1 rounded text-[10px] font-mono transition-colors ${
              autoRotate ? 'text-sleek-accent bg-sleek-accent/15' : 'text-sleek-muted hover:text-white'
            }`}
            title="Toggle Turntable Rotation"
          >
            <RotateCw size={12} className={autoRotate ? 'animate-spin-slow' : ''} />
          </button>
          <button
            onClick={() => setWireframe(!wireframe)}
            className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors border ${
              wireframe 
                ? 'bg-sleek-accent text-black border-sleek-accent font-bold' 
                : 'text-sleek-muted border-sleek-ring hover:text-white'
            }`}
            title="Toggle Wireframe"
          >
            WIRE
          </button>
          <button
            onClick={() => setPreviewSide(previewSide === 'white' ? 'black' : 'white')}
            className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-black/50 text-white/80 border border-sleek-ring hover:border-sleek-accent transition-colors uppercase"
            title="Switch White / Black Team Color"
          >
            {previewSide}
          </button>
          <button
            onClick={() => onOpenFullModal(selectedPieceType)}
            className="p-1 rounded text-sleek-muted hover:text-sleek-accent transition-colors"
            title="Open Fullscreen 3D Inspector"
          >
            <Maximize2 size={12} />
          </button>
        </div>
      </div>

      {/* Piece Selector Ribbon */}
      <div className="bg-black/30 px-2 py-1.5 border-b border-sleek-ring/50 flex gap-1 overflow-x-auto custom-scrollbar">
        {pieceList.map((type) => {
          const hasModel = !!settings.pieceModels[type]?.dataUrl;
          const isSelected = selectedPieceType === type;
          return (
            <button
              key={type}
              onClick={() => onSelectPieceType(type)}
              className={`px-2 py-1 rounded text-[9px] font-mono uppercase transition-all flex items-center gap-1 shrink-0 ${
                isSelected
                  ? 'bg-sleek-accent text-black font-black shadow-sm'
                  : 'bg-black/40 text-sleek-muted hover:text-white border border-sleek-ring/40'
              }`}
            >
              <span>{type}</span>
              {hasModel && (
                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-black' : 'bg-emerald-400'}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* 3D Interactive Canvas Viewport */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className="relative h-52 w-full bg-gradient-to-b from-neutral-900 via-neutral-950 to-black overflow-hidden select-none flex items-center justify-center"
      >
        {is3DActive ? (
          <>
            <Canvas shadows gl={{ antialias: true, powerPreference: 'default' }}>
              <PerspectiveCamera makeDefault position={[0, 1.4, 2.8]} fov={45} />
              <OrbitControls
                enableDamping
                dampingFactor={0.08}
                rotateSpeed={0.6}
                minDistance={1.2}
                maxDistance={8}
                autoRotate={autoRotate}
                autoRotateSpeed={2.5}
                target={[0, 0.4, 0]}
              />
              <ambientLight intensity={0.8} />
              <directionalLight position={[5, 8, 5]} intensity={1.2} />
              <pointLight position={[-4, 4, -4]} intensity={0.6} color="#60a5fa" />
              <pointLight position={[4, 2, 4]} intensity={0.4} color="#f59e0b" />

              <React.Suspense fallback={null}>
                <PieceMeshRender
                  type={selectedPieceType}
                  model={currentModel}
                  r2Url={resolvePieceR2Url(selectedPieceType, previewSide, settings.pieceGlbUrls)}
                  color={previewSide === 'white' ? '#f5f5f5' : '#1e293b'}
                  wireframe={wireframe}
                  onStatsLoaded={setMeshStats}
                  onLoadStatusChange={(status, err) => {
                    setLoadStatus(status);
                    setLoadErrorMsg(err || null);
                  }}
                />
              </React.Suspense>
            </Canvas>

            <button
              onClick={() => setIs3DActive(false)}
              className="absolute bottom-2 right-2 z-10 px-2 py-1 bg-black/80 hover:bg-black text-[9px] font-mono text-zinc-400 hover:text-white rounded border border-zinc-700 transition-colors"
            >
              Close 3D Turntable
            </button>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
            <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl font-black mb-3 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
              {selectedPieceType[0].toUpperCase()}
            </div>
            <div className="text-xs font-bold text-white uppercase tracking-wider mb-1">
              {settings.pieceNames[selectedPieceType] || selectedPieceType}
            </div>
            <div className="text-[10px] font-mono text-zinc-400 mb-3">
              {resolvePieceR2Url(selectedPieceType, previewSide, settings.pieceGlbUrls) ? 'Cloudflare R2 .GLB Linked' : 'Procedural Geometric Mesh'}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIs3DActive(true)}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded text-[10px] uppercase tracking-wider font-mono transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles size={12} />
                <span>Launch 3D Turntable</span>
              </button>
              <button
                onClick={() => onOpenFullModal(selectedPieceType)}
                className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-[10px] uppercase tracking-wider font-mono transition-all border border-white/20 active:scale-95 cursor-pointer"
              >
                Inspect
              </button>
            </div>
          </div>
        )}

        {/* Drag and Drop Hover Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-sleek-accent/25 backdrop-blur-sm border-2 border-dashed border-sleek-accent flex flex-col items-center justify-center p-4 z-20 pointer-events-none">
            <Upload size={32} className="text-sleek-accent mb-2 animate-bounce" />
            <span className="text-xs font-black uppercase text-white tracking-wider">
              Drop .FBX, .OBJ or Maps for {selectedPieceType.toUpperCase()}
            </span>
            <span className="text-[9px] text-white/80 font-mono mt-1">
              Supports single files and batch multi-texture drops
            </span>
          </div>
        )}

        {/* Loading / Status Badge */}
        <div className="absolute top-2 left-2 z-10 pointer-events-none flex flex-col gap-1">
          {loadStatus === 'loading' && (
            <div className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-[9px] font-mono text-amber-300 flex items-center gap-1.5 backdrop-blur-sm">
              <RefreshCw size={10} className="animate-spin" />
              <span>Parsing 3D geometry...</span>
            </div>
          )}
          {loadStatus === 'error' && (
            <div className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-[9px] font-mono text-red-300 flex items-center gap-1.5 backdrop-blur-sm">
              <AlertCircle size={10} />
              <span>{loadErrorMsg || '3D Load Error'}</span>
            </div>
          )}
          {currentModel?.dataUrl && meshStats && (
            <div className="px-2 py-0.5 rounded bg-black/60 border border-white/10 text-[8px] font-mono text-slate-300 backdrop-blur-sm">
              {meshStats.vertexCount.toLocaleString()} verts • {meshStats.meshCount} mesh(es)
            </div>
          )}
        </div>

        {/* Quick Upload Action floating in 3D viewport */}
        <div className="absolute bottom-2 right-2 z-10 flex gap-1">
          <label className="px-2 py-1 rounded bg-black/70 hover:bg-black text-[9px] font-mono font-bold text-sleek-accent border border-sleek-ring hover:border-sleek-accent cursor-pointer flex items-center gap-1 backdrop-blur-sm transition-all">
            <Upload size={11} />
            <span>Upload {currentModel?.dataUrl ? 'New' : '3D'}</span>
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept=".fbx,.obj,image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  onUploadBatch(e.target.files, selectedPieceType);
                }
              }}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* 5 PBR Map Quick-Status Ribbon with Direct Upload */}
      <div className="p-2.5 bg-black/40 border-t border-sleek-border space-y-1.5">
        <div className="flex items-center justify-between text-[9px] text-sleek-muted font-mono uppercase">
          <span className="flex items-center gap-1">
            <ImageIcon size={11} />
            <span>PBR Texture Slots</span>
          </span>
          <span>{mapSlots.filter((m) => m.active).length}/5 Attached</span>
        </div>

        <div className="grid grid-cols-5 gap-1">
          {mapSlots.map((slot) => (
            <label
              key={slot.key}
              className={`flex flex-col items-center justify-center p-1 rounded border text-center cursor-pointer transition-all ${
                slot.active
                  ? 'bg-slate-900 border-slate-700 hover:border-sleek-accent'
                  : 'bg-black/20 border-dashed border-sleek-ring/40 hover:border-sleek-ring text-sleek-muted'
              }`}
              title={slot.active ? `${slot.label} map active. Click to replace.` : `Upload ${slot.label} map`}
            >
              <span className={`text-[8px] font-mono font-bold ${slot.active ? slot.color : 'text-slate-500'}`}>
                {slot.label}
              </span>
              <span className="text-[7px] font-mono mt-0.5">
                {slot.active ? (
                  <span className="text-emerald-400 font-bold">✓ ON</span>
                ) : (
                  <span className="text-slate-600">+ ADD</span>
                )}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUploadMap(selectedPieceType, slot.key, file);
                }}
                className="hidden"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};
