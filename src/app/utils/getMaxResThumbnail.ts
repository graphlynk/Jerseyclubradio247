/**
 * Returns the sddefault (640x480, no black bars) YouTube thumbnail URL.
 * sddefault exists for virtually every YouTube video and has no black bars baked in.
 */
export function getMaxResThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`;
}

export function getHqFallbackThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * onError handler for track thumbnail <img> tags.
 * Falls back: sddefault -> hqdefault (then stops to avoid infinite loops).
 */
export function handleThumbnailError(
  e: React.SyntheticEvent<HTMLImageElement>,
  videoId: string
) {
  const img = e.currentTarget;
  if (img.src.includes('sddefault')) {
    img.src = getHqFallbackThumbnail(videoId);
  }
}
