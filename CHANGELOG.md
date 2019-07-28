CHANGELOG
=========

This document aims to represent all notable changes to Vieb.

Vieb is a Vim Inspired Electron Browser made by Jelmer van Arnhem and contributors,
and can be copied under the terms of the GPL-3.0+ license.
See the README.md or LICENSE file for more info and details about Vieb or it's license.
Links in the changelog are part of [github.com/Jelmerro/Vieb](https://github.com/Jelmerro/Vieb).
The [releases page](https://github.com/Jelmerro/Vieb/releases) also contains the most important changes per release,
but the list below contains much more technical details.

## [Unreleased](https://github.com/Jelmerro/Vieb/compare/0.4.0...master)

### Added

- CHANGELOG file to keep a full list of changes
- Save and restore the window state by default
- Allow specific window properties to be kept or ignored (position, size, maximized state)
- Press "Shift with t" to open a new tab with the current url prefilled in nav mode

### Changed

- Made version and help output from the CLI more consistent
- Argument --debug now also shows the Electron frame and toolbar (--console remains unchanged)
- Simplified the readme by moving more info to the help page
- Improved the styling and update check of the version page
- Made follow in new tab slightly faster

### Fixed

- Missing folders and files from cache clear and localstorage clear
- Actually apply the digitsRepeatActions settings on startup (set command already worked)
- Always hide the hover url when leaving insert or cursor mode
- Allow escape to reset the digit repeat counter (also don't trigger other actions when doing so)
- Follow mode not working on pages with text nodes (getClientRects is not a function on those)

### Security

- Electron 6.0.0-beta.14 (was 5.0.6)
- Chromium 76.0.3809.68 (was 73.0.3683.121)

## [0.4.0](https://github.com/Jelmerro/Vieb/compare/0.3.0...0.4.0) - 2019-07-01

[code diff](https://github.com/Jelmerro/Vieb/compare/0.3.0...0.4.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/0.4.0)

### Added

- Cursor mode to replicate mouse actions
- Mouse hover in cursor mode
- Inspect element in cursor mode
- Image download in cursor mode
- Left and right clicking in cursor mode
- Enter insert mode at the cursor position
- Many basic Vim movement options in cursor and visual mode
- Copy selected text in new visual mode
- Some additional movement options in normal mode
- Link preview in cursor and insert mode
- Enter in normal mode now clicks on the selected search result
- Digits can now be used to enter the number of times an action should be executed
- Support in follow mode for labels as long as they have the 'for' attribute
- Support for 'onmousedown' click handlers in follow mode
- Some better suggestions to the set command (such as 'downloads.')
- Cursor mode toggle example for Firefox, similar to Caret browsing
- Add funding link to my personal ko-fi page: Jelmerro

### Changed

- Follow mode now handles overlapping elements, greatly improving the suggestions
- History is now loaded on startup to work faster when suggesting in nav mode
- History will never re-read the file, because it's entirely processed in memory
- Limit the amount of history suggestions appearing to 20
- The history page will add add all history DOM elements in bulk (much faster)
- Downloads are now handled in the main thread to improve consistency
- All checks with if statements now use includes wherever possible
- Follow mode does not leave the mouse hovering anymore, because now there is cursor mode to do so
- Split up the url regex into multiple parts to make it fast for long urls
- Make the history ordering a bit more simple and predictable
- Increased maximum fontSize from 20 to 30 pixels in height
- Limit the history of previously closed tabs to 100 (which should be plenty)

### Fixed

- Scrolling to the top or bottom of the page on some pages not working
- Losing focus when switching between certain modes
- Same for possibly losing focus when entering fullscreen
- Periodically toggle mouse focus to fully load websites that wait for the mouse to move
- Actually save the recently closed tabs when that setting is on, but tabs.restore is off
- Missing or blurry icons on Windows and some Linux installers

### Security

- Electron 5.0.6 (was 5.0.2)
- Chromium 73.0.3683.121 (unchanged)
- Remove Vieb and Electron info more reliably from the useragent (should now be similar to chrome)
- Disable the sharing of local WebRTC ip addresses, only public ips are now shared

## [0.3.0](https://github.com/Jelmerro/Vieb/compare/0.2.2...0.3.0) - 2019-06-07

[code diff](https://github.com/Jelmerro/Vieb/compare/0.2.2...0.3.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/0.3.0)

### Added

- Browsing history is now stored when visiting pages
- History can be viewed or be deleted by visiting the new history page
- Suggestions for browsing history when in nav mode
- Suggestions for commands when in command mode
- Restore tabs option when restarting Vieb
- Reopen previously closed tab action mapped to 'u' key by default
- Downloads can now be stored between sessions
- Many new settings for tabs, history and downloads (mostly related to history)
- Custom font size option to scale all elements of the Vieb user interface
- Clear cache on quit option (enabled by default)
- Clear localstorage on quit option (disabled by default)
- More allowed keys to the input field for all modes (such as 'ctrl shift arrows')

### Changed

- Eslint configuration to more accurately represent the repository style guide
- Allow commands to start with a single ':', which will be ignored
- Allow multiple login popup, one for each opened tab
- Improved the url detect to more accurately follow the domain specification
- Add arrow keys for switching suggestions to the Firefox and Chromium examples

### Fixed

- The zoom in vs zoom out default keybindings in normal mode
- Startup arguments starting with a single dash being opened as a website
- Special pages not being detected on Windows
- Follow mode duplicate key options for a certain amount of links

### Security

- Electron 5.0.2 (was 5.0.1)
- Chromium 73.0.3683.121 (unchanged)

## [0.2.2](https://github.com/Jelmerro/Vieb/compare/0.2.1...0.2.2) - 2019-05-09

[code diff](https://github.com/Jelmerro/Vieb/compare/0.2.1...0.2.2) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/0.2.2)

### Added

- New alternative shortcuts to go move in history for the current tab

### Fixed

- Preloads on special pages not working on some released builds
- Fix for unsupported 'visibility: collapse' styling

### Security

- Electron 5.0.1 (was 5.0.0-beta.8)
- Chromium 73.0.3683.121 (was 73.0.3683.104)

## [0.2.1](https://github.com/Jelmerro/Vieb/compare/0.2.0...0.2.1) - 2019-04-07

[code diff](https://github.com/Jelmerro/Vieb/compare/0.2.0...0.2.1) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/0.2.1)

### Changed

- Use path module instead of url modifications for all paths
- Show no output when a search results in zero matches

### Fixed

- Proper focus when entering search mode

### Security

- Electron 5.0.0-beta.8 (was 5.0.0-beta.7)
- Chromium 73.0.3683.104 (was 73.0.3683.94)

## [0.2.0](https://github.com/Jelmerro/Vieb/compare/0.1.0...0.2.0) - 2019-03-29

[code diff](https://github.com/Jelmerro/Vieb/compare/0.1.0...0.2.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/0.2.0)

### Added

- New download support (aside from a basic popup each time)
- Confirm and automatic download configurations
- Added a basic download history for the current session
- Moved the new download page and existing help and version pages to special pages (vieb://help for example)
- Support for fullscreen mode (by hiding the navbar, entering insert mode and a new escape keybinding)
- Added example keybinding and setting configurations for Firefox and Chromium

### Changed

- Moved most information regarding configuration from the readme to the help page
- Changed the default search engine from duckduckgo to duckduckgo with a dark theme
- Improved CLI startup arguments for packaged apps
- Split the preload into multiple separate preloads
- Improved electron builder configuration (separate file with much better settings)
- Vieb is now a single window application (single-instance): when already open, new urls will be opened as tabs
- Disable follow mode for iframes again due to a couple of issues with it

### Security

- Electron 5.0.0-beta.7 (was 4.0.5)
- Chromium 73.0.3683.94 (was 69.0.3497.106)

## [0.1.0](https://github.com/Jelmerro/Vieb/compare/5eff352ad7d8895b97e4c22b9911d101723ac663...0.1.0) - 2019-02-17

[code diff](https://github.com/Jelmerro/Vieb/compare/5eff352ad7d8895b97e4c22b9911d101723ac663...0.1.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/0.1.0)

### Added

- Initial project structure and files
- Normal mode with a fair amount of options
- Added settings to Vieb using the viebrc.json file
- Follow mode to click on urls or buttons
- Search mode to find text in the page
- Insert mode to use to mouse in Vieb
- Command mode with implementations for: version, help, reload, devtools, set and quit
- Support for CLI startup arguments
- Notifications for failed commands or other errors

### Security

- Electron 4.0.5
- Chromium 69.0.3497.106
