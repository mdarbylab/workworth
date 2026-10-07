import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "WorkWorth — know what your time is worth";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0c1929",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 20, height: 20, borderRadius: 999, backgroundColor: "#9d3e37", display: "flex" }} />
          <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -2 }}>WorkWorth</div>
        </div>
        <div style={{ marginTop: 24, fontSize: 32, color: "#c4d2e4" }}>
          Know what your time is worth.
        </div>
      </div>
    ),
    { ...size },
  );
}
