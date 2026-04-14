interface NavbarProps {
  onRequestDemo: () => void
}

export default function Navbar({ onRequestDemo }: NavbarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100" role="banner">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
        <div className="flex justify-between items-center h-16">
          <a href="/" className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent" aria-label="TokenRouter Home">
            TokenRouter
          </a>
          <div className="hidden md:flex items-center gap-8">
            <a href="#story" className="text-text-light hover:text-primary transition-colors">Our Story</a>
            <a href="#features" className="text-text-light hover:text-primary transition-colors">Features</a>
            <a href="#pricing" className="text-text-light hover:text-primary transition-colors">Pricing</a>
            <a href="#comparison" className="text-text-light hover:text-primary transition-colors">Why Us</a>
          </div>
          <button
            onClick={onRequestDemo}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg font-semibold transition-colors"
            aria-label="Request a demo"
          >
            Request Demo
          </button>
        </div>
      </nav>
    </header>
  )
}
