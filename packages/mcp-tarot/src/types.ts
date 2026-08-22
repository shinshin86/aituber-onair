export interface Card {
  id: string;
  name: string;
  arcanum: 'major' | 'minor';
  number?: number;
  suit?: 'wands' | 'cups' | 'swords' | 'pentacles';
  upright_meaning: string;
  reversed_meaning: string;
  keywords: string[];
  texture_front: string;
  texture_back: string;
}

export interface SpreadDefinition {
  id: string;
  name: string;
  cards_count: number;
  layout_type: 'linear' | 'circular' | 'grid' | 'custom';
  positions: PositionDefinition[];
  duration_estimate_ms: number;
  complexity: 'basic' | 'intermediate' | 'advanced';
}

export interface PositionDefinition {
  id: number;
  name: string;
  label: string;
  description: string;
}
