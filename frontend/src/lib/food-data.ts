import type { MenuItem, NearbyPlace, PlaceDetails, Review } from '@/types/food';

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number, index = 0): number {
  const x = Math.sin(seed + index * 9999) * 10000;
  return x - Math.floor(x);
}

const REVIEW_AUTHORS = [
  'Ahmed K.',
  'Sarah M.',
  'Omar H.',
  'Layla A.',
  'James R.',
  'Fatima S.',
  'Mohammed B.',
  'Emily T.',
  'Youssef N.',
  'Nadia W.',
];

const REVIEW_TEMPLATES = [
  'Great food and fast service. Will order again!',
  'Fresh ingredients and generous portions. Highly recommend.',
  'Good value for money. The staff was very friendly.',
  'One of my favorite spots in the area. Consistent quality.',
  'Tasty and well presented. Delivery was on time.',
  'Nice atmosphere and delicious menu. Perfect for lunch.',
  'Exceeded expectations — everything was hot and fresh.',
  'Solid choice for a quick meal. Good variety on the menu.',
];

const CUISINE_BY_CATEGORY: Record<string, string[]> = {
  cafe: ['Coffee', 'Pastries', 'Breakfast', 'Sandwiches'],
  fast_food: ['Burgers', 'Fried Chicken', 'Wraps', 'Combo Meals'],
  restaurant: ['Grills', 'Middle Eastern', 'International', 'Seafood'],
  food_court: ['Asian', 'Pizza', 'Salads', 'Desserts'],
  other: ['Local', 'Casual Dining'],
};

const MENU_TEMPLATES: Record<string, Omit<MenuItem, 'id'>[]> = {
  cafe: [
    { name: 'Cappuccino', description: 'Rich espresso with steamed milk foam', price: 18, category: 'Hot Drinks', popular: true },
    { name: 'Latte', description: 'Smooth espresso with velvety milk', price: 20, category: 'Hot Drinks' },
    { name: 'Iced Americano', description: 'Chilled double shot over ice', price: 16, category: 'Cold Drinks', popular: true },
    { name: 'Croissant', description: 'Buttery, flaky French pastry', price: 14, category: 'Pastries' },
    { name: 'Avocado Toast', description: 'Sourdough, smashed avocado, poached egg', price: 32, category: 'Breakfast', popular: true },
    { name: 'Club Sandwich', description: 'Chicken, bacon, lettuce, tomato', price: 28, category: 'Sandwiches' },
    { name: 'Cheesecake Slice', description: 'Classic New York style', price: 22, category: 'Desserts' },
  ],
  fast_food: [
    { name: 'Classic Burger', description: 'Beef patty, cheese, pickles, special sauce', price: 28, category: 'Burgers', popular: true },
    { name: 'Double Smash Burger', description: 'Two patties, double cheese, caramelized onions', price: 38, category: 'Burgers', popular: true },
    { name: 'Crispy Chicken Wrap', description: 'Fried chicken, lettuce, garlic mayo', price: 26, category: 'Wraps' },
    { name: 'Loaded Fries', description: 'Fries with cheese sauce and jalapeños', price: 18, category: 'Sides', popular: true },
    { name: 'Chicken Tenders (6pc)', description: 'Crispy tenders with dipping sauce', price: 32, category: 'Chicken' },
    { name: 'Family Combo', description: '2 burgers, 2 fries, 2 drinks', price: 75, category: 'Combos' },
    { name: 'Chocolate Shake', description: 'Thick and creamy milkshake', price: 16, category: 'Drinks' },
  ],
  restaurant: [
    { name: 'Mixed Grill Platter', description: 'Lamb, chicken, kofta with rice and salad', price: 85, category: 'Grills', popular: true },
    { name: 'Grilled Sea Bass', description: 'Fresh fish with lemon butter sauce', price: 95, category: 'Seafood', popular: true },
    { name: 'Hummus & Pita', description: 'Creamy chickpea dip with warm bread', price: 22, category: 'Starters' },
    { name: 'Fattoush Salad', description: 'Mixed greens, crispy bread, sumac dressing', price: 28, category: 'Starters' },
    { name: 'Chicken Shawarma Plate', description: 'Marinated chicken with garlic sauce', price: 45, category: 'Mains', popular: true },
    { name: 'Lamb Biryani', description: 'Fragrant rice with tender lamb', price: 55, category: 'Mains' },
    { name: 'Kunafa', description: 'Traditional sweet cheese pastry', price: 30, category: 'Desserts' },
    { name: 'Fresh Mint Lemonade', description: 'House-made refreshing drink', price: 14, category: 'Drinks' },
  ],
  food_court: [
    { name: 'Pad Thai', description: 'Stir-fried rice noodles with peanuts', price: 35, category: 'Asian', popular: true },
    { name: 'Margherita Pizza', description: 'Tomato, mozzarella, fresh basil', price: 42, category: 'Pizza', popular: true },
    { name: 'Caesar Salad', description: 'Romaine, parmesan, croutons', price: 28, category: 'Salads' },
    { name: 'Beef Noodles', description: 'Wok-tossed noodles with vegetables', price: 38, category: 'Asian' },
    { name: 'Garlic Bread', description: 'Toasted with herb butter', price: 14, category: 'Sides' },
  ],
  other: [
    { name: 'Daily Special', description: 'Chef\'s selection of the day', price: 45, category: 'Mains', popular: true },
    { name: 'Soup of the Day', description: 'Ask your server for today\'s soup', price: 18, category: 'Starters' },
    { name: 'House Salad', description: 'Seasonal greens with vinaigrette', price: 22, category: 'Starters' },
    { name: 'Grilled Chicken', description: 'Herb-marinated with side vegetables', price: 48, category: 'Mains' },
    { name: 'Soft Drink', description: 'Choice of cola, sprite, or water', price: 8, category: 'Drinks' },
  ],
};

export function generateMenu(place: NearbyPlace): MenuItem[] {
  const template = MENU_TEMPLATES[place.category] || MENU_TEMPLATES.other;
  const seed = hashString(place.id);

  return template.map((item, i) => ({
    ...item,
    id: `${place.id}-item-${i}`,
    price: Math.round(item.price * (0.9 + seededRandom(seed, i) * 0.25)),
  }));
}

export function generateReviews(place: NearbyPlace): Review[] {
  const seed = hashString(place.id);
  const count = 3 + Math.floor(seededRandom(seed) * 4);

  return Array.from({ length: count }, (_, i) => {
    const rating = 3 + Math.floor(seededRandom(seed, i + 10) * 3);
    const daysAgo = 1 + Math.floor(seededRandom(seed, i + 20) * 60);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    return {
      id: `${place.id}-review-${i}`,
      author: REVIEW_AUTHORS[(seed + i) % REVIEW_AUTHORS.length],
      rating: Math.min(5, Math.max(3, rating)),
      text: REVIEW_TEMPLATES[(seed + i * 3) % REVIEW_TEMPLATES.length],
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
  });
}

export function getPlaceRating(place: NearbyPlace): { rating: number; reviewCount: number } {
  const seed = hashString(place.id);
  const rating = Math.round((3.6 + seededRandom(seed) * 1.3) * 10) / 10;
  const reviewCount = 15 + Math.floor(seededRandom(seed, 1) * 280);
  return { rating, reviewCount };
}

export function getDeliveryMinutes(distanceMeters: number): number {
  return Math.max(15, Math.min(50, Math.round(15 + distanceMeters / 200)));
}

export function getCuisineTags(place: NearbyPlace): string[] {
  const options = CUISINE_BY_CATEGORY[place.category] || CUISINE_BY_CATEGORY.other;
  const seed = hashString(place.id);
  const count = 1 + Math.floor(seededRandom(seed, 5) * 2);
  const tags: string[] = [];
  for (let i = 0; i < count; i++) {
    const tag = options[(seed + i) % options.length];
    if (!tags.includes(tag)) tags.push(tag);
  }
  return tags;
}

export function isPlaceOpen(openingHours?: string): boolean {
  if (!openingHours) return true;
  const lower = openingHours.toLowerCase();
  if (lower.includes('24/7') || lower.includes('24 hours')) return true;
  const hour = new Date().getHours();
  return hour >= 8 && hour < 23;
}

export function enrichPlace(place: NearbyPlace): PlaceDetails {
  const { rating, reviewCount } = getPlaceRating(place);
  return {
    ...place,
    rating,
    reviewCount,
    deliveryMinutes: getDeliveryMinutes(place.distanceMeters),
    cuisine: getCuisineTags(place),
    menu: generateMenu(place),
    reviews: generateReviews(place),
    isOpen: isPlaceOpen(place.openingHours),
    minOrder: 20 + (hashString(place.id) % 30),
  };
}

export function getCategoryGradient(category: string): string {
  switch (category) {
    case 'cafe':
      return 'from-amber-950/80 via-amber-900/40 to-transparent';
    case 'fast_food':
      return 'from-red-950/80 via-orange-900/35 to-transparent';
    case 'food_court':
      return 'from-violet-950/80 via-fuchsia-900/35 to-transparent';
    case 'restaurant':
      return 'from-stone-950/80 via-orange-950/40 to-transparent';
    default:
      return 'from-slate-950/80 via-slate-900/40 to-transparent';
  }
}

const BANNER_IMAGES: Record<string, string[]> = {
  cafe: [
    'https://images.unsplash.com/photo-1495474472287-4d71471e04ea?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1459257868276-5ddfccd5bc36?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800&h=400&fit=crop',
  ],
  restaurant: [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1590846406792-0adc7f9380b1?w=800&h=400&fit=crop',
  ],
  fast_food: [
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1572802419224-296b0aee0f39?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=800&h=400&fit=crop',
  ],
  food_court: [
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=400&fit=crop',
  ],
  other: [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800&h=400&fit=crop',
  ],
};

export function resolveFoodCategory(place: NearbyPlace): string {
  if (place.category !== 'other' && place.category !== 'restaurant') {
    return place.category;
  }

  const name = place.name.toLowerCase();
  if (/\b(cafe|café|coffee|espresso|starbucks|costa|cafeteria|bakery|patisserie)\b/.test(name)) {
    return 'cafe';
  }
  if (/\b(burger|mcdonald|kfc|fast food|pizza hut|subway|wendy|zinger|shawarma)\b/.test(name)) {
    return 'fast_food';
  }

  return place.category === 'other' ? 'restaurant' : place.category;
}

export function getPlaceBannerUrl(place: NearbyPlace): string {
  const category = resolveFoodCategory(place);
  const pool = BANNER_IMAGES[category] || BANNER_IMAGES.other;
  const index = hashString(place.id) % pool.length;
  return pool[index];
}

export function getCategoryLabel(category: string): string {
  switch (category) {
    case 'cafe':
      return 'Café';
    case 'fast_food':
      return 'Fast Food';
    case 'food_court':
      return 'Food Court';
    case 'restaurant':
      return 'Restaurant';
    default:
      return 'Dining';
  }
}

export function getCategoryEmoji(category: string): string {
  switch (category) {
    case 'cafe':
      return '☕';
    case 'fast_food':
      return '🍔';
    case 'food_court':
      return '🍱';
    default:
      return '🍽️';
  }
}

export function formatDeliveryTime(minutes: number): string {
  return `${minutes}–${minutes + 10} min`;
}

export function formatPrice(price: number): string {
  return `AED ${price.toFixed(0)}`;
}
