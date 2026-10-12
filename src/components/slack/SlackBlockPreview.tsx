'use client';

import React from 'react';
import type { SlackBlock } from '../../lib/api/notification-routes';

/**
 * Slack Block Kit mesajını Slack'in çizdiği gibi gösterir.
 *
 * Mail tarafındaki iframe önizlemesinin karşılığı: kullanıcı, kanala düşecek mesajı
 * göndermeden görebilmeli. Slack HTML kabul etmediği için burada iframe yok — bloklar
 * doğrudan Slack'in tipografisiyle çizilir (Lato yoksa sistem sans'ına düşer).
 */
export function SlackBlockPreview({ blocks }: { blocks: SlackBlock[] }) {
  return (
    <div className="bg-white px-4 py-3 font-[Lato,-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] text-[#1d1c1d]">
      {blocks.map((block, index) => (
        <BlockRow key={index} block={block} />
      ))}
    </div>
  );
}

function BlockRow({ block }: { block: SlackBlock }) {
  if (block.type === 'divider') {
    return <hr className="my-2.5 border-0 border-t border-[#e8e8e8]" />;
  }

  if (block.type === 'header') {
    return (
      <h3 className="mb-1.5 text-[18px] font-black leading-tight text-[#1d1c1d]">
        {block.text?.text}
      </h3>
    );
  }

  if (block.type === 'context') {
    return (
      <div className="mb-1.5 text-[12px] leading-[1.5] text-[#616061]">
        {block.elements?.map((el, i) => <Mrkdwn key={i} text={el.text} />)}
      </div>
    );
  }

  // section — düz metin ya da 2 sütunlu alan ızgarası
  if (block.fields?.length) {
    return (
      <div className="mb-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[15px] leading-[1.46]">
        {block.fields.map((f, i) => (
          <div key={i}>
            <Mrkdwn text={f.text} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mb-2 text-[15px] leading-[1.46]">
      <Mrkdwn text={block.text?.text ?? ''} />
    </div>
  );
}

/**
 * Slack mrkdwn'ın panelde kullanılan alt kümesi: ```kod bloğu```, `satır içi kod`,
 * *kalın* ve satır sonları. Tam bir ayrıştırıcı DEĞİL — raporlar yalnızca bunları üretiyor.
 */
function Mrkdwn({ text }: { text: string }) {
  const segments = text.split(/(```[\s\S]*?```)/g);

  return (
    <>
      {segments.map((segment, i) => {
        if (segment.startsWith('```') && segment.endsWith('```')) {
          return (
            <pre
              key={i}
              className="my-1 overflow-x-auto rounded-[4px] border border-[#e8e8e8] bg-[#f8f8f8] px-2.5 py-2 font-mono text-[12px] leading-[1.5] text-[#1d1c1d]"
            >
              {segment.slice(3, -3).replace(/^\n/, '').replace(/\n$/, '')}
            </pre>
          );
        }
        return <InlineMrkdwn key={i} text={segment} />;
      })}
    </>
  );
}

function InlineMrkdwn({ text }: { text: string }) {
  const parts = text.split(/(\*[^*\n]+\*|`[^`\n]+`|\n)/g).filter(Boolean);

  return (
    <>
      {parts.map((part, i) => {
        if (part === '\n') return <br key={i} />;

        if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
          return (
            <strong key={i} className="font-bold">
              {part.slice(1, -1)}
            </strong>
          );
        }

        if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={i}
              className="rounded-[3px] border border-[#e8e8e8] bg-[#f8f8f8] px-1 py-px font-mono text-[12px] text-[#e01e5a]"
            >
              {part.slice(1, -1)}
            </code>
          );
        }

        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}
