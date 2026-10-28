import { PieceType, CustomModel } from '../store/gameStore';

export interface BatchParsedAsset {
  fileName: string;
  pieceType: PieceType | null;
  assetRole: 'mesh' | 'mapUrl' | 'normalMapUrl' | 'roughnessMapUrl' | 'metalnessMapUrl' | 'emissiveMapUrl' | null;
  fileType: 'fbx' | 'obj' | 'image' | 'unknown';
  dataUrl: string;
}

export interface BatchParseResult {
  updatedModels: Record<PieceType, CustomModel | null>;
  parsedAssets: BatchParsedAsset[];
  matchedCount: number;
  unmatchedCount: number;
  primaryAffectedPiece: PieceType;
}

const PIECE_TYPES_ORDER: PieceType[] = ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king'];

/**
 * Detects which piece type a filename belongs to.
 */
export function detectPieceType(fileName: string): PieceType | null {
  const lower = fileName.toLowerCase();
  
  if (lower.includes('pawn') || lower.includes('soldier') || lower.includes('peon') || lower.startsWith('pw_') || lower.startsWith('pw-') || lower.includes('_pawn') || lower.includes('-pawn')) return 'pawn';
  if (lower.includes('rook') || lower.includes('castle') || lower.includes('tower') || lower.startsWith('rk_') || lower.startsWith('rk-') || lower.includes('_rook') || lower.includes('-rook')) return 'rook';
  if (lower.includes('knight') || lower.includes('horse') || lower.includes('cavalry') || lower.includes('paladin') || lower.startsWith('kn_') || lower.startsWith('kn-') || lower.includes('_knight') || lower.includes('-knight')) return 'knight';
  if (lower.includes('bishop') || lower.includes('priest') || lower.includes('cleric') || lower.includes('mage') || lower.startsWith('bi_') || lower.startsWith('bi-') || lower.includes('_bishop') || lower.includes('-bishop')) return 'bishop';
  if (lower.includes('queen') || lower.includes('general') || lower.includes('lady') || lower.startsWith('qn_') || lower.startsWith('qn-') || lower.includes('_queen') || lower.includes('-queen')) return 'queen';
  if (lower.includes('king') || lower.includes('leader') || lower.includes('monarch') || lower.includes('lord') || lower.includes('boss') || lower.startsWith('kg_') || lower.startsWith('kg-') || lower.includes('_king') || lower.includes('-king')) return 'king';

  return null;
}

/**
 * Detects the texture map slot or 3D mesh role from filename.
 */
export function detectAssetRole(fileName: string, ext: string): {
  role: 'mesh' | 'mapUrl' | 'normalMapUrl' | 'roughnessMapUrl' | 'metalnessMapUrl' | 'emissiveMapUrl' | null;
  fileType: 'fbx' | 'obj' | 'image' | 'unknown';
} {
  const lower = fileName.toLowerCase();
  const lowerExt = ext.toLowerCase();

  if (lowerExt === 'fbx') {
    return { role: 'mesh', fileType: 'fbx' };
  }
  if (lowerExt === 'obj') {
    return { role: 'mesh', fileType: 'obj' };
  }

  const isImage = ['png', 'jpg', 'jpeg', 'webp', 'tga', 'bmp', 'svg', 'tiff'].includes(lowerExt);
  if (!isImage) {
    return { role: null, fileType: 'unknown' };
  }

  // Detect map types based on standard 3D PBR naming conventions
  if (
    lower.includes('normal') || 
    lower.includes('_norm') || 
    lower.includes('_nrm') || 
    lower.includes('_nm') || 
    lower.includes('_nor') || 
    lower.includes('-norm') || 
    lower.includes('_n.') || 
    lower.includes('-n.') || 
    lower.includes('bump')
  ) {
    return { role: 'normalMapUrl', fileType: 'image' };
  }

  if (
    lower.includes('rough') || 
    lower.includes('_rgh') || 
    lower.includes('gloss') || 
    lower.includes('_ro.') || 
    lower.includes('_r.') || 
    lower.includes('-r.') || 
    lower.includes('-rough')
  ) {
    return { role: 'roughnessMapUrl', fileType: 'image' };
  }

  if (
    lower.includes('metal') || 
    lower.includes('metallic') || 
    lower.includes('_met') || 
    lower.includes('_m.') || 
    lower.includes('-m.') || 
    lower.includes('-metal')
  ) {
    return { role: 'metalnessMapUrl', fileType: 'image' };
  }

  if (
    lower.includes('emiss') || 
    lower.includes('emission') || 
    lower.includes('emit') || 
    lower.includes('glow') || 
    lower.includes('illum') || 
    lower.includes('_e.') || 
    lower.includes('-e.') || 
    lower.includes('_em.')
  ) {
    return { role: 'emissiveMapUrl', fileType: 'image' };
  }

  if (
    lower.includes('diffuse') || 
    lower.includes('albedo') || 
    lower.includes('basecolor') || 
    lower.includes('base_color') || 
    lower.includes('base') || 
    lower.includes('color') || 
    lower.includes('_col') || 
    lower.includes('_diff') || 
    lower.includes('_alb') || 
    lower.includes('_bc') || 
    lower.includes('_map') || 
    lower.includes('_d.') || 
    lower.includes('-d.') || 
    lower.includes('_c.') || 
    lower.includes('-c.') ||
    lower.includes('texture') ||
    lower.includes('tex')
  ) {
    return { role: 'mapUrl', fileType: 'image' };
  }

  // Default image texture to base diffuse / albedo map
  return { role: 'mapUrl', fileType: 'image' };
}

/**
 * Reads a single file as Data URL.
 */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

/**
 * Parses multiple files in batch and maps them to pieces and texture slots.
 * If filenames don't specify a piece name, they intelligently fall back to the currently selected piece.
 */
export async function parseAssetFilesBatch(
  files: FileList | File[],
  currentModels: Record<PieceType, CustomModel | null>,
  fallbackPieceType: PieceType = 'pawn'
): Promise<BatchParseResult> {
  const fileArray = Array.from(files);
  const updatedModels: Record<PieceType, CustomModel | null> = {
    pawn: currentModels.pawn ? { ...currentModels.pawn } : null,
    rook: currentModels.rook ? { ...currentModels.rook } : null,
    knight: currentModels.knight ? { ...currentModels.knight } : null,
    bishop: currentModels.bishop ? { ...currentModels.bishop } : null,
    queen: currentModels.queen ? { ...currentModels.queen } : null,
    king: currentModels.king ? { ...currentModels.king } : null,
  };

  const parsedAssets: BatchParsedAsset[] = [];
  let matchedCount = 0;
  let unmatchedCount = 0;
  let primaryAffectedPiece: PieceType = fallbackPieceType;

  // Track unmatched mesh allocation order if multiple unnamed meshes are uploaded
  let unnamedMeshIndex = PIECE_TYPES_ORDER.indexOf(fallbackPieceType);
  if (unnamedMeshIndex === -1) unnamedMeshIndex = 0;

  for (const file of fileArray) {
    const ext = file.name.split('.').pop() || '';
    let pieceType = detectPieceType(file.name);
    const { role, fileType } = detectAssetRole(file.name, ext);

    // Fallback: If no piece name in file, assign to active/fallback piece
    if (!pieceType) {
      if (role === 'mesh') {
        pieceType = PIECE_TYPES_ORDER[unnamedMeshIndex % PIECE_TYPES_ORDER.length];
        unnamedMeshIndex++;
      } else {
        pieceType = fallbackPieceType;
      }
    }

    try {
      const dataUrl = await readFileAsDataURL(file);

      parsedAssets.push({
        fileName: file.name,
        pieceType,
        assetRole: role,
        fileType,
        dataUrl,
      });

      if (pieceType && role) {
        matchedCount++;
        primaryAffectedPiece = pieceType;

        const existing = updatedModels[pieceType] || {
          name: `${pieceType.toUpperCase()} 3D Unit`,
          fileType: fileType === 'fbx' ? 'fbx' : 'obj',
          dataUrl: '',
        };

        if (role === 'mesh') {
          updatedModels[pieceType] = {
            ...existing,
            name: file.name,
            fileType: ext.toLowerCase() === 'fbx' ? 'fbx' : 'obj',
            dataUrl: dataUrl,
          };
        } else {
          updatedModels[pieceType] = {
            ...existing,
            [role]: dataUrl,
          };
        }
      } else {
        unmatchedCount++;
      }
    } catch (err) {
      console.error(`Failed to read file ${file.name}:`, err);
      unmatchedCount++;
    }
  }

  return {
    updatedModels,
    parsedAssets,
    matchedCount,
    unmatchedCount,
    primaryAffectedPiece,
  };
}
