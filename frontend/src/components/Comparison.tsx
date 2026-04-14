export default function Comparison() {
  return (
    <section id="comparison" className="py-20 px-4 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Competitive Analysis</div>
          <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">Why TokenRouter for AI Agents?</h2>
          <p className="text-text-light max-w-2xl mx-auto">The trusted infrastructure layer for enterprise AI agent deployment.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-4 px-4 text-sm font-semibold text-text-light uppercase tracking-wider">Capability</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-text-light uppercase tracking-wider">Building In-House</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-text-light uppercase tracking-wider">Other Solutions</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-primary uppercase tracking-wider bg-primary/5 rounded-t-lg">TokenRouter</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {[
                ['Privacy-First Processing', 'Complex to implement', 'Limited', 'Native', true],
                ['EU AI Act Compliance', '6-12 months', 'Partial', 'Full compliance', true],
                ['Agent Reliability', 'No automatic fallback', 'Basic', 'Multi-model failover', true],
                ['Time to Deploy', 'Months', 'Weeks', 'Days', true],
                ['Cost at Scale', 'High (infrastructure)', 'Variable', 'Predictable PAYG', true],
                ['Audit & Traceability', 'Custom build', 'Limited', 'Complete logs', true],
              ].map((row, i) => (
                <tr key={i} className={`border-b border-gray-100 ${row[4] ? 'bg-primary/5' : ''}`}>
                  <td className="py-4 px-4 font-medium text-text">{row[0]}</td>
                  <td className="py-4 px-4 text-text-light">{row[1]}</td>
                  <td className="py-4 px-4 text-text-light">{row[2]}</td>
                  <td className={`py-4 px-4 font-semibold ${row[4] ? 'text-primary' : 'text-text'}`}>{row[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
