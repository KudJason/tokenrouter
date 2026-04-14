interface CTASectionProps {
  onRequestDemo: () => void
}

export default function CTASection({ onRequestDemo }: CTASectionProps) {
  return (
    <section className="py-20 px-4 bg-gradient-to-r from-primary to-secondary">
      <div className="max-w-3xl mx-auto text-center text-white">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Deploy Trusted AI Agents?</h2>
        <p className="text-white/80 text-lg mb-10">
          Join enterprises using TokenRouter to make their AI automation reliable, compliant, and trustworthy.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="#pricing" className="bg-white text-primary hover:bg-gray-100 px-8 py-3 rounded-lg font-semibold transition-colors">
            View Pricing
          </a>
          <button onClick={onRequestDemo} className="border-2 border-white text-white hover:bg-white hover:text-primary px-8 py-3 rounded-lg font-semibold transition-colors">
            Request Demo
          </button>
        </div>
      </div>
    </section>
  )
}
