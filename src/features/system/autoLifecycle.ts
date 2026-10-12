export function autoLifecycleLabel(enabled: boolean): string {
  return enabled
    ? 'Açık: kargo takip numarası gelince sipariş "Kargolandı", teslim edilince "Tamamlandı" olur.'
    : 'Kapalı: sipariş durumları kendiliğinden değişmez.';
}

export function autoLifecycleButtonLabel(enabled: boolean): string {
  return enabled ? 'Kapat' : 'Aç';
}
