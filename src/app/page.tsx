import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4">
      <h1 className="text-3xl font-semibold tracking-tight">Barber Booking</h1>
      <p className="text-muted">
        Each shop has its own booking link. Ask your barbershop for theirs, or scan the QR code at the counter.
      </p>
      <Link href="/login" className="btn-ghost w-fit">
        Staff sign in
      </Link>
    </main>
  );
}
