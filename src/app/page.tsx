import dynamic from "next/dynamic";

const AgreementCreator = dynamic(
  () => import("@/components/agreement-creator"),
  {
    ssr: false,
    loading: () => (
      <main className="loading-app">Loading CarePal Agreement Generator…</main>
    ),
  },
);

export default function Home() {
  return <AgreementCreator />;
}
