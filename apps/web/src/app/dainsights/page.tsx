import { DainsightsClient } from "./dainsights-client";

export const metadata = {
  title: "Rollup Cost Insight & DA Efficiency Scoring | BlobLens",
  description:
    "Per-rollup DA cost-efficiency scoring engine, EIP-4844 blob fee market regime classifier, and 4-12 slot congestion forecasting for Layer-2 rollup operators.",
};

export default function DainsightsPage() {
  return <DainsightsClient />;
}
