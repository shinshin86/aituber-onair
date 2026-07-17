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
  assessPsdMotionProfileCompatibility,
  createDefaultPsdMotionProfile,
  createPsdLayerSignature,
  createPsdMotionProfileFile,
  deleteStoredPsdMotionProfile,
  getPsdMotionProfileExportFileName,
  normalizePsdMotionProfile,
  parsePsdMotionProfileJson,
  PSD_MOTION_PROFILE_MAX_JSON_BYTES,
  readStoredPsdMotionProfile,
  saveStoredPsdMotionProfile,
  serializePsdMotionProfileFile,
  sha256Hex,
  type PsdMotionAutomation,
  type PsdMotionModelIdentity,
  type PsdMotionParameterName,
  type PsdMotionProfile,
  type PsdMotionProfileFile,
  type StorageLike,
} from '../lib/psdMotionProfile';
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
  sha256?: string;
}

export interface PsdMotionProfileMessage {
  kind: 'status' | 'warning' | 'error';
  text: string;
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
  motionProfile: PsdMotionProfile;
  motionIdentity: PsdMotionModelIdentity | null;
  motionProfileMessage: PsdMotionProfileMessage;
  motionImportNeedsConfirmation: boolean;
  loadFile: (file: File | null) => Promise<void>;
  clearModel: () => void;
  setLayerVisible: (nodeId: string, visible: boolean) => void;
  setRoleBinding: (role: PsdRole, nodeIds: string[]) => void;
  resetCurrentSettings: () => void;
  updateMotionParameter: (name: PsdMotionParameterName, value: number) => void;
  updateMotionAutomation: (
    name: keyof PsdMotionAutomation,
    value: boolean,
  ) => void;
  resetMotionProfile: () => void;
  exportMotionProfile: () => void;
  importMotionProfile: (file: File | null) => Promise<void>;
  confirmMotionProfileImport: () => void;
  cancelMotionProfileImport: () => void;
}

interface PendingMotionProfileImport {
  file: PsdMotionProfileFile;
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

function getMotionProfileStorage(): StorageLike | null {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
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
  const [motionProfile, setMotionProfile] = useState<PsdMotionProfile>(() =>
    createDefaultPsdMotionProfile(),
  );
  const [motionIdentity, setMotionIdentity] =
    useState<PsdMotionModelIdentity | null>(null);
  const [motionProfileMessage, setMotionProfileMessage] =
    useState<PsdMotionProfileMessage>({ kind: 'status', text: '' });
  const [pendingMotionImport, setPendingMotionImport] =
    useState<PendingMotionProfileImport | null>(null);
  const modelRef = useRef<PsdModel | null>(null);
  const motionProfileRef = useRef(motionProfile);
  const motionIdentityRef = useRef<PsdMotionModelIdentity | null>(null);

  const clearMotionProfileState = useCallback(() => {
    const profile = createDefaultPsdMotionProfile();
    motionProfileRef.current = profile;
    motionIdentityRef.current = null;
    setMotionProfile(profile);
    setMotionIdentity(null);
    setMotionProfileMessage({ kind: 'status', text: '' });
    setPendingMotionImport(null);
  }, []);

  const setActiveMotionProfile = useCallback(
    (profileValue: PsdMotionProfile, successText: string) => {
      const profile = normalizePsdMotionProfile(profileValue);
      motionProfileRef.current = profile;
      setMotionProfile(profile);
      setPendingMotionImport(null);

      const identity = motionIdentityRef.current;
      if (!identity) return;
      const saved = saveStoredPsdMotionProfile(
        getMotionProfileStorage(),
        identity.sha256,
        profile,
      );
      setMotionProfileMessage(
        saved.ok
          ? { kind: 'status', text: successText }
          : {
              kind: 'error',
              text:
                saved.error ||
                'モーション設定を保存できませんでした。表示は継続します。',
            },
      );
    },
    [],
  );

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
    (
      nextRig: Anime25RigDetection,
      nextSource: PsdSourceInfo,
      nextIdentity: PsdMotionModelIdentity,
    ) => {
      const restored = readStoredPsdMotionProfile(
        getMotionProfileStorage(),
        nextIdentity.sha256,
      );
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
      motionProfileRef.current = restored.profile;
      motionIdentityRef.current = nextIdentity;
      setMotionProfile(restored.profile);
      setMotionIdentity(nextIdentity);
      setPendingMotionImport(null);
      setMotionProfileMessage(
        restored.ok
          ? {
              kind: 'status',
              text: restored.found
                ? '保存済みのモーション設定を復元しました。'
                : '初期値を使用中です。変更はこのPSD用に自動保存されます。',
            }
          : {
              kind: 'error',
              text: `${restored.error || '保存データを読み込めませんでした。'} 初期値で表示を継続します。`,
            },
      );
      console.info('Anime2.5DRig motion mode selected:', nextRig.summary);
    },
    [replaceModel],
  );

  const applyLoadedModel = useCallback(
    (
      nextModel: PsdModel,
      nextSource: PsdSourceInfo,
      rigDetection: Anime25RigDetection | null = null,
    ) => {
      const detectedRoles = autoDetectRoleBindings(nextModel);
      const stored = readStore()[nextSource.key];
      replaceModel(nextModel, nextSource);
      setMode('static');
      setRig(rigDetection);
      clearMotionProfileState();
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
    [clearMotionProfileState, replaceModel],
  );

  const loadArrayBuffer = useCallback(
    async (buffer: ArrayBuffer, sourceInput: Omit<PsdSourceInfo, 'sha256'>) => {
      setLoading(true);
      setError('');
      try {
        const rigDetection = await detectAnime25RigFromBuffer(buffer);
        if (rigDetection.usable && rigDetection.rig) {
          const sha256 = await sha256Hex(buffer);
          const nextSource = { ...sourceInput, sha256 };
          const nextIdentity: PsdMotionModelIdentity = {
            sha256,
            width: rigDetection.rig.canvas.w,
            height: rigDetection.rig.canvas.h,
            layerSignature: await createPsdLayerSignature(rigDetection.rig),
            fileNameHint: nextSource.name,
          };
          applyMotionRig(rigDetection, nextSource, nextIdentity);
          return;
        }

        const nextSource: PsdSourceInfo = sourceInput;

        if (rigDetection.reason) {
          console.info(
            `PSD static mode selected for ${nextSource.name}:`,
            rigDetection.reason,
          );
        }

        const nextModel = await parsePsdModel(buffer);
        applyLoadedModel(nextModel, nextSource, rigDetection);
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
    clearMotionProfileState();
    setVisibility({});
    setRoles({
      mouthOpen: [],
      mouthClosed: [],
      eyesOpen: [],
      eyesClosed: [],
    });
    setError('');
  }, [clearMotionProfileState, replaceModel]);

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

  const updateMotionParameter = useCallback(
    (name: PsdMotionParameterName, value: number) => {
      const current = motionProfileRef.current;
      setActiveMotionProfile(
        {
          parameters: { ...current.parameters, [name]: value },
          automation: current.automation,
        },
        'モーション設定を自動保存しました。',
      );
    },
    [setActiveMotionProfile],
  );

  const updateMotionAutomation = useCallback(
    (name: keyof PsdMotionAutomation, value: boolean) => {
      const current = motionProfileRef.current;
      setActiveMotionProfile(
        {
          parameters: current.parameters,
          automation: { ...current.automation, [name]: value },
        },
        'モーション設定を自動保存しました。',
      );
    },
    [setActiveMotionProfile],
  );

  const resetMotionProfile = useCallback(() => {
    const identity = motionIdentityRef.current;
    const profile = createDefaultPsdMotionProfile();
    motionProfileRef.current = profile;
    setMotionProfile(profile);
    setPendingMotionImport(null);
    if (!identity) return;
    const deleted = deleteStoredPsdMotionProfile(
      getMotionProfileStorage(),
      identity.sha256,
    );
    setMotionProfileMessage(
      deleted.ok
        ? {
            kind: 'status',
            text: '初期値へ戻し、このPSDの保存済み設定を削除しました。',
          }
        : {
            kind: 'error',
            text: `${deleted.error || '保存済み設定を削除できませんでした。'} 表示は初期値へ戻しました。`,
          },
    );
  }, []);

  const exportMotionProfile = useCallback(() => {
    const identity = motionIdentityRef.current;
    const currentSource = source;
    if (!identity || !currentSource || mode !== 'motion') {
      setMotionProfileMessage({
        kind: 'error',
        text: 'motion modeのPSDを読み込んでから書き出してください。',
      });
      return;
    }

    try {
      const json = serializePsdMotionProfileFile(
        createPsdMotionProfileFile(identity, motionProfileRef.current),
      );
      const url = URL.createObjectURL(
        new Blob([json], { type: 'application/json;charset=utf-8' }),
      );
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = getPsdMotionProfileExportFileName(currentSource.name);
      anchor.click();
      globalThis.setTimeout(() => URL.revokeObjectURL(url), 0);
      setMotionProfileMessage({
        kind: 'status',
        text: 'モーション設定を書き出しました。',
      });
    } catch {
      setMotionProfileMessage({
        kind: 'error',
        text: 'モーション設定を書き出せませんでした。',
      });
    }
  }, [mode, source]);

  const importMotionProfile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      const identity = motionIdentityRef.current;
      if (!identity || mode !== 'motion') {
        setMotionProfileMessage({
          kind: 'error',
          text: 'motion modeのPSDを読み込んでから読み込んでください。',
        });
        return;
      }
      if (file.size > PSD_MOTION_PROFILE_MAX_JSON_BYTES) {
        setMotionProfileMessage({
          kind: 'error',
          text: `JSONファイルは${PSD_MOTION_PROFILE_MAX_JSON_BYTES / 1024}KB以下にしてください。`,
        });
        return;
      }

      let json: string;
      try {
        json = await file.text();
      } catch {
        setMotionProfileMessage({
          kind: 'error',
          text: 'JSONファイルを読み込めませんでした。',
        });
        return;
      }
      const parsed = parsePsdMotionProfileJson(json);
      if (!parsed.ok) {
        setMotionProfileMessage({ kind: 'error', text: parsed.error });
        return;
      }

      const currentIdentity = motionIdentityRef.current;
      if (!currentIdentity || mode !== 'motion') return;
      const compatibility = assessPsdMotionProfileCompatibility(
        parsed.file,
        currentIdentity,
      );
      if (compatibility.status === 'exact') {
        setActiveMotionProfile(
          {
            parameters: parsed.file.parameters,
            automation: parsed.file.automation,
          },
          'SHA-256が一致するモーション設定を読み込み、保存しました。',
        );
        return;
      }
      if (compatibility.status === 'matching-layout') {
        setPendingMotionImport({ file: parsed.file });
        setMotionProfileMessage({
          kind: 'warning',
          text: '別ファイルですがcanvasとレイヤー構成は一致しています。明示的に承認した場合だけ適用します。',
        });
        return;
      }
      setPendingMotionImport(null);
      setMotionProfileMessage({
        kind: 'error',
        text: '現在のPSDとcanvasまたはレイヤー構成が一致しないため、設定は適用しませんでした。',
      });
    },
    [mode, setActiveMotionProfile],
  );

  const confirmMotionProfileImport = useCallback(() => {
    const pending = pendingMotionImport;
    const identity = motionIdentityRef.current;
    if (!pending || !identity) return;
    const compatibility = assessPsdMotionProfileCompatibility(
      pending.file,
      identity,
    );
    if (compatibility.status !== 'matching-layout') {
      setPendingMotionImport(null);
      setMotionProfileMessage({
        kind: 'error',
        text: 'PSDが変更されたため、設定を適用しませんでした。',
      });
      return;
    }
    setActiveMotionProfile(
      {
        parameters: pending.file.parameters,
        automation: pending.file.automation,
      },
      'レイヤー構成が一致する別PSDの設定を読み込み、保存しました。',
    );
  }, [pendingMotionImport, setActiveMotionProfile]);

  const cancelMotionProfileImport = useCallback(() => {
    setPendingMotionImport(null);
    setMotionProfileMessage({
      kind: 'status',
      text: 'モーション設定の読み込みをキャンセルしました。',
    });
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
      motionProfile,
      motionIdentity,
      motionProfileMessage,
      motionImportNeedsConfirmation: Boolean(pendingMotionImport),
      loadFile,
      clearModel,
      setLayerVisible,
      setRoleBinding,
      resetCurrentSettings,
      updateMotionParameter,
      updateMotionAutomation,
      resetMotionProfile,
      exportMotionProfile,
      importMotionProfile,
      confirmMotionProfileImport,
      cancelMotionProfileImport,
    }),
    [
      clearModel,
      error,
      loadFile,
      loading,
      mode,
      model,
      motionIdentity,
      motionProfile,
      motionProfileMessage,
      pendingMotionImport,
      resetCurrentSettings,
      resetMotionProfile,
      rig,
      roles,
      setLayerVisible,
      setRoleBinding,
      source,
      updateMotionAutomation,
      updateMotionParameter,
      visibility,
      exportMotionProfile,
      importMotionProfile,
      confirmMotionProfileImport,
      cancelMotionProfileImport,
    ],
  );
}
