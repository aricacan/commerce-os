'use client';

import React from 'react';
import Image from 'next/image';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
}

// Gerçek marka logoları (/public/brand-logos) — size, SVG ikonlardaki gibi YÜKSEKLİĞİ
// belirler; genişlik görselin gerçek en-boy oranına göre otomatik ayarlanır (kare
// zorlanmaz, dikdörtgen logolar kendi oranında akar — bkz. next/image width/height
// intrinsic boyut, CSS'te sadece height sabit, width 'auto').
function BrandLogoImg({
  src, alt, width, height, size = 16, className = '',
}: { src: string; alt: string; width: number; height: number; size?: number | string; className?: string }) {
  const h = typeof size === 'number' ? size : parseInt(String(size), 10) || 16;
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={`inline-block shrink-0 align-middle object-contain ${className}`}
      style={{ height: h, width: 'auto' }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. VIBRANT / COLORFUL BRAND LOGOS (Exact Base.com Topology Visuals)
// ═══════════════════════════════════════════════════════════════════════════

export function EbayColorLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center font-black tracking-tighter text-lg select-none ${className}`}>
      <span className="text-[#e53238]">e</span>
      <span className="text-[#0064d2]">b</span>
      <span className="text-[#f5af02]">a</span>
      <span className="text-[#86b817]">y</span>
    </div>
  );
}

export function AmazonColorLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <span className="font-extrabold text-xs tracking-tight text-zinc-900 leading-none">amazon</span>
      <svg width="34" height="8" viewBox="0 0 34 8" fill="none" className="mt-0.5">
        <path d="M1 3C7 6.5 24 7.5 33 1" stroke="#ff9900" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M33 1L30 4M33 1L29 0.5" stroke="#ff9900" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function BQColorLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-[#f45a00] text-white px-2 py-0.5 rounded-[3px] font-black text-xs tracking-wider select-none ${className}`}>
      B&Q
    </div>
  );
}

export function TemuColorLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-[#ff5b00] text-white px-2 py-0.5 rounded-[3px] font-black text-ui-xs tracking-wider select-none ${className}`}>
      TEMU
    </div>
  );
}

export function ShopifyColorLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1 select-none ${className}`}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#95bf47">
        <path d="M15.3 3.5l-1.8.6c-.2-.6-.5-1.1-.9-1.5-.7-.7-1.7-.8-2.2-.4-.7.4-.9 1.5-.7 2.6l-2.4.8c-.3.1-.3.4-.3.4l1.3 15.6s.1.5.7.5h9c.6 0 .7-.5.7-.5l2-16.6s0-.3-.3-.4l-5.4-.5z" />
      </svg>
      <span className="font-bold text-xs text-zinc-800 tracking-tight">shopify</span>
    </div>
  );
}

export function DxDeliveryColorLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-[#003882] text-white px-2.5 py-0.5 rounded-[3px] font-black text-xs tracking-wider select-none ${className}`}>
      DX
    </div>
  );
}

export function XeroColorLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-[#13b5ea] text-white w-6 h-6 rounded-full flex items-center justify-center font-black text-xs select-none ${className}`}>
      xero
    </div>
  );
}

export function SentosColorLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1 select-none ${className}`}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#0284c7">
        <path d="M12 2L3.5 6.8v10.4L12 22l8.5-4.8V6.8L12 2zm0 2.3l6.5 3.7-6.5 3.7-6.5-3.7L12 4.3z" />
      </svg>
      <span className="font-bold text-xs text-zinc-900">sentos</span>
    </div>
  );
}

export function BasePrinterColorLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <span className="font-extrabold text-ui-xs text-zinc-900 tracking-tight leading-none">base.</span>
      <span className="font-bold text-ui-2xs text-[#f45a00] leading-none mt-0.5">printer</span>
    </div>
  );
}

export function SlackColorLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1 select-none ${className}`}>
      <svg width="16" height="16" viewBox="0 0 24 24">
        <path d="M6 15a2 2 0 0 1-2-2 2 2 0 0 1 2-2h2v2a2 2 0 0 1-2 2z" fill="#E01E5A" />
        <path d="M7 15a2 2 0 0 1 2 2 2 2 0 0 1-2 2 2 2 0 0 1-2-2v-2h2z" fill="#36C5F0" />
        <path d="M20 9a2 2 0 0 1-2 2h-2v-2a2 2 0 0 1 2-2 2 2 0 0 1 2 2z" fill="#2EB67D" />
        <path d="M17 9a2 2 0 0 1-2-2 2 2 0 0 1 2-2 2 2 0 0 1 2 2v2h-2z" fill="#ECB22E" />
      </svg>
      <span className="font-bold text-xs text-zinc-900">slack</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. MONO / THEMED SVG ICONS
// ═══════════════════════════════════════════════════════════════════════════

export function SentosIcon({ size = 16, className = '' }: IconProps) {
  return <BrandLogoImg src="/brand-logos/sentos.png" alt="Sentos" width={480} height={480} size={size} className={className} />;
}

export function BaseErpIcon({ size = 16, className = '' }: IconProps) {
  return <BrandLogoImg src="/brand-logos/base.png" alt="Base" width={480} height={480} size={size} className={className} />;
}

export function LogoYazilimIcon({ size = 16, className = '' }: IconProps) {
  return <BrandLogoImg src="/brand-logos/logo-yazilim.png" alt="Logo Yazılım" width={317} height={113} size={size} className={className} />;
}

export function MikroIcon({ size = 16, className = '' }: IconProps) {
  return <BrandLogoImg src="/brand-logos/mikro.png" alt="Mikro Yazılım" width={288} height={116} size={size} className={className} />;
}

export function NetsisIcon({ size = 16, className = '' }: IconProps) {
  return <BrandLogoImg src="/brand-logos/netsis.png" alt="Netsis" width={314} height={86} size={size} className={className} />;
}

export function NebimIcon({ size = 16, className = '' }: IconProps) {
  return <BrandLogoImg src="/brand-logos/nebim.png" alt="Nebim" width={327} height={87} size={size} className={className} />;
}

export function ParasutIcon({ size = 16, className = '' }: IconProps) {
  return <BrandLogoImg src="/brand-logos/parasut.png" alt="Paraşüt" width={342} height={102} size={size} className={className} />;
}

export function BizimHesapIcon({ size = 16, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={`shrink-0 ${className}`} {...props}>
      <rect x="2" y="5" width="20" height="14" rx="2" fill="#2E9E4F" />
      <text x="12" y="15" fill="#fff" fontSize="6" fontWeight="800" textAnchor="middle" fontFamily="sans-serif">
        bizimhesap
      </text>
    </svg>
  );
}

export function AkinsoftIcon({ size = 16, className = '' }: IconProps) {
  return <BrandLogoImg src="/brand-logos/akinsoft.png" alt="Akınsoft" width={248} height={247} size={size} className={className} />;
}

export function OdooIcon({ size = 16, className = '' }: IconProps) {
  return <BrandLogoImg src="/brand-logos/odoo.png" alt="Odoo" width={319} height={123} size={size} className={className} />;
}

export function SapIcon({ size = 16, className = '' }: IconProps) {
  return <BrandLogoImg src="/brand-logos/sap.png" alt="SAP" width={293} height={163} size={size} className={className} />;
}

export function DiaIcon({ size = 16, className = '' }: IconProps) {
  return <BrandLogoImg src="/brand-logos/dia.png" alt="Dia" width={241} height={204} size={size} className={className} />;
}

export function EtaIcon({ size = 16, className = '' }: IconProps) {
  return <BrandLogoImg src="/brand-logos/eta.png" alt="ETA" width={341} height={163} size={size} className={className} />;
}

export function LucaIcon({ size = 16, className = '' }: IconProps) {
  return <BrandLogoImg src="/brand-logos/luca.png" alt="Luca" width={313} height={130} size={size} className={className} />;
}

export function MsDynamics365Icon({ size = 16, className = '' }: IconProps) {
  return <BrandLogoImg src="/brand-logos/ms-dynamics365.png" alt="Microsoft Dynamics 365" width={345} height={156} size={size} className={className} />;
}

export function OracleNetsuiteIcon({ size = 16, className = '' }: IconProps) {
  return <BrandLogoImg src="/brand-logos/oracle-netsuite.png" alt="Oracle NetSuite" width={297} height={128} size={size} className={className} />;
}

export function UyumsoftIcon({ size = 16, className = '' }: IconProps) {
  return <BrandLogoImg src="/brand-logos/uyumsoft.png" alt="Uyumsoft" width={346} height={102} size={size} className={className} />;
}

export function XeroIcon({ size = 16, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={`shrink-0 ${className}`} {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 8l8 8M16 8l-8 8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function TrendyolIcon({ size = 16, className = '' }: IconProps) {
  return <BrandLogoImg src="/brand-logos/trendyol.png" alt="Trendyol" width={480} height={480} size={size} className={className} />;
}

export function HepsiburadaIcon({ size = 16, className = '' }: IconProps) {
  return <BrandLogoImg src="/brand-logos/hepsiburada.png" alt="Hepsiburada" width={480} height={480} size={size} className={className} />;
}

export function N11Icon({ size = 16, className = '' }: IconProps) {
  return <BrandLogoImg src="/brand-logos/n11.png" alt="n11" width={480} height={480} size={size} className={className} />;
}

export function AmazonIcon({ size = 16, className = '' }: IconProps) {
  return <BrandLogoImg src="/brand-logos/amazon.png" alt="Amazon" width={314} height={111} size={size} className={className} />;
}

export function EbayIcon({ size = 16, className = '' }: IconProps) {
  return <BrandLogoImg src="/brand-logos/ebay.png" alt="eBay" width={480} height={193} size={size} className={className} />;
}

export function PazaramaIcon({ size = 16, className = '' }: IconProps) {
  return <BrandLogoImg src="/brand-logos/pazarama.png" alt="Pazarama" width={480} height={480} size={size} className={className} />;
}

export function CiceksepetiIcon({ size = 16, className = '' }: IconProps) {
  return <BrandLogoImg src="/brand-logos/ciceksepeti.png" alt="Çiçeksepeti" width={480} height={480} size={size} className={className} />;
}

export function EtsyIcon({ size = 16, className = '' }: IconProps) {
  return <BrandLogoImg src="/brand-logos/etsy.png" alt="Etsy" width={437} height={219} size={size} className={className} />;
}

export function TemuIcon({ size = 16, className = '' }: IconProps) {
  return <BrandLogoImg src="/brand-logos/temu.png" alt="Temu" width={214} height={225} size={size} className={className} />;
}

export function WalmartIcon({ size = 16, className = '' }: IconProps) {
  return <BrandLogoImg src="/brand-logos/walmart.png" alt="Walmart Marketplace" width={480} height={161} size={size} className={className} />;
}

export function TiktokShopIcon({ size = 16, className = '' }: IconProps) {
  return <BrandLogoImg src="/brand-logos/tiktokshop.png" alt="TikTok Shop" width={480} height={128} size={size} className={className} />;
}

export function BoynerIcon({ size = 16, className = '' }: IconProps) {
  return <BrandLogoImg src="/brand-logos/boyner.png" alt="Boyner" width={305} height={65} size={size} className={className} />;
}

export function PttAvmIcon({ size = 16, className = '' }: IconProps) {
  return <BrandLogoImg src="/brand-logos/pttavm.png" alt="PttAVM" width={407} height={99} size={size} className={className} />;
}

export function BQIcon({ size = 16, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={`shrink-0 ${className}`} {...props}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <text x="12" y="16" fill="#fff" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
        B&Q
      </text>
    </svg>
  );
}

export function ManoManoIcon({ size = 16, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={`shrink-0 ${className}`} {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M7 14l2.5-4 2.5 4 2.5-4 2.5 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WishIcon({ size = 16, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={`shrink-0 ${className}`} {...props}>
      <path d="M4 6h3.5l2 8 2.5-8H15l2.5 8 2-8H23l-3.5 12h-3L14 10l-2.5 8h-3L4 6z" />
    </svg>
  );
}

// Google's shopping-bag mark using the four Google brand colors.
export function GoogleShoppingIcon({ size = 16, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={`shrink-0 ${className}`} {...props}>
      <path d="M12 2a5 5 0 0 1 5 5v1H7V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v1h6V7a3 3 0 0 0-3-3z" fill="#5F6368" />
      <path d="M4 10h8v10H4a2 2 0 0 1-2-2V12a2 2 0 0 1 2-2z" fill="#4285F4" />
      <path d="M12 10h4v10h-4z" fill="#FBBC05" />
      <path d="M16 10h4a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-4z" fill="#EA4335" />
      <circle cx="12" cy="15" r="1.6" fill="#34A853" />
    </svg>
  );
}

// Correct-color wordmark fallback — Allegro's brand orange in place of an unverified glyph.
export function AllegroIcon({ size = 16, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={`shrink-0 ${className}`} {...props}>
      <rect x="2" y="5" width="20" height="14" rx="7" fill="#FF5A00" />
      <text x="12" y="15.5" fill="#fff" fontSize="7.5" fontWeight="800" textAnchor="middle" fontFamily="sans-serif">
        allegro
      </text>
    </svg>
  );
}

export function AliexpressIcon({ size = 16, className = '' }: IconProps) {
  return <BrandLogoImg src="/brand-logos/aliexpress.png" alt="AliExpress" width={480} height={127} size={size} className={className} />;
}

export function ShopifyIcon({ size = 16, className = '' }: IconProps) {
  return <BrandLogoImg src="/brand-logos/shopify.png" alt="Shopify" width={480} height={166} size={size} className={className} />;
}

// WooCommerce's rounded speech-bubble mark in brand purple.
export function WooCommerceIcon({ size = 16, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#7F54B3" className={`shrink-0 ${className}`} {...props}>
      <path d="M2.5 5h19c1.1 0 2 .9 2 2v9c0 1.1-.9 2-2 2h-4.5l-3 3-3-3H2.5c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2zm4.5 3.5l-1.5 5 1.5 1.5 2-4.5 2 4.5 1.5-1.5-1.5-5h-1.5l-1 2.5-1-2.5H7zm7.5 0l-1.5 5 1.5 1.5 2-4.5 2 4.5 1.5-1.5-1.5-5h-1.5l-1 2.5-1-2.5h-1.5z" fill="#fff" />
    </svg>
  );
}

// Magento's boxed "M" glyph in the brand's signature orange.
export function MagentoIcon({ size = 16, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#F26322" className={`shrink-0 ${className}`} {...props}>
      <path d="M12 2L2 7.8v8.4l4 2.3V9.5l6-3.5 6 3.5v9l4-2.3V7.8L12 2zm-2 9.5v7.7l2 1.2 2-1.2v-7.7L12 10.3l-2 1.2z" />
    </svg>
  );
}

export function OpencartIcon({ size = 16, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={`shrink-0 ${className}`} {...props}>
      <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM4.3 3L3 6h17.5l-1.8 8.5H7L5.5 5H2v-2h2.3z" />
    </svg>
  );
}

export function SquarespaceIcon({ size = 16, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={`shrink-0 ${className}`} {...props}>
      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm3.5 14.5l-2-2 2-2 2 2-2 2zm-5-5l-2-2 2-2 2 2-2 2z" />
    </svg>
  );
}

// Not confident of BigCommerce's exact vector mark — brand navy monogram fallback.
export function BigCommerceIcon({ size = 16, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={`shrink-0 ${className}`} {...props}>
      <rect x="2" y="5" width="20" height="14" rx="2" fill="#34313F" />
      <text x="12" y="15.5" fill="#00E047" fontSize="8" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
        BC
      </text>
    </svg>
  );
}

export function WixIcon({ size = 16, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={`shrink-0 ${className}`} {...props}>
      <path d="M3 6h3.5l2.5 8 2.5-8H15l2.5 8 2.5-8H23l-3.5 12h-3L14 10l-2.5 8h-3L3 6z" />
    </svg>
  );
}

export function RoyalMailIcon({ size = 16, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={`shrink-0 ${className}`} {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M5 8l7 5 7-5" fill="none" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

export function EvriIcon({ size = 16, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={`shrink-0 ${className}`} {...props}>
      <text x="12" y="16" fill="currentColor" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
        EVRi
      </text>
    </svg>
  );
}

export function UpsIcon({ size = 16, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={`shrink-0 ${className}`} {...props}>
      <path d="M12 2L3 5v7c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5l-9-3zm0 4.5a3.5 3.5 0 0 1 3.5 3.5v2a3.5 3.5 0 0 1-7 0v-2a3.5 3.5 0 0 1 3.5-3.5z" />
    </svg>
  );
}

export function DhlIcon({ size = 16, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={`shrink-0 ${className}`} {...props}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <text x="12" y="15" fill="#fff" fontSize="8" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
        DHL
      </text>
    </svg>
  );
}

export function ShipStationIcon({ size = 16, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={`shrink-0 ${className}`} {...props}>
      <path d="M3 13h18l-3 7H6l-3-7zm9-10l5 7H7l5-7z" />
    </svg>
  );
}

export function DxDeliveryIcon({ size = 16, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={`shrink-0 ${className}`} {...props}>
      <rect x="2" y="5" width="20" height="14" rx="3" />
      <text x="12" y="15" fill="#fff" fontSize="9" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
        DX
      </text>
    </svg>
  );
}

export function SlackIcon({ size = 16, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={`shrink-0 ${className}`} {...props}>
      <path d="M6 15a2 2 0 0 1-2-2 2 2 0 0 1 2-2h2v2a2 2 0 0 1-2 2zm1 0a2 2 0 0 1 2 2 2 2 0 0 1-2 2 2 2 0 0 1-2-2v-2h2zm2-6a2 2 0 0 1-2-2 2 2 0 0 1 2-2 2 2 0 0 1 2 2v2H9zm0 1a2 2 0 0 1 2-2 2 2 0 0 1 2 2v2h-2a2 2 0 0 1-2-2zm6-2a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2v-2a2 2 0 0 1 2-2zm-1 0a2 2 0 0 1-2-2 2 2 0 0 1 2-2 2 2 0 0 1 2 2v2h-2zm-2 6a2 2 0 0 1 2 2 2 2 0 0 1-2 2 2 2 0 0 1-2-2v-2h2zm0-1a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-2h2a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function PrinterAppIcon({ size = 16, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`} {...props}>
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}
