import { ImageResponse } from "next/og";

export const alt = "Scenic Rails — live train map and scenic railway guides";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#070b14",
          padding: "80px",
          color: "#f4f7fb",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 4, color: "#5eead4", textTransform: "uppercase" }}>
          scenicrails.info
        </div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 84, fontWeight: 700, lineHeight: 1 }}>
          Scenic Rails
        </div>
        <div style={{ display: "flex", marginTop: 28, maxWidth: 860, fontSize: 36, lineHeight: 1.3, color: "#c5d4e4" }}>
          Live train map and guides to scenic railways
        </div>
      </div>
    ),
    { ...size },
  );
}
