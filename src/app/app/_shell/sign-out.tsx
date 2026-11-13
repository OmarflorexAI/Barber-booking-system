/** Sign out (posts to /auth/signout, which ends the session and goes to /login). A full-width outlined pill. */
export function SignOutButton({ label }: { label: string }) {
  return (
    <form action="/auth/signout" method="post">
      <button type="submit" className="btn-ghost w-full">
        {label}
      </button>
    </form>
  );
}
