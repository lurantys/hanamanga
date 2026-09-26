import { ImageResponse } from "next/og";
import { BrandSocialImage } from "@/components/BrandSocialImage";

export const alt = "Hana — manga, manhwa, manhua, and webtoon reader";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(<BrandSocialImage />, size);
}
