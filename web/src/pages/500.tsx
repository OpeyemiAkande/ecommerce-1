import Link from "next/link";

// App Router error boundaries don't cover a failed first render of an ISR
// route (e.g. the API is down), so Next falls back to this static page.
export default function ServerError() {
  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        padding: "4rem 1rem",
        textAlign: "center"
      }}
    >
      <h1 style={{fontSize: "1.5rem", fontWeight: 600}}>
        Something went wrong
      </h1>
      <p style={{color: "#525252", marginTop: "0.5rem"}}>
        We couldn&apos;t load this page. Please try again in a moment.
      </p>
      <Link
        href="/"
        style={{
          display: "inline-block",
          marginTop: "1.5rem",
          padding: "0.5rem 1rem",
          background: "#171717",
          color: "#fff",
          borderRadius: "0.25rem",
          textDecoration: "none"
        }}
      >
        Back to home
      </Link>
    </div>
  );
}
