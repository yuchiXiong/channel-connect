import { contextBridge } from "electron";
import * as file from "./preload/file";
import * as window from "./preload/window";

contextBridge.exposeInMainWorld('electronAPI', {
  file,
  window
})