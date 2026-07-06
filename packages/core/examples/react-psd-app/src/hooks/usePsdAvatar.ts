import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  closePsdModel,
  parsePsdModel,
  summarizeUnsupported,
  type PsdModel,
} from '../lib/psdModel';
import { autoDetectRoleBindings, mergeRoleBindings } from '../lib/psdBinding';
import {
  detectAnime25RigFromBuffer,
  type Anime25RigDetection,
} from '../lib/rig/anime25Rig';
import {
  getInitialVisibility,
  setNodeVisible,
  type PsdRole,
  type PsdRoleBindings,
  type PsdVisibilityOverrides,
} from '../lib/psdVisibility';

const PSD_STORAGE_KEY = 'react-psd-app-psd-avatar-settings';
const SAMPLE_PSD_URL = '/avatar/sample.psd';

interface StoredPsdSettings {
  visibility: PsdVisibilityOverrides;
  roles: Partial<PsdRoleBindings>;
}

export interface PsdSourceInfo {
  name: string;
  size: number;
  key: string;
  bundled: boolean;
}

export interface PsdAvatarController {
  mode: 'static' | 'motion';
  model: PsdModel | null;
  rig: Anime25RigDetection | null;
  source: PsdSourceInfo | null;
  visibility: PsdVisibilityOverrides;
  roles: PsdRoleBindings;
  loading: boolean;
  error: string;
  loadFile: (file: File | null) => Promise<void>;
  clearModel: () => void;
  setLayerVisible: (nodeId: string, visible: boolean) => void;
  setRoleBinding: (role: PsdRole, nodeIds: string[]) => void;
  resetCurrentSettings: () => void;
}

function readStore(): Record<string, StoredPsdSettings> {
  try {
    const value = localStorage.getItem(PSD_STORAGE_KEY);
    if (!value) return {};
    const parsed = JSON.parse(value) as Record<string, StoredPsdSettings>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, StoredPsdSettings>) {
  localStorage.setItem(PSD_STORAGE_KEY, JSON.stringify(store));
}

function sourceKey(name: string, size: number) {
  return `${name}:${size}`;
}

export function usePsdAvatar(): PsdAvatarController {
  const [mode, setMode] = useState<'static' | 'motion'>('static');
  const [model, setModel] = useState<PsdModel | null>(null);
  const [rig, setRig] = useState<Anime25RigDetection | null>(null);
  const [source, setSource] = useState<PsdSourceInfo | null>(null);
  const [visibility, setVisibility] = useState<PsdVisibilityOverrides>({});
  const [roles, setRoles] = useState<PsdRoleBindings>({
    mouthOpen: [],
    mouthClosed: [],
    eyesOpen: [],
    eyesClosed: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const modelRef = useRef<PsdModel | null>(null);

  const replaceModel = useCallback(
    (nextModel: PsdModel | null, nextSource: PsdSourceInfo | null) => {
      closePsdModel(modelRef.current);
      modelRef.current = nextModel;
      setModel(nextModel);
      setSource(nextSource);
    },
    [],
  );

  const applyMotionRig = useCallback(
    (nextRig: Anime25RigDetection, nextSource: PsdSourceInfo) => {
      replaceModel(null, nextSource);
      setMode('motion');
      setRig(nextRig);
      setVisibility({});
      setRoles({
        mouthOpen: [],
        mouthClosed: [],
        eyesOpen: [],
        eyesClosed: [],
      });
      setError('');
      console.info('Anime2.5DRig motion mode selected:', nextRig.summary);
    },
    [replaceModel],
  );

  const applyLoadedModel = useCallback(
    (nextModel: PsdModel, nextSource: PsdSourceInfo) => {
      const detectedRoles = autoDetectRoleBindings(nextModel);
      const stored = readStore()[nextSource.key];
      replaceModel(nextModel, nextSource);
      setMode('static');
      setRig(null);
      setVisibility(stored?.visibility || getInitialVisibility(nextModel));
      setRoles(mergeRoleBindings(detectedRoles, stored?.roles));
      setError('');

      const warnings = summarizeUnsupported(nextModel.unsupported);
      if (warnings.length > 0) {
        console.warn(
          `PSD limitations applied for ${nextSource.name}:`,
          warnings,
        );
      }
    },
    [replaceModel],
  );

  const loadArrayBuffer = useCallback(
    async (buffer: ArrayBuffer, nextSource: PsdSourceInfo) => {
      setLoading(true);
      setError('');
      try {
        const rigDetection = await detectAnime25RigFromBuffer(buffer);
        if (rigDetection.usable) {
          applyMotionRig(rigDetection, nextSource);
          return;
        }

        if (rigDetection.reason) {
          console.info(
            `PSD static mode selected for ${nextSource.name}:`,
            rigDetection.reason,
          );
        }

        const nextModel = await parsePsdModel(buffer);
        applyLoadedModel(nextModel, nextSource);
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : 'Failed to load PSD file.';
        setError(message);
        console.error(loadError);
      } finally {
        setLoading(false);
      }
    },
    [applyLoadedModel, applyMotionRig],
  );

  const loadFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      await loadArrayBuffer(await file.arrayBuffer(), {
        name: file.name,
        size: file.size,
        key: sourceKey(file.name, file.size),
        bundled: false,
      });
    },
    [loadArrayBuffer],
  );

  const clearModel = useCallback(() => {
    replaceModel(null, null);
    setMode('static');
    setRig(null);
    setVisibility({});
    setRoles({
      mouthOpen: [],
      mouthClosed: [],
      eyesOpen: [],
      eyesClosed: [],
    });
    setError('');
  }, [replaceModel]);

  const resetCurrentSettings = useCallback(() => {
    if (!model || !source) return;
    const store = readStore();
    delete store[source.key];
    writeStore(store);
    setVisibility(getInitialVisibility(model));
    setRoles(autoDetectRoleBindings(model));
  }, [model, source]);

  const setLayerVisible = useCallback(
    (nodeId: string, visible: boolean) => {
      if (!model) return;
      setVisibility((prev) => setNodeVisible(model, prev, nodeId, visible));
    },
    [model],
  );

  const setRoleBinding = useCallback((role: PsdRole, nodeIds: string[]) => {
    setRoles((prev) => ({ ...prev, [role]: nodeIds }));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadSample = async () => {
      try {
        const response = await fetch(SAMPLE_PSD_URL);
        if (!response.ok) return;
        const buffer = await response.arrayBuffer();
        if (cancelled) return;
        await loadArrayBuffer(buffer, {
          name: 'sample.psd',
          size: buffer.byteLength,
          key: sourceKey('sample.psd', buffer.byteLength),
          bundled: true,
        });
      } catch (sampleError) {
        console.warn('Bundled sample PSD could not be loaded.', sampleError);
      }
    };

    loadSample();
    return () => {
      cancelled = true;
    };
  }, [loadArrayBuffer]);

  useEffect(() => {
    if (!source || !model) return;
    const store = readStore();
    store[source.key] = { visibility, roles };
    writeStore(store);
  }, [model, roles, source, visibility]);

  useEffect(() => () => closePsdModel(modelRef.current), []);

  return useMemo(
    () => ({
      mode,
      model,
      rig,
      source,
      visibility,
      roles,
      loading,
      error,
      loadFile,
      clearModel,
      setLayerVisible,
      setRoleBinding,
      resetCurrentSettings,
    }),
    [
      clearModel,
      error,
      loadFile,
      loading,
      mode,
      model,
      resetCurrentSettings,
      rig,
      roles,
      setLayerVisible,
      setRoleBinding,
      source,
      visibility,
    ],
  );
}
