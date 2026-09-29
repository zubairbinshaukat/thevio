import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export function GET(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 96,
      }}
    >
      {siteConfig.name}
    </div>,
    { width: 1200, height: 630 },
  );
}
