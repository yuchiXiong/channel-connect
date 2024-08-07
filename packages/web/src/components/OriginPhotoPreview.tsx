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
        transform: `scale(${childScale})`,
        width: item.width,
        transformOrigin: '0 0',
      }}>
        <img src={`data:image/jpeg;base64, ${(item.origin)}`}></img>
      </div>
    </div>
  )
}


export default OriginPhotoPreview