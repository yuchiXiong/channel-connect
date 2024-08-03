import dsBridge from "dsbridge";

export interface IAlbumListItem {
  id: number;
  name: string;
  cover: string;
  count: number;
  children: {
    id: number;
    cover: string;
  }[]
}

export const getAlbumList = (): Promise<IAlbumListItem[]> => {
  console.log("getAlbumList");
  return new Promise((resolve, reject) => {
    try {
      dsBridge.call("getAlbumList", {}, (res: IAlbumListItem[]) => {
        resolve(res);
      });
    } catch (e) {
      reject(e);
      console.log(e);
    }
  });
};

export const getPhotoInfo = (id: number): Promise<{
  id: number;
  thumb: string;
  origin: string
}> => {
  return new Promise((resolve, reject) => {
    try {
      dsBridge.call("getPhotoThumb", { id }, (res: {
        id: number;
        thumb: string;
        origin: string
      }) => {
        resolve(res);
      });
    } catch (e) {
      reject(e);
      console.log(e);
    }
  });
}
