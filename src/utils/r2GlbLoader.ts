import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { PieceType, Side } from '../store/gameStore';

export interface R2ModelPreset {
  id: string;
  name: string;
  recommendedRole: PieceType;
  side: Side;
  url: string;
  description: string;
}

export const R2_PRESET_MODELS: R2ModelPreset[] = [
  {
    id: 'armored_king',
    name: 'Armored King of the Sun',
    recommendedRole: 'king',
    side: 'white',
    url: 'https://pub-2ac8426bc1f54e479526d42b118142fb.r2.dev/Meshy_AI_Armored_King_of_the_S_1028161358_texture.glb',
    description: 'Golden high-ornate radiant monarch with solar crown and plate armor.',
  },
  {
    id: 'azureblade_knight',
    name: 'Azureblade Knight',
    recommendedRole: 'knight',
    side: 'white',
    url: 'https://pub-2ac8426bc1f54e479526d42b118142fb.r2.dev/Meshy_AI_Azureblade_Knight_1028163721_texture.glb',
    description: 'Paladin warrior brandishing sapphire steel broadsword.',
  },
  {
    id: 'brass_cog_knight',
    name: 'Brass Cog Knight',
    recommendedRole: 'rook',
    side: 'white',
    url: 'https://pub-2ac8426bc1f54e479526d42b118142fb.r2.dev/Meshy_AI_Brass_Cog_Knight_1028161437_texture.glb',
    description: 'Heavy steam-forged fortress juggernaut encased in brass plating.',
  },
  {
    id: 'crimson_demon',
    name: 'Crimson-eyed Demon Warrior',
    recommendedRole: 'pawn',
    side: 'black',
    url: 'https://pub-2ac8426bc1f54e479526d42b118142fb.r2.dev/Meshy_AI_Crimson_eyed_Demon_Wa_1028163649_texture.glb',
    description: 'Abyssal infantry wielding cursed underworld daggers.',
  },
  {
    id: 'empress_shadows',
    name: 'Empress of Shadows',
    recommendedRole: 'queen',
    side: 'black',
    url: 'https://pub-2ac8426bc1f54e479526d42b118142fb.r2.dev/Meshy_AI_Empress_of_Shadows_1028161557_texture.glb',
    description: 'Elegantly lethal sorceress sovereign channeling dark matter.',
  },
  {
    id: 'lionshield_knight',
    name: 'Lionshield Knight',
    recommendedRole: 'pawn',
    side: 'white',
    url: 'https://pub-2ac8426bc1f54e479526d42b118142fb.r2.dev/Meshy_AI_Lionshield_Knight_1028154052_texture.glb',
    description: 'Vanguard royal footman carrying an embossed lion crest shield.',
  },
  {
    id: 'midnight_knight',
    name: 'Midnight Knight on a Steed',
    recommendedRole: 'knight',
    side: 'black',
    url: 'https://pub-2ac8426bc1f54e479526d42b118142fb.r2.dev/Meshy_AI_Midnight_Knight_on_a__1028163302_texture.glb',
    description: 'Mounted shadow rider charging on a war horse.',
  },
  {
    id: 'obsidian_arbiter',
    name: 'Obsidian Arbiter',
    recommendedRole: 'bishop',
    side: 'black',
    url: 'https://pub-2ac8426bc1f54e479526d42b118142fb.r2.dev/Meshy_AI_Obsidian_Arbiter_1028161505_texture.glb',
    description: 'Dark inquisitor priest channeling nether magic staff.',
  },
  {
    id: 'obsidian_sentinel',
    name: 'Obsidian Sentinel',
    recommendedRole: 'rook',
    side: 'black',
    url: 'https://pub-2ac8426bc1f54e479526d42b118142fb.r2.dev/Meshy_AI_Obsidian_Sentinel_1028161537_texture.glb',
    description: 'Monolithic fortress golem chiseled from volcanic obsidian.',
  },
  {
    id: 'rustbound_knight',
    name: 'Rustbound Knight',
    recommendedRole: 'pawn',
    side: 'white',
    url: 'https://pub-2ac8426bc1f54e479526d42b118142fb.r2.dev/Meshy_AI_Rustbound_Knight_1028163512_texture.glb',
    description: 'Battle-hardened veteran soldier in reinforced iron mail.',
  },
  {
    id: 'spiked_vestments',
    name: 'Spiked Vestments',
    recommendedRole: 'bishop',
    side: 'white',
    url: 'https://pub-2ac8426bc1f54e479526d42b118142fb.r2.dev/Meshy_AI_Spiked_Vestments_1028163428_texture.glb',
    description: 'High clerical prelate draped in holy pointed chasubles.',
  },
  {
    id: 'black_knight_champion',
    name: "The Black Knight's Champion",
    recommendedRole: 'king',
    side: 'black',
    url: 'https://pub-2ac8426bc1f54e479526d42b118142fb.r2.dev/Meshy_AI_The_Black_Knight_s_Ch_1028161616_texture.glb',
    description: 'Supreme warlord clad in obsidian dragon-forged armor.',
  },
];

export const DEFAULT_PIECE_GLB_URLS: Record<string, string> = {
  pawn_white: 'https://pub-2ac8426bc1f54e479526d42b118142fb.r2.dev/Meshy_AI_Lionshield_Knight_1028154052_texture.glb',
  rook_white: 'https://pub-2ac8426bc1f54e479526d42b118142fb.r2.dev/Meshy_AI_Brass_Cog_Knight_1028161437_texture.glb',
  knight_white: 'https://pub-2ac8426bc1f54e479526d42b118142fb.r2.dev/Meshy_AI_Azureblade_Knight_1028163721_texture.glb',
  bishop_white: 'https://pub-2ac8426bc1f54e479526d42b118142fb.r2.dev/Meshy_AI_Spiked_Vestments_1028163428_texture.glb',
  queen_white: 'https://pub-2ac8426bc1f54e479526d42b118142fb.r2.dev/Meshy_AI_Empress_of_Shadows_1028161557_texture.glb',
  king_white: 'https://pub-2ac8426bc1f54e479526d42b118142fb.r2.dev/Meshy_AI_Armored_King_of_the_S_1028161358_texture.glb',

  pawn_black: 'https://pub-2ac8426bc1f54e479526d42b118142fb.r2.dev/Meshy_AI_Crimson_eyed_Demon_Wa_1028163649_texture.glb',
  rook_black: 'https://pub-2ac8426bc1f54e479526d42b118142fb.r2.dev/Meshy_AI_Obsidian_Sentinel_1028161537_texture.glb',
  knight_black: 'https://pub-2ac8426bc1f54e479526d42b118142fb.r2.dev/Meshy_AI_Midnight_Knight_on_a__1028163302_texture.glb',
  bishop_black: 'https://pub-2ac8426bc1f54e479526d42b118142fb.r2.dev/Meshy_AI_Obsidian_Arbiter_1028161505_texture.glb',
  queen_black: 'https://pub-2ac8426bc1f54e479526d42b118142fb.r2.dev/Meshy_AI_Empress_of_Shadows_1028161557_texture.glb',
  king_black: 'https://pub-2ac8426bc1f54e479526d42b118142fb.r2.dev/Meshy_AI_The_Black_Knight_s_Ch_1028161616_texture.glb',
};

// Target heights for pieces to maintain chess hierarchy on square (size ~1.0)
export const PIECE_SCALE_HEIGHTS: Record<PieceType, number> = {
  pawn: 1.15,
  rook: 1.30,
  knight: 1.35,
  bishop: 1.45,
  queen: 1.60,
  king: 1.75,
};

// Global in-memory cache for loaded normalized GLTF scenes
const loadedSceneCache = new Map<string, THREE.Group>();
const pendingPromises = new Map<string, Promise<THREE.Group>>();

export interface LoadingProgressState {
  isLoading: boolean;
  progressPercent: number;
  loadedCount: number;
  totalCount: number;
  currentItem: string;
  errorCount: number;
  isComplete: boolean;
}

type ProgressListener = (state: LoadingProgressState) => void;
const progressListeners = new Set<ProgressListener>();

let globalLoadingState: LoadingProgressState = {
  isLoading: false,
  progressPercent: 100,
  loadedCount: 0,
  totalCount: 0,
  currentItem: '',
  errorCount: 0,
  isComplete: true,
};

export function subscribeToModelLoading(listener: ProgressListener) {
  progressListeners.add(listener);
  listener(globalLoadingState);
  return () => {
    progressListeners.delete(listener);
  };
}

function updateLoadingState(update: Partial<LoadingProgressState>) {
  globalLoadingState = { ...globalLoadingState, ...update };
  progressListeners.forEach((l) => l(globalLoadingState));
}

/**
 * Normalizes a raw loaded GLTF scene graph:
 * - Computes tight bounding box
 * - Centers model on X and Z axis
 * - Offsets Y so model base touches y = 0.0 perfectly
 * - Scales model to target height
 * - Traverses meshes to set castShadow = true, receiveShadow = true, and proper normals
 */
export function normalizeGltfScene(scene: THREE.Group, targetHeight: number = 1.4): THREE.Group {
  const container = new THREE.Group();
  container.name = 'NormalizedModelRoot';

  // Traverse meshes to ensure shadows and material roughness
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;

      if (mesh.geometry && !mesh.geometry.attributes.normal) {
        mesh.geometry.computeVertexNormals();
      }

      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => {
            mat.side = THREE.DoubleSide;
            mat.needsUpdate = true;
          });
        } else {
          mesh.material.side = THREE.DoubleSide;
          mesh.material.needsUpdate = true;
        }
      }
    }
  });

  // Calculate bounding box
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const maxDimension = Math.max(size.x, size.y, size.z);
  const scale = maxDimension > 0 ? targetHeight / Math.max(size.y, maxDimension * 0.7) : 1;

  scene.scale.setScalar(scale);

  // Recalculate scaled bounds
  const scaledBox = new THREE.Box3().setFromObject(scene);
  const scaledCenter = new THREE.Vector3();
  scaledBox.getCenter(scaledCenter);

  // Center horizontally and rest flush on ground at y = 0
  scene.position.x = -scaledCenter.x;
  scene.position.z = -scaledCenter.z;
  scene.position.y = -scaledBox.min.y;

  container.add(scene);
  return container;
}

/**
 * Loads a single GLB model from a Cloudflare R2 URL.
 */
export async function loadR2GlbModel(
  url: string,
  targetHeight: number = 1.4,
  customManager?: THREE.LoadingManager
): Promise<THREE.Group> {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    throw new Error('Empty model URL provided');
  }

  const cleanUrl = url.trim();
  const cacheKey = `${cleanUrl}_h${targetHeight.toFixed(2)}`;

  if (loadedSceneCache.has(cacheKey)) {
    return loadedSceneCache.get(cacheKey)!;
  }

  if (pendingPromises.has(cacheKey)) {
    return pendingPromises.get(cacheKey)!;
  }

  const loader = new GLTFLoader(customManager);

  const promise = new Promise<THREE.Group>((resolve, reject) => {
    loader.load(
      cleanUrl,
      (gltf) => {
        try {
          const normalized = normalizeGltfScene(gltf.scene, targetHeight);
          loadedSceneCache.set(cacheKey, normalized);
          pendingPromises.delete(cacheKey);
          resolve(normalized);
        } catch (err) {
          pendingPromises.delete(cacheKey);
          reject(err);
        }
      },
      undefined,
      (error) => {
        console.warn(`Failed to load GLB model from ${cleanUrl}:`, error);
        pendingPromises.delete(cacheKey);
        reject(error);
      }
    );
  });

  pendingPromises.set(cacheKey, promise);
  return promise;
}

/**
 * Clones a cached model instance for a specific board square piece.
 */
export function cloneCachedR2Model(url: string, targetHeight: number = 1.4): THREE.Group | null {
  const cleanUrl = url.trim();
  const cacheKey = `${cleanUrl}_h${targetHeight.toFixed(2)}`;
  const cached = loadedSceneCache.get(cacheKey);
  if (!cached) return null;

  try {
    const cloned = SkeletonUtils.clone(cached) as THREE.Group;
    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return cloned;
  } catch (e) {
    return cached.clone(true) as THREE.Group;
  }
}

/**
 * Preloads all unique R2 URLs for the active game using THREE.LoadingManager.
 * Updates the global loading overlay state.
 */
export async function preloadGameR2Models(
  urlMap: Record<string, string>,
  pieceHeights?: Record<PieceType, number>
): Promise<void> {
  const uniqueUrls = Array.from(new Set(Object.values(urlMap).filter(Boolean)));
  if (uniqueUrls.length === 0) {
    updateLoadingState({
      isLoading: false,
      progressPercent: 100,
      isComplete: true,
    });
    return;
  }

  const total = uniqueUrls.length;
  let loaded = 0;
  let errors = 0;

  updateLoadingState({
    isLoading: true,
    progressPercent: 0,
    loadedCount: 0,
    totalCount: total,
    currentItem: 'Initializing 3D Armory...',
    errorCount: 0,
    isComplete: false,
  });

  const manager = new THREE.LoadingManager();

  manager.onProgress = (itemUrl, itemsLoaded, itemsTotal) => {
    const filename = itemUrl.split('/').pop()?.replace('.glb', '') || itemUrl;
    const pct = Math.min(99, Math.round((itemsLoaded / itemsTotal) * 100));
    updateLoadingState({
      progressPercent: pct,
      loadedCount: itemsLoaded,
      totalCount: itemsTotal,
      currentItem: filename,
    });
  };

  const loadPromises = uniqueUrls.map(async (url) => {
    try {
      // Find default target height or default 1.4
      let height = 1.4;
      for (const [key, mappedUrl] of Object.entries(urlMap)) {
        if (mappedUrl === url) {
          const pieceType = key.split('_')[0] as PieceType;
          if (pieceHeights?.[pieceType]) {
            height = pieceHeights[pieceType];
          } else if (PIECE_SCALE_HEIGHTS[pieceType]) {
            height = PIECE_SCALE_HEIGHTS[pieceType];
          }
          break;
        }
      }

      await loadR2GlbModel(url, height, manager);
      loaded++;
    } catch (err) {
      console.warn(`Error loading model ${url}:`, err);
      errors++;
    }
  });

  await Promise.allSettled(loadPromises);

  updateLoadingState({
    isLoading: false,
    progressPercent: 100,
    loadedCount: loaded,
    totalCount: total,
    currentItem: 'All Models Ready',
    errorCount: errors,
    isComplete: true,
  });
}

/**
 * Returns the matched R2 URL for a given piece and side.
 */
export function resolvePieceR2Url(
  type: PieceType,
  side: Side,
  customUrls?: Record<string, string>
): string | undefined {
  if (customUrls) {
    const sideKey = `${type}_${side}`;
    if (customUrls[sideKey]) return customUrls[sideKey];
    if (customUrls[type]) return customUrls[type];
  }
  const defaultSideKey = `${type}_${side}`;
  return DEFAULT_PIECE_GLB_URLS[defaultSideKey] || DEFAULT_PIECE_GLB_URLS[type];
}
