// Omnichannel ayar sayfalarının adres durumu: alt sekme (?sub=) ve açık merkez (?channel= / ?profile=).
// Sekmenin kendisi yolda (/omnichannel/rules), buradakiler sorgudadır: kabuk sekme değiştirirken sorguyu
// korur, bu yüzden derin bağlantı (/omnichannel/channels?channel=12) yenilemede ve paylaşımda çalışır.

export interface OmnichannelView {
  sub: string | null;
  channelId: number | null;
  profileId: number | null;
}

export const EMPTY_VIEW: OmnichannelView = { sub: null, channelId: null, profileId: null };

const SUB_PARAM = 'sub';
const CHANNEL_PARAM = 'channel';
const PROFILE_PARAM = 'profile';

const parseId = (raw: string | null): number | null => {
  const id = Number(raw);
  return raw !== null && Number.isInteger(id) && id > 0 ? id : null;
};

export function parseView(params: URLSearchParams): OmnichannelView {
  return {
    sub: params.get(SUB_PARAM) || null,
    channelId: parseId(params.get(CHANNEL_PARAM)),
    profileId: parseId(params.get(PROFILE_PARAM)),
  };
}

/** Görünümü sorguya yazar; başka parametrelere (ör. ?c=konuşma) dokunmaz. Boş değer parametreyi siler. */
export function applyView(params: URLSearchParams, view: OmnichannelView): URLSearchParams {
  const next = new URLSearchParams(params);
  const entries: [string, string | null][] = [
    [SUB_PARAM, view.sub],
    [CHANNEL_PARAM, view.channelId === null ? null : String(view.channelId)],
    [PROFILE_PARAM, view.profileId === null ? null : String(view.profileId)],
  ];
  for (const [key, value] of entries) {
    if (value === null) next.delete(key);
    else next.set(key, value);
  }
  return next;
}

/** Bir merkez (kanal/profil) açılıp kapanırken tarayıcı geçmişine kayıt eklenir: Geri düğmesi merkezi kapatır. */
export function isCenterToggle(previous: OmnichannelView, next: OmnichannelView): boolean {
  return (previous.channelId === null) !== (next.channelId === null)
    || (previous.profileId === null) !== (next.profileId === null);
}
