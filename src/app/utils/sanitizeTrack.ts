import { Track } from '../context/PlayerContext';
import { decodeHtmlEntities } from './decodeHtmlEntities';

// Easy-to-update blocklist for external radio stations
export const RADIO_STATION_BLOCKLIST = [
    "TheLotRadio",
    "The Lot Radio",
    "@TheLotRadio"
];

const MAX_TITLE_LENGTH = 60;

/**
 * Automates track cleaning before UI rendering or playlist ingestion.
 * Handles:
 * 1. Blocking specific radio stations
 * 2. Stripping @ handles
 * 3. Intelligently truncating long titles without breaking words
 * 4. Decoding HTML entities
 * 
 * @returns Cleaned Track | null if the track is blocked
 */
export function sanitizeTrack(t: Track): Track | null {
    let title = decodeHtmlEntities(t.snippet.title);
    let artist = decodeHtmlEntities(t.snippet.channelTitle);

    // 1. Filter out blocklisted radio stations
    const textToCheck = `${title} ${artist}`.toLowerCase();
    const isBlocked = RADIO_STATION_BLOCKLIST.some(blocked =>
        textToCheck.includes(blocked.toLowerCase())
    );

    if (isBlocked) {
        return null;
    }

    // 2. Remove @ handles from title (e.g. @GuapyBeats)
    // Replaces @ followed by word characters and any trailing punctuation/whitespace
    title = title.replace(/@[a-zA-Z0-9_-]+[\s]*[.,!?|-]*[\s]*/g, '').trim();

    // Clean up any trailing hanging characters like "-" or "|" that might be left perfectly at the end after replacing
    title = title.replace(/[\s\-|]+$/, '').trim();

    // 3. Shorten titles > 60 chars (cut at last full word)
    if (title.length > MAX_TITLE_LENGTH) {
        const substr = title.substring(0, MAX_TITLE_LENGTH);
        // Find the last space to avoid cutting a word in half
        const lastSpace = substr.lastIndexOf(' ');
        if (lastSpace > 0) {
            title = substr.substring(0, lastSpace);
        } else {
            title = substr;
        }
        // Clean trailing punctuation again just in case the cut happened before a dash
        title = title.replace(/[\s\-|.,!?]+$/, '').trim();
    }

    return {
        ...t,
        snippet: {
            ...t.snippet,
            title,
            channelTitle: artist,
        },
    };
}
