export default function PrivacyPage() {
  return (
    <div className="pt-32 pb-20 lg:pt-40 lg:pb-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-8">
          Privacy Policy
        </h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-white/80 leading-relaxed">
          <p className="text-sm text-white/60">
            Last updated: January 21, 2025
          </p>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4 mt-8">Introduction</h2>
            <p>
              SearchFindr ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered deal screening platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4 mt-8">Information We Collect</h2>
            <h3 className="text-xl font-medium text-white mb-3 mt-6">Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Account information (email address, name)</li>
              <li>Deal documents (CIMs, financial statements, other documents you upload)</li>
              <li>Deal information and notes you create</li>
              <li>Communication data when you contact support</li>
            </ul>

            <h3 className="text-xl font-medium text-white mb-3 mt-6">Automatically Collected Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Usage data (features used, frequency of use)</li>
              <li>Device information (browser type, operating system)</li>
              <li>IP address and location data</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4 mt-8">How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide and maintain our service</li>
              <li>To process and analyze deal documents using AI</li>
              <li>To improve our platform and develop new features</li>
              <li>To communicate with you about your account and our services</li>
              <li>To detect and prevent fraud or abuse</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4 mt-8">Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your data, including encryption in transit and at rest, secure authentication, and regular security audits. However, no method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4 mt-8">Data Sharing</h2>
            <p>
              We do not sell your data. We may share your information only in the following circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>With service providers who assist in operating our platform (under strict confidentiality agreements)</li>
              <li>When required by law or to protect our rights</li>
              <li>In connection with a business transfer (merger, acquisition, etc.)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4 mt-8">Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your data</li>
              <li>Export your data</li>
              <li>Opt out of certain data processing</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, contact us at support@searchfindr.app
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4 mt-8">Cookies</h2>
            <p>
              We use cookies and similar technologies to improve your experience, analyze usage, and assist with marketing efforts. You can control cookies through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4 mt-8">Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4 mt-8">Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us at:
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
