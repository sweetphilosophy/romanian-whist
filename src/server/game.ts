export type Suit = "C" | "D" | "H" | "S";
export type Rank =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K"
  | "A";

export type Card = {
  id: string;
  rank: Rank;
  suit: Suit;
};

type Phase = "lobby" | "bidding" | "playing" | "roundEnd" | "gameEnd";

type Player = {
  clientId: string;
  socketId: string;
  name: string;
  connected: boolean;
  host: boolean;
  score: number;
  bid: number | null;
  tricks: number;
  hand: Card[];
  positiveStreak: number;
  negativeStreak: number;
};

type TrickPlay = {
  playerId: string;
  card: Card;
};

type RoundSummary = {
  round: number;
  handSize: number;
  trump: Card | null;
  scores: Array<{
    clientId: string;
    name: string;
    bid: number;
    tricks: number;
    baseDelta: number;
    streakBonus: number;
    delta: number;
    total: number;
    positiveStreak: number;
    negativeStreak: number;
  }>;
};

type CompletedTrick = {
  id: number;
  plays: TrickPlay[];
  winnerId: string;
};

type Room = {
  code: string;
  phase: Phase;
  players: Player[];
  createdAt: number;
  roundIndex: number;
  dealerIndex: number;
  handSize: number;
  trump: Card | null;
  biddingOrder: string[];
  turnOrder: string[];
  currentTurnId: string | null;
  currentTrick: TrickPlay[];
  lastCompletedTrick: CompletedTrick | null;
  trickCounter: number;
  history: RoundSummary[];
};

type Result =
  | { ok: true; roomCode: string }
  | { ok: false; error: string };

type DisconnectResult =
  | { roomCode: string; closed: false }
  | { roomCode: string; closed: true; socketIds: string[] };

const rooms = new Map<string, Room>();
const socketToPlayer = new Map<string, { roomCode: string; clientId: string }>();

const roundSizes = [1, 1, 1, 1, 2, 3, 4, 5, 6, 7, 8, 8, 8, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1];
const suits: Suit[] = ["C", "D", "H", "S"];
const ranks: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const rankValue = new Map<Rank, number>(ranks.map((rank, index) => [rank, index]));

export function getRoomCodes() {
  return [...rooms.keys()];
}

export function getRoomForPlayer(socketId: string) {
  return socketToPlayer.get(socketId)?.roomCode;
}

export function createRoom(socketId: string, payload: { name?: string; clientId?: string }): Result {
  const name = cleanName(payload.name);
  const clientId = cleanClientId(payload.clientId);
  const code = makeRoomCode();

  const room: Room = {
    code,
    phase: "lobby",
    players: [
      {
        clientId,
        socketId,
        name,
        connected: true,
        host: true,
        score: 0,
        bid: null,
        tricks: 0,
        hand: [],
        positiveStreak: 0,
        negativeStreak: 0
      }
    ],
    createdAt: Date.now(),
    roundIndex: 0,
    dealerIndex: 0,
    handSize: roundSizes[0],
    trump: null,
    biddingOrder: [],
    turnOrder: [],
    currentTurnId: null,
    currentTrick: [],
    lastCompletedTrick: null,
    trickCounter: 0,
    history: []
  };

  rooms.set(code, room);
  socketToPlayer.set(socketId, { roomCode: code, clientId });
  return { ok: true, roomCode: code };
}

export function handleJoin(socketId: string, payload: { roomCode?: string; name?: string; clientId?: string }): Result {
  const roomCode = String(payload.roomCode || "").trim().toUpperCase();
  const room = rooms.get(roomCode);
  if (!room) return fail("Room not found.");

  const clientId = cleanClientId(payload.clientId);
  const existing = room.players.find((player) => player.clientId === clientId);
  if (existing) {
    existing.socketId = socketId;
    existing.connected = true;
    existing.name = cleanName(payload.name || existing.name);
    socketToPlayer.set(socketId, { roomCode, clientId });
    return { ok: true, roomCode };
  }

  if (room.phase !== "lobby") return fail("The game has already started.");
  if (room.players.length >= 4) return fail("This room already has four players.");

  room.players.push({
    clientId,
    socketId,
    name: cleanName(payload.name),
    connected: true,
    host: false,
    score: 0,
    bid: null,
    tricks: 0,
    hand: [],
    positiveStreak: 0,
    negativeStreak: 0
  });

  socketToPlayer.set(socketId, { roomCode, clientId });
  return { ok: true, roomCode };
}

export function handleReconnect(socketId: string, payload: { roomCode?: string; name?: string; clientId?: string }): Result {
  const roomCode = String(payload.roomCode || "").trim().toUpperCase();
  const room = rooms.get(roomCode);
  if (!room) return fail("Room not found.");
  if (room.phase === "lobby") return fail("Lobby rooms do not auto-reconnect.");

  const clientId = cleanClientId(payload.clientId);
  const existing = room.players.find((player) => player.clientId === clientId);
  if (!existing) return fail("Player not found in that room.");

  existing.socketId = socketId;
  existing.connected = true;
  existing.name = cleanName(payload.name || existing.name);
  socketToPlayer.set(socketId, { roomCode, clientId });
  return { ok: true, roomCode };
}

export function handleStartGame(socketId: string, payload: { roomCode?: string }): Result {
  const found = requireRoom(socketId, payload.roomCode);
  if (!found.ok) return found;

  const { room, player } = found;
  if (!player.host) return fail("Only the host can start the game.");
  if (room.phase !== "lobby") return fail("The game is already running.");
  if (room.players.length !== 4) return fail("Romanian Whist is set up for exactly four players.");

  room.roundIndex = 0;
  room.dealerIndex = 0;
  room.history = [];
  for (const participant of room.players) {
    participant.score = 0;
    participant.positiveStreak = 0;
    participant.negativeStreak = 0;
  }
  startRound(room);
  return { ok: true, roomCode: room.code };
}

export function handleBid(socketId: string, payload: { roomCode?: string; bid?: number }): Result {
  const found = requireRoom(socketId, payload.roomCode);
  if (!found.ok) return found;

  const { room, player } = found;
  if (room.phase !== "bidding") return fail("It is not bidding time.");
  if (room.currentTurnId !== player.clientId) return fail("It is not your bid.");

  const bid = Number(payload.bid);
  if (!Number.isInteger(bid) || bid < 0 || bid > room.handSize) {
    return fail(`Bid must be between 0 and ${room.handSize}.`);
  }

  const bidIndex = room.biddingOrder.indexOf(player.clientId);
  const isLastBidder = bidIndex === room.biddingOrder.length - 1;
  const previousTotal = room.players.reduce((total, next) => total + (next.bid ?? 0), 0);
  if (isLastBidder && previousTotal + bid === room.handSize) {
    return fail("The total bids cannot equal the number of tricks.");
  }

  player.bid = bid;
  const nextBidder = room.biddingOrder[bidIndex + 1];
  if (nextBidder) {
    room.currentTurnId = nextBidder;
  } else {
    room.phase = "playing";
    room.currentTurnId = room.turnOrder[0];
  }

  return { ok: true, roomCode: room.code };
}

export function handlePlayCard(socketId: string, payload: { roomCode?: string; cardId?: string }): Result {
  const found = requireRoom(socketId, payload.roomCode);
  if (!found.ok) return found;

  const { room, player } = found;
  if (room.phase !== "playing") return fail("It is not card play time.");
  if (room.currentTurnId !== player.clientId) return fail("It is not your turn.");

  const cardIndex = player.hand.findIndex((card) => card.id === payload.cardId);
  if (cardIndex < 0) return fail("That card is not in your hand.");

  const card = player.hand[cardIndex];
  if (!legalCards(room, player).some((legalCard) => legalCard.id === card.id)) {
    return fail("You must follow suit, or play trump if you are void and have trump.");
  }

  if (room.currentTrick.length === 0) room.lastCompletedTrick = null;

  player.hand.splice(cardIndex, 1);
  room.currentTrick.push({ playerId: player.clientId, card });

  if (room.currentTrick.length < room.players.length) {
    const currentOrderIndex = room.turnOrder.indexOf(player.clientId);
    room.currentTurnId = room.turnOrder[(currentOrderIndex + 1) % room.turnOrder.length];
    return { ok: true, roomCode: room.code };
  }

  const winnerId = getTrickWinner(room.currentTrick, room.trump?.suit ?? null);
  const winner = room.players.find((candidate) => candidate.clientId === winnerId);
  if (winner) winner.tricks += 1;

  room.trickCounter += 1;
  room.lastCompletedTrick = {
    id: room.trickCounter,
    plays: [...room.currentTrick],
    winnerId
  };
  room.turnOrder = rotateOrder(room.players.map((next) => next.clientId), winnerId);
  room.currentTrick = [];

  const cardsLeft = room.players.reduce((total, candidate) => total + candidate.hand.length, 0);
  if (cardsLeft === 0) {
    finishRound(room);
  } else {
    room.currentTurnId = winnerId;
  }

  return { ok: true, roomCode: room.code };
}

export function handleNextRound(socketId: string, payload: { roomCode?: string }): Result {
  const found = requireRoom(socketId, payload.roomCode);
  if (!found.ok) return found;

  const { room, player } = found;
  if (!player.host) return fail("Only the host can continue.");
  if (room.phase !== "roundEnd") return fail("The round is not finished yet.");

  room.roundIndex += 1;
  if (room.roundIndex >= roundSizes.length) {
    room.phase = "gameEnd";
    room.currentTurnId = null;
  } else {
    room.dealerIndex = (room.dealerIndex + 1) % room.players.length;
    startRound(room);
  }

  return { ok: true, roomCode: room.code };
}

export function handleDisconnect(socketId: string): DisconnectResult | null {
  const location = socketToPlayer.get(socketId);
  if (!location) return null;

  const room = rooms.get(location.roomCode);
  if (!room) {
    socketToPlayer.delete(socketId);
    return null;
  }

  if (room.phase === "lobby") {
    const socketIds = room.players.map((candidate) => candidate.socketId);
    for (const candidate of room.players) {
      socketToPlayer.delete(candidate.socketId);
    }
    rooms.delete(room.code);
    return { roomCode: room.code, closed: true, socketIds };
  }

  const player = room?.players.find((candidate) => candidate.clientId === location.clientId);
  if (player) player.connected = false;
  socketToPlayer.delete(socketId);
  return { roomCode: location.roomCode, closed: false };
}

export function publicStateFor(roomCode: string, socketId: string) {
  const room = rooms.get(roomCode);
  const location = socketToPlayer.get(socketId);
  if (!room || !location) return null;

  const me = room.players.find((player) => player.clientId === location.clientId);
  if (!me) return null;

  return {
    code: room.code,
    phase: room.phase,
    meId: me.clientId,
    hostId: room.players.find((player) => player.host)?.clientId ?? null,
    roundIndex: room.roundIndex,
    totalRounds: roundSizes.length,
    handSize: room.handSize,
    trump: room.trump,
    dealerId: room.players[room.dealerIndex]?.clientId ?? null,
    currentTurnId: room.currentTurnId,
    biddingOrder: room.biddingOrder,
    currentTrick: room.currentTrick,
    lastCompletedTrick: room.lastCompletedTrick,
    history: room.history,
    players: room.players.map((player) => ({
      clientId: player.clientId,
      name: player.name,
      connected: player.connected,
      host: player.host,
      score: player.score,
      bid: player.bid,
      tricks: player.tricks,
      handCount: player.hand.length,
      positiveStreak: player.positiveStreak,
      negativeStreak: player.negativeStreak
    })),
    hand: sortHand(me.hand),
    legalCardIds: me.clientId === room.currentTurnId && room.phase === "playing" ? legalCards(room, me).map((card) => card.id) : [],
    allowedBids: me.clientId === room.currentTurnId && room.phase === "bidding" ? allowedBids(room, me) : []
  };
}

function startRound(room: Room) {
  room.phase = "bidding";
  room.handSize = roundSizes[room.roundIndex];
  room.trump = null;
  room.currentTrick = [];
  room.lastCompletedTrick = null;
  room.trickCounter = 0;

  for (const player of room.players) {
    player.bid = null;
    player.tricks = 0;
    player.hand = [];
  }

  const deck = shuffle(createDeck());
  const firstPlayer = (room.dealerIndex + 1) % room.players.length;
  for (let cardNumber = 0; cardNumber < room.handSize; cardNumber += 1) {
    for (let offset = 0; offset < room.players.length; offset += 1) {
      const player = room.players[(firstPlayer + offset) % room.players.length];
      const card = deck.pop();
      if (card) player.hand.push(card);
    }
  }

  room.trump = hasTrump(room.handSize) ? deck.pop() ?? null : null;
  for (const player of room.players) {
    player.hand = sortHand(player.hand);
  }

  const order = room.players.map((player) => player.clientId);
  const firstPlayerId = room.players[firstPlayer].clientId;
  room.biddingOrder = rotateOrder(order, firstPlayerId);
  room.turnOrder = [...room.biddingOrder];
  room.currentTurnId = room.biddingOrder[0];
}

function finishRound(room: Room) {
  const streakRound = room.handSize >= 2 && room.handSize <= 7;
  const scores = room.players.map((player) => {
    const bid = player.bid ?? 0;
    const baseDelta = bid === player.tricks ? 5 + bid : -Math.abs(bid - player.tricks);
    let streakBonus = 0;

    if (streakRound) {
      if (baseDelta > 0) {
        player.positiveStreak += 1;
        player.negativeStreak = 0;
        if (player.positiveStreak === 5) {
          streakBonus = 10;
          player.positiveStreak = 0;
        }
      } else if (baseDelta < 0) {
        player.negativeStreak += 1;
        player.positiveStreak = 0;
        if (player.negativeStreak === 5) {
          streakBonus = -10;
          player.negativeStreak = 0;
        }
      }
    } else {
      player.positiveStreak = 0;
      player.negativeStreak = 0;
    }

    const delta = baseDelta + streakBonus;
    player.score += delta;
    return {
      clientId: player.clientId,
      name: player.name,
      bid,
      tricks: player.tricks,
      baseDelta,
      streakBonus,
      delta,
      total: player.score,
      positiveStreak: player.positiveStreak,
      negativeStreak: player.negativeStreak
    };
  });

  room.history.push({
    round: room.roundIndex + 1,
    handSize: room.handSize,
    trump: room.trump,
    scores
  });
  room.phase = room.roundIndex === roundSizes.length - 1 ? "gameEnd" : "roundEnd";
  room.currentTurnId = null;
}

function createDeck(): Card[] {
  return suits.flatMap((suit) => ranks.map((rank) => ({ id: `${rank}${suit}`, rank, suit })));
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function getTrickWinner(trick: TrickPlay[], trumpSuit: Suit | null) {
  const leadSuit = trick[0].card.suit;
  return trick.reduce((winner, play) => {
    const winnerCard = winner.card;
    const playIsTrump = trumpSuit !== null && play.card.suit === trumpSuit;
    const winnerIsTrump = trumpSuit !== null && winnerCard.suit === trumpSuit;

    if (playIsTrump && !winnerIsTrump) return play;
    if (playIsTrump === winnerIsTrump && play.card.suit === winnerCard.suit) {
      return cardPower(play.card) > cardPower(winnerCard) ? play : winner;
    }
    if (!winnerIsTrump && play.card.suit === leadSuit && winnerCard.suit !== leadSuit) return play;
    return winner;
  }, trick[0]).playerId;
}

function cardPower(card: Card) {
  return rankValue.get(card.rank) ?? 0;
}

function sortHand(hand: Card[]) {
  return [...hand].sort((left, right) => {
    if (left.suit !== right.suit) return suits.indexOf(left.suit) - suits.indexOf(right.suit);
    return cardPower(left) - cardPower(right);
  });
}

function legalCards(room: Room, player: Player) {
  const leadSuit = room.currentTrick[0]?.card.suit;
  if (!leadSuit) return player.hand;
  const suited = player.hand.filter((card) => card.suit === leadSuit);
  if (suited.length > 0) return suited;

  const trumpSuit = room.trump?.suit ?? null;
  if (!trumpSuit) return player.hand;

  const trumps = player.hand.filter((card) => card.suit === trumpSuit);
  return trumps.length > 0 ? trumps : player.hand;
}

function hasTrump(handSize: number) {
  return handSize !== 1 && handSize !== 8;
}

function allowedBids(room: Room, player: Player) {
  const values = Array.from({ length: room.handSize + 1 }, (_, index) => index);
  const bidIndex = room.biddingOrder.indexOf(player.clientId);
  if (bidIndex !== room.biddingOrder.length - 1) return values;

  const previousTotal = room.players.reduce((total, next) => total + (next.bid ?? 0), 0);
  return values.filter((bid) => previousTotal + bid !== room.handSize);
}

function rotateOrder(order: string[], firstId: string) {
  const index = order.indexOf(firstId);
  return index < 0 ? order : [...order.slice(index), ...order.slice(0, index)];
}

function requireRoom(socketId: string, roomCode?: string):
  | { ok: true; room: Room; player: Player }
  | { ok: false; error: string } {
  const location = socketToPlayer.get(socketId);
  const code = String(roomCode || location?.roomCode || "").trim().toUpperCase();
  const room = rooms.get(code);
  if (!room || !location || location.roomCode !== code) return fail("You are not in that room.");

  const player = room.players.find((candidate) => candidate.clientId === location.clientId);
  if (!player) return fail("Player not found.");
  return { ok: true, room, player };
}

function cleanName(name?: string) {
  const clean = String(name || "").trim().slice(0, 24);
  return clean || "Player";
}

function cleanClientId(clientId?: string) {
  const clean = String(clientId || "").trim();
  return clean || crypto.randomUUID();
}

function makeRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let code = "";
    for (let index = 0; index < 4; index += 1) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    if (!rooms.has(code)) return code;
  }
  return crypto.randomUUID().slice(0, 4).toUpperCase();
}

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}
