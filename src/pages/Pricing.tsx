import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';
import { PRICING_PLANS } from '../utils/featureGates';
import { ProBadge } from '../components/SubscriptionGuard';

export const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const { subscription, loading } = useSubscription();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const handleUpgrade = async (priceId: string | null) => {
    if (!priceId) {
      // Free plan - navigate back to dashboard
      navigate('/');
      return;
    }

    try {
      // Call your backend to create Stripe Checkout session
      const response = await fetch('/api/create-subscription-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, planId: 'pro' }),
      });

      const { url } = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Failed to start checkout. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading subscription details...</p>
        </div>
      </div>
    );
  }

  const currentTier = subscription?.tier || 'free';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Start free, upgrade when you're ready to scale.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center bg-white rounded-full p-1 shadow-sm">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2 rounded-full font-semibold transition ${
                billingPeriod === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-6 py-2 rounded-full font-semibold transition ${
                billingPeriod === 'yearly'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yearly
              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Free Plan */}
          <PricingCard
            name="Free"
            price="$0"
            period="forever"
            features={PRICING_PLANS.free.features}
            cta="Get Started"
            isCurrentPlan={currentTier === 'free'}
            onSelect={() => handleUpgrade(null)}
          />

          {/* Pro Plan */}
          <PricingCard
            name="Pro"
            price={billingPeriod === 'monthly' ? '$29' : '$279'}
            period={billingPeriod === 'monthly' ? 'per month' : 'per year'}
            features={PRICING_PLANS.pro.features}
            cta={currentTier === 'pro' ? 'Current Plan' : 'Upgrade to Pro'}
            isCurrentPlan={currentTier === 'pro'}
            onSelect={() => handleUpgrade(PRICING_PLANS.pro.priceId!)}
            highlighted
            badge={<ProBadge />}
          />

          {/* Premium Plan */}
          <PricingCard
            name="Premium"
            price={billingPeriod === 'monthly' ? '$99' : '$950'}
            period={billingPeriod === 'monthly' ? 'per month' : 'per year'}
            features={PRICING_PLANS.premium.features}
            cta={currentTier === 'premium' ? 'Current Plan' : 'Upgrade to Premium'}
            isCurrentPlan={currentTier === 'premium'}
            onSelect={() => handleUpgrade(PRICING_PLANS.premium.priceId!)}
          />
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <FAQItem
              question="What happens when I reach my Free tier limits?"
              answer="You'll be prompted to upgrade to Pro. Your data is safe—you just won't be able to create new clients or jobs until you upgrade or wait for the next billing cycle."
            />
            <FAQItem
              question="Can I cancel anytime?"
              answer="Yes! You can cancel anytime from your account settings. You'll keep Pro access until the end of your billing period, then automatically downgrade to Free."
            />
            <FAQItem
              question="What happens to my data if I downgrade?"
              answer="Nothing! All your existing clients, jobs, and invoices stay intact. You just can't create new items beyond the Free tier limits."
            />
            <FAQItem
              question="Do you offer a trial?"
              answer="Yes! All new users get a 14-day Pro trial. No credit card required to start."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Pricing card component
const PricingCard: React.FC<{
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  isCurrentPlan: boolean;
  onSelect: () => void;
  highlighted?: boolean;
  badge?: React.ReactNode;
}> = ({ name, price, period, features, cta, isCurrentPlan, onSelect, highlighted, badge }) => {
  return (
    <div
      className={`bg-white rounded-lg shadow-lg p-8 relative ${
        highlighted ? 'ring-2 ring-purple-500 transform scale-105' : ''
      }`}
    >
      {badge && (
        <div className="absolute top-4 right-4">
          {badge}
        </div>
      )}
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{name}</h3>
        <div className="flex items-baseline">
          <span className="text-4xl font-bold text-gray-900">{price}</span>
          <span className="text-gray-600 ml-2">/ {period}</span>
        </div>
      </div>

      <ul className="space-y-3 mb-8">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-start">
            <svg
              className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onSelect}
        disabled={isCurrentPlan}
        className={`w-full py-3 px-6 rounded-lg font-semibold transition ${
          isCurrentPlan
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
            : highlighted
            ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {cta}
      </button>
    </div>
  );
};

// FAQ item component
const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-200 pb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex justify-between items-center w-full text-left"
      >
        <span className="font-semibold text-gray-900">{question}</span>
        <svg
          className={`w-5 h-5 text-gray-500 transform transition ${isOpen ? 'rotate-180' : ''}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {isOpen && <p className="mt-2 text-gray-600">{answer}</p>}
    </div>
  );
};
