'use client';

import { useEffect, useState } from 'react';
import { assignmentsApi, type AssignmentAgentDto } from '../../lib/api/assignments';

// Toplu/tekil atama seçicisi için temsilciler (Atananlar panosunun sütunları). Eski backend'de uç yoksa boş liste:
// atama seçicisi gizlenir, diğer işlemler çalışır.
export function useAssignableAgents(): AssignmentAgentDto[] {
  const [agents, setAgents] = useState<AssignmentAgentDto[]>([]);
  useEffect(() => {
    let cancelled = false;
    assignmentsApi.board({})
      .then((board) => { if (!cancelled) setAgents(board.agents); })
      .catch(() => { if (!cancelled) setAgents([]); });
    return () => { cancelled = true; };
  }, []);
  return agents;
}
