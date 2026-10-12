'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { credentialsApi, type UpsertCredentialBody } from '../../lib/api';

const CREDENTIALS_KEY = ['credentials'] as const;
const LIST_STALE_MS = 15_000;

export function useCredentials() {
  return useQuery({
    queryKey: CREDENTIALS_KEY,
    queryFn: credentialsApi.list,
    staleTime: LIST_STALE_MS,
  });
}

// Şifreyi tek seferlik açar — cache'lenmez (queryKey yok), her tıklamada backend'e gidip
// denetim logu düşer. Bkz. CredentialsController.Reveal.
export function useRevealCredential() {
  return useMutation({
    mutationFn: (id: number) => credentialsApi.revealPassword(id),
  });
}

export function useCreateCredential() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Kayıt eklendi' } as const,
    mutationFn: (body: UpsertCredentialBody) => credentialsApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: CREDENTIALS_KEY }),
  });
}

export function useUpdateCredential() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Kayıt güncellendi' } as const,
    mutationFn: ({ id, body }: { id: number; body: UpsertCredentialBody }) => credentialsApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: CREDENTIALS_KEY }),
  });
}

export function useDeleteCredential() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Kayıt silindi' } as const,
    mutationFn: (id: number) => credentialsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: CREDENTIALS_KEY }),
  });
}

export function useReorderCredentials() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: number[]) => credentialsApi.reorder(orderedIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: CREDENTIALS_KEY }),
  });
}

export function useBulkCreateCredentials() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Kayıtlar eklendi' } as const,
    mutationFn: (body: UpsertCredentialBody[]) => credentialsApi.bulkCreate(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: CREDENTIALS_KEY }),
  });
}
