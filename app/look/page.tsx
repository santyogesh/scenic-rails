import type { Metadata } from "next";
import CameraView from "@/components/CameraView";

export const metadata: Metadata = {
  title: "Look around | Scenic Rails",
  description: "Point your phone's camera at the view and see the names of nearby hills, rivers, forts, temples and towns in that direction.",
  alternates: { canonical: "/look" },
};

export default function Look() {
  return <CameraView />;
}
