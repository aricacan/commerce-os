'use client';

import dynamic from 'next/dynamic';
import type { PwaInstallState } from '../../hooks/usePwaInstall';

const NotificationPanel = dynamic(() => import('../notifications/NotificationPanel').then((module) => module.NotificationPanel), { ssr: false });
const BarcodeScannerModal = dynamic(() => import('../barcode/BarcodeScannerModal').then((module) => module.BarcodeScannerModal), { ssr: false });
const ProductSkuDetailSheet = dynamic(() => import('../barcode/ProductSkuDetailSheet').then((module) => module.ProductSkuDetailSheet), { ssr: false });
const PwaInstallModal = dynamic(() => import('../pwa/PwaInstallModal').then((module) => module.PwaInstallModal), { ssr: false });
const AccountModal = dynamic(() => import('./AccountModal').then((module) => module.AccountModal), { ssr: false });
const SlackSettingsModal = dynamic(() => import('./SlackSettingsModal').then((module) => module.SlackSettingsModal), { ssr: false });
const MailAutomationModal = dynamic(() => import('../mail/MailAutomationModal').then((module) => module.MailAutomationModal), { ssr: false });

interface TopbarOverlaysProps {
  notificationOpen: boolean;
  accountModalOpen: boolean;
  closeAccountModal: () => void;
  avatarUrl: string | null;
  saveAvatar: (url: string | null) => void;
  slackModalOpen: boolean;
  closeSlackModal: () => void;
  mailModalOpen?: boolean;
  closeMailModal?: () => void;
  pwaModalOpen: boolean;
  closePwaModal: () => void;
  pwaInstall: PwaInstallState;
  scanOpen: boolean;
  closeScanner: () => void;
  handleScan: (sku: string) => void;
  scannedSku: string | null;
  closeProductDetail: () => void;
}

export function TopbarOverlays(props: TopbarOverlaysProps) {
  return (
    <>
      {props.notificationOpen && <NotificationPanel />}
      {props.accountModalOpen && <AccountModal isOpen onClose={props.closeAccountModal} avatarUrl={props.avatarUrl} onSaveAvatar={props.saveAvatar} />}
      {props.slackModalOpen && <SlackSettingsModal isOpen onClose={props.closeSlackModal} />}
      {props.mailModalOpen && props.closeMailModal && <MailAutomationModal isOpen onClose={props.closeMailModal} />}
      {props.pwaModalOpen && (
        <PwaInstallModal
          isOpen
          onClose={props.closePwaModal}
          canPrompt={props.pwaInstall.canPrompt}
          isStandalone={props.pwaInstall.isStandalone}
          isIos={props.pwaInstall.isIos}
          promptInstall={props.pwaInstall.promptInstall}
        />
      )}
      {props.scanOpen && <BarcodeScannerModal open onClose={props.closeScanner} onScan={props.handleScan} />}
      {props.scannedSku && <ProductSkuDetailSheet sku={props.scannedSku} onClose={props.closeProductDetail} />}
    </>
  );
}
