export default function Story() {
  return (
    <section id="story" className="py-20 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Our Vision</div>
          <h2 className="text-3xl md:text-4xl font-bold text-text">Building Trust in AI Agents</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-gray-50 rounded-2xl p-8 border-t-4 border-yellow-400">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center text-2xl mb-6">
              🔒
            </div>
            <h3 className="text-xl font-bold text-text mb-4">The Challenge</h3>
            <p className="text-text-light leading-relaxed">
              AI agents are transforming enterprise automation, but they face critical challenges: data privacy leaks,
              regulatory compliance risks, and unreliable outputs. Enterprises cannot afford to deploy AI agents
              that they cannot trust or explain.
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 border-t-4 border-primary">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-2xl mb-6">
              🤖
            </div>
            <h3 className="text-xl font-bold text-text mb-4">The Solution</h3>
            <p className="text-text-light leading-relaxed">
              TokenRouter provides the trusted infrastructure layer for AI agents. We ensure data privacy
              through local processing, guarantee EU AI Act compliance, and deliver reliable, auditable results —
              so your agents can operate with confidence.
            </p>
          </div>
        </div>

        <div className="mt-12 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-8 text-center border border-primary/20">
          <p className="text-xl text-text font-medium italic">
            "Making AI Agents reliable, compliant, and trustworthy<br />
            <span className="text-primary font-bold">for enterprise automation</span>"
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg text-sm">
            🇪🇺 Built for EU AI Act Compliance
          </div>
        </div>
      </div>
    </section>
  )
}
