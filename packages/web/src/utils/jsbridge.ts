import dsBridge from "dsbridge";

export const getAlbumList = () => {
  console.log("getAlbumList2");
  return new Promise((resolve, reject) => {
    try {
      dsBridge.call(
        "getAlbumList",
        {},
        (res: { id: number; name: string }[]) => {
          resolve(res);
        }
      );
    } catch (e) {
      reject(e);
      console.log(e);
    }
  });
};
