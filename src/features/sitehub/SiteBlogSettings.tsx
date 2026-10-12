'use client';

import { SITE_CONTENT_LANGUAGE_LABELS, type SiteContentLanguage } from '../../lib/api/sitehub';
import type { AdapterConfig } from './adapter-config';

interface Props {
  supportsBlog: boolean;
  onSupportsBlogChange: (value: boolean) => void;
  contentLanguage: SiteContentLanguage;
  onContentLanguageChange: (value: SiteContentLanguage) => void;
  // Yalnızca Generic sağlayıcıda dolu: ADM'nin blog uçları kodda sabit, düzenlenecek alan yok.
  config: AdapterConfig | null;
  onConfigChange: (config: AdapterConfig) => void;
}

const LABEL_CLASS = 'mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider';
const INPUT_CLASS = 'h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]';

// Site formunun blog bölümü: "Blog destekler" kutusu ve yalnızca işaretliyken görünen
// blog alanları (içerik dili + Generic'te blog uç adresleri). Sunucu kayıtta aynı
// alanları doğrular; eksikse 400 ile Türkçe mesaj döner.
export function SiteBlogSettings({
  supportsBlog, onSupportsBlogChange, contentLanguage, onContentLanguageChange, config, onConfigChange,
}: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-[4px] border border-[var(--border-soft)] p-3">
      <label className="flex items-center gap-2 text-xs font-semibold text-[var(--fg)] cursor-pointer">
        <input
          type="checkbox"
          checked={supportsBlog}
          onChange={(e) => onSupportsBlogChange(e.target.checked)}
          className="h-4 w-4 rounded-[3px]"
        />
        <span>Blog destekler</span>
      </label>

      {supportsBlog && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLASS}>İçerik Dili (Blog)</label>
            <select
              value={contentLanguage}
              onChange={(e) => onContentLanguageChange(e.target.value as SiteContentLanguage)}
              className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
            >
              {(Object.keys(SITE_CONTENT_LANGUAGE_LABELS) as SiteContentLanguage[]).map((lang) => (
                <option key={lang} value={lang}>{SITE_CONTENT_LANGUAGE_LABELS[lang]}</option>
              ))}
            </select>
          </div>

          {config && (
            <>
              <div>
                <label className={LABEL_CLASS}>Blog Liste Ucu *</label>
                <input
                  value={config.blogListPath ?? ''}
                  onChange={(e) => onConfigChange({ ...config, blogListPath: e.target.value || null })}
                  placeholder="/api/blog"
                  className={INPUT_CLASS}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL_CLASS}>Blog Yazı Ucu * ({'{slug}'} içermeli)</label>
                <input
                  value={config.blogItemPath ?? ''}
                  onChange={(e) => onConfigChange({ ...config, blogItemPath: e.target.value || null })}
                  placeholder="/api/blog/{slug}"
                  className={INPUT_CLASS}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
