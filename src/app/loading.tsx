export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#F6F4EF" }}>
      <div
        className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "#5C6B57", borderTopColor: "transparent" }}
      />
    </div>
  );
}
