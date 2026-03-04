const JCR_LOGO = '/Black%20And%20White%20Minimalist%20Professional%20%20Initial%20Logo%20(4).png';

/**
 * Always returns the JCR branded cover art for every track.
 * This ensures consistent branding across the entire app.
 */
export function getMaxResThumbnail(_videoId: string): string {
  return JCR_LOGO;
}

export function getJcrLogoFallback(): string {
  return JCR_LOGO;
}

/**
 * onError handler — falls back to the local JCR logo if anything goes wrong.
 */
export function handleThumbnailError(
  e: React.SyntheticEvent<HTMLImageElement>,
  _videoId: string
) {
  const img = e.currentTarget;
  img.src = JCR_LOGO;
  img.style.objectFit = 'contain';
  img.style.background = 'transparent';
}
