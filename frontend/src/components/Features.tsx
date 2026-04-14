export default function Features() {
  const features = [
    {
      icon: '🔒',
      bg: 'bg-primary/10',
      title: 'Privacy-First Processing',
      desc: 'Sensitive data never leaves your infrastructure unprotected. Local PII detection and masking ensures GDPR compliance.'
    },
    {
      icon: '🛡️',
      bg: 'bg-red-100',
      title: 'EU AI Act Compliance',
      desc: 'Built-in compliance validation for high-risk AI systems. Automated audit trails and regulatory documentation.'
    },
    {
      icon: '✅',
      bg: 'bg-green-100',
      title: 'Verifiable Results',
      desc: 'Every AI decision is logged, traced, and explainable. Full transparency for your agents actions and outputs.'
    },
    {
      icon: '🔄',
      bg: 'bg-violet-100',
      title: 'Reliable Automation',
      desc: 'Multi-model fallback ensures your agents never fail due to provider outages. Continuous operation guaranteed.'
    },
    {
      icon: '📊',
      bg: 'bg-amber-100',
      title: 'Cost Predictability',
      desc: 'PAYG pricing with monthly caps. Know exactly what your AI automation costs — no surprises.'
    },
    {
      icon: '🔗',
      bg: 'bg-sky-100',
      title: 'Multi-Model Integration',
      desc: 'Connect OpenAI, Anthropic, Google, DeepSeek seamlessly. Your agents use the best model for each task.'
    }
  ]

  return (
    <section id="features" className="py-20 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Core Capabilities</div>
          <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">Make Your AI Agents Trustworthy</h2>
          <p className="text-text-light max-w-2xl mx-auto">Enterprise-grade reliability, compliance, and privacy for your AI automation.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-lg hover:border-primary/30 transition-all">
              <div className={`w-10 h-10 ${f.bg} rounded-lg flex items-center justify-center text-xl mb-4`}>
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold text-text mb-2">{f.title}</h3>
              <p className="text-text-light text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
