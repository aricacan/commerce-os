'use client';

import { useEffect, useState } from 'react';
import { categoryTemplatesApi, type CategoryTemplateSummary } from '../../lib/api/category-templates';

interface CategoryTemplatePickerProps {
  value: string;
  onChange: (key: string) => void;
  className?: string;
}

// Kiracı kurulum formunda sektör şablonu seçimi (Faz 4, docs/CATEGORY-TEMPLATE-PLAN.md §5).
// Boş seçenek BİLİNÇLİ: şablonsuz kiracı geçerli bir yol (Faz 5'in otomatik kategorizer'ı
// kullanılır) — zorunlu bir seçim değil.
export function CategoryTemplatePicker({ value, onChange, className }: CategoryTemplatePickerProps) {
  const [templates, setTemplates] = useState<CategoryTemplateSummary[] | null>(null);
  // Liste ÇEKİLEMEDİ ile liste BOŞ birbirinden ayrılmalı. Hata sessizce boş listeye
  // çevrilirse, seçici "hiç şablon yok" gibi görünür ve yönetici kiracıyı farkında olmadan
  // kategorisiz açar — sonradan düzeltmesi en pahalı durum.
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    categoryTemplatesApi.list()
      .then((list) => { if (!cancelled) { setTemplates(list); setFailed(false); } })
      .catch(() => { if (!cancelled) { setTemplates([]); setFailed(true); } });
    return () => { cancelled = true; };
  }, []);

  const selectClass = className
    ?? 'w-64 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900';

  return (
    <div className="flex flex-col gap-1">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={templates === null || failed}
        className={selectClass}
      >
        <option value="">Şablonsuz (sonra otomatik kategorize edilir)</option>
        {templates?.map((t) => (
          <option key={t.key} value={t.key}>
            {t.displayNameTr} (v{t.version})
          </option>
        ))}
      </select>
      {failed && (
        <span className="text-xs text-red-600 dark:text-red-400">
          Şablon listesi alınamadı — kiracı şablonsuz açılacak.
        </span>
      )}
    </div>
  );
}
