export const downloadByBase64 = (
  base64Str: string,
  fileName: string,
  outputPath: string,
  isBatchDownload: boolean = false
) => {
  return window.electronAPI.file.downloadByBase64(
    base64Str,
    fileName,
    outputPath,
    isBatchDownload
  );
};

export const openDirectory = () => {
  return window.electronAPI.file.openDirectory();
};

export const windowShow = () => {
  return window.electronAPI.window.show();
};

export const windowShowInactive = () => {
  return window.electronAPI.window.showInactive();
};

export const windowMin = () => {
  return window.electronAPI.window.min();
};

export const windowMax = () => {
  return window.electronAPI.window.max();
};

export const windowClose = () => {
  return window.electronAPI.window.close();
};

export const openPathDirectory = (path: string) => {
  return window.electronAPI.file.openPathDirectory(path);
};

export const pathJoin = (path: string, ...paths: string[]) => {
  return window.electronAPI.file.pathJoin(path, ...paths);
}

export const clipboardWriteText = (text: string) => {
  return window.electronAPI.clipboard.writeText(text);
}