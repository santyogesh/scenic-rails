import CameraView from "@/components/CameraView";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Look around",
  description: "Point your phone's camera at the view and see the names of nearby hills, rivers, forts, temples and towns in that direction.",
  path: "/look",
});

export default function Look() {
  return <CameraView />;
}
