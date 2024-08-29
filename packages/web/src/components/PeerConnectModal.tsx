import { useState } from 'react';
import { AlertDialog, SegmentedControl } from "@radix-ui/themes";
import QRCode from 'react-qr-code';
import { CheckIcon, ClipboardCopyIcon } from '@radix-ui/react-icons';
import { clipboardWriteText } from '../utils/jsbridge.electron';

export enum EMode {
  QR = 'QRCode',
  LAN = 'LAN'
}

export interface IPeerConnectModalProps {
  open: boolean;
  peerId: string;
  onOpenChange: (open: boolean) => void;
}

const PeerConnectModal: React.FC<IPeerConnectModalProps> = ({
  open,
  peerId,
  onOpenChange
}) => {

  const [mode, setMode] = useState<EMode>(EMode.QR);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    clipboardWriteText(peerId);
    setCopied(true)
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Content maxWidth="450px" className='box-border' onEscapeKeyDown={(event) => event.preventDefault()}>
        <div className='px-8'>
          <SegmentedControl.Root value={mode} onValueChange={(val) => setMode(val as EMode)} defaultValue="inbox" className='w-full'>
            <SegmentedControl.Item value={EMode.QR}>二维码模式</SegmentedControl.Item>
            <SegmentedControl.Item value={EMode.LAN}>局域网模式</SegmentedControl.Item>
          </SegmentedControl.Root>
        </div>
        <div className='flex flex-col items-center w-full px-8 py-2'>
          <span className='mt-2 mb-2'>使用 App 扫码以建立连接</span>

          {peerId && <QRCode value={peerId} className='mx-auto w-52 h-52' />}
          <span className='flex items-center mt-3 text-sm text-gray-500 cursor-pointer' onClick={handleCopy}>
            {copied ? <CheckIcon color='green' className='mr-1' /> : <ClipboardCopyIcon className='mr-1' />}
            {peerId}
          </span>
        </div>
      </AlertDialog.Content>
    </AlertDialog.Root >
  )
}

export default PeerConnectModal;