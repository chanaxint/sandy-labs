/**
 * The Sandy Labs ecosystem: four connected modules of one brand, not four companies.
 * Everything the site shows about a service (its page, its card, the menu, the footer)
 * comes from here, so a service is added or changed in one place.
 *
 * Built for what comes later: each service names the module it will become in Sandy
 * Platform (`platformModule`), where a brand workspace will hold all four. Nothing here
 * talks to a backend; there is none yet.
 */
import type { Localized } from "@/lib/i18n/types";

export type ServiceId = "sites" | "reach" | "presence" | "flow";

export type ServiceCategory = {
  id: string;
  name: Localized;
  /** One line on what it covers. */
  note: Localized;
};

export type Service = {
  id: ServiceId;
  /** The product name, the same in every language. */
  name: string;
  /** Its page (app/[service]/page.tsx). */
  route: `/${ServiceId}`;
  /** Its place in the ecosystem, as shown ("01" … "04"). */
  index: string;
  /** Its own colour within the shared palette: `base` for marks and lines, `soft` for grounds. */
  accent: { base: string; soft: string };
  /** One line: what it is for. */
  tagline: Localized;
  /** Two sentences at most: what it does for a brand. */
  summary: Localized;
  categories: ServiceCategory[];
  /** The main call to action on its page. */
  cta: { label: Localized; href: string };
  /** The module it becomes in Sandy Platform (later phases; not built). */
  platformModule: Localized;
};

export const services: Service[] = [
  {
    id: "sites",
    name: "SandySites",
    route: "/sites",
    index: "01",
    accent: { base: "#a9743f", soft: "#f1e4d2" },
    tagline: { en: "Websites made to be explored.", tr: "Keşfedilmek için yapılmış web siteleri." },
    summary: {
      en: "From a first version shaped with AI to a fully custom, cinematic scroll experience: the websites your brand is seen through.",
      tr: "Yapay zekâyla şekillenen ilk halinden tamamen özel, sinematik bir scroll deneyimine: markanın görüldüğü web siteleri.",
    },
    categories: [
      {
        id: "ai-builder",
        name: { en: "AI website builder", tr: "Yapay zekâ ile site oluşturma" },
        note: { en: "Describe your idea and shape a first version of your site.", tr: "Fikrini anlat, sitenin ilk halini şekillendir." },
      },
      {
        id: "custom",
        name: { en: "Custom websites", tr: "Özel web siteleri" },
        note: { en: "Designed and built around your brand, page by page.", tr: "Markana göre, sayfa sayfa tasarlanır ve geliştirilir." },
      },
      {
        id: "3d",
        name: { en: "3D experiences", tr: "3D deneyimler" },
        note: { en: "Products and spaces visitors can turn, explore and step into.", tr: "Ziyaretçinin çevirip inceleyebileceği, içine girebileceği ürünler ve mekânlar." },
      },
      {
        id: "cinematic",
        name: { en: "Cinematic scroll websites", tr: "Sinematik scroll siteleri" },
        note: { en: "Stories told frame by frame as the visitor scrolls.", tr: "Ziyaretçi kaydırdıkça kare kare anlatılan hikâyeler." },
      },
      {
        id: "ecommerce",
        name: { en: "E-commerce", tr: "E-ticaret" },
        note: { en: "Stores that show products well and make buying simple.", tr: "Ürünleri iyi gösteren, satın almayı kolaylaştıran mağazalar." },
      },
    ],
    cta: { label: { en: "Create my website", tr: "Web sitemi oluştur" }, href: "/#create" },
    platformModule: { en: "Edit and publish your sites", tr: "Sitelerini düzenle ve yayınla" },
  },
  {
    id: "reach",
    name: "SandyReach",
    route: "/reach",
    index: "02",
    accent: { base: "#5b7a63", soft: "#e2e9df" },
    tagline: { en: "Be found by the people looking for you.", tr: "Seni arayanlar seni bulsun." },
    summary: {
      en: "Search, ads and growth work that bring the right visitors to your brand, measured as they go.",
      tr: "Markana doğru ziyaretçileri getiren arama, reklam ve büyüme çalışmaları; yol boyunca ölçülerek.",
    },
    categories: [
      {
        id: "google-ads",
        name: { en: "Google Ads", tr: "Google Ads" },
        note: { en: "Search and display campaigns planned around what your customers look for.", tr: "Müşterilerinin aradıklarına göre planlanan arama ve görüntülü reklam kampanyaları." },
      },
      {
        id: "seo-geo",
        name: { en: "SEO & GEO", tr: "SEO & GEO" },
        note: { en: "Visible in search engines and in the answers of AI assistants.", tr: "Arama motorlarında ve yapay zekâ asistanlarının yanıtlarında görünür olmak." },
      },
      {
        id: "performance",
        name: { en: "Performance marketing", tr: "Performans pazarlaması" },
        note: { en: "Budgets placed where they bring results.", tr: "Bütçeyi sonuç getirdiği yere yerleştirmek." },
      },
      {
        id: "campaigns",
        name: { en: "Campaign management", tr: "Kampanya yönetimi" },
        note: { en: "Campaigns run, watched and adjusted week by week.", tr: "Kampanyaların haftadan haftaya yürütülmesi, izlenmesi ve ayarlanması." },
      },
      {
        id: "analytics",
        name: { en: "Growth analytics", tr: "Büyüme analitiği" },
        note: { en: "Clear reports on what works and what to do next.", tr: "Neyin işe yaradığını ve sırada ne olduğunu gösteren net raporlar." },
      },
    ],
    cta: { label: { en: "Talk about your growth", tr: "Büyümeni konuşalım" }, href: "/#contact" },
    platformModule: { en: "Campaigns and their results", tr: "Kampanyalar ve sonuçları" },
  },
  {
    id: "presence",
    name: "SandyPresence",
    route: "/presence",
    index: "03",
    accent: { base: "#a5645a", soft: "#f0e0da" },
    tagline: { en: "A brand people recognise, wherever it appears.", tr: "Göründüğü her yerde tanınan bir marka." },
    summary: {
      en: "Identity, strategy and social presence shaped as one, so your brand looks and sounds like itself everywhere.",
      tr: "Kimlik, strateji ve sosyal medya varlığı tek bir bütün olarak; markan her yerde kendisi gibi görünsün, kendisi gibi konuşsun.",
    },
    categories: [
      {
        id: "identity",
        name: { en: "Logo & brand identity", tr: "Logo ve marka kimliği" },
        note: { en: "A mark and a character that are unmistakably yours.", tr: "Tartışmasız sana ait bir işaret ve karakter." },
      },
      {
        id: "strategy",
        name: { en: "Brand strategy", tr: "Marka stratejisi" },
        note: { en: "What your brand stands for, who it speaks to and how.", tr: "Markanın neyi temsil ettiği, kime ve nasıl seslendiği." },
      },
      {
        id: "instagram",
        name: { en: "Instagram management", tr: "Instagram yönetimi" },
        note: { en: "Your account planned, posted and looked after.", tr: "Hesabının planlanması, paylaşımların yapılması ve takibi." },
      },
      {
        id: "social-content",
        name: { en: "Social media content", tr: "Sosyal medya içerikleri" },
        note: { en: "Posts, stories and short videos in your brand's voice.", tr: "Markanın sesiyle gönderiler, hikâyeler ve kısa videolar." },
      },
      {
        id: "visual-identity",
        name: { en: "Visual identity", tr: "Görsel kimlik" },
        note: { en: "Colours, type and imagery that hold everything together.", tr: "Her şeyi bir arada tutan renkler, yazı karakterleri ve görseller." },
      },
    ],
    cta: { label: { en: "Talk about your brand", tr: "Markanı konuşalım" }, href: "/#contact" },
    platformModule: { en: "Brand assets and content", tr: "Marka varlıkları ve içerikler" },
  },
  {
    id: "flow",
    name: "SandyFlow",
    route: "/flow",
    index: "04",
    accent: { base: "#4b6f8c", soft: "#dfe7ee" },
    tagline: { en: "Work that runs itself, so your team doesn't have to.", tr: "Kendi kendine işleyen işler; ekibin uğraşmasın diye." },
    summary: {
      en: "AI agents and automations that take on the repetitive work around your brand and connect the tools you already use.",
      tr: "Markanın etrafındaki tekrar eden işleri üstlenen, kullandığın araçları birbirine bağlayan yapay zekâ ajanları ve otomasyonlar.",
    },
    categories: [
      {
        id: "agents",
        name: { en: "AI agents", tr: "Yapay zekâ ajanları" },
        note: { en: "Assistants that answer, sort and follow up for you.", tr: "Senin yerine yanıtlayan, düzenleyen ve takip eden asistanlar." },
      },
      {
        id: "workflows",
        name: { en: "Workflow automation", tr: "İş akışı otomasyonu" },
        note: { en: "Routine steps that happen on their own, in the right order.", tr: "Doğru sırayla, kendiliğinden gerçekleşen rutin adımlar." },
      },
      {
        id: "content",
        name: { en: "Content automation", tr: "İçerik otomasyonu" },
        note: { en: "Drafts, variations and translations prepared for review.", tr: "Onayına hazır taslaklar, varyasyonlar ve çeviriler." },
      },
      {
        id: "social",
        name: { en: "Social media automation", tr: "Sosyal medya otomasyonu" },
        note: { en: "Scheduling, publishing and replies kept moving.", tr: "Planlama, yayınlama ve yanıtların aksamadan sürmesi." },
      },
      {
        id: "integrations",
        name: { en: "Business integrations", tr: "İş entegrasyonları" },
        note: { en: "Your tools connected, so information goes where it is needed.", tr: "Araçların birbirine bağlı; bilgi ihtiyaç duyulan yere gider." },
      },
    ],
    cta: { label: { en: "Talk about automation", tr: "Otomasyonu konuşalım" }, href: "/#contact" },
    platformModule: { en: "Agents and automations", tr: "Ajanlar ve otomasyonlar" },
  },
];

export const serviceIds = services.map((s) => s.id);

export function getService(id: string): Service | undefined {
  return services.find((s) => s.id === id);
}
