export default function TermsPage() {
  return (
    <div className="pt-32 pb-20 lg:pt-40 lg:pb-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-8">
          Terms of Service
        </h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-white/80 leading-relaxed">
          <p className="text-sm text-white/60">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4 mt-8">Agreement to Terms</h2>
            <p>
              By accessing or using SearchFindr ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, you may not access the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4 mt-8">Use License</h2>
            <p>
              Permission is granted to temporarily use SearchFindr for personal or commercial deal screening purposes. This license does not include:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Reselling or sublicensing the Service</li>
              <li>Using the Service for any illegal purpose</li>
              <li>Attempting to reverse engineer or extract source code</li>
              <li>Removing copyright or proprietary notations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4 mt-8">Account Registration</h2>
            <p>
              You must provide accurate and complete information when creating an account. You are responsible for maintaining the security of your account and password. We are not liable for any loss or damage from your failure to comply with this security obligation.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4 mt-8">User Content</h2>
            <p>
              You retain ownership of all content you upload to SearchFindr. By uploading content, you grant us a license to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Process and analyze your content using AI</li>
              <li>Store your content securely</li>
              <li>Display your content within the Service</li>
            </ul>
            <p className="mt-4">
              You are responsible for ensuring you have the right to upload any content you provide.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4 mt-8">Payment Terms</h2>
            <p>
              Subscription fees are billed in advance on a monthly or annual basis. All fees are non-refundable except as required by law or as explicitly stated in our refund policy. We offer a 30-day money-back guarantee for new subscriptions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4 mt-8">Service Availability</h2>
            <p>
              We strive to maintain high availability but do not guarantee uninterrupted access. We may perform maintenance that temporarily limits access. We reserve the right to modify or discontinue the Service at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4 mt-8">AI Analysis Disclaimer</h2>
            <p>
              SearchFindr uses AI to analyze deal documents. While we strive for accuracy, AI-generated insights are provided for informational purposes only and should not be the sole basis for investment decisions. Always conduct thorough due diligence and consult with qualified professionals.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4 mt-8">Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, SearchFindr shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4 mt-8">Termination</h2>
            <p>
              We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties. Upon termination, your right to use the Service will cease immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4 mt-8">Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will notify users of material changes via email or through the Service. Your continued use of the Service after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4 mt-8">Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4 mt-8">Contact Information</h2>
            <p>
              If you have questions about these Terms, please contact us at:
            </p>
            <p className="mt-2">
              Email: support@searchfindr.app
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
