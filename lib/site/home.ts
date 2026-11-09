/**
 * The home page's corporate content after the journey (English and Turkish): the
 * introduction, the ecosystem, Sandy Platform, about, contact. Service details live in
 * lib/ecosystem/services.ts. No client names, quotes or figures: none are real yet.
 */
import type { Localized } from "@/lib/i18n/types";

export const home = {
  introduction: {
    eyebrow: { en: "Sandy Labs", tr: "Sandy Labs" },
    /** Over the valley at dawn (components/site/WhatWeDo.tsx). */
    title: { en: "Everything your brand does online, under one roof.", tr: "Markanın dijitalde yaptığı her şey, tek bir çatı altında." },
    body: [
      {
        en: "Sandy Labs is a studio for brands that want more than a website. We shape how your brand is seen, found and run online: its websites, its reach, its presence and the work behind them.",
        tr: "Sandy Labs, bir web sitesinden fazlasını isteyen markalar için bir stüdyo. Markanın dijitalde nasıl görüneceğini, nasıl bulunacağını ve nasıl yönetileceğini şekillendiriyoruz: web sitelerini, erişimini, varlığını ve bunların arkasındaki işleri.",
      },
      {
        en: "Four connected parts work as one ecosystem, so every step builds on the one before it.",
        tr: "Birbirine bağlı dört bölüm tek bir ekosistem olarak çalışır; her adım bir öncekinin üzerine kurulur.",
      },
    ] as Localized[],
  },
  ecosystem: {
    eyebrow: { en: "Our ecosystem", tr: "Ekosistemimiz" },
    title: { en: "Four parts, one Sandy Labs.", tr: "Dört bölüm, tek Sandy Labs." },
    lede: {
      en: "Each part stands on its own and works better with the others: the site your campaigns lead to, the brand it carries, the automations that keep it all moving.",
      tr: "Her bölüm kendi başına çalışır, diğerleriyle birlikte daha iyi çalışır: kampanyaların yönlendirdiği site, sitenin taşıdığı marka, hepsini hareket hâlinde tutan otomasyonlar.",
    },
    explore: { en: "Explore", tr: "Keşfet" },
  },
  platform: {
    eyebrow: { en: "Sandy Platform", tr: "Sandy Platform" },
    status: { en: "In development", tr: "Geliştiriliyor" },
    title: { en: "One place to run your brand.", tr: "Markanı tek bir yerden yönet." },
    lede: {
      en: "We are building Sandy Platform: one panel where your website, campaigns, brand and automations come together. You will see what is happening, decide what comes next and act on it, in one place.",
      tr: "Sandy Platform'u geliştiriyoruz: web sitenin, kampanyalarının, markanın ve otomasyonlarının bir araya geldiği tek bir panel. Neler olduğunu görecek, sırada ne olacağına karar verecek ve hepsini tek bir yerden yapacaksın.",
    },
    workspace: {
      title: { en: "A workspace for each brand", tr: "Her marka için bir çalışma alanı" },
      note: {
        en: "Everything about one brand in one workspace, shared with the people who work on it.",
        tr: "Bir markaya dair her şey tek bir çalışma alanında; üzerinde çalışan kişilerle paylaşılır.",
      },
    },
    modulesTitle: { en: "What it will bring together", tr: "Bir araya getireceği şeyler" },
  },
  about: {
    eyebrow: { en: "About Sandy Labs", tr: "Sandy Labs hakkında" },
    title: {
      en: "A studio, a set of services and a platform on the way.",
      tr: "Bir stüdyo, bir hizmetler bütünü ve yolda olan bir platform.",
    },
    body: {
      en: "Sandy Labs began with websites people want to explore. It is growing into a home for everything a brand needs online, held together by one design language and one way of working.",
      tr: "Sandy Labs, insanların keşfetmek istediği web siteleriyle başladı. Bugün bir markanın dijitalde ihtiyaç duyduğu her şeyin evi hâline geliyor; tek bir tasarım dili ve tek bir çalışma biçimiyle bir arada.",
    },
    principles: [
      {
        title: { en: "Crafted", tr: "Özenli" },
        note: { en: "Every page, campaign and automation is made for the brand it serves.", tr: "Her sayfa, kampanya ve otomasyon hizmet ettiği marka için yapılır." },
      },
      {
        title: { en: "Connected", tr: "Bağlantılı" },
        note: { en: "The four parts share what they learn, so nothing starts from zero.", tr: "Dört bölüm öğrendiklerini paylaşır; hiçbir şey sıfırdan başlamaz." },
      },
      {
        title: { en: "Clear", tr: "Net" },
        note: { en: "Plain words, honest plans and work you can follow.", tr: "Sade bir dil, dürüst planlar ve takip edebileceğin işler." },
      },
    ] as { title: Localized; note: Localized }[],
  },
  contact: {
    eyebrow: { en: "Contact", tr: "İletişim" },
    title: { en: "Tell us what your brand needs.", tr: "Markanın neye ihtiyacı olduğunu anlat." },
    lede: {
      en: "Start with your website in a few steps, or begin from the part of the ecosystem your brand needs first.",
      tr: "Birkaç adımda web sitenle başla ya da markanın önce ihtiyaç duyduğu bölümden başla.",
    },
    servicesTitle: { en: "Or start from", tr: "Ya da buradan başla" },
  },
  footer: {
    line: { en: "One studio for everything your brand does online.", tr: "Markanın dijitalde yaptığı her şey için tek bir stüdyo." },
    services: { en: "Ecosystem", tr: "Ekosistem" },
    company: { en: "Sandy Labs", tr: "Sandy Labs" },
    language: { en: "Language", tr: "Dil" },
  },
} as const;
