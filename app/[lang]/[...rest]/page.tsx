import { notFound } from 'next/navigation';

// Any path that matches no page lands here, so the branded 404 renders inside the
// site layout (header, language switch) instead of the bare Next.js default.
export const dynamicParams = true;

export default function CatchAll() {
  notFound();
}
