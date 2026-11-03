/**
 * "Create my website": the start of the website-creation questions. The call to action
 * (the closing phrase's, the menu's) turns the film's night back into morning and opens
 * the steps over the morning sky: 1. the industry, 2. the kind of website (its choices
 * depend on the industry), 3. the design style (shown as small moving previews), 4. the
 * dream website in their own words (a wide writing field over a video). There is no way back to the night from them; the menu still
 * takes the visitor to any chapter of the film.
 *
 * Only these four steps exist so far, and nothing is sent anywhere: there is no backend.
 */
import type { Lang } from "@/lib/journey/story";

/** closed: the story; opening: night turning to morning; open: the step (no way back but the menu). */
export type CreateState = "closed" | "opening" | "open";

let state: CreateState = "closed";
const listeners = new Set<() => void>();

export const createStore = {
  get: () => state,
  set(next: CreateState) {
    if (state === next) return;
    state = next;
    for (const l of listeners) l();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => void listeners.delete(fn);
  },
};

/** Opens the creation steps (from the story, or the menu). */
export function openCreate() {
  if (createStore.get() === "closed") createStore.set("opening");
}

/** The film frame the night turns back to: the clear blue sky of the day, before dusk. */
export const morningFrame = 4600;

type Copy = Record<Lang, string>;

export const createCopy = {
  title: { en: "First, let's get to know you.", tr: "Önce sizi biraz tanıyalım." },
  question: { en: "Which industry are you in?", tr: "Hangi sektörde faaliyet gösteriyorsunuz?" },
  continue: { en: "Continue", tr: "Devam et" },
  back: { en: "Back", tr: "Geri" },
  siteTitle: { en: "What kind of website do you want?", tr: "Nasıl bir web sitesi istiyorsunuz?" },
  recommended: { en: "Recommended", tr: "Önerilen" },
  styleTitle: { en: "What design style suits you?", tr: "Tasarım tarzınız nasıl olsun?" },
  dreamTitle: { en: "Describe your dream website.", tr: "Hayalinizdeki siteyi anlatın." },
  dreamLabel: { en: "Your dream website", tr: "Hayalinizdeki site" },
  dreamPlaceholder: {
    en: "The features you want, websites you like, colours… e.g. “A calm online store in black and white, airy like apple.com, with a booking page.”",
    tr: "İstediğiniz özellikler, beğendiğiniz siteler, renkler… Örn: “Siyah-beyaz, sade bir online mağaza; apple.com gibi ferah, bir de rezervasyon sayfası olsun.”",
  },
  send: { en: "Send", tr: "Gönder" },
  otherLabel: { en: "Your industry", tr: "Sektörünüz" },
  otherPlaceholder: { en: "Write it here…", tr: "Buraya yazın…" },
} satisfies Record<string, Copy>;

/** The industries of the first step ("other" opens a field to write one in). */
export const sectors: { id: string; label: Copy }[] = [
  { id: "fashion", label: { en: "Fashion & Apparel", tr: "Moda & Giyim" } },
  { id: "beauty", label: { en: "Beauty & Cosmetics", tr: "Güzellik & Kozmetik" } },
  { id: "health", label: { en: "Health & Wellness", tr: "Sağlık & Wellness" } },
  { id: "food", label: { en: "Restaurant & Café", tr: "Restoran & Kafe" } },
  { id: "ecommerce", label: { en: "E-commerce", tr: "E-ticaret" } },
  { id: "real-estate", label: { en: "Real Estate", tr: "Gayrimenkul" } },
  { id: "tech", label: { en: "Technology & SaaS", tr: "Teknoloji & SaaS" } },
  { id: "other", label: { en: "Other", tr: "Diğer" } },
];

/** The kinds of website of the second step. */
export type SiteType = "ecommerce" | "corporate" | "portfolio" | "booking" | "landing";

export const siteTypes: Record<SiteType, { label: Copy; about: Copy }> = {
  ecommerce: {
    label: { en: "E-commerce", tr: "E-ticaret" },
    about: { en: "Sell online: products, cart and checkout.", tr: "Online satış: ürünler, sepet ve ödeme." },
  },
  corporate: {
    label: { en: "Corporate", tr: "Kurumsal" },
    about: { en: "Who you are: your company, services and team.", tr: "Kim olduğunuz: şirketiniz, hizmetleriniz ve ekibiniz." },
  },
  portfolio: {
    label: { en: "Portfolio", tr: "Portföy" },
    about: { en: "Show your work: projects, galleries, case studies.", tr: "İşlerinizi gösterin: projeler, galeriler, örnekler." },
  },
  booking: {
    label: { en: "Booking", tr: "Rezervasyon" },
    about: { en: "Take reservations and appointments online.", tr: "Online rezervasyon ve randevu alın." },
  },
  landing: {
    label: { en: "Landing page", tr: "Landing page" },
    about: { en: "One focused page for a product, launch or campaign.", tr: "Bir ürün, lansman ya da kampanya için tek, odaklı bir sayfa." },
  },
};

/**
 * The kinds of website that fit each industry, best first (shown as recommended), each
 * described for that industry. "Other" gets them all, as described above.
 */
export const sitesFor: Record<string, { type: SiteType; about?: Copy }[]> = {
  fashion: [
    { type: "ecommerce", about: { en: "Your collections online, with cart and checkout.", tr: "Koleksiyonlarınız online; sepet ve ödemeyle." } },
    { type: "landing", about: { en: "A launch page for a new collection or campaign.", tr: "Yeni bir koleksiyon ya da kampanya için lansman sayfası." } },
    { type: "portfolio", about: { en: "A lookbook: your collections in pictures.", tr: "Lookbook: koleksiyonlarınız görsellerle." } },
    { type: "corporate", about: { en: "Your brand's story, stores and contact.", tr: "Markanızın hikâyesi, mağazaları ve iletişim." } },
  ],
  beauty: [
    { type: "booking", about: { en: "Online appointments for your treatments.", tr: "Bakım ve uygulamalar için online randevu." } },
    { type: "ecommerce", about: { en: "Sell your products online.", tr: "Ürünlerinizi online satın." } },
    { type: "corporate", about: { en: "Your salon or brand: services, team, prices.", tr: "Salonunuz ya da markanız: hizmetler, ekip, fiyatlar." } },
    { type: "landing", about: { en: "One page for a product or an opening.", tr: "Bir ürün ya da açılış için tek sayfa." } },
  ],
  health: [
    { type: "booking", about: { en: "Online appointments with your practitioners.", tr: "Uzmanlarınızla online randevu." } },
    { type: "corporate", about: { en: "Your clinic or studio: services, team, trust.", tr: "Kliniğiniz ya da stüdyonuz: hizmetler, ekip, güven." } },
    { type: "landing", about: { en: "One page for a programme or a campaign.", tr: "Bir program ya da kampanya için tek sayfa." } },
  ],
  food: [
    { type: "booking", about: { en: "Table reservations online.", tr: "Online masa rezervasyonu." } },
    { type: "corporate", about: { en: "Your menu, story and location.", tr: "Menünüz, hikâyeniz ve konumunuz." } },
    { type: "ecommerce", about: { en: "Online orders for delivery or pickup.", tr: "Paket servis ya da gel-al için online sipariş." } },
    { type: "landing", about: { en: "One page for an opening or a special evening.", tr: "Bir açılış ya da özel bir gece için tek sayfa." } },
  ],
  ecommerce: [
    { type: "ecommerce", about: { en: "A full online store: catalogue, cart, checkout.", tr: "Eksiksiz online mağaza: katalog, sepet, ödeme." } },
    { type: "landing", about: { en: "A page that sells one product or a campaign.", tr: "Tek bir ürünü ya da kampanyayı satan sayfa." } },
    { type: "corporate", about: { en: "The company behind your store.", tr: "Mağazanızın arkasındaki şirket." } },
  ],
  "real-estate": [
    { type: "portfolio", about: { en: "Your listings, shown at their best.", tr: "İlanlarınız, en iyi hâlleriyle." } },
    { type: "corporate", about: { en: "Your agency: team, services, trust.", tr: "Ofisiniz: ekip, hizmetler, güven." } },
    { type: "booking", about: { en: "Viewing appointments online.", tr: "Online yer gösterme randevusu." } },
    { type: "landing", about: { en: "One page for a single project or development.", tr: "Tek bir proje için tek sayfa." } },
  ],
  tech: [
    { type: "landing", about: { en: "A product page that turns visitors into users.", tr: "Ziyaretçiyi kullanıcıya dönüştüren ürün sayfası." } },
    { type: "corporate", about: { en: "Your company: product, team, careers.", tr: "Şirketiniz: ürün, ekip, kariyer." } },
    { type: "ecommerce", about: { en: "Sell plans or licences online.", tr: "Paketleri ya da lisansları online satın." } },
    { type: "portfolio", about: { en: "Your work and case studies.", tr: "İşleriniz ve örnek çalışmalarınız." } },
  ],
  other: [{ type: "ecommerce" }, { type: "corporate" }, { type: "portfolio" }, { type: "booking" }, { type: "landing" }],
};

/** The design styles of the third step, each shown as a small moving preview (StylePreview). */
export type DesignStyle = "minimal" | "modern" | "3d" | "cinematic" | "playful";

export const designStyles: { id: DesignStyle; label: Copy }[] = [
  { id: "minimal", label: { en: "Minimal & luxury", tr: "Minimal & lüks" } },
  { id: "modern", label: { en: "Modern & dynamic", tr: "Modern & dinamik" } },
  { id: "3d", label: { en: "3D experience", tr: "3D deneyim" } },
  { id: "cinematic", label: { en: "Cinematic scroll", tr: "Sinematik scroll" } },
  { id: "playful", label: { en: "Playful & colourful", tr: "Eğlenceli & renkli" } },
];

/** The video behind the fourth step (public/media/create, scripts/create/build-dream.sh). */
export const dreamVideo = {
  poster: "/media/create/dream-poster.jpg",
  sources: [
    { src: "/media/create/dream-720.av1.mp4", type: 'video/mp4; codecs="av01.0.05M.08"', media: "(max-width: 900px)" },
    { src: "/media/create/dream-720.h264.mp4", type: "video/mp4", media: "(max-width: 900px)" },
    { src: "/media/create/dream-1080.av1.mp4", type: 'video/mp4; codecs="av01.0.08M.08"' },
    { src: "/media/create/dream-1080.h264.mp4", type: "video/mp4" },
  ],
};
