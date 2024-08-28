import { contextBridge } from "electron";
import * as file from "./preload/file";
import * as window from "./preload/window";
import * as clipboard from "./preload/clipboard";

contextBridge.exposeInMainWorld('electronAPI', {
  file,
  window,
  clipboard
})