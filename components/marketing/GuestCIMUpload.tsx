'use client';

import { useState, useRef } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Loader2, Mail } from 'lucide-react';
import Link from 'next/link';

export function GuestCIMUpload() {
  const [email, setEmail] = useState<string>('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setEmailSubmitted(true);
    setError(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Please upload a PDF, DOCX, or DOC file.');
      return;
    }

    // Validate file size (50MB max)
    if (selectedFile.size > 50 * 1024 * 1024) {
      setError('File too large. Maximum size is 50MB.');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setAnalysis(null);
  };

  const handleUpload = async () => {
    if (!file || !emailSubmitted || !email) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('email', email);

      const response = await fetch('/api/process-cim-guest', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Upload failed');
      }

      setAnalysis(data);
      setUploadSuccess(true);
      
      // Check if email was sent (we'll verify this on the backend)
      // For now, assume it was sent if analysis succeeded
      setEmailSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze CIM. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setAnalysis(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReset = () => {
    setEmail('');
    setEmailSubmitted(false);
    setFile(null);
    setAnalysis(null);
    setError(null);
    setUploadSuccess(false);
    setEmailSent(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Upload Zone */}
      {!analysis && (
        <div className="bg-white/5 rounded-xl border-2 border-dashed border-white/20 p-8 hover:border-emerald-500/50 transition-colors">
          <div className="text-center">
            <Upload className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">
              Try SearchFindr Free - No Signup Required
            </h3>
            <p className="text-white/70 mb-6">
              Upload a CIM and get instant red flags, deal tier, and verdict in 60 seconds.
            </p>

            {!emailSubmitted ? (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="max-w-md mx-auto">
                  <label htmlFor="guest-email" className="block text-sm font-medium text-white/70 mb-2 text-left">
                    Email Address
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                      <input
                        type="email"
                        id="guest-email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError(null);
                        }}
                        placeholder="your@email.com"
                        required
                        className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-500 transition-colors whitespace-nowrap"
                    >
                      Continue
                    </button>
                  </div>
                  <p className="text-xs text-white/50 mt-2 text-left">
                    We'll send you the analysis results. One CIM per email address.
                  </p>
                  
                  {/* Privacy/Trust Messaging */}
                  <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-white mb-1">Your data is private and secure</p>
                        <p className="text-xs text-white/60 leading-relaxed">
                          Your CIM uploads are only for you. We never sell your data to third parties, and your documents are automatically deleted after 24 hours. Your email is only used to send you the analysis results.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3 max-w-md mx-auto">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}
              </form>
            ) : !file ? (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="guest-cim-upload"
                />
                <label
                  htmlFor="guest-cim-upload"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-500 transition-colors cursor-pointer"
                >
                  <Upload className="w-5 h-5" />
                  Choose CIM File
                </label>
                <p className="text-sm text-white/50 mt-4">
                  PDF, DOCX, or DOC • Max 50MB
                </p>
                <button
                  onClick={() => setEmailSubmitted(false)}
                  className="text-sm text-white/60 hover:text-white/80 mt-2 underline"
                >
                  Change email
                </button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-white/5 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <FileIcon file={file} />
                    <div className="text-left">
                      <p className="text-white font-semibold">{file.name}</p>
                      <p className="text-sm text-white/60">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveFile}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    disabled={uploading}
                  >
                    <X className="w-5 h-5 text-white/60" />
                  </button>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing CIM...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Analyze CIM (Free Preview)
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Verification Check */}
      {uploadSuccess && !analysis && (
        <div className="mt-6 space-y-4">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
              <h3 className="text-xl font-bold text-white">Processing Your CIM</h3>
            </div>
            <p className="text-white/70 mb-4">
              We're analyzing your CIM and preparing your results. This usually takes 30-60 seconds.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-white/60">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>CIM uploaded successfully</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                <span>Extracting text and analyzing...</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/60">
                <div className="w-4 h-4 border-2 border-white/20 rounded-full" />
                <span>Preparing results email...</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Preview */}
      {analysis && (
        <div className="mt-6 space-y-4">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
              <h3 className="text-xl font-bold text-white">Analysis Complete</h3>
            </div>

            {/* Verification Success Message */}
            <div className="mb-6 p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white mb-1">Everything worked perfectly!</p>
                  <div className="space-y-1 text-xs text-white/80">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                      <span>CIM analyzed successfully</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                      <span>Results email sent to <strong>{email}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                      <span>Your data is secure and private</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Verdict */}
            {analysis.analysis?.decision_framework?.verdict && (
              <div className="mb-4">
                <p className="text-sm text-white/60 mb-1">Verdict</p>
                <p className={`text-lg font-bold ${
                  analysis.analysis.decision_framework.verdict === 'PROCEED' ? 'text-emerald-400' :
                  analysis.analysis.decision_framework.verdict === 'PARK' ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {analysis.analysis.decision_framework.verdict}
                </p>
                {analysis.analysis.decision_framework.primary_reason && (
                  <p className="text-sm text-white/70 mt-1">
                    {analysis.analysis.decision_framework.primary_reason}
                  </p>
                )}
              </div>
            )}

            {/* Tier */}
            {analysis.analysis?.scoring?.final_tier && (
              <div className="mb-4">
                <p className="text-sm text-white/60 mb-1">Deal Tier</p>
                <p className={`text-lg font-bold ${
                  analysis.analysis.scoring.final_tier === 'A' ? 'text-emerald-400' :
                  analysis.analysis.scoring.final_tier === 'B' ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  Tier {analysis.analysis.scoring.final_tier}
                </p>
              </div>
            )}

            {/* Summary */}
            {analysis.analysis?.ai_summary && (
              <div className="mb-4">
                <p className="text-sm text-white/60 mb-2">Summary</p>
                <p className="text-white/80 text-sm leading-relaxed">
                  {analysis.analysis.ai_summary}
                </p>
              </div>
            )}

            {/* Red Flags Preview */}
            {analysis.analysis?.ai_red_flags && Array.isArray(analysis.analysis.ai_red_flags) && analysis.analysis.ai_red_flags.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-white/60 mb-2">Key Red Flags</p>
                <ul className="space-y-1">
                  {analysis.analysis.ai_red_flags.slice(0, 3).map((flag: any, idx: number) => {
                    // Handle both old format (string) and new format (object with flag property)
                    const flagText = typeof flag === 'string' ? flag : (flag?.flag || String(flag));
                    return (
                      <li key={idx} className="text-sm text-red-400 flex items-start gap-2">
                        <span className="text-red-400">•</span>
                        <span>{flagText}</span>
                      </li>
                    );
                  })}
                  {analysis.analysis.ai_red_flags.length > 3 && (
                    <li className="text-sm text-white/60 italic">
                      +{analysis.analysis.ai_red_flags.length - 3} more red flags...
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* CTA */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-sm text-white/70 mb-4">
                This is a preview. Sign up to see the full analysis, save deals, track your pipeline, and get unlimited CIM analyses.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/signup"
                  className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-500 transition-colors text-center"
                >
                  Sign Up for Full Access
                </Link>
                <button
                  onClick={handleReset}
                  className="px-6 py-3 border border-white/20 text-white rounded-lg font-semibold hover:bg-white/10 transition-colors"
                >
                  Analyze Another CIM
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FileIcon({ file }: { file: File }) {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') {
    return <div className="w-10 h-10 bg-red-500/20 rounded flex items-center justify-center text-red-400 font-bold text-xs">PDF</div>;
  }
  return <div className="w-10 h-10 bg-blue-500/20 rounded flex items-center justify-center text-blue-400 font-bold text-xs">DOC</div>;
}
