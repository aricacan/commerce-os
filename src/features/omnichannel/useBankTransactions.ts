'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  bankApi,
  type BankImportTemplateDto,
  type BankTransactionPageDto,
  type BankTransactionStatus,
} from '../../lib/api/omnichannel-bank';
import { describeError } from '../../lib/errors';
import { BANK_PAGE_SIZE } from './bankMatchRules';

// Bir durumun (eşleşen / öneri / eşleşmeyen) sayfalı listesi. `version` değişince yeniden okunur:
// üst sekme bir işlemden sonra üç listeyi birden tazeler.
export function useBankTransactionPage(status: BankTransactionStatus, days: number, version: number) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<BankTransactionPageDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setPage(1); }, [days]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    bankApi.list({ status, days, page, pageSize: BANK_PAGE_SIZE })
      .then((result) => { if (!cancelled) setData(result); })
      .catch((e: unknown) => { if (!cancelled) setError(describeError(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [status, days, page, version]);

  return { data, loading, error, page, setPage };
}

// Banka başına kayıtlı sütun eşlemeleri (yalnız yönetici okuyabilir).
export function useBankTemplates() {
  const [templates, setTemplates] = useState<BankImportTemplateDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setTemplates(await bankApi.templates());
      setError(null);
    } catch (e) {
      setError(describeError(e));
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  return { templates, error, reload };
}
