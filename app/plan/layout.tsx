import type { Metadata } from "next";

/** The planner is the same search as the homepage and has no written content of its own. */
export const metadata: Metadata = {
  title: "Plan a route",
  description: "Sketch a train route from a train number or a list of stations.",
  robots: { index: false, follow: true },
};

export default function PlanLayout({ children }: { children: React.ReactNode }) {
  return children;
}
