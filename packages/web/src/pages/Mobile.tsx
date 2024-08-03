import { useEffect, useRef, useState } from "react"
import { EPeerMessageType, getPeerInstance, IPeerMessage } from "../utils/peer";
import { DataConnection } from "peerjs";
import * as radash from 'radash';
import { getAlbumList, getPhotoInfo, IAlbumListItem, IPhotoInfo } from "../utils/jsbridge";
import { AlertDialog, Button, Flex } from "@radix-ui/themes";
import { PhotoProvider, PhotoView } from "react-photo-view";

let didInit = false;

const MobilePage = () => {

  const [getAlbumListLoading, setGetAlbumListLoading] = useState(false);
  const [testGetPhotoInfo, setTestGetPhotoInfo] = useState<IPhotoInfo>({
    id: '',
    thumb: '',
    origin: '',
  });

  const [connState, setConnState] = useState<'idle' | 'open' | 'close' | 'error'>('idle');
  const [albumList, setAlbumList] = useState<IAlbumListItem[]>([]);
  const connRef = useRef<DataConnection | null>(null)

  useEffect(() => {
    if (!didInit) {
      const peer = getPeerInstance("yuchi-receive-1")

      peer.on("connection", (conn) => {

        connRef.current = conn;

        conn.on("open", () => {
          conn.send({
            type: EPeerMessageType.Greeting,
            data: "hello!"
          } as IPeerMessage<string>);
          setConnState('open')
        });

        conn.on("data", async (data) => {
          console.log("received data", data);
          const _data = data as IPeerMessage<number>;

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

      didInit = true;
    }

    return () => {
      console.log("disconnecting")
      // peer.destroy()
    }
  }, [])

  const getAlbumListFromNative = async () => {
    console.log("getAlbumListFromNative")

    setGetAlbumListLoading(true)
    const [error, files] = await radash.try(getAlbumList)();
    if (error) {
      console.error('error' + error.message)
      return;
    }
    setGetAlbumListLoading(false)
    setAlbumList([...files])
  }

  const sendWebRTCMessage = () => { 
    connRef.current?.send({
      type: EPeerMessageType.AlbumList,
      data: albumList.filter(i => i.id !== 'isAll')
    } as IPeerMessage<IAlbumListItem[]>)
  }

  const TEST_GET_PHOTO_INFO = async () => {
    const allIds = albumList.map((item) => item.children).flat().map(i => i.id);
    const randomId = allIds[Math.floor(Math.random() * allIds.length)];
    const [error, fileInfo] = await radash.try(getPhotoInfo)(randomId);
    if (error) {
      console.error('error' + error.message)
      return;
    }
    setTestGetPhotoInfo(fileInfo)
  }


  return (
    <div className="h-full w-full">

      <p onDoubleClick={() => {
        window.location.reload()
      }}>[Mobile] 连接状态：{connState}(debug:{new Date().getTime()})</p>

      <div className="flex flex-col flex-wrap w-full" >
        <button disabled={getAlbumListLoading} className="h-12 my-1 bg-green-400 text-white" onClick={getAlbumListFromNative}>{getAlbumListLoading ? '获取中' : '获取相册信息'}</button>
        <button className="h-12 my-1 bg-green-400 text-white" onClick={sendWebRTCMessage}>发送 WebRTC 消息</button>
        <AlertDialog.Root>
          <AlertDialog.Trigger>
            <button className="h-12 my-1 bg-green-400 text-white" onClick={TEST_GET_PHOTO_INFO}>[Bridge Test]随机选择获取一张照片的缩略图</button>
          </AlertDialog.Trigger>
          <AlertDialog.Content maxWidth="450px">
            <AlertDialog.Title>[Bridge Test]随机选择获取一张照片的缩略图</AlertDialog.Title>
            <AlertDialog.Description size="2">
              <img src={`data:image/jpeg;base64, ${testGetPhotoInfo.thumb}`} className="w-full" alt="testGetPhotoThumbBase64Str" />
            </AlertDialog.Description>

            <Flex gap="3" mt="4" justify="end">
              <AlertDialog.Cancel>
                <Button variant="soft" color="gray">
                  关闭
                </Button>
              </AlertDialog.Cancel>
            </Flex>
          </AlertDialog.Content>
        </AlertDialog.Root>
        {testGetPhotoInfo.origin && (
          <PhotoProvider>
            <PhotoView src={`data:image/jpeg;base64, ${testGetPhotoInfo.origin}`}>
              <button className="h-12 my-1 bg-green-400 text-white" >
                [Bridge Test]查看原图
              </button>
            </PhotoView>
          </PhotoProvider>
        )}
      </div>


      <ul style={{
        paddingLeft: 0
      }}>
        {albumList.map((album) => (
          <li key={album.id} style={{
            display: 'flex',
            margin: 10,
          }}>
            <img src={`data:image/jpeg;base64, ${album.cover}`} style={{
              height: 90,
              width: 90,
              objectFit: 'cover',
            }} />
            <p style={{
              marginLeft: 12,
              display: 'flex'
            }}>{album.name}({album.count})</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default MobilePage