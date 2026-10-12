import type { AssignmentAgentDto, AssignmentBoardDto, AssignmentCardDto } from '../../lib/api/assignments';
import type { HandoffLevel } from '../../lib/api/handoff';

// "Atananlar" panosunun saf kuralları (FAZ 7): görünüm seçimi, kişi sütunları, kart sıralaması ve sürükle-bırak
// kararı. Sunucu çağrısı yok; bileşen yalnız kararı uygular. Duruma göre görünüm yok: durumu "Pano" sekmesi gösterir.

// "Kişiye göre" = sürükle-bırak panosu; "Kanal ekipleri" = kanal bazında ekip, nöbet ve sınır görünümü.
export type BoardView = 'agent' | 'teams';
export const DEFAULT_BOARD_VIEW: BoardView = 'agent';
const BOARD_VIEWS: readonly BoardView[] = ['agent', 'teams'];

// Kayıtlı (localStorage) değer yalnız bilinen görünümlerden biriyse kullanılır; eski "status" ya da bozuk değer
// varsayılana düşer.
export function parseBoardView(raw: string | null): BoardView {
  return BOARD_VIEWS.find((view) => view === raw) ?? DEFAULT_BOARD_VIEW;
}

export const UNASSIGNED_COLUMN = 'unassigned';
export const BOT_COLUMN = 'bot';
const AGENT_PREFIX = 'agent:';

export const agentColumnKey = (userId: number) => `${AGENT_PREFIX}${userId}`;

export interface BoardColumn {
  key: string;
  title: string;
  agent: AssignmentAgentDto | null;
  cards: AssignmentCardDto[];
}

const LEVEL_RANK: Record<HandoffLevel, number> = { P1: 0, P2: 1, P3: 2 };

// Acil önce, sonra öncelik seviyesi, sonra en uzun bekleyen.
export function sortCards(cards: readonly AssignmentCardDto[]): AssignmentCardDto[] {
  return [...cards].sort((a, b) =>
    Number(b.isUrgent) - Number(a.isUrgent)
    || (LEVEL_RANK[a.level ?? 'P3'] - LEVEL_RANK[b.level ?? 'P3'])
    || Date.parse(a.waitingSince) - Date.parse(b.waitingSince));
}

// Atanmamış | her temsilci | Bot. Bilinmeyen sorumludaki devir (ekip dışı, silinmiş) Atanmamış'ta görünür.
export function buildColumns(board: AssignmentBoardDto): BoardColumn[] {
  const handoffs = board.cards.filter((c) => c.ticketId !== null);
  const botCards = board.cards.filter((c) => c.ticketId === null);
  const bot: BoardColumn = { key: BOT_COLUMN, title: 'Bot', agent: null, cards: sortCards(botCards) };

  const agentIds = new Set(board.agents.map((a) => a.userId));
  const unassigned: BoardColumn = {
    key: UNASSIGNED_COLUMN,
    title: 'Atanmamış',
    agent: null,
    cards: sortCards(handoffs.filter((c) => c.assigneeUserId === null || !agentIds.has(c.assigneeUserId))),
  };
  const agents = board.agents.map((agent) => ({
    key: agentColumnKey(agent.userId),
    title: agent.name,
    agent,
    cards: sortCards(handoffs.filter((c) => c.assigneeUserId === agent.userId)),
  }));
  return [unassigned, ...agents, bot];
}

export type DropAction =
  | { kind: 'none' }
  | { kind: 'denied'; reason: string }
  | { kind: 'assign'; ticketId: number; userId: number }
  | { kind: 'unassign'; ticketId: number }
  | { kind: 'returnToBot'; ticketId: number }
  | { kind: 'takeFromBot'; userId: number };

// Kart bir sütuna bırakıldı: ne yapılmalı?
export function dropAction(card: AssignmentCardDto, targetKey: string): DropAction {
  const target = targetKey.startsWith(AGENT_PREFIX) ? Number(targetKey.slice(AGENT_PREFIX.length)) : null;
  const { ticketId } = card;
  if (ticketId === null) {
    if (targetKey === BOT_COLUMN) return { kind: 'none' };
    if (target === null) return { kind: 'denied', reason: 'Botun yürüttüğü konuşma bir temsilciye bırakılmalı.' };
    return { kind: 'takeFromBot', userId: target };
  }

  if (targetKey === BOT_COLUMN) return { kind: 'returnToBot', ticketId };
  if (targetKey === UNASSIGNED_COLUMN) return card.assigneeUserId === null ? { kind: 'none' } : { kind: 'unassign', ticketId };
  if (target === null || target === card.assigneeUserId) return { kind: 'none' };
  return { kind: 'assign', ticketId, userId: target };
}

// Sütun başlığındaki yük: "3 / 5" (sınır yoksa yalnız sayı) ve sınıra ulaştı mı.
export function loadLabel(agent: AssignmentAgentDto): { text: string; full: boolean } {
  const max = agent.maxOpenConversations;
  return max === null
    ? { text: String(agent.openCount), full: false }
    : { text: `${agent.openCount} / ${max}`, full: agent.openCount >= max };
}
