'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Send, Pencil, Trash2, FileText, Sparkles, Languages, Undo2 } from 'lucide-react';
import {
  siteHubApi, SITE_CONTENT_LANGUAGE_LABELS,
  type SiteConnectionDto, type SiteBlogPostInput, type SiteBlogPostDto,
  type SiteBlogBroadcastResultItem, type SiteBlogDraft, type SiteContentLanguage,
} from '../../lib/api/sitehub';
import { useFeedback } from '../shared/Feedback';
import { siteSupportsBlog } from './adapter-config';

const EMPTY_POST: SiteBlogPostInput = {
  slug: '', title: '', excerpt: '', content: '', coverImageUrl: '', published: true,
};

// Uzun bir yazı sekme değişince ya da sayfa yenilenince kayboluyordu. Taslak tarayıcıda
// tutulur ve yalnızca TÜM siteler başarılı olunca silinir.
const DRAFT_STORAGE_KEY = 'sitehub:blog-draft';
const DRAFT_SAVE_DELAY_MS = 600;

// Hazır AI talimatları — serbest talimat da yazılabilir.
const AI_PRESETS: { label: string; instruction: string }[] = [
  { label: 'SEO uyumlu yap', instruction: 'Arama motorları için optimize et: net başlık, anahtar kelimeleri doğal kullan, alt başlıklar ekle.' },
  { label: 'İmla düzelt', instruction: 'Yalnızca yazım, noktalama ve dil bilgisi hatalarını düzelt; anlamı ve üslubu değiştirme.' },
  { label: 'Daha akıcı', instruction: 'Daha akıcı ve okunaklı yeniden yaz; bilgiyi koru.' },
  { label: 'Kısalt', instruction: 'Ana bilgileri koruyarak yaklaşık yarı uzunluğa kısalt.' },
];

interface StoredDraft {
  post: SiteBlogPostInput;
  slugTouched: boolean;
  sourceLanguage: SiteContentLanguage;
}

function readStoredDraft(): StoredDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredDraft) : null;
  } catch {
    return null;
  }
}

function writeStoredDraft(draft: StoredDraft | null) {
  try {
    if (draft) window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    else window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // Tarayıcı depolamayı engelliyorsa taslak yalnızca bellekte kalır — yazma engellenmez.
  }
}

function slugify(title: string): string {
  const map: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' };
  return title
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşü]/g, (ch) => map[ch] ?? ch)
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function draftOf(post: SiteBlogPostInput): SiteBlogDraft {
  return { title: post.title, excerpt: post.excerpt || null, content: post.content };
}

export function BlogTab() {
  const [sites, setSites] = useState<SiteConnectionDto[]>([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [post, setPost] = useState<SiteBlogPostInput>(EMPTY_POST);
  const [slugTouched, setSlugTouched] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState<SiteContentLanguage>('tr');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<SiteBlogBroadcastResultItem[]>([]);
  const { notify, confirm } = useFeedback();

  const [aiBusy, setAiBusy] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');
  const [undoPost, setUndoPost] = useState<SiteBlogPostInput | null>(null);
  const [preview, setPreview] = useState<SiteBlogDraft | null>(null);

  const [editing, setEditing] = useState<{ siteId: number; siteName: string; slug: string } | null>(null);
  const [listSiteId, setListSiteId] = useState<number | null>(null);
  const [posts, setPosts] = useState<SiteBlogPostDto[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);

  // Kaydedilmiş taslağı geri yükle (yalnızca ilk açılışta).
  useEffect(() => {
    const stored = readStoredDraft();
    if (!stored) return;
    setPost(stored.post);
    setSlugTouched(stored.slugTouched);
    setSourceLanguage(stored.sourceLanguage);
  }, []);

  // Yeni yazı taslağını otomatik kaydet; düzenleme modunda site kaynak doğrusu, saklanmaz.
  useEffect(() => {
    if (editing) return;
    const timer = window.setTimeout(() => {
      const isEmpty = !post.title && !post.content && !post.excerpt;
      writeStoredDraft(isEmpty ? null : { post, slugTouched, sourceLanguage });
    }, DRAFT_SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [post, slugTouched, sourceLanguage, editing]);

  const load = useCallback(async () => {
    setLoadingSites(true);
    setError(null);
    try {
      const data = await siteHubApi.getSites();
      setSites(data);
      const blog = data.filter(siteSupportsBlog);
      setSelectedIds(blog.map((s) => s.id));
      setListSiteId((prev) => prev ?? blog[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Siteler yüklenemedi.');
    } finally {
      setLoadingSites(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const blogSites = useMemo(() => sites.filter(siteSupportsBlog), [sites]);

  // Seçili sitelerde yazının dilinden farklı olanlar — oraya otomatik çevrilerek gidecek.
  const translatedTargets = useMemo(
    () => blogSites.filter((s) => selectedIds.includes(s.id) && s.contentLanguage !== sourceLanguage),
    [blogSites, selectedIds, sourceLanguage],
  );
  const otherLanguage: SiteContentLanguage = sourceLanguage === 'tr' ? 'en' : 'tr';

  const loadPosts = useCallback(async (siteId: number) => {
    setLoadingPosts(true);
    setPostsError(null);
    try {
      setPosts(await siteHubApi.getBlogPosts(siteId));
    } catch (e) {
      setPostsError(e instanceof Error ? e.message : 'Yazılar yüklenemedi.');
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  useEffect(() => { if (listSiteId != null) void loadPosts(listSiteId); }, [listSiteId, loadPosts]);

  const setTitle = (title: string) => {
    setPost((prev) => ({
      ...prev, title,
      slug: slugTouched ? prev.slug : slugify(title),
    }));
  };

  const toggleSite = (id: number) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const hasBody = post.title.trim() !== '' && post.content.trim() !== '';
  const canSend = hasBody && post.slug.trim() !== '' && (editing !== null || selectedIds.length > 0);

  const resetForm = () => {
    setPost(EMPTY_POST);
    setSlugTouched(false);
    setEditing(null);
    setResults([]);
    setUndoPost(null);
    setPreview(null);
    writeStoredDraft(null);
  };

  const startEdit = async (siteId: number, siteName: string, slug: string) => {
    try {
      const full = await siteHubApi.getBlogPost(siteId, slug);
      setPost({
        slug: full.slug, title: full.title, excerpt: full.excerpt ?? '',
        content: full.content ?? '', coverImageUrl: full.coverImageUrl ?? '', published: full.published,
      });
      setSourceLanguage(blogSites.find((s) => s.id === siteId)?.contentLanguage ?? 'tr');
      setSlugTouched(true);
      setEditing({ siteId, siteName, slug });
      setResults([]);
      setUndoPost(null);
      setPreview(null);
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Yazı yüklenemedi.');
    }
  };

  const handleDelete = async (siteId: number, siteName: string, slug: string, title: string) => {
    const ok = await confirm({
      title: `"${title}" silinsin mi?`,
      body: `${siteName} sitesinden kalıcı olarak silinir.`,
      confirmLabel: 'Sil',
      danger: true,
    });
    if (!ok) return;
    try {
      await siteHubApi.deleteBlogPost(siteId, slug);
      notify.success('Yazı silindi.');
      if (editing?.siteId === siteId && editing.slug === slug) resetForm();
      await loadPosts(siteId);
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Silinemedi.');
    }
  };

  const runAssist = async (instruction: string) => {
    if (!hasBody || !instruction.trim()) return;
    setAiBusy(true);
    try {
      const edited = await siteHubApi.assistBlogDraft(draftOf(post), sourceLanguage, instruction);
      setUndoPost(post);
      setPost((prev) => ({
        ...prev,
        title: edited.title,
        excerpt: edited.excerpt ?? prev.excerpt,
        content: edited.content,
        slug: slugTouched ? prev.slug : slugify(edited.title),
      }));
      setPreview(null);
      notify.success('AI düzenlemesi uygulandı. Beğenmezseniz "Geri al".');
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'AI düzenlemesi yapılamadı.');
    } finally {
      setAiBusy(false);
    }
  };

  const runPreview = async () => {
    if (!hasBody) return;
    setAiBusy(true);
    try {
      setPreview(await siteHubApi.translateBlogDraft(draftOf(post), sourceLanguage, otherLanguage));
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Çeviri önizlemesi alınamadı.');
    } finally {
      setAiBusy(false);
    }
  };

  const undoAssist = () => {
    if (!undoPost) return;
    setPost(undoPost);
    setUndoPost(null);
  };

  const handleSend = async () => {
    setSending(true);
    if (editing === null) setResults([]);
    try {
      if (editing !== null) {
        // Boş alan "temizle" demek: '' gönderilir. Eskiden `|| undefined` ile "dokunma"ya
        // çevriliyor, silinen özet/kapak sitede eski hâliyle kalıyordu.
        await siteHubApi.updateBlogPost(editing.siteId, editing.slug, {
          title: post.title, excerpt: post.excerpt ?? '', content: post.content,
          coverImageUrl: post.coverImageUrl ?? '', published: post.published,
        });
        notify.success(`${editing.siteName} üzerinde güncellendi.`);
        await loadPosts(editing.siteId);
        resetForm();
        return;
      }

      const response = await siteHubApi.broadcastBlogPost(selectedIds, {
        ...post,
        excerpt: post.excerpt || null,
        coverImageUrl: post.coverImageUrl || null,
      }, sourceLanguage);
      setResults(response);

      const succeeded = response.filter((r) => r.success);
      if (succeeded.length === response.length) {
        notify.success(`${succeeded.length} siteye gönderildi.`);
        setPost(EMPTY_POST);
        setSlugTouched(false);
        setUndoPost(null);
        setPreview(null);
        writeStoredDraft(null);
      } else {
        notify.error(`${succeeded.length}/${response.length} site başarılı. Başarısızları düzeltip tekrar gönderebilirsiniz.`);
        // Başarılı siteler seçimden çıkar: "tekrar gönder" yalnızca kalanlara gider.
        const okIds = new Set(succeeded.map((r) => r.siteConnectionId));
        setSelectedIds((prev) => prev.filter((id) => !okIds.has(id)));
      }

      if (listSiteId != null && selectedIds.includes(listSiteId)) await loadPosts(listSiteId);
    } catch (e) {
      notify.error(e instanceof Error ? e.message : editing !== null ? 'Güncellenemedi.' : 'Gönderilemedi.');
    } finally {
      setSending(false);
    }
  };

  const inputClass = 'h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]';
  const labelClass = 'mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase';
  const chipClass = 'h-7 px-2.5 rounded-[3px] text-[11px] font-semibold border transition cursor-pointer disabled:opacity-40';

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs">
      <div>
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-[var(--fg-muted)]" />
          <h2 className="text-sm font-bold text-[var(--fg)]">Ortak Blog & İçerik Dağıtımı</h2>
        </div>
        <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
          Tek bir yazıyı aynı anda birden fazla sitede yayınlayın. Farklı dildeki sitelere (ör. UK) yazı otomatik çevrilerek gider.
        </p>
      </div>

      {error && <div className="p-3 rounded-[4px] bg-rose-500/10 text-rose-500">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 min-w-0 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-3.5" data-tour="sitehub-blog-editor">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-soft)] pb-2.5">
            <span className="font-bold text-xs text-[var(--fg)]">
              {editing ? `Yazıyı Düzenle: ${editing.siteName}` : 'Yeni Blog Yazısı Oluştur'}
            </span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-[10.5px] font-semibold text-[var(--fg-muted)]">
                <Languages size={12} />
                Yazı dili
                <select
                  value={sourceLanguage}
                  disabled={editing !== null}
                  onChange={(e) => { setSourceLanguage(e.target.value as SiteContentLanguage); setPreview(null); }}
                  className="h-7 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-1.5 text-[11px] text-[var(--fg)] outline-none disabled:opacity-50"
                >
                  {(Object.keys(SITE_CONTENT_LANGUAGE_LABELS) as SiteContentLanguage[]).map((lang) => (
                    <option key={lang} value={lang}>{SITE_CONTENT_LANGUAGE_LABELS[lang]}</option>
                  ))}
                </select>
              </label>
              {editing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-[10.5px] text-[var(--fg-muted)] hover:text-[var(--fg)] font-semibold cursor-pointer"
                >
                  Yeni Yazıya Dön
                </button>
              )}
            </div>
          </div>

          <div>
            <label className={labelClass}>Yazı Başlığı *</label>
            <input
              value={post.title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: 2026 Otomobil Aksesuar Trendleri ve Bakım Tavsiyeleri"
              className={`${inputClass} font-semibold`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="min-w-0">
              <label className={labelClass}>URL Slug *</label>
              <input
                value={post.slug}
                disabled={editing !== null}
                onChange={(e) => {
                  setSlugTouched(true);
                  setPost((prev) => ({ ...prev, slug: e.target.value }));
                }}
                placeholder="2026-otomobil-aksesuar-trendleri"
                className={`${inputClass} font-mono disabled:opacity-50`}
              />
            </div>

            <div className="min-w-0">
              <label className={labelClass}>Kapak Görseli URL (https)</label>
              <input
                value={post.coverImageUrl ?? ''}
                onChange={(e) => setPost((prev) => ({ ...prev, coverImageUrl: e.target.value }))}
                placeholder="https://cdn.example.com/blog/cover.jpg"
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Özet / Meta Açıklaması</label>
            <textarea
              value={post.excerpt ?? ''}
              onChange={(e) => setPost((prev) => ({ ...prev, excerpt: e.target.value }))}
              placeholder="Yazının arama motorlarında ve liste görünümünde çıkacak kısa özeti..."
              rows={2}
              className="w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] p-2 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
            />
          </div>

          <div>
            <label className={labelClass}>Yazı İçeriği (Markdown / HTML) *</label>
            <textarea
              value={post.content}
              onChange={(e) => setPost((prev) => ({ ...prev, content: e.target.value }))}
              placeholder="Blog yazısının tam metnini buraya girin..."
              rows={10}
              className="w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] p-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)] leading-relaxed"
            />
          </div>

          {/* AI ile düzenleme */}
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 p-2.5 flex flex-col gap-2" data-tour="sitehub-blog-ai">
            <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase text-[var(--fg-muted)]">
              <Sparkles size={12} /> AI ile düzenle
              {aiBusy && <span className="normal-case font-normal">— çalışıyor…</span>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {AI_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  disabled={!hasBody || aiBusy}
                  onClick={() => void runAssist(preset.instruction)}
                  className={`${chipClass} bg-[var(--bg)] text-[var(--fg)] border-[var(--border)] hover:border-[var(--fg)]`}
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                disabled={!hasBody || aiBusy}
                onClick={() => void runPreview()}
                className={`${chipClass} bg-[var(--bg)] text-[var(--fg)] border-[var(--border)] hover:border-[var(--fg)]`}
              >
                {SITE_CONTENT_LANGUAGE_LABELS[otherLanguage]} önizle
              </button>
              {undoPost && (
                <button
                  type="button"
                  onClick={undoAssist}
                  className={`${chipClass} flex items-center gap-1 bg-[var(--bg)] text-[var(--fg-muted)] border-[var(--border)]`}
                >
                  <Undo2 size={11} /> Geri al
                </button>
              )}
            </div>
            <div className="flex gap-1.5">
              <input
                value={aiInstruction}
                onChange={(e) => setAiInstruction(e.target.value)}
                maxLength={500}
                placeholder="Kendi talimatınız: ör. 'Transit Custom sahiplerine hitap et, 3 madde ekle'"
                className={inputClass}
              />
              <button
                type="button"
                disabled={!hasBody || aiBusy || !aiInstruction.trim()}
                onClick={() => void runAssist(aiInstruction)}
                className="shrink-0 h-8.5 px-3 rounded-[4px] bg-[var(--fg)] text-[var(--bg)] text-[11px] font-bold cursor-pointer disabled:opacity-40"
              >
                Uygula
              </button>
            </div>
            {preview && (
              <div className="rounded-[4px] border border-[var(--border)] bg-[var(--bg)] p-2.5 flex flex-col gap-1 max-h-60 overflow-y-auto">
                <span className="text-[10px] font-bold uppercase text-[var(--fg-muted)]">
                  {SITE_CONTENT_LANGUAGE_LABELS[otherLanguage]} önizleme — gönderimde bu dile sahip sitelere böyle gider
                </span>
                <strong className="text-xs text-[var(--fg)]">{preview.title}</strong>
                {preview.excerpt && <p className="text-[11px] text-[var(--fg-muted)]">{preview.excerpt}</p>}
                <pre className="whitespace-pre-wrap break-words font-mono text-[11px] text-[var(--fg)]">{preview.content}</pre>
              </div>
            )}
          </div>

          {!editing && (
            <div className="pt-2 border-t border-[var(--border-soft)] flex flex-col gap-2" data-tour="sitehub-blog-targets">
              <label className="block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
                Yayınlanacak Hedef Siteler{' '}
                {loadingSites ? '(yükleniyor…)' : `(${selectedIds.length}/${blogSites.length})`}
              </label>
              <div className="flex flex-wrap gap-2">
                {blogSites.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSite(s.id)}
                    className={`${chipClass} font-mono flex items-center gap-1.5 ${
                      selectedIds.includes(s.id)
                        ? 'bg-[var(--fg)] text-[var(--bg)] border-[var(--fg)]'
                        : 'bg-[var(--bg)] text-[var(--fg-muted)] border-[var(--border)]'
                    }`}
                  >
                    <span>{s.displayName}</span>
                    <span className="rounded-[2px] border border-current px-1 text-[9px] uppercase opacity-80">
                      {s.contentLanguage}
                    </span>
                  </button>
                ))}
              </div>
              {translatedTargets.length > 0 && (
                <p className="text-[11px] text-[var(--fg-muted)]">
                  <Languages size={11} className="inline mr-1" />
                  {translatedTargets.map((s) => s.displayName).join(', ')} için yazı otomatik{' '}
                  <strong>{SITE_CONTENT_LANGUAGE_LABELS[otherLanguage]}</strong> diline çevrilip kendi slug&apos;ıyla gönderilecek.
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-soft)]">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[var(--fg)]">
              <input
                type="checkbox"
                checked={post.published}
                onChange={(e) => setPost((prev) => ({ ...prev, published: e.target.checked }))}
                className="h-4 w-4 rounded-[3px]"
              />
              <span>Hemen Yayına Al (Published)</span>
            </label>

            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend || sending || aiBusy}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-4 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-40"
            >
              <Send size={13} />
              <span>{sending ? 'Yayınlanıyor...' : editing ? 'Güncelle' : 'Seçili Sitelere Yayınla'}</span>
            </button>
          </div>

          {/* Site bazında sonuç: hangi sitenin NEDEN başarısız olduğu, hangisine çevrilerek
              gittiği ve hangisinde yazının zaten var olduğu. */}
          {results.length > 0 && (
            <div className="flex flex-col gap-1 rounded-[4px] border border-[var(--border-soft)] p-2">
              {results.map((r) => (
                <div key={r.siteConnectionId} className="flex flex-wrap items-start gap-2 text-[11px]">
                  <span className={r.success ? 'text-emerald-600' : 'text-rose-500'}>{r.success ? '✓' : '✕'}</span>
                  <span className="font-semibold text-[var(--fg)]">{r.siteName}</span>
                  {r.translated && (
                    <span className="text-[var(--fg-muted)]">({r.language.toUpperCase()} çevrildi{r.post ? `: /${r.post.slug}` : ''})</span>
                  )}
                  {r.alreadyExisted && <span className="text-[var(--fg-muted)]">zaten vardı, yeniden oluşturulmadı</span>}
                  {r.error && <span className="text-[var(--fg-muted)] break-words min-w-0">{r.error}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 min-w-0 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs flex flex-col overflow-hidden" data-tour="sitehub-blog-posts">
          <div className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 p-3 flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-xs text-[var(--fg)]">Sitedeki Mevcut Yazılar</span>

            <div className="flex flex-wrap items-center gap-1">
              {blogSites.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setListSiteId(s.id)}
                  className={`h-6 px-2 rounded-[3px] text-[10.5px] font-mono font-semibold transition cursor-pointer ${
                    listSiteId === s.id
                      ? 'bg-[var(--fg)] text-[var(--bg)]'
                      : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
                  }`}
                >
                  {s.displayName}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 max-h-[500px]">
            {loadingPosts && <div className="py-8 text-center text-xs text-[var(--fg-muted)]">Yazılar yükleniyor...</div>}
            {/* Yükleme hatası "bu sitede yazı yok" gibi görünmesin. */}
            {!loadingPosts && postsError && (
              <div className="py-8 text-center text-xs text-rose-500">{postsError}</div>
            )}
            {!loadingPosts && !postsError && posts.length === 0 && (
              <div className="py-8 text-center text-xs text-[var(--fg-muted)]">Bu sitede yayınlanmış yazı bulunmuyor.</div>
            )}

            {posts.map((p) => {
              const currentSite = blogSites.find((s) => s.id === listSiteId);
              return (
                <div
                  key={p.slug}
                  className="p-2.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg)] flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-[var(--fg)] truncate">{p.title}</div>
                    <div className="text-[10.5px] text-[var(--fg-muted)] font-mono truncate mt-0.5">
                      /{p.slug} • {p.published ? 'Yayında' : 'Taslak'}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => currentSite && startEdit(currentSite.id, currentSite.displayName, p.slug)}
                      className="h-6 w-6 flex items-center justify-center rounded-[3px] border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
                      title="Düzenle"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => currentSite && handleDelete(currentSite.id, currentSite.displayName, p.slug, p.title)}
                      className="h-6 w-6 flex items-center justify-center rounded-[3px] border border-[var(--border)] text-[var(--fg-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                      title="Sil"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
