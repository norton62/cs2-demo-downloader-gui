#!/usr/bin/env node

import { program } from 'commander';
import { getDownloadLinkFromShareCode } from './lib/sharecode-handler.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));
const version = packageJson.version;

program
  .name('cs-sharecode')
  .description('Get Counter-Strike demo download links from share codes')
  .version(version);

program
  .command('info')
  .argument('<sharecode>', 'Counter-Strike match share code (e.g., CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx)')
  .option('-j, --json', 'Output result as JSON')
  .option('-v, --verbose', 'Enable verbose logging')
  .description('Get full match information from share code')
  .action(async (sharecode: string, options) => {
    try {
      if (options.verbose) {
        console.log(`Processing share code: ${sharecode}`);
      }

      const result = await getDownloadLinkFromShareCode(sharecode);

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`Match ID: ${result.matchId}`);
        console.log(`Game: ${result.game}`);
        console.log(`Map: ${result.mapName}`);
        console.log(`Date: ${result.date}`);
        console.log(`Demo URL: ${result.demoUrl}`);
        console.log(`File Name: ${result.fileName}`);
        console.log(`Share Code: ${result.sharecode}`);
      }
    } catch (error) {
      if (options.verbose && error instanceof Error) {
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
      } else {
        console.error('Error:', error instanceof Error ? error.message : String(error));
      }
      process.exit(1);
    }
  });

program
  .command('demo-url')
  .argument('<sharecode>', 'Counter-Strike match share code (e.g., CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx)')
  .description('Get only the demo URL from share code')
  .action(async (sharecode: string) => {
    try {
      const result = await getDownloadLinkFromShareCode(sharecode, true);
      console.log(result.demoUrl);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Keep backward compatibility - default command behavior
program
  .argument('[sharecode]', 'Counter-Strike match share code (e.g., CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx)')
  .option('-j, --json', 'Output result as JSON')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (sharecode: string, options) => {
    // Only run if sharecode is provided and no subcommand was used
    if (sharecode && !process.argv.includes('info') && !process.argv.includes('demo-url')) {
      try {
        if (options.verbose) {
          console.log(`Processing share code: ${sharecode}`);
        }

        const result = await getDownloadLinkFromShareCode(sharecode);

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(`Match ID: ${result.matchId}`);
          console.log(`Game: ${result.game}`);
          console.log(`Map: ${result.mapName}`);
          console.log(`Date: ${result.date}`);
          console.log(`Demo URL: ${result.demoUrl}`);
          console.log(`File Name: ${result.fileName}`);
          console.log(`Share Code: ${result.sharecode}`);
        }
      } catch (error) {
        if (options.verbose && error instanceof Error) {
          console.error('Error:', error.message);
          console.error('Stack:', error.stack);
        } else {
          console.error('Error:', error instanceof Error ? error.message : String(error));
        }
        process.exit(1);
      }
    }
  });

program.parse();