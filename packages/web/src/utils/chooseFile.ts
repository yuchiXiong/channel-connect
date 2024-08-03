export const chooseFile = (options?: {
  accept: string;
  multiple: boolean;
  webkitdirectory: boolean;
}): Promise<File[]> => {
  return new Promise((resolve, reject) => {
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = options?.accept || "";
      input.multiple = options?.multiple || false;
      input.webkitdirectory = options?.webkitdirectory || false;
      input.addEventListener("change", (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files) {
          resolve(Array.from(files));
        }
      });
      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);
      input.remove();
    } catch (e) {
      reject(e);
    }
  });
};
