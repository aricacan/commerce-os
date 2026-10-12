import type { IntegrationConnection } from './api/integrations';

export function toIntegrationSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function integrationConnectionSlug(connection: IntegrationConnection): string {
  return toIntegrationSlug(connection.displayName);
}

export function integrationConnectionPath(connection: IntegrationConnection): string {
  const section = connection.kind === 0 ? 'erp' : 'marketplace';
  return `/${section}/${integrationConnectionSlug(connection)}`;
}
