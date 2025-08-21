import type { MatchInformation } from 'csgo-sharecode';
import { decodeMatchShareCode, InvalidShareCode as InvalidShareCodeError } from 'csgo-sharecode';
import { startBoiler } from './boiler.js';
import { getValveMatchFromMatchInfoProtobufMessage } from './valve-match.js';
import { isDownloadLinkExpired } from './utils.js';

export interface DownloadResult {
  matchId: string;
  game: string;
  mapName: string;
  date: string;
  demoUrl: string;
  fileName: string;
  sharecode: string;
}

export class InvalidShareCode extends Error {
  constructor(shareCode: string) {
    super(`Invalid share code: ${shareCode}`);
    this.name = 'InvalidShareCode';
  }
}

export class DecodeShareCodeError extends Error {
  constructor(shareCode: string) {
    super(`Error decoding share code: ${shareCode}`);
    this.name = 'DecodeShareCodeError';
  }
}

export class NoMatchesFound extends Error {
  constructor() {
    super('No matches found for the provided share code');
    this.name = 'NoMatchesFound';
  }
}

export class DownloadLinkExpired extends Error {
  constructor() {
    super('Download link has expired');
    this.name = 'DownloadLinkExpired';
  }
}

export async function getDownloadLinkFromShareCode(shareCode: string, silent: boolean = false): Promise<DownloadResult> {
  let matchInformation: MatchInformation;
  
  try {
    matchInformation = decodeMatchShareCode(shareCode);
  } catch (error) {
    if (error instanceof InvalidShareCodeError) {
      throw new InvalidShareCode(shareCode);
    }
    throw new DecodeShareCodeError(shareCode);
  }

  const { matchId, reservationId, tvPort } = matchInformation;
  const matchIdAsString = matchId.toString();
  const reservationIdAsString = reservationId.toString();

  if (!silent) {
    console.log('Connecting to Steam to fetch match information...');
  }
  
  const matchListMessage = await startBoiler([
    matchIdAsString, 
    reservationIdAsString, 
    tvPort.toString()
  ]);

  const { matches } = matchListMessage;
  if (matches.length === 0) {
    throw new NoMatchesFound();
  }

  const match = getValveMatchFromMatchInfoProtobufMessage(matches[0]);
  
  if (!silent) {
    console.log('Demo URL found:', match.demoUrl);
    console.log('Checking if download link is still valid...');
  }
  
  if (!match.demoUrl || match.demoUrl.trim() === '') {
    throw new DownloadLinkExpired();
  }
  
  const isDemoLinkExpired = await isDownloadLinkExpired(match.demoUrl);
  if (isDemoLinkExpired) {
    throw new DownloadLinkExpired();
  }

  return {
    matchId: match.id,
    game: match.game,
    mapName: match.mapName,
    date: match.date,
    demoUrl: match.demoUrl,
    fileName: match.name,
    sharecode: match.sharecode,
  };
}