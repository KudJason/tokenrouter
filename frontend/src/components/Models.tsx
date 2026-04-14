const logos = [
  { name: 'OpenAI', color: '#10A37F' },
  { name: 'Anthropic', color: '#E5241B' },
  { name: 'Google', color: '#4285F4' },
  { name: 'Mistral', color: '#CB5CFE' },
  { name: 'Meta', color: '#0668E1' },
]

export default function Models() {
  return (
    <section id="models" className="py-20 px-4 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Powered By</div>
          <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">Leading AI Providers</h2>
          <p className="text-text-light max-w-2xl mx-auto">Seamless integration with the AI models you already trust.</p>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-12">
          {logos.map((logo, i) => (
            <div key={i} className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                style={{ background: logo.color }}
              >
                {logo.name[0]}
              </div>
              <span className="text-xl font-semibold text-text-light">{logo.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
