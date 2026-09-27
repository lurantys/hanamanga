import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BrandSocialImage } from "@/components/BrandSocialImage";

export const alt = "Hana — manga, manhwa, manhua, and webtoon reader";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function TwitterImage() {
  const image = await readFile(join(process.cwd(), "public/images/hana-reader.png"));
  const readerImage = `data:image/png;base64,${image.toString("base64")}`;
  return new ImageResponse(<BrandSocialImage readerImage={readerImage} />, size);
}
