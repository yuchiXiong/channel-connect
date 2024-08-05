export const downloadByBase64 = (base64Str: string, outputPath: string) => {
  window.electronAPI.file.downloadByBase64(base64Str, outputPath);
};

export const openDirectory = () => {
  return window.electronAPI.file.openDirectory();
} 