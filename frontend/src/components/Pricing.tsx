interface PricingProps {
  onRequestDemo: () => void
}

const plans = [
  {
    name: 'Agent Infrastructure',
    price: '€0.0000275-0.000046',
    unit: '/ 1K tokens',
    cap: 'Monthly cap: €250 | Annual cap: €3,000',
    desc: 'Reliable multi-model infrastructure for your AI agents with automatic fallback.',
    features: [
      'Multi-model API gateway',
      'Automatic provider fallback',
      'Intelligent routing & cost optimization',
      'Usage analytics dashboard',
      '+ AI provider token costs'
    ],
    featured: false
  },
  {
    name: 'Agent Compliance',
    price: '€0.10',
    unit: '/ API call',
    cap: 'Monthly cap: €2,500 | Annual cap: €30,000',
    desc: 'Full compliance layer for AI agents: EU AI Act, GDPR, and complete audit trails.',
    features: [
      'EU AI Act compliance validation',
      'Semantic PII masking',
      'Complete audit logging',
      'Regulatory documentation',
      'Priority support',
      'All Agent Infrastructure features'
    ],
    featured: true
  },
  {
    name: 'Enterprise Setup',
    price: '€500',
    unit: '/ hour',
    cap: 'Project cap: €5,000',
    desc: 'Custom integration and implementation for your agent systems.',
    features: [
      'On-site implementation',
      'Agent integration support',
      'Custom workflow design',
      'Dedicated account manager',
      'SLA customization'
    ],
    featured: false
  }
]

export default function Pricing({ onRequestDemo }: PricingProps) {
  return (
    <section id="pricing" className="py-20 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Pricing</div>
          <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">Simple, Transparent Pricing</h2>
          <p className="text-text-light max-w-2xl mx-auto">Choose the plan that fits your business. No hidden fees, no surprises.</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <div 
              key={i} 
              className={`bg-white rounded-2xl p-6 border ${plan.featured ? 'border-primary shadow-xl ring-2 ring-primary/20' : 'border-gray-100'} relative`}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold px-4 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              
              <h3 className="text-xl font-bold text-text mb-2">{plan.name}</h3>
              
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-3xl font-extrabold text-primary">{plan.price}</span>
                <span className="text-text-light text-sm">{plan.unit}</span>
              </div>
              
              <div className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full mb-4">
                {plan.cap}
              </div>
              
              <p className="text-text-light text-sm mb-6 pb-6 border-b border-gray-100">{plan.desc}</p>
              
              <ul className="space-y-3 mb-6">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-text">
                    <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              
              <button 
                onClick={onRequestDemo}
                className={`w-full py-3 rounded-lg font-semibold transition-colors ${plan.featured ? 'bg-primary hover:bg-primary-dark text-white' : 'border-2 border-primary text-primary hover:bg-primary hover:text-white'}`}
              >
                Get Started
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
