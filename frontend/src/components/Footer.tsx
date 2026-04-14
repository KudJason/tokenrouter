export default function Footer() {
  return (
    <footer className="py-12 px-4 bg-gray-900 text-gray-400" role="contentinfo">
      <div className="max-w-6xl mx-auto text-center">
        <div className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-4">
          TokenRouter
        </div>
        <p className="text-sm mb-6">Trusted AI Agent Infrastructure for Enterprise</p>
        <nav className="flex justify-center gap-6 text-sm mb-8" aria-label="Footer navigation">
          <a href="/" className="hover:text-white transition-colors">Home</a>
          <a href="/#features" className="hover:text-white transition-colors">Features</a>
          <a href="/#pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="/health" className="hover:text-white transition-colors">API</a>
        </nav>
        <address className="text-xs text-gray-500 not-italic">
          © 2026 TokenRouter. All rights reserved.
        </address>
      </div>
    </footer>
  )
}
