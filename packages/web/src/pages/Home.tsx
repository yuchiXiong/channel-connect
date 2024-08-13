import { useEffect, useRef, useState } from 'react'
import { DataConnection } from 'peerjs'
import { EPeerMessageType, getPeerInstance, IPeerMessage } from '../utils/peer'
import { IAlbumListItem, IPhotoInfo } from '../utils/jsbridge.flutter';
import { Callout, CheckboxGroup, Link, Progress, ScrollArea, Spinner } from '@radix-ui/themes';
import { InfoCircledIcon, DownloadIcon, Cross1Icon, MinusIcon, SquareIcon, CopyIcon, } from '@radix-ui/react-icons';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import { downloadByBase64, openDirectory, openPathDirectory, windowClose, windowMax, windowMin } from '../utils/jsbridge.electron';
import OriginPhotoPreview from '../components/OriginPhotoPreview';
import dayjs from 'dayjs';
import * as radash from 'radash';
import React from 'react';
import classNames from 'classnames';

const Home = () => {
  const [connState, setConnState] = useState<'idle' | 'open' | 'close' | 'error'>('idle')
  const [currentAlbumId, setCurrentAlbumId] = useState<string>('')
  const [albumList, setAlbumList] = useState<IAlbumListItem[]>([]);
  const [windowMaxState, setWindowMaxState] = useState<'window' | 'max'>('window');
  const [currentSelectedAlbumIds, setCurrentSelectedAlbumIds] = useState<string[]>([]);
  // const [currentSelectedPhotoIds, setCurrentSelectedPhotoIds] = useState<string[]>([]);
  const [downloadSuccessPhotoIds, setDownloadSuccessPhotoIds] = useState<string[]>([]);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'success'>('idle');
  // const [lastDownloadTime, setLastDownloadTime] = useState<string>('');
  const [lastDownloadPath, setLastDownloadPath] = useState<string>('');

  const connRef = useRef<DataConnection | null>(null)
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


          setDownloadStatus((_downloadStatus) => {
            let status = _downloadStatus;
            /**
            * ! 如果在下载过程中拉取的原图，则视为下载行为
            */
            if (_downloadStatus === 'downloading') {
              setLastDownloadPath((_lastDownloadPath) => {
                downloadByBase64(currentImg.origin, currentImg.title, _lastDownloadPath + '/' + currentAlbum.name);
                setDownloadSuccessPhotoIds(ids => {
                  const _downloadSuccessPhotoIds = [...new Set(ids.concat(currentImg.id))];
                  console.log('_downloadSuccessPhotoIds', ids, currentImg.id, _downloadSuccessPhotoIds);

                  /**
                   * todo refactor: 先暂时用回调的方式获取实时的值
                   */
                  setCurrentSelectedAlbumIds((_currentSelectedAlbumIds) => {
                    // 下载完成
                    const allDownloadPhoto = _currentSelectedAlbumIds.reduce((acc, id) => (_albumList.find((album) => album.id === id)?.children || []).length + acc, 0)
                    console.log(_downloadSuccessPhotoIds.length, allDownloadPhoto, _currentSelectedAlbumIds)

                    if (_downloadSuccessPhotoIds.length === allDownloadPhoto) {
                      console.log('下载完成')
                      status = 'success';
                    }

                    return _currentSelectedAlbumIds
                  });

                  return _downloadSuccessPhotoIds;
                });

                return _lastDownloadPath;
              })
            }
            return status;
          })

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
  }, [albumList.length, currentAlbumId]);

  // const seedMessage = () => {
  //   if (inputRef.current) {
  //     console.log(inputRef.current.value)
  //     connRef.current?.send(inputRef.current.value)
  //   }
  // }

  const downloadFile = async (index: number) => {
    const currentAlbum = albumList.find((album) => {
      return album.id === currentAlbumId;
    }) as IAlbumListItem;

    const photo = currentAlbum.children[index];
    if (!photo) return;
    if (!photo.origin) return;
    const savePath = await openDirectory();
    downloadByBase64(photo.origin, photo.title, savePath).then(() => {
      console.log('download success');
    });
  }

  /** 全部导出 */
  const batchDownloadPhotos = async () => {

    const savePath = await openDirectory();
    setLastDownloadPath(savePath);
    setDownloadStatus('downloading')

    currentSelectedAlbumIds.forEach(id => {
      const currentAlbum = albumList.find((album) => {
        return album.id === id;
      });
      if (!currentAlbum) return [];
      return currentAlbum.children.forEach(async (i) => {
        if (!i.origin) {
          // 需要先拉取原图，此时需要等待 WebRTC 响应以后才可以继续下载，先进行下一个任务
          connRef.current?.send({
            type: EPeerMessageType.RequestPhotoOrigin,
            data: i.id
          });
          return;
        }
        await downloadByBase64(i.origin, i.title, savePath + '/' + currentAlbum.name);
        setDownloadSuccessPhotoIds(ids => [...new Set([...ids, i.id])]);
      })
    });

    // 下载完成
    const allDownloadPhoto = currentSelectedAlbumIds.reduce((acc, id) => (albumList.find((album) => album.id === id)?.children || []).length + acc, 0)
    if (downloadSuccessPhotoIds.length === allDownloadPhoto) {
      setDownloadStatus('success');
    }
  }

  const handleWindowMax = () => {
    windowMax();
    setWindowMaxState('max')
  }

  const handleWindowMin = () => {
    windowMax();
    setWindowMaxState('window')
  }

  /**
   * 更新当前选中的相册 id
   */
  const handleAlbumSelected = (val: string[]) => {
    setCurrentSelectedAlbumIds([...val]);
  }

  const handleDirectoryOpen = () => {
    openPathDirectory(lastDownloadPath);
  }


  /** 当前打开的相册对象 */
  const currentAlbum = albumList.find((album) => album.id === currentAlbumId) as IAlbumListItem;

  /** 当前相册照片通过时间分组 */
  const albumGroupByDay = radash.group((currentAlbum?.children || []), i => dayjs(i.createDateSecond * 1000).format('YYYY-MM-DD'));

  const currentSelectedPhotoTotal = albumList.filter(i => currentSelectedAlbumIds.includes(i.id)).reduce((prev, curr) => prev + curr.children.length, 0)

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
        <CheckboxGroup.Root defaultValue={[]} onValueChange={handleAlbumSelected} name="example" className='flex flex-col flex-[0.25]'>
          <CheckboxGroup.Item
            className='sticky top-0 p-2 pl-3 text-lg items-center border-b border-solid border-gray-100 !w-full cursor-pointer hover:backdrop-blur'
          >选择相册({albumList.length})</CheckboxGroup.Item>

          <ScrollArea type="auto" scrollbars="vertical" className='flex-1'>
            <section className='box-border flex flex-col px-1 rounded-lg'>
              {albumList.map((album) => (
                <CheckboxGroup.Item
                  key={album.id}
                  value={album.id}
                  onClick={() => setCurrentAlbumId(album.id)}
                  className='flex flex-row pl-2 items-center flex-1 !w-full rounded-lg cursor-pointer transition hover:bg-[#ECECEE] '
                >
                  <div key={album.id} className='flex flex-row items-center w-full p-2 '>
                    <img src={`data:image/jpeg;base64, ${album.cover}`} className='object-cover w-16 h-16 rounded' />
                    <p className='flex items-center flex-1 w-full pl-3 text-base tracking-wider text-black truncate'>
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

      {currentSelectedAlbumIds.length > 0 && downloadStatus === 'downloading' && (
        <section className='relative flex flex-col items-center'>
          <Progress className='w-full' value={downloadSuccessPhotoIds.length / currentSelectedPhotoTotal * 100} size="1" />
          <span className='my-4 ml-auto mr-2'>正在导出 {downloadSuccessPhotoIds.length} / {currentSelectedPhotoTotal} 项内容到电脑...</span>
          {/* 支持取消？ */}
        </section>
      )}

      {currentSelectedAlbumIds.length > 0 && downloadStatus === 'success' && (
        <section className='flex flex-row items-center p-4 border-t border-gray-200 border-solid'>
          <span>已导出 {currentSelectedAlbumIds.length} 个相册，共计 {currentSelectedPhotoTotal} 张照片。</span>
          <button className='ml-auto text-blue-600' onClick={handleDirectoryOpen}>查看</button>
        </section>
      )}

      {currentSelectedAlbumIds.length > 0 && downloadStatus === 'idle' && (
        <section className='flex flex-row items-center p-4 border-t border-gray-200 border-solid'>
          <span>当前选中 {currentSelectedAlbumIds.length} 个相册，共计 {currentSelectedPhotoTotal} 张照片。</span>
          <button className='ml-auto text-blue-600' onClick={batchDownloadPhotos}>全部导出</button>
        </section>
      )}
    </section >
  )
}

export default Home
