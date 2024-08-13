/// <reference types="vite/client" />
export interface IElectronAPI {
  file: {
    openDirectory: () => Promise<string>;
    downloadByBase64: (
      base64Str: string,
      fileName: string,
      outputPath: string
    ) => Promise<void>;
    pathJoin: (path: string, ...paths: string[]) => string;
    openPathDirectory: (path: string) => Promise<void>;
  };
  window: {
    show: () => void;
    showInactive: () => void;
    max: () => void;
    min: () => void;
    close: () => void;
  };
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
