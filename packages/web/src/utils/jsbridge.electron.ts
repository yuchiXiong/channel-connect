export const downloadByBase64 = (base64Str: string) => {
  window.electronAPI.file.downloadByBase64(base64Str);
};
