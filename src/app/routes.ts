import { createBrowserRouter } from 'react-router';
import Root, { PlayerWrapper } from './Root';
import { lazy } from 'react';

const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const NewReleases = lazy(() => import('./pages/NewReleases').then(m => ({ default: m.NewReleases })));
const Search = lazy(() => import('./pages/Search').then(m => ({ default: m.Search })));
const Queue = lazy(() => import('./pages/Queue').then(m => ({ default: m.Queue })));
const Chat = lazy(() => import('./pages/Chat').then(m => ({ default: m.Chat })));
const Games = lazy(() => import('./pages/Games').then(m => ({ default: m.Games })));
const Spades = lazy(() => import('./pages/games/Spades').then(m => ({ default: m.Spades })));
const Blackjack = lazy(() => import('./pages/games/Blackjack').then(m => ({ default: m.Blackjack })));
const Crossword = lazy(() => import('./pages/games/Crossword').then(m => ({ default: m.Crossword })));
const BeatMaker = lazy(() => import('./pages/games/BeatMaker').then(m => ({ default: m.BeatMaker })));
const Chess = lazy(() => import('./pages/games/Chess').then(m => ({ default: m.Chess })));
const Checkers = lazy(() => import('./pages/games/Checkers').then(m => ({ default: m.Checkers })));
const DanceVideos = lazy(() => import('./pages/DanceVideos').then(m => ({ default: m.DanceVideos })));
const Merch = lazy(() => import('./pages/Merch').then(m => ({ default: m.Merch })));
const Crate = lazy(() => import('./pages/Crate').then(m => ({ default: m.Crate })));
const TermsOfService = lazy(() => import('./pages/TermsOfService').then(m => ({ default: m.TermsOfService })));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const Pricing = lazy(() => import('./pages/Pricing').then(m => ({ default: m.Pricing })));
const RefundPolicy = lazy(() => import('./pages/RefundPolicy').then(m => ({ default: m.RefundPolicy })));
const About = lazy(() => import('./pages/About').then(m => ({ default: m.About })));
const Admin = lazy(() => import('./pages/Admin').then(m => ({ default: m.Admin })));
const Artists = lazy(() => import('./pages/Artists').then(m => ({ default: m.Artists })));
const ArtistDetail = lazy(() => import('./pages/ArtistDetail').then(m => ({ default: m.ArtistDetail })));

export const router = createBrowserRouter([
  {
    path: '/',
    Component: PlayerWrapper,
    children: [
      {
        Component: Root,
        children: [
          { index: true, Component: Home },
          { path: 'new-releases', Component: NewReleases },
          { path: 'search', Component: Search },
          { path: 'queue', Component: Queue },
          { path: 'chat', Component: Chat },
          { path: 'dance-videos', Component: DanceVideos },
          { path: 'merch', Component: Merch },
          { path: 'crate', Component: Crate },
          { path: 'games', Component: Games },
          { path: 'games/spades', Component: Spades },
          { path: 'games/blackjack', Component: Blackjack },
          { path: 'games/crossword', Component: Crossword },
          { path: 'games/beat-maker', Component: BeatMaker },
          { path: 'games/chess', Component: Chess },
          { path: 'games/checkers', Component: Checkers },
          { path: 'artists', Component: Artists },
          { path: 'artists/:slug', Component: ArtistDetail },
        ],
      },
      // Legal pages — standalone layout (no sidebar/player chrome)
      { path: 'terms', Component: TermsOfService },
      { path: 'privacy', Component: PrivacyPolicy },
      { path: 'pricing', Component: Pricing },
      { path: 'refund-policy', Component: RefundPolicy },
      { path: 'about', Component: About },
      { path: 'admin', Component: Admin },
    ],
  },
]);