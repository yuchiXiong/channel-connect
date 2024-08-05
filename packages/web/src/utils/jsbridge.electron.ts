export const downloadByBase64 = (base64Str: string, fileName: string, outputPath: string) => {
  return window.electronAPI.file.downloadByBase64(base64Str, fileName, outputPath);
};

export const openDirectory = () => {
  return window.electronAPI.file.openDirectory();
} 