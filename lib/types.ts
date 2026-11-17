export type Preferences = {
  recipient: string;
  budget: number;
  interests: string;
  occasion?: string;
};

export type GiftIdea = {
  name: string;
  why: string;
  estPrice: number;
  searchQuery: string;
};

export type Offer = {
  title: string;
  price: number;
  priceText: string;
  source: string;
  link: string;
  thumbnail?: string;
  rating?: number;
  reviews?: number;
  delivery?: string;
};

export type OffersResponse = {
  query: string;
  offers: Offer[];
  overBudgetCount: number;
  fetchedAt: string;
  cached: boolean;
};
