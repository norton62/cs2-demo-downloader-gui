import { encodeMatch } from 'csgo-sharecode';
import {
  type CDataGCCStrike15_v2_MatchInfo,
  type CMsgGCCStrike15_v2_MatchmakingGC2ServerReserve,
  type CMsgGCCStrike15_v2_MatchmakingServerRoundStats,
  type WatchableMatchInfo,
  CDataGCCStrike15_v2_MatchInfoSchema,
  toBinary,
} from 'csgo-protobuf';
import { unixTimestampToDate, sumNumberArray } from './utils.js';

export enum Game {
  CSGO = 'csgo',
  CS2 = 'cs2',
}

export enum TeamNumber {
  T = 2,
  CT = 3,
}

export enum ValveMatchResult {
  Tied = 0,
  TWon = 1,
  CTWon = 2,
}

export interface ValveMatch {
  id: string;
  game: Game;
  name: string;
  mapName: string;
  date: string;
  durationInSeconds: number;
  scoreTeamStartedCT: number;
  scoreTeamStartedT: number;
  result: ValveMatchResult;
  teamNameStartedCT: string;
  teamNameStartedT: string;
  killCount: number;
  assistCount: number;
  deathCount: number;
  demoUrl: string;
  sharecode: string;
}

type GameMode = 8 | 10;

function getMapName(gameType: number): string {
  const map = (gameType >> 8) & 0xffffff;
  const gameMode = (gameType & 0xff) as GameMode;
  const competitiveMode: GameMode = 8;
  const wingmanMode: GameMode = 10;

  const mapping = {
    [1 << 0]: 'de_grail',
    [1 << 1]: 'de_dust2',
    [1 << 2]: 'de_train',
    [1 << 3]: 'de_ancient',
    [1 << 4]: 'de_inferno',
    [1 << 5]: 'de_nuke',
    [1 << 6]: 'de_vertigo',
    [1 << 7]: {
      [competitiveMode]: 'de_mirage',
      [wingmanMode]: 'de_palais',
    },
    [1 << 8]: 'cs_office',
    [1 << 9]: 'de_brewery',
    [1 << 10]: 'de_whistle',
    [1 << 11]: 'de_dogtown',
    [1 << 12]: 'de_cache',
    [1 << 13]: 'de_jura',
    [1 << 14]: 'de_edin',
    [1 << 15]: 'de_anubis',
    [1 << 16]: 'de_tuscan',
    [1 << 18]: 'de_basalt',
    [1 << 19]: 'cs_agency',
    [1 << 20]: 'de_overpass',
    [1 << 21]: 'de_cobblestone',
    [1 << 22]: 'de_canals',
  } as const;

  if (typeof mapping[map] === 'string') {
    return mapping[map];
  }

  return mapping[map]?.[gameMode] ?? 'Unknown';
}

function getLastRoundStatsMessage(matchInfoMessage: CDataGCCStrike15_v2_MatchInfo) {
  const { roundstatsLegacy, roundstatsall } = matchInfoMessage;
  return roundstatsLegacy ?? roundstatsall[roundstatsall.length - 1];
}

function getMatchResult(lastRoundMsg: CMsgGCCStrike15_v2_MatchmakingServerRoundStats): ValveMatchResult {
  const matchResult = lastRoundMsg.matchResult;

  if (matchResult === undefined || matchResult === 0) {
    return ValveMatchResult.Tied;
  }

  if (matchResult === 1) {
    return lastRoundMsg.bSwitchedTeams ? ValveMatchResult.CTWon : ValveMatchResult.TWon;
  }

  return lastRoundMsg.bSwitchedTeams ? ValveMatchResult.TWon : ValveMatchResult.CTWon;
}

function buildMatchName(lastRoundReservationId: bigint, tvPort: number, serverIp: number) {
  return `match730_${lastRoundReservationId.toString().padStart(21, '0')}_${tvPort
    .toString()
    .padStart(10, '0')}_${serverIp}`;
}

function getTeamNames(tournamentTeams: any[]) {
  let teamNameStartedCT = 'Team CT';
  let teamNameStartedT = 'Team T';
  if (tournamentTeams && tournamentTeams.length >= 2) {
    teamNameStartedCT = tournamentTeams[0].teamName as string;
    teamNameStartedT = tournamentTeams[1].teamName as string;
  }

  return { teamNameStartedCT, teamNameStartedT };
}

export function getValveMatchFromMatchInfoProtobufMessage(matchInfoMessage: CDataGCCStrike15_v2_MatchInfo): ValveMatch {
  const lastRoundMessage = getLastRoundStatsMessage(matchInfoMessage);
  const { matchid, matchtime } = matchInfoMessage;
  const lastRoundReservation = lastRoundMessage.reservation as CMsgGCCStrike15_v2_MatchmakingGC2ServerReserve;
  
  let currentScoreTeamThatStartedCt = 0;
  let currentScoreTeamThatStartedT = 0;

  // Handle score calculation
  const [scoreTeamStartedCt, scoreTeamStartedT] = lastRoundMessage.teamScores;
  if (lastRoundMessage.bSwitchedTeams) {
    currentScoreTeamThatStartedCt = scoreTeamStartedT;
    currentScoreTeamThatStartedT = scoreTeamStartedCt;
  } else {
    currentScoreTeamThatStartedCt = scoreTeamStartedCt;
    currentScoreTeamThatStartedT = scoreTeamStartedT;
  }

  const matchId = matchid as bigint;
  const dateTimestamp = matchtime as number;
  const durationInSeconds = lastRoundMessage.matchDuration as number;
  const gameType = lastRoundReservation.gameType as number;
  const watchablematchinfo = matchInfoMessage.watchablematchinfo as WatchableMatchInfo;
  const tvPort = watchablematchinfo.tvPort as number;
  const serverIp = watchablematchinfo.serverIp as number;
  const lastRoundReservationId = lastRoundMessage.reservationid as bigint;
  const demoUrl = lastRoundMessage.map; // This is the actual demo URL
  const demoName = buildMatchName(lastRoundReservationId, tvPort, serverIp);
  
  const sharecode: string = encodeMatch({
    matchId: BigInt(matchId),
    reservationId: BigInt(lastRoundReservationId),
    tvPort,
  });
  
  const result = getMatchResult(lastRoundMessage);
  const { teamNameStartedCT, teamNameStartedT } = getTeamNames(lastRoundReservation.tournamentTeams);
  const date = unixTimestampToDate(dateTimestamp);
  
  // Detect game version based on date
  const publicCs2ReleaseDate = new Date('2023-09-27');
  const game = date >= publicCs2ReleaseDate ? Game.CS2 : Game.CSGO;

  const match: ValveMatch = {
    id: matchId.toString(),
    game,
    name: demoName,
    mapName: getMapName(gameType),
    date: date.toISOString(),
    durationInSeconds,
    result,
    scoreTeamStartedCT: currentScoreTeamThatStartedCt,
    scoreTeamStartedT: currentScoreTeamThatStartedT,
    killCount: sumNumberArray(lastRoundMessage.kills),
    assistCount: sumNumberArray(lastRoundMessage.assists),
    deathCount: sumNumberArray(lastRoundMessage.deaths),
    demoUrl,
    sharecode,
    teamNameStartedT,
    teamNameStartedCT,
  };

  return match;
}