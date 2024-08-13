import { ipcRenderer, shell } from "electron";
import * as path from "node:path";

export const downloadByBase64 = (base64Str: string, fileName: string, outPath: string) => {
  return ipcRenderer.invoke("downloadByBase64", base64Str, fileName, outPath);
};

export const openDirectory = () => {
  return ipcRenderer.invoke("dialog:openDirectory");
};

export const pathJoin = (paths: string[]) => {
  const fullPath = path.join(...paths);

  return fullPath;
}

export const openPathDirectory = (path: string) => {
  shell.openPath(path);
}