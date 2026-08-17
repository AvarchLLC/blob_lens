import { Metadata } from "next";
import { SandwichesClient } from "./sandwiches-client";

export const metadata: Metadata = {
  title: "Ethereum Sandwich MEV Analytics | BlobLens Observatory",
  description:
    "Comprehensive Ethereum sandwich attack metrics, DEX volume ratio, victim address trends, sandwich bot leaderboards, and token exposure.",
};

export default function SandwichesPage() {
  return <SandwichesClient />;
}
