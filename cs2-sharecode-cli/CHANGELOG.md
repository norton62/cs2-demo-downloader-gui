# Changelog

## v1.0.1 - Fixed Implementation

### Fixed
- **Critical**: Fixed valve match processing to match reference implementation
- **Critical**: Fixed demo URL extraction from `lastRoundMessage.map` field
- **Critical**: Fixed map name decoding using proper bit manipulation
- **Critical**: Fixed score calculation with team switching logic
- **Critical**: Fixed match result determination logic
- **Critical**: Fixed demo name generation using proper format
- **Critical**: Fixed sharecode generation parameters

### Technical Changes
- Updated `getValveMatchFromMatchInfoProtobufMessage` to use `getLastRoundStatsMessage`
- Fixed demo URL to use `lastRoundMessage.map` instead of constructing from server IP
- Implemented proper map name decoding with game mode support
- Added proper team switching logic for score calculation
- Fixed match result logic with `bSwitchedTeams` consideration
- Updated demo name format to match reference implementation

## v1.0.0 - Initial Release

### Features
- Extract match information from CS:GO/CS2 share codes
- Get direct download links for demo files
- Support for both JSON and human-readable output
- Validates download link availability
- Works with both CS:GO and CS2 matches