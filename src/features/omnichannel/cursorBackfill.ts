// Sayfa sayfa çalışan bakım işlerinin ortak döngüsü (isim doldurma, Customer 360 doldurma): sunucu bir sayfa işler,
// dönen imleç bir sonraki çağrıya taşınır, remaining 0 olunca biter. React'tan bağımsız ki test edilebilsin.

// done: remaining 0'a indi. stopped: kullanıcı durdurdu. stalled: sunucu ilerlemedi (sonsuz döngü koruması).
export type BackfillOutcome = 'done' | 'stopped' | 'stalled';

// Döngünün bir sayfadan okuduğu üç değer; sayfanın kendi alan adları stepOf ile buraya çevrilir.
export interface CursorStep {
  processed: number;
  nextCursor: number;
  remaining: number;
}

export interface CursorBackfillDeps<TPage> {
  fetchPage: (cursor: number, pageSize: number) => Promise<TPage>;
  stepOf: (page: TPage) => CursorStep;
  pageSize: number;
  shouldStop: () => boolean;
  onPage: (page: TPage) => void;
}

// Hata fırlarsa döngü durur ve hata çağırana iletilir; o ana kadarki sayfalar onPage ile zaten bildirilmiştir.
export async function runCursorBackfill<TPage>(deps: CursorBackfillDeps<TPage>): Promise<BackfillOutcome> {
  let cursor = 0;
  while (!deps.shouldStop()) {
    const page = await deps.fetchPage(cursor, deps.pageSize);
    deps.onPage(page);

    const step = deps.stepOf(page);
    if (step.remaining <= 0) return 'done';
    if (step.processed === 0 || step.nextCursor <= cursor) return 'stalled';
    cursor = step.nextCursor;
  }
  return 'stopped';
}
