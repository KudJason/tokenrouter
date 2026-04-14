import { useState, useEffect, useCallback } from 'react'

const API_BASE = window.location.origin

// ============ Types ============
interface User {
  id: string
  username: string
  email: string
}

interface APIKey {
  key_hash: string
  company_id: string
  key_name: string | null
  created_at: number
  last_used_at: number | null
  is_active: boolean
  is_enabled: boolean
  rate_limit_rpm: number
  token_limit: number
  token_used: number
}

interface UsageStats {
  totals: { prompt_tokens: number; completion_tokens: number; total_tokens: number; cost_usd: number; request_count: number }
  by_provider: Record<string, any>
  daily: any[]
}

interface AuditLog {
  id: string
  action: string
  key_id: string
  company_id: string
  details: string
  created_at: number
  timestamp?: number
  status?: string
  provider?: string
  model?: string
  pii_detected?: boolean
}

interface ProviderInfo {
  name: string
  enabled: boolean
  error?: string
  models: string[]
  stats?: any
}

// ============ Main Dashboard ============
export default function Dashboard() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'))
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers: { ...headers, ...options.headers as Record<string, string> } })
    if (res.status === 401) {
      localStorage.removeItem('auth_token')
      setToken(null)
      setUser(null)
      return null
    }
    return res.json()
  }, [token])

  useEffect(() => {
    if (token) {
      apiCall('/v1/admin/me').then((data: any) => {
        if (data?.user) setUser(data.user)
      })
    }
  }, [token, apiCall])

  const login = async (username: string, password: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/v1/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()
      if (data.success) {
        setToken(data.token)
        setUser(data.user)
        localStorage.setItem('auth_token', data.token)
      } else {
        setError(data.error || 'Login failed')
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setToken('')
    setUser(null)
    localStorage.removeItem('auth_token')
  }

  if (!token) {
    return <LoginPage onLogin={login} error={error} loading={loading} />
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'keys', label: 'API Keys', icon: '🔑' },
    { id: 'usage', label: 'Usage Stats', icon: '📈' },
    { id: 'models', label: 'AI Models', icon: '🤖' },
    { id: 'audit', label: 'Audit Logs', icon: '📋' },
    { id: 'privacy', label: 'Privacy', icon: '🔒' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Header */}
      <header style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '0.75rem 2rem', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, #0EA5E9 0%, #EF4444 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.875rem' }}>TR</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>TokenRouter</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Admin Dashboard</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>{user?.email || user?.username}</span>
            <button onClick={logout} style={{ padding: '0.5rem 1rem', border: '1px solid #475569', borderRadius: 6, background: 'transparent', color: '#e2e8f0', cursor: 'pointer', fontSize: '0.875rem' }}>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', gap: '0.25rem', padding: '0 2rem', overflowX: 'auto' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '1rem 1.5rem',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #0EA5E9' : '2px solid transparent',
                color: activeTab === tab.id ? '#0EA5E9' : '#94a3b8',
                fontWeight: 500,
                background: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        {activeTab === 'overview' && <OverviewTab apiCall={apiCall} />}
        {activeTab === 'keys' && <KeysTab apiCall={apiCall} />}
        {activeTab === 'usage' && <UsageTab apiCall={apiCall} />}
        {activeTab === 'models' && <ModelsTab apiCall={apiCall} />}
        {activeTab === 'audit' && <AuditTab apiCall={apiCall} />}
        {activeTab === 'privacy' && <PrivacyTab apiCall={apiCall} />}
      </main>
    </div>
  )
}

// ============ Login Page ============
function LoginPage({ onLogin, error, loading }: { onLogin: (u: string, p: string) => void; error: string; loading: boolean }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
      <div style={{ background: '#1e293b', padding: '2.5rem', borderRadius: 16, border: '1px solid #334155', width: '100%', maxWidth: 420, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg, #0EA5E9 0%, #EF4444 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.5rem', margin: '0 auto 1rem' }}>TR</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>TokenRouter</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Admin Dashboard</p>
        </div>

        <form onSubmit={e => { e.preventDefault(); onLogin(username, password) }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#e2e8f0' }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #334155', borderRadius: 8, background: '#0f172a', color: '#e2e8f0', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
              placeholder="Enter username"
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#e2e8f0' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #334155', borderRadius: 8, background: '#0f172a', color: '#e2e8f0', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
              placeholder="Enter password"
            />
          </div>
          {error && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.875rem', padding: '0.75rem', background: 'rgba(239,68,68,0.1)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)' }}>{error}</div>}
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '0.875rem', background: loading ? '#475569' : 'linear-gradient(135deg, #0EA5E9 0%, #0284c7 100%)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ============ Overview Tab ============
function OverviewTab({ apiCall }: { apiCall: (e: string, o?: RequestInit) => Promise<any> }) {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiCall('/v1/admin/keys'),
      apiCall('/v1/admin/usage'),
      apiCall('/v1/admin/audit?limit=5'),
    ]).then(([keysData, usageData, auditData]) => {
      setStats({
        totalKeys: keysData?.count || 0,
        activeKeys: keysData?.keys?.filter((k: APIKey) => k.is_active).length || 0,
        totalRequests: usageData?.totals?.request_count || 0,
        totalCost: usageData?.totals?.cost_usd || 0,
        recentLogs: auditData?.logs || []
      })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [apiCall])

  if (loading) return <LoadingSkeleton />

  const statCards = [
    { label: 'Total API Keys', value: stats.totalKeys, color: '#0EA5E9', icon: '🔑' },
    { label: 'Active Keys', value: stats.activeKeys, color: '#10b981', icon: '✅' },
    { label: 'Total Requests', value: stats.totalRequests.toLocaleString(), color: '#8b5cf6', icon: '📊' },
    { label: 'Total Cost', value: `$${stats.totalCost.toFixed(4)}`, color: '#f59e0b', icon: '💰' },
  ]

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>System Overview</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {statCards.map((stat, i) => (
          <div key={i} style={{ background: '#1e293b', borderRadius: 12, padding: '1.5rem', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{stat.label}</div>
              <span style={{ fontSize: '1.5rem' }}>{stat.icon}</span>
            </div>
            <div style={{ fontSize: '2.25rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#1e293b', borderRadius: 12, padding: '1.5rem', border: '1px solid #334155' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Recent Activity</h3>
        {stats.recentLogs.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {stats.recentLogs.map((log: AuditLog, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#0f172a', borderRadius: 8 }}>
                <div>
                  <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ padding: '0.125rem 0.5rem', background: '#334155', borderRadius: 4, fontSize: '0.75rem' }}>{log.company_id || 'system'}</span>
                    {log.action || log.status || 'Unknown'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                    {log.provider && <span style={{ marginRight: '0.75rem' }}>via {log.provider}</span>}
                    {log.model && <span>{log.model}</span>}
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date((log.timestamp || log.created_at) * 1000).toLocaleString()}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>No recent activity</div>
        )}
      </div>
    </div>
  )
}

// ============ API Keys Tab ============
function KeysTab({ apiCall }: { apiCall: (e: string, o?: RequestInit) => Promise<any> }) {
  const [keys, setKeys] = useState<APIKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [editingKey, setEditingKey] = useState<APIKey | null>(null)
  const [editTokenLimit, setEditTokenLimit] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)

  const loadKeys = useCallback(() => {
    apiCall('/v1/admin/keys').then((data: any) => {
      if (data?.keys) setKeys(data.keys)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [apiCall])

  useEffect(() => { loadKeys() }, [loadKeys])

  const createKey = async () => {
    if (!newKeyName.trim()) return
    setCreating(true)
    const data = await apiCall('/v1/admin/keys', {
      method: 'POST',
      body: JSON.stringify({ key_name: newKeyName })
    })
    if (data?.api_key) {
      setCreatedKey(data.api_key)
    } else if (data?.error) {
      alert(data.error)
    }
    setCreating(false)
    setShowCreateForm(false)
    setNewKeyName('')
    loadKeys()
  }

  const revokeKey = async (hash: string) => {
    if (!confirm('Revoke this API key? This action cannot be undone.')) return
    await apiCall(`/v1/admin/keys/${hash}`, { method: 'DELETE' })
    loadKeys()
  }

  const rotateKey = async (hash: string) => {
    if (!confirm('Rotate this API key? A new key will be generated and the old one will be revoked.')) return
    const data = await apiCall(`/v1/admin/keys/${hash}/rotate`, { method: 'POST' })
    if (data?.api_key) {
      setCreatedKey(data.api_key)
    } else if (data?.error) {
      alert(data.error)
    }
    loadKeys()
  }

  const openEditModal = (key: APIKey) => {
    setEditingKey(key)
    setEditTokenLimit(key.token_limit === 0 ? '' : String(key.token_limit))
    setShowEditModal(true)
  }

  const saveTokenLimit = async () => {
    if (!editingKey) return
    const limit = editTokenLimit.trim() === '' ? 0 : parseInt(editTokenLimit)
    if (isNaN(limit) || limit < 0) {
      alert('Please enter a valid number (0 for unlimited, or a positive number)')
      return
    }
    const data = await apiCall(`/v1/admin/keys/${editingKey.key_hash}/token-limit`, {
      method: 'PUT',
      body: JSON.stringify({ token_limit: limit })
    })
    if (data?.success) {
      alert(data.message)
      setShowEditModal(false)
      loadKeys()
    } else {
      alert(data?.error || 'Failed to update token limit')
    }
  }

  const resetUsage = async (hash: string) => {
    if (!confirm('Reset token usage to 0?')) return
    const data = await apiCall(`/v1/admin/keys/${hash}/reset-usage`, { method: 'POST' })
    if (data?.success) {
      alert('Token usage reset successfully')
      loadKeys()
    } else {
      alert(data?.error || 'Failed to reset usage')
    }
  }

  const copyKey = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>API Keys</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Manage your API keys for accessing the TokenRouter API</p>
        </div>
        <button
          onClick={() => { setShowCreateForm(true); setCreatedKey(null); }}
          style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
        >
          + Create New Key
        </button>
      </div>

      {/* Create Key Modal */}
      {showCreateForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#1e293b', borderRadius: 16, padding: '2rem', border: '1px solid #334155', width: '100%', maxWidth: 480 }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Create New API Key</h3>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Key Name / Label</label>
              <input
                type="text"
                value={newKeyName}
                onChange={e => setNewKeyName(e.target.value)}
                placeholder="e.g., Production Server, Development"
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #334155', borderRadius: 8, background: '#0f172a', color: '#e2e8f0', fontSize: '1rem', boxSizing: 'border-box' }}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowCreateForm(false); setCreatedKey(null); }} style={{ padding: '0.75rem 1.5rem', border: '1px solid #334155', borderRadius: 8, background: 'transparent', color: '#e2e8f0', cursor: 'pointer' }}>Cancel</button>
              <button onClick={createKey} disabled={creating || !newKeyName.trim()} style={{ padding: '0.75rem 1.5rem', background: creating ? '#475569' : '#10b981', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer' }}>{creating ? 'Creating...' : 'Create Key'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Created Key Display */}
      {createdKey && (
        <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.05) 100%)', borderRadius: 12, padding: '1.5rem', border: '1px solid #10b981', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontWeight: 600, marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.25rem' }}>✅</span> API Key Created / Rotated Successfully!
          </div>
          <div style={{ background: '#0f172a', padding: '1rem', borderRadius: 8, fontFamily: 'monospace', fontSize: '0.875rem', wordBreak: 'break-all', marginBottom: '1rem' }}>{createdKey}</div>
          <div style={{ color: '#f59e0b', fontSize: '0.875rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>⚠️</span> Copy this key now. You won't be able to see it again!
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={copyKey} style={{ padding: '0.75rem 1.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
              {copied ? '✓ Copied!' : '📋 Copy to Clipboard'}
            </button>
            <button onClick={() => setCreatedKey(null)} style={{ padding: '0.75rem 1.5rem', border: '1px solid #334155', borderRadius: 8, background: 'transparent', color: '#e2e8f0', cursor: 'pointer' }}>Done</button>
          </div>
        </div>
      )}

      {/* Edit Token Limit Modal */}
      {showEditModal && editingKey && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#1e293b', borderRadius: 16, padding: '2rem', border: '1px solid #334155', width: '100%', maxWidth: 420 }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Edit Token Limit</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Set the maximum number of tokens this key can use. Leave empty or enter 0 for unlimited.</p>
            <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
              Key: <span style={{ fontFamily: 'monospace', color: '#e2e8f0' }}>{editingKey.key_name || editingKey.key_hash.substring(0, 16)}...</span>
            </div>
            <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
              Current Usage: <span style={{ color: '#e2e8f0' }}>{(editingKey.token_used || 0).toLocaleString()} / {editingKey.token_limit === 0 ? '∞' : (editingKey.token_limit || 100000).toLocaleString()}</span>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Token Limit</label>
              <input
                type="number"
                value={editTokenLimit}
                onChange={e => setEditTokenLimit(e.target.value)}
                placeholder="100000 (leave empty for unlimited)"
                min="0"
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #334155', borderRadius: 8, background: '#0f172a', color: '#e2e8f0', fontSize: '1rem', boxSizing: 'border-box' }}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowEditModal(false)} style={{ padding: '0.75rem 1.5rem', border: '1px solid #334155', borderRadius: 8, background: 'transparent', color: '#e2e8f0', cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveTokenLimit} style={{ padding: '0.75rem 1.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <LoadingSkeleton /> : (
        <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0f172a' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Key Prefix</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Token Usage</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Token Limit</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key, i) => (
                <tr key={i} style={{ borderTop: '1px solid #334155' }}>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{key.key_name || 'Unnamed'}</td>
                  <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.875rem', color: '#94a3b8' }}>{key.key_hash.substring(0, 16)}...</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ padding: '0.25rem 0.75rem', borderRadius: 9999, fontSize: '0.75rem', fontWeight: 600, background: key.is_active ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: key.is_active ? '#10b981' : '#ef4444' }}>
                      {key.is_active ? 'Active' : 'Revoked'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ background: '#0f172a', borderRadius: 4, height: 8, width: 80, overflow: 'hidden' }}>
                        <div style={{
                          background: (key.token_used || 0) >= (key.token_limit || 100000) ? '#ef4444' : '#10b981',
                          height: '100%',
                          width: `${Math.min(100, ((key.token_used || 0) / ((key.token_limit || 100000) === 0 ? 100000 : (key.token_limit || 100000))) * 100)}%`
                        }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                        {(key.token_used || 0).toLocaleString()}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', color: '#94a3b8' }}>
                    {key.token_limit === 0 ? '∞ (Unlimited)' : (key.token_limit || 100000).toLocaleString()}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {key.is_active && (
                        <>
                          <button onClick={() => openEditModal(key)} style={{ color: '#0EA5E9', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', padding: 0, fontWeight: 500 }}>Edit Limit</button>
                          <button onClick={() => rotateKey(key.key_hash)} style={{ color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', padding: 0, fontWeight: 500 }}>Rotate</button>
                          <button onClick={() => resetUsage(key.key_hash)} style={{ color: '#8b5cf6', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', padding: 0, fontWeight: 500 }}>Reset</button>
                          <button onClick={() => revokeKey(key.key_hash)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', padding: 0, fontWeight: 500 }}>Revoke</button>
                        </>
                      )}
                      {!key.is_active && <span style={{ color: '#64748b', fontSize: '0.75rem' }}>-</span>}
                    </div>
                  </td>
                </tr>
              ))}
              {keys.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No API keys yet. Create your first key above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ============ Usage Tab ============
function UsageTab({ apiCall }: { apiCall: (e: string, o?: RequestInit) => Promise<any> }) {
  const [usage, setUsage] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiCall('/v1/admin/usage').then((data: any) => {
      if (data?.success) setUsage(data)
      else setUsage({ totals: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, cost_usd: 0, request_count: 0 }, by_provider: {}, daily: [] })
      setLoading(false)
    }).catch(() => {
      setUsage({ totals: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, cost_usd: 0, request_count: 0 }, by_provider: {}, daily: [] })
      setLoading(false)
    })
  }, [apiCall])

  if (loading) return <LoadingSkeleton />

  const stats = [
    { label: 'Total Requests', value: usage?.totals.request_count || 0, color: '#0EA5E9', icon: '📊' },
    { label: 'Prompt Tokens', value: (usage?.totals.prompt_tokens || 0).toLocaleString(), color: '#8b5cf6', icon: '📝' },
    { label: 'Completion Tokens', value: (usage?.totals.completion_tokens || 0).toLocaleString(), color: '#f59e0b', icon: '✨' },
    { label: 'AI Provider Cost', value: `$${(usage?.totals.cost_usd || 0).toFixed(4)}`, color: '#10b981', icon: '💰' },
  ]

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Usage Statistics</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {stats.map((stat, i) => (
          <div key={i} style={{ background: '#1e293b', borderRadius: 12, padding: '1.5rem', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{stat.label}</div>
              <span style={{ fontSize: '1.25rem' }}>{stat.icon}</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Provider Breakdown */}
      {Object.keys(usage?.by_provider || {}).length > 0 && (
        <div style={{ background: '#1e293b', borderRadius: 12, padding: '1.5rem', border: '1px solid #334155', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>By Provider</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Object.entries(usage?.by_provider || {}).map(([provider, data]: [string, any]) => (
              <div key={provider} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#0f172a', borderRadius: 8 }}>
                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{provider}</span>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8' }}>{data.request_count.toLocaleString()} requests</span>
                  <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: '0.875rem' }}>${data.cost_usd.toFixed(4)} (pass-through)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Chart */}
      {usage?.daily && usage.daily.length > 0 && (
        <div style={{ background: '#1e293b', borderRadius: 12, padding: '1.5rem', border: '1px solid #334155' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Daily Requests (Last 14 Days)</h3>
          <div style={{ display: 'flex', alignItems: 'end', gap: '0.5rem', height: 120 }}>
            {usage.daily.slice(-14).map((day: any, i: number) => {
              const maxRequests = Math.max(...usage.daily.map((d: any) => d.request_count || 0), 1)
              const height = ((day.request_count || 0) / maxRequests) * 100
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '100%', background: 'linear-gradient(to top, #0EA5E9, #38bdf8)', borderRadius: 4, height: `${Math.max(height, 4)}%`, minHeight: 4 }} title={`${day.request_count || 0} requests`} />
                  <span style={{ fontSize: '0.625rem', color: '#64748b' }}>{new Date(day.date).getDate()}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {Object.keys(usage?.by_provider || {}).length === 0 && (!usage?.daily || usage.daily.length === 0) && (
        <div style={{ background: '#1e293b', borderRadius: 12, padding: '3rem', border: '1px solid #334155', textAlign: 'center', color: '#64748b' }}>
          No usage data yet. Start making API requests to see statistics here.
        </div>
      )}
    </div>
  )
}

// ============ Models Tab ============
function ModelsTab({ apiCall }: { apiCall: (e: string, o?: RequestInit) => Promise<any> }) {
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiCall('/v1/admin/models').then((data: any) => {
      if (data?.providers) {
        setProviders(data.providers)
      } else {
        // Fallback to default providers
        setProviders([
          { name: 'openai', enabled: false, models: ['gpt-4o', 'gpt-4o-mini'], stats: null },
          { name: 'anthropic', enabled: false, models: ['claude-3-5-sonnet', 'claude-3-5-haiku'], stats: null },
          { name: 'google', enabled: false, models: ['gemini-1.5-pro', 'gemini-1.5-flash'], stats: null },
          { name: 'mistral', enabled: false, models: ['mistral-large', 'mistral-small'], stats: null },
          { name: 'meta', enabled: false, models: ['llama-3-1-70b'], stats: null },
        ])
      }
      setLoading(false)
    }).catch(() => {
      setProviders([
        { name: 'openai', enabled: false, models: ['gpt-4o', 'gpt-4o-mini'], stats: null },
        { name: 'anthropic', enabled: false, models: ['claude-3-5-sonnet', 'claude-3-5-haiku'], stats: null },
        { name: 'google', enabled: false, models: ['gemini-1.5-pro', 'gemini-1.5-flash'], stats: null },
        { name: 'mistral', enabled: false, models: ['mistral-large', 'mistral-small'], stats: null },
        { name: 'meta', enabled: false, models: ['llama-3-1-70b'], stats: null },
      ])
      setLoading(false)
    })
  }, [apiCall])

  const providerLogos: Record<string, string> = {
    openai: '🤖',
    anthropic: '🧠',
    google: '🌐',
    mistral: '🌊',
    meta: '🔵',
    deepseek: '🐉'
  }

  if (loading) return <LoadingSkeleton />

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>AI Models</h2>
      <p style={{ color: '#94a3b8', marginBottom: '1.5rem', fontSize: '0.875rem' }}>AI providers configuration. Users can BYOK (Bring Your Own Key) to use their own API keys.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {providers.map(provider => (
          <div key={provider.name} style={{ background: '#1e293b', borderRadius: 12, padding: '1.5rem', border: provider.enabled ? '1px solid #10b981' : '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: provider.enabled ? '1rem' : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '2rem' }}>{providerLogos[provider.name] || '🤖'}</span>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, textTransform: 'capitalize' }}>{provider.name}</h3>
                  {provider.enabled && provider.stats && (
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                      {provider.stats.requests?.toLocaleString() || 0} requests · ${provider.stats.cost_usd?.toFixed(4) || '0.00'} (pass-through)
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {provider.enabled ? (
                  <span style={{ padding: '0.25rem 0.75rem', background: 'rgba(16,185,129,0.2)', color: '#10b981', borderRadius: 9999, fontSize: '0.75rem', fontWeight: 600 }}>Enabled</span>
                ) : (
                  <span style={{ padding: '0.25rem 0.75rem', background: 'rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: 9999, fontSize: '0.75rem', fontWeight: 600 }}>Disabled</span>
                )}
                <div style={{ width: 48, height: 28, borderRadius: 14, background: provider.enabled ? '#10b981' : '#334155', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                  <div style={{ width: 24, height: 24, borderRadius: 12, background: 'white', position: 'absolute', top: 2, left: provider.enabled ? 22 : 2, transition: 'left 0.2s' }} />
                </div>
              </div>
            </div>

            {provider.enabled && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #334155' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Available Models</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {provider.models.map(model => (
                    <span key={model} style={{ padding: '0.375rem 0.75rem', background: '#0f172a', borderRadius: 6, fontSize: '0.875rem', fontFamily: 'monospace' }}>{model}</span>
                  ))}
                </div>
              </div>
            )}

            {!provider.enabled && (
              <div style={{ marginTop: '1rem', color: '#64748b', fontSize: '0.875rem' }}>
                Configure API key in secrets to enable this provider
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============ Audit Tab ============
function AuditTab({ apiCall }: { apiCall: (e: string, o?: RequestInit) => Promise<any> }) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    apiCall('/v1/admin/audit?limit=100').then((data: any) => {
      if (data?.logs) setLogs(data.logs)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [apiCall])

  const filteredLogs = logs.filter(log =>
    !filter ||
    (log.action || '').toLowerCase().includes(filter.toLowerCase()) ||
    (log.company_id || '').toLowerCase().includes(filter.toLowerCase()) ||
    (log.status || '').toLowerCase().includes(filter.toLowerCase()) ||
    (log.provider || '').toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Audit Logs</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Track all API operations and security events</p>
        </div>
        <input
          type="text"
          placeholder="Filter by action, company, provider..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ padding: '0.75rem 1rem', border: '1px solid #334155', borderRadius: 8, background: '#1e293b', color: '#e2e8f0', fontSize: '0.875rem', width: 300 }}
        />
      </div>

      {loading ? <LoadingSkeleton /> : (
        <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0f172a' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Time</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Company</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Provider</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>PII</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.slice(0, 50).map((log, i) => (
                <tr key={i} style={{ borderTop: '1px solid #334155' }}>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{new Date((log.timestamp || log.created_at) * 1000).toLocaleString()}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ padding: '0.25rem 0.5rem', background: '#0f172a', borderRadius: 4, fontSize: '0.75rem' }}>{log.company_id || 'system'}</span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ padding: '0.25rem 0.5rem', background: log.status === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: log.status === 'success' ? '#10b981' : '#ef4444', borderRadius: 4, fontSize: '0.75rem' }}>{log.status || 'unknown'}</span>
                  </td>
                  <td style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.875rem' }}>{log.provider || '-'}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                    {log.pii_detected !== undefined && (
                      <span style={{ color: log.pii_detected ? '#f59e0b' : '#64748b' }}>{log.pii_detected ? '⚠️ Detected' : '✓ None'}</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No audit logs found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ============ Privacy Tab ============
function PrivacyTab({ apiCall }: { apiCall: (e: string, o?: RequestInit) => Promise<any> }) {
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiCall('/v1/admin/privacy-report').then((data: any) => {
      setReport(data)
      setLoading(false)
    }).catch(() => {
      setReport({ total_requests: 0, pii_detected_count: 0, sensitivity_breakdown: { none: 0, low: 0, medium: 0, high: 0 } })
      setLoading(false)
    })
  }, [apiCall])

  if (loading) return <LoadingSkeleton />

  const stats = [
    { label: 'Privacy Requests', value: report?.total_requests || 0, color: '#0EA5E9', icon: '🔒' },
    { label: 'PII Detected', value: report?.pii_detected_count || 0, color: '#f59e0b', icon: '⚠️' },
    { label: 'High Sensitivity', value: report?.sensitivity_breakdown?.high || 0, color: '#ef4444', icon: '🔴' },
    { label: 'Medium Sensitivity', value: report?.sensitivity_breakdown?.medium || 0, color: '#f59e0b', icon: '🟡' },
  ]

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Privacy Reports</h2>
      <p style={{ color: '#94a3b8', marginBottom: '1.5rem', fontSize: '0.875rem' }}>Track PII detection and privacy-preserving computations</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {stats.map((stat, i) => (
          <div key={i} style={{ background: '#1e293b', borderRadius: 12, padding: '1.5rem', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{stat.label}</div>
              <span style={{ fontSize: '1.25rem' }}>{stat.icon}</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {report?.pii_type_breakdown && Object.keys(report.pii_type_breakdown).length > 0 && (
        <div style={{ background: '#1e293b', borderRadius: 12, padding: '1.5rem', border: '1px solid #334155' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>PII Type Breakdown</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Object.entries(report.pii_type_breakdown).map(([type, count]: [string, any]) => (
              <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#0f172a', borderRadius: 8 }}>
                <span style={{ fontWeight: 500, textTransform: 'uppercase', fontSize: '0.875rem' }}>{type}</span>
                <span style={{ color: '#94a3b8' }}>{count} detected</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!report?.pii_type_breakdown || Object.keys(report.pii_type_breakdown).length === 0) && (
        <div style={{ background: '#1e293b', borderRadius: 12, padding: '3rem', border: '1px solid #334155', textAlign: 'center', color: '#64748b' }}>
          No privacy compute requests yet. The privacy API will track PII detection here.
        </div>
      )}
    </div>
  )
}

// ============ Loading Skeleton ============
function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ height: 80, background: '#1e293b', borderRadius: 12, animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; } }`}</style>
    </div>
  )
}
