import { ipcRenderer } from "electron";

export const downloadByBase64 = (
  base64Str: string,
  outPath = "/Users/zyb/Downloads"
) => {
  return ipcRenderer.invoke("downloadByBase64", base64Str, outPath);
};