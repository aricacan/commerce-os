import '@tanstack/react-query';

// Mutation `meta` alanını tip güvenli hale getirir — bkz. components/providers.tsx.
// Bu olmadan meta `Record<string, unknown>` olur ve yazım hatası (successMesage gibi)
// sessizce derlenip çalışma zamanında hiçbir şey yapmaz.
declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      /** Başarıda gösterilecek bildirim. Verilmezse başarı sessiz geçer. */
      successMessage?: string;
      /**
       * Hatayı global katman bildirmesin — sayfa hatayı KENDİSİ görünür biçimde
       * gösteriyorsa (satır içi form hatası vb.) çift bildirimi önler.
       */
      silentError?: true;
    };
  }
}
