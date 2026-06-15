'use client';

/**
 * Fixed cinematic galaxy backdrop — stars, nebula drift, grain & vignette.
 */
export function GalaxyBackground() {
  return (
    <div className="landing-galaxy-scene" aria-hidden>
      <div className="landing-galaxy-image" />
      <div className="landing-galaxy-aurora" />
      <div className="landing-stars-layer landing-stars-far" />
      <div className="landing-stars-layer landing-stars-mid" />
      <div className="landing-stars-layer landing-stars-near" />
      <div className="landing-nebula-orb landing-nebula-orb-1" />
      <div className="landing-nebula-orb landing-nebula-orb-2" />
      <div className="landing-nebula-orb landing-nebula-orb-3" />
      <div className="landing-shooting-star landing-shooting-star-1" />
      <div className="landing-shooting-star landing-shooting-star-2" />
      <div className="landing-vignette" />
      <div className="landing-film-grain" />
    </div>
  );
}
