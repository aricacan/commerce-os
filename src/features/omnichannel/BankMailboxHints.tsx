// Posta kutusundan otomatik alma kurulum ipuçları (Plesk / genel IMAP).
export function BankMailboxHints() {
  return (
    <details className="rounded-[4px] border border-[var(--border-soft)] px-3 py-2 text-[11px] text-[var(--fg-muted)]">
      <summary className="cursor-pointer font-semibold text-[var(--fg)]">Kurulum ipuçları</summary>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-4">
        <li>Bankanın <b>internet şubesinden</b> &quot;zamanlanmış hesap ekstresi / hesap hareketleri e-postası&quot; kur ve bu posta kutusunun adresini alıcı yaz (CSV ya da Excel ekli).</li>
        <li>Kendi gelen kutunu değil, <b>yalnız bu iş için ayrı bir posta kutusu</b> aç: okunan mesajlar &quot;okundu&quot; işaretlenir.</li>
        <li>Plesk&apos;te kullanıcı adı genellikle <b>tam e-posta adresidir</b>; sunucu <b>mail.alanadi.com</b> (localhost ya da IP değil); 993 = SSL, 143 = STARTTLS.</li>
        <li>İzinli gönderen, bankanın e-postayı gönderdiği adrestir (mesajı açıp &quot;Kimden&quot; alanına bak). Listede olmayan gönderenin e-postası <b>hiç işlenmez</b>.</li>
        <li>Şablon, ekteki dosyanın sütun eşlemesidir; önce bir ekstreyi elle yükleyip şablonu kaydet.</li>
        <li>İşlem için kanalın Bot sekmesindeki &quot;Havale otomatik eşleşme&quot; açık olmalı. Hata olursa Hesap Sağlığı&apos;nda uyarı görünür.</li>
      </ul>
    </details>
  );
}
