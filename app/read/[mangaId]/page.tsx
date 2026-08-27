import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { resolveFirstChapter } from "@/lib/read";

export const revalidate = 3600;
export const generateStaticParams = async () => [];

export const metadata: Metadata = { title: "Read — Hana" };

type ReadResolverProps = {
  params: Promise<{ mangaId: string }>;
};

export default async function ReadResolver({ params }: ReadResolverProps) {
  const { mangaId } = await params;
  const chapterId = await resolveFirstChapter(mangaId);
  if (!chapterId) notFound();
  redirect(`/read/${mangaId}/${chapterId}`);
}
