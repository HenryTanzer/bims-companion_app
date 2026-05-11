import Image from 'next/image'
import Link from 'next/link'

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-white p-1.5">
            <Image src="/logo.png" alt="BIMS School" width={68} height={68} className="object-contain" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold">You&apos;re offline</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            No internet connection detected. Pages you&apos;ve visited before may still be available.
          </p>
        </div>
        <div className="space-y-2">
          <Link
            href="/student"
            className="block w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Go to Student Portal
          </Link>
          <Link
            href="/teacher"
            className="block w-full py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors"
          >
            Go to Teacher Portal
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          Study Buddy and live features require an internet connection.
        </p>
      </div>
    </div>
  )
}
