import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export interface Loaded3DModelResult {
  object: THREE.Group;
  meshCount: number;
  vertexCount: number;
  boundingBox: THREE.Box3;
}

// In-Memory Caches for High-Performance Re-use
const modelPromiseCache = new Map<string, Promise<Loaded3DModelResult>>();
const textureCache = new Map<string, THREE.Texture>();
const materialCache = new Map<string, THREE.MeshStandardMaterial>();

/**
 * Creates a unique cache key from dataUrl + fileType + targetSize
 */
function getModelCacheKey(dataUrl: string, fileType: string, targetSize: number): string {
  const len = dataUrl.length;
  const sample = dataUrl.slice(0, 64) + dataUrl.slice(-64);
  return `${fileType}_${targetSize}_${len}_${sample}`;
}

/**
 * Converts a base64 data URI to an ArrayBuffer safely.
 */
export function base64ToArrayBuffer(base64DataUrl: string): ArrayBuffer {
  let base64String = base64DataUrl;
  const commaIndex = base64DataUrl.indexOf(',');
  if (commaIndex !== -1) {
    base64String = base64DataUrl.slice(commaIndex + 1);
  }
  base64String = base64String.replace(/\s/g, '');

  const binaryString = atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Converts a base64 data URI to a UTF-8 text string (for OBJ files).
 */
export function base64ToText(base64DataUrl: string): string {
  if (base64DataUrl.startsWith('#') || base64DataUrl.startsWith('v ') || base64DataUrl.startsWith('o ') || base64DataUrl.startsWith('g ')) {
    return base64DataUrl;
  }

  const commaIndex = base64DataUrl.indexOf(',');
  let base64String = commaIndex !== -1 ? base64DataUrl.slice(commaIndex + 1) : base64DataUrl;
  base64String = base64String.replace(/\s/g, '');

  try {
    const binaryString = atob(base64String);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(bytes);
  } catch (err) {
    return atob(base64String);
  }
}

/**
 * Robust loader for OBJ and FBX data URLs with automatic caching, centering and bounding normalization.
 */
export async function loadAndNormalizeModel(
  dataUrl: string,
  fileType: 'obj' | 'fbx',
  targetSize: number = 1.0,
  restOnGround: boolean = true
): Promise<Loaded3DModelResult> {
  if (!dataUrl || dataUrl.trim() === '') {
    throw new Error('Empty 3D model data provided.');
  }

  const cacheKey = getModelCacheKey(dataUrl, fileType, targetSize);

  if (modelPromiseCache.has(cacheKey)) {
    const cached = await modelPromiseCache.get(cacheKey)!;
    return {
      object: cached.object.clone(true) as THREE.Group,
      meshCount: cached.meshCount,
      vertexCount: cached.vertexCount,
      boundingBox: cached.boundingBox.clone(),
    };
  }

  const loadPromise = (async (): Promise<Loaded3DModelResult> => {
    let rawObject: THREE.Group | THREE.Object3D;

    if (fileType === 'obj') {
      const objLoader = new OBJLoader();
      try {
        const textContent = base64ToText(dataUrl);
        rawObject = objLoader.parse(textContent);
      } catch (parseErr) {
        const arrayBuffer = base64ToArrayBuffer(dataUrl);
        const blob = new Blob([arrayBuffer], { type: 'text/plain' });
        const blobUrl = URL.createObjectURL(blob);
        try {
          rawObject = await new Promise<THREE.Group>((resolve, reject) => {
            objLoader.load(blobUrl, resolve, undefined, reject);
          });
        } finally {
          URL.revokeObjectURL(blobUrl);
        }
      }
    } else if (fileType === 'fbx') {
      const fbxLoader = new FBXLoader();
      try {
        const arrayBuffer = base64ToArrayBuffer(dataUrl);
        rawObject = fbxLoader.parse(arrayBuffer, '');
      } catch (parseErr) {
        const arrayBuffer = base64ToArrayBuffer(dataUrl);
        const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
        const blobUrl = URL.createObjectURL(blob);
        try {
          rawObject = await new Promise<THREE.Group>((resolve, reject) => {
            fbxLoader.load(blobUrl, resolve, undefined, reject);
          });
        } finally {
          URL.revokeObjectURL(blobUrl);
        }
      }
    } else {
      throw new Error(`Unsupported 3D file type: ${fileType}`);
    }

    let meshCount = 0;
    let vertexCount = 0;

    rawObject.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        meshCount++;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;

        if (mesh.geometry) {
          if (!mesh.geometry.attributes.normal) {
            mesh.geometry.computeVertexNormals();
          }
          if (mesh.geometry.attributes.position) {
            vertexCount += mesh.geometry.attributes.position.count;
          }
        }
      }
    });

    const box = new THREE.Box3().setFromObject(rawObject);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);

    if (maxDim > 0) {
      const scaleFactor = targetSize / maxDim;
      rawObject.scale.setScalar(scaleFactor);
    }

    box.setFromObject(rawObject);
    const center = new THREE.Vector3();
    box.getCenter(center);

    rawObject.position.x = -center.x;
    rawObject.position.z = -center.z;
    if (restOnGround) {
      rawObject.position.y = -box.min.y;
    } else {
      rawObject.position.y = -center.y;
    }

    const finalContainer = new THREE.Group();
    finalContainer.add(rawObject);

    const finalBox = new THREE.Box3().setFromObject(finalContainer);

    return {
      object: finalContainer,
      meshCount,
      vertexCount,
      boundingBox: finalBox,
    };
  })();

  modelPromiseCache.set(cacheKey, loadPromise);

  try {
    const res = await loadPromise;
    return {
      object: res.object.clone(true) as THREE.Group,
      meshCount: res.meshCount,
      vertexCount: res.vertexCount,
      boundingBox: res.boundingBox.clone(),
    };
  } catch (err) {
    modelPromiseCache.delete(cacheKey);
    throw err;
  }
}

/**
 * Texture loader with caching and correct color space mapping.
 */
export function loadPBRTexture(
  dataUrl: string | undefined, 
  isSRGB: boolean = true, 
  onLoaded?: (tex: THREE.Texture) => void
): THREE.Texture | null {
  if (!dataUrl || dataUrl.trim() === '') return null;

  const cacheKey = `${isSRGB ? 'srgb' : 'linear'}_${dataUrl.slice(0, 48)}_${dataUrl.length}`;
  if (textureCache.has(cacheKey)) {
    const existing = textureCache.get(cacheKey)!;
    if (onLoaded) onLoaded(existing);
    return existing;
  }

  const loader = new THREE.TextureLoader();
  try {
    const texture = loader.load(
      dataUrl,
      (tex) => {
        tex.needsUpdate = true;
        if (onLoaded) onLoaded(tex);
      },
      undefined,
      (err) => {
        console.error('Failed to load texture:', err);
      }
    );
    texture.colorSpace = isSRGB ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    textureCache.set(cacheKey, texture);
    return texture;
  } catch (err) {
    console.error('Failed to load texture:', err);
    return null;
  }
}

/**
 * Clears cached models and textures to free memory if needed.
 */
export function clearModelCaches(): void {
  modelPromiseCache.clear();
  textureCache.forEach((tex) => tex.dispose());
  textureCache.clear();
  materialCache.forEach((mat) => mat.dispose());
  materialCache.clear();
}
