// @ts-ignore
import logoFallback from '../../assets/68b646f3633b265a1c7a40fc0fe58afec9893e27.png';

/**
 * Always returns the JCR branded cover art for every track.
 * This ensures consistent branding across the entire app.
 */
export function getMaxResThumbnail(_videoId: string): string {
  return logoFallback;
}

export function getJcrLogoFallback(): string {
  return logoFallback;
}

/**
 * onError handler — falls back to the local JCR logo if anything goes wrong.
 */
export function handleThumbnailError(
  e: React.SyntheticEvent<HTMLImageElement>,
  _videoId: string
) {
  const img = e.currentTarget;
  img.src = logoFallback;
  img.style.objectFit = 'contain';
  img.style.background = '#0d001e';
}
