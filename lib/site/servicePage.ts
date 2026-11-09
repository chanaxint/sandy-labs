/** The shared copy of the service pages (components/ecosystem/ServicePage.tsx); each service's own copy is in lib/ecosystem/services.ts. */
export const servicePage = {
  ecosystem: { en: "Sandy Labs ecosystem", tr: "Sandy Labs ekosistemi" },
  allServices: { en: "All services", tr: "Tüm hizmetler" },
  categoriesEyebrow: { en: "What it covers", tr: "Kapsamı" },
  categoriesTitle: { en: "What we do here.", tr: "Burada neler yapıyoruz." },
  othersTitle: { en: "The rest of the ecosystem.", tr: "Ekosistemin geri kalanı." },
  platformNote: {
    en: "In Sandy Platform, {name} will be one module of your brand's workspace, next to the other three.",
    tr: "Sandy Platform'da {name}, markanın çalışma alanında diğer üçünün yanında bir modül olacak.",
  },
} as const;
