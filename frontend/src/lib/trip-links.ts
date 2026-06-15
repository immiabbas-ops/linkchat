export interface TripSearch {
  fromCity?: string;
  toCity?: string;
  destination?: string;
  departDate?: string;
  returnDate?: string;
  checkIn?: string;
  checkOut?: string;
  travelers?: number;
}

export function googleFlightsUrl(trip: TripSearch) {
  const from = trip.fromCity?.trim() || '';
  const to = trip.toCity?.trim() || trip.destination?.trim() || '';
  if (!from || !to) return 'https://www.google.com/travel/flights';

  let q = `Flights from ${from} to ${to}`;
  if (trip.departDate) q += ` on ${trip.departDate}`;
  if (trip.returnDate) q += ` through ${trip.returnDate}`;
  if (trip.travelers && trip.travelers > 1) q += ` for ${trip.travelers} passengers`;

  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`;
}

export function bookingHotelsUrl(trip: TripSearch) {
  const dest = trip.destination?.trim() || trip.toCity?.trim() || '';
  if (!dest) return 'https://www.booking.com';

  const params = new URLSearchParams({ ss: dest });
  if (trip.checkIn) params.set('checkin', trip.checkIn);
  if (trip.checkOut) params.set('checkout', trip.checkOut);
  if (trip.travelers) params.set('group_adults', String(trip.travelers));

  return `https://www.booking.com/searchresults.html?${params.toString()}`;
}

export function kayakFlightsUrl(trip: TripSearch) {
  const from = trip.fromCity?.trim();
  const to = trip.toCity?.trim() || trip.destination?.trim();
  if (!from || !to) return 'https://www.kayak.com/flights';

  const params = new URLSearchParams();
  if (trip.departDate) params.set('depart', trip.departDate);
  if (trip.returnDate) params.set('return', trip.returnDate);
  if (trip.travelers) params.set('travelers', String(trip.travelers));

  const path = `${from}-${to}${trip.departDate ? `/${trip.departDate}` : ''}${trip.returnDate ? `/${trip.returnDate}` : ''}`;
  const qs = params.toString();
  return `https://www.kayak.com/flights/${encodeURIComponent(path.replace(/\s+/g, '-'))}${qs ? `?${qs}` : ''}`;
}

export function rentalCarsUrl(trip: TripSearch) {
  const dest = trip.destination?.trim() || trip.toCity?.trim() || '';
  if (!dest) return 'https://www.kayak.com/cars';

  const params = new URLSearchParams({ pickuplocation: dest });
  if (trip.checkIn) params.set('pickupDate', trip.checkIn);
  if (trip.checkOut) params.set('dropoffDate', trip.checkOut);

  return `https://www.kayak.com/cars?${params.toString()}`;
}

export function skyscannerFlightsUrl(trip: TripSearch) {
  const from = trip.fromCity?.trim();
  const to = trip.toCity?.trim() || trip.destination?.trim();
  if (!from || !to) return 'https://www.skyscanner.com';

  return `https://www.skyscanner.com/transport/flights/${encodeURIComponent(from.toLowerCase())}/${encodeURIComponent(to.toLowerCase())}/${trip.departDate?.replace(/-/g, '') || ''}/${trip.returnDate?.replace(/-/g, '') || ''}/?adults=${trip.travelers || 1}`;
}

export function googleMapsExploreUrl(city: string) {
  return `https://www.google.com/maps/search/things+to+do+in+${encodeURIComponent(city)}`;
}

export function openWeatherUrl(city: string) {
  return `https://www.google.com/search?q=weather+${encodeURIComponent(city)}`;
}
