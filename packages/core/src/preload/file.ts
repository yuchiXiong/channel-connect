import { ipcRenderer } from "electron";

export const downloadByBase64 = (base64Str: string, outPath: string) => {
  return ipcRenderer.invoke("downloadByBase64", base64Str, outPath);
};

export const openDirectory = () => {
  return ipcRenderer.invoke("dialog:openDirectory");
};
