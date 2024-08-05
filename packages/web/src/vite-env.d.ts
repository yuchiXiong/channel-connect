/// <reference types="vite/client" />
export interface IElectronAPI {

  file: {
    downloadByBase64: (base64Str: string) => Promise<void>;
  };
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}