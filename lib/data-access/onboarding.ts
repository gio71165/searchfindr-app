import { SupabaseClient } from '@supabase/supabase-js';

export class OnboardingRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Check if user has completed onboarding
   */
  async hasCompletedOnboarding(userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }

    return data?.onboarding_completed === true;
  }

  /**
   * Get current onboarding step
   */
  async getOnboardingStep(userId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('onboarding_step')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error getting onboarding step:', error);
      return 0;
    }

    return data?.onboarding_step ?? 0;
  }

  /**
   * Save onboarding progress
   */
  async saveProgress(userId: string, step: number): Promise<void> {
    const { error } = await this.supabase
      .from('profiles')
      .update({ onboarding_step: step })
      .eq('id', userId);

    if (error) {
      console.error('Error saving onboarding progress:', error);
      throw new Error(`Failed to save onboarding progress: ${error.message}`);
    }
  }

  /**
   * Mark onboarding as completed
   */
  async completeOnboarding(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('profiles')
      .update({ 
        onboarding_completed: true,
        onboarding_step: 0, // Reset step on completion
      })
      .eq('id', userId);

    if (error) {
      console.error('Error completing onboarding:', error);
      throw new Error(`Failed to complete onboarding: ${error.message}`);
    }
  }

  /**
   * Reset onboarding (for re-triggering)
   */
  async resetOnboarding(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('profiles')
      .update({ 
        onboarding_completed: false,
        onboarding_step: 0,
        onboarding_skipped: false,
      })
      .eq('id', userId);

    if (error) {
      console.error('Error resetting onboarding:', error);
      throw new Error(`Failed to reset onboarding: ${error.message}`);
    }
  }
}
