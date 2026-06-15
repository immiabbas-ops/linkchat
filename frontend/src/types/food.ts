export interface NearbyPlace {
  id: string;
  name: string;
  type: string;
  category: string;
  lat: number;
  lng: number;
  address?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
  distanceMeters: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  popular?: boolean;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  text: string;
  date: string;
}

export interface PlaceDetails extends NearbyPlace {
  rating: number;
  reviewCount: number;
  deliveryMinutes: number;
  cuisine: string[];
  menu: MenuItem[];
  reviews: Review[];
  isOpen: boolean;
  minOrder: number;
}
