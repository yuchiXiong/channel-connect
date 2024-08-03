import { useEffect, useRef, useState } from 'react'
import { DataConnection } from 'peerjs'
import { EPeerMessageType, getPeerInstance, IPeerMessage } from '../utils/peer'
import { IAlbumListItem } from '../utils/jsbridge';
import { Callout, Link } from '@radix-ui/themes';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { PhotoProvider, PhotoView } from 'react-photo-view';

let didInit = false;


const Home = () => {
  const [connState, setConnState] = useState<'idle' | 'open' | 'close' | 'error'>('idle')
  const [currentSelectedAlbum, setCurrentSelectedAlbum] = useState<number>(-1)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const connRef = useRef<DataConnection | null>(null)
  const isPeerInitializedRef = useRef(false);
  // const [messageList, setMessageList] = useState<string[]>([]);
  const [albumList, setAlbumList] = useState<IAlbumListItem[]>([]);


  useEffect(() => {
    if (!didInit) {
      const peer = getPeerInstance('yuchi-sender-1')

      connRef.current = peer.connect("yuchi-receive-1");

      if (!isPeerInitializedRef.current) {
        connRef.current.on("open", () => {
          console.log("connected to: " + connRef.current?.peer);
          setConnState('open')
        });

        connRef.current.on("close", () => {
          setConnState('close')
        })
        connRef.current.on('iceStateChanged', (state) => {
          console.log('iceStateChanged', state)
        })
        connRef.current.on("error", () => {
          setConnState('error')

        })
        connRef.current.on('data', (data) => {
          console.log('data', data)
          const _data = data as IPeerMessage<string | IAlbumListItem[]>;
          if (_data.type === EPeerMessageType.Greeting) {
            console.log('greeting', _data.data)
          } else if (_data.type === EPeerMessageType.AlbumList) {
            setAlbumList([..._data.data as IAlbumListItem[]])
          }
        })

        isPeerInitializedRef.current = true;
      }

      didInit = true;
    }

    return () => {
      console.log("disconnecting")
    }
  }, [])

  // const seedMessage = () => {
  //   if (inputRef.current) {
  //     console.log(inputRef.current.value)
  //     connRef.current?.send(inputRef.current.value)
  //   }
  // }


  return (
    <>
      {connState === 'idle' && (
        <Callout.Root color="blue">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            等待连接中...
          </Callout.Text>
        </Callout.Root>
      )}
      {connState === 'close' && (
        <Callout.Root color="red">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            当前连接已断开， <Link href="#" onClick={() => location.reload()}>点击这里</Link> 尝试重新连接。
          </Callout.Text>
        </Callout.Root>
      )}

      <section className='flex flex-row h-screen w-screen'>
        <section className=' box-border flex flex-col overflow-y-auto'>
          {albumList.map((album) => (
            <div onClick={() => setCurrentSelectedAlbum(album.id)} key={album.id} className='p-2 flex flex-row border-b border-solid border-gray-600 relative cursor-pointer'>
              <img src={`data:image/jpeg;base64, ${album.cover}`} className=' object-cover w-32 h-32' />
              <span className='bottom-0 left-0 absolute w-full bg-[#00000099] text-white line-clamp-1 px-2'>{album.name}</span>
              {/* <p className='text-base ml-2'>
                <p className='text-xl'>{album.name}</p>
                <p className='text-gray-600 text-sm mt-1'>共 {album.count} 张</p>
              </p> */}
            </div>
          ))}
        </section>
        <section className='flex-1 flex flex-wrap m-0 overflow-y-auto'>
          <PhotoProvider>
              {(albumList.find(i => i.id === currentSelectedAlbum)?.children || []).map((item, index) => (
                <PhotoView key={index} src={`data:image/jpeg;base64, ${item.cover}`}>
                  {item.cover ? (
                    <img src={`data:image/jpeg;base64, ${item.cover}`} alt="" className='w-32 h-32 object-cover m-1' />
                  ) : (
                    <div className='w-32 h-32 m-1 bg-gray-200 flex items-center justify-center text-gray-400'>无封面</div>
                  )}
                </PhotoView>
              ))}
          </PhotoProvider>
        </section>
      </section>


    </>
  )
}

export default Home
