'use client';

import { useState } from 'react';
import { Calculator, DollarSign, AlertCircle, CheckCircle, Info } from 'lucide-react';
import Link from 'next/link';

export default function SBACalculatorPage() {
  const [purchasePrice, setPurchasePrice] = useState(3000000);
  const [normalizedEBITDA, setNormalizedEBITDA] = useState(600000);
  const [loanPercentage, setLoanPercentage] = useState(80);
  const [interestRate, setInterestRate] = useState(9);
  const [loanTerm, setLoanTerm] = useState(10);
  const [customerConcentration, setCustomerConcentration] = useState(25);

  // Calculate loan amount
  const loanAmount = (purchasePrice * loanPercentage) / 100;
  
  // Calculate annual debt service (simplified amortization)
  const monthlyRate = interestRate / 100 / 12;
  const numPayments = loanTerm * 12;
  const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  const annualDebtService = monthlyPayment * 12;
  
  // Calculate DSCR
  const dscr = normalizedEBITDA / annualDebtService;
  
  // Calculate equity required
  const equityRequired = purchasePrice - loanAmount;
  const equityPercentage = (equityRequired / purchasePrice) * 100;
  
  // Eligibility checks
  const dscrMeets = dscr >= 1.15;
  const dscrPreferred = dscr >= 1.25;
  const equityMeets = equityPercentage >= 10;
  const equityPreferred = equityPercentage >= 15;
  const customerConcentrationOk = customerConcentration < 50;
  const loanAmountOk = loanAmount <= 5000000;
  const ebitdaOk = normalizedEBITDA >= 200000;

  return (
    <div className="min-h-screen bg-[#0b0f17] pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
            SBA 7(a) Loan Calculator
          </h1>
          <p className="text-xl text-white/70">
            Calculate DSCR, eligibility, and loan terms for search fund acquisitions (2026 rules)
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="bg-white/5 rounded-lg p-6 border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Calculator className="w-6 h-6 text-emerald-400" />
              Loan Parameters
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Purchase Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    min="0"
                    step="10000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Normalized EBITDA
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    value={normalizedEBITDA}
                    onChange={(e) => setNormalizedEBITDA(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    min="0"
                    step="10000"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  After QoE adjustments (addbacks, one-time items, etc.)
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Loan Percentage
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    value={loanPercentage}
                    onChange={(e) => setLoanPercentage(Number(e.target.value))}
                    className="flex-1"
                    min="50"
                    max="90"
                    step="5"
                  />
                  <span className="text-white font-semibold w-16 text-right">{loanPercentage}%</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Typical: 70-80% for search fund deals
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Interest Rate (%)
                </label>
                <input
                  type="number"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  min="0"
                  max="15"
                  step="0.25"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Typical: 8-10% (Prime + 2.25-2.75%)
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Loan Term (years)
                </label>
                <select
                  value={loanTerm}
                  onChange={(e) => setLoanTerm(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={7}>7 years</option>
                  <option value={10}>10 years</option>
                  <option value={15}>15 years</option>
                  <option value={20}>20 years</option>
                  <option value={25}>25 years</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Top Customer Concentration (%)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    value={customerConcentration}
                    onChange={(e) => setCustomerConcentration(Number(e.target.value))}
                    className="flex-1"
                    min="0"
                    max="60"
                    step="5"
                  />
                  <span className="text-white font-semibold w-16 text-right">{customerConcentration}%</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  &gt;50% = SBA ineligible
                </p>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {/* Loan Summary */}
            <div className="bg-white/5 rounded-lg p-6 border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-emerald-400" />
                Loan Summary
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/70">Loan Amount:</span>
                  <span className="text-white font-semibold">${loanAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Equity Required:</span>
                  <span className="text-white font-semibold">${equityRequired.toLocaleString('en-US', { maximumFractionDigits: 0 })} ({equityPercentage.toFixed(1)}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Monthly Payment:</span>
                  <span className="text-white font-semibold">${monthlyPayment.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Annual Debt Service:</span>
                  <span className="text-white font-semibold">${annualDebtService.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>

            {/* DSCR */}
            <div className={`rounded-lg p-6 border-2 ${dscrPreferred ? 'bg-emerald-500/10 border-emerald-500/30' : dscrMeets ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-white">DSCR (Debt Service Coverage Ratio)</h3>
                <span className={`text-3xl font-bold ${dscrPreferred ? 'text-emerald-400' : dscrMeets ? 'text-yellow-400' : 'text-red-400'}`}>
                  {dscr.toFixed(2)}x
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {dscrPreferred ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                ) : dscrMeets ? (
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400" />
                )}
                <span className={`text-sm ${dscrPreferred ? 'text-emerald-400' : dscrMeets ? 'text-yellow-400' : 'text-red-400'}`}>
                  {dscrPreferred ? '✅ Meets preferred requirement (≥1.25x)' : dscrMeets ? '⚠️ Meets minimum (≥1.15x) but below preferred' : '❌ Below minimum requirement (<1.15x)'}
                </span>
              </div>
            </div>

            {/* Eligibility Checklist */}
            <div className="bg-white/5 rounded-lg p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">SBA 7(a) Eligibility (2026 Rules)</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {dscrMeets ? <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
                  <span className={dscrMeets ? 'text-white' : 'text-red-400'}>
                    DSCR ≥ 1.15x {dscrPreferred && '(Preferred: ≥1.25x)'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {equityMeets ? <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
                  <span className={equityMeets ? 'text-white' : 'text-red-400'}>
                    Equity ≥ 10% {equityPreferred && '(Preferred: ≥15% for deals >$1M)'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {customerConcentrationOk ? <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
                  <span className={customerConcentrationOk ? 'text-white' : 'text-red-400'}>
                    Customer concentration {'< 50%'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {loanAmountOk ? <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
                  <span className={loanAmountOk ? 'text-white' : 'text-red-400'}>
                    Loan amount ≤ $5M
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {ebitdaOk ? <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />}
                  <span className={ebitdaOk ? 'text-white' : 'text-yellow-400'}>
                    Normalized EBITDA ≥ $200K (recommended)
                  </span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6">
              <h3 className="text-xl font-bold text-emerald-400 mb-3">Get Full Deal Analysis</h3>
              <p className="text-white/80 mb-4 text-sm">
                SearchFindr analyzes entire CIMs in 60 seconds, calculating DSCR, SBA eligibility, 
                QoE red flags, and search fund fit automatically.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-500 transition-colors text-sm"
              >
                Start Your Free Trial
              </Link>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-12 bg-white/5 rounded-lg p-6 border border-white/10">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="text-white/80 text-sm space-y-2">
              <p>
                <strong>Note:</strong> This calculator provides estimates based on 2026 SBA 7(a) rules. 
                Actual loan terms may vary by lender. Always verify with your SBA-preferred lender.
              </p>
              <p>
                <strong>DSCR Calculation:</strong> Uses simplified amortization. Actual payments may vary slightly. 
                Normalized EBITDA should reflect Quality of Earnings adjustments (addbacks, one-time items, etc.).
              </p>
              <Link href="/blog/sba-7a-loan-calculator-guide" className="text-emerald-400 hover:text-emerald-300 underline">
                Read our complete SBA 7(a) guide →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
