# CS2 ShareCode CLI

A standalone CLI tool to get Counter-Strike demo download links from share codes. This tool is extracted from the [CS Demo Manager](https://github.com/akiver/cs-demo-manager) project.
This was made because I have to make automated demo generator bot for CSWatch.in platform.

## Features

- Extract match information from CS:GO/CS2 share codes
- Get direct download links for demo files
- Support for both JSON and human-readable output
- Validates download link availability
- Works with both CS:GO and CS2 matches

## Prerequisites

- Node.js 18 or higher
- Steam must be running and logged in
- Counter-Strike must be closed during operation

## Installation

```bash
npm install
```

```bash
npm run build
```

## Usage

### Basic usage (full match information)

```bash
node .\dist\index.js CSGO-tqboe-XUxQS-rieDD-ynNY2-KWtrD
```

### Get only demo URL (silent output)

```bash
node .\dist\index.js demo-url CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx
```

### Get full match information with explicit command

```bash
node .\dist\index.js info CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx
```

### JSON output

```bash
node .\dist\index.js info CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx --json
```

### Verbose logging

```bash
node .\dist\index.js info CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx --verbose
```

## Example Output

### Demo URL only (demo-url command):
```
http://replay382.valve.net/730/003767418281950970048_1750155669.dem.bz2
```

### Human-readable format (info command):
```
Match ID: 3456789012345678901
Game: cs2
Map: de_mirage
Date: 2024-01-15T14:30:00.000Z
Demo URL: https://replay123.valve.net/730/003456789012345678901_1234567890.dem.bz2
File Name: match_3456789012345678901_de_mirage_2024-01-15.dem
Share Code: CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx
```

### JSON format (info command with --json):
```json
{
  "matchId": "3767413896789360699",
  "game": "cs2",
  "mapName": "de_inferno",
  "date": "2025-08-04T20:20:05.000Z",
  "demoUrl": "http://replay382.valve.net/730/003767418281950970048_1750155669.dem.bz2",
  "fileName": "match730_003767418281950970048_1750155669_382",
  "sharecode": "CSGO-tqboe-XUxQS-rieDD-ynNY2-KWtrD"
}
```

## Error Handling

The tool handles various error conditions:

- **Invalid Share Code**: The provided share code format is invalid
- **Steam Not Running**: Steam must be running and logged in
- **No Matches Found**: No match data found for the share code
- **Download Link Expired**: The demo download link is no longer valid
- **Communication Errors**: Issues connecting to Steam or Valve servers

## How It Works

1. **Decode Share Code**: Extracts match ID, reservation ID, and TV port from the share code
2. **Connect to Steam**: Uses the boiler-writter tool to communicate with Steam's Game Coordinator
3. **Fetch Match Data**: Retrieves match information including demo download URL
4. **Validate Link**: Checks if the download link is still active
5. **Return Results**: Provides match details and download information

## Dependencies

This tool uses several key dependencies:

- `csgo-sharecode`: For encoding/decoding CS share codes
- `csgo-protobuf`: For handling Steam's protobuf messages
- `@akiver/boiler-writter`: For communicating with Steam
- `commander`: For CLI interface

## Limitations

- Requires Steam to be running and logged in
- Counter-Strike must be closed during operation
- Download links may expire after some time
- Some older matches may not be available

## Credits

This tool is based on the excellent work from [CS Demo Manager](https://github.com/akiver/cs-demo-manager) by AkiVer.

## License

MIT