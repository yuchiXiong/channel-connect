import Peer from "peerjs";

export enum EPeerMessageType {
  Greeting = "Greeting",
  AlbumList = "AlbumList",
  RequestAlbumInfo = "RequestAlbumInfo",
  RequestPhotoOrigin = "RequestPhotoOrigin",
}

export interface IPeerMessage<T> {
  type: string;
  data: T;
}

let peerInstance: Peer | null = null;

export const getPeerInstance = (id: string, standalone = true) => {
  const options = {
    host: "192.168.0.105",
    port: 9000,
    path: "/myapp",
  };
  if (!standalone) {
    return new Peer(id, options);
  }
  if (!peerInstance) {
    peerInstance = new Peer(id, options);
  }
  return peerInstance;
};
