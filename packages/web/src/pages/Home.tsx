import { useEffect, useRef, useState } from 'react'
import { DataConnection } from 'peerjs'
import { EPeerMessageType, getPeerInstance, IPeerMessage } from '../utils/peer'
import { IAlbumListItem, IPhotoInfo } from '../utils/jsbridge';
import { Callout, Link } from '@radix-ui/themes';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { PhotoProvider, PhotoView } from 'react-photo-view';

const Home = () => {
  const [connState, setConnState] = useState<'idle' | 'open' | 'close' | 'error'>('idle')
  const [currentSelectedAlbum, setCurrentSelectedAlbum] = useState<string>('')
  const connRef = useRef<DataConnection | null>(null)
  const isPeerInitializedRef = useRef(false);
  // const [messageList, setMessageList] = useState<string[]>([]);
  const [albumList, setAlbumList] = useState<IAlbumListItem[]>([]);



  useEffect(() => {
    const peer = getPeerInstance('yuchi-sender-1')

    connRef.current = peer.connect("yuchi-receive-1");

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
      const _data = data as IPeerMessage<string | IAlbumListItem[] | IPhotoInfo>;
      if (_data.type === EPeerMessageType.Greeting) {
        console.log('greeting', _data.data)
      } else if (_data.type === EPeerMessageType.AlbumList) {
        setAlbumList([..._data.data as IAlbumListItem[]])
      } else if (_data.type === EPeerMessageType.RequestAlbumInfo) {
        const res = _data.data as IPhotoInfo;
        console.log('requestAlbumInfo', res.id, albumList)
        const currentAlbum = albumList.find((album) => {
          return album.children.map(i => i.id).includes(res.id)
        }) as IAlbumListItem;
        console.log('currentAlbum', currentAlbum)
        const currentImg = currentAlbum.children.find(i => i.id === res.id) as IPhotoInfo;
        currentImg.thumb = res.thumb;
        currentImg.origin = res.origin;
        setAlbumList([...albumList])
      }
    })

    isPeerInitializedRef.current = true;

    return () => {
      console.log("disconnecting")
      connRef.current?.close();
      connRef.current = null;
    }
  }, [albumList])

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      for (const i of entries) {
        console.log(i)
        if (i.isIntersecting) {
          const id = i.target.id.split('_').pop();

          connRef.current?.send({
            type: EPeerMessageType.RequestAlbumInfo,
            data: id
          });


          observer.unobserve(i.target); // 停止监听此元素
        }
      }
    });
    const elements = document.querySelectorAll('[id*=image_]');
    for (const i of elements) {
      observer.observe(i);

    }
    return () => {
      observer.disconnect();

    }
  }, [albumList, currentSelectedAlbum]);

  // const seedMessage = () => {
  //   if (inputRef.current) {
  //     console.log(inputRef.current.value)
  //     connRef.current?.send(inputRef.current.value)
  //   }
  // }


  return (
    <section className='flex flex-col h-screen w-screen'>
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

      <section className='flex-1 flex flex-row overflow-hidden'>
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
        <section className='flex-1 flex flex-wrap m-0 overflow-y-auto' id='scrollContainer'>
          <PhotoProvider>
            {(albumList.find(i => i.id === currentSelectedAlbum)?.children || []).map((item, index) => (
              <PhotoView key={index} src={`data:image/jpeg;base64, ${item.origin}`}>
                {item.thumb ? (
                  <img id={`image_${item.id}`} src={`data:image/jpeg;base64, ${item.thumb}`} alt="" className='w-32 h-32 object-cover m-1' />
                ) : (
                  <div id={`image_${item.id}`} className='w-32 h-32 m-1 bg-gray-200 flex items-center justify-center text-gray-400'>无封面</div>
                )}
              </PhotoView>
            ))}
          </PhotoProvider>
        </section>
      </section>


    </section>
  )
}

export default Home
