import os from "os";

export const getIPAdress = (): string => {
  const interfaces = os.networkInterfaces();

  return Object.values(interfaces)
    .flat()
    .find((alias) => {
      return (
        alias.family === "IPv4" &&
        alias.address !== "127.0.0.1" &&
        !alias.internal
      );
    }).address;
};
