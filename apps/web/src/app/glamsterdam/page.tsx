import { GlamsterdamClient } from "./glamsterdam-client";

export const metadata = {
  title: "What Glamsterdam Breaks | BlobLens",
  description:
    "EIP-8037/8038 repricing impact: a differential replay of real transactions under Osaka vs Glamsterdam. ERC-4337 Account Abstraction hard-breaks at verificationGasLimit, the category the pro audits missed.",
};

export default function GlamsterdamPage() {
  return (
    <main className="px-4 sm:px-6 pb-16">
      <GlamsterdamClient />
    </main>
  );
}
