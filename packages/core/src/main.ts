import { app, BrowserWindow, ipcMain, dialog, screen } from "electron";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { getIPAdress } from "./utils/dev-tools";
import { optimizer } from "@electron-toolkit/utils";

async function handleOpenDirectory() {
  console.log("[DEBUG] handleOpenDirectory");
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
  if (!canceled) {
    return filePaths[0];
  }
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

const createWindow = () => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const mainWindow = new BrowserWindow({
    width: width * 0.8,
    height: height * 0.8,
    center: true,
    // resizable: false,
    frame: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadURL(`http://${getIPAdress()}:5173`);

  // mainWindow.loadURL("http://10.241.38.201:5173");
  // if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
  //   mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  // } else {
  //   mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  // }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

app.whenReady().then(() => {
  ipcMain.handle("dialog:openDirectory", handleOpenDirectory);
  ipcMain.handle(
    "downloadByBase64",
    (e, base64Str, fileName, outPath, isBatchDownload) => {
      // base64字符串转二进制图片数据
      const buffer = Buffer.from(base64Str, "base64");

      // 如果地址不存在，则创建
      if (!fs.existsSync(outPath)) {
        fs.mkdirSync(outPath, { recursive: true });
      }

      if (!isBatchDownload) {
        fs.writeFileSync(path.join(outPath, fileName), buffer);
        return;
      }

      const [pureFileName, extName] = fileName.split(".");
      const md5 = crypto.createHash("md5").update(buffer).digest("hex");

      // 如果本地有 JSON 记录文件，则读取
      const jsonPath = path.join(outPath, "download.json");
      if (fs.existsSync(jsonPath)) {
        const json: Record<string, string> = JSON.parse(
          fs.readFileSync(jsonPath, "utf-8")
        );

        if (json[`${pureFileName}-${md5}-${extName}`]) {
          return;
        } else {
          fs.writeFileSync(path.join(outPath, fileName), buffer);
          json[`${pureFileName}-${md5}-${extName}`] = fileName;
          fs.writeFileSync(jsonPath, JSON.stringify(json));
        }
      } else {
        fs.writeFileSync(path.join(outPath, fileName), buffer);
        const json = { [`${pureFileName}-${md5}-${extName}`]: fileName };
        fs.writeFileSync(jsonPath, JSON.stringify(json));
      }
    }
  );
  optimizer.registerFramelessWindowIpc();
});
