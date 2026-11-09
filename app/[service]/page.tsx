import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServicePage } from "@/components/ecosystem/ServicePage";
import { getService, serviceIds, type ServiceId } from "@/lib/ecosystem/services";

/** The four service pages: /sites, /reach, /presence, /flow (lib/ecosystem/services.ts); nothing else. */
export const dynamicParams = false;

export function generateStaticParams() {
  return serviceIds.map((service) => ({ service }));
}

export async function generateMetadata({ params }: { params: Promise<{ service: string }> }): Promise<Metadata> {
  const service = getService((await params).service);
  if (!service) return {};
  return { title: `${service.name} · Sandy Labs`, description: service.summary.en };
}

export default async function Page({ params }: { params: Promise<{ service: string }> }) {
  const service = getService((await params).service);
  if (!service) notFound();
  return <ServicePage id={service.id as ServiceId} />;
}
