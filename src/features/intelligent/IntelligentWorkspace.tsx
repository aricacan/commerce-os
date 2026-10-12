'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { MessageSquare, FileText, Wand2, Image as ImageIcon } from 'lucide-react';
import { ModuleWorkspace, type WorkspaceTab } from '../shared/ModuleWorkspace';
import { IntelligentChatPanel } from './IntelligentChatPanel';

const IntelligentDocumentSidebar = dynamic(() => import('./IntelligentDocumentSidebar').then((module) => module.IntelligentDocumentSidebar), { ssr: false });
const PromptBuilderPanel = dynamic(() => import('./PromptBuilderPanel').then((module) => module.PromptBuilderPanel), { ssr: false });
const IntelligentProductImagesPanel = dynamic(() => import('./IntelligentProductImagesPanel').then((module) => module.IntelligentProductImagesPanel), { ssr: false });

interface Props {
  onClose: () => void;
}

const TABS = [
  { key: 'chat', label: 'Sohbet', Icon: MessageSquare },
  { key: 'documents', label: 'Belgeler (Metin)', Icon: FileText },
  { key: 'productImages', label: 'Resimler (Visual RAG)', Icon: ImageIcon },
  { key: 'promptBuilder', label: 'Prompt Builder', Icon: Wand2 },
] as const satisfies readonly WorkspaceTab[];

type TabKey = (typeof TABS)[number]['key'];

// Intelligent — RAG belge asistanı. Sekmeler kendi içinde kaydırılan panellerden
// oluşuyor (mesaj akışı / belge listesi / ürün resimleri / sihirbaz).
export function IntelligentWorkspace({ onClose }: Props) {
  const [tab, setTab] = useState<TabKey>('chat');

  return (
    <ModuleWorkspace
      title="AI Copilot"
      tabs={TABS}
      activeTab={tab}
      onTabChange={(k) => setTab(k as TabKey)}
      onClose={onClose}
      scroll={false}
    >
      {tab === 'chat' && <IntelligentChatPanel />}
      {tab === 'documents' && <IntelligentDocumentSidebar />}
      {tab === 'productImages' && <IntelligentProductImagesPanel />}
      {tab === 'promptBuilder' && <PromptBuilderPanel />}
    </ModuleWorkspace>
  );
}
