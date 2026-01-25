'use client';

import { Check, X, Mail, Calendar, CreditCard, Shield } from 'lucide-react';

export function TrialTerms() {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 max-w-2xl mx-auto">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-emerald-600" />
        Trial Terms & Policy
      </h3>
      
      <div className="space-y-4 text-sm text-gray-700">
        {/* Duration */}
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-gray-900 mb-1">Duration</p>
            <p className="text-gray-600">7 full days of access to all features. No restrictions, no limits during your trial.</p>
          </div>
        </div>

        {/* The Charge */}
        <div className="flex items-start gap-3">
          <CreditCard className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-gray-900 mb-1">The Charge</p>
            <p className="text-gray-600">
              After 7 days, the selected plan ($99/month for Self-Funded or $149/month for Traditional Search Fund) will be billed to the card on file. 
              <span className="font-semibold text-gray-900"> You won't be charged until Day 8.</span>
            </p>
          </div>
        </div>

        {/* The Reminder */}
        <div className="flex items-start gap-3">
          <Mail className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-gray-900 mb-1">The Reminder</p>
            <p className="text-gray-600">
              We promise to email you 48 hours before your trial ends (on Day 5) so you have time to decide. 
              No surprises, no hidden charges.
            </p>
          </div>
        </div>

        {/* The Exit */}
        <div className="flex items-start gap-3">
          <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-gray-900 mb-1">The Exit</p>
            <p className="text-gray-600">
              No "call to cancel" games. There's a <span className="font-semibold text-gray-900">"Cancel Subscription"</span> button in your settings that works instantly. 
              Cancel anytime during or after your trial—your access continues until the end of your billing period.
            </p>
          </div>
        </div>

        {/* Refunds */}
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-gray-900 mb-1">Refunds</p>
            <p className="text-gray-600">
              We offer a <span className="font-semibold text-gray-900">30-day money-back guarantee</span> even after the first charge if you aren't satisfied. 
              Contact us within 30 days of your first payment for a full refund—no questions asked.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Questions? Contact us at <a href="mailto:support@searchfindr.app" className="text-emerald-600 hover:underline">support@searchfindr.app</a>
        </p>
      </div>
    </div>
  );
}
