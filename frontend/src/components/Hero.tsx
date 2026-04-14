interface HeroProps {
  onRequestDemo: () => void
}

export default function Hero({ onRequestDemo }: HeroProps) {
  return (
    <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-semibold mb-8">
          <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
          EU AI Act Compliant
        </div>
        
        <h1 className="text-5xl md:text-6xl font-extrabold text-text mb-6 leading-tight">
          Trusted AI Agents<br />
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            for Enterprise
          </span>
        </h1>

        <p className="text-xl text-text-light mb-10 max-w-2xl mx-auto">
          TokenRouter provides reliable, compliant AI infrastructure for intelligent automation.
          Data privacy, EU AI Act compliance, and seamless multi-model integration — so your agents can focus on what matters.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <a href="#pricing" className="bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-lg font-semibold transition-colors">
            View Pricing
          </a>
          <button onClick={onRequestDemo} className="border-2 border-primary text-primary hover:bg-primary hover:text-white px-8 py-3 rounded-lg font-semibold transition-colors">
            Request Demo
          </button>
        </div>
        
        <div className="flex flex-wrap justify-center gap-12">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">40x</div>
            <div className="text-sm text-text-light">Cheaper than Enterprise</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">€0</div>
            <div className="text-sm text-text-light">Hidden Fees</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">99.9%</div>
            <div className="text-sm text-text-light">Uptime SLA</div>
          </div>
        </div>
      </div>
    </section>
  )
}
