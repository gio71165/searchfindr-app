export interface IOIData {
  // Company info
  companyName: string;
  industry: string;
  location: string;
  
  // Deal terms
  purchasePriceRange: { min: number; max: number };
  structureType: 'asset' | 'stock' | 'tbd';
  financingType: 'sba_7a' | 'conventional' | 'seller_financing' | 'combination';
  
  // Timeline
  dueDiligencePeriod: number; // days
  targetCloseDate: string;
  
  // Conditions
  keyConditions: string[];
  exclusivityRequested: boolean;
  exclusivityPeriod?: number; // days
  
  // Buyer info
  buyerName: string;
  buyerEntity: string;
  buyerEmail: string;
  buyerPhone: string;
}

export interface LOIData extends IOIData {
  // More specific terms
  purchasePrice: number;
  
  // Structure details
  workingCapitalMechanism: string;
  sellerNoteAmount?: number;
  sellerNoteTerms?: string;
  earnoutAmount?: number;
  earnoutTriggers?: string;
  
  // Reps & warranties
  repAndWarrantyExpectations: string[];
  
  // Post-close
  nonCompetePeriod: number; // years
  nonCompeteRadius: number; // miles
  transitionPeriod: number; // months
  employeeRetention: string[];
  
  // Contingencies
  contingencies: string[];
}
