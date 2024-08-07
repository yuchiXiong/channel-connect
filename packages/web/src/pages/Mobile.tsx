import { useEffect, useRef, useState } from "react"
import { EPeerMessageType, getPeerInstance, IPeerMessage } from "../utils/peer";
import { DataConnection } from "peerjs";
import * as radash from 'radash';
import { getAlbumList, getPhotoInfo, getPhotoOrigin, IAlbumListItem, IPhotoInfo } from "../utils/jsbridge.flutter";
import { Button } from "@radix-ui/themes";

const MobilePage = () => {

  const [getAlbumListLoading, setGetAlbumListLoading] = useState(false);
  const [connState, setConnState] = useState<'idle' | 'open' | 'close' | 'error'>('idle');
  const [albumList, setAlbumList] = useState<IAlbumListItem[]>([]);
  const connRef = useRef<DataConnection | null>(null)

  useEffect(() => {
    const peer = getPeerInstance('yuchi-receive-1', false)

    peer.on("connection", (conn) => {

      connRef.current = conn;

      conn.on("open", () => {
        conn.send({
          type: EPeerMessageType.Greeting,
          data: "hello!"
        } as IPeerMessage<string>);
        setConnState('open');
        getAlbumListFromNative().then(sendWebRTCMessage)
      });

      conn.on("data", async (data) => {
        console.log("received data", data);
        const _data = data as IPeerMessage<string>;

        if (_data.type === EPeerMessageType.RequestAlbumInfo) {
          const id = _data.data;
          const [error, photoInfo] = await radash.try(getPhotoInfo)(id);
          if (error) {
            console.error(error);
            return;
          }
          conn.send({
            type: EPeerMessageType.RequestAlbumInfo,
            data: photoInfo
          } as IPeerMessage<IPhotoInfo>)
        } else if (_data.type === EPeerMessageType.RequestPhotoOrigin) {
          const id = _data.data;
          const [error, photoOrigin] = await radash.try(getPhotoOrigin)(id);
          console.log("photoOrigin", photoOrigin);
          if (error) {
            console.error(error);
            return;
          }
          conn.send({
            type: EPeerMessageType.RequestPhotoOrigin,
            data: photoOrigin
          })
        }
      });

      conn.on('close', () => {
        setConnState('close')
      })

      conn.on('error', (err) => {
        setConnState('error')
        console.log(err)
      })
    });


    return () => {
      console.log("disconnecting")
      connRef.current?.removeAllListeners();
      connRef.current?.close();
      connRef.current = null;
      peer.disconnect();
    }
  }, [])

  const getAlbumListFromNative = async (): Promise<IAlbumListItem[]> => {
    console.log("getAlbumListFromNative")

    setGetAlbumListLoading(true)
    const [error, files] = await radash.try(getAlbumList)();
    if (error) {
      console.error('error' + error.message)
      return [];
    }
    setGetAlbumListLoading(false)
    setAlbumList([...files])
    return files;
  }

  const sendWebRTCMessage = async (_albumList = albumList) => {
    await connRef.current?.send({
      type: EPeerMessageType.AlbumList,
      data: _albumList.filter(i => i.id !== 'isAll')
    } as IPeerMessage<IAlbumListItem[]>);
  }


  return (
    <div className="flex flex-col items-center w-screen h-screen">

      {connState === 'idle' && (
        <section className="mt-64">
          未找到连接，请确认 PC 端是否已启动。
        </section>
      )}

      {connState === 'error' && (
        <section className="mt-64">
          连接异常，请稍后重试。。
        </section>
      )}


      {connState === 'close' && (
        <section className="mt-64">
          当前连接已断开，请尝试重启 PC 端重连。
        </section>
      )}

      {!['close', 'error', 'idle'].includes(connState) && (
        <section className="mt-64">
          {getAlbumListLoading ? '读取文件信息中……' : '文件传输中，请不要关闭 App'}
        </section>
      )}

      <Button type="button" color="green" onClick={() => window.location.reload()} className="mt-20 " >Refresh Page</Button>



    </div>
  )
}

export default MobilePage