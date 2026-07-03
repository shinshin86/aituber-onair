import type { InochiRuntimeController } from '../types/inochi2d';

type InochiRuntimeSession = {
  getController: () => InochiRuntimeController | null;
  getRegisteredParameterIds: () => string[];
  getBaseParameterValue: (parameterId: string) => number;
};

let activeInochiRuntimeSession: InochiRuntimeSession | null = null;

export const registerInochiRuntimeSession = (
  session: InochiRuntimeSession | null,
) => {
  activeInochiRuntimeSession = session;
};

export const getInochiRuntimeSession = () => activeInochiRuntimeSession;
