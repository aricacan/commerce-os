// Devir e-postası için Plesk / genel SMTP kurulum ipuçları.
export function HandoffSmtpHints() {
  return (
    <details className="rounded-[4px] border border-[var(--border-soft)] px-3 py-2 text-[11px] text-[var(--fg-muted)]">
      <summary className="cursor-pointer font-semibold text-[var(--fg)]">Kurulum ipuçları (Plesk)</summary>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-4">
        <li>Sunucu: <b>mail.alanadi.com</b>. <b>localhost</b> ya da IP adresi kullanılamaz (iç ağ adresleri güvenlik için engellidir).</li>
        <li>Kullanıcı adı genellikle <b>tam e-posta adresidir</b>; şifre o posta kutusunun şifresidir.</li>
        <li>Gönderen adresi, giriş yapılan <b>posta kutusunun kendisi</b> olmalı; başka adres çoğu sunucuda reddedilir.</li>
        <li>Port 587 = <b>STARTTLS</b>, port 465 = <b>SSL</b>. Port ile güvenlik türü uyuşmazsa TLS hatası alırsın.</li>
        <li>Sertifika hatası alırsan önce Plesk&apos;te alan adı için geçerli (ör. Let&apos;s Encrypt) sertifika ata. Mümkün değilse test sonucunda görünen parmak izine güvenebilirsin.</li>
        <li>E-postaların spam&apos;e düşmemesi için alan adında <b>SPF</b> ve <b>DKIM</b> kayıtlarının açık olması gerekir (Plesk &gt; Mail &gt; Mail Ayarları).</li>
      </ul>
    </details>
  );
}
