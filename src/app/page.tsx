import { TruthLensApp } from "@/components/TruthLensApp"
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TruthLens',
};

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-teal-200 selection:text-teal-900 flex flex-col pt-12 md:pt-24 px-4 pb-12">
      <TruthLensApp />
    </main>
  )
}
