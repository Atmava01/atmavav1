export default function DashboardLoading() {
  return (
    <div className="min-h-screen flex" style={{ background: "#F6F4EF" }}>
      {/* Sidebar */}
      <div
        className="fixed left-0 top-0 bottom-0 hidden md:flex flex-col"
        style={{ width: "220px", background: "#E8E1D6", borderRight: "1px solid #D4CCBF" }}
      >
        <div className="px-5 py-5" style={{ borderBottom: "1px solid #D4CCBF" }}>
          <div className="h-5 w-20 rounded-md" style={{ background: "#D4CCBF" }} />
        </div>
        <div className="flex-1 py-4 px-2.5 space-y-1">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-9 rounded-xl" style={{ background: "rgba(212,204,191,0.5)" }} />
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 min-w-0 md:ml-[220px]">
        <div
          className="sticky top-0 z-30 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between"
          style={{ background: "rgba(246,244,239,0.88)", borderBottom: "1px solid #D4CCBF" }}
        >
          <div className="h-3 w-20 rounded-md" style={{ background: "#D4CCBF" }} />
          <div className="w-8 h-8 rounded-full" style={{ background: "#D4CCBF" }} />
        </div>
        <div className="px-3 md:px-8 py-4 md:py-8 max-w-4xl space-y-4">
          <div className="h-4 w-24 rounded-md" style={{ background: "#D4CCBF" }} />
          <div className="h-7 w-52 rounded-md" style={{ background: "#D4CCBF" }} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mt-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl" style={{ background: "#E8E1D6" }} />
            ))}
          </div>
          <div className="h-32 rounded-2xl" style={{ background: "#E8E1D6" }} />
        </div>
      </div>
    </div>
  );
}
