/// <reference types="vite/client" />
export interface IElectronAPI {

  file: {
    openDirectory: () => Promise<string>;
    downloadByBase64: (base64Str: string, outputPath: string) => Promise<void>;
  };
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}