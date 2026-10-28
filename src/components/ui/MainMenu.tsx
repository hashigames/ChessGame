import React, { useState, useRef, useEffect } from 'react';
import { useGameStore, PieceType, CustomModel } from '../../store/gameStore';
import { 
  Settings, 
  Map, 
  Skull, 
  Layout, 
  Zap, 
  Heart, 
  Cloud, 
  Plus, 
  Activity, 
  Eye, 
  Volume2, 
  VolumeX, 
  Upload, 
  Trash2, 
  Sparkles, 
  Shield, 
  Flame, 
  Image as ImageIcon, 
  FileCode, 
  Download, 
  FolderUp, 
  CheckCircle2, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp,
  Layers,
  Database,
  Info,
  LogIn,
  LogOut,
  User as UserIcon,
  HardDrive,
  Cpu,
  AlertCircle,
  Link2,
  Globe,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ModelPreviewModal } from './ModelPreviewModal';
import { EmbeddedModelViewer } from './EmbeddedModelViewer';
import { parseAssetFilesBatch, detectPieceType, detectAssetRole } from '../../utils/assetParser';
import { generatePieceModelPreset } from '../../utils/modelPresets';
import { 
  R2_PRESET_MODELS, 
  DEFAULT_PIECE_GLB_URLS, 
  resolvePieceR2Url, 
  preloadGameR2Models, 
  R2ModelPreset 
} from '../../utils/r2GlbLoader';
import { auth, signInWithGoogle, signOutUser } from '../../utils/firebase';
import { clearModelCaches } from '../../utils/threeModelLoader';
import { onAuthStateChanged, User } from 'firebase/auth';
import { DEFAULT_TRACKS } from '../../utils/audioLibrary';

export const MainMenu = () => {
    const { 
      settings, 
      updateSettings, 
      board, 
      isSyncing, 
      syncProgress,
      lastSynced, 
      syncError, 
      saveSettingsToCloud,
      loadSettingsFromCloud 
    } = useGameStore();

    const [isOpen, setIsOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<'pieces' | 'firebase' | 'general' | 'atmosphere'>('pieces');
    const [selectedPieceType, setSelectedPieceType] = useState<PieceType>('pawn');
    const [previewPiece, setPreviewPiece] = useState<{ type: PieceType; name: string; model: any } | null>(null);
    const [expandedMaps, setExpandedMaps] = useState<Record<PieceType, boolean>>({
      pawn: false,
      rook: false,
      knight: false,
      bishop: false,
      queen: false,
      king: false,
    });
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [isProcessingBatch, setIsProcessingBatch] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
      try {
        return auth?.currentUser || null;
      } catch (e) {
        return null;
      }
    });
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // Cloudflare R2 GLB Linking states
    const [r2UrlInput, setR2UrlInput] = useState('');
    const [targetSide, setTargetSide] = useState<'white' | 'black' | 'both'>('both');
    const [isPresetDrawerOpen, setIsPresetDrawerOpen] = useState(false);

    const batchFileInputRef = useRef<HTMLInputElement>(null);
    const jsonImportInputRef = useRef<HTMLInputElement>(null);

    const pieceTypes: PieceType[] = ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king'];

    const handleEquipPreset = (preset: R2ModelPreset, targetPiece?: PieceType) => {
      const piece = targetPiece || selectedPieceType;
      const newUrls = {
        ...(settings.pieceGlbUrls || {}),
        [`${piece}_${preset.side}`]: preset.url,
      };
      updateSettings({ pieceGlbUrls: newUrls });
      setStatusMessage(`Equipped ${preset.name} to ${preset.side.toUpperCase()} ${piece.toUpperCase()}!`);
      setTimeout(() => setStatusMessage(null), 4000);
    };

    const handleEquipCustomUrl = (targetPiece: PieceType, side: 'white' | 'black' | 'both', url: string) => {
      if (!url || !url.trim().startsWith('http')) {
        alert('Please enter a valid URL starting with https:// (e.g. https://...r2.dev/model.glb)');
        return;
      }
      const cleanUrl = url.trim();
      const newUrls = { ...(settings.pieceGlbUrls || {}) };
      if (side === 'both') {
        newUrls[`${targetPiece}_white`] = cleanUrl;
        newUrls[`${targetPiece}_black`] = cleanUrl;
        newUrls[targetPiece] = cleanUrl;
      } else {
        newUrls[`${targetPiece}_${side}`] = cleanUrl;
      }
      updateSettings({ pieceGlbUrls: newUrls });
      setR2UrlInput('');
      setStatusMessage(`Linked R2 URL to ${targetPiece.toUpperCase()} (${side.toUpperCase()})!`);
      setTimeout(() => setStatusMessage(null), 4000);
    };

    const handleEquipFullRoyalArmy = async () => {
      updateSettings({ pieceGlbUrls: { ...DEFAULT_PIECE_GLB_URLS } });
      setStatusMessage('Equipping full 12-model Royal Army from Cloudflare R2...');
      try {
        await preloadGameR2Models(DEFAULT_PIECE_GLB_URLS);
        await saveSettingsToCloud();
        setStatusMessage('All 12 Meshy AI Royal Army models equipped & backed up to Cloud DB!');
      } catch (err: any) {
        setStatusMessage('12 Royal Army models equipped!');
      }
      setTimeout(() => setStatusMessage(null), 5000);
    };

    useEffect(() => {
      if (!auth) return;
      try {
        const unsub = onAuthStateChanged(auth, (user) => {
          setCurrentUser(user);
        });
        return () => unsub();
      } catch (err) {
        console.warn('Auth listener error in MainMenu:', err);
      }
    }, []);

    const themes = [
        { id: 'park', icon: <Map size={14} />, label: 'Green Park' },
        { id: 'cemetery', icon: <Skull size={14} />, label: 'Cemetery' },
        { id: 'temple', icon: <Layout size={14} />, label: 'Temple' },
        { id: 'underworld', icon: <Zap size={14} />, label: 'Underworld' },
        { id: 'heaven', icon: <Heart size={14} />, label: 'Heaven' },
        { id: 'snow', icon: <Cloud size={14} />, label: 'Snow' },
    ];

    // Preload single piece preset
    const handlePreloadSinglePiece = (type: PieceType, theme: 'cyberpunk' | 'gothic' | 'synthwave' | 'imperial' | 'darkfantasy' = 'cyberpunk') => {
        const pieceModel = generatePieceModelPreset(type, theme);
        setSelectedPieceType(type);
        updateSettings({
            pieceModels: {
                ...settings.pieceModels,
                [type]: pieceModel
            }
        });
        setStatusMessage(`Preloaded 3D ${type.toUpperCase()} model!`);
        setTimeout(() => setStatusMessage(null), 3000);
    };

    // Single 3D Mesh Upload
    const handleMeshUpload = (type: PieceType, file: File) => {
        const reader = new FileReader();
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (extension !== 'obj' && extension !== 'fbx') {
            alert('Please upload only .obj or .fbx 3D model files.');
            return;
        }
        
        setSelectedPieceType(type);
        reader.onload = (e) => {
            const result = e.target?.result;
            if (typeof result === 'string') {
                const existing = settings.pieceModels[type];
                const updatedModel: CustomModel = {
                    name: file.name,
                    dataUrl: result,
                    fileType: extension as 'fbx' | 'obj',
                    mapUrl: existing?.mapUrl,
                    normalMapUrl: existing?.normalMapUrl,
                    roughnessMapUrl: existing?.roughnessMapUrl,
                    metalnessMapUrl: existing?.metalnessMapUrl,
                    emissiveMapUrl: existing?.emissiveMapUrl,
                };
                
                updateSettings({
                    pieceModels: {
                        ...settings.pieceModels,
                        [type]: updatedModel
                    }
                });
                setStatusMessage(`Loaded custom ${extension.toUpperCase()} for ${type.toUpperCase()}!`);
                setTimeout(() => setStatusMessage(null), 3000);
            }
        };
        reader.readAsDataURL(file);
    };

    // Single Map Upload
    const handleMapUpload = (
      type: PieceType, 
      mapSlot: 'mapUrl' | 'normalMapUrl' | 'roughnessMapUrl' | 'metalnessMapUrl' | 'emissiveMapUrl', 
      file: File
    ) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result;
            if (typeof result === 'string') {
                const existing = settings.pieceModels[type] || {
                    name: `${type.toUpperCase()} Custom`,
                    dataUrl: '',
                    fileType: 'obj' as const,
                };

                const updatedModel: CustomModel = {
                    ...existing,
                    [mapSlot]: result,
                };

                updateSettings({
                    pieceModels: {
                        ...settings.pieceModels,
                        [type]: updatedModel
                    }
                });
                setStatusMessage(`Applied texture map to ${type.toUpperCase()}!`);
                setTimeout(() => setStatusMessage(null), 3000);
            }
        };
        reader.readAsDataURL(file);
    };

    // Remove single map texture
    const handleRemoveMap = (
      type: PieceType, 
      mapSlot: 'mapUrl' | 'normalMapUrl' | 'roughnessMapUrl' | 'metalnessMapUrl' | 'emissiveMapUrl'
    ) => {
        const existing = settings.pieceModels[type];
        if (!existing) return;

        const updatedModel: CustomModel = { ...existing };
        delete updatedModel[mapSlot];

        const hasMaps = updatedModel.mapUrl || updatedModel.normalMapUrl || updatedModel.roughnessMapUrl || updatedModel.metalnessMapUrl || updatedModel.emissiveMapUrl;
        const hasMesh = updatedModel.dataUrl && updatedModel.dataUrl.trim().length > 0;

        updateSettings({
            pieceModels: {
                ...settings.pieceModels,
                [type]: (hasMesh || hasMaps) ? updatedModel : null
            }
        });
    };

    // Remove entire piece model (mesh and maps)
    const handleRemoveModel = (type: PieceType) => {
        updateSettings({
            pieceModels: {
                ...settings.pieceModels,
                [type]: null
            }
        });
    };

    // Batch Upload all pieces & maps at once
    const handleBatchFiles = async (files: FileList | File[], targetPiece?: PieceType) => {
        const fileArr = Array.from(files);
        if (fileArr.length === 0) return;

        const effectiveTargetPiece = targetPiece || selectedPieceType;
        setIsProcessingBatch(true);
        setStatusMessage('Processing 3D files & PBR texture maps...');

        try {
            const result = await parseAssetFilesBatch(fileArr, settings.pieceModels, effectiveTargetPiece);
            updateSettings({
                pieceModels: result.updatedModels
            });
            
            if (result.primaryAffectedPiece) {
                setSelectedPieceType(result.primaryAffectedPiece);
            }
            
            setStatusMessage(`Imported ${result.matchedCount} asset(s) to ${result.primaryAffectedPiece.toUpperCase()}!`);
            setTimeout(() => setStatusMessage(null), 5000);
        } catch (err: any) {
            console.error('Batch upload error:', err);
            setStatusMessage('Upload error: ' + (err.message || 'Unknown error'));
        } finally {
            setIsProcessingBatch(false);
        }
    };

    // Export complete 3D configuration as JSON backup file
    const handleExportBackup = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `chess_3d_assets_backup_${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    };

    // Import configuration from JSON backup file
    const handleImportBackup = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target?.result as string);
                if (parsed && typeof parsed === 'object') {
                    updateSettings(parsed);
                    setStatusMessage('Assets backup imported successfully! Stored for next session.');
                    setTimeout(() => setStatusMessage(null), 4000);
                }
            } catch (err) {
                alert('Invalid JSON backup file.');
            }
        };
        reader.readAsText(file);
    };

    const handleClearCaches = () => {
      clearModelCaches();
      setStatusMessage('3D GPU Caches cleared and memory optimized!');
      setTimeout(() => setStatusMessage(null), 3000);
    };

    const toggleMapsExpansion = (type: PieceType) => {
        setExpandedMaps(prev => ({ ...prev, [type]: !prev[type] }));
    };

    if (!isOpen) return (
        <button 
            onClick={() => setIsOpen(true)}
            className="fixed top-20 left-4 z-40 w-10 h-10 bg-sleek-surface border border-sleek-border flex items-center justify-center text-white hover:bg-sleek-accent hover:text-black transition-all rounded shadow-lg group"
            title="Open Asset & Game Inspector"
        >
            <Settings size={20} className="group-hover:rotate-45 transition-transform" />
        </button>
    );

    return (
        <>
            <aside className="fixed left-0 top-14 bottom-12 w-84 md:w-[420px] z-50 bg-sleek-surface border-r border-sleek-border flex flex-col font-sans overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-3 text-[10px] uppercase font-bold text-sleek-muted border-b border-sleek-border flex justify-between items-center bg-black/40">
                <div className="flex items-center gap-2">
                    <Database size={13} className="text-sleek-accent" />
                    <span className="text-white tracking-wider font-bold">3D Character Vault & Studio</span>
                </div>
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="hover:text-white p-1 rounded transition-colors text-sleek-muted"
                  title="Close Inspector"
                >
                  ✕
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {/* Navigation Tabs */}
                <div className="flex gap-1 bg-sleek-card p-1 rounded-lg border border-sleek-border">
                    {[
                      { id: 'pieces', label: 'Pieces 3D', icon: <Layers size={11} /> },
                      { id: 'firebase', label: 'Firebase Vault', icon: <Database size={11} /> },
                      { id: 'general', label: 'General', icon: <Settings size={11} /> },
                      { id: 'atmosphere', label: 'Theme', icon: <Map size={11} /> },
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 py-1.5 text-[9px] uppercase font-bold rounded transition-all flex items-center justify-center gap-1 ${
                              activeTab === tab.id 
                                ? 'bg-sleek-accent text-black shadow-sm font-black' 
                                : 'text-sleek-muted hover:text-white'
                            }`}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {/* -------------------- PIECES TAB -------------------- */}
                    {activeTab === 'pieces' && (
                        <motion.div 
                            key="pieces" 
                            initial={{ opacity: 0, x: -10 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            className="space-y-4"
                        >
                            {/* Live Interactive 3D Model Studio Viewport in Same Panel */}
                            <EmbeddedModelViewer
                              selectedPieceType={selectedPieceType}
                              onSelectPieceType={setSelectedPieceType}
                              onOpenFullModal={(type) => {
                                setPreviewPiece({
                                  type,
                                  name: settings.pieceNames[type] || type,
                                  model: settings.pieceModels[type]
                                });
                              }}
                              onUploadBatch={handleBatchFiles}
                              onUploadMap={handleMapUpload}
                              onRemoveMap={handleRemoveMap}
                            />

                            {/* Cloudflare R2 .GLB Armory Hero Zone */}
                            <div className="bg-gradient-to-br from-amber-500/15 via-sleek-card to-black/50 border border-sleek-accent/40 rounded-xl p-3.5 space-y-3 shadow-xl">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-sleek-accent flex items-center justify-center text-black font-black shadow-md">
                                            <Globe size={15} />
                                        </div>
                                        <div>
                                            <span className="text-[11px] font-bold text-white uppercase tracking-wider block">
                                                Cloudflare R2 .GLB Vault
                                            </span>
                                            <span className="text-[8px] text-sleek-muted font-mono">
                                                Link CDN character meshes directly into Three.js
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-[8px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold uppercase">
                                        R2 Connected
                                    </span>
                                </div>

                                {/* Quick Action: Equip Full 12-Model Royal Army */}
                                <div className="p-2.5 bg-black/40 border border-sleek-accent/30 rounded-lg space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] uppercase font-bold text-white flex items-center gap-1.5">
                                            <Sparkles size={11} className="text-sleek-accent" />
                                            <span>Full 12-Model Royal Army (Meshy AI)</span>
                                        </span>
                                        <span className="text-[8px] font-mono text-sleek-accent">12 .GLB Models</span>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={handleEquipFullRoyalArmy}
                                            className="flex-1 py-1.5 bg-sleek-accent hover:bg-yellow-400 text-black text-[9px] font-mono font-bold rounded uppercase transition-all shadow-md active:scale-95 flex items-center justify-center gap-1"
                                            title="1-Click: Equip Armored King, Azureblade Knight, Empress of Shadows, and all 12 models"
                                        >
                                            <Zap size={11} />
                                            <span>Equip All 12 R2 Models</span>
                                        </button>
                                        <button
                                            onClick={() => setIsPresetDrawerOpen(!isPresetDrawerOpen)}
                                            className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[9px] font-mono rounded border border-white/20 transition-colors uppercase font-bold flex items-center gap-1"
                                        >
                                            <span>Presets</span>
                                            {isPresetDrawerOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                        </button>
                                    </div>
                                </div>

                                {/* 12 Meshy AI Preset Drawer */}
                                {isPresetDrawerOpen && (
                                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar border-t border-sleek-ring/40 pt-2">
                                        <div className="text-[8px] font-mono uppercase text-sleek-muted flex justify-between">
                                            <span>Select preset for {selectedPieceType.toUpperCase()}:</span>
                                            <span className="text-sleek-accent">12 Models</span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-1">
                                            {R2_PRESET_MODELS.map((p) => {
                                                const isMatchedRole = p.recommendedRole === selectedPieceType;
                                                return (
                                                    <div 
                                                        key={p.id}
                                                        className={`p-1.5 rounded border flex items-center justify-between gap-1 text-[9px] ${
                                                            isMatchedRole 
                                                              ? 'bg-sleek-accent/10 border-sleek-accent/40' 
                                                              : 'bg-black/30 border-sleek-ring/40'
                                                        }`}
                                                    >
                                                        <div className="truncate flex-1">
                                                            <div className="flex items-center gap-1 truncate">
                                                                <span className={`w-1.5 h-1.5 rounded-full ${p.side === 'white' ? 'bg-amber-300' : 'bg-rose-500'}`} />
                                                                <span className="text-white font-medium truncate font-sans">{p.name}</span>
                                                            </div>
                                                            <div className="text-[7.5px] text-sleek-muted font-mono uppercase">
                                                                {p.side} • {p.recommendedRole}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleEquipPreset(p, selectedPieceType)}
                                                            className="px-2 py-0.5 bg-sleek-accent hover:bg-yellow-400 text-black text-[8px] font-mono font-bold rounded uppercase shrink-0 transition-all"
                                                        >
                                                            Equip
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Custom Cloudflare R2 URL Linking Form */}
                                <div className="space-y-1.5 pt-1">
                                    <label className="text-[8px] text-sleek-muted block uppercase font-bold tracking-wider flex items-center justify-between">
                                        <span className="flex items-center gap-1">
                                            <Link2 size={10} className="text-sleek-accent" />
                                            <span>Link Custom R2 .GLB URL</span>
                                        </span>
                                        <span className="text-[8px] font-mono text-sleek-accent">Target: {selectedPieceType.toUpperCase()}</span>
                                    </label>
                                    
                                    <div className="flex items-center gap-1 bg-black/40 border border-sleek-ring rounded-lg p-1">
                                        <div className="flex gap-0.5 shrink-0 bg-black/60 p-0.5 rounded">
                                            {(['white', 'black', 'both'] as const).map((s) => (
                                                <button
                                                    key={s}
                                                    onClick={() => setTargetSide(s)}
                                                    className={`px-1.5 py-0.5 text-[7.5px] uppercase font-mono rounded font-bold transition-colors ${
                                                        targetSide === s ? 'bg-sleek-accent text-black' : 'text-sleek-muted hover:text-white'
                                                    }`}
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                        <input
                                            type="text"
                                            value={r2UrlInput}
                                            onChange={(e) => setR2UrlInput(e.target.value)}
                                            placeholder="https://...r2.dev/mesh.glb"
                                            className="w-full bg-transparent px-1.5 py-1 text-[9px] text-white font-mono placeholder:text-zinc-600 outline-none"
                                        />
                                        <button
                                            onClick={() => handleEquipCustomUrl(selectedPieceType, targetSide, r2UrlInput)}
                                            disabled={!r2UrlInput.trim()}
                                            className="px-2.5 py-1 bg-sleek-accent hover:bg-yellow-400 disabled:opacity-30 text-black text-[8px] font-mono font-bold uppercase rounded shrink-0 transition-colors"
                                        >
                                            Link
                                        </button>
                                    </div>
                                </div>

                                {statusMessage && (
                                    <div className="p-2 bg-sleek-accent/10 border border-sleek-accent/30 rounded text-[9px] text-sleek-accent flex items-center gap-1.5 font-mono">
                                        <CheckCircle2 size={12} className="shrink-0" />
                                        <span>{statusMessage}</span>
                                    </div>
                                )}
                            </div>

                            {/* Persistence & Cloud Vault Quick Actions */}
                            <div className="flex items-center justify-between gap-1.5 bg-black/30 border border-sleek-ring rounded-lg p-2 text-[9px]">
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={async () => {
                                            const success = await saveSettingsToCloud();
                                            if (success) {
                                                setStatusMessage('Saved all models & textures to Firestore Cloud Database!');
                                            } else {
                                                setStatusMessage('Saved to local browser database. Sign in with Google to sync to cloud!');
                                            }
                                            setTimeout(() => setStatusMessage(null), 4000);
                                        }}
                                        disabled={isSyncing}
                                        className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded border border-emerald-500/40 font-mono transition-colors font-bold disabled:opacity-50"
                                        title="Save all custom models, textures, and settings to Firestore Database for future sessions"
                                    >
                                        <Cloud size={11} className="text-emerald-400" />
                                        <span>{isSyncing ? 'Saving...' : 'Save to Cloud DB'}</span>
                                    </button>
                                    <button
                                        onClick={handleExportBackup}
                                        className="flex items-center gap-1 px-2 py-1 bg-sleek-card hover:bg-white/10 text-white rounded border border-sleek-ring hover:border-sleek-accent/40 font-mono transition-colors"
                                        title="Export complete 3D models and textures backup as JSON"
                                    >
                                        <Download size={11} className="text-sleek-accent" />
                                        <span>Export</span>
                                    </button>
                                    <label
                                        className="flex items-center gap-1 px-2 py-1 bg-sleek-card hover:bg-white/10 text-white rounded border border-sleek-ring hover:border-sleek-accent/40 font-mono transition-colors cursor-pointer"
                                        title="Import backup JSON"
                                    >
                                        <Upload size={11} className="text-sleek-accent" />
                                        <span>Import</span>
                                        <input 
                                            type="file"
                                            ref={jsonImportInputRef}
                                            accept=".json"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleImportBackup(file);
                                            }}
                                            className="hidden"
                                        />
                                    </label>
                                </div>

                                <button
                                    onClick={() => setActiveTab('firebase')}
                                    className="flex items-center gap-1 px-2 py-1 bg-sleek-accent/15 hover:bg-sleek-accent/25 text-sleek-accent rounded border border-sleek-accent/30 font-mono transition-colors font-bold"
                                >
                                    <Database size={11} />
                                    <span>Cloud Vault</span>
                                </button>
                            </div>

                            {/* Piece Cards List */}
                            <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
                                {pieceTypes.map(type => {
                                    const model = settings.pieceModels?.[type];
                                    const isExpanded = expandedMaps[type];

                                    const activeMapCount = model ? [
                                      model.mapUrl, 
                                      model.normalMapUrl, 
                                      model.roughnessMapUrl, 
                                      model.metalnessMapUrl, 
                                      model.emissiveMapUrl
                                    ].filter(Boolean).length : 0;

                                    return (
                                        <div 
                                          key={type} 
                                          onClick={() => setSelectedPieceType(type)}
                                          className={`p-3 bg-sleek-card rounded-xl space-y-3 transition-all cursor-pointer ${
                                            selectedPieceType === type 
                                              ? 'border-2 border-sleek-accent shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-sleek-accent/30' 
                                              : 'border border-sleek-ring hover:border-sleek-accent/50'
                                          }`}
                                        >
                                            {/* Header */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black uppercase shadow transition-colors ${
                                                      selectedPieceType === type ? 'bg-sleek-accent text-black' : 'bg-black/60 text-sleek-accent border border-sleek-ring'
                                                    }`}>
                                                        {type[0]}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                          <span className="text-xs font-bold text-white uppercase tracking-wider block">
                                                            {type}
                                                          </span>
                                                          {selectedPieceType === type && (
                                                            <span className="text-[7px] bg-sleek-accent text-black font-black px-1 py-0.2 rounded uppercase">
                                                              Viewing
                                                            </span>
                                                          )}
                                                        </div>
                                                        <span className="text-[8px] text-sleek-muted font-mono">
                                                          {model?.dataUrl ? `${model.fileType.toUpperCase()} Active` : 'Default Mesh'} • {activeMapCount} Maps
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                    <button 
                                                        onClick={() => handlePreloadSinglePiece(type, 'cyberpunk')}
                                                        className="px-1.5 py-1 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-300 hover:text-black rounded border border-indigo-500/30 text-[8px] font-mono font-bold uppercase transition-all flex items-center gap-1"
                                                        title="Preload sample 3D Model with PBR Maps"
                                                    >
                                                        <Zap size={10} />
                                                        <span>Preset</span>
                                                    </button>

                                                    <button 
                                                        onClick={() => {
                                                          setSelectedPieceType(type);
                                                          if (model) {
                                                            setPreviewPiece({
                                                              type,
                                                              name: settings.pieceNames[type] || type,
                                                              model
                                                            });
                                                          }
                                                        }}
                                                        className="flex items-center gap-1 px-2 py-1 bg-sleek-accent/10 hover:bg-sleek-accent text-sleek-accent hover:text-black rounded border border-sleek-accent/30 text-[9px] font-bold uppercase transition-all"
                                                        title="Focus in 3D Viewport"
                                                    >
                                                        <Eye size={12} />
                                                        <span>Inspect</span>
                                                    </button>

                                                    {model && (
                                                        <button 
                                                            onClick={() => handleRemoveModel(type)}
                                                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded border border-red-500/20 transition-colors"
                                                            title="Clear custom mesh and maps"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Rename & Weapon Fields */}
                                            <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                                                <div>
                                                    <label className="text-[8px] text-sleek-muted block mb-1 uppercase font-semibold">Name</label>
                                                    <input 
                                                        type="text"
                                                        value={settings.pieceNames[type]}
                                                        onChange={(e) => updateSettings({ pieceNames: { ...settings.pieceNames, [type]: e.target.value } })}
                                                        placeholder="Name"
                                                        className="w-full bg-black/40 border border-sleek-ring rounded px-2 py-1 text-xs text-white focus:border-sleek-accent outline-none transition-colors"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[8px] text-sleek-muted block mb-1 uppercase font-semibold">Weapon</label>
                                                    <input 
                                                        type="text"
                                                        value={settings.pieceWeapons[type]}
                                                        onChange={(e) => updateSettings({ pieceWeapons: { ...settings.pieceWeapons, [type]: e.target.value } })}
                                                        placeholder="Weapon"
                                                        className="w-full bg-black/40 border border-sleek-ring rounded px-2 py-1 text-xs text-white focus:border-sleek-accent outline-none transition-colors"
                                                    />
                                                </div>
                                            </div>

                                            {/* Cloudflare R2 .GLB Mesh Section */}
                                            <div className="space-y-1.5 pt-1">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[8px] text-sleek-muted block uppercase font-bold tracking-wider">
                                                        Cloudflare R2 .GLB Character Mesh
                                                    </label>
                                                    <span className="text-[7.5px] font-mono text-emerald-400 bg-emerald-500/10 px-1 rounded border border-emerald-500/20">
                                                        CDN Powered
                                                    </span>
                                                </div>

                                                {/* White & Black Linked URLs Display */}
                                                <div className="space-y-1">
                                                    {(['white', 'black'] as const).map((side) => {
                                                        const currentUrl = resolvePieceR2Url(type, side, settings.pieceGlbUrls);
                                                        const filename = currentUrl ? currentUrl.split('/').pop()?.replace('.glb', '') : 'Default Mesh';
                                                        return (
                                                            <div 
                                                                key={side}
                                                                className="flex items-center justify-between p-1.5 bg-black/40 border border-sleek-ring rounded text-[8.5px] font-mono"
                                                            >
                                                                <div className="flex items-center gap-1.5 truncate flex-1 pr-1">
                                                                    <span className={`w-2 h-2 rounded-full shrink-0 ${side === 'white' ? 'bg-amber-300' : 'bg-rose-500'}`} />
                                                                    <span className="text-sleek-muted uppercase font-bold shrink-0">{side}:</span>
                                                                    <span className="text-white truncate" title={currentUrl}>
                                                                        {filename}
                                                                    </span>
                                                                </div>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const matchedPreset = R2_PRESET_MODELS.find(p => p.recommendedRole === type && p.side === side) || R2_PRESET_MODELS[0];
                                                                        handleEquipPreset(matchedPreset, type);
                                                                    }}
                                                                    className="px-1.5 py-0.5 bg-sleek-accent/15 hover:bg-sleek-accent hover:text-black text-sleek-accent text-[7.5px] rounded border border-sleek-accent/30 shrink-0 font-bold uppercase transition-colors"
                                                                    title="Equip matched Meshy AI model"
                                                                >
                                                                    Preset
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* 5 Texture Maps Accordion */}
                                            <div className="border-t border-sleek-border/40 pt-2 space-y-2">
                                                <button
                                                    onClick={() => toggleMapsExpansion(type)}
                                                    className="w-full flex items-center justify-between text-[9px] text-sleek-muted hover:text-white font-bold uppercase tracking-wider py-1 transition-colors"
                                                >
                                                    <span className="flex items-center gap-1.5">
                                                        <ImageIcon size={12} className={activeMapCount > 0 ? 'text-sleek-accent' : 'text-sleek-muted'} />
                                                        <span>Texture Maps (5 Slots)</span>
                                                        <span className="text-[8px] font-mono bg-black/40 px-1 py-0.2 rounded border border-sleek-ring text-sleek-accent">
                                                          {activeMapCount}/5
                                                        </span>
                                                    </span>
                                                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                                </button>

                                                {isExpanded && (
                                                    <div className="space-y-2 pt-1">
                                                        {[
                                                            { key: 'mapUrl' as const, label: 'Diffuse / Base Color Map', color: 'text-emerald-400' },
                                                            { key: 'normalMapUrl' as const, label: 'Normal Bump Map', color: 'text-cyan-400' },
                                                            { key: 'roughnessMapUrl' as const, label: 'Roughness Map', color: 'text-amber-400' },
                                                            { key: 'metalnessMapUrl' as const, label: 'Metallic Map', color: 'text-purple-400' },
                                                            { key: 'emissiveMapUrl' as const, label: 'Emissive Glow Map', color: 'text-rose-400' }
                                                        ].map(({ key, label, color }) => {
                                                            const mapData = model?.[key];
                                                            return (
                                                                <div key={key} className="flex items-center justify-between p-1.5 bg-black/30 border border-sleek-ring/50 rounded">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`w-2 h-2 rounded-full ${mapData ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-sleek-ring'}`} />
                                                                        <span className={`text-[9px] font-mono font-medium ${mapData ? color : 'text-sleek-muted'}`}>
                                                                            {label}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        {mapData ? (
                                                                            <>
                                                                                <label className="p-1 px-1.5 bg-black/40 hover:bg-black text-[8px] text-sleek-accent rounded cursor-pointer transition-colors border border-sleek-ring">
                                                                                    <span>Replace</span>
                                                                                    <input 
                                                                                        type="file"
                                                                                        accept="image/*"
                                                                                        onChange={(e) => {
                                                                                            const file = e.target.files?.[0];
                                                                                            if (file) handleMapUpload(type, key, file);
                                                                                        }}
                                                                                        className="hidden"
                                                                                    />
                                                                                </label>
                                                                                <button
                                                                                    onClick={() => handleRemoveMap(type, key)}
                                                                                    className="p-1 text-red-400/70 hover:text-red-400 transition-colors"
                                                                                    title="Remove map"
                                                                                >
                                                                                    <Trash2 size={10} />
                                                                                </button>
                                                                            </>
                                                                        ) : (
                                                                            <label className="p-1 px-1.5 bg-black/40 hover:bg-white/10 text-[8px] text-white/70 hover:text-white rounded cursor-pointer transition-colors border border-sleek-ring/40">
                                                                                <span>+ Attach</span>
                                                                                <input 
                                                                                    type="file"
                                                                                    accept="image/*"
                                                                                    onChange={(e) => {
                                                                                        const file = e.target.files?.[0];
                                                                                        if (file) handleMapUpload(type, key, file);
                                                                                    }}
                                                                                    className="hidden"
                                                                                />
                                                                            </label>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}

                    {/* -------------------- FIREBASE VAULT TAB -------------------- */}
                    {activeTab === 'firebase' && (
                      <motion.div
                        key="firebase"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-4"
                      >
                        {/* Account Card */}
                        <div className="p-3.5 bg-gradient-to-br from-slate-900 to-black border border-sleek-border rounded-xl space-y-3 shadow-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {currentUser?.photoURL ? (
                                <img src={currentUser.photoURL} alt="User Avatar" className="w-8 h-8 rounded-full border border-sleek-accent" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-sleek-accent/20 border border-sleek-accent text-sleek-accent flex items-center justify-center font-bold">
                                  <UserIcon size={16} />
                                </div>
                              )}
                              <div>
                                <span className="text-xs font-bold text-white block">
                                  {currentUser?.displayName || currentUser?.email || 'Anonymous Player'}
                                </span>
                                <span className="text-[8px] font-mono text-emerald-400 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                  {currentUser ? 'Firebase Cloud Connected' : 'Local Storage Mode'}
                                </span>
                              </div>
                            </div>

                            {currentUser ? (
                              <button
                                onClick={() => signOutUser()}
                                className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded border border-red-500/30 text-[9px] font-mono font-bold flex items-center gap-1 transition-all"
                              >
                                <LogOut size={11} />
                                <span>Sign Out</span>
                              </button>
                            ) : (
                              <button
                                onClick={async () => {
                                  setIsLoggingIn(true);
                                  try {
                                    await signInWithGoogle();
                                  } catch (e) {
                                    console.error(e);
                                  } finally {
                                    setIsLoggingIn(false);
                                  }
                                }}
                                disabled={isLoggingIn}
                                className="px-3 py-1.5 bg-sleek-accent hover:bg-sleek-accent/90 text-black font-black rounded text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50"
                              >
                                <LogIn size={12} />
                                <span>{isLoggingIn ? 'Connecting...' : 'Sign In With Google'}</span>
                              </button>
                            )}
                          </div>

                          <div className="p-2 bg-black/40 border border-white/5 rounded text-[8px] font-mono text-slate-400 flex items-center justify-between">
                            <span>Database ID:</span>
                            <span className="text-sleek-accent truncate max-w-[200px]" title="ai-studio-chessinteractive-c01e9027-f632-4782-b973-b57981368b23">
                              ai-studio-chessinteractive...
                            </span>
                          </div>
                        </div>

                        {/* Cloud Action Buttons */}
                        <div className="space-y-2">
                          <button
                            onClick={() => saveSettingsToCloud()}
                            disabled={isSyncing || !currentUser}
                            className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-[11px] uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Cloud size={14} className={isSyncing ? 'animate-bounce' : ''} />
                            <span>Save All 3D Characters To Firebase</span>
                          </button>

                          <button
                            onClick={() => loadSettingsFromCloud()}
                            disabled={isSyncing || !currentUser}
                            className="w-full py-2 px-3 bg-sleek-card hover:bg-slate-800 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl border border-sleek-border hover:border-sleek-accent flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                            <span>Restore Characters For Next Session</span>
                          </button>

                          {!currentUser && (
                            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded text-[9px] text-amber-300 font-mono flex items-center gap-1.5">
                              <Info size={13} className="shrink-0" />
                              <span>Sign in with Google above to store custom FBX/OBJ and maps in your personal Firebase vault.</span>
                            </div>
                          )}
                        </div>

                        {/* Real-Time Progress Bar */}
                        {syncProgress && (
                          <div className="p-3 bg-slate-900 border border-sleek-accent/40 rounded-xl space-y-2 shadow-md">
                            <div className="flex items-center justify-between text-[9px] font-mono text-sleek-accent">
                              <span>{syncProgress.status}</span>
                              <span className="font-bold">{syncProgress.percent}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-black rounded-full overflow-hidden">
                              <div
                                className="h-full bg-sleek-accent transition-all duration-300"
                                style={{ width: `${syncProgress.percent}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {syncError && (
                          <div className="p-2.5 bg-red-500/15 border border-red-500/40 rounded-lg text-[9px] text-red-300 font-mono flex items-center gap-2">
                            <AlertCircle size={13} className="shrink-0" />
                            <span>{syncError}</span>
                          </div>
                        )}

                        {/* Character Vault Matrix Overview */}
                        <div className="space-y-2 pt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-white tracking-wider flex items-center gap-1.5">
                              <HardDrive size={12} className="text-sleek-accent" />
                              <span>Character Vault Roster</span>
                            </span>
                            <span className="text-[8px] font-mono text-sleek-muted">6 Piece Slots</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {pieceTypes.map((type) => {
                              const model = settings.pieceModels[type];
                              const mapCount = model ? [
                                model.mapUrl,
                                model.normalMapUrl,
                                model.roughnessMapUrl,
                                model.metalnessMapUrl,
                                model.emissiveMapUrl
                              ].filter(Boolean).length : 0;

                              return (
                                <div
                                  key={type}
                                  onClick={() => {
                                    setSelectedPieceType(type);
                                    setActiveTab('pieces');
                                  }}
                                  className={`p-2.5 bg-sleek-card border rounded-lg cursor-pointer transition-all hover:border-sleek-accent ${
                                    model?.dataUrl ? 'border-sleek-accent/40 bg-black/60' : 'border-sleek-ring/60'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-bold text-white uppercase">{type}</span>
                                    <span className="text-[8px] font-mono px-1 rounded bg-black text-sleek-accent border border-sleek-ring">
                                      {model?.dataUrl ? model.fileType.toUpperCase() : 'DEFAULT'}
                                    </span>
                                  </div>
                                  <div className="text-[8px] font-mono text-slate-400 flex items-center justify-between">
                                    <span>{model?.name ? model.name.slice(0, 12) : 'Default Mesh'}</span>
                                    <span className={mapCount > 0 ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                                      {mapCount}/5 maps
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Performance Optimizer Card */}
                        <div className="p-3 bg-black/40 border border-sleek-ring rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold uppercase text-white tracking-wider flex items-center gap-1.5">
                              <Cpu size={12} className="text-cyan-400" />
                              <span>Performance Engine</span>
                            </span>
                            <span className="text-[8px] font-mono text-emerald-400 font-bold">60 FPS CACHE ON</span>
                          </div>
                          <p className="text-[8px] text-slate-400 font-mono">
                            OBJ & FBX meshes and PBR texture maps are cached in-memory and shared across all 32 pieces on the board to eliminate frame drops and glitches.
                          </p>
                          <button
                            onClick={handleClearCaches}
                            className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[9px] font-mono font-bold rounded border border-slate-600 transition-colors flex items-center justify-center gap-1"
                          >
                            <Trash2 size={10} />
                            <span>Purge GPU Texture Cache (Clean Memory)</span>
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* -------------------- GENERAL TAB -------------------- */}
                    {activeTab === 'general' && (
                        <motion.div 
                            key="general" 
                            initial={{ opacity: 0, x: -10 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            className="space-y-4"
                        >
                            <div className="space-y-2">
                                <label className="text-[10px] text-sleek-muted block uppercase font-bold tracking-wider">Game Title</label>
                                <input 
                                    type="text" 
                                    value={settings.gameName}
                                    onChange={(e) => updateSettings({ gameName: e.target.value })}
                                    className="w-full bg-sleek-card border border-sleek-border rounded px-3 py-2 text-xs text-white focus:border-sleek-accent outline-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-[10px] text-sleek-muted uppercase font-bold tracking-wider">
                                    <span>Board Dimension</span>
                                    <span className="text-sleek-accent font-mono">{settings.boardSize} x {settings.boardSize}</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="8" max="20" step="2"
                                    value={settings.boardSize}
                                    onChange={(e) => updateSettings({ boardSize: parseInt(e.target.value) })}
                                    className="w-full h-1 bg-sleek-ring accent-sleek-accent rounded appearance-none cursor-pointer"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-[10px] text-sleek-muted uppercase font-bold tracking-wider">
                                    <span>AI Core Difficulty</span>
                                    <span className="text-sleek-accent font-mono">Level {settings.aiLevel}</span>
                                </div>
                                <div className="grid grid-cols-4 gap-1">
                                    {[1, 2, 3, 4].map(lvl => (
                                        <button 
                                            key={lvl}
                                            onClick={() => updateSettings({ aiLevel: lvl })}
                                            className={`py-1 text-xs font-mono rounded border ${
                                                settings.aiLevel === lvl 
                                                    ? 'bg-sleek-accent border-sleek-accent text-black font-bold' 
                                                    : 'bg-sleek-card border-sleek-ring text-sleek-muted'
                                            }`}
                                        >
                                            {lvl}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* -------------------- ATMOSPHERE & AUDIO TAB -------------------- */}
                    {activeTab === 'atmosphere' && (
                        <motion.div 
                            key="atmosphere" 
                            initial={{ opacity: 0, x: -10 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            className="space-y-4"
                        >
                            <div className="space-y-2">
                              <label className="text-[10px] text-sleek-muted block uppercase font-bold tracking-wider">3D Battlefield Environment</label>
                              <div className="grid grid-cols-2 gap-2">
                                  {themes.map(t => (
                                      <button 
                                          key={t.id}
                                          onClick={() => updateSettings({ theme: t.id as any })}
                                          className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                                              settings.theme === t.id 
                                                  ? 'bg-sleek-accent border-sleek-accent text-black font-bold shadow-lg' 
                                                  : 'bg-sleek-card border-sleek-ring text-sleek-muted hover:text-white'
                                          }`}
                                      >
                                          {t.icon}
                                          <span className="text-[10px] uppercase tracking-wider">{t.label}</span>
                                      </button>
                                  ))}
                              </div>
                            </div>

                            {/* Soundtracks & Audio Manager */}
                            <div className="space-y-2 pt-2 border-t border-white/10">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] text-sleek-muted block uppercase font-bold tracking-wider">Battle Music & Soundtracks</label>
                                <label 
                                  className="flex items-center gap-1 px-2 py-0.5 bg-sleek-accent/20 hover:bg-sleek-accent text-sleek-accent hover:text-black border border-sleek-accent/40 rounded text-[8px] font-mono font-bold cursor-pointer transition-colors"
                                  title="Upload any audio file to replace in-game music"
                                >
                                  <Upload size={9} />
                                  <span>Upload MP3</span>
                                  <input 
                                    type="file" 
                                    accept="audio/*,.mp3,.wav,.ogg,.m4a"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onload = (ev) => {
                                          const url = ev.target?.result as string;
                                          if (url) {
                                            updateSettings({
                                              customMusicUrl: url,
                                              customMusicName: file.name.replace(/\.[^/.]+$/, ""),
                                              musicMuted: false
                                            });
                                            setStatusMessage(`Loaded audio: ${file.name}`);
                                            setTimeout(() => setStatusMessage(null), 3000);
                                          }
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                    className="hidden" 
                                  />
                                </label>
                              </div>

                              <div className="space-y-1.5">
                                {DEFAULT_TRACKS.map(track => {
                                  const isSelected = !settings.customMusicUrl && settings.selectedTrackId === track.id;
                                  return (
                                    <button
                                      key={track.id}
                                      onClick={() => {
                                        updateSettings({
                                          selectedTrackId: track.id,
                                          customMusicUrl: '',
                                          musicMuted: false
                                        });
                                        setStatusMessage(`Playing: ${track.title}`);
                                        setTimeout(() => setStatusMessage(null), 2500);
                                      }}
                                      className={`w-full p-2 rounded-lg border text-left flex items-center justify-between transition-all ${
                                        isSelected 
                                          ? 'bg-amber-400/20 border-amber-400 text-amber-300 font-bold' 
                                          : 'bg-black/40 border-sleek-ring text-slate-300 hover:border-sleek-accent hover:text-white'
                                      }`}
                                    >
                                      <div className="truncate">
                                        <div className="text-[10px] font-bold truncate">{track.title}</div>
                                        <div className="text-[8px] font-mono text-slate-400 truncate">{track.genre} • {track.artist}</div>
                                      </div>
                                      {isSelected && (
                                        <span className="text-[8px] font-mono px-1.5 py-0.5 bg-amber-400 text-black rounded font-bold">ACTIVE</span>
                                      )}
                                    </button>
                                  );
                                })}

                                {settings.customMusicUrl && (
                                  <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-between">
                                    <div className="truncate">
                                      <div className="text-[10px] font-bold truncate">{settings.customMusicName || 'Custom Uploaded Music'}</div>
                                      <div className="text-[8px] font-mono text-emerald-400">Custom Player Audio File</div>
                                    </div>
                                    <button
                                      onClick={() => updateSettings({ customMusicUrl: '', customMusicName: '' })}
                                      className="text-[8px] font-mono text-red-400 hover:text-red-300 underline ml-2"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            </aside>

            {/* Fullscreen 3D Inspector Modal */}
            {previewPiece && (
              <ModelPreviewModal
                isOpen={!!previewPiece}
                onClose={() => setPreviewPiece(null)}
                pieceType={previewPiece.type}
                pieceName={previewPiece.name}
                model={previewPiece.model}
              />
            )}
        </>
    );
};
