import { clipboard } from "electron";

export const writeText = (text: string) => {
  clipboard.writeText(text);
};
