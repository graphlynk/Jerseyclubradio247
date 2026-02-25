import { createBrowserRouter } from 'react-router';
import Root, { PlayerWrapper } from './Root';
import { Home } from './pages/Home';
import { NewReleases } from './pages/NewReleases';
import { Search } from './pages/Search';
import { Queue } from './pages/Queue';
import { Chat } from './pages/Chat';
import { Games } from './pages/Games';
import { Spades } from './pages/games/Spades';
import { Blackjack } from './pages/games/Blackjack';
import { Crossword } from './pages/games/Crossword';
import { BeatMaker } from './pages/games/BeatMaker';
import { Chess } from './pages/games/Chess';
import { Checkers } from './pages/games/Checkers';
import { DanceVideos } from './pages/DanceVideos';
import { Merch } from './pages/Merch';
import { Crate } from './pages/Crate';
import { TermsOfService } from './pages/TermsOfService';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { Pricing } from './pages/Pricing';
import { RefundPolicy } from './pages/RefundPolicy';

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
        ],
      },
      // Legal pages — standalone layout (no sidebar/player)
      { path: 'terms', Component: TermsOfService },
      { path: 'privacy', Component: PrivacyPolicy },
      { path: 'pricing', Component: Pricing },
      { path: 'refund-policy', Component: RefundPolicy },
    ],
  },
]);