import { Hero } from '@/components/marketing/Hero';
import { SocialProof } from '@/components/marketing/SocialProof';
import { ProblemSection } from '@/components/marketing/ProblemSection';
import { SolutionSection } from '@/components/marketing/SolutionSection';
import { FeaturesGrid } from '@/components/marketing/FeaturesGrid';
import { VisualDemo } from '@/components/marketing/VisualDemo';
import { PricingTeaser } from '@/components/marketing/PricingTeaser';
import { FinalCTA } from '@/components/marketing/FinalCTA';
import { AnimatedSection } from '@/components/marketing/AnimatedSection';

export default function MarketingHomePage() {
  return (
    <>
      <Hero />
      <SocialProof />
      <div id="problem">
        <AnimatedSection>
          <ProblemSection />
        </AnimatedSection>
      </div>
      <div id="solution">
        <AnimatedSection>
          <SolutionSection />
        </AnimatedSection>
      </div>
      <AnimatedSection>
        <FeaturesGrid />
      </AnimatedSection>
      <AnimatedSection>
        <VisualDemo />
      </AnimatedSection>
      <AnimatedSection>
        <PricingTeaser />
      </AnimatedSection>
      <AnimatedSection>
        <FinalCTA />
      </AnimatedSection>
    </>
  );
}
