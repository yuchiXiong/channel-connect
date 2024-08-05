import { contextBridge } from "electron";
import * as file from "./preload/file";

contextBridge.exposeInMainWorld('electronAPI', {
  file,
})