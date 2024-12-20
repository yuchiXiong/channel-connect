import Peer, { PeerOptions } from "peerjs";
import mitt from "mitt";

export enum EPeerMessageType {
  // 请求相册列表
  AlbumList = "AlbumList",
  // 请求相册下的媒体文件列表
  AlbumMediaList = "AlbumMediaList",
  // 请求媒体文件的源文件
  MediaOrigin = "MediaOrigin",
  // 请求媒体文件的封面数据
  MediaThumb = "MediaThumb",
}

export interface IPeerMessage<T> {
  type: string;
  data: T;
}

export const emitter = mitt();
let peerInstance: Peer | null = null;

export const getPeerInstance = (standalone = true) => {
  const options: PeerOptions = {
    host: "116.62.176.240",
    port: 80,
    path: "/myapp",
  };
  if (!standalone) {
    return new Peer("", options);
  }
  if (!peerInstance) {
    peerInstance = new Peer("", options);
  }
  return peerInstance;
};


let hostPeer: Peer | null = null;
export const getHostPeerInstance = (): Promise<Peer> => {
  if (hostPeer) return Promise.resolve(hostPeer);

  return new Promise<Peer>((resolve, reject) => {
    hostPeer = getPeerInstance(false);

    hostPeer.on("open", (id) => {
      console.log("My peer ID is: " + id);
      resolve(hostPeer as Peer);
    });
    hostPeer.on("connection", (conn) => {
      console.log("hostPeer connection");
      emitter.emit("connection", conn);
      conn.on("open", () => {
        emitter.emit("open", conn);
      });

      conn.on("close", () => {
        emitter.emit("close", conn);
      });

      conn.on("iceStateChanged", (state) => {
        emitter.emit("iceStateChanged", state);
      });

      conn.on("error", (err) => {
        emitter.emit("error", err);
      });

      conn.on("data", (data) => {
        emitter.emit("data", data);
      });
    });
    hostPeer.on("error", (err) => {
      console.log("hostPeer error", err);

      reject(err);
    });
  });
};
