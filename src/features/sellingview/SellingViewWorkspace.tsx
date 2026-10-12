'use client';

import { workspaceOverlay } from '../shared/workspace.styles';
import { SellingViewContent } from './SellingViewContent';

interface Props {
  onClose: () => void;
}

/**
 * SellingView'in kabuğu — diğer 12 uygulamanın paylaştığı ModuleWorkspace
 * (sekmeli, kenar-çubuklu) kalıbını KASITLI OLARAK kullanmıyor. Kullanıcı isteği:
 * borsa terminaline tam bağımsız bir kabuk.
 *
 * SOL RAY KALDIRILDI: tek bir "kapat" düğmesi için 52 piksellik dikey şerit
 * ayırmak, terminalin en değerli kaynağını (yatay genişlik) dekorasyona
 * harcıyordu. Geri dönüş artık üst çubuğun sağ ucunda — kullanıcının çıkışı
 * aradığı yer orası.
 *
 * SAYFA KAYMAZ: bir borsa terminali tek ekrandır. Kabuk `workspaceOverlay`den
 * (diğer panellerle AYNI katman, fixed, z-index 20000) tam yükseklik/genişlik
 * alır ve `overflow: hidden` ile kapatır — SellingViewContent kalan alanı flex
 * ile paylaştırır, sığmayan içerik ("Detay" düğmeleriyle) kendi tam ekran
 * penceresini açar. Sayfayı kaydırmak yerine ekranın kendisini terminal gibi
 * sabit tutmak TradingView'in de yaptığı şey.
 */
export function SellingViewWorkspace({ onClose }: Props) {
  return (
    <div
      style={{
        ...workspaceOverlay,
        // workspaceOverlay'in zemini sabit beyaz — koyu temada bir kare
        // beyaz olarak sızıyordu. Jetona çekildi.
        background: 'var(--bg)',
        overflow: 'hidden',
      }}
    >
      <div className="flex h-full w-full flex-col overflow-hidden bg-bg">
        <SellingViewContent onClose={onClose} />
      </div>
    </div>
  );
}
