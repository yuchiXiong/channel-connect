import dsBridge from "dsbridge";

export interface IAlbumListItem {
  id: string;
  name: string;
  cover: string;
  count: number;
  children: {
    id: string;
    thumb: string;
    origin: string;
    title: string;
    width: number;
    height: number;
    createDateSecond: number;
  }[];
}

export type IPhotoInfo = IAlbumListItem["children"][number];

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

export const getPhotoInfo = (id: string): Promise<IPhotoInfo> => {
  return new Promise((resolve, reject) => {
    try {
      dsBridge.call("getPhotoThumb", { id }, (res: IPhotoInfo) => {
        resolve(res);
      });
    } catch (e) {
      reject(e);
      console.log(e);
    }
  });
};

export const getPhotoOrigin = (id: string): Promise<IPhotoInfo> => {
  return new Promise((resolve, reject) => {
    try {
      dsBridge.call("getPhotoOrigin", { id }, (res: IPhotoInfo) => {
        resolve(res);
      });
    } catch (e) {
      reject(e);
      console.log(e);
    }
  });
};

export const scanQRCode = ():Promise<string> => {
  console.log("scanQRCode");
  return new Promise((resolve, reject) => {
    try {
      dsBridge.call("scanQRCode", {}, (res: string) => {
        resolve(res);
      });
    } catch (e) {
      reject(e);
      console.log(e);
    }
  });
}