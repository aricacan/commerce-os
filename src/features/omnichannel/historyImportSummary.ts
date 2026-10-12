import type { HistoryImportProgressDto, HistoryImportResultDto } from '../../lib/api/omnichannel';

// "0 mesaj eklendi" tek başına yanıltıcıydı: Meta hiç konuşma vermedi mi, yoksa hepsi zaten
// kayıtlı mıydı? Özet bulunan / yeni / zaten var / içeriksiz ayrımını açıkça yazar.
// Yeni sayım alanları eski backend'de yok — yoksa o parça yazılmaz.
export function historyImportSummary(result: HistoryImportResultDto): string {
  const parts = [`${result.conversationsScanned} konuşma bulundu`];
  if (result.messagesFound !== undefined) parts.push(`${result.messagesFound} mesaj`);
  parts.push(`${result.messagesImported} yeni mesaj eklendi`);
  if (result.messagesSkippedDuplicate > 0) parts.push(`${result.messagesSkippedDuplicate} zaten vardı`);
  if ((result.messagesWithoutContent ?? 0) > 0) parts.push(`${result.messagesWithoutContent} içeriksiz (Meta vermedi)`);
  if ((result.conversationsFailed ?? 0) > 0) parts.push(`${result.conversationsFailed} konuşma alınamadı`);
  return parts.join(' · ');
}

export function historyImportProgressText(progress: HistoryImportProgressDto | null | undefined): string | null {
  if (!progress) return null;
  return `${progress.conversationsScanned} konuşma tarandı · ${progress.messagesImported} yeni mesaj`;
}
