import { adsHubApi } from '../../lib/api/adshub';
import { omnichannelApi } from '../../lib/api/omnichannel';
import { shippingApi } from '../../lib/api/shipping';
import type { AiChatTurn, AiDataCard } from '../../lib/api/ai';
import type { WorkspaceKey } from '../../stores/workspace-panel';

// Aivar'dan TÜREYEN modül ajanlarının kataloğu. Her biri backend'de aynı motoru (AivarAgentEngine)
// kendi kapsam kilidi ve kendi araçlarıyla çalıştırır; burada yalnızca hangi uca gidileceği ve
// öneri çipleri tanımlıdır. Widget bir modülün içindeyken otomatik olarak o ajana geçer,
// "+" menüsünden herhangi bir sayfadan elle de seçilebilir.
//
// YALNIZCA GERÇEK BİR AJANI OLAN modüller listelenir. Eskiden Radar/SiteHub için sabit iki
// sayı gösteren "sahte bot"lar ve altı modül için "henüz bağlanmadı" yer tutucuları vardı;
// hepsi kullanıcıyı cevaplanamayacak sorulara davet ediyordu. Bir modülün ajanı yoksa widget
// genel Aivar olarak kalır (o da gerçek veriye erişir).
export interface ModuleBot {
  key: WorkspaceKey;
  aiName: string;
  moduleLabel: string;
  placeholder: string;
  suggestions: string[];
  // Metnin yaninda veri kartlari da doner — modul ajanlarinda da tablo gorunsun diye
  // (genel Aivar ile ayni deneyim). Kart uretmeyen bir uc bos dizi doner.
  onQuery: (text: string, history: AiChatTurn[]) => Promise<ModuleBotReply>;
}

export interface ModuleBotReply {
  text: string;
  cards: AiDataCard[];
}

function unavailable(aiName: string, e: unknown): ModuleBotReply {
  return {
    text: `${aiName} şu an cevap veremedi: ${e instanceof Error ? e.message : 'sunucuya ulaşılamadı'}`,
    cards: [],
  };
}

export const MODULE_BOTS: Partial<Record<WorkspaceKey, ModuleBot>> = {
  adshub: {
    key: 'adshub',
    aiName: 'ad.ai',
    moduleLabel: 'AdsHub',
    placeholder: "ad.ai'a reklam harcaması, ROAS veya MER sor...",
    // Sırasıyla get_ads_overview · get_ads_breakdown · get_blended_profit araçlarına karşılık gelir.
    suggestions: [
      'Son 30 günün reklam özetini çıkar',
      'Meta ve Google harcamasını karşılaştır',
      'Son 30 günün MER ve reklam kârlılığı',
    ],
    onQuery: async (q, history) => {
      try {
        const res = await adsHubApi.chat(q, history);
        return { text: res.reply, cards: res.cards ?? [] };
      } catch (e) {
        return unavailable('ad.ai', e);
      }
    },
  },
  omnichannel: {
    key: 'omnichannel',
    aiName: 'oc.ai',
    moduleLabel: 'Omnichannel',
    placeholder: "oc.ai'a kanal sağlığı, mesaj hacmi veya yanıt süresi sor...",
    // Sırasıyla get_channels · get_omnichannel_overview · get_pending_conversations.
    suggestions: [
      'Bağlı kanalların durumunu göster',
      'Son 30 günün mesaj hacmi ve yanıt süresi',
      'Bekleyen konuşmaları listele',
    ],
    // Operatör ajanı — MÜŞTERİ chatbot'undan tamamen ayrı uç (/omnichannel/ops-chat) ve araçlar.
    onQuery: async (q, history) => {
      try {
        const res = await omnichannelApi.opsChat(q, history);
        return { text: res.reply, cards: res.cards ?? [] };
      } catch (e) {
        return unavailable('oc.ai', e);
      }
    },
  },
  logistics: {
    key: 'logistics',
    aiName: 'kg.ai',
    moduleLabel: 'Lojistik',
    placeholder: "kg.ai'a gönderi durumu, taşıyıcı veya teslimat sor...",
    // Sırasıyla get_shipments(status=DeliveryFailed) · get_shipments · get_carriers.
    suggestions: [
      'Teslim edilemeyen gönderileri listele',
      'Son 7 günün gönderi durumlarını özetle',
      'Bağlı kargo taşıyıcılarını göster',
    ],
    onQuery: async (q, history) => {
      try {
        const res = await shippingApi.chat(q, history);
        return { text: res.reply, cards: res.cards ?? [] };
      } catch (e) {
        return unavailable('kg.ai', e);
      }
    },
  },
};

/** "+" menüsünde listelenen sıra. */
export const MODULE_BOT_ORDER: WorkspaceKey[] = ['adshub', 'omnichannel', 'logistics'];
