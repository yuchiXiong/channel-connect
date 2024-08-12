export const downloadByBase64 = (
  base64Str: string,
  fileName: string,
  outputPath: string
) => {
  return window.electronAPI.file.downloadByBase64(
    base64Str,
    fileName,
    outputPath
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
