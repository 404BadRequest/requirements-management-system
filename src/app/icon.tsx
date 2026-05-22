import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const svgBuffer = await readFile(path.join(process.cwd(), "public/brand/rst-shield-checkflow-mark.svg"));
  const svgBase64 = `data:image/svg+xml;base64,${svgBuffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={svgBase64} width={32} height={32} alt="" />
      </div>
    ),
    { ...size },
  );
}
