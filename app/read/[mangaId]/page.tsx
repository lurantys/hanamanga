import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { resolveFirstChapter } from "@/lib/read";

// The first-chapter lookup is public and can be served from ISR between
// updates instead of invoking a Function for every reader entry.
export const revalidate = 300;

export const metadata: Metadata = { title: "Read | Hana" };

type ReadResolverProps = {
  params: Promise<{ mangaId: string }>;
};

export default async function ReadResolver({ params }: ReadResolverProps) {
  const { mangaId } = await params;
  const chapterId = await resolveFirstChapter(mangaId);
  if (!chapterId) notFound();
  redirect(`/read/${mangaId}/${chapterId}`);
}
