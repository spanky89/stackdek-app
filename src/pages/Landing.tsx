import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../api/supabaseClient'

export default function LandingPage() {
  const nav = useNavigate()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        setIsLoggedIn(true)
        nav('/', { replace: true })
      }
      setLoading(false)
    }
    checkSession()
  }, [nav])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="border-b border-neutral-200 sticky top-0 bg-white/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 3h9v9H3V3zm9-3h9v9h-9V0zm0 12h9v9h-9v-9zM0 12h9v9H0v-9z" />
              </svg>
            </div>
            <span className="text-lg font-bold">StackDek</span>
          </div>
          <button
            onClick={() => nav('/login')}
            className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors"
          >
            Sign In
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-16 sm:py-24">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-neutral-900 mb-6">
            Job tracking for contractors.
          </h1>
          <p className="text-xl text-neutral-600 mb-8">
            Manage jobs, clients, quotes, and invoices all from one dashboard. Get organized, get paid faster.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => nav('/login')}
              className="px-6 py-3 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 transition-colors"
            >
              Get Started Free
            </button>
            <button
              onClick={() => nav('/login')}
              className="px-6 py-3 bg-white border border-neutral-200 rounded-lg font-medium hover:bg-neutral-50 transition-colors"
            >
              View Demo
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-3 gap-8 mt-16">
          <div className="bg-white rounded-lg border border-neutral-200 p-8">
            <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-neutral-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Job Tracking</h3>
            <p className="text-sm text-neutral-600">Keep all your jobs organized in one place. Track status, timeline, and progress easily.</p>
          </div>

          <div className="bg-white rounded-lg border border-neutral-200 p-8">
            <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-neutral-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Quotes & Invoices</h3>
            <p className="text-sm text-neutral-600">Create professional quotes and invoices in seconds. Get paid faster with online payment links.</p>
          </div>

          <div className="bg-white rounded-lg border border-neutral-200 p-8">
            <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-neutral-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-2a6 6 0 0112 0v2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Client Management</h3>
            <p className="text-sm text-neutral-600">Keep detailed client profiles. Track communication, history, and notes all in one place.</p>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="max-w-6xl mx-auto px-6 py-16 sm:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-neutral-900 mb-4">Used by contractors everywhere</h2>
          <p className="text-neutral-600">Join hundreds of contractors who are already saving time with StackDek</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-neutral-200 rounded-full"></div>
              <div>
                <p className="font-semibold text-neutral-900 text-sm">Mike Johnson</p>
                <p className="text-xs text-neutral-600">Painting Contractor</p>
              </div>
            </div>
            <p className="text-sm text-neutral-600">"StackDek cuts my admin time in half. I can finally focus on the actual work."</p>
          </div>

          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-neutral-200 rounded-full"></div>
              <div>
                <p className="font-semibold text-neutral-900 text-sm">Sarah Chen</p>
                <p className="text-xs text-neutral-600">Roofing Business</p>
              </div>
            </div>
            <p className="text-sm text-neutral-600">"Getting invoices out the door is now 10 minutes instead of an hour. Game changer."</p>
          </div>

          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-neutral-200 rounded-full"></div>
              <div>
                <p className="font-semibold text-neutral-900 text-sm">David Martinez</p>
                <p className="text-xs text-neutral-600">Handyman Services</p>
              </div>
            </div>
            <p className="text-sm text-neutral-600">"Finally have a system that actually works for how contractors do business."</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-6 py-16 sm:py-24 text-center">
        <h2 className="text-4xl font-bold text-neutral-900 mb-6">Ready to get organized?</h2>
        <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
          Start for free. No credit card required. Cancel anytime.
        </p>
        <button
          onClick={() => nav('/login')}
          className="px-8 py-3 bg-neutral-900 text-white rounded-lg font-medium text-lg hover:bg-neutral-800 transition-colors"
        >
          Get Started Now
        </button>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 py-8 mt-16">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-neutral-600">
          <p>© 2026 StackDek. Built by contractors, for contractors.</p>
        </div>
      </footer>
    </div>
  )
}
