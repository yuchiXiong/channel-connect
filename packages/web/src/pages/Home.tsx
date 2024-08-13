import { useEffect, useRef, useState } from 'react'
import { DataConnection } from 'peerjs'
import { EPeerMessageType, getPeerInstance, IPeerMessage } from '../utils/peer'
import { IAlbumListItem, IPhotoInfo } from '../utils/jsbridge.flutter';
import { Callout, CheckboxGroup, Code, Heading, Link, ScrollArea, Spinner } from '@radix-ui/themes';
import { InfoCircledIcon, DownloadIcon, Cross1Icon, MinusIcon, SquareIcon, CopyIcon, } from '@radix-ui/react-icons';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import { downloadByBase64, openDirectory, windowClose, windowMax, windowMin } from '../utils/jsbridge.electron';
import OriginPhotoPreview from '../components/OriginPhotoPreview';
import dayjs from 'dayjs';
import * as radash from 'radash';
import React from 'react';
import classNames from 'classnames';

const Home = () => {
  const [connState, setConnState] = useState<'idle' | 'open' | 'close' | 'error'>('idle')
  const [currentSelectedAlbum, setCurrentSelectedAlbum] = useState<string>('')
  const connRef = useRef<DataConnection | null>(null)
  const [albumList, setAlbumList] = useState<IAlbumListItem[]>([]);
  const [windowMaxState, setWindowMaxState] = useState<'window' | 'max'>('window');

  const loadingPhotoThumbIds = useRef<Set<string>>(new Set<string>());

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
      console.log('客户端接收到消息', data)
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
          // loadingPhotoThumbIds.current.delete(res.id);
          return [..._albumList]
        })
      } else if (_data.type === EPeerMessageType.RequestPhotoOrigin) {
        setAlbumList((_albumList) => {
          const res = _data.data as IPhotoInfo;

          const currentAlbum = _albumList.find((album) => {
            return album.children.map(i => i.id).includes(res.id)
          }) as IAlbumListItem;
          const currentImg = currentAlbum.children.find(i => i.id === res.id) as IPhotoInfo;
          currentImg.origin = res.origin;
          return [..._albumList]
        })
      }
    })


    return () => {
      console.log("disconnecting")
      connRef.current?.removeAllListeners();
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


          if (loadingPhotoThumbIds.current.has(currentPhoto.id)) return;
          if (currentPhoto.thumb && currentPhoto.origin) return;

          // 记录当前请求的图片id
          loadingPhotoThumbIds.current.add(currentPhoto.id);

          console.log("requesting", currentPhoto.id, loadingPhotoThumbIds.current)

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

  const downloadFile = async (index: number) => {
    const currentAlbum = albumList.find((album) => {
      return album.id === currentSelectedAlbum;
    }) as IAlbumListItem;

    const photo = currentAlbum.children[index];
    if (!photo) return;
    if (!photo.origin) return;
    const savePath = await openDirectory();
    downloadByBase64(photo.origin, photo.title, savePath).then(() => {
      console.log('download success');
    });
  }

  const handleWindowMax = () => {
    console.log('max')
    windowMax();
    setWindowMaxState('max')
  }

  const handleWindowMin = () => {
    console.log('min')

    windowMax();
    setWindowMaxState('window')
  }


  const currentAlbum = albumList.find((album) => album.id === currentSelectedAlbum) as IAlbumListItem;

  const albumGroupByDay = radash.group((currentAlbum?.children || []), i => dayjs(i.createDateSecond * 1000).format('YYYY-MM-DD'));

  const dbNavbarClick = windowMaxState === 'max' ? handleWindowMin : handleWindowMax

  return (
    <section className='flex flex-col w-screen h-screen backdrop-blur-[100px] backdrop-saturate-[240%]'>
      <div
        className='box-border flex items-center justify-center w-full px-4 py-2'
        style={{
          '-webkit-app-region': 'drag',
          '-webkit-user-select': 'none'
        }}
        onDoubleClick={dbNavbarClick}
        onDoubleClickCapture={dbNavbarClick}
      >
        <p
          className='flex items-center font-bold tracking-wider text-gray-800'
          style={{
            '-webkit-app-region': 'no-drag'
          }}
        >
          文件传输助手
          <small className='px-1 ml-1 text-xs tracking-normal text-gray-800 border border-gray-600 border-solid rounded-md'>dev</small>
        </p>
        <MinusIcon className='ml-auto text-gray-600 cursor-pointer size-4' onClick={() => windowMin()} style={{
          '-webkit-app-region': 'no-drag'
        }} />
        {windowMaxState === 'window' && <SquareIcon className='ml-4 text-gray-600 cursor-pointer size-4' onClick={handleWindowMax} style={{
          '-webkit-app-region': 'no-drag'
        }} />}
        {windowMaxState === 'max' && <CopyIcon className='ml-4 text-gray-600 cursor-pointer size-4' onClick={handleWindowMin} style={{
          '-webkit-app-region': 'no-drag'
        }} />}
        <Cross1Icon className='ml-4 text-gray-600 cursor-pointer size-4' onClick={() => windowClose()} style={{
          '-webkit-app-region': 'no-drag'
        }}
        />
      </div>
      {connState === 'idle' && (
        <Callout.Root color="blue">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            <p>正在连接到手机，请确保 App 已打开……</p>
            <small>如果您已打开 App 可以 <Link href="#" onClick={() => location.reload()}>点击这里</Link> 尝试重新连接。</small>
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

      {(connState === "open" || albumList.length > 0) && <section className='flex flex-row flex-1 overflow-hidden'>
        <CheckboxGroup.Root defaultValue={['1']} name="example" className=' flex flex-col flex-[0.25]'>
          <CheckboxGroup.Item className='sticky top-0 p-2 pl-3 text-lg items-center border-b border-solid border-gray-100 !w-full cursor-pointer hover:backdrop-blur'>选择相册({albumList.length})</CheckboxGroup.Item>

          <ScrollArea type="auto" scrollbars="vertical" className='flex-1'>
            <section className='box-border flex flex-col px-1 rounded-lg'>
              {albumList.map((album) => (
                <CheckboxGroup.Item
                  key={album.id}
                  value={album.id}
                  onClick={() => setCurrentSelectedAlbum(album.id)}
                  className='flex flex-row pl-2 items-center flex-1 !w-full rounded-lg cursor-pointer transition hover:bg-[#ECECEE] '
                >
                  <div key={album.id} className='flex flex-row items-center w-full p-2 '>
                    <img src={`data:image/jpeg;base64, ${album.cover}`} className='object-cover w-16 h-16 rounded' />
                    <p className='flex items-center flex-1 pl-3 text-base tracking-wider text-black line-clamp-1'>
                      {album.name}<span className='inline-block h-4 px-2 py-0 ml-1 text-sm leading-4 text-black bg-gray-200 rounded-full'>{album.count}</span>
                    </p>
                  </div>
                </CheckboxGroup.Item>
              ))}

            </section>
          </ScrollArea>
        </CheckboxGroup.Root>

        <section
          className={classNames(
            'flex flex-col flex-[0.75] bg-[rgb(247,247,249)]',
            'overflow-hidden rounded-lg',
            'm-0'
          )}
          id='scrollContainer'
        >
          <ScrollArea type="always" scrollbars="vertical" className='flex-1 h-full'>
            <section className='flex flex-row flex-wrap content-start flex-1 w-full h-full px-10'>
              <PhotoProvider
                toolbarRender={({ index }) => {
                  return (
                    <>
                      <DownloadIcon className='ml-4 opacity-75 cursor-pointer size-4 hover:opacity-100' onClick={() => downloadFile(index)} />
                      <InfoCircledIcon className='ml-4 opacity-75 cursor-pointer size-4 hover:opacity-100' onClick={() => { }} />
                    </>
                  );
                }}
              >
                {Object.keys(albumGroupByDay).map((key) => (
                  <React.Fragment key={key}>
                    <p className='sticky top-0 w-full bg-[rgb(247,247,249)] p-2 text-xl font-bold pt-8'>{key}</p>
                    {(albumGroupByDay[key] || []).map((item) => (
                      <PhotoView
                        key={item.id}
                        width={document.body.clientWidth}
                        height={document.body.clientHeight}
                        render={({ scale, attrs }) => <OriginPhotoPreview attrs={attrs} scale={scale} item={{ ...item }} conn={connRef.current} />}
                      >
                        {item.thumb ? (
                          <div className='w-1/6 p-1 cursor-pointer aspect-square'>
                            <img id={`image_${item.id}`} src={`data:image/jpeg;base64, ${item.thumb}`} alt="" className='object-cover w-full h-full rounded-md shadow-md' />
                          </div>
                        ) : (
                          <div className='flex items-center justify-center w-1/6 p-1 cursor-pointer aspect-square'>
                            <div id={`image_${item.id}`} className='flex items-center justify-center w-full h-full text-center text-white rounded-md shadow-md bg-black/65'>{loadingPhotoThumbIds.current.has(item.id) && <Spinner />}</div>
                          </div>
                        )}
                      </PhotoView>
                    ))}
                  </React.Fragment>
                ))}
              </PhotoProvider>
            </section>
          </ScrollArea>
        </section>

      </section >}


    </section >
  )
}

export default Home
