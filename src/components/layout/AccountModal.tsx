'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { useMutation } from '@tanstack/react-query';
import { X, UserCog, Mail, Shield, KeyRound, Check, Eye, EyeOff, Upload, Trash2, Camera, Hash } from 'lucide-react';
import { userApi, authApi } from '../../lib/api';
import { useAuthStore } from '../../stores/auth';
import { pushAlert } from '../../stores/alert-stack';
import { useI18n } from '../../lib/i18n';
import { text } from '../../features/shared/design';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  avatarUrl: string | null;
  onSaveAvatar: (url: string | null) => void;
}

const PRESET_AVATARS = [
  '#0f172a', // Deep Slate / Navy
  '#1e293b', // Slate Dark
  '#334155', // Slate Muted
  '#52525b', // Zinc
  '#991b1b', // DEMO Crimson
  '#1e3a8a', // Deep Blue
  '#14532d', // Forest
  '#312e81', // Indigo
];

export function AccountModal({ isOpen, onClose, avatarUrl, onSaveAvatar }: AccountModalProps) {
  const { lang } = useI18n();
  const user = useAuthStore((s) => s.user);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [error, setError] = useState('');
  const [slackMemberId, setSlackMemberId] = useState(user?.slackMemberId ?? '');
  const setUser = useAuthStore((s) => s.setUser);

  const saveSlackId = useMutation({
    mutationFn: () => authApi.updateSlackMemberId(slackMemberId.trim() || null),
    onSuccess: () => {
      if (user) setUser({ ...user, slackMemberId: slackMemberId.trim() || null });
      pushAlert(lang === 'tr' ? 'Slack Üye ID kaydedildi' : 'Slack Member ID saved', 'success');
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : String(e);
      pushAlert((lang === 'tr' ? 'Slack Üye ID kaydedilemedi: ' : 'Failed to save Slack Member ID: ') + msg, 'error');
    },
  });

  const changePw = useMutation({
    // Hata satır içinde gösteriliyor — global bildirim çift olmasın.
    meta: { silentError: true } as const,
    mutationFn: () => userApi.changeMyPassword(current, next),
    onSuccess: () => {
      setCurrent(''); setNext(''); setConfirm(''); setError('');
      pushAlert(lang === 'tr' ? 'Şifreniz başarıyla güncellendi' : 'Password updated successfully', 'success');
      onClose();
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        msg.includes('401') || msg.toLowerCase().includes('current')
          ? (lang === 'tr' ? 'Mevcut şifreniz hatalı.' : 'Current password is incorrect.')
          : (lang === 'tr' ? 'Şifre değiştirilemedi: ' : 'Password change failed: ') + msg
      );
    },
  });

  if (!isOpen) return null;

  function submit() {
    setError('');
    if (next.length < 8) {
      setError(lang === 'tr' ? 'Yeni şifre en az 8 karakter olmalı.' : 'New password must be at least 8 characters.');
      return;
    }
    if (next !== confirm) {
      setError(lang === 'tr' ? 'Yeni şifreler eşleşmiyor.' : 'New passwords do not match.');
      return;
    }
    changePw.mutate();
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      pushAlert(lang === 'tr' ? 'Lütfen geçerli bir resim dosyası seçin.' : 'Please select a valid image file.', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      pushAlert(lang === 'tr' ? 'Resim boyutu 2MB\'tan küçük olmalıdır.' : 'Image size must be smaller than 2MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onSaveAvatar(reader.result);
        pushAlert(lang === 'tr' ? 'Profil resmi güncellendi' : 'Profile photo updated', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || (user?.email ?? '—');
  const initials = (fullName || user?.email || '?').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  const isImageAvatar = avatarUrl && (avatarUrl.startsWith('data:image') || avatarUrl.startsWith('http') || avatarUrl.startsWith('/'));

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0, 0, 0, 0.45)',
          zIndex: 99999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'modalFadeIn 0.15s ease-out',
        }}
      >
        {/* Modal Card */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '92%', maxWidth: '680px',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            maxHeight: '90vh',
            animation: 'modalSlideUp 0.18s ease-out',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-soft)', background: 'var(--card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserCog size={17} style={{ color: 'var(--fg)' }} />
              <h2 style={{ margin: 0, fontSize: text.md, fontWeight: 700, color: 'var(--fg)' }}>
                {lang === 'tr' ? 'Profil & Hesap Ayarları' : 'Profile & Account Settings'}
              </h2>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--fg-muted)', display: 'flex', padding: 5,
                borderRadius: '6px', transition: 'all 0.12s'
              }}
              className="hover-card"
            >
              <X size={17} />
            </button>
          </div>

          {/* Body Container */}
          <div style={{ display: 'flex', flexWrap: 'wrap', overflowY: 'auto', flex: 1 }}>
            {/* Left side: Avatar and Info */}
            <div style={{
              flex: '1 1 270px', padding: 20, borderRight: '1px solid var(--border-soft)',
              display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center',
              background: 'var(--bg-subtle)'
            }}>
              {/* Profile Photo Display */}
              <div style={{ position: 'relative' }}>
                {isImageAvatar ? (
                  <Image
                    unoptimized
                    src={avatarUrl}
                    alt={fullName}
                    width={88}
                    height={88}
                    style={{
                      width: 88, height: 88, borderRadius: '10px',
                      objectFit: 'cover', border: '1px solid var(--border-soft)',
                      boxShadow: 'var(--shadow-xs)'
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 88, height: 88, borderRadius: '10px',
                      background: avatarUrl || 'var(--card)',
                      border: '1px solid var(--border-soft)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: text['2xl'], fontWeight: 800,
                      color: avatarUrl ? '#fff' : 'var(--fg)',
                      boxShadow: 'var(--shadow-xs)'
                    }}
                  >
                    {initials}
                  </div>
                )}

                {/* Upload Hover Button overlay */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    position: 'absolute', bottom: -4, right: -4,
                    width: 28, height: 28, borderRadius: '6px',
                    background: 'var(--card)', color: 'var(--fg)',
                    border: '1px solid var(--border-soft)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', boxShadow: 'var(--shadow-xs)'
                  }}
                  title={lang === 'tr' ? 'Fotoğraf Yükle' : 'Upload Photo'}
                >
                  <Camera size={13} />
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              {/* Photo Actions */}
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    height: 28, padding: '0 10px', borderRadius: 6,
                    border: '1px solid var(--border-soft)', background: 'var(--card)',
                    fontSize: text.xs, fontWeight: 600, color: 'var(--fg)',
                    cursor: 'pointer'
                  }}
                  className="hover-card"
                >
                  <Upload size={12} />
                  {lang === 'tr' ? 'Seç' : 'Select'}
                </button>

                {avatarUrl && (
                  <button
                    onClick={() => {
                      onSaveAvatar(null);
                      pushAlert(lang === 'tr' ? 'Profil resmi kaldırıldı' : 'Profile photo removed', 'info');
                    }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      height: 28, padding: '0 10px', borderRadius: 6,
                      border: '1px solid var(--border-soft)', background: 'var(--card)',
                      fontSize: text.xs, fontWeight: 600, color: 'var(--fg-muted)',
                      cursor: 'pointer'
                    }}
                    className="hover-card"
                  >
                    <Trash2 size={12} />
                    {lang === 'tr' ? 'Kaldır' : 'Remove'}
                  </button>
                )}
              </div>

              {/* Curated Preset Colors */}
              <div style={{ width: '100%', textAlign: 'center', marginTop: 2 }}>
                <p style={{ fontSize: text.xs, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>
                  {lang === 'tr' ? 'Renk Tonu' : 'Color Tone'}
                </p>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {PRESET_AVATARS.map((bg) => (
                    <button
                      key={bg}
                      onClick={() => onSaveAvatar(bg)}
                      style={{
                        width: 22, height: 22, borderRadius: 5,
                        background: bg,
                        border: avatarUrl === bg ? '2px solid var(--fg)' : '1px solid var(--border-soft)',
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'transform 0.1s',
                      }}
                      title={bg}
                    />
                  ))}
                </div>
              </div>

              {/* User Metadata */}
              <div style={{ width: '100%', marginTop: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <label style={{ fontSize: text['2xs'], fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase' }}>
                    {lang === 'tr' ? 'İsim Soyisim' : 'Full Name'}
                  </label>
                  <span style={{ fontSize: text.sm, fontWeight: 600, color: 'var(--fg)' }}>{fullName}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <label style={{ fontSize: text['2xs'], fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase' }}>
                    {lang === 'tr' ? 'E-posta' : 'Email Address'}
                  </label>
                  <span style={{ fontSize: text.sm, color: 'var(--fg)', wordBreak: 'break-all', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Mail size={12} style={{ opacity: 0.6 }} /> {user?.email}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <label style={{ fontSize: text['2xs'], fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase' }}>
                    {lang === 'tr' ? 'Rol Yetkisi' : 'Assigned Roles'}
                  </label>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {(user?.roles ?? []).map((r) => (
                      <span
                        key={r}
                        style={{
                          fontSize: text.xs, fontWeight: 600, padding: '2px 7px',
                          borderRadius: 4, background: 'var(--card)', border: '1px solid var(--border-soft)',
                          color: 'var(--fg)',
                          display: 'flex', alignItems: 'center', gap: 4
                        }}
                      >
                        <Shield size={10} style={{ opacity: 0.6 }} /> {r}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <label style={{ fontSize: text['2xs'], fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase' }}>
                    {lang === 'tr' ? 'Slack Üye ID\'niz (opsiyonel)' : 'Your Slack Member ID (optional)'}
                  </label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <Hash size={11} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                      <input
                        type="text"
                        value={slackMemberId}
                        onChange={(e) => setSlackMemberId(e.target.value)}
                        placeholder="U0BL4QJGQ0Y"
                        style={{
                          width: '100%', padding: '6px 8px 6px 24px', borderRadius: 6,
                          border: '1px solid var(--border-soft)', background: 'var(--card)', color: 'var(--fg)',
                          fontSize: text.sm, outline: 'none',
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => saveSlackId.mutate()}
                      disabled={saveSlackId.isPending || slackMemberId.trim() === (user?.slackMemberId ?? '')}
                      style={{
                        height: 28, padding: '0 10px', borderRadius: 6, border: 'none',
                        background: slackMemberId.trim() === (user?.slackMemberId ?? '') ? 'var(--bg-subtle)' : 'var(--fg)',
                        color: slackMemberId.trim() === (user?.slackMemberId ?? '') ? 'var(--fg-muted)' : 'var(--bg)',
                        fontSize: text.xs, fontWeight: 600,
                        cursor: saveSlackId.isPending || slackMemberId.trim() === (user?.slackMemberId ?? '') ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {lang === 'tr' ? 'Kaydet' : 'Save'}
                    </button>
                  </div>
                  <p style={{ fontSize: text['2xs'], color: 'var(--fg-muted)', margin: 0, lineHeight: 1.4 }}>
                    {lang === 'tr'
                      ? 'Slack profilinize tıklayıp "···" menüsünden "Üye ID\'sini Kopyala"yı seçin.'
                      : 'Click your Slack profile, then "···" menu → "Copy Member ID".'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right side: Password Edit Form */}
            <div style={{ flex: '1 1 340px', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                <KeyRound size={15} style={{ color: 'var(--fg)' }} />
                <h3 style={{ margin: 0, fontSize: text.md, fontWeight: 700, color: 'var(--fg)' }}>
                  {lang === 'tr' ? 'Şifre Güncelleme' : 'Password Update'}
                </h3>
              </div>

              <PwField label={lang === 'tr' ? 'Mevcut Şifre' : 'Current Password'} value={current} onChange={setCurrent} show={showCurrent} onToggle={() => setShowCurrent((v) => !v)} />
              <PwField label={lang === 'tr' ? 'Yeni Şifre (En az 8 karakter)' : 'New Password (Min 8 chars)'} value={next} onChange={setNext} show={showNext} onToggle={() => setShowNext((v) => !v)} />
              <PwField label={lang === 'tr' ? 'Yeni Şifre (Tekrar)' : 'Confirm New Password'} value={confirm} onChange={setConfirm} show={showNext} onToggle={() => setShowNext((v) => !v)} />

              {error && (
                <div style={{ fontSize: text.sm, color: 'var(--danger)', fontWeight: 600, background: 'rgba(239, 68, 68, 0.05)', padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    height: 34, padding: '0 14px', borderRadius: 6,
                    border: '1px solid var(--border-soft)', background: 'transparent',
                    color: 'var(--fg-muted)', fontSize: text.sm, fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  className="hover-card"
                >
                  {lang === 'tr' ? 'Vazgeç' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={changePw.isPending || !current || !next || !confirm}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    height: 34, padding: '0 16px', borderRadius: 6, border: 'none',
                    background: (!current || !next || !confirm) ? 'var(--bg-subtle)' : 'var(--fg)',
                    color: (!current || !next || !confirm) ? 'var(--fg-muted)' : 'var(--bg)',
                    fontSize: text.sm, fontWeight: 600,
                    cursor: changePw.isPending || !current || !next || !confirm ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Check size={13} />
                  {changePw.isPending ? (lang === 'tr' ? 'Kaydediliyor…' : 'Saving…') : (lang === 'tr' ? 'Kaydet' : 'Save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideUp {
          from { transform: translateY(16px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}

function PwField({ label, value, onChange, show, onToggle }: { label: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: text.xs, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%', padding: '8px 36px 8px 10px', borderRadius: 6,
            border: '1px solid var(--border-soft)', background: 'var(--bg-subtle)', color: 'var(--fg)',
            fontSize: text.sm, outline: 'none', transition: 'border-color 0.15s'
          }}
        />
        <button
          type="button"
          onClick={onToggle}
          style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', display: 'flex' }}
        >
          {show ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      </div>
    </div>
  );
}
