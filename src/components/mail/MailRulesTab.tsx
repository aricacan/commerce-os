'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Play, Plus, RefreshCw, Settings, Trash2 } from 'lucide-react';
import {
  MAIL_INTERVAL_DAILY,
  MAIL_INTERVAL_HOURLY,
  MAIL_INTERVAL_MONTHLY,
  MAIL_INTERVAL_WEEKLY,
  MAIL_REPORT_CUSTOM_TEMPLATE,
  userMailApi,
  type SaveUserMailAutomationRuleDto,
  type UserMailAutomationRuleDto,
} from '../../lib/api/user-mail';
import { orderMailTemplateApi } from '../../lib/api/order-mail-templates';
import { FormSelect } from '../ui/FormSelect';
import { pushAlert } from '../../stores/alert-stack';
import { formatDateTime, intervalLabel, mailUi, reportTypeOptions, t, type Lang } from './mail-ui';

interface MailRulesTabProps {
  lang: Lang;
  rules: UserMailAutomationRuleDto[];
}

const DEFAULT_TIME = '09:00';
const DEFAULT_BATCH = 50;

export function MailRulesTab({ lang, rules }: MailRulesTabProps) {
  const qc = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<SaveUserMailAutomationRuleDto>(emptyRule());

  const { data: templates = [] } = useQuery({
    queryKey: ['order-mail-templates'],
    queryFn: orderMailTemplateApi.list,
    staleTime: 60_000,
  });

  // Zamanlayıcı canlı mı? Kural doğru görünüp mail gitmediğinde kullanıcı burayı okur.
  const { data: scheduler } = useQuery({
    queryKey: ['user-mail-scheduler-status'],
    queryFn: userMailApi.schedulerStatus,
    refetchInterval: 60_000,
  });

  const invalidateRules = () => qc.invalidateQueries({ queryKey: ['user-mail-rules'] });

  const saveRule = useMutation({
    mutationFn: (dto: SaveUserMailAutomationRuleDto) => userMailApi.saveRule(dto),
    onSuccess: () => {
      invalidateRules();
      pushAlert(t(lang, 'Kural kaydedildi', 'Rule saved'), 'success');
      setIsEditing(false);
    },
    onError: (err: unknown) =>
      pushAlert(t(lang, 'Kural kaydedilemedi: ', 'Failed to save rule: ') + errorText(err), 'error'),
  });

  const toggleRule = useMutation({
    mutationFn: ({ id, isEnabled }: { id: number; isEnabled: boolean }) => userMailApi.toggleRule(id, isEnabled),
    onSuccess: invalidateRules,
  });

  const runRule = useMutation({
    mutationFn: (id: number) => userMailApi.runRuleNow(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['user-mail-logs'] });
      qc.invalidateQueries({ queryKey: ['user-mail-account'] });
      invalidateRules();
      pushAlert(res.message, res.success ? 'success' : 'error');
    },
    onError: (err: unknown) =>
      pushAlert(t(lang, 'Kural tetiklenemedi: ', 'Failed to trigger rule: ') + errorText(err), 'error'),
  });

  const deleteRule = useMutation({
    mutationFn: (id: number) => userMailApi.deleteRule(id),
    onSuccess: () => {
      invalidateRules();
      pushAlert(t(lang, 'Kural silindi', 'Rule deleted'), 'success');
    },
  });

  const openNew = () => {
    setForm(emptyRule());
    setIsEditing(true);
  };

  const openEdit = (rule: UserMailAutomationRuleDto) => {
    setForm({
      id: rule.id,
      name: rule.name,
      reportType: rule.reportType,
      customTemplateId: rule.customTemplateId,
      recipients: rule.recipients,
      scheduleInterval: rule.scheduleInterval,
      scheduleTime: rule.scheduleTime || DEFAULT_TIME,
      batchSizePerRun: rule.batchSizePerRun,
      isEnabled: rule.isEnabled,
    });
    setIsEditing(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      pushAlert(t(lang, 'Kural adı zorunludur', 'Rule name is required'), 'error');
      return;
    }
    if (!form.recipients.trim()) {
      pushAlert(t(lang, 'En az bir alıcı e-posta adresi yazmalısınız', 'At least one recipient is required'), 'error');
      return;
    }
    if (form.reportType === MAIL_REPORT_CUSTOM_TEMPLATE && !form.customTemplateId) {
      pushAlert(t(lang, 'Özel şablon seçmelisiniz', 'Pick a custom template'), 'error');
      return;
    }
    saveRule.mutate({ ...form, name: form.name.trim(), recipients: form.recipients.trim() });
  };

  if (isEditing) {
    return (
      <form onSubmit={handleSubmit} className={`${mailUi.card} p-4 space-y-4`}>
        <div className={`flex items-center justify-between border-b pb-2 ${mailUi.divider}`}>
          <h4 className="text-xs font-bold text-[var(--fg)]">
            {form.id ? t(lang, 'Kuralı Düzenle', 'Edit Rule') : t(lang, 'Yeni Kural Oluştur', 'New Rule')}
          </h4>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="text-xs text-[var(--fg-muted)] hover:text-[var(--fg)]"
          >
            {t(lang, 'Vazgeç', 'Cancel')}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={mailUi.label}>
              {t(lang, 'Kural Adı', 'Rule Name')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t(lang, 'Örn: Sabah Günlük Özet', 'e.g. Morning Daily Summary')}
              className={mailUi.input}
            />
          </div>
          <div>
            <label className={mailUi.label}>{t(lang, 'Rapor Şablonu', 'Report Template')}</label>
            <FormSelect
              value={form.reportType}
              options={reportTypeOptions(lang)}
              onChange={(next) => setForm({ ...form, reportType: next, customTemplateId: null })}
              triggerClassName="h-[30px] rounded-[2px]"
            />
          </div>
        </div>

        {form.reportType === MAIL_REPORT_CUSTOM_TEMPLATE && (
          <div>
            <label className={mailUi.label}>
              {t(lang, 'Özel Şablon', 'Custom Template')} <span className="text-rose-500">*</span>
            </label>
            <FormSelect<number>
              value={form.customTemplateId ?? null}
              options={templates.map((tpl) => ({ value: tpl.id, label: tpl.name }))}
              onChange={(next) => setForm({ ...form, customTemplateId: next })}
              placeholder={t(lang, 'Şablon seçin', 'Select a template')}
              triggerClassName="h-[30px] rounded-[2px]"
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={mailUi.label}>{t(lang, 'Tekrarlama Aralığı', 'Interval')}</label>
            <FormSelect
              value={form.scheduleInterval}
              options={[
                { value: MAIL_INTERVAL_DAILY, label: t(lang, 'Her Gün', 'Daily') },
                { value: MAIL_INTERVAL_WEEKLY, label: t(lang, 'Her Hafta', 'Weekly'), hint: t(lang, 'Pazartesi', 'Monday') },
                { value: MAIL_INTERVAL_HOURLY, label: t(lang, 'Saatlik', 'Hourly') },
                { value: MAIL_INTERVAL_MONTHLY, label: t(lang, 'Her Ay', 'Monthly'), hint: t(lang, "ayın 1'i", '1st') },
              ]}
              onChange={(next) => setForm({ ...form, scheduleInterval: next })}
              triggerClassName="h-[30px] rounded-[2px]"
            />
          </div>
          <div>
            <label className={mailUi.label}>{t(lang, 'Gönderim Saati (TSİ)', 'Schedule Time (Turkey)')}</label>
            <input
              type="time"
              value={form.scheduleTime}
              onChange={(e) => setForm({ ...form, scheduleTime: e.target.value })}
              disabled={form.scheduleInterval === MAIL_INTERVAL_HOURLY}
              className={`${mailUi.inputMono} disabled:opacity-50`}
            />
            {form.scheduleInterval === MAIL_INTERVAL_HOURLY && (
              <p className={mailUi.hint}>{t(lang, 'Saatlik kuralda saat kullanılmaz.', 'Not used for hourly.')}</p>
            )}
          </div>
          <div>
            <label className={mailUi.label}>{t(lang, 'Tur Başına Alıcı Sayısı', 'Recipients per Run')}</label>
            <input
              type="number"
              min={1}
              value={form.batchSizePerRun}
              onChange={(e) => setForm({ ...form, batchSizePerRun: Number(e.target.value) })}
              className={mailUi.inputMono}
            />
            <p className={mailUi.hint}>
              {t(lang, 'Bu sayıdan fazlası o turda gönderilmez.', 'Extra recipients are skipped in a run.')}
            </p>
          </div>
        </div>

        <div>
          <label className={mailUi.label}>
            {t(lang, 'Alıcı E-Posta Adresleri', 'Recipient Emails')} <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={2}
            required
            value={form.recipients}
            onChange={(e) => setForm({ ...form, recipients: e.target.value })}
            placeholder="patron@example.com, muhasebe@example.com"
            className="w-full rounded-[2px] border border-[#cbd5e1] dark:border-[#475569] bg-[var(--card)] px-3 py-2 text-xs text-[var(--fg)] focus:border-sky-500 focus:outline-none"
          />
          <p className={mailUi.hint}>
            {t(lang, 'Virgül (,) veya noktalı virgül (;) ile ayırın.', 'Separate with commas or semicolons.')}
          </p>
        </div>

        <div className={`flex items-center justify-between pt-2 border-t ${mailUi.divider}`}>
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[var(--fg)]">
            <input
              type="checkbox"
              checked={form.isEnabled}
              onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })}
              className="rounded-[2px]"
            />
            <span className="font-semibold">{t(lang, 'Kuralı Aktif Et', 'Enable Rule')}</span>
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-[2px] border border-[#cbd5e1] dark:border-[#475569] px-3 py-1.5 text-xs font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)]"
            >
              {t(lang, 'İptal', 'Cancel')}
            </button>
            <button type="submit" disabled={saveRule.isPending} className={mailUi.buttonPrimary}>
              {saveRule.isPending ? (
                <span className="flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" /> {t(lang, 'Kaydediliyor...', 'Saving...')}
                </span>
              ) : (
                t(lang, 'Kuralı Kaydet', 'Save Rule')
              )}
            </button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--fg)]">
            {t(lang, 'Zamanlanmış E-Posta Kuralları', 'Scheduled Mail Rules')}
          </h3>
          <p className="text-[11px] text-[var(--fg-muted)]">
            {t(
              lang,
              'Belirlenen saatlerde rapor oluşturulup alıcılara otomatik gönderilir.',
              'Reports are generated and dispatched on your schedule.'
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="flex items-center gap-1 rounded-[2px] bg-sky-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-500 transition-colors shadow-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t(lang, 'Yeni Kural Ekle', 'Add Rule')}</span>
        </button>
      </div>

      {scheduler ? (
        <div
          className={`flex items-center gap-2 rounded-[2px] border px-3 py-2 text-[11px] ${
            scheduler.isStale
              ? 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400'
              : `${mailUi.divider} text-[var(--fg-muted)]`
          }`}
        >
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>
            {scheduler.lastTickUtc
              ? t(lang, 'Zamanlayıcı son çalışma: ', 'Scheduler last run: ') +
                formatDateTime(scheduler.lastTickUtc)
              : t(lang, 'Zamanlayıcı henüz hiç çalışmadı.', 'The scheduler has never run.')}
            {scheduler.isStale
              ? t(
                  lang,
                  ' — arka plan işçisi çalışmıyor, kurallar zamanında gönderilmez.',
                  ' — the background worker is not running; rules will not be sent on time.'
                )
              : ''}
          </span>
        </div>
      ) : null}

      {rules.length === 0 ? (
        <div
          className={`flex flex-col items-center justify-center p-8 rounded-[2px] border border-dashed text-center ${mailUi.divider}`}
        >
          <Clock className="h-8 w-8 text-[var(--fg-muted)]/50 mb-2" />
          <p className="text-xs font-semibold text-[var(--fg)]">
            {t(lang, 'Henüz otomasyon kuralı eklemediniz', 'No automation rules yet')}
          </p>
          <p className="text-[11px] text-[var(--fg-muted)] max-w-sm mt-0.5">
            {t(
              lang,
              'Örn. her sabah 09:00’da günlük ciro ve net kâr özeti göndermek için bir kural oluşturun.',
              'e.g. dispatch a daily revenue and profit summary every morning at 09:00.'
            )}
          </p>
          <button type="button" onClick={openNew} className="mt-3 text-xs font-bold text-sky-600 hover:underline">
            {t(lang, '+ İlk Kuralı Oluştur', '+ Create First Rule')}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 hover:border-sky-500/50 transition-colors ${mailUi.card}`}
            >
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-[var(--fg)] truncate">{rule.name}</span>
                  <span className="rounded-[2px] bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 px-1.5 py-0.5 text-[10px] font-semibold">
                    {rule.customTemplateName ?? rule.reportTypeLabel}
                  </span>
                  <span className="rounded-[2px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 text-[10px] font-mono">
                    {intervalLabel(lang, rule.scheduleInterval)}
                    {rule.scheduleInterval !== MAIL_INTERVAL_HOURLY ? ` @ ${rule.scheduleTime}` : ''}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--fg-muted)] truncate max-w-md">
                  <span className="font-semibold text-[var(--fg)]/80">{t(lang, 'Alıcılar: ', 'To: ')}</span>
                  {rule.recipients}
                </div>
                <div className="flex flex-wrap gap-3 text-[10px] text-[var(--fg-muted)]">
                  <span>
                    {t(lang, 'Son: ', 'Last: ')}
                    {formatDateTime(rule.lastRunAtUtc)}
                  </span>
                  <span>
                    {t(lang, 'Sıradaki: ', 'Next: ')}
                    {rule.isEnabled ? formatDateTime(rule.nextRunAtUtc) : t(lang, 'kapalı', 'disabled')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rule.isEnabled}
                    onChange={(e) => toggleRule.mutate({ id: rule.id, isEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4.5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600" />
                </label>

                <button
                  type="button"
                  title={t(lang, 'Hemen Gönder', 'Run Now')}
                  disabled={runRule.isPending}
                  onClick={() => runRule.mutate(rule.id)}
                  className="p-1.5 rounded-[2px] border border-[#cbd5e1] dark:border-[#475569] text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors disabled:opacity-50"
                >
                  <Play className="h-3.5 w-3.5 fill-sky-600" />
                </button>

                <button
                  type="button"
                  title={t(lang, 'Düzenle', 'Edit')}
                  onClick={() => openEdit(rule)}
                  className="p-1.5 rounded-[2px] border border-[#cbd5e1] dark:border-[#475569] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--card-hover)] transition-colors"
                >
                  <Settings className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  title={t(lang, 'Sil', 'Delete')}
                  onClick={() => {
                    if (confirm(t(lang, 'Bu kuralı silmek istediğinize emin misiniz?', 'Delete this rule?'))) {
                      deleteRule.mutate(rule.id);
                    }
                  }}
                  className="p-1.5 rounded-[2px] border border-[#cbd5e1] dark:border-[#475569] text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function emptyRule(): SaveUserMailAutomationRuleDto {
  return {
    id: undefined,
    name: '',
    reportType: 0,
    customTemplateId: null,
    recipients: '',
    scheduleInterval: MAIL_INTERVAL_DAILY,
    scheduleTime: DEFAULT_TIME,
    batchSizePerRun: DEFAULT_BATCH,
    isEnabled: true,
  };
}

function errorText(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}
