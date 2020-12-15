CHANGELOG
=========

This document aims to represent all notable changes to Vieb.

Vieb is a Vim Inspired Electron Browser made by Jelmer van Arnhem and contributors,
and can be copied under the terms of the GPL-3.0+ license.
See the README.md or LICENSE file for more info and details about Vieb and it's license.
Links in the changelog are part of [github.com/Jelmerro/Vieb](https://github.com/Jelmerro/Vieb).
The [releases page](https://github.com/Jelmerro/Vieb/releases) also contains the most important changes per release,
but the list below contains much more technical details.
The releases of Vieb aim to follow [semantic versioning](https://semver.org).

## Unreleased

### Fixed

- Middle mouse pasting not working even when mouse is enabled
- Some sites not loading due to Electron bug related to COOP [electron/#25469](https://github.com/electron/electron/issues/25469)

### Security

- Electron 11.1.0 (was 11.0.3)
- Chromium 87.0.4280.88 (was 87.0.4280.67)

## [3.1.0](https://github.com/Jelmerro/Vieb/compare/3.0.0...3.1.0) - 2020-12-06

[code diff](https://github.com/Jelmerro/Vieb/compare/3.0.0...3.1.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/3.1.0)

### Added

- Clickable file location on the downloads special page which will open the file in the default application
- Clickable download finish notification that will open the file in the default application (if using the mouse)
- Additional Vieb config location for colorschemes, viebrc and blocklists inside "~/.vieb"
- New permission groups for midi, persistentstorage and clipboardread (all 3 remain by default blocked, but are no longer grouped as unknown)
- Internaldevtools command that opens developer tools for the main Vieb window

### Changed

- Follow mode will now detect form labels that have invisible embedded inputs but no "for" attribute
- Follow mode now detects absolutely positioned sub-elements of links, where the base link isn't shown
- Multiple speed improvements to follow mode
- More explicit permission messages that list both the permission name and the setting that was read to decide the permission
- Internal devtools now opened undocked by default (both with --debug and :internaldevtools)
- The frame and menu are no longer shown for instances started with --debug (internal devtools and always shown window remain)

### Fixed

- Tab restore not working correctly when disabled, due to duplicate entries being stored when closed
- Line height issue that prevented underscores from showing correctly in some cases
- Random switching between tabs if they execute click or focus events

### Security

- Electron 11.0.3 (was 11.0.2)
- Chromium 87.0.4280.67 (unchanged)

## [3.0.0](https://github.com/Jelmerro/Vieb/compare/2.4.0...3.0.0) - 2020-11-21

[code diff](https://github.com/Jelmerro/Vieb/compare/2.4.0...3.0.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/3.0.0)

### Added

- Local file suggestions to explore mode and to relevant commands
- Red border in command mode when the entered command is invalid (for example due to unmatched quotes)
- Setting 'suggestfiles' setting to control when/if file suggestions should appear ('all' by default)
- Setting "suggestfilesfirst" to control if file suggestions should appear before/after history in explore mode
- Setting "closablepinnedtabs" which is disabled by default (meaning pinned tabs can't be closed)
- Setting "containernewtab" to control which container all new tabs should use (default is still "main")
- Setting "containersplitpage" to control which container all split pages should use (default is "s:usecurrent")
- Setting "containerstartuppage" to control which container the startup pages should use (CLI arguments, default is still "main")
- Setting "containercolors" to show container tabs in a custom color based on the container name
- Setting "containershowname" to optionally show the name of the container between the mode and url in the navbar
- Setting "containerkeeponreopen" to toggle the remembering the container name and to use the "containernewtab" setting instead
- Setting "permissionclosepage" to control if pages are allowed to close themselves (previously they couldn't, new default is allowed)
- Setting "incsearch" to enable incremental search (enabled by default)
- Restart command to restart Vieb
- Close command that works similar to the hide command, but instead will close any tab by index (or matching title/url)
- Special container names to open tabs externally, in tabs with a matching domain, or use the same container as the current tab
- Support for SVG favicons by giving it an explicit ".svg" extension if detected by "is-svg"
- Devtools that can be opened as a split window or in a separate tab, in addition to the existing windowed developer tools
- Added "pointer.downloadLink" action that downloads the hovered link in pointer mode
- Colorschemes that can change every single line of CSS inside Vieb: all built-in pages and the app now use the same default theme CSS
- Built-in light colorscheme that displays all built-in pages and the app in a light theme
- Built-in flipped colorscheme that displays all GUI elements at the bottom of the window (in reverse order)

### Changed

- Suggestions are now scrollable when they don't fit the window
- The setting 'suggesthistory' has been renamed 'suggestexplore' as it might also include file suggestions now
- Command suggestions are now by default set to 1000, as the operation is simple and suggestions are scrollable
- Increased the upper limit for the number of suggestions (for both command and explore mode)
- Pinned tabs can no longer be closed, unless the 'closablepinnedtabs' setting is enabled
- Search setting parsing, you can now include %s as a substitute for the entered search
- Default duckduckgo search engine options now include a persistent header and infinite scrolling
- Tabs are now always modifiable in Erwic mode, because containers can now be managed at runtime
- Multiple tabs of the same special page can now be opened using the commands, as some of them are container specific
- The startup argument "--portable" has been replaced with "--datafolder", use "--datafolder ./ViebData" for old functionality
- Erwic now uses the "datafolder" startup argument instead of a JSON field for the datafolder location configuration
- Tab list can now be scrolled horizontally using the mouse wheel
- Make use of system fonts as much as possible: "DejaVu Sans Mono" -> "Courier" -> "monospace", in that order
- Visual appearance of Vieb: logo is now smaller, everything is now styled with colorschemes and popups are more in line with other elements

### Fixed

- Typo in the "storenewvisits" setting (there will be no automatic migration from the name with a typo to the correct one)
- Pointer not updating the location when bringing back the GUI while in fullscreen
- Permission for media devices sometimes being detected as a microphone permission
- Mouse back/forward buttons being ignored when the mouse setting is enabled
- Shift being ignored when pressing named keys that can be pressed with and without Shift such as "Space"
- Border of split pages moving the page slightly when switching (border is now always there but in gray)
- Updating the adblocker files when Vieb is installed on a read-only file system
- Favicons being accepted even though the HTTP status code was an error (such as 404)

### Deprecated

- Old tabs file format (3.x.x releases will migrate to the new format, 2.x.x releases will not read the 3.x.x format)
- Conversion from old format will be removed in future Vieb 4.x.x releases
- Supplying a "name" to an Erwic app, use a "container" field instead

### Removed

- Old line-based history format parser (1.x.x users should update to 2.x.x first, if they want to keep their history)
- Startup argument "--console" is removed in favor of "--debug", debug can do the same plus more and doesn't have mouse focus issues

### Fixed

- Abort error for aborting page loads in the debug console (using --debug)
- Don't keep closed pages in memory while the 'keeprecentlyclosed' setting is off

### Security

- Electron 11.0.2 (was 10.1.1)
- Chromium 87.0.4280.67 (was 85.0.4183.93)

## [2.4.0](https://github.com/Jelmerro/Vieb/compare/2.3.0...2.4.0) - 2020-09-05

[code diff](https://github.com/Jelmerro/Vieb/compare/2.3.0...2.4.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/2.4.0)

### Added

- Erwic option at startup to open a fixed set of tabs in a separate instance (docs are in Erwic.md)

### Fixed

- WebGL2RenderingContext calls to get parameters not being invoked in the right context
- App path (usually the asar file) being opened as a file on startup for some custom builds (including Arch)
- New tab page is no longer the first entry in the history of tabs that are opened with a url
- Reopening tabs in bulk (usually at startup) running out of index in rare occasions

### Security

- Electron 10.1.1 (was 9.2.0)
- Chromium 85.0.4183.93 (was 83.0.4103.122)

## [2.3.0](https://github.com/Jelmerro/Vieb/compare/2.2.3...2.3.0) - 2020-08-08

[code diff](https://github.com/Jelmerro/Vieb/compare/2.2.3...2.3.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/2.3.0)

### Added

- Firefox mode to replicate the Firefox useragent and navigator properties
- List-like settings for allowing or blocking permissions based on the website (using regex)
- Setting to optionally notify when websites request a permission, including the reason for allowing/blocking
- Filter on the history page to find or remove sites from the history based on title or url

### Changed

- Redirects are now applied before making a request, making them safer and more reliable

### Fixed

- Window snapping on Windows
- Lack of typing ability for some text inputs after selecting them with follow mode
- Spaces not working as expected in mappings

### Security

- Electron 9.2.0 (was 9.0.5)
- Chromium 83.0.4103.122 (was 83.0.4103.119)
- Don't expose the supported mimeTypes through the navigator
- Better protection for hiding the GPU model

## [2.2.3](https://github.com/Jelmerro/Vieb/compare/2.2.2...2.2.3) - 2020-07-05

[code diff](https://github.com/Jelmerro/Vieb/compare/2.2.2...2.2.3) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/2.2.3)

### Changed

- Refactor countable actions to be more consistent and reliable
- Order of page increase and decrease actions, it's now always: inpage relations > port > url page number > first number in the url

### Fixed

- Default download path not saving files to the home directory ("~" was not correctly expanded)
- Catch errors from the adblocker to prevent occasional error popups from cosmetic filtering
- Count not working for the increase and decrease page number actions (such as ports or page numbers)

### Security

- Electron 9.0.5 (was 9.0.4)
- Chromium 83.0.4103.119 (was 83.0.4103.104)

## [2.2.2](https://github.com/Jelmerro/Vieb/compare/2.2.1...2.2.2) - 2020-06-21

[code diff](https://github.com/Jelmerro/Vieb/compare/2.2.1...2.2.2) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/2.2.2)

### Changed

- Improve the follow mode speed by reusing dom calls and only using an interval (no more page observers)

### Fixed

- Width of the pinned tabs when playing media
- Regular tabs not always opening to the right of all the pinned tabs
- Potential filename length issue for favicon storage

### Security

- Electron 9.0.4 (was 9.0.3)
- Chromium 83.0.4103.104 (was 83.0.4103.100)
- Disable the remote module entirely
- Load the preload from the main process and prevent changes to it's location

## [2.2.1](https://github.com/Jelmerro/Vieb/compare/2.2.0...2.2.1) - 2020-06-11

[code diff](https://github.com/Jelmerro/Vieb/compare/2.2.0...2.2.1) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/2.2.1)

### Fixed

- Data urls not being displayed on the new tab page

### Security

- Electron 9.0.3 (unchanged)
- Chromium 83.0.4103.100 (unchanged)

## [2.2.0](https://github.com/Jelmerro/Vieb/compare/2.1.0...2.2.0) - 2020-06-10

[code diff](https://github.com/Jelmerro/Vieb/compare/2.1.0...2.2.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/2.2.0)

### Added

- Darkreader setting to apply a dark theme to all websites visited (off by default)
- Pacman archive as a new included build target (for Arch Linux)
- Arm64 architecture builds for most Linux and Windows releases
- Windowtitle setting to optionally include the page title and/or url in Vieb's window title
- Recursive insert mode mappings are now possible
- Tabcycle toggle to jump from the first or last tab with next and previous tab actions (on by default)
- Pin command to toggle pinned tabs, which are exactly the width of the favicon and are always restored on restart
- GUI settings to autohide the navbar and/or tabbar depending on events or always
- User action for toggling fullscreen mode (different from webpage requested fullscreen)
- Downloadmethod setting to change the download behavior
- Mouse specific setting to switch to newly opened tabs automatically (by default turned off, previously it would switch every time)

### Changed

- Allow the entire window to be used as a drag region if the mouse setting is off and you are not in insert mode
- Minimum tabwidth to 28, due to styling changes in the navigation bar (default behavior is still just the icon)

### Fixed

- Insert mode mappings not triggering built-in actions, such as Home or PageUp
- Not all named keys being correctly detected and converted to the right casing
- Digits to repeat actions not being applied when part of a mapping before a built-in action
- Animated SVG images sometimes breaking follow mode (due to href being an object instead of a string)

### Security

- Electron 9.0.3 (was 9.0.0)
- Chromium 83.0.4103.100 (was 83.0.4103.64)
- Remove the usage of the remote module entirely
- Add strict CSP to all of Vieb's pages, which prevents all scripts from running outside of the webviews and preloads

## [2.1.0](https://github.com/Jelmerro/Vieb/compare/2.0.0...2.1.0) - 2020-05-19

[code diff](https://github.com/Jelmerro/Vieb/compare/2.0.0...2.1.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/2.1.0)

### Added

- Conversion from and to percent-encoding for urls in the navbar, the url hover and in special pages
- Setting named requesttimeout, to stop a page from loading after a timeout (default is 20 seconds)

### Changed

- Search string now excludes special characters, instead of only keeping the word characters (this affects non-latin writing scripts)

### Fixed

- Urls not being wrapped in the media device permission request dialog

### Security

- Electron 9.0.0 (was 9.0.0-beta.15)
- Chromium 83.0.4103.64 (was 83.0.4102.3)

## [2.0.0](https://github.com/Jelmerro/Vieb/compare/1.1.0...2.0.0) - 2020-04-13

[code diff](https://github.com/Jelmerro/Vieb/compare/1.1.0...2.0.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/2.0.0)

### Added

- Mouse setting to enable mouse support outside of insert mode
- When the mouse is enabled, switch tabs, modes or focus by clicking on it
- New location from where the viebrc file will be read: ~/.viebrc (aside from the viebrc in Vieb's data folder)
- Dark theme and security settings for the website developer tools (:devtools)
- Window splitting using Vexplore, vsplit, Sexplore and split to display multiple sites at the same time
- Use \<C-w\> sub-bindings to move, relocate or rotate the window splits
- Map command for configuring keyboard mappings (including recursion, nmap, imap, mapclear, etc.)
- Noremap command for non-recursive keyboard mappings (refer to Vieb actions using \<action.reload\>)
- Tab status indicators, orange for current tab (in multiple layout) and blue for playing media
- Elements with mouse hover actions are now available in follow mode (displayed in gray)
- Popup message for long notifications, with Vim bindings to scroll and close
- Notification special page to view a list of previous notifications of the current session
- New help documentation with descriptions for all commands, settings and actions
- Basic check and compare for prerelease part of semantic versions
- Tests for the version compare function
- Favorite pages setting for manually providing a list of pages that should always appear on the new tab page

### Changed

- Rename all settings to be lowercase and without dots, similar to Vim
- Set command syntax is now much more similar to Vim with support for all of Vim's set operators
- Booleans can now be set and unset using "ignorecase" or "noignorecase"
- Allow all settings to be changed at runtime, as they can be saved for the next startup with :mkv
- List-like settings are now much more similar to Vim, as they are a comma separated string, with += and -= support
- Viebrc is now named 'viebrc' instead of 'viebrc.json' and is configured by Vieb/Vim commands instead of JSON
- All suggestion settings are now of the number type instead of boolean, and specify the number of entries to suggest (0 to disable)
- Rename the modes: nav to explore and cursor to pointer, to allow for single key identifiers of the modes
- Improvements to mode switching by centralizing mode switching code in the modes file
- Click on multiple elements without having to manually re-enter follow mode by holding Shift
- Add spellcheck integration (on by default), use spell and spelllang to configure
- History storage format is now JSON, for easier parsing and better title storing
- Entries on the history page can now be removed without reloading all history again
- Buffer command can now be used to navigate to new locations (this is also true for the new split and Explore commands)
- Allow \<A-F4\> and \<M-Q\> to be mapped as if they are regular keys (most likely to the quit command)
- Reload command no longer resets all settings before running the commands from the viebrc files

### Deprecated

- Old history storage format (TSV has been replaced with JSON), filename remains "hist"
- Conversion from old to new history format, will be removed in 3.0.0

### Removed

- Support for parsing the "viebrc.json" file, settings are now configured with Vieb commands in "viebrc" or "~/.viebrc"

### Fixed

- Broken page loads for sites using custom EventTargets instead of only DOM Nodes
- Text input actions, such as select all, not working on Mac
- Undo and Redo not being enabled on any system for the navigation bar

### Security

- Electron 9.0.0-beta.15 (was 8.0.1)
- Chromium 83.0.4102.3 (was 80.0.3987.86)
- Browsing data of popup windows are now stored in a separate memory-only partitions
- Hide hardware related info, such as GPU model and battery data
- Add new permission for mediaDevices, new default is to ask the user instead of allowing all
- Also remove Vieb and Electron from the useragent when downloading favicons

## [1.1.0](https://github.com/Jelmerro/Vieb/compare/1.0.0...1.1.0) - 2020-02-15

[code diff](https://github.com/Jelmerro/Vieb/compare/1.0.0...1.1.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/1.1.0)

### Added

- Tests for isUrl function

### Changed

- Update to the http basic login system to work with the new electron version
- Open the login dialog in the center of the Vieb browser window
- Running the last command again no longer adds a duplicate to the command history
- Improved url detection as a result of testing the function properly

### Removed

- The optional 'full' argument of the write command, the full page is now always saved

### Fixed

- Popup dialog for failed favicon downloads (now ignored)
- Empty title in history overriding the older proper title
- Print command only working once without reloading
- Commands not supporting escaping of spaces using quotes

### Security

- Electron 8.0.1 (was 6.1.5)
- Chromium 80.0.3987.86 (was 76.0.3809.146)

## [1.0.0](https://github.com/Jelmerro/Vieb/compare/0.7.0...1.0.0) - 2019-11-30

[code diff](https://github.com/Jelmerro/Vieb/compare/0.7.0...1.0.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/1.0.0)

### Added

- Unreachable pages now show an error page with instructions
- Blocked HTTP redirects now show an error page with instructions
- New tab page with top visited sites listed (newtab.showTopSites)
- Setting to disable the added new tab page
- Setting to automatically enter nav mode in new tabs (or not)
- Container tabs, which don't share any data with other tabs (such as cookies or cache)
- Tab titles are now yellow when they are container tabs
- Tabs are now bright red when they have crashed
- Keys can now be mapped to any supported command, such as "F1": ":help" (previously "F1": "COMMAND.help")
- Hardcopy (or print) command to print the current page with a printer
- Configure custom redirects in the settings with regex patterns
- History of previously executed commands during the current session
- Minimal width setting for tabs which by default is set to 22 (just the icon)
- Write command to save the current page as HTML, optionally including resources (full) or to a custom location
- Mkviebrc command to save the current settings to the viebrc.json, optionally including the defaults
- Local file browser for directories with improved file navigation
- Favicon setting to disable favicons or configure the cache duration for favicons (cache per session by default)
- Favicons are now present on the new tab and history pages
- Open pages in a new tab without directly switching to them (while holding Shift in newtab follow mode)
- Buffer command to easily switch between all the open tabs (with autocompletion)
- Roboto Mono font for all UI elements (with fallback to system monospace)
- Horizontal scroll actions for cursor and visual mode (with added default bindings for it)
- Shortcut to stop the page from loading (by default mapped to Ctrl-C from normal mode)
- Number increment keys to modify page or port numbers using Ctrl-X and Ctrl-A
- Vim form edit mode to edit form fields using vim or any other editor (gvim by default for cross-system compatibility)
- Portable run option to startup arguments (--portable) to store all Vieb data inside a local ViebData folder
- Overflow setting for the tabs, which can be used to wrap, scroll or hide them when they overflow

### Changed

- Moved the setting for new tab position to the newtab collection (newtab.nextToCurrentOne)
- Reduce duplicate code to execute commands by grouping them in an object
- Commands can now be entered partially to execute them (if only 1 command matches)
- The setting "clearCacheOnQuit" is now "cache": "clearonquit" (default)
- Cache setting is now simply named cache and has an additional "none" setting to disable cache completely
- Permissions now show the page url in the ask dialog
- The openExternal permission is now by default on ask, which shows the external url that will be opened
- Rework the follow mode invocation to simplify the keybindings and fix some specific mode switches
- Follow mode is now always allowed (no more setting), and will update the visible links by listening to mutations
- Show plain text pages with a dark background and white text
- Also respect font sizes for special pages such as help, version or history
- Rewrite of settings chapter in the help page, including real-time preview of your settings
- Follow mode can now be combined with cursor and visual mode, to move the cursor to the element location
- Cursor now changes color gradually over time so it's more visible on conflicting background colors
- Digits repeating actions are now only applied when needed, and are executed in one go wherever possible

### Removed

- Download method setting: confirm and ask are gone, automatic (previous default) is now the only download mode
- The setting allowFollowModeDuringLoad is removed because the links are now auto-updating

### Fixed

- Sort all html input fields correctly by type in follow mode (input file, image and reset)
- Missing elements in follow mode using jsaction, ARIA roles or contenteditable
- History suggestions not sorting by visits correctly
- Downloads are much more consistent and less prone to race conditions
- Removing active downloads no longer mismatches the info with the progress of another download
- Rounding issues with selecting or inspecting elements using the cursor mode
- Argument issue when running Vieb using npm start and opening links with it when Vieb was already open
- Check the html element styling when detecting an unset background color (not only the body)
- Keybindings bug for chained keys being overwritten when adding new ones to the same key
- Tabs not switching to the correct tab on startup
- Page scrolling not working when the page is still loading
- Incorrect page titles when navigating tab history
- Cursor mode not detecting background images to download (when pressing "d")
- Scrolling to previous input when re-entering insert mode (now using blur)

### Security

- Electron 6.1.5 (was 6.0.10)
- Chromium 76.0.3809.146 (unchanged)
- Permission for openExternal is now set to "ask" by default instead of the setting "block"

## [0.7.0](https://github.com/Jelmerro/Vieb/compare/0.6.0...0.7.0) - 2019-09-19

[code diff](https://github.com/Jelmerro/Vieb/compare/0.6.0...0.7.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/0.7.0)

### Added

- Support for keys being pressed in order with different actions (such as 'gg' or the new 'gi')
- Shortcut to enter insert mode at the first text input using 'gi'
- New option to open tabs next to the current one (using t and u) (now the new default)
- Keybinding to open tabs at the inverted position to the setting configured (so at the end by default)
- Keybindings to move the current tab left or right in the tab navigation bar (ctrl-j or ctrl-k)
- Settings to configure permissions such as microphone or camera access, options are: block, allow or ask
- Boolean toggle for settings, for example: `set caseSensitiveSearch!`
- Support for multiple set command arguments, such as: `set caseSensitiveSearch! notifications.system=true notifications?`

### Changed

- Set command suggestions are no longer hard-coded
- Set command write syntax is now similar to Vim: `set permissions.camera=ask`
- The question mark for the set command read option is now optional: `set permissions?` now equals `set permissions`
- User agent replacement to work for beta/dev versions

### Fixed

- Also make Control-BracketLeft reset the repeating digits counter to zero

### Security

- Electron 6.0.10 (was 6.0.6)
- Chromium 76.0.3809.146 (was 76.0.3809.138)
- Permissions changed to block access by default for most permissions

## [0.6.0](https://github.com/Jelmerro/Vieb/compare/0.5.0...0.6.0) - 2019-08-30

[code diff](https://github.com/Jelmerro/Vieb/compare/0.5.0...0.6.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/0.6.0)

### Added

- Block ads and trackers with easylist and easyprivacy (set "adblocker" to "static" or "update")
- Optionally auto-update these included filter lists directly from easylist.to (set "adblocker" to "update")
- Related settings for the new adblocker (aside from options mentioned, can also be turned "off" or set to "custom")
- Additional lists that can be added manually in the blocklists subfolder inside the config folder
- Projects that are important to Vieb are mentioned at the bottom of the help page
- Set command support for reading a setting, for example "set adblocker?"

### Changed

- Tabs not requested to open in the foreground are now opened in a new tab
- Improved support for onclick and onmousedown elements in follow mode
- Add more vertical space between headers on the help page
- Increased the default notification duration from 5 to 6 seconds

### Fixed

- Location not displaying during load (and staying empty on failed page loads)
- Default settings sometimes displaying in black text on help page
- Buggy favicon on some sites after navigating on the same page

### Security

- Electron 6.0.6 (was 6.0.0-beta.15)
- Chromium 76.0.3809.138 (was 76.0.3809.74)

## [0.5.0](https://github.com/Jelmerro/Vieb/compare/0.4.0...0.5.0) - 2019-07-29

[code diff](https://github.com/Jelmerro/Vieb/compare/0.4.0...0.5.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/0.5.0)

### Added

- CHANGELOG file to keep a full list of changes
- Save and restore the window state by default
- Allow specific window properties to be kept or ignored (position, size, maximized state)
- Press "Shift with t" to open a new tab with the current url pre-filled in nav mode
- Simple setting to clear all cookies on quit

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

- Electron 6.0.0-beta.15 (was 5.0.6)
- Chromium 76.0.3809.74 (was 73.0.3683.121)

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
- The history page will add all history DOM elements in bulk (much faster)
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
- Same for possibly losing focus when a website enters fullscreen
- Periodically toggle mouse focus to fully load websites that wait for the mouse to move
- Actually save the recently closed tabs when that setting is on, but tabs.restore is off
- Missing or blurry icons on Windows and some Linux installers

### Security

- Electron 5.0.6 (was 5.0.2)
- Chromium 73.0.3683.121 (unchanged)
- Remove Vieb and Electron info more reliably from the useragent (should now be similar to Chrome)
- Disable the sharing of local WebRTC ip addresses, only public ip addresses are now shared

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
- Allow multiple login popups, one for each opened tab
- Improve the url detection to more accurately follow the domain specification
- Add arrow keys for switching suggestions to the Firefox and Chromium examples

### Fixed

- The zoom in and zoom out default keybindings in normal mode
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
- Show no output when a search result has zero matches

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
- Support for fullscreen requests of pages (by hiding the navbar, entering insert mode and a new escape keybinding)
- Added example keybinding and setting configurations for Firefox and Chromium

### Changed

- Moved most information regarding configuration from the readme to the help page
- Default duckduckgo search engine to use a dark theme
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
- Insert mode to use the mouse in Vieb
- Command mode with implementations for: version, help, reload, devtools, set and quit
- Support for CLI startup arguments
- Notifications for failed commands or other errors

### Security

- Electron 4.0.5
- Chromium 69.0.3497.106
