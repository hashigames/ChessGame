import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid } from '@react-three/drei';
import { CustomModel, PieceType, useGameStore } from '../../store/gameStore';
import * as THREE from 'three';
import { motion } from 'motion/react';
import { 
  RotateCw, 
  Eye, 
  Sliders, 
  RefreshCw, 
  X, 
  Shield, 
  Swords, 
  Info, 
  Image as ImageIcon, 
  Activity, 
  Sparkles, 
  Flame, 
  Trash2, 
  Upload, 
  FileCode,
  Zap,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { loadAndNormalizeModel, loadPBRTexture, Loaded3DModelResult } from '../../utils/threeModelLoader';
import { generatePieceModelPreset } from '../../utils/modelPresets';
import { resolvePieceR2Url, loadR2GlbModel, R2_PRESET_MODELS } from '../../utils/r2GlbLoader';

interface ModelPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pieceType: PieceType;
  pieceName: string;
  model: CustomModel;
}

interface PreviewMeshProps {
  model: CustomModel;
  r2Url?: string;
  color: string;
  roughness: number;
  metalness: number;
  onModelLoaded?: (info: { meshCount: number; vertexCount: number }) => void;
}

const PreviewMesh = ({ 
  model, 
  r2Url,
  color, 
  roughness, 
  metalness, 
  onModelLoaded 
}: PreviewMeshProps) => {
  const [loadedObject, setLoadedObject] = useState<THREE.Group | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [textures, setTextures] = useState<Record<string, THREE.Texture | null>>({});

  // 1. Load 3D Mesh (R2 GLB URL priority)
  useEffect(() => {
    let active = true;

    if (r2Url && r2Url.trim() !== '') {
      setError(null);
      loadR2GlbModel(r2Url, 2.0)
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
            if (onModelLoaded) onModelLoaded({ meshCount, vertexCount });
          }
        })
        .catch((err) => {
          console.warn('PreviewMesh R2 error:', err);
          if (active) setError(err.message || 'Failed to load R2 GLB model.');
        });
      return () => {
        active = false;
      };
    }

    if (!model.dataUrl || model.dataUrl.trim() === '') {
      setLoadedObject(null);
      setError(null);
      return;
    }

    setError(null);

    loadAndNormalizeModel(model.dataUrl, model.fileType || 'obj', 2.0, true)
      .then((res: Loaded3DModelResult) => {
        if (active) {
          setLoadedObject(res.object as THREE.Group);
          if (onModelLoaded) {
            onModelLoaded({ meshCount: res.meshCount, vertexCount: res.vertexCount });
          }
        }
      })
      .catch((err) => {
        console.error('PreviewMesh load error:', err);
        if (active) {
          setError(err.message || 'Failed to parse 3D file.');
        }
      });

    return () => {
      active = false;
    };
  }, [r2Url, model.dataUrl, model.fileType]);

  // 2. Load PBR Textures
  useEffect(() => {
    const map = loadPBRTexture(model.mapUrl, true, (tex) => setTextures(prev => ({ ...prev, map: tex })));
    const normalMap = loadPBRTexture(model.normalMapUrl, false, (tex) => setTextures(prev => ({ ...prev, normalMap: tex })));
    const roughnessMap = loadPBRTexture(model.roughnessMapUrl, false, (tex) => setTextures(prev => ({ ...prev, roughnessMap: tex })));
    const metalnessMap = loadPBRTexture(model.metalnessMapUrl, false, (tex) => setTextures(prev => ({ ...prev, metalnessMap: tex })));
    const emissiveMap = loadPBRTexture(model.emissiveMapUrl, true, (tex) => setTextures(prev => ({ ...prev, emissiveMap: tex })));

    setTextures({
      map,
      normalMap,
      roughnessMap,
      metalnessMap,
      emissiveMap,
    });
  }, [model.mapUrl, model.normalMapUrl, model.roughnessMapUrl, model.metalnessMapUrl, model.emissiveMapUrl]);

  // 3. Keep mesh materials in sync
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
      roughness: textures.roughnessMap ? 1.0 : roughness,
      metalness: textures.metalnessMap ? 1.0 : metalness,
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
  }, [loadedObject, textures, color, roughness, metalness]);

  if (error) {
    return (
      <group position={[0, 0.5, 0]}>
        <mesh>
          <boxGeometry args={[1, 1.5, 1]} />
          <meshStandardMaterial color="#ef4444" roughness={0.4} metalness={0.2} wireframe />
        </mesh>
      </group>
    );
  }

  if (!loadedObject) {
    return (
      <group position={[0, 0.6, 0]}>
        <mesh>
          <cylinderGeometry args={[0.4, 0.45, 1.2, 16]} />
          <meshStandardMaterial color="#06b6d4" wireframe transparent opacity={0.6} />
        </mesh>
      </group>
    );
  }

  return <primitive object={loadedObject} />;
};

// Texture upload tile
interface TextureTileProps {
  label: string;
  sublabel: string;
  textureUrl?: string;
  onUpload: (file: File) => void;
  onRemove: () => void;
  icon: React.ReactNode;
}

const TextureTile: React.FC<TextureTileProps> = ({
  label,
  sublabel,
  textureUrl,
  onUpload,
  onRemove,
  icon,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-black/25 hover:bg-black/40 border border-sleek-ring rounded-lg p-2 flex items-center justify-between transition-all group">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className={`w-8 h-8 rounded border flex items-center justify-center shrink-0 overflow-hidden relative ${
          textureUrl ? 'border-sleek-accent/40 bg-sleek-accent/10' : 'border-sleek-ring bg-black/40 text-sleek-muted'
        }`}>
          {textureUrl ? (
            <img src={textureUrl} alt={label} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            icon
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase font-bold tracking-wider text-white truncate">{label}</div>
          <div className="text-[8px] text-sleek-muted font-mono truncate">{sublabel}</div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {textureUrl ? (
          <button
            onClick={onRemove}
            className="p-1.5 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded transition-colors"
            title="Remove map texture"
          >
            <Trash2 size={13} />
          </button>
        ) : (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 hover:bg-sleek-accent/20 text-sleek-accent hover:text-white rounded transition-colors"
              title="Upload texture map"
            >
              <Upload size={13} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
              }}
              accept="image/*"
              className="hidden"
            />
          </>
        )}
      </div>
    </div>
  );
};

export const ModelPreviewModal: React.FC<ModelPreviewModalProps> = ({
  isOpen,
  onClose,
  pieceType,
  pieceName,
  model,
}) => {
  const { settings, updateSettings } = useGameStore();
  const [sideColor, setSideColor] = useState<'white' | 'black'>('white');
  const [roughness, setRoughness] = useState<number>(0.15);
  const [metalness, setMetalness] = useState<number>(0.75);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [resetKey, setResetKey] = useState<number>(0);
  const [modelStats, setModelStats] = useState<{ meshCount: number; vertexCount: number } | null>(null);

  const activeModel = settings.pieceModels[pieceType] || model;
  const pieceColor = sideColor === 'white' ? '#f5f5f5' : '#1e1e1e';

  const handleTextureUpload = (
    key: 'mapUrl' | 'normalMapUrl' | 'roughnessMapUrl' | 'metalnessMapUrl' | 'emissiveMapUrl',
    file: File
  ) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        updateSettings({
          pieceModels: {
            ...settings.pieceModels,
            [pieceType]: {
              ...activeModel,
              [key]: result,
            },
          },
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveTexture = (
    key: 'mapUrl' | 'normalMapUrl' | 'roughnessMapUrl' | 'metalnessMapUrl' | 'emissiveMapUrl'
  ) => {
    const updatedModel = { ...activeModel };
    delete updatedModel[key];
    updateSettings({
      pieceModels: {
        ...settings.pieceModels,
        [pieceType]: updatedModel,
      },
    });
  };

  const handlePreloadSamplePreset = (theme: 'cyberpunk' | 'gothic' | 'synthwave' | 'imperial' | 'darkfantasy') => {
    const preset = generatePieceModelPreset(pieceType, theme);
    updateSettings({
      pieceModels: {
        ...settings.pieceModels,
        [pieceType]: preset,
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md" id="model-preview-modal-overlay">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-5xl bg-sleek-surface border border-sleek-border rounded-xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[94vh] md:h-[700px]"
        id="model-preview-modal-content"
      >
        {/* Left Side: ThreeJS 3D Viewport */}
        <div className="flex-1 h-[320px] md:h-full bg-slate-950/60 relative border-b md:border-b-0 md:border-r border-sleek-border">
          {/* Instructions Overlay */}
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 pointer-events-none">
            <span className="text-[10px] font-mono tracking-wider text-sleek-accent uppercase bg-black/50 px-2.5 py-1 rounded border border-sleek-accent/30 font-bold">
              3D Studio Inspector
            </span>
            <span className="text-[9px] text-sleek-muted font-mono mt-1 bg-black/40 px-2 py-1 rounded">
              • Left click & drag: Rotate 360°<br />
              • Scroll: Zoom in / out
            </span>
          </div>

          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              className={`p-2 rounded border transition-colors flex items-center justify-center ${
                autoRotate
                  ? 'bg-sleek-accent/20 text-sleek-accent border-sleek-accent/40'
                  : 'bg-black/50 text-sleek-muted border-sleek-ring hover:text-white'
              }`}
              title="Toggle Auto Rotation"
            >
              <RotateCw size={15} className={autoRotate ? 'animate-spin-slow' : ''} />
            </button>
            <button
              onClick={() => setResetKey((prev) => prev + 1)}
              className="p-2 rounded bg-black/50 border border-sleek-ring text-sleek-muted hover:text-white transition-colors"
              title="Reset Camera Position"
            >
              <RefreshCw size={15} />
            </button>
          </div>

          <Canvas shadows className="w-full h-full">
            <PerspectiveCamera makeDefault position={[0, 1.8, 3.4]} fov={45} key={resetKey} />
            
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 10, 5]} intensity={1.4} castShadow />
            <pointLight position={[-5, 5, -5]} intensity={0.8} />
            <spotLight position={[0, 8, 2]} intensity={0.9} angle={Math.PI / 6} penumbra={1} />

            <React.Suspense fallback={null}>
              <PreviewMesh
                model={activeModel}
                r2Url={resolvePieceR2Url(pieceType, sideColor, settings.pieceGlbUrls)}
                color={pieceColor}
                roughness={roughness}
                metalness={metalness}
                onModelLoaded={setModelStats}
              />
            </React.Suspense>

            <Grid
              renderOrder={-1}
              position={[0, 0, 0]}
              args={[10.5, 10.5]}
              cellSize={0.5}
              cellThickness={0.5}
              cellColor="#334155"
              sectionSize={2.5}
              sectionThickness={1}
              sectionColor="#06b6d4"
              fadeDistance={10}
              infiniteGrid
            />

            <OrbitControls
              enableDamping
              dampingFactor={0.08}
              rotateSpeed={0.6}
              minDistance={1.0}
              maxDistance={14}
              autoRotate={autoRotate}
              autoRotateSpeed={2.5}
            />
          </Canvas>

          <div className="absolute bottom-4 left-4 pointer-events-none flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sleek-accent animate-pulse" />
            <span className="text-[9px] font-mono tracking-widest text-sleek-muted uppercase bg-black/60 px-2 py-0.5 rounded border border-sleek-ring">
              {resolvePieceR2Url(pieceType, sideColor, settings.pieceGlbUrls) ? 'Format: CLOUDFLARE R2 .GLB' : `Format: ${activeModel.fileType.toUpperCase()}`} {modelStats ? `• ${modelStats.vertexCount} Verts` : ''}
            </span>
          </div>
        </div>

        {/* Right Side: Configuration Sidebar */}
        <div className="w-full md:w-[380px] bg-sleek-surface p-5 flex flex-col justify-between overflow-y-auto border-l border-sleek-border">
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-sleek-accent">
                  Interactive 3D Configurator
                </span>
                <h3 className="text-lg font-black text-white mt-0.5 uppercase truncate max-w-[260px]">
                  {pieceType} ({pieceName})
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-white/10 text-sleek-muted hover:text-white rounded transition-colors shrink-0"
                id="close-preview-modal-btn"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Preload Sample Bar */}
            <div className="p-2.5 bg-sleek-accent/10 border border-sleek-accent/30 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-[9px] font-bold text-sleek-accent uppercase">
                <span className="flex items-center gap-1">
                  <Zap size={11} />
                  Preload Sample 3D Model
                </span>
                <span className="text-[8px] font-mono text-sleek-muted">1-Click</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => handlePreloadSamplePreset('cyberpunk')}
                  className="px-2 py-1 bg-black/40 hover:bg-sleek-accent hover:text-black text-[8px] font-mono rounded border border-sleek-ring text-white transition-colors uppercase font-bold"
                >
                  ⚡ Mecha
                </button>
                <button
                  onClick={() => handlePreloadSamplePreset('gothic')}
                  className="px-2 py-1 bg-black/40 hover:bg-amber-500 hover:text-black text-[8px] font-mono rounded border border-sleek-ring text-white transition-colors uppercase font-bold"
                >
                  🏰 Gothic
                </button>
                <button
                  onClick={() => handlePreloadSamplePreset('synthwave')}
                  className="px-2 py-1 bg-black/40 hover:bg-pink-500 hover:text-black text-[8px] font-mono rounded border border-sleek-ring text-white transition-colors uppercase font-bold"
                >
                  🪩 Synth
                </button>
              </div>
            </div>

            {/* Model File Metadata Card */}
            <div className="bg-black/30 border border-sleek-ring rounded-lg p-3 space-y-1 text-xs font-mono">
              <div className="flex justify-between items-center text-[10px] text-sleek-muted uppercase font-bold tracking-wider mb-1">
                <span className="flex items-center gap-1 font-sans">
                  <FileCode size={11} className="text-sleek-accent" />
                  Asset State
                </span>
                <span className="text-emerald-400 font-mono text-[8px] uppercase bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold">
                  ACTIVE
                </span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-sleek-muted">Model Name:</span>
                <span className="text-white truncate max-w-[180px]" title={activeModel.name}>
                  {activeModel.name}
                </span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-sleek-muted">Mesh Format:</span>
                <span className="text-sleek-accent uppercase font-bold">{activeModel.fileType}</span>
              </div>
            </div>

            {/* 5-Slot PBR Texture Upload Section */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-sleek-accent uppercase font-bold tracking-widest flex items-center gap-1.5">
                  <Sliders size={12} />
                  PBR Texture Maps (5 Slots)
                </label>
                <span className="text-[8px] text-sleek-muted font-mono">PBR Material Pipeline</span>
              </div>

              <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1 custom-scrollbar">
                <TextureTile
                  label="1. Base Color (Albedo)"
                  sublabel="Color / Diffuse Map"
                  textureUrl={activeModel.mapUrl}
                  onUpload={(file) => handleTextureUpload('mapUrl', file)}
                  onRemove={() => handleRemoveTexture('mapUrl')}
                  icon={<ImageIcon size={13} />}
                />
                <TextureTile
                  label="2. Normal Map"
                  sublabel="Surface Relief & Vectors"
                  textureUrl={activeModel.normalMapUrl}
                  onUpload={(file) => handleTextureUpload('normalMapUrl', file)}
                  onRemove={() => handleRemoveTexture('normalMapUrl')}
                  icon={<Activity size={13} />}
                />
                <TextureTile
                  label="3. Roughness Map"
                  sublabel="Glossy vs Matte Reflection"
                  textureUrl={activeModel.roughnessMapUrl}
                  onUpload={(file) => handleTextureUpload('roughnessMapUrl', file)}
                  onRemove={() => handleRemoveTexture('roughnessMapUrl')}
                  icon={<Sparkles size={13} />}
                />
                <TextureTile
                  label="4. Metallic Map"
                  sublabel="Metallic vs Dielectric"
                  textureUrl={activeModel.metalnessMapUrl}
                  onUpload={(file) => handleTextureUpload('metalnessMapUrl', file)}
                  onRemove={() => handleRemoveTexture('metalnessMapUrl')}
                  icon={<Shield size={13} />}
                />
                <TextureTile
                  label="5. Emission Map"
                  sublabel="Glow / Self-Illumination"
                  textureUrl={activeModel.emissiveMapUrl}
                  onUpload={(file) => handleTextureUpload('emissiveMapUrl', file)}
                  onRemove={() => handleRemoveTexture('emissiveMapUrl')}
                  icon={<Flame size={13} />}
                />
              </div>
            </div>

            {/* Color / Side Selector */}
            <div>
              <label className="text-[10px] text-sleek-muted block mb-1.5 uppercase font-bold tracking-wider">
                Preview Color Side
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSideColor('white')}
                  className={`py-1.5 px-3 rounded text-[10px] font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    sideColor === 'white'
                      ? 'bg-white text-black border-white'
                      : 'bg-black/30 text-sleek-muted border-sleek-ring hover:text-white'
                  }`}
                >
                  <Shield size={12} />
                  White Side
                </button>
                <button
                  onClick={() => setSideColor('black')}
                  className={`py-1.5 px-3 rounded text-[10px] font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    sideColor === 'black'
                      ? 'bg-zinc-800 text-white border-zinc-600'
                      : 'bg-black/30 text-sleek-muted border-sleek-ring hover:text-white'
                  }`}
                >
                  <Swords size={12} />
                  Black Side
                </button>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-sleek-border mt-4">
            <button
              onClick={onClose}
              className="w-full bg-sleek-accent hover:bg-yellow-500 text-black py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all active:scale-[0.98] shadow-lg shadow-sleek-accent/20"
            >
              Apply & Return
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
