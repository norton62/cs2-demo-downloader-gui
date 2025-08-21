#!/usr/bin/env node

// Example usage of the cs-sharecode-cli as a library
import { getDownloadLinkFromShareCode } from './dist/lib/index.js';

async function example() {
  try {
    // Replace with a real share code
    const shareCode = 'CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx';
    
    console.log('Fetching match information...');
    const result = await getDownloadLinkFromShareCode(shareCode);
    
    console.log('Success!');
    console.log('Match Details:');
    console.log(`- ID: ${result.matchId}`);
    console.log(`- Game: ${result.game}`);
    console.log(`- Map: ${result.mapName}`);
    console.log(`- Date: ${result.date}`);
    console.log(`- Demo URL: ${result.demoUrl}`);
    console.log(`- File Name: ${result.fileName}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  example();
}