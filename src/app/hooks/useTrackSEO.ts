import { useEffect } from 'react';
import { Track } from '../context/PlayerContext';
import { generateTrackSEO } from '../utils/normalizeTrackTitle';
import { formatTrackTitle } from '../utils/formatTrackTitle';
import { formatArtistName } from '../utils/formatArtistName';

/**
 * Auto-updates document <head> meta tags and JSON-LD structured data
 * whenever the current track changes.
 *
 * Generates SEO on-the-fly from the DISPLAY-FORMATTED title and artist,
 * keeping it purely in the display layer — no dependency on source data mutations.
 */
export function useTrackSEO(currentTrack: Track | null) {
  useEffect(() => {
    if (!currentTrack) {
      document.title = 'Jersey Club Radio | 24/7 Jersey Club Music';
      updateMeta('description', '24/7 Jersey Club music streaming. Listen to the best Jersey Club tracks, mixes, and new releases.');
      removeJsonLd();
      return;
    }

    try {
      const title = formatTrackTitle(currentTrack.snippet.title, currentTrack.snippet.channelTitle);
      const artist = formatArtistName(currentTrack.snippet.channelTitle) || 'Jersey Club Radio';
      const seo = generateTrackSEO(title, artist);

      document.title = seo.title;
      updateMeta('description', seo.description);
      updateMeta('og:title', seo.title);
      updateMeta('og:description', seo.description);
      updateMeta('og:type', 'music.song');
      updateMeta('og:site_name', 'Jersey Club Radio');
      updateMeta('twitter:title', seo.title);
      updateMeta('twitter:description', seo.description);
      updateJsonLd(seo.jsonLd);
    } catch (err) {
      console.warn('[useTrackSEO] Error updating SEO meta tags:', err);
      document.title = 'Jersey Club Radio | 24/7 Jersey Club Music';
    }

    return () => {
      document.title = 'Jersey Club Radio | 24/7 Jersey Club Music';
    };
  }, [currentTrack?.id?.videoId]);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function updateMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement
    || document.querySelector(`meta[property="${name}"]`) as HTMLMetaElement;

  if (!el) {
    el = document.createElement('meta');
    if (name.startsWith('og:') || name.startsWith('twitter:')) {
      el.setAttribute('property', name);
    } else {
      el.setAttribute('name', name);
    }
    document.head.appendChild(el);
  }

  el.setAttribute('content', content);
}

function updateJsonLd(data: Record<string, unknown>) {
  const id = 'jcr-track-jsonld';
  let script = document.getElementById(id) as HTMLScriptElement;

  if (!script) {
    script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }

  script.textContent = JSON.stringify(data);
}

function removeJsonLd() {
  const el = document.getElementById('jcr-track-jsonld');
  if (el) el.remove();
}
