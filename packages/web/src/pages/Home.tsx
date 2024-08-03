import { useEffect, useRef, useState } from 'react'
import { DataConnection } from 'peerjs'
import { EPeerMessageType, getPeerInstance, IPeerMessage } from '../utils/peer'
import { IAlbumListItem, IPhotoInfo } from '../utils/jsbridge';
import { Callout, CheckboxGroup, Link, ScrollArea } from '@radix-ui/themes';
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
      console.log('iceStateChanged', state);
      if (state === 'disconnected' || state === 'failed') {
        setConnState('close')
      } else if (state === 'connected') {
        setConnState('open')
      } else if (state === 'closed') {
        setConnState('close')
      } else {
        console.log('unknown state', state)
      }
    })
    connRef.current.on("error", (err) => {
      setConnState('error')
      console.log("error", err);
    })
    connRef.current.on('data', (data) => {
      console.log('data', data)
      const _data = data as IPeerMessage<string | IAlbumListItem[] | IPhotoInfo>;
      if (_data.type === EPeerMessageType.Greeting) {
        console.log('greeting', _data.data)
      } else if (_data.type === EPeerMessageType.AlbumList) {
        setAlbumList([..._data.data as IAlbumListItem[]])
      } else if (_data.type === EPeerMessageType.RequestAlbumInfo) {

        setAlbumList((_albumList) => {
          const res = _data.data as IPhotoInfo;

          const currentAlbum = _albumList.find((album) => {
            return album.children.map(i => i.id).includes(res.id)
          }) as IAlbumListItem;
          const currentImg = currentAlbum.children.find(i => i.id === res.id) as IPhotoInfo;
          currentImg.thumb = res.thumb;
          currentImg.origin = res.origin;
          return [..._albumList]
        })
      }
    })

    isPeerInitializedRef.current = true;

    return () => {
      console.log("disconnecting")
      connRef.current?.close();
      connRef.current = null;
    }
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      for (const i of entries) {
        if (i.isIntersecting) {
          const id = i.target.id.split('_').pop();

          if (!id) return;

          const currentAlbum = albumList.find((album) => {
            return album.children.map(i => i.id).includes(id)
          });

          const currentPhoto = currentAlbum?.children.find(i => i.id === id) as IPhotoInfo;

          if (currentPhoto.thumb && currentPhoto.origin) return;

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
  }, [albumList.length, currentSelectedAlbum]);

  // const seedMessage = () => {
  //   if (inputRef.current) {
  //     console.log(inputRef.current.value)
  //     connRef.current?.send(inputRef.current.value)
  //   }
  // }


  return (
    <section className='flex flex-col w-screen h-screen'>
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
      {connState === 'error' && (
        <Callout.Root color="red">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            连接异常， 请 <Link href="#" onClick={() => location.reload()}>点击这里</Link> 尝试重新连接。
          </Callout.Text>
        </Callout.Root>
      )}

      <section className='flex flex-row flex-1 overflow-hidden bg-[#ECECEE]'>
        <CheckboxGroup.Root defaultValue={['1']} name="example" className='flex flex-col flex-[0.25]'>
          <CheckboxGroup.Item className='sticky top-0  p-2 items-center !w-full cursor-pointer bg-[#ECECEE] '>选择相册({albumList.length})</CheckboxGroup.Item>

          <ScrollArea type="always" scrollbars="vertical" className='flex-1'>
            <section className='box-border flex flex-col bg-[#DCDDDF]'>

              {albumList.map((album) => (
                <CheckboxGroup.Item value={album.id} className='flex flex-row pl-2 items-center flex-1 !w-full  cursor-pointer  hover:bg-[#ECECEE] '>
                  <div onClick={() => setCurrentSelectedAlbum(album.id)} key={album.id} className='flex flex-row items-center w-full p-2 '>
                    <img src={`data:image/jpeg;base64, ${album.cover}`} className='object-cover w-16 h-16' />
                    <p className='flex-1 pl-3 text-base text-black line-clamp-1'>
                      {album.name}({album.count})
                    </p>
                  </div>
                </CheckboxGroup.Item>
              ))}

            </section>
          </ScrollArea>
        </CheckboxGroup.Root>

        <section className='flex flex-col flex-[0.75] m-0 overflow-hidden' id='scrollContainer'>
          <div className='sticky top-0 p-2 bg-white'>{albumList.find(i => i.id === currentSelectedAlbum)?.name}</div>
          <ScrollArea type="always" scrollbars="vertical" className='flex-1 h-full'>
            <section className='flex flex-row flex-wrap content-start flex-1 w-full h-full bg-white'>
              <PhotoProvider>
                {(albumList.find(i => i.id === currentSelectedAlbum)?.children || []).map((item, index) => (
                  <PhotoView key={index} src={`data:image/jpeg;base64, ${item.origin}`}>
                    {item.thumb ? (
                      <img id={`image_${item.id}`} src={`data:image/jpeg;base64, ${item.thumb}`} alt="" className='object-cover w-32 h-32 m-1' />
                    ) : (
                      <div id={`image_${item.id}`} className='flex items-center justify-center w-32 h-32 m-1 text-gray-400 bg-gray-200'>无封面</div>
                    )}
                  </PhotoView>
                ))}
              </PhotoProvider>
            </section>
          </ScrollArea>
        </section>

      </section >


    </section >
  )
}

export default Home
