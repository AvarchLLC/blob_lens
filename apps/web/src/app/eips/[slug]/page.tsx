import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEip, EIPS } from "@/lib/eip-data";
import { EipDetailClient } from "./eip-detail-client";

export function generateStaticParams() {
  return EIPS.map(e => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const eip = getEip(slug);
  if (!eip) return {};
  return {
    title: `${eip.id}: ${eip.title} — BlobLens`,
    description: eip.shortDesc,
  };
}

export default async function EipPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const eip = getEip(slug);
  if (!eip) notFound();
  return <EipDetailClient eip={eip} />;
}
