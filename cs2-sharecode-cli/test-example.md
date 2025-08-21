# Testing the CS ShareCode CLI

## Prerequisites

1. **Steam must be running and logged in**
2. **Counter-Strike must be closed**
3. **You need a valid share code from a recent match**

## Getting a Share Code

To get a share code for testing:

1. Open Counter-Strike
2. Go to "Watch" tab
3. Click on "Your Matches"
4. Right-click on any recent match
5. Select "Copy Share Link" or "Copy Match Sharing Code"
6. The share code will look like: `CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx`

## Installation and Testing

```bash
# Navigate to the project directory
cd cs-sharecode-cli

# Install dependencies
npm install

# Build the project
npm run build

# Test with your share code
node dist/index.js CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx

# Test with JSON output
node dist/index.js CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx --json

# Test with verbose logging
node dist/index.js CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx --verbose
```

## Expected Output

If everything works correctly, you should see output similar to:

```
Processing share code: CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx
Connecting to Steam to fetch match information...
Starting boiler process: /path/to/boiler-writter
Arguments: /tmp/matches-1234567890.info 3456789012345678901 1234567890 27015
Boiler process exited with code: 0
Checking if download link is still valid...
Match ID: 3456789012345678901
Game: cs2
Map: de_mirage
Date: 2024-01-15T14:30:00.000Z
Demo URL: https://replay123.valve.net/730/003456789012345678901_1234567890.dem.bz2
File Name: match_3456789012345678901_de_mirage_2024-01-15.dem
Share Code: CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx
```

## Common Issues

### "Steam is not running or user is not logged in"
- Make sure Steam is running
- Make sure you're logged into Steam
- Try restarting Steam

### "Boiler executable not found"
- The `@akiver/boiler-writter` package should install automatically
- Try running `npm install` again
- Check if the package exists in `node_modules/@akiver/boiler-writter`

### "No matches found"
- The share code might be too old
- Try with a more recent match
- Make sure the share code is correctly formatted

### "Download link has expired"
- This is normal for older matches
- Valve demo links expire after some time
- Try with a more recent match