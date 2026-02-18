import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Brand/Hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        
        {/* Gradient orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-sky-500/20 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="ProCapacity"
              width={40}
              height={40}
              className="h-10 w-10"
            />
            <h1 className="text-3xl font-bold tracking-tight">
              Pro<span className="text-emerald-400">Capacity</span>
            </h1>
          </div>
          
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight leading-tight text-slate-100">
                Stop burning out your best people.
              </h1>
              <p className="text-slate-300 max-w-md leading-relaxed">
                Capacity planning for agencies, consultancies, and professional services firms. See who&apos;s at 40%, 80%, or 110% and decide who can take the next project.
              </p>
              <p className="text-sm text-slate-400">
                For teams of 10-200 people.
              </p>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-3 pt-2">
              <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-slate-200">
                🔍 Skills-based search
              </div>
              <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-slate-200">
                📊 Real-time capacity
              </div>
              <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-slate-200">
                ⚠️ Burnout alerts
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <a
                href="/signup"
                className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                Start 14-day free trial
              </a>
              <p className="text-sm text-slate-400">
                No credit card required • Set up in 5 minutes
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-400">
            <span>✓ Marketing Agencies</span>
            <span>✓ Law Firms</span>
            <span>✓ Consultancies</span>
            <span>✓ Design Studios</span>
            <span>✓ Architecture Firms</span>
          </div>
        </div>
      </div>
      
      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}

