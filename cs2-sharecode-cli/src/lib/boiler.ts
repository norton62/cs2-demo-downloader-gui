import path from 'node:path';
import { execFile } from 'node:child_process';
import fs from 'fs-extra';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { type CMsgGCCStrike15_v2_MatchList, CMsgGCCStrike15_v2_MatchListSchema, fromBinary } from 'csgo-protobuf';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SteamNotRunning extends Error {
  constructor() {
    super('Steam is not running or user is not logged in');
    this.name = 'SteamNotRunning';
  }
}

export class SteamCommunicationError extends Error {
  constructor() {
    super('Failed to communicate with Steam');
    this.name = 'SteamCommunicationError';
  }
}

export class BoilerUnknownError extends Error {
  constructor() {
    super('Unknown error occurred while fetching match data');
    this.name = 'BoilerUnknownError';
  }
}

function getBoilerExecutablePath(): string {
  const platform = os.platform();
  const arch = os.arch();
  
  let executableName: string;
  if (platform === 'win32') {
    executableName = 'boiler-writter.exe';
  } else {
    executableName = 'boiler-writter';
  }
  
  // First, try to find boiler-writter in the dist directory (same level as compiled code)
  const distPath = path.join(__dirname, '../', executableName);
  if (fs.existsSync(distPath)) {
    return distPath;
  }
  
  // Try to find boiler-writter in the root directory
  const rootPath = path.join(__dirname, '../../', executableName);
  if (fs.existsSync(rootPath)) {
    return rootPath;
  }
  
  // Try to find boiler-writter in node_modules
  const nodeModulesPath = path.join(__dirname, '../../node_modules/@akiver/boiler-writter');
  
  // Look for the executable in the platform-specific directory
  const platformDir = platform === 'win32' ? 'win32' : platform === 'darwin' ? 'darwin' : 'linux';
  const archDir = arch === 'x64' ? 'x64' : arch;
  
  const executablePath = path.join(nodeModulesPath, 'bin', platformDir, archDir, executableName);
  
  if (fs.existsSync(executablePath)) {
    return executablePath;
  }
  
  // Fallback: try to find it in the root bin directory
  const fallbackPath = path.join(nodeModulesPath, 'bin', executableName);
  if (fs.existsSync(fallbackPath)) {
    return fallbackPath;
  }
  
  throw new Error(`Boiler executable not found. Checked paths:
  - Dist directory: ${distPath}
  - Root directory: ${rootPath}
  - Node modules: ${executablePath}
  - Fallback: ${fallbackPath}`);
}

export async function startBoiler(args: string[]): Promise<CMsgGCCStrike15_v2_MatchList> {
  return new Promise((resolve, reject) => {
    const executablePath = getBoilerExecutablePath();
    const tempDir = os.tmpdir();
    const matchesInfoFilePath = path.join(tempDir, `matches-${Date.now()}.info`);

    const boilerArgs = [matchesInfoFilePath, ...args];
    
    console.log(`Starting boiler process: ${executablePath}`);
    console.log(`Arguments: ${boilerArgs.join(' ')}`);
    
    const child = execFile(executablePath, boilerArgs);

    child.on('error', (error) => {
      console.error('Boiler process error:', error);
      reject(error);
    });

    child.on('exit', async (code: number) => {
      console.log(`Boiler process exited with code: ${code}`);
      
      const exitCodes = {
        Success: 0,
        Error: 1,
        InvalidArgs: 2,
        CommunicationFailure: 3,
        AlreadyConnected: 4,
        SteamRestartRequired: 5,
        SteamNotRunningOrLoggedIn: 6,
        UserNotLoggedIn: 7,
        NoMatchesFound: 8,
        WriteFileFailure: 9,
      } as const;

      try {
        switch (code) {
          case exitCodes.Success: {
            const infoFileExists = await fs.pathExists(matchesInfoFilePath);
            if (infoFileExists) {
              const buffer = await fs.readFile(matchesInfoFilePath);
              const bytes = new Uint8Array(buffer);
              const matchListMessage = fromBinary(CMsgGCCStrike15_v2_MatchListSchema, bytes);
              
              // Clean up temp file
              await fs.remove(matchesInfoFilePath).catch(() => {});
              
              return resolve(matchListMessage);
            }
            return reject(new Error('Matches info file not found'));
          }
          case exitCodes.InvalidArgs:
            return reject(new Error('Invalid arguments provided to boiler'));
          case exitCodes.CommunicationFailure:
            return reject(new SteamCommunicationError());
          case exitCodes.AlreadyConnected:
            return reject(new Error('Already connected to Steam'));
          case exitCodes.SteamRestartRequired:
            return reject(new Error('Steam restart required'));
          case exitCodes.SteamNotRunningOrLoggedIn:
            return reject(new SteamNotRunning());
          case exitCodes.UserNotLoggedIn:
            return reject(new Error('User not logged in to Steam'));
          case exitCodes.NoMatchesFound:
            return reject(new Error('No matches found'));
          case exitCodes.WriteFileFailure:
            return reject(new Error('Failed to write matches info file'));
          default:
            return reject(new BoilerUnknownError());
        }
      } catch (error) {
        // Clean up temp file on error
        await fs.remove(matchesInfoFilePath).catch(() => {});
        reject(error);
      }
    });
  });
}