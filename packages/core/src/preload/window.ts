import { ipcRenderer } from "electron";

export const show = () => ipcRenderer.send("win:invoke", "show");
export const showInactive = () =>
  ipcRenderer.send("win:invoke", "showInactive");
export const max = () => ipcRenderer.send("win:invoke", "max");
export const min = () => ipcRenderer.send("win:invoke", "min");
export const close = () => ipcRenderer.send("win:invoke", "close");
