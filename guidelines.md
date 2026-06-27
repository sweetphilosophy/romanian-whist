# Guidelines

## Product Intent

Build a fast, reliable local Romanian Whist table for exactly four players. The experience should feel like a practical game surface, not a landing page or account-based web product.

## Game Logic

- Keep rules centralized in `src/server/game.ts`.
- Prefer small pure helpers for rule calculations: turn order, legal cards, trick winner, scoring, and bid availability.
- When changing rules, update both server behavior and any UI text that explains the rule.
- Keep game state transitions explicit and easy to audit: `lobby`, `bidding`, `playing`, `roundEnd`, `gameEnd`.
- Preserve the "last bidder cannot make total bids equal tricks" rule unless deliberately changing the Romanian Whist variant.
- Preserve the current round size sequence unless deliberately changing game length.
- Avoid hidden client assumptions about turn order, scoring, or legal cards. The UI may display server-provided options, but the server remains the source of truth.

## Realtime And State

- Send each client only the state it is allowed to see.
- Emit fresh room state after every successful mutating event.
- Keep reconnect behavior based on stable `clientId` values stored in local storage.
- Be cautious with room-level changes while disconnected players exist. The current behavior marks players disconnected and allows reconnection, but does not replace them mid-game.
- Add cleanup deliberately if rooms need expiration; do not silently remove active rooms.

## TypeScript

- Keep `strict` TypeScript compatibility.
- Prefer explicit domain types over broad `string` or `number` values for cards, phases, suits, ranks, and public state.
- Avoid `any`. If a Socket.IO payload is unknown, validate and coerce it at the boundary.
- Keep shared client/server types in `src/shared/types.ts`.
- Keep server-only internal types in `src/server/game.ts` unless they are needed by the client.

## React And UI

- Keep `app/page.tsx` client-side because it owns Socket.IO, local storage, and interactive game state.
- Avoid introducing server components for gameplay state unless the realtime architecture changes.
- Keep mobile and small landscape layouts healthy; phones are a primary target.
- Preserve stable dimensions for cards, seats, buttons, and HUD areas so gameplay does not shift while turns update.
- Keep text short in compact controls.
- Use accessible labels on icon-only buttons and card buttons.
- Keep the score modal usable with long game histories and small screens.

## Styling

- Use `app/globals.css` for the current styling approach.
- Prefer existing CSS variables and component classes.
- Keep cards, controls, and seats at the existing 8px radius style.
- Do not add decorative complexity that competes with gameplay clarity.
- Check both Romanian and English labels when adding UI, because text length can affect layout.

## Assets

- Refer to cards through `/cards/${card.id}.svg`.
- Keep card IDs consistent with the existing file names.
- Do not rename card assets without updating all references and verifying the full deck.

## Testing And Manual QA

- Run `npm run typecheck` after code changes.
- Use `npm run dev` for local manual testing.
- For gameplay changes, test with four independent browser contexts or devices.
- Verify error paths, not just successful paths: invalid room code, non-host start, invalid bid, out-of-turn bid, illegal card, reconnect after refresh.
- When changing layout, verify at desktop width, mobile portrait, and short mobile landscape.

## Dependency Changes

- Add dependencies only when they solve a real project need.
- Keep `package-lock.json` committed with dependency changes.
- Prefer platform-neutral scripts in `package.json`; keep `start-whist.bat` as a Windows convenience wrapper.

## Documentation

- Update `progress.md` when a feature is added, removed, or meaningfully changed.
- Add known issues as soon as they are discovered.
- Keep docs factual and current. Avoid aspirational checklists unless they are clearly marked as planned work.
