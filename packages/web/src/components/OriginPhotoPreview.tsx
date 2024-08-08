import { useEffect, useRef } from "react";
import { IPhotoInfo } from "../utils/jsbridge.flutter"
import { DataConnection } from "peerjs";
import { EPeerMessageType } from "../utils/peer";

const OriginPhotoPreview = ({ scale, attrs, item, conn }: {
  scale: number,
  attrs: Partial<React.HTMLAttributes<HTMLElement>>,
  item: IPhotoInfo,
  conn: DataConnection | null
}) => {

  const width = Number(attrs.style?.width?.toString().replace('px', '') || 0);
  const offset = (width - item.width) / item.width;
  const childScale = scale === 1 ? scale + offset : 1 + offset;
  const loadingOriginIds = useRef<Set<string>>(new Set<string>())

  useEffect(() => {
    if (loadingOriginIds.current.has(item.id)) return;
    if (item.origin) return;
    console.log('request origin photo', item.id);


    loadingOriginIds.current.add(item.id);
    conn?.send({
      type: EPeerMessageType.RequestPhotoOrigin,
      data: item.id
    });

  }, [conn, item])

  return (

    <div
      {...attrs}
    >
      <div style={{
        width: document.body.clientWidth,
        height: document.body.clientHeight,
        transformOrigin: '0 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {!item.origin ? (
          <span className="text-white">加载中……</span>
        ) : (<img
          style={{
            width: item.width,
            transform: `scale(${Math.max(childScale, 1)})`,
          }}
          src={`data:image/jpeg;base64, ${(item.origin)}`}
        />)}
      </div>
    </div>
  )
}


export default OriginPhotoPreview