import type { HangfireJobErrorDto } from '../../../lib/api';

// Başarısız çalışmanın hatası: mesaj her zaman görünür, yığın (stack trace) açılır bölümde.
// Yığın uzun satırlar içerir — yalnız kendi kutusunda yatay kayar, sayfayı genişletmez.
export function HangfireRunError({ error }: { error: HangfireJobErrorDto }) {
  const message = error.message?.trim() || 'Hata mesajı kaydedilmemiş.';
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="m-0 break-words text-ui-xs text-danger">
        {error.type && <span className="font-semibold">{shortTypeName(error.type)}: </span>}
        {message}
      </p>
      {error.details && (
        <details className="min-w-0 text-ui-xs text-fg-muted">
          <summary className="cursor-pointer select-none hover:text-fg">Yığını göster</summary>
          <pre className="mt-1 max-h-64 overflow-auto rounded-md border border-border-soft bg-bg-subtle p-2 font-mono text-ui-2xs leading-relaxed whitespace-pre">
            {error.details}
          </pre>
        </details>
      )}
    </div>
  );
}

// "System.Net.Http.HttpRequestException" → "HttpRequestException"
function shortTypeName(type: string): string {
  const lastDot = type.lastIndexOf('.');
  return lastDot >= 0 ? type.slice(lastDot + 1) : type;
}
