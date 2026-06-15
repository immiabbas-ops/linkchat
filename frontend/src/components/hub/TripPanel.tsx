'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plane,
  Hotel,
  Car,
  MapPin,
  Calendar,
  Users,
  ExternalLink,
  Trash2,
  CloudSun,
  Luggage,
  Search,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  bookingHotelsUrl,
  googleFlightsUrl,
  googleMapsExploreUrl,
  kayakFlightsUrl,
  openWeatherUrl,
  rentalCarsUrl,
  skyscannerFlightsUrl,
  type TripSearch,
} from '@/lib/trip-links';
import { cn } from '@/lib/utils';

type Tab = 'flights' | 'hotels' | 'car' | 'activities' | 'saved';

interface SavedTrip {
  id: string;
  title: string;
  destination: string;
  fromCity?: string;
  toCity?: string;
  departDate?: string;
  returnDate?: string;
  checkIn?: string;
  checkOut?: string;
  travelers: number;
  notes?: string;
  createdAt: string;
}

interface Attraction {
  id: string;
  name: string;
  type: string;
  website?: string | null;
}

const tabs: { id: Tab; label: string; icon: typeof Plane }[] = [
  { id: 'flights', label: 'Flights', icon: Plane },
  { id: 'hotels', label: 'Hotels', icon: Hotel },
  { id: 'car', label: 'Car', icon: Car },
  { id: 'activities', label: 'Activities', icon: MapPin },
  { id: 'saved', label: 'Saved', icon: Luggage },
];

const popularDestinations = ['Dubai', 'London', 'Paris', 'Istanbul', 'Bangkok', 'New York'];

function openUrl(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function TripPanel() {
  const [tab, setTab] = useState<Tab>('flights');
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [destination, setDestination] = useState('');
  const [departDate, setDepartDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [travelers, setTravelers] = useState(1);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState<SavedTrip[]>([]);
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [activityCity, setActivityCity] = useState('');
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const tripSearch = (): TripSearch => ({
    fromCity,
    toCity: toCity || destination,
    destination: destination || toCity,
    departDate,
    returnDate,
    checkIn: checkIn || departDate,
    checkOut: checkOut || returnDate,
    travelers,
  });

  const loadSaved = () => {
    api.get<SavedTrip[]>('/services/trips').then(setSaved).catch(() => setSaved([]));
  };

  useEffect(() => {
    if (tab === 'saved') loadSaved();
  }, [tab]);

  const saveTrip = async () => {
    const dest = destination.trim() || toCity.trim();
    if (!dest && !fromCity.trim()) return;
    setSaving(true);
    setSavedMsg('');
    try {
      await api.post('/services/trips', {
        title: dest ? `Trip to ${dest}` : `Flight from ${fromCity}`,
        destination: dest || toCity || fromCity,
        fromCity: fromCity || undefined,
        toCity: toCity || dest || undefined,
        departDate: departDate || undefined,
        returnDate: returnDate || undefined,
        checkIn: checkIn || departDate || undefined,
        checkOut: checkOut || returnDate || undefined,
        travelers,
        notes: notes || undefined,
      });
      setSavedMsg('Trip saved to your list');
      loadSaved();
    } catch {
      setSavedMsg('Could not save trip');
    } finally {
      setSaving(false);
    }
  };

  const searchActivities = async (city?: string) => {
    const q = (city || activityCity || destination || toCity).trim();
    if (!q) return;
    setActivityCity(q);
    setLoadingActivities(true);
    try {
      const items = await api.get<Attraction[]>(`/services/trips/attractions?city=${encodeURIComponent(q)}`);
      setAttractions(items);
    } catch {
      setAttractions([]);
    } finally {
      setLoadingActivities(false);
    }
  };

  const removeTrip = async (id: string) => {
    await api.delete(`/services/trips/${id}`);
    loadSaved();
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 overflow-y-auto px-4 pb-0 pt-3">
        <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-hide">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-colors',
                tab === id
                  ? 'bg-[var(--accent-dark)] text-white'
                  : 'bg-black/[0.06] text-[var(--text-secondary)]',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {tab !== 'saved' && tab !== 'activities' && (
          <div className="mb-4 space-y-3 rounded-2xl glass p-4">
            {tab === 'flights' && (
              <>
                <input
                  value={fromCity}
                  onChange={(e) => setFromCity(e.target.value)}
                  placeholder="From (city or airport)"
                  className="w-full rounded-xl border border-[var(--border-glass)] bg-[var(--input-bg)] px-4 py-3 text-sm focus:border-[var(--accent)] focus:outline-none"
                />
                <input
                  value={toCity}
                  onChange={(e) => {
                    setToCity(e.target.value);
                    if (!destination) setDestination(e.target.value);
                  }}
                  placeholder="To (city or airport)"
                  className="w-full rounded-xl border border-[var(--border-glass)] bg-[var(--input-bg)] px-4 py-3 text-sm focus:border-[var(--accent)] focus:outline-none"
                />
              </>
            )}
            {(tab === 'hotels' || tab === 'car') && (
              <input
                value={destination}
                onChange={(e) => {
                  setDestination(e.target.value);
                  if (!toCity) setToCity(e.target.value);
                }}
                placeholder="Destination city"
                className="w-full rounded-xl border border-[var(--border-glass)] bg-[var(--input-bg)] px-4 py-3 text-sm focus:border-[var(--accent)] focus:outline-none"
              />
            )}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={tab === 'flights' ? departDate : checkIn || departDate}
                onChange={(e) => {
                  if (tab === 'flights') setDepartDate(e.target.value);
                  else setCheckIn(e.target.value);
                }}
                className="w-full rounded-xl border border-[var(--border-glass)] bg-[var(--input-bg)] px-4 py-3 text-sm focus:border-[var(--accent)] focus:outline-none"
              />
              <input
                type="date"
                value={tab === 'flights' ? returnDate : checkOut || returnDate}
                onChange={(e) => {
                  if (tab === 'flights') setReturnDate(e.target.value);
                  else setCheckOut(e.target.value);
                }}
                className="w-full rounded-xl border border-[var(--border-glass)] bg-[var(--input-bg)] px-4 py-3 text-sm focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[var(--text-secondary)]" />
              <input
                type="number"
                min={1}
                max={9}
                value={travelers}
                onChange={(e) => setTravelers(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 rounded-xl border border-[var(--border-glass)] bg-[var(--input-bg)] px-4 py-3 text-sm focus:border-[var(--accent)] focus:outline-none"
              />
              <span className="text-xs text-[var(--text-secondary)]">travelers</span>
            </div>
          </div>
        )}

        {tab === 'flights' && (
          <Section title="Search flights">
            <p className="mb-3 text-xs text-[var(--text-secondary)]">
              Compare prices on trusted sites — opens in a new tab
            </p>
            <ActionButton label="Google Flights" onClick={() => openUrl(googleFlightsUrl(tripSearch()))} />
            <ActionButton label="Skyscanner" onClick={() => openUrl(skyscannerFlightsUrl(tripSearch()))} />
            <ActionButton label="Kayak" onClick={() => openUrl(kayakFlightsUrl(tripSearch()))} />
            <Callout
              title="Airport transfer"
              text="Need a ride to or from the airport?"
              action={
                <Link href="/hub?service=taxi" className="text-xs font-medium text-[var(--accent-dark)]">
                  Book Taxi in Hub →
                </Link>
              }
            />
          </Section>
        )}

        {tab === 'hotels' && (
          <Section title="Search hotels">
            <p className="mb-3 text-xs text-[var(--text-secondary)]">
              Find stays by city and dates on Booking.com
            </p>
            <ActionButton
              label="Search on Booking.com"
              onClick={() => openUrl(bookingHotelsUrl(tripSearch()))}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {popularDestinations.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => {
                    setDestination(city);
                    setToCity(city);
                  }}
                  className="rounded-full bg-black/[0.06] px-3 py-1 text-xs text-[var(--text-secondary)]"
                >
                  {city}
                </button>
              ))}
            </div>
            <Callout
              title="Weather"
              text="Check forecast before you pack"
              action={
                <button
                  type="button"
                  onClick={() => openUrl(openWeatherUrl(destination || toCity))}
                  className="flex items-center gap-1 text-xs font-medium text-[var(--accent-dark)]"
                >
                  <CloudSun className="h-3.5 w-3.5" />
                  View weather
                </button>
              }
            />
          </Section>
        )}

        {tab === 'car' && (
          <Section title="Car rental">
            <p className="mb-3 text-xs text-[var(--text-secondary)]">
              Rent a car at your destination — compare on Kayak
            </p>
            <ActionButton label="Search car rental" onClick={() => openUrl(rentalCarsUrl(tripSearch()))} />
          </Section>
        )}

        {tab === 'activities' && (
          <Section title="Things to do">
            <div className="mb-3 flex gap-2">
              <input
                value={activityCity}
                onChange={(e) => setActivityCity(e.target.value)}
                placeholder="City (e.g. Dubai)"
                className="w-full flex-1 rounded-xl border border-[var(--border-glass)] bg-[var(--input-bg)] px-4 py-3 text-sm focus:border-[var(--accent)] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => searchActivities()}
                disabled={loadingActivities}
                className="rounded-xl bg-[var(--accent-dark)] px-4 text-white disabled:opacity-50"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {popularDestinations.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => searchActivities(city)}
                  className="rounded-full bg-black/[0.06] px-3 py-1 text-xs"
                >
                  {city}
                </button>
              ))}
            </div>
            {loadingActivities ? (
              <p className="text-sm text-[var(--text-secondary)]">Loading places…</p>
            ) : attractions.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">
                Search a city to see museums, attractions & viewpoints (OpenStreetMap)
              </p>
            ) : (
              <ul className="space-y-2">
                {attractions.map((a) => (
                  <li key={a.id} className="rounded-xl bg-black/[0.04] px-3 py-2.5">
                    <p className="text-sm font-medium">{a.name}</p>
                    <p className="text-xs capitalize text-[var(--text-secondary)]">{a.type}</p>
                  </li>
                ))}
              </ul>
            )}
            {(activityCity || destination) && (
              <button
                type="button"
                onClick={() => openUrl(googleMapsExploreUrl(activityCity || destination))}
                className="mt-3 flex items-center gap-1 text-xs font-medium text-[var(--accent-dark)]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                More on Google Maps
              </button>
            )}
          </Section>
        )}

        {tab === 'saved' && (
          <Section title="Your saved trips">
            {saved.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">
                No saved trips yet. Plan a flight or hotel and tap Save trip.
              </p>
            ) : (
              <ul className="space-y-3">
                {saved.map((t) => (
                  <li key={t.id} className="rounded-xl glass p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{t.title}</p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          {t.fromCity && `${t.fromCity} → `}
                          {t.toCity || t.destination}
                        </p>
                        {(t.departDate || t.checkIn) && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                            <Calendar className="h-3 w-3" />
                            {t.departDate || t.checkIn}
                            {(t.returnDate || t.checkOut) && ` – ${t.returnDate || t.checkOut}`}
                          </p>
                        )}
                        <p className="text-xs text-[var(--text-secondary)]">{t.travelers} traveler(s)</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTrip(t.id)}
                        className="rounded-full p-2 text-[var(--text-secondary)] hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <MiniLink label="Flights" url={googleFlightsUrl(t)} />
                      <MiniLink label="Hotels" url={bookingHotelsUrl(t)} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}

        {tab !== 'saved' && tab !== 'activities' && (
          <div className="mt-4 space-y-2">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Trip notes (optional)"
              rows={2}
                className="w-full rounded-xl border border-[var(--border-glass)] bg-[var(--input-bg)] px-4 py-3 text-sm focus:border-[var(--accent)] focus:outline-none resize-none"
            />
            <button
              type="button"
              onClick={saveTrip}
              disabled={saving}
              className="w-full rounded-xl bg-[var(--accent-dark)] py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save trip'}
            </button>
            {savedMsg && <p className="text-center text-xs text-[var(--accent-dark)]">{savedMsg}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-2 flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-sky-500 to-cyan-600 px-4 py-3 text-sm font-medium text-white"
    >
      {label}
      <ExternalLink className="h-4 w-4 opacity-80" />
    </button>
  );
}

function Callout({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action: React.ReactNode;
}) {
  return (
    <div className="mt-4 rounded-xl border border-black/[0.06] bg-black/[0.03] px-4 py-3">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{text}</p>
      <div className="mt-2">{action}</div>
    </div>
  );
}

function MiniLink({ label, url }: { label: string; url: string }) {
  return (
    <button
      type="button"
      onClick={() => openUrl(url)}
      className="rounded-lg bg-black/[0.06] px-2 py-1 text-[10px] font-medium"
    >
      {label}
    </button>
  );
}
