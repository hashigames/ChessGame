import { PieceType, CustomModel } from '../store/gameStore';

/**
 * Creates high-detail procedural OBJ strings with full vertex positions, normals, UVs and polygon faces.
 */
function createProceduralPieceOBJ(type: PieceType): string {
  const lines: string[] = [];
  lines.push(`# Procedural 3D Chess Asset - ${type.toUpperCase()}`);
  lines.push(`o ${type.toUpperCase()}_Mesh`);

  // Helper to add a cylinder / lathed segment
  interface Ring {
    y: number;
    radius: number;
    segments?: number;
  }

  const rings: Ring[] = [];
  const segments = 18;

  switch (type) {
    case 'pawn':
      // Sleek armored sci-fi infantry pawn
      rings.push({ y: 0.0, radius: 0.38 });
      rings.push({ y: 0.08, radius: 0.38 });
      rings.push({ y: 0.15, radius: 0.32 });
      rings.push({ y: 0.35, radius: 0.22 });
      rings.push({ y: 0.45, radius: 0.18 });
      rings.push({ y: 0.52, radius: 0.26 });
      rings.push({ y: 0.56, radius: 0.24 });
      rings.push({ y: 0.65, radius: 0.28 });
      rings.push({ y: 0.78, radius: 0.26 });
      rings.push({ y: 0.88, radius: 0.16 });
      rings.push({ y: 0.94, radius: 0.02 });
      break;

    case 'rook':
      // Monolithic fortified bastion tower
      rings.push({ y: 0.0, radius: 0.42 });
      rings.push({ y: 0.1, radius: 0.42 });
      rings.push({ y: 0.18, radius: 0.36 });
      rings.push({ y: 0.55, radius: 0.30 });
      rings.push({ y: 0.75, radius: 0.30 });
      rings.push({ y: 0.85, radius: 0.38 });
      rings.push({ y: 1.0, radius: 0.40 });
      rings.push({ y: 1.05, radius: 0.32 });
      rings.push({ y: 1.05, radius: 0.02 });
      break;

    case 'knight':
      // Cyber steed / armored robotic cavalry unit
      rings.push({ y: 0.0, radius: 0.40 });
      rings.push({ y: 0.1, radius: 0.40 });
      rings.push({ y: 0.2, radius: 0.34 });
      rings.push({ y: 0.45, radius: 0.26 });
      rings.push({ y: 0.65, radius: 0.24 });
      rings.push({ y: 0.80, radius: 0.32 });
      rings.push({ y: 0.95, radius: 0.28 });
      rings.push({ y: 1.10, radius: 0.15 });
      rings.push({ y: 1.15, radius: 0.02 });
      break;

    case 'bishop':
      // High-tech Inquisitor with conical spire and mitre finial
      rings.push({ y: 0.0, radius: 0.38 });
      rings.push({ y: 0.1, radius: 0.38 });
      rings.push({ y: 0.2, radius: 0.30 });
      rings.push({ y: 0.55, radius: 0.18 });
      rings.push({ y: 0.75, radius: 0.22 });
      rings.push({ y: 0.85, radius: 0.28 });
      rings.push({ y: 1.10, radius: 0.18 });
      rings.push({ y: 1.22, radius: 0.08 });
      rings.push({ y: 1.28, radius: 0.02 });
      break;

    case 'queen':
      // Majestic imperial matriarch with flared crown array
      rings.push({ y: 0.0, radius: 0.44 });
      rings.push({ y: 0.1, radius: 0.44 });
      rings.push({ y: 0.2, radius: 0.35 });
      rings.push({ y: 0.55, radius: 0.20 });
      rings.push({ y: 0.75, radius: 0.24 });
      rings.push({ y: 0.90, radius: 0.32 });
      rings.push({ y: 1.10, radius: 0.36 });
      rings.push({ y: 1.25, radius: 0.42 });
      rings.push({ y: 1.35, radius: 0.22 });
      rings.push({ y: 1.42, radius: 0.02 });
      break;

    case 'king':
      // High Sovereign Titan with dual-tier armor and grand cross finial
      rings.push({ y: 0.0, radius: 0.46 });
      rings.push({ y: 0.12, radius: 0.46 });
      rings.push({ y: 0.22, radius: 0.38 });
      rings.push({ y: 0.60, radius: 0.24 });
      rings.push({ y: 0.80, radius: 0.28 });
      rings.push({ y: 1.00, radius: 0.36 });
      rings.push({ y: 1.20, radius: 0.40 });
      rings.push({ y: 1.35, radius: 0.32 });
      rings.push({ y: 1.45, radius: 0.18 });
      rings.push({ y: 1.55, radius: 0.02 });
      break;
  }

  // Generate vertices (v) and texture coordinates (vt)
  const totalRings = rings.length;
  for (let r = 0; r < totalRings; r++) {
    const ring = rings[r];
    const vCoord = r / (totalRings - 1);

    for (let s = 0; s < segments; s++) {
      const uCoord = s / segments;
      const angle = (s / segments) * Math.PI * 2;
      const x = Math.cos(angle) * ring.radius;
      const z = Math.sin(angle) * ring.radius;
      const y = ring.y;

      lines.push(`v ${x.toFixed(4)} ${y.toFixed(4)} ${z.toFixed(4)}`);
      lines.push(`vt ${uCoord.toFixed(4)} ${vCoord.toFixed(4)}`);
    }
  }

  // Generate vertex normals (vn)
  for (let r = 0; r < totalRings; r++) {
    for (let s = 0; s < segments; s++) {
      const angle = (s / segments) * Math.PI * 2;
      const nx = Math.cos(angle);
      const nz = Math.sin(angle);
      lines.push(`vn ${nx.toFixed(4)} 0.0000 ${nz.toFixed(4)}`);
    }
  }

  // Generate quad faces (f v/vt/vn ...)
  lines.push(`s 1`);
  for (let r = 0; r < totalRings - 1; r++) {
    for (let s = 0; s < segments; s++) {
      const nextS = (s + 1) % segments;

      const p1 = r * segments + s + 1;
      const p2 = r * segments + nextS + 1;
      const p3 = (r + 1) * segments + nextS + 1;
      const p4 = (r + 1) * segments + s + 1;

      lines.push(`f ${p1}/${p1}/${p1} ${p2}/${p2}/${p2} ${p3}/${p3}/${p3} ${p4}/${p4}/${p4}`);
    }
  }

  return lines.join('\n');
}

/**
 * Procedurally generates 2D Data URL textures for Diffuse, Normal, Roughness, Metalness, and Emissive.
 */
function createProceduralTexture(
  theme: 'cyberpunk' | 'gothic' | 'synthwave' | 'imperial' | 'darkfantasy',
  type: 'diffuse' | 'normal' | 'roughness' | 'metalness' | 'emissive'
): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  if (type === 'diffuse') {
    // Diffuse / Albedo Map
    const grad = ctx.createLinearGradient(0, 0, 256, 256);
    if (theme === 'cyberpunk') {
      grad.addColorStop(0, '#1a1f2c');
      grad.addColorStop(0.5, '#2e384d');
      grad.addColorStop(1, '#0f172a');
    } else if (theme === 'gothic') {
      grad.addColorStop(0, '#262626');
      grad.addColorStop(0.5, '#171717');
      grad.addColorStop(1, '#0a0a0a');
    } else if (theme === 'synthwave') {
      grad.addColorStop(0, '#2d124d');
      grad.addColorStop(0.5, '#5c1d8f');
      grad.addColorStop(1, '#1b0a33');
    } else if (theme === 'imperial') {
      grad.addColorStop(0, '#e2e8f0');
      grad.addColorStop(0.5, '#cbd5e1');
      grad.addColorStop(1, '#94a3b8');
    } else {
      grad.addColorStop(0, '#33271e');
      grad.addColorStop(0.5, '#4a3728');
      grad.addColorStop(1, '#1f1610');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // Add geometric paneling / panel grooves
    ctx.strokeStyle = theme === 'cyberpunk' ? '#38bdf8' : theme === 'synthwave' ? '#f43f5e' : '#52525b';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, 224, 224);
    ctx.strokeRect(48, 48, 160, 160);

    // Accent lines
    ctx.beginPath();
    ctx.moveTo(0, 128);
    ctx.lineTo(256, 128);
    ctx.moveTo(128, 0);
    ctx.lineTo(128, 256);
    ctx.stroke();

  } else if (type === 'normal') {
    // Normal Map (standard tangent-space normal #8080ff base)
    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, 256, 256);

    // Add bevel bevelled relief lines
    ctx.fillStyle = '#ff8080';
    ctx.fillRect(16, 16, 224, 4);
    ctx.fillRect(16, 16, 4, 224);

    ctx.fillStyle = '#80ff80';
    ctx.fillRect(16, 236, 224, 4);
    ctx.fillRect(236, 16, 4, 224);

    // Central circular detail
    ctx.beginPath();
    ctx.arc(128, 128, 40, 0, Math.PI * 2);
    ctx.strokeStyle = '#9090ff';
    ctx.lineWidth = 6;
    ctx.stroke();

  } else if (type === 'roughness') {
    // Roughness Map: dark = glossy, bright = rough
    ctx.fillStyle = theme === 'cyberpunk' || theme === 'imperial' ? '#333333' : '#666666';
    ctx.fillRect(0, 0, 256, 256);

    // High gloss trims
    ctx.fillStyle = '#111111';
    ctx.fillRect(16, 16, 224, 10);
    ctx.fillRect(16, 230, 224, 10);

  } else if (type === 'metalness') {
    // Metalness Map: bright = pure metal, dark = non-metal
    ctx.fillStyle = theme === 'imperial' || theme === 'cyberpunk' ? '#ffffff' : '#999999';
    ctx.fillRect(0, 0, 256, 256);

  } else if (type === 'emissive') {
    // Emissive / Glow Map: pure black base with vibrant glowing circuitry
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = theme === 'cyberpunk' ? '#06b6d4' : theme === 'synthwave' ? '#ec4899' : theme === 'imperial' ? '#eab308' : '#ef4444';
    ctx.lineWidth = 4;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 10;

    // Glowing core circuit
    ctx.beginPath();
    ctx.arc(128, 128, 30, 0, Math.PI * 2);
    ctx.moveTo(128, 20);
    ctx.lineTo(128, 98);
    ctx.moveTo(128, 158);
    ctx.lineTo(128, 236);
    ctx.stroke();
  }

  return canvas.toDataURL('image/png');
}

export interface ModelPresetPack {
  id: string;
  name: string;
  description: string;
  theme: 'cyberpunk' | 'gothic' | 'synthwave' | 'imperial' | 'darkfantasy';
  accentColor: string;
  icon: string;
}

export const MODEL_PRESET_PACKS: ModelPresetPack[] = [
  {
    id: 'cyberpunk_mecha',
    name: 'Cyberpunk Mecha Army',
    description: 'Futuristic sci-fi battallion with cyan glowing circuits, titanium plating, and high-frequency weapons.',
    theme: 'cyberpunk',
    accentColor: '#06b6d4',
    icon: '⚡',
  },
  {
    id: 'gothic_obsidian',
    name: 'Gothic Obsidian Citadel',
    description: 'Polished black volcanic obsidian armor with engraved gold leaf filigree and deep normal map carvings.',
    theme: 'gothic',
    accentColor: '#f59e0b',
    icon: '🏰',
  },
  {
    id: 'synthwave_neon',
    name: 'Neon Synthwave 80s',
    description: 'Vibrant magenta and violet holographic warriors with retro-future cyber glow.',
    theme: 'synthwave',
    accentColor: '#ec4899',
    icon: '🪩',
  },
  {
    id: 'imperial_royal',
    name: 'Imperial Platinum Knights',
    description: 'Gleaming mirror-polished platinum armor with gold royal crests and marble diffuse textures.',
    theme: 'imperial',
    accentColor: '#38bdf8',
    icon: '👑',
  },
  {
    id: 'dark_fantasy',
    name: 'Dark Fantasy Runestone',
    description: 'Weathered runic monoliths and crimson cursed artifacts with glowing ancient sigils.',
    theme: 'darkfantasy',
    accentColor: '#ef4444',
    icon: '⚔️',
  },
];

/**
 * Builds a single CustomModel preset for a specific piece and theme.
 */
export function generatePieceModelPreset(pieceType: PieceType, theme: 'cyberpunk' | 'gothic' | 'synthwave' | 'imperial' | 'darkfantasy' = 'cyberpunk'): CustomModel {
  const objText = createProceduralPieceOBJ(pieceType);
  const dataUrl = `data:text/plain;base64,${btoa(objText)}`;

  return {
    name: `${theme.toUpperCase()} ${pieceType.toUpperCase()} (3D OBJ)`,
    fileType: 'obj',
    dataUrl,
    mapUrl: createProceduralTexture(theme, 'diffuse'),
    normalMapUrl: createProceduralTexture(theme, 'normal'),
    roughnessMapUrl: createProceduralTexture(theme, 'roughness'),
    metalnessMapUrl: createProceduralTexture(theme, 'metalness'),
    emissiveMapUrl: createProceduralTexture(theme, 'emissive'),
  };
}

/**
 * Generates a complete 6-piece preloaded 3D set ready for instant gameplay and visualization.
 */
export function generateFullPresetSet(presetId: string): Record<PieceType, CustomModel> {
  const pack = MODEL_PRESET_PACKS.find(p => p.id === presetId) || MODEL_PRESET_PACKS[0];
  const pieceTypes: PieceType[] = ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king'];
  
  const models: Partial<Record<PieceType, CustomModel>> = {};
  for (const type of pieceTypes) {
    models[type] = generatePieceModelPreset(type, pack.theme);
  }

  return models as Record<PieceType, CustomModel>;
}
