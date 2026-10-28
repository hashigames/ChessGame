import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useGameStore, PieceType } from '../../store/gameStore';
import { 
  FileCode, 
  Download, 
  Copy, 
  Check, 
  X, 
  Layers, 
  Terminal, 
  Sparkles, 
  ShieldCheck 
} from 'lucide-react';

interface UnityExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UnityExportModal: React.FC<UnityExportModalProps> = ({ isOpen, onClose }) => {
  const { settings } = useGameStore();
  const [copied, setCopied] = useState(false);
  const [activeScript, setActiveScript] = useState<'chessManager' | 'pieceController' | 'pbrShaderLoader'>('chessManager');

  if (!isOpen) return null;

  const pieceTypes: PieceType[] = ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king'];

  // Generate Unity C# Chess Game Manager Script
  const generateChessManagerCS = () => {
    return `// =========================================================================
// LightHouse 3D Chess - Unity Game Engine Bridge v2.4
// Generated for: ${settings.gameName}
// Board Size: ${settings.boardSize}x${settings.boardSize} | AI Core Level: ${settings.aiLevel}
// =========================================================================

using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace LightHouse.Chess3D
{
    public enum PieceType { Pawn, Rook, Knight, Bishop, Queen, King }
    public enum Side { White, Black }

    [System.Serializable]
    public class PieceCustomConfig
    {
        public PieceType pieceType;
        public string displayName;
        public string weaponType;
        public GameObject customMeshPrefab;
        public Material pbrMaterial;
    }

    public class Chess3DManager : MonoBehaviour
    {
        [Header("Board Settings")]
        public int boardSize = ${settings.boardSize};
        public float tileSize = 1.0f;
        public Transform boardOrigin;

        [Header("Custom Piece Configurations")]
        public List<PieceCustomConfig> pieceConfigs = new List<PieceCustomConfig>();

        [Header("Turn & AI Logic")]
        public Side currentTurn = Side.White;
        public int aiCoreLevel = ${settings.aiLevel};
        public float battleMusicVolume = ${settings.musicVolume}f;

        private void Start()
        {
            InitializeCustomPieceConfigs();
            BuildChessGrid();
            Debug.Log("[Chess3D] Initialized '${settings.gameName}' with board " + boardSize + "x" + boardSize);
        }

        private void InitializeCustomPieceConfigs()
        {
            ${pieceTypes.map(type => {
              const name = settings.pieceNames[type] || type;
              const weapon = settings.pieceWeapons[type] || 'Standard';
              const capType = type.charAt(0).toUpperCase() + type.slice(1);
              return `pieceConfigs.Add(new PieceCustomConfig {
                pieceType = PieceType.${capType},
                displayName = "${name}",
                weaponType = "${weapon}"
            });`;
            }).join('\n            ')}
        }

        public void BuildChessGrid()
        {
            for (int r = 0; r < boardSize; r++)
            {
                for (int c = 0; c < boardSize; c++)
                {
                    Vector3 tilePos = new Vector3(c * tileSize, 0, r * tileSize);
                    bool isWhite = (r + c) % 2 == 0;
                    // Spawn tile mesh...
                }
            }
        }
    }
}`;
  };

  // Generate Piece Controller Script
  const generatePieceControllerCS = () => {
    return `// =========================================================================
// LightHouse 3D Chess - Piece Combat Controller
// =========================================================================

using UnityEngine;
using System.Collections;

namespace LightHouse.Chess3D
{
    public class PieceCombatUnit : MonoBehaviour
    {
        public PieceType type;
        public Side side;
        public int maxHealth = 100;
        public int currentHealth = 100;
        
        [Header("PBR Map Slots")]
        public Texture2D albedoMap;
        public Texture2D normalMap;
        public Texture2D roughnessMap;
        public Texture2D metallicMap;
        public Texture2D emissionMap;

        public void ApplyFatality(string fatalityName)
        {
            Debug.Log($"[Combat] Executing Fatality: {fatalityName} on {type}");
            StartCoroutine(FatalityDeathSequence());
        }

        private IEnumerator FatalityDeathSequence()
        {
            float duration = 1.5f;
            float elapsed = 0f;
            Vector3 startScale = transform.localScale;

            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float progress = elapsed / duration;
                transform.localScale = Vector3.Lerp(startScale, Vector3.zero, progress);
                transform.Rotate(Vector3.up, 360f * Time.deltaTime * 2);
                yield return null;
            }

            Destroy(gameObject);
        }
    }
}`;
  };

  // Generate PBR Shader Loader
  const generateShaderLoaderCS = () => {
    return `// =========================================================================
// LightHouse 3D Chess - Runtime PBR Shader Material Generator
// Compatible with Universal Render Pipeline (URP) & Standard Shader
// =========================================================================

using UnityEngine;

namespace LightHouse.Chess3D
{
    public static class PBRMaterialFactory
    {
        public static Material CreatePBRMaterial(
            Texture2D albedo,
            Texture2D normal,
            Texture2D roughness,
            Texture2D metallic,
            Texture2D emission,
            Color baseColor)
        {
            Shader standardShader = Shader.Find("Standard") ?? Shader.Find("Universal Render Pipeline/Lit");
            Material mat = new Material(standardShader);

            mat.color = baseColor;
            if (albedo != null) mat.SetTexture("_MainTex", albedo);
            if (normal != null) {
                mat.SetTexture("_BumpMap", normal);
                mat.EnableKeyword("_NORMALMAP");
            }
            if (metallic != null) {
                mat.SetTexture("_MetallicGlossMap", metallic);
                mat.EnableKeyword("_METALLICGLOSSMAP");
            }
            if (emission != null) {
                mat.SetTexture("_EmissionMap", emission);
                mat.SetColor("_EmissionColor", Color.white * 1.5f);
                mat.EnableKeyword("_EMISSION");
            }

            return mat;
        }
    }
}`;
  };

  const getActiveCode = () => {
    switch (activeScript) {
      case 'chessManager': return generateChessManagerCS();
      case 'pieceController': return generatePieceControllerCS();
      case 'pbrShaderLoader': return generateShaderLoaderCS();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename = activeScript === 'chessManager' 
      ? 'Chess3DManager.cs' 
      : activeScript === 'pieceController' 
      ? 'PieceCombatUnit.cs' 
      : 'PBRMaterialFactory.cs';
    
    const blob = new Blob([getActiveCode()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-4xl bg-sleek-surface border border-sleek-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-sleek-border flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sleek-accent/20 border border-sleek-accent/40 flex items-center justify-center text-sleek-accent font-black">
              <Terminal size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-sleek-accent uppercase tracking-widest block">
                Game Engine Integration
              </span>
              <h2 className="text-base font-black text-white uppercase tracking-wide">
                Unity 3D C# Script & Asset Exporter
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 text-sleek-muted hover:text-white rounded transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Script Selector Tabs */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 bg-black/20 border-b border-sleek-ring">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveScript('chessManager')}
              className={`px-3 py-1.5 rounded text-[11px] font-mono font-bold uppercase transition-all flex items-center gap-1.5 ${
                activeScript === 'chessManager'
                  ? 'bg-sleek-accent text-black shadow'
                  : 'bg-black/40 text-sleek-muted hover:text-white border border-sleek-ring'
              }`}
            >
              <FileCode size={13} />
              Chess3DManager.cs
            </button>
            <button
              onClick={() => setActiveScript('pieceController')}
              className={`px-3 py-1.5 rounded text-[11px] font-mono font-bold uppercase transition-all flex items-center gap-1.5 ${
                activeScript === 'pieceController'
                  ? 'bg-sleek-accent text-black shadow'
                  : 'bg-black/40 text-sleek-muted hover:text-white border border-sleek-ring'
              }`}
            >
              <Layers size={13} />
              PieceCombatUnit.cs
            </button>
            <button
              onClick={() => setActiveScript('pbrShaderLoader')}
              className={`px-3 py-1.5 rounded text-[11px] font-mono font-bold uppercase transition-all flex items-center gap-1.5 ${
                activeScript === 'pbrShaderLoader'
                  ? 'bg-sleek-accent text-black shadow'
                  : 'bg-black/40 text-sleek-muted hover:text-white border border-sleek-ring'
              }`}
            >
              <Sparkles size={13} />
              PBRMaterialFactory.cs
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 bg-black/40 hover:bg-white/10 text-white rounded border border-sleek-ring text-[11px] font-mono font-bold flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copied ? 'Copied!' : 'Copy C#'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-sleek-accent hover:bg-yellow-500 text-black rounded text-[11px] font-mono font-black flex items-center gap-1.5 transition-colors shadow"
            >
              <Download size={13} />
              <span>Download .cs</span>
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="flex-1 p-4 bg-slate-950/80 overflow-y-auto font-mono text-xs text-emerald-300 custom-scrollbar max-h-[460px]">
          <pre className="whitespace-pre">{getActiveCode()}</pre>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-black/40 border-t border-sleek-border flex items-center justify-between text-[10px] text-sleek-muted">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-sleek-accent" />
            <span>Ready for Unity 2022.3 LTS, 2023.x & Unity 6. Drop directly into your Assets/Scripts folder.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-sleek-card hover:bg-white/10 text-white rounded border border-sleek-ring font-bold uppercase transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
