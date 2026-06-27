# Progress

Last updated: 2026-06-28

## Current State

The project is a working local-network Romanian Whist app for exactly four players. It uses a custom `server.ts` entry point to run Next.js and Socket.IO together on port `3000` by default. Card SVG assets are served from `/cards`.

The frontend is implemented in `app/page.tsx` as a client-side React app. It supports room creation, joining by room code, reconnecting through a stored client ID, bilingual Romanian/English UI, a table layout, bidding controls, playable-card highlighting, trick reveal feedback, and a score/history modal.

The server game engine is implemented in `src/server/game.ts`. It keeps rooms in memory, validates bids and card plays, deals cards, manages turn order, determines trick winners, scores rounds, tracks positive/negative streak bonuses, and returns per-player public state.

## Current Features

- Create a room with a four-character room code.
- Join an existing room by code.
- Store player name, language, room code, and client ID in browser local storage.
- Rejoin a room after refresh when the same browser keeps its stored client ID.
- Lobby for exactly four players.
- Host-only game start.
- Four-player Romanian Whist round sequence: `1, 1, 1, 1, 2, 3, 4, 5, 6, 7, 8, 8, 8, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1`.
- No trump on hand sizes `1` and `8`; trump card shown on other hand sizes.
- Bidding in dealer-relative order.
- Last bidder is prevented from making total bids equal the number of tricks.
- Turn-based card play with server-side legality checks.
- Follow-suit enforcement.
- Trump enforcement when void in the led suit and holding trump.
- Trick winner calculation with trump support.
- Per-round scoring: exact bid scores `5 + bid`; missed bid loses the absolute difference.
- Positive and negative streak tracking on hand sizes `2` through `7`.
- Round score history and running totals.
- Host-only next-round action.
- Game-end state after the final round.
- Responsive table UI for desktop, mobile portrait, and short landscape screens.
- Windows launcher script that installs dependencies if needed and prints LAN IP addresses.

## Known Issues And Limitations

- Rooms and games are stored only in memory. Restarting the server clears all rooms.
- There is no persistent database, account system, or saved game history.
- There are no automated tests yet for game rules, Socket.IO events, or UI behavior.
- Rooms are not automatically expired or cleaned up.
- The app is designed for exactly four players; there is no support for other player counts.
- Disconnected players are only marked offline. There is no seat replacement flow during a started game.
- Host transfer is not implemented if the host disconnects.
- There is no explicit leave room, restart game, or new game button.
- No spectator mode exists.
- The server accepts open CORS in Socket.IO for local-network convenience.
- The app assumes all players can reach the host over the LAN and that the firewall allows Node.js traffic.
- The project is not currently initialized as a git repository in this workspace.

## Suggested Next Work

- Add focused unit tests for bidding, legal card selection, trick winner selection, scoring, and round transitions.
- Add room cleanup for stale lobbies and abandoned games.
- Add a host-transfer or room-management flow for disconnects.
- Add an explicit restart/new-game flow after `gameEnd`.
- Consider extracting the larger UI pieces from `app/page.tsx` once behavior stabilizes.
