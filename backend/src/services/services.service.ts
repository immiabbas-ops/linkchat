import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { XMLParser } from 'fast-xml-parser';

export interface NearbyPlace {
  id: string;
  name: string;
  type: string;
  category: 'restaurant' | 'fast_food' | 'cafe' | 'food_court' | 'other';
  lat: number;
  lng: number;
  address?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
  distanceMeters: number;
}

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);
  private readonly overpassEndpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];
  private xmlParser = new XMLParser({ ignoreAttributes: false });

  constructor(private prisma: PrismaService) {}

  async getNearbyFood(lat: number, lng: number, radius = 5000, filter?: string) {
    const amenityMap: Record<string, string> = {
      restaurant: 'restaurant',
      fast_food: 'fast_food',
      cafe: 'cafe',
      all: 'restaurant|fast_food|cafe|food_court',
    };
    const amenityPattern = amenityMap[filter || 'all'] || amenityMap.all;

    const query = `
      [out:json][timeout:30];
      (
        node(around:${radius},${lat},${lng})["amenity"~"^(${amenityPattern})$"]["name"];
        way(around:${radius},${lat},${lng})["amenity"~"^(${amenityPattern})$"]["name"];
      );
      out center tags;
    `;

    const places = await this.queryOverpass(query);
    return places
      .map((p) => this.mapOsmToPlace(p, lat, lng))
      .filter((p): p is NearbyPlace => !!p)
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, 60);
  }

  async getNearbyRealEstateOffices(lat: number, lng: number, radius = 8000) {
    const query = `
      [out:json][timeout:30];
      (
        node(around:${radius},${lat},${lng})["shop"="estate_agent"]["name"];
        way(around:${radius},${lat},${lng})["shop"="estate_agent"]["name"];
        node(around:${radius},${lat},${lng})["office"="estate_agent"]["name"];
      );
      out center tags;
    `;

    const offices = await this.queryOverpass(query);
    return offices
      .map((p) => this.mapOsmToPlace(p, lat, lng))
      .filter((p): p is NearbyPlace => !!p)
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, 30);
  }

  async getLiveJobs(search?: string, category?: string) {
    try {
      const [remotive, arbeitnow] = await Promise.all([
        fetch('https://remotive.com/api/remote-jobs').then((r) => r.json()),
        fetch('https://www.arbeitnow.com/api/job-board-api').then((r) => r.json()),
      ]);

      const remotiveJobs = (remotive.jobs || []).map((j: any) => ({
        id: `remotive-${j.id}`,
        title: j.title,
        company: j.company_name,
        location: j.candidate_required_location || 'Remote',
        salary: j.salary || null,
        description: this.stripHtml(j.description || '').slice(0, 280),
        category: j.category || 'General',
        jobType: j.job_type || 'Full-time',
        postedAt: j.publication_date,
        applyUrl: j.url,
        logoUrl: j.company_logo || null,
        source: 'Remotive',
      }));

      const arbeitJobs = (arbeitnow.data || []).slice(0, 30).map((j: any) => ({
        id: `arbeitnow-${j.slug}`,
        title: j.title,
        company: j.company_name,
        location: j.location || 'Various',
        salary: null,
        description: '',
        category: j.tags?.[0] || 'General',
        jobType: j.remote ? 'Remote' : 'On-site',
        postedAt: j.created_at,
        applyUrl: j.url,
        logoUrl: null,
        source: 'Arbeitnow',
      }));

      let jobs = [...remotiveJobs, ...arbeitJobs];

      if (category && category !== 'all') {
        jobs = jobs.filter((j) =>
          j.category.toLowerCase().includes(category.toLowerCase()),
        );
      }

      if (search) {
        const q = search.toLowerCase();
        jobs = jobs.filter(
          (j) =>
            j.title.toLowerCase().includes(q) ||
            j.company.toLowerCase().includes(q) ||
            j.location.toLowerCase().includes(q),
        );
      }

      return jobs.slice(0, 40);
    } catch (e) {
      this.logger.error('Failed to fetch live jobs', e);
      return this.getJobs();
    }
  }

  async getLiveNews(category?: string) {
    const feeds: { url: string; category: string }[] = [
      { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'World' },
      { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', category: 'Tech' },
      { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', category: 'Business' },
    ];

    const filteredFeeds =
      category && category !== 'all'
        ? feeds.filter((f) => f.category.toLowerCase() === category.toLowerCase())
        : feeds;

    const articles: any[] = [];

    await Promise.all(
      filteredFeeds.map(async (feed) => {
        try {
          const res = await fetch(feed.url, {
            headers: { 'User-Agent': 'LinkChat/1.0' },
          });
          const xml = await res.text();
          const parsed = this.xmlParser.parse(xml);
          const items = parsed?.rss?.channel?.item;
          const list = Array.isArray(items) ? items : items ? [items] : [];

          list.slice(0, 12).forEach((item: any, i: number) => {
            articles.push({
              id: `${feed.category}-${i}-${item.guid || item.link}`,
              title: item.title,
              summary: this.stripHtml(item.description || '').slice(0, 200),
              content: item.description,
              category: feed.category,
              imageUrl: this.extractImageFromRss(item.description),
              authorId: item.author || 'BBC News',
              publishedAt: item.pubDate,
              link: item.link,
              source: 'BBC News',
            });
          });
        } catch (e) {
          this.logger.warn(`RSS feed failed: ${feed.url}`);
        }
      }),
    );

    articles.sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );

    if (articles.length === 0) return this.getNews(category);
    return articles.slice(0, 30);
  }

  async getTaxiBookings(userId: string) {
    return this.prisma.serviceTaxi.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async createTaxiBooking(
    userId: string,
    data: { pickup: string; dropoff: string; fare?: number; metadata?: Record<string, unknown> },
  ) {
    return this.prisma.serviceTaxi.create({
      data: {
        userId,
        pickup: data.pickup,
        dropoff: data.dropoff,
        fare: data.fare ?? null,
        metadata: data.metadata ? (data.metadata as object) : undefined,
      },
    });
  }

  async getTrips(userId: string) {
    return this.prisma.serviceTrip.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  async createTrip(
    userId: string,
    data: {
      title?: string;
      destination: string;
      fromCity?: string;
      toCity?: string;
      departDate?: string;
      returnDate?: string;
      checkIn?: string;
      checkOut?: string;
      travelers?: number;
      notes?: string;
    },
  ) {
    const destination = data.destination.trim();
    return this.prisma.serviceTrip.create({
      data: {
        userId,
        title: data.title?.trim() || `Trip to ${destination}`,
        destination,
        fromCity: data.fromCity?.trim() || null,
        toCity: data.toCity?.trim() || destination,
        departDate: data.departDate || null,
        returnDate: data.returnDate || null,
        checkIn: data.checkIn || data.departDate || null,
        checkOut: data.checkOut || data.returnDate || null,
        travelers: data.travelers && data.travelers > 0 ? data.travelers : 1,
        notes: data.notes?.trim() || null,
      },
    });
  }

  async deleteTrip(userId: string, tripId: string) {
    const trip = await this.prisma.serviceTrip.findFirst({
      where: { id: tripId, userId },
    });
    if (!trip) return { deleted: false };
    await this.prisma.serviceTrip.delete({ where: { id: tripId } });
    return { deleted: true };
  }

  async getTripAttractions(city: string) {
    const geo = await this.geocodeCity(city);
    if (!geo) return [];

    const query = `
      [out:json][timeout:25];
      (
        node(around:12000,${geo.lat},${geo.lng})["tourism"~"attraction|museum|viewpoint|theme_park"]["name"];
        way(around:12000,${geo.lat},${geo.lng})["tourism"~"attraction|museum|viewpoint|theme_park"]["name"];
      );
      out center tags 40;
    `;

    const elements = await this.queryOverpass(query);
    return elements
      .map((el: any) => {
        const tags = el.tags || {};
        if (!tags.name) return null;
        const lat = el.lat ?? el.center?.lat;
        const lng = el.lon ?? el.center?.lon;
        if (!lat || !lng) return null;
        return {
          id: `${el.type}-${el.id}`,
          name: tags.name,
          type: (tags.tourism || 'attraction').replace(/_/g, ' '),
          lat,
          lng,
          website: tags.website || tags['contact:website'] || null,
          wikipedia: tags.wikipedia || null,
        };
      })
      .filter(Boolean)
      .slice(0, 24);
  }

  private async geocodeCity(city: string) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
        { headers: { 'User-Agent': 'LinkChat/1.0 (trip-hub)' } },
      );
      const data = await res.json();
      if (!data?.[0]) return null;
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), label: data[0].display_name };
    } catch {
      return null;
    }
  }

  async getJobs() {
    return this.prisma.serviceJob.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getFoodItems(category?: string) {
    return this.prisma.serviceFood.findMany({
      where: { isAvailable: true, ...(category ? { category } : {}) },
      take: 50,
    });
  }

  async getRealEstate() {
    return this.prisma.serviceRealEstate.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getNews(category?: string) {
    return this.prisma.serviceNews.findMany({
      where: category ? { category } : {},
      orderBy: { publishedAt: 'desc' },
      take: 30,
    });
  }

  private async queryOverpass(query: string) {
    let lastError: Error | null = null;

    for (const endpoint of this.overpassEndpoints) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000);

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: '*/*',
            'User-Agent': 'LinkChat/1.0 (hub-services)',
          },
          body: `data=${encodeURIComponent(query)}`,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!res.ok) {
          throw new Error(`Overpass HTTP ${res.status}`);
        }

        const data = await res.json();
        if (data.remark && !data.elements?.length) {
          throw new Error(String(data.remark));
        }

        return data.elements || [];
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        this.logger.warn(`Overpass ${endpoint} failed: ${lastError.message}`);
      }
    }

    throw new ServiceUnavailableException(
      lastError?.message?.includes('abort')
        ? 'Location search timed out. Please try again.'
        : 'Unable to reach OpenStreetMap right now. Please try again shortly.',
    );
  }

  private mapOsmToPlace(element: any, userLat: number, userLng: number): NearbyPlace | null {
    const tags = element.tags || {};
    if (!tags.name) return null;

    const lat = element.lat ?? element.center?.lat;
    const lng = element.lon ?? element.center?.lon;
    if (!lat || !lng) return null;

    const amenity = tags.amenity || tags.shop || tags.office || 'place';
    let category: NearbyPlace['category'] = 'other';
    if (amenity === 'restaurant') category = 'restaurant';
    else if (amenity === 'fast_food') category = 'fast_food';
    else if (amenity === 'cafe') category = 'cafe';
    else if (amenity === 'food_court') category = 'food_court';

    const address = [
      tags['addr:housenumber'],
      tags['addr:street'],
      tags['addr:city'] || tags['addr:suburb'],
    ]
      .filter(Boolean)
      .join(', ');

    return {
      id: `${element.type}-${element.id}`,
      name: tags.name,
      type: amenity.replace(/_/g, ' '),
      category,
      lat,
      lng,
      address: address || tags['addr:full'] || undefined,
      phone: tags.phone || tags['contact:phone'] || undefined,
      website: tags.website || tags['contact:website'] || undefined,
      openingHours: tags.opening_hours,
      distanceMeters: Math.round(this.haversineMeters(userLat, userLng, lat, lng)),
    };
  }

  private haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private stripHtml(html: string) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  private extractImageFromRss(description?: string) {
    if (!description) return null;
    const match = description.match(/src="([^"]+)"/);
    return match?.[1] || null;
  }
}
