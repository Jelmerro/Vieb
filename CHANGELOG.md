CHANGELOG
=========

This document aims to represent all notable changes to Vieb.

Vieb is a Vim Inspired Electron Browser made by Jelmer van Arnhem and contributors,
and can be copied under the terms of the GPL-3.0 or later versions.
See the README.md or LICENSE file for more info and details about Vieb and its license.
Links in the changelog are part of [github.com/Jelmerro/Vieb](https://github.com/Jelmerro/Vieb).
The [releases page](https://github.com/Jelmerro/Vieb/releases) also contains the most important changes per release,
but the list below contains much more technical details.
The releases of Vieb aim to follow [semantic versioning](https://semver.org).

## Unreleased

### Changed

- Stored urls to be of the human readable format to better account for special pages
- Adblocker to show a notification if enabled but not present for all builds
- AppImage builds to better handle special pages for changing runtime folder

### Fixed

- Encoding issues since 10.0.0 in markdownviewer, readerview and sourceviewer
- Mappings that send keys to insert mode delayed not working since 10.0.0

### Versions

- Electron 25.2.0 (unchanged)
- Chromium 114.0.5735.134 (unchanged)

## [10.1.0](https://github.com/Jelmerro/Vieb/compare/10.0.0...10.1.0) - 2023-06-22

[code diff](https://github.com/Jelmerro/Vieb/compare/10.0.0...10.1.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/10.1.0)

### Added

- Option "external" to "pdfbehavior" setting to open the pdf with externalcommand automatically

### Fixed

- Settings starting with "no" or "inv" not being able to be listed without "?" nor reporting the correct name
- Actions "nextPage" and "previousPage" no longer working for link elements
- Pointer scrolling to search results not working correctly due to Electron's inconsistent API
- Infinite loading issue for unresponsive pages due to loadurl rework
- Newtab actions for pointer mode not working due to tab still loading
- Errors for ipc calls to webview that are still being created by only sending data to webview with ready dom
- First navigation issue that requires a second mouse click to navigate by delaying the useragent reroll
- Relative feed URLs only returning the path (they are now prefixed with the current url as needed)
- Firefox version calculation being ahead of time due to delayed Firefox releases

### Versions

- Electron 25.2.0 (was 25.1.1)
- Chromium 114.0.5735.134 (was 114.0.5735.106)

## [10.0.0](https://github.com/Jelmerro/Vieb/compare/9.7.1...10.0.0) - 2023-06-15

[code diff](https://github.com/Jelmerro/Vieb/compare/9.7.1...10.0.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/10.0.0)

### Added

- Blocklist uBlock Origin filters to the default list of blocklists
- Setting "requestheaders" to append custom headers to any request
- More default mappings: Firefox/Chromium inspired and mute/pin/internaldevtools mappings
- Settings "userscriptscope", "userstylescope" and "darkreaderscope" to control which pages scripts, styles and darkreader should run
- Suggestions for ranges
- Argument option to the mute command to force a mute state, such as `:mute! true`
- Argument option to the pin command to force a pinned state, such as `:pin! false`
- Setting "followlabelposition" to control where the label of follow elements should appear
- Set command syntax to rotate between a custom set of values, such as `:set example!value1|value2|value3`
- Setting "permissionusb" to list usb devices (default remains blocked, previously grouped as "unknown")
- Types and documentation using JSDoc to most of the source code
- More position options for opening new tabs using "tabnewposition"
- More focus positions after closing a tab using "tabclosefocus"
- Additional flags for ranges to filter suspended/real pages and audio/silent tabs
- Setting "pdfbehavior" to control what happens with PDF files (default changed from viewing to download)
- Support for the context menu key with default mapping to opening the menu
- Setting "historyperpage" to control the amount of history entries to show per page
- Action "pointer.copyTitleAttr" to copy the title attribute of a hovered element
- Action "pointer.copyPageTitle" to copy the page title of the hovered link if in the history
- Full interface scaling startup flag "--interface-scale", which can be combined with custom font sizes to achieve many different ratios
- Setting "notificationlimitsmall" to control how many newlines should be the limit for small/large notifications
- Option "largeonly" to the "nativenotification" setting to only show large ones natively
- Actions "pageRSSLinksList" and "pageRSSLinkToClipboard" to list and copy RSS feed urls found on the page

### Changed

- Setting "replacespecial" is now by default set to "special"
- Default mapping `<C-c>` will now copy in normal, pointer and visual mode as well
- Setting "restoretabs" is now an enum that accepts different options
- Setting "notificationforpermisions" is now an enum that accepts different options
- Example configs to not include as much duplication as before
- Userstyles are now applied even if darkreader fails to apply
- Mapstring splitting to be more accurate when recursively including < and >
- Mappings for recording macros to be more in line with Vim, by mapping and unmapping them on start/stop
- Buffer commands to show all matching commands instead of the first one (especially useful for ranges)
- Pin command to better preserve tab order when using ranges
- JavaScript execution to always allow user interaction APIs
- Svg and "data:" favicons to be used if present in the list, otherwise still pick the first
- History page rendering mechanism to support large history files much better using pagination and background rendering
- Setting "guifontsize" now accepts a much wider range of values to accommodate interface scaling
- Erwic mode permissions to now ask for displaycapture instead of blocking it (Vieb default is still to block)
- Favicon mapping storage now uses a debounce mechanism similar to browsing history to improve performance
- Crashed tabs to allow navigating and reloading by recreating them as a new tab at the same position

### Removed

- Action "openNewTab" in favor of ":tabnew" command
- Setting "clearhistoryonquit" in favor of "clearhistoryinterval=session"
- Setting "search" in favor of the functionality identical "searchengine" setting
- Setting "tabnexttocurrent" in favor of "tabnewposition" enum
- Setting "tabclosefocusright" in favor of "tabclosefocus" enum

### Fixed

- Image and svg follow links not showing since 9.0.0
- Scrollbar styling not working on pages that block custom CSS
- Userstyles not working on pages that block custom CSS
- Display capture styling not working on pages that block custom CSS
- Index-based ranges not working correctly for some commands
- Navigation delay system updating the current page instead of the right one
- Navigation delay system preventing page navigations for new tabs that are not loading
- Favicon not showing or spinner still rotating for suspended tabs
- Insert mode being left if interacting with the page menu
- System clipboard being used incorrectly on Windows and Mac on selections due to selection clipboard not existing on those systems
- Commands "tabnew" and "tabnewcontainer" not converting arguments to a url (preventing searches from working too)
- Mouse hover remaining on follow element when moving the mouse outside of the window
- Mappings being listed as modified when they were overwritten by the very same entry using :map
- Follow links which vary in height/width compared to parent potentially causing follow highlight to switch between them periodically
- Setting "containernames" not updating listed container immediately and not switching at all for new tabs and mouse clicks
- White background on special pages when reloading them multiple times
- Erwic settings not being saved with :mkviebrc if similar to regular Vieb defaults
- Settings "notificationforpermisions" being set to "none" not preventing notifications from being stored
- Keyboard focus being lost when opening pages that do not allow JavaScript to be run
- Suspendonrestore value "none" suspending all tabs instead of none
- Tabs with file paths open not being stored for next startup
- Incremental search sometimes moving two entries when searching the same string

### Versions

- Electron 25.1.1 (was 23.2.0)
- Chromium 114.0.5735.106 (was 110.0.5481.192)

## [9.7.1](https://github.com/Jelmerro/Vieb/compare/9.7.0...9.7.1) - 2023-05-04

[code diff](https://github.com/Jelmerro/Vieb/compare/9.7.0...9.7.1) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/9.7.1)

### Deprecated

- Setting "tabnexttocurrent" boolean in favor of "tabnewposition" enum
- Setting "tabclosefocusright" boolean in favor of "tabclosefocus" enum

### Versions

- Electron 23.2.0 (unchanged)
- Chromium 110.0.5481.192 (unchanged)

## [9.7.0](https://github.com/Jelmerro/Vieb/compare/9.6.0...9.7.0) - 2023-04-02

[code diff](https://github.com/Jelmerro/Vieb/compare/9.6.0...9.7.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/9.7.0)

### Added

- Command "clear" to wipe browsing data based on intervals or partial urls (currently only history)
- Setting "clearhistoryinterval" to more finely control the deletion of history on quit by interval
- Option "url" to the list of mouse features to control interaction with the input box while already typing (default on)
- Option "leaveinsert" to the list of mouse features to control if clicking outside the page should leave insert mode (default on)
- Option "notification" to the list of mouse features to control if clicking the download notification should open the file (default on)
- Setting "mousedisabledbehavior" to control if elements with no enabled mouse interaction should optionally drag the window (nothing by default)
- Setting "guiscrollbar" to control if and when the scrollbar should appear on pages (default remains always on)
- Documentation for all modes by mode name instead of just the action name (also means better sorted actions)
- More values to "dialogconfirm" to automatically allow the confirm dialog without needing to show it
- More default mappings that are similar to Firefox/Chromium
- Favicon icons to the buffer command suggestions for better recognition
- Actions "startRecording", "stopRecording" and "runRecording" to record key presses and later execute them (macros/records in Vim)

### Changed

- Resetting focus now happens on every user interaction instead of on a timer
- Url can now be selected from outside explore mode directly (and keep the selection if switching to explore mode)
- History storage is now slightly faster by only wiping empty entries on write
- Settings now have links to documentation about the type of value they can contain
- Naming scheme of setting types is now more streamlined and better documented
- Searchword urls are now filled in with the resolved url in the suggestions while you type
- Seachwords will now also activate if prefixed with spaces
- Filetype suggestions coming from history are now correctly colored in history color instead of file suggest color
- Default theme now shows the default cursor instead of the text cursor on the url box if interaction is disabled
- Locales are now included in regular releases but still excluded from lite builds (see `build.js`)
- All mouse features now have a "mouse-something" className added to the body if enabled to allow more customization in colorschemes
- Action "menuOpen" will now keep working even if the settings are set to never, this does not affect regular right clicks
- Userstyles are now also applied when the DOM is ready, not just when the page is fully loaded
- Commands "screencopy" and "screenshot" will show the screen highlight even without entering all 4 dimension values
- Single key mapping commands now also combine different modes into one map command if all modes have the same mapping
- Buffer commands now search for matches the same way as explore mode, as do the suggestions

### Deprecated

- Setting "clearhistoryonquit" in favor of "clearhistoryinterval=session"
- Default value for "replacespecial" being "newtab" (will change to "special" in 10.x.x)
- Setting "search" in favor of the functionality identical "searchengine" setting
- Ctrl-c default mapping for the stopLoadingPage action instead of the new Esc
- Boolean toggling "restoretabs" in favor providing a value (toggle commands will stop working in 10.x.x)
- Boolean toggling "notificationforpermisions" in favor providing a value (toggle commands will stop working in 10.x.x)
- Action "openNewTab" in favor of running the ":tabnew" command

### Fixed

- Vieb right click menu not working due to removed .path in events
- Follow filtering being cancelled when interacting with the navbar using the mouse
- Explore mode history not storing the first change in the Ctrl-z/Ctrl-y history
- Middle mouse paste not updating explore mode's Ctrl-z/Ctrl-y history
- Self closing tabs not being cleaned up correctly due to Electron devtools close call being unsafe
- Text selection still briefly being visible outside explore mode when toexplore mouse feature is disabled
- Websocket connections being blocked when setting custom resourcetypes due to casing error
- Mousefeature history always being on even if not in the list of enabled features
- Mode selector not being as big as it should be and therefor closing the dropdown occasionally
- Sites without a div and without proper background not getting the default white background
- Pointer mode help commands going to the action if they have the same name
- Ctrl-F4 to close tab default mapping not working
- Default text value for prompt dialogs not being used
- Iframe position not being shifted correctly for iframes inside a same origin iframe

### Versions

- Electron 23.2.0 (was 23.1.1)
- Chromium 110.0.5481.192 (was 110.0.5481.104)

## [9.6.0](https://github.com/Jelmerro/Vieb/compare/9.5.1...9.6.0) - 2023-02-23

[code diff](https://github.com/Jelmerro/Vieb/compare/9.5.1...9.6.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/9.6.0)

### Changed

- Mouse setting "copyselect" is no longer available/needed for copying text by selecting, as it wasn't blocked correctly anyway
- Mouse selections will now copy to the selection clipboard, instead of the default one, and at all times

### Fixed

- Userscript domain name not working at all by using an internal url instead of the page url
- Explore, command and search mode not being exited when dragging the mouse

### Versions

- Electron 23.1.1 (was 22.0.3)
- Chromium 110.0.5481.104 (was 108.0.5359.179)

## [9.5.1](https://github.com/Jelmerro/Vieb/compare/9.5.0...9.5.1) - 2023-01-20

[code diff](https://github.com/Jelmerro/Vieb/compare/9.5.0...9.5.1) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/9.5.1)

### Changed

- COOP is now enabled again as the old workaround for Twitter navigations is no longer needed
- SharedArrayBuffer is now enabled to make web workers more useful and faster
- Attempting to navigate a page that isn't ready for navigation will now wait until it's ready

### Fixed

- CORS issues when using darkreader
- Exception in devtools when using newtaburl
- Middle-mouse pasting not working in command and search mode as it would switch to explore mode incorrectly

### Versions

- Electron 22.0.3 (was 22.0.0)
- Chromium 108.0.5359.179 (was 108.0.5359.62)

## [9.5.0](https://github.com/Jelmerro/Vieb/compare/9.4.0...9.5.0) - 2022-12-14

[code diff](https://github.com/Jelmerro/Vieb/compare/9.4.0...9.5.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/9.5.0)

### Added

- Startup argument "--unsafe-multiwin" to have multiple windows in the same datafolder and skip the single instance safety check
- Command "translatepage" to translate the page using Deepl API or LibreTranslate
- Settings "translateapi", "translatekey", "translatelang" and "translateurl" to customize translation settings for ":translatepage"
- Setting "permissionclipboardwrite", as clipboard writing was recently moved to a permission by Electron (default remains allowed)
- Settings "replacespecial" and "replacestartup" to control when new pages should re-use/replace the current tab

### Changed

- Rpm and deb releases are now symlinked in /usr/bin correctly on updates after this one
- Confirm char "!" for special page commands now opens them in a new tab regardless of the new "replacespecial" setting

### Fixed

- Recursive key mappings not working correctly when the timeout is reached and there are also multi-key mappings
- Cache errors/corruption on Windows upon restart after clearing/disabling cache
- Setting externalcommand is now actually used for opening new tabs externally (fallback remains the default browser)
- Exception popup on Linux when quitting if using window frame borders
- Valid urls without protocol not always being recognized as a startup argument

### Versions

- Electron 22.0.0 (was 22.0.0-beta.5)
- Chromium 108.0.5359.62 (was 108.0.5359.40)

## [9.4.0](https://github.com/Jelmerro/Vieb/compare/9.3.0...9.4.0) - 2022-11-16

[code diff](https://github.com/Jelmerro/Vieb/compare/9.3.0...9.4.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/9.4.0)

### Added

- Percentage based scrolling when using "gg" or "G" with a count, similar to Vim
- Action "startFollowCopyLink" for copying links of selected elements in follow mode
- Setting "darkreadermode" to switch between light and dark schemes/modes for darkreader
- Settings "resourcetypes", "resourcesallowed" and "resourcesblocked" to control allowed/blocked resource types
- Setting "shell" to control the shell to use for system commands
- Live indicator of current theme preference to the nativetheme help documentation

### Changed

- Maximum values of darkreader brightness and contrast settings from 100 to 200 percent
- Buffer-like command suggestions to be in sync with actual behavior
- Buffer-like command suggestions to include the page url
- Check if the entire body is scrollable instead of the window for global scroll actions and scrollpos
- Prevent navigation to invalid urls to make sure a page can always be interacted with
- Shell now reads "$SHELL" instead of defaulting to "/bin/sh" for system commands

### Fixed

- Action "openNewTabWithCurrentUrl" not working at all in last release due to unsafe check
- Duplicate downloads due to page restart workaround (which is now fixed by Electron)

### Versions

- Electron 22.0.0-beta.5 (was 21.1.0)
- Chromium 108.0.5359.40 (was 106.0.5249.91)

## [9.3.0](https://github.com/Jelmerro/Vieb/compare/9.2.1...9.3.0) - 2022-10-10

[code diff](https://github.com/Jelmerro/Vieb/compare/9.2.1...9.3.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/9.3.0)

### Added

- Setting "reloadtaboncrash" to automatically recreate a crash tab with the last known url
- Indicator for unresponsive tabs in the form of a small red border on the left of the unresponsive tab
- Setting "userscript" to run custom JavaScript on pages, optionally using the GreaseMonkey API

### Changed

- Modifiers/shifted keys for searching, marks and follow mode now work more reliable
- Tabs will no longer refuse to navigate when there is a beforeunload listener that calls preventDefault
- When the current tab is crashed, you can no longer enter irrelevant modes in it

### Fixed

- Initial tab load issues on some devices for specific pages
- Split state not being kept when switching container name based on containernames setting
- Multiple useragents being set sometimes causing duplicate page loads
- BatteryManager errors for insecure pages, since it's an HTTPS-only API
- Follow mode and other main process calls not succeeding when there are crashed tabs present

### Versions

- Electron 21.1.0 (was 21.0.1)
- Chromium 106.0.5249.91 (was 106.0.5249.61)

## [9.2.1](https://github.com/Jelmerro/Vieb/compare/9.2.0...9.2.1) - 2022-10-04

[code diff](https://github.com/Jelmerro/Vieb/compare/9.2.0...9.2.1) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/9.2.1)

### Changed

- Enter key will now also send keypress events when executed by a mapping
- Pick first matching rule from permission allow, block or ask lists
- Permission allow list can now include labels for mediadevices using "mediadevicesfull"

### Fixed

- Media device requests being mislabeled as display capture permission requests in some cases

### Versions

- Electron 21.0.1 (was 21.0.0)
- Chromium 106.0.5249.61 (was 106.0.5249.51)

## [9.2.0](https://github.com/Jelmerro/Vieb/compare/9.1.0...9.2.0) - 2022-09-28

[code diff](https://github.com/Jelmerro/Vieb/compare/9.1.0...9.2.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/9.2.0)

### Added

- New themes: light-compact, paper-compact and paper
- Backwards searching if search is started with a shifted key (by default `?`)

### Changed

- Pinned and mute state are now remembered for tabs affected by "containernames" container switching
- Pinned tabs will now be correctly reopened by "containernames" container switching
- Mouse scrolling on Vieb elements will now scroll the underlying page if the "pageoutsideinsert" mouse feature is on (default)
- Search will now find the next match if searching for the same string again
- Default blocklist urls to use adblockplus instead of easylist due to fetch issues

### Fixed

- Follow mode borders showing over labels
- Follow mode mouse hover appearing when not needed
- Backwards searching not working in previous release due to typo
- Special characters not working in custom viewers (markdown, reader and source)

### Versions

- Electron 21.0.0 (was 20.1.1)
- Chromium 106.0.5249.51 (was 104.0.5112.10)

## [9.1.0](https://github.com/Jelmerro/Vieb/compare/9.0.0...9.1.0) - 2022-09-07

[code diff](https://github.com/Jelmerro/Vieb/compare/9.0.0...9.1.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/9.1.0)

### Added

- Settings "searchscope" and "searchemptyscope" to make local tab-specific searches
- Default mapping for emptySearch using `Backspace`

### Changed

- Adblocker can now update custom blocklists by adding a "list.json" file to the blocklists folder
- Failed load error page to include certificate permission setting if related to cert errors

### Fixed

- Preload path of adblocker not being correct for all builds
- All remaining runtime error popups related to subframe access issues (they are now shown in the console)
- Erwic datafolder not resolving "~" correctly
- Fixed atob issues by updating to an Electron release with a correct implementation

### Versions

- Electron 20.1.1 (was 20.0.2)
- Chromium 104.0.5112.102 (was 104.0.5112.81)

## [9.0.0](https://github.com/Jelmerro/Vieb/compare/8.1.0...9.0.0) - 2022-08-14

[code diff](https://github.com/Jelmerro/Vieb/compare/8.1.0...9.0.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/9.0.0)

### Added

- Special type of notification for dialog inform notifications, which can be colored separately
- Setting "suggestbouncedelay" to control the debounce delay of suggestions, to handle fast typing better
- Setting "darkreaderblocklist" to block specific sites (regular expressions) from using darkreader, even if enabled
- Setting "userstyle" to toggle loading of custom CSS files into the page, either globally or per-domain
- Actions "toggleMarkdownViewer" and "toggleMarkdownViewerNewTab" to toggle the new theme supported "markdownviewer"
- Setting "nativetheme" to control the theme to report to pages, used by the "prefers-color-scheme" CSS rule
- Quickmarks to store and reload scroll positions, pointer positions and page urls quickly
- Commands "marks", "restoremark", "delmarks", "pointerpos", "restorepointerpos", "delpointerpos", "scrollpos", "restorescrollpos" and "delscrollpos" to list and delete quickmarks
- Settings "quickmarkpersistence", "pointerpostype", "pointerposlocalid", "scrollpostype", "scrollposlocalid", "markposition" and "markpositionshifted" to control quickmarks
- Actions "storeScrollPos", "restoreScrollPos", "p.storePos", "p.restorePos", "makeMark" and "restoreMark" to add and load quickmarks
- Webpack compilation to the released builds, for better tree-shaking and minified code
- Separate "lite" build/release that does not have any dependency packages installed

### Changed

- Only show notification popup for notifications with lots of newlines
- Examples are now downloaded as blobs instead of files to allow them to be bundled in the asar file for releases
- Startup argument "--debug" is now called "--devtools" to avoid nodejs argument conflict
- Give "storenewvisits" a new option for "markdownviewer"
- Logic for staying in follow mode after selecting something is now more consistent in remembering the previous mode
- Main process devtools are now always undocked to prevent window size issues
- Follow mode logic to use the much faster async IntersectionObserver instead of sync API
- Follow mode logic to be faster if fewer element types are queried
- Use Electron's clickOnSearch implementation in favor of Vieb's custom one
- Setting "containernames" now also works for current tab navigation, unless you tell it not to with the "~newtab" suffix
- Use regex to detect SVG favicons instead of relying on "is-svg" dependency
- Use nodejs filesystem API instead of relying on "rimraf" dependency
- All runtime dependencies are now loaded safely, and will show a message when missing (this makes ALL dependencies optional)
- Custom icon and name are now shown on the version page as well
- Only include en-US locale in builds to decrease build size significantly
- Invalid or missing chrome:// pages are now redirected to their Vieb counterpart (if it exists) or the help page

### Removed

- Extension support, see [this Github issue](https://github.com/Jelmerro/Vieb/issues/385) to learn more
- Setting "firefoxmode" in favor of setting the "useragent" setting to a Firefox useragent

### Fixed

- Suspended tabs sometimes failing to wake up correctly
- Commands :rclose and :lclose not working correctly when there are suspended tabs
- Race condition in opening new tabs with urls that would sometimes unsuspend them twice
- White background on some pages that load page styling async and in reloaded iframes
- Error popup from the main thread regarding discarded frames
- White background on pages with dark color-scheme preference and no custom styling

### Versions

- Electron 20.0.2 (was 19.0.6)
- Chromium 104.0.5112.81 (was 102.0.5005.115)

## [8.1.0](https://github.com/Jelmerro/Vieb/compare/8.0.0...8.1.0) - 2022-06-29

[code diff](https://github.com/Jelmerro/Vieb/compare/8.0.0...8.1.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/8.1.0)

### Added

- Darkreader with many settings like "darkreader" and "darkreadercontrast" to toggle and control darkreader theming
- Sponsorblock with settings "sponsorblock" "sponsorblockcategories" to toggle and control blocking

### Changed

- Reduced the amount of mouse movement events while inside pointer mode, greatly reducing CPU usage
- Setting "useragent" is now separated by tildes `~` instead of commas `,` as to allow commas to appear in useragents
- Settings with `,` separator with each entry having a `~` separator can now be removed with just the part before the first `~`
- Explore mode suggestion logic should now be faster after first search by caching page titles

### Deprecated

- Extension support, see [this Github issue](https://github.com/Jelmerro/Vieb/issues/385) to learn more

### Fixed

- Compact layout overflowing below the visible window, now uses grid layout
- Shifted space and backspace not working in navbar as a regular space/backspace
- DOM issue when trying to send iframe details before DOM is ready

### Versions

- Electron 19.0.6 (was 19.0.3)
- Chromium 102.0.5005.115 (was 102.0.5005.63)

## [8.0.0](https://github.com/Jelmerro/Vieb/compare/7.2.0...8.0.0) - 2022-06-08

[code diff](https://github.com/Jelmerro/Vieb/compare/7.2.0...8.0.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/8.0.0)

### Added

- Setting "useragent" to use any number of custom useragents (either one, or a list that is randomly used per page load)
- Settings "encodeurlcopy" and "encodeurlext" to control the percent encoding/decoding of the urls
- Script-based blocking of ads in the adblocker, for example to block Youtube and Twitch ads
- Support for "prompt" dialogs, and thus "show" and "notifyshow" are now valid values for "dialogprompt"
- Mouse option named "movepointer" which moves the pointer to the click location
- Actions "toggleSourceViewer" and "toggleSourceViewerNewTab" to toggle the new theme supported "sourceviewer"
- Actions "toggleReaderView" and "toggleReaderViewNewTab" to toggle the new theme supported "readerview"
- More default themes: numberedtabs and compact (thanks to @stevkazt)

### Changed

- Setting "windowtitle" now accepts a custom string with variables instead of hard-coded formats (linking to password managers should be easier now)
- Dialog settings are now all blocked with notifications by default
- Duplicate download numbering now starts from (1) instead of (2)
- Duplicate download name for files that end in "tar.something" will now have the counter before the ".tar"
- Iframes are now isolated properly, making them faster and more secure (no more infinite loop to set listeners for them)
- Privacy overrides are now always done with a preload, making them faster and more secure (no more infinite loop to patch them)
- Increase default timeoutlen above Vim's level because it makes more sense for Vieb
- Rename "fontsize" to "guifontsize" to make it more clear where the font size applies
- Url detection logic to be more in line with the actual spec, resulting in simpler implementation
- Downloadpath is now empty by default and will read `XDG_DOWNLOAD_DIR`/xdg-user-dirs (with the same fallback to `~/Downloads` as before)
- Give "storenewvisits" new options for "sourceviewer" and "readerview", and rename "builtin" to "special" to make more sense

### Removed

- Action "toLastUsedTab" in favor of using ":buffer #" in line with other buffer-like commands that support "#"
- Startup option to enable strict site isolation, it is now strictly isolated at all times
- CSS transitions from default theme (specifically on the mode selector)

### Fixed

- Command "reloadconfig" did actually reset the settings instead of just reload them
- Urls prefixed with a protocol not being checked if they are navigable urls at all (possibly resulting in broken tabs if navigated to)
- Race condition on unsuspending tabs and opening tabs with a url directly that led to empty pages
- Composing keyboards typing out the keys in addition to the composed keys on macos
- Internal errors for looping over pages when some of them are suspended (in case of zooming, page capturing, or save page)
- Follow links (or their labels) not being visible if an element continues outside the visible section of the page

### Versions

- Electron 19.0.3 (was 18.0.1)
- Chromium 102.0.5005.63 (was 100.0.4896.60)

## [7.2.0](https://github.com/Jelmerro/Vieb/compare/7.1.2...7.2.0) - 2022-03-31

[code diff](https://github.com/Jelmerro/Vieb/compare/7.1.2...7.2.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/7.2.0)

### Added

- Setting "suspendplayingtab" to control if tabs playing media should be suspended by suspendtimeout
- Settings "dialogalert", "dialogconfirm" and "dialogprompt" to control if dialogs should show and/or be logged at all
- Permissions for serial and other human interface devices (permissionserial, permissionhid, both blocked by default, same as before)
- Default mappings that make use of the last used tab argument (for example "close #") of buffer like commands (prefixed with "B")

### Changed

- Useragent was modified to the upcoming reduced/simplified version of the final phase of https://www.chromium.org/updates/ua-reduction/
- Battery API now returns fixed "no battery" values instead of being undefined
- The SSL error filter now includes more ERR codes by looking for `_CERT_` and `_SSL_` instead of using a fixed list
- Attempt to delete blocked navigator properties from navigator object completely instead of returning undefined
- Disable useragentdata client hints API completely (previously only in Firefox mode)
- The last used tab variable will now as a fallback pick the first tab instead of opening a new search tab with "buffer" and "Vexplore"

### Removed

- Plugins and mimeTypes overrides in favor of default hard-coded PDF plugin and mimetype lists (as per Firefox and Chromium)

### Fixed

- Reloadconfig command not resetting permissions (and other webview/main thread settings) in some cases
- Crash when pressing cancel in the print dialog (fixed by upgrading Electron)
- Interaction with other pages not working when the debugger is paused (due to overlay, which is now disabled by default for new sessions)

### Versions

- Electron 18.0.1 (was 17.0.1)
- Chromium 100.0.4896.60 (was 98.0.4758.82)

## [7.1.2](https://github.com/Jelmerro/Vieb/compare/7.1.1...7.1.2) - 2022-02-20

[code diff](https://github.com/Jelmerro/Vieb/compare/7.1.1...7.1.2) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/7.1.2)

### Fixed

- Split resize actions (increaseWidthSplitWindow etc.) not being able to resize multiple times in the same direction

### Versions

- Electron 17.0.1 (was 17.0.0)
- Chromium 98.0.4758.82 (was 98.0.4758.74)

## [7.1.1](https://github.com/Jelmerro/Vieb/compare/7.1.0...7.1.1) - 2022-02-10

[code diff](https://github.com/Jelmerro/Vieb/compare/7.1.0...7.1.1) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/7.1.1)

### Changed

- Telegram channels and a Matrix space now exist and were added to the version page

### Fixed

- AppImage builds being broken

### Versions

- Electron 17.0.0 (unchanged)
- Chromium 98.0.4758.74 (unchanged)

## [7.1.0](https://github.com/Jelmerro/Vieb/compare/7.0.0...7.1.0) - 2022-02-06

[code diff](https://github.com/Jelmerro/Vieb/compare/7.0.0...7.1.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/7.1.0)

### Added

- Setting "newtaburl" to set a custom url for the new tab page
- Actions "p.mediaDown" and "p.mediaUp" to lower or raise the volume of media elements (audio or video)

### Changed

- Allow "search" to be empty to disable searching completely (also fixes the same ":mkviebrc full" warning of followelement-type settings)

### Fixed

- Custom btoa and atob implementations not working if the argument is a number (even if that's technically more correct)
- Unclickable follow mode link if it's the only link on the entire page
- Warning when running a ":mkviebrc full" config (because the followelement-type settings didn't allow an empty value)
- White background for XML documents
- First page in history always being the new tab page
- Focus element action failing to get the length of elements that don't have a value (textarea, contenteditable div, etc.)
- Argument issue with scriptnames command preventing it from working

### Versions

- Electron 17.0.0 (was 17.0.0-beta.4)
- Chromium 98.0.4758.74 (was 98.0.4758.11)

## [7.0.0](https://github.com/Jelmerro/Vieb/compare/6.2.0...7.0.0) - 2022-01-16

[code diff](https://github.com/Jelmerro/Vieb/compare/6.2.0...7.0.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/7.0.0)

### Added

- Range prefix support for many different commands
- Buffer-like commands now accept "#" to specify the last used tab
- Actions "startFollowNewSplit" and "startFollowNewVerSplit" to open links in splits with follow mode
- Setting "inputfocusalignment" to align input fields consistently on focus from follow mode
- Command "runjsinpage" to run any JavaScript inside the current page or pages matching a range
- Context menu options for opening any link in a split of vsplit, such as "split audio link" or "vsplit selected text"
- Pointer mode actions for opening splits of media urls, hovered urls or selected text, such as "splitAudio" or "vsplitText"
- Two new types of links in follow mode: media (audio/video elements) and images (img, svg and background images)
- Setting "followelementpointer" to control which elements should appear in follow mode when used to move the pointer
- Setting "notificationforsystemcommands" to enable or disable notifications for successful or failed system commands
- Setting "followchars" to specify exactly which characters should be used to select elements on the page
- Setting "followfallbackaction" to control what happens on pressing chars not part of followchars (new default is to filter results)
- Command "tabnew" and "tabnewcontainer" to open a new tab programmatically optionally with a custom container name
- Setting "containernames" to control which container names should be used for new tabs with a specific url (based on regex patterns)

### Changed

- Desktop capture API is now called from main thread and shows the app icons
- Command "reload" to "reloadconfig" to avoid confusion
- Actions "reload" and "reloadWithoutCache" are now called "refreshTab" and "refreshTabWithoutCache" to avoid confusion
- Consistency between menu items and reduced the amount of words in them for easier scanning
- Override for atob and btoa functions so they accept a wider range of characters instead of throwing errors (fixes Protonmail login issue)

### Removed

- Longtime workaround for electron-builder to manually create the mac zips (they are now valid zip archives instead of being broken)
- Compatibility linter plugin compat, as it's no longer needed due to widespread release of newer node versions

### Fixed

- Resolve file paths with query param characters in them and update the url accordingly
- Background color override not checking for background images before applying
- Mouse forward and back buttons not working on Windows
- Rare crash when the devtools would remain after deleting the webview and you would then interact with it, they are now closed along with the page
- Potential switch to insert mode after clicking on multiple links before leaving follow mode (by using Shift or right-clicking)

### Versions

- Electron 17.0.0-beta.4 (was 15.3.1)
- Chromium 98.0.4758.11 (was 94.0.4606.81)

## [6.2.0](https://github.com/Jelmerro/Vieb/compare/6.1.0...6.2.0) - 2021-11-14

[code diff](https://github.com/Jelmerro/Vieb/compare/6.1.0...6.2.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/6.2.0)

### Added

- Actions "pageTitleToClipboard", "pageToClipboardHTML", "pageToClipboardMarkdown", "pageToClipboardRST" and "pageToClipboardEmacs" for easier pasting in editors
- Setting "followelement" to filter which kind of elements should be shown in follow mode

### Changed

- Scriptnames command will now print the script index before the file path
- Automatic suspend timers of "suspendtimeout" will be restarted when the value is updated
- Searchwords now support multiple %s replacements in a single comma-separated query
- Privacy overrides now override the prototype getter instead of the function directly

### Fixed

- Alignment of calculated elements that relied on fixed numbers when using custom stylesheets
- Default mapping for previous tab using CtrlShift-Tab not working
- Audio and video control labels in context menu not being updated for elements with sourcesets
- Incorrect media type being used for the context menu media controls in some cases, such as a video element playing only audio
- Index for the buffer-like commands being shifted if the results are filtered
- Target blank links opening in new tab when using the mouse to click on them
- Relative urls opened using the window.open proxy doing a web search instead of navigation

### Versions

- Electron 15.3.1 (was 15.0.0-beta.7)
- Chromium 94.0.4606.81 (was 94.0.4606.31)

## [6.1.0](https://github.com/Jelmerro/Vieb/compare/6.0.0...6.1.0) - 2021-09-19

[code diff](https://github.com/Jelmerro/Vieb/compare/6.0.0...6.1.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/6.1.0)

### Added

- Mouse feature "screenshotframe" which allows you to drag the screenshot frame to a specific position
- Visual feedback for follow feature of the mouse using new highlight on hover

### Changed

- Make special mouse button dragging resize the screenshot frame by changing the width and height instead of position arguments
- Examples with custom commands are now in a separate example file that isn't used by default, due to its explicit and non-native nature

### Fixed

- Crash on uploading files due to Electron bug in beta 4
- Characters with different naming in Electron compared to JavaScript and Vim not being recognized as such in mappings

### Versions

- Electron 15.0.0-beta.7 (was 15.0.0-beta.4)
- Chromium 94.0.4606.31 (unchanged)

## [6.0.0](https://github.com/Jelmerro/Vieb/compare/5.3.0...6.0.0) - 2021-09-12

[code diff](https://github.com/Jelmerro/Vieb/compare/5.3.0...6.0.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/6.0.0)

### Added

- Setting "suspendbackgroundtab" to toggle if tabs opened in the background should be suspended (on by default)
- Setting "tabopenmuted" to control if new tabs should be muted (default off, can also be set for background tabs only)
- Setting "tabreopenmuted" to control if reopened tabs should keep their muted state (default is "remember")
- Startup option to control the autoplay policy of media in webpages (default changed to require document interaction)
- Make "!" behind close commands (close, lclose, rclose) also close pinned tabs regardless of the "closablepinnedtabs" setting
- DOM attribute "focus" that gets set on body, this can be used in themes to change styling when (un)focused
- Action "toggleAlwaysOnTop" to toggle the always on top state of a window, will try to use the native method for it
- Suspend toggle option to the contextmenu when right-clicking on a tab
- Command "nohlsearch" to hide the search but not clear the query (as done with emptySearch)
- Support for zooming the page with the mouse by scrolling while holding Control (similar to regular browsers) if mouse is enabled
- Double clicking on a tab (or the tabbar) now opens a new tab, at the end or next to it, depending on tabnexttocurrent
- Action "p.moveToMouse" to start pointer mode at the current mouse position
- Setting "permissioncertificateerror" to ask or even allow custom/invalid certificates (default remains to block them)
- Actions "menuTop", "menuBottom", "menuSectionUp" and "menuSectionDown" to give more flexibility of movement inside the menu
- Setting "searchpointeralignment" to control where the pointer should align to when moving between searches in pointer mode
- Actions "nextSuggestionSection" and "prevSuggestionSection" to jump between section in the explore mode suggestions
- Setting "menusuggest" to control if suggestions for explore and command mode should have a dropdown menu
- Feature "copyselect" to the "mouse" setting for automatically copying selected text to the clipboard (disabled by default)
- Actions "scrollLeftMax" and "scrollRightMax" to scroll the page to the absolute maximum left or right
- Command "screenshot" to save screenshots of the page to the downloads folder or a custom location, optionally of a specific page region
- Command "screencopy" to copy screenshots of the page to the clipboard, optionally of a specific page region
- Actions "moveTabStart" and "moveTabEnd" to move a tab all the way to the start or the end of the tabbar
- Many default mappings common in other browsers to the default mappings (if they don't conflict), including numpad mappings

### Changed

- Link color is now also taken from the current colorscheme for unstyled pages, making links more readable by default
- Setting "startuppages" now accepts optional container name, pinned status and muted status options using "~"
- Unsupported startup arguments are now passed to Chromium, which makes running Vieb on wayland possible
- Logo is now an SVG image with a slightly bolder font for the letters
- Strip packaged builds of unused assets by only including files using opt-in filters
- Apply search actions to all visible splits
- Use workarea instead of entire screen for detecting snapped windows
- Improve reliability of the mousefocus and top of page hover actions
- Make "nextSearchMatch" and "previousSearchMatch" move the pointer to the search match when called from pointer mode
- Newtab related actions in pointer mode are now prefixed with "t" instead of "n" to make room for searching with "n" and "N"
- Firefox release versions in firefoxmode to more realistic numbers because of recent Firefox release date delays
- Same domain check was improved to strip subdomains if needed (for both firefoxmode=google and the new certificateerror caching)
- Scroll position detection when searching which supports auto scrolling before finding the match and after (Electron doesn't do this in a fixed order)
- Algorithm for finding a matching tab based on text now matches the suggestions more accurately for buffer-like commands
- Setting "commandhist" and "explorehist" to optionally and by default store commands/navigations persistently
- Native clipboard actions to custom JavaScript actions which also translate spaces to "%20" for cutting and copying urls
- Mouse setting now accepts a list of features to enable instead of being a boolean toggle for all features
- Action "menuOpen" now opens the menu of the current tab when called from normal mode instead of the page menu
- Action "menuOpen" now opens the suggestions menu when a suggestion is selected instead of the url menu
- List-like settings can now be emptied using the "no" prefix, such as ":set noredirects"
- Selecting text inside an input field will now also switch to insert mode, if "toinsert" is enabled by the mouse setting
- Action "p.insertAtPosition" now also checks parent nodes to work better with SVG images
- List-like settings will no longer accept duplicate identical values in the list
- Buffer commands can now wrap from the end of the tabbar by providing a negative index
- Spellcheck suggestions should now also work for elements that are not input fields (but still not on Windows due to Electron bugs)
- Numbers with actions bound to them that are pressed when there is already a count will no longer execute the action but append the count
- Setting "search" to a list of search urls instead of a single url, which will be selected at random each time

### Fixed

- Numpad keys not typing out numbers in navbar related modes
- Special page navigations sometimes prompting to open externally when stored in the history
- Settings that affect special pages not applying in realtime when there are suspended tabs
- Media playing indicator not being cleared when the page is suspended
- Suggestions for suspend command showing already suspended tabs
- Pointer mode help commands not always working
- Visual mode activating when only moving the scrollbar if "mousevisualmode" is set to "activate"
- Numpad keys not being recognized as such when entered inside the page using insert mode
- Write command path bugs due to previous code rework in 5.x.x releases

### Versions

- Electron 15.0.0-beta.4 (was 13.1.4)
- Chromium 94.0.4606.31 (was 91.0.4472.106)

## [5.3.0](https://github.com/Jelmerro/Vieb/compare/5.2.0...5.3.0) - 2021-06-30

[code diff](https://github.com/Jelmerro/Vieb/compare/5.2.0...5.3.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/5.3.0)

### Added

- Action "increaseFirstNumber" and "decreaseFirstNumber" for modifying the first number of the url
- Action "increaseLastNumber" and "decreaseLastNumber" for modifying the last number of the url
- Action "increasePortNumber" and "decreasePortNumber" for modifying the port number of the url
- Action "nextPage" and "previousPage" for going to the next or previous page based on website pagination
- Action "nextPageNewTab" and "previousPageNewTab" for going to the next or previous page in a new tab
- Action "toParentUrl" and "toRootUrl" for removing levels/directories at the end of the url (separated by "/")
- Action "toParentSubdomain" and "toRootSubdomain" for removing subdomains from the url (separated by ".")
- Support for certain numpad keys in recursive insert mode mappings
- Funding link to my personal Github sponsors page: Jelmerro

### Changed

- Mappings `*` and `tx` etc. in visual mode now return to normal mode, similar to Vim
- Non-recursive insert mode mappings can now refer to a key with native functionality (if supported by Electron)
- Follow mode can now click on JavaScript links without reloading the page
- Action "increasePageNumber" and "decreasePageNumber" now only read the page query parameters, use the new actions for old functionality

### Fixed

- Text copy and download actions not doing the right thing when called from the context menu
- Splits being swapped in the grid if splitting directly to an already open page
- Menu actions being cancelled if parent mode has a multi-key mapping
- Folders with many items not being scrollable in the file explorer

### Versions

- Electron 13.1.4 (was 13.1.2)
- Chromium 91.0.4472.106 (was 91.0.4472.77)

## [5.2.0](https://github.com/Jelmerro/Vieb/compare/5.1.0...5.2.0) - 2021-06-20

[code diff](https://github.com/Jelmerro/Vieb/compare/5.1.0...5.2.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/5.2.0)

### Added

- Action "repeatLastAction" to repeat the last called action or mapstring
- Action "p.restoreSelection" to restore the previously selected text in visual mode
- Mapping to execute the last executed command again (requires commandhist to be on "useronly" or "all")
- Cheatsheet for default mappings and general usage of Vieb to the help page, website and readme
- Example config for Vivaldi, Surfingkeys, Pentadactyl, Saka Key and Vim Vixen
- Support for numpad/keypad keys in mappings, such as k3, kEnd or kPlus
- Actions for visual mode to search, open, open in new tab, open externally or download selected text
- Setting "mousevisualmode" to control what happens when you select text with the mouse in relation to visual mode

### Changed

- More consistent opening of splits when many tabs are open
- Further improvements to the encoding and decoding of urls
- Keycodes for popups are now acquired the same way as regular keys, so that they work on different keyboard layouts
- Action "editWithVim" can now also be used to edit text in search, explore and command mode (besides just input fields in insert)
- Action "nop" is now a regular action, old name "Nop" will continue to work due to recent case-insensitive action names rework
- Window state is now also saved after a series of actions, instead of only before it and on quit

### Fixed

- Missing help docs for media related actions, such as pausing, muting and looping
- All actions being reported as countable even though some of them aren't
- Call command and custom mappings not always executing first part of the mapping from normal mode
- Uncountable actions being executed multiple times when not recursively called
- Broken symlink for Linux installers in /usr/bin

### Versions

- Electron 13.1.2 (was 13.1.1)
- Chromium 91.0.4472.77 (unchanged)

## [5.1.0](https://github.com/Jelmerro/Vieb/compare/5.0.0...5.1.0) - 2021-06-09

[code diff](https://github.com/Jelmerro/Vieb/compare/5.0.0...5.1.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/5.1.0)

### Added

- Open command to navigate to a website or search term directly with a command
- Setting "permissionsensors" to control motion sensor reading (default remains blocked, previously grouped as "unknown")
- Setting "permissionscreenwakelock" to allow sites to prevent dimming/sleeping (default remains blocked, previously grouped as "unknown")
- Setting "mapsuggest" and "mapsuggestposition" to show and control the suggestions for multi-key mappings (by default 50 on the topright)
- Setting "modifiers" to control which keys should not be registered on their own, but only when used as a modifier
- Setting "smartcase" to make searches with capital letters case sensitive while remaining case insensitive by default (setting on by default)
- Command "scriptnames" to print the list of config files loaded at startup (and optionally those sourced by them using "!")
- Command "source" to load other config files either relative to the current one or by an absolute path at runtime
- Small indicator for links on special pages to show which ones will open an external web page
- Example config for qutebrowser
- Actions and context menu options for controlling audio and video playback, such as toggling controls/loop/mute

### Changed

- Vertical tabs theme now displays multiple pinned tabs horizontally with wrapping
- Redirects are now saved to correctly set the favicon and title in those cases
- Call command now accepts any valid mapstring instead of only simple actions
- Help command now accepts different types of punctuation and casing to find the right section (which is now escaped as well)
- Action names are now case-insensitive and optionally without the "action." prefix, or with the shorter "a." or "p."
- All action names get sanitized to the shortest name possible with the new system, old names are still completely supported just not shown
- Blobs are now recognized as valid urls, just like other common URI schemes
- Default styling of notifications and the new mapsuggest across all themes
- Mappings with multiple keys that get aborted by starting another mapping will now both get executed similar to Vim
- Notification popup text can now be selected and will show all lines completely (last one was sometimes hidden)
- More broad selectors for finding pagination on the page to make page number actions work for more sites
- Help command now accepts any mapped sequence of keys and will open the first action or command those keys are mapped to

### Fixed

- Split commands not switching to the tab directly, which meant that mappings with splits didn't work properly
- Recursive mappings with multiple keys for a single action not being interpreted correctly in all cases
- Context menu actions for navigation history and refresh always being listed even if not available
- Empty new tabs always having a single history entry for the same empty page
- Pointer modes being exited when opening the context menu
- Screensharing throwing a Promise error in 5.0.0
- Media keys being off by default in 5.0.0 (they should be on by default, just as documented)
- Twitter not loading due to media keys overwriting Chromium arguments to fix COOP issue in 5.0.0
- Suggestions for write command not working recently
- Mouse clicks and context menu sometimes throwing errors due to missing DOM api for detecting matching selector on some elements
- Background image urls not always being correctly detected if there are also other types of backgrounds present such as gradients
- Commands with dashes breaking the check for valid keys and therefor not being recognized
- Help command showing suggestions for custom commands (which don't have help)
- Custom commands not having suggestions for existing commands (command and delcommand)
- Encoding issues when navigating to urls with asian characters in them

### Versions

- Electron 13.1.1 (was 13.0.1)
- Chromium 91.0.4472.77 (was 91.0.4472.69)

## [5.0.0](https://github.com/Jelmerro/Vieb/compare/4.5.1...5.0.0) - 2021-05-26

[code diff](https://github.com/Jelmerro/Vieb/compare/4.5.1...5.0.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/5.0.0)

### Added

- Setting "suggestorder" that merges all explore mode related settings into one, with additional functionality
- The "suggestorder" is a list-like setting that accepts different suggestion types, with optional count and sort order arguments
- Suggestions for searchwords using the new "suggestorder" setting by default
- Default mapping for quitting Vieb with `<A-F4>` which doubles as the mapping that gets executed for other close requests
- Copy link option for audio, video and images in the context menu
- Copy image option for images, background images and SVG elements in the context menu (they are categorized as images in that order)
- Pointer action "swapPosition" to switch the current pointer location with the start location of the visual selection
- Command syntax to cycle fixed-set strings using the "!" suffix, similar to boolean type settings
- Startup arguments "--config-order" and "--config-file" to better control which config files get loaded
- Command mapping list to the header of commands on the help page
- Setting "menupage" to control when the context menu of the webpage should appear, possibly over the website's menu
- Setting "menuvieb" to control when the context menu should appear for the Vieb elements like the navbar and the tabbar
- Pointer mode actions for most context menu options, such as "pointer.downloadAudio", "pointer.newtabVideo" and "pointer.copyImageBuffer"
- Setting "commandhist" to control which commands should be stored in the history
- Setting "explorehist" to control which navigations should be stored in the history
- Prefix "!" to command mode that will run system commands directly

### Changed

- Unsupported startup arguments are now ignored with a warning instead of preventing startup (they could be chromium args)
- More names than before are allowed for containers, as it works with a small blocklist instead of an allowlist for characters
- More names for seachwords are now allowed as part of the keyword, for similar reasons as above
- Container names in Erwic configs will no longer replace special characters, but will report and exit
- Word separator keybindings in the navbar will now detect separators for non-latin scriptures using a list of allowed separators
- Default value of "permissionmediadevices" and "permissionnotifications" from "ask" to "block" to reduce the amount of popups
- Startup arguments now accept values separated by `=` instead of spaces or no value at all
- Renamed "rotateSplitWindow" to "rotateSplitWindowForward" to be more consistent with the recently introduced "Backward" variant
- Calling action "menuOpen" from navbar input modes now opens the context menu of the navbar
- Don't load regular tabs on startup, but suspend them (they are not loaded until you switch to them)
- Common URI schemes and IPv6 addresses are now recognized as links by explore mode and when navigating
- Remove side effects of lock keys by mapping them to Nop by default
- Reworked eslint config to be more strict and more accurately represent the desired code style
- Default config parse order is now "user-first", use "--config-order=datafolder-first" to revert to the old behavior
- Startup argument urls are now resolved as files if possible, both absolute and relative paths are supported (relative to CWD)
- Download image action of pointer mode now uses the same logic as the context menu
- Long urls in popups are now not only wrapped at 50 characters, but also maxed at a 1000, after that the rest is hidden
- Setting "nativenotification" to a "Fixed-set string" to allow using native notifications for small messages and show popups for long ones
- Preload scripts for Erwic can still be loaded by tabs even if the file doesn't exist on startup
- Setting "storenewvisits" is now a list of types that should be stored, instead of a toggle for all forms of history
- Permissions for "mediadevices" and "notifications" are now blocked by default instead of asking each time

### Removed

- Setting "suggestfiles" in favor of the new "suggestorder" setting
- Setting "suggestfilesfirst" in favor of the new "suggestorder" setting
- Setting "suggestexplore" in favor of the new "suggestorder" setting
- Setting "respectsitecontextmenu" in favor of the new "menupage" setting
- Action "closeTab" in favor of the ":close" command
- Broken FreeBSD build target, it's not supported by Electron or Electron Builder

### Fixed

- Tempfile for the vimcommand not working on mac due to spaces in filename
- Spellcheck languages not working correctly when using multiple containers
- Navbar input position not following the caret when text is longer than the input box
- Maximizing the window with double-click that could also incorrectly switch to a tab that happens to be at the second click location
- Middle mouse having side effects in the tab bar on Windows
- Quotes in settings messing with the :mkv command output
- Left-click in pointer mode not clicking on the right location when the page is zoomed
- Container color not always being updated if a color rule is removed from the list
- Search mode not clearing the url correctly if opened from the mouse dropdown selector

### Versions

- Electron 13.0.1 (was 12.0.5)
- Chromium 91.0.4472.69 (was 89.0.4389.128)

## [4.5.1](https://github.com/Jelmerro/Vieb/compare/4.5.0...4.5.1) - 2021-04-28

[code diff](https://github.com/Jelmerro/Vieb/compare/4.5.0...4.5.1) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/4.5.1)

### Fixed

- Rimraf errors sometimes being shown on Windows when quitting

### Versions

- Electron 12.0.5 (unchanged)
- Chromium 89.0.4389.128 (unchanged)

## [4.5.0](https://github.com/Jelmerro/Vieb/compare/4.4.0...4.5.0) - 2021-04-28

[code diff](https://github.com/Jelmerro/Vieb/compare/4.4.0...4.5.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/4.5.0)

### Added

- Setting "quitonlasttabclose" to quit Vieb when closing the last tab instead of opening an empty tab
- Vimium-inspired and Tridactyl-inspired example viebrc configs to the help page
- Video and audio context menu actions
- Suggestions for typos in the context menu under the new group "Suggestions"
- Action "menuOpen" to open the menu for the currently active insert mode element (or simply at the pointer location)

### Changed

- Code is now checked by eslint for compatibility with the latest Chromium
- Renderer process now uses modules instead of globals, similar to other code
- Adblocker now updates by making regular web requests from the main partition instead of using the Node request module
- Icon is now optional when manually installing extracted extensions
- Suggestions will now also appear when commands or urls are typed out using mappings (after mapping is done)
- Insert mode with multiple keys are now correctly blocked from their native function, and are repeated properly if the mapping isn't finished
- Native navbar actions (such as "End") are now implemented by Vieb itself so they can be referenced by recursive mappings
- Renderer process no longer uses external modules, rimraf communicates with main, hazardous has been rewritten inside Vieb
- Context menu is now grouped by category to make different types of actions more clear

### Fixed

- Windows not always focusing correctly when closing popups or starting Vieb (mostly a Windows-only bug)
- Built-in special pages not always having the correct title and icon when they are suspended
- Adblocker updating twice at the startup when it's set to "update"
- Action "clickOnSearch" not working when zooming the page
- Mappings containing numbers not being able to override the repeat counter
- Lock key mappings not working when blocked individually instead of being part of a mapping
- File suggestions not working for partial matches for the last two releases
- Extension remove command suggesting the full path instead of the id on Windows
- File explorer not working on Windows
- Clearonquit-type settings not working for all releases due to very persistent electron-builder bugs that exclude "unused" dependencies

### Versions

- Electron 12.0.5 (was 12.0.4)
- Chromium 89.0.4389.128 (was 89.0.4389.114)

## [4.4.0](https://github.com/Jelmerro/Vieb/compare/4.3.0...4.4.0) - 2021-04-14

[code diff](https://github.com/Jelmerro/Vieb/compare/4.3.0...4.4.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/4.4.0)

### Added

- Command "only" to hide all splits and only show the current tab fullsize
- Action "toFirstSplitWindow" to switch focus to the first (top-left) window split
- Action "toLastSplitWindow" to switch focus to the last (bottom-right) window split
- Action "toNextSplitWindow" to switch focus to the next window split by appearance order (top to bottom, left to right)
- Action "toPreviousSplitWindow" to switch focus to the previous window split by appearance order (top to bottom, left to right)
- Action "exchangeSplitWindow" to exchange the current window split with the one next to it in the current position
- Action "rotateSplitWindowBackward" to rotate window splits counter-clockwise (as opposed to clockwise with the existing rotate action)
- Action "toLastUsedTab" to switch between the two last used tabs or window splits (uses timeoutlen for determining used tabs)
- Default mappings for all the new actions and also the quit command: ZZ

### Changed

- Check for favicon file existence before setting it as the tab icon
- Also check for matching urls in follow mode links before deciding to keep showing the same one

### Fixed

- Settings "splitbelow" and "splitright" being swapped in functionality
- Extract process of installing extensions not working in last release due to rework and electron-builder bugs
- History info being transferred to the current tab instead of the tab that actually requested it
- Action "editWithVim" not working in last release due rework and missing filename argument

### Versions

- Electron 12.0.4 (was 12.0.2)
- Chromium 89.0.4389.114 (was 89.0.4389.90)

## [4.3.0](https://github.com/Jelmerro/Vieb/compare/4.2.1...4.3.0) - 2021-04-05

[code diff](https://github.com/Jelmerro/Vieb/compare/4.2.1...4.3.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/4.3.0)

### Added

- Command "lclose" to close all tabs to the left of the current one (respects closablepinnedtabs)
- Command "rclose" to close all tabs to the right of the current one (respects closablepinnedtabs)

### Changed

- Overall structure and module loading of Vieb
- Follow mode now only uses the input focus when switching to insert mode
- Download confirmation now nicely formats the file size

### Fixed

- Potential error when selecting text or executing related actions and hovering over pseudo-elements
- Switching to other tabs while viewing a fullscreen video making Vieb unresponsive to any bindings
- Incorrect fullscreen styling in the default theme when using window splits

### Versions

- Electron 12.0.2 (unchanged)
- Chromium 89.0.4389.90 (unchanged)

## [4.2.1](https://github.com/Jelmerro/Vieb/compare/4.2.0...4.2.1) - 2021-03-28

[code diff](https://github.com/Jelmerro/Vieb/compare/4.2.0...4.2.1) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/4.2.1)

### Fixed

- Build issues due to electron-builder require statement constraints

### Versions

- Electron 12.0.2 (unchanged)
- Chromium 89.0.4389.90 (unchanged)

## [4.2.0](https://github.com/Jelmerro/Vieb/compare/4.1.0...4.2.0) - 2021-03-27

[code diff](https://github.com/Jelmerro/Vieb/compare/4.1.0...4.2.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/4.2.0)

### Added

- Startup argument "--disable-media-keys" to disable Vieb from capturing media keys for player controls
- Environment variables for the datafolder and Erwic configuration (can be overridden with CLI arguments)
- Notifications for the final step of loading an extension (either success or failed due to Electron incompatibility)
- Context menu actions, map commands and default mappings (mmap etc.) to navigate and select menu items
- Test coverage report is now generated while testing which is useful to make sure you test all scenarios

### Changed

- Follow and pointer mode logic for switching to insert mode, should make input focus more reliable
- Delcommand now shows suggestions for user commands that are added
- Select all option of the contextmenu is now listed for shadow roots and iframes
- Action "editWithVim" now works for input elements within shadow roots and iframes
- Map command listing now groups mappings that are the same for all modes into a single :map command
- Search is no longer cleared when navigating to a new page
- Require modules and specific functions only when needed (should be faster)
- Extension zip and folder are now deleted when the installation fails, so it can be retried
- Follow mode now remembers link positions even when returning to other modes, thus keys are more consistently assigned

### Fixed

- Examples not loading on the help page for released builds
- Side effects for Tab key in normal mode by setting it to Nop by default
- Extension path removal bugs on Windows due to backslashes
- Second instances not ignoring datafolder argument when started in certain ways on Windows
- Clipboard actions in contextmenu and visual mode now work in shadow roots and iframes
- Download image pointer action now works in shadow roots and iframes
- Action "clickOnSearch" not working if the page was scrolled
- Follow mode and related actions not working on chrome:// pages due to querySelectorAll oddities
- Follow mode not focusing input field correctly when holding Shift on keydown

### Versions

- Electron 12.0.2 (was 12.0.0)
- Chromium 89.0.4389.90 (was 89.0.4389.69)

## [4.1.0](https://github.com/Jelmerro/Vieb/compare/4.0.0...4.1.0) - 2021-03-04

[code diff](https://github.com/Jelmerro/Vieb/compare/4.0.0...4.1.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/4.1.0)

### Added

- Zip target for 64 bit Windows releases
- Startup argument "--window-frame" to show the system's native window frame border around the Vieb window
- Allow suitable startup arguments to be set by ENV variables as well

### Fixed

- Spelllang not recognizing languages that should be supported when loading the option on startup from a viebrc
- Custom message with external request details not appearing for openexternal permission
- Zoom level interfering with the right-click menu location
- Insert mode not always activating when clicking on input elements (select elements or clicking on sub-elements of an input)

### Versions

- Electron 12.0.0 (unchanged)
- Chromium 89.0.4389.69 (unchanged)

## [4.0.0](https://github.com/Jelmerro/Vieb/compare/3.4.0...4.0.0) - 2021-03-02

[code diff](https://github.com/Jelmerro/Vieb/compare/3.4.0...4.0.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/4.0.0)

### Added

- Command "mute" to toggle the audio playback status of a tab (either mute or unmute)
- Setting "respectsitecontextmenu" to toggle if Vieb should show its menu on websites that already provide one
- Setting "suspendonrestore" to restore tabs lazily (loading tabs only once they're visible)
- Setting "suspendtimeout" to automatically suspend background tabs after a delay
- Command "suspend" to manually suspend any background tab right now
- Setting "permissiondisplaycapture" to block or ask screensharing permission (you can select the source with follow mode or the mouse)
- Setting "permissionsasked" to ask for permissions on specific sites, it overwrites permissionsblocked and permissionsallowed configs
- Follow mode support for shadow roots using similar implementation as iframes
- Nop action that does nothing, can be used to prevent side effects for keys in insert mode (site won't register them, similar to mappings)
- Support for modifiers in recursive insert mode mappings
- Support for lock keys in mappings, such as CapsLock
- Setting "externalcommand" to configure the external command that will be used to open links externally
- Action "openLinkExternal" to open the highlighted url or current page url with an "externalcommand"
- Setting "tabclosefocusright" to decide if the right (or left) tab should get focused when closing a tab
- Setting "tabreopenposition" which configures the position that should be used to restore tabs: previous, left or right (default)
- Setting "follownewtabswitch" to toggle if follow mode for new tabs should switch to them on follow mode exit
- Command "makedefault" to make Vieb the default browser (or at least try to)
- Open-url handler to open a new tab for urls that are passed to Vieb via mac's alternative app argument system
- Startup option to enable strict site isolation, to make Google services more reliable, at the cost of blocking follow mode inside iframes
- Experimental command to install extensions: "extensions install" which you call when currently on an extension page
- List or remove installed extensions with "extensions list" and "extensions remove", or using the special page of the same name

### Changed

- Iframe detection on pages now also works for frames in framesets, embeds and for object tags
- Enable "respectsitecontextmenu" by default to be able to use the right-click menus of websites without Vieb interfering
- Mapped keys in insert mode won't be detected by the website, this prevents all side effects for mappings, including those for split devtools
- Default settings: Mouse is now on, new tabs with the mouse now switch to it, infinite maximum number of command suggestions and ignorecase is now on
- Most number ranges now go much higher (close to `MAX_INT`) and are only disabled if set to 0
- Restore the previous search selected when entering search mode (no history, just the previous one)
- Allow multiple languages to be passed to the "spelllang" option (and the "system" value is now handled better)
- The "spell" setting will now immediately take effect, also for existing tabs
- Privacy fixes for navigator properties and media info now run in iframes on a timer, can't be waterproofed without [this](https://github.com/electron/electron/issues/22582)

### Removed

- Migrations for old tab structure used in 2.x.x and older
- Fallback to name field for Erwic config files
- Support for search setting values that don't include a "%s" to be replaced by the search
- Action "openNewTabAtAlternativePosition", which is now implemented with a mapping that toggles the setting
- Darkreader plugin in favor of installing the darkreader extension from the Mozilla or Chrome store

### Fixed

- Potentially incorrect execution for following links with a custom datamethod attribute (such as put or post)
- Follow mode not loading on some pages due to querySelectorAll sometimes returning undefined instead of an empty NodeList
- Potential parse errors for invalid urls being stored or opened by pages
- Mouse action listeners potentially being wiped within iframes if re-added to the DOM
- Action "insertAtFirstInput" now works for subframes and for labels that link to hidden fields
- Right click menu potentially appearing when using follow mode on Windows

### Versions

- Electron 12.0.0 (was 11.2.1)
- Chromium 89.0.4389.69 (was 87.0.4280.141)

## [3.4.0](https://github.com/Jelmerro/Vieb/compare/3.3.0...3.4.0) - 2021-01-31

[code diff](https://github.com/Jelmerro/Vieb/compare/3.3.0...3.4.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/3.4.0)

### Added

- Action "action.reorderFollowLinks" to change which type of follow links appear on top
- Basic detection for pseudo-elements in follow mode, such as switches using ::before as the only visible section
- Right-click menu to websites (when in insert mode or when mouse is enabled)
- Right-click menu for Vieb interface (when mouse is enabled)
- Follow mode support for iframes
- ARM64 build for macOS

### Changed

- Reduce timer for follow mode, due to the many speed improvements and simplifications
- Labels will now correctly match the type of element they refer to (instead of always assuming the clickable type)
- Default order of elements in follow mode to align with functionality as it was before 3.3.0 (can still be shown with "action.reorderFollowLinks")
- Only display a single line of the url if it's really long (overflow is suggested with ellipsis)
- Pin command can now take an argument to search for a tab by name or index, similar to buffer commands

### Fixed

- Mouse events not getting registered properly when clicking inside iframes
- Potential error on websites when trying to access the return value of the window.open function

### Versions

- Electron 11.2.1 (was 11.1.1)
- Chromium 87.0.4280.141 (was 87.0.4280.88)

## [3.3.0](https://github.com/Jelmerro/Vieb/compare/3.2.0...3.3.0) - 2021-01-18

[code diff](https://github.com/Jelmerro/Vieb/compare/3.2.0...3.3.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/3.3.0)

### Added

- Action "action.pageToClipboard" for copying the current page url to the clipboard
- Action "action.openFromClipboard" to open pages from the clipboard (optionally in a new tab by calling that action first)
- Action "action.exploreHistoryNext" and "action.exploreHistoryPrevious" for finding previous site navigations in explore mode
- Startup argument to optionally turn off hardware acceleration (by default still turned on)

### Changed

- Better scrollbar color and sizing: it's now fullwidth and transparent to make search results visible below it
- Actions now contain more checks to prevent locks when Vieb has yet to load the first tab
- The builds of the Mac app are now part of an application category
- Website calls to window.prompt are now instantly returned with the cancel action instead of throwing an error
- Expand the list of supported filetypes and protocols for generated builds

### Fixed

- Colorschemes not being saved with the mkviebrc command
- Anchor tags potentially overriding the user's choice of opening links in the current tab by implementing a custom onclick that prevents the default
- Vertical colorscheme not displaying the pointer at the right location
- Explore mode not clearing the existing selection when opened as part of a mapstring (homepage command didn't work as described)
- Help page not resolving references to pointer chapter correctly
- Permissionsallowed setting not working for correctly for mediadevices if permissionsblocked was unset

### Versions

- Electron 11.1.1 (unchanged)
- Chromium 87.0.4280.88 (unchanged)

## [3.2.0](https://github.com/Jelmerro/Vieb/compare/3.1.0...3.2.0) - 2021-01-01

[code diff](https://github.com/Jelmerro/Vieb/compare/3.1.0...3.2.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/3.2.0)

### Added

- Searchwords setting to configure custom words that you can use as a prefix in explore mode to search websites directly
- New theme/colorscheme for having vertical tabs on the left of the screen instead of the regular tabbar

### Changed

- Keep a reference to the input field when using the external editor, will keep working when unfocused and with multiple editors

### Fixed

- Middle mouse pasting not working even when mouse is enabled
- Some sites not loading due to Electron bug related to COOP [electron/#25469](https://github.com/electron/electron/issues/25469)
- Searching for buffers with matching index not being suggested in the list
- Potential startup issues with some custom settings in the viebrc (including containercolors)

### Versions

- Electron 11.1.1 (was 11.0.3)
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

### Versions

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

### Deprecated

- Old tabs file format (3.x.x releases will migrate to the new format, 2.x.x releases will not read the 3.x.x format)
- Conversion from old format will be removed in future Vieb 4.x.x releases
- Supplying a "name" to an Erwic app, use a "container" field instead

### Removed

- Old line-based history format parser (1.x.x users should update to 2.x.x first, if they want to keep their history)
- Startup argument "--console" is removed in favor of "--debug", debug can do the same plus more and doesn't have mouse focus issues

### Fixed

- Typo in the "storenewvisits" setting (there will be no automatic migration from the name with a typo to the correct one)
- Pointer not updating the location when bringing back the GUI while in fullscreen
- Permission for media devices sometimes being detected as a microphone permission
- Mouse back/forward buttons being ignored when the mouse setting is enabled
- Shift being ignored when pressing named keys that can be pressed with and without Shift such as "Space"
- Border of split pages moving the page slightly when switching (border is now always there but in gray)
- Updating the adblocker files when Vieb is installed on a read-only file system
- Favicons being accepted even though the HTTP status code was an error (such as 404)
- Abort error for aborting page loads in the debug console (using --debug)
- Don't keep closed pages in memory while the 'keeprecentlyclosed' setting is off

### Versions

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

### Versions

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
- Don't expose the supported mimeTypes through the navigator
- Better protection for hiding the GPU model

### Fixed

- Window snapping on Windows
- Lack of typing ability for some text inputs after selecting them with follow mode
- Spaces not working as expected in mappings

### Versions

- Electron 9.2.0 (was 9.0.5)
- Chromium 83.0.4103.122 (was 83.0.4103.119)

## [2.2.3](https://github.com/Jelmerro/Vieb/compare/2.2.2...2.2.3) - 2020-07-05

[code diff](https://github.com/Jelmerro/Vieb/compare/2.2.2...2.2.3) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/2.2.3)

### Changed

- Refactor countable actions to be more consistent and reliable
- Order of page increase and decrease actions, it's now always: inpage relations > port > url page number > first number in the url

### Fixed

- Default download path not saving files to the home directory ("~" was not correctly expanded)
- Catch errors from the adblocker to prevent occasional error popups from cosmetic filtering
- Count not working for the increase and decrease page number actions (such as ports or page numbers)

### Versions

- Electron 9.0.5 (was 9.0.4)
- Chromium 83.0.4103.119 (was 83.0.4103.104)

## [2.2.2](https://github.com/Jelmerro/Vieb/compare/2.2.1...2.2.2) - 2020-06-21

[code diff](https://github.com/Jelmerro/Vieb/compare/2.2.1...2.2.2) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/2.2.2)

### Changed

- Improve the follow mode speed by reusing DOM calls and only using an interval (no more page observers)
- Disable the remote module entirely
- Load the preload from the main process and prevent changes to its location

### Fixed

- Width of the pinned tabs when playing media
- Regular tabs not always opening to the right of all the pinned tabs
- Potential filename length issue for favicon storage

### Versions

- Electron 9.0.4 (was 9.0.3)
- Chromium 83.0.4103.104 (was 83.0.4103.100)

## [2.2.1](https://github.com/Jelmerro/Vieb/compare/2.2.0...2.2.1) - 2020-06-11

[code diff](https://github.com/Jelmerro/Vieb/compare/2.2.0...2.2.1) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/2.2.1)

### Fixed

- Data urls not being displayed on the new tab page

### Versions

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
- Remove the usage of the remote module entirely
- Strict CSP to all of Vieb's pages, which prevents all scripts from running outside of the webviews and preloads

### Fixed

- Insert mode mappings not triggering built-in actions, such as Home or PageUp
- Not all named keys being correctly detected and converted to the right casing
- Digits to repeat actions not being applied when part of a mapping before a built-in action
- Animated SVG images sometimes breaking follow mode (due to href being an object instead of a string)

### Versions

- Electron 9.0.3 (was 9.0.0)
- Chromium 83.0.4103.100 (was 83.0.4103.64)

## [2.1.0](https://github.com/Jelmerro/Vieb/compare/2.0.0...2.1.0) - 2020-05-19

[code diff](https://github.com/Jelmerro/Vieb/compare/2.0.0...2.1.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/2.1.0)

### Added

- Conversion from and to percent-encoding for urls in the navbar, the url hover and in special pages
- Setting named requesttimeout, to stop a page from loading after a timeout (default is 20 seconds)

### Changed

- Search string now excludes special characters, instead of only keeping the word characters (this affects non-latin writing scripts)

### Fixed

- Urls not being wrapped in the media device permission request dialog

### Versions

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
- Spellcheck integration (on by default), use spell and spelllang to configure
- New permission for mediaDevices, new default is to ask the user instead of allowing all

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
- History storage format is now JSON, for easier parsing and better title storing
- Entries on the history page can now be removed without reloading all history again
- Buffer command can now be used to navigate to new locations (this is also true for the new split and Explore commands)
- Allow \<A-F4\> and \<M-Q\> to be mapped as if they are regular keys (most likely to the quit command)
- Reload command no longer resets all settings before running the commands from the viebrc files
- Browsing data of popup windows are now stored in a separate memory-only partitions
- Hide hardware related info, such as GPU model and battery data
- Strip Vieb and Electron from the useragent when downloading favicons

### Deprecated

- Old history storage format (TSV has been replaced with JSON), filename remains "hist"
- Conversion from old to new history format, will be removed in 3.0.0

### Removed

- Support for parsing the "viebrc.json" file, settings are now configured with Vieb commands in "viebrc" or "~/.viebrc"

### Fixed

- Broken page loads for sites using custom EventTargets instead of only DOM Nodes
- Text input actions, such as select all, not working on Mac
- Undo and Redo not being enabled on any system for the navigation bar

### Versions

- Electron 9.0.0-beta.15 (was 8.0.1)
- Chromium 83.0.4102.3 (was 80.0.3987.86)

## [1.1.0](https://github.com/Jelmerro/Vieb/compare/1.0.0...1.1.0) - 2020-02-15

[code diff](https://github.com/Jelmerro/Vieb/compare/1.0.0...1.1.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/1.1.0)

### Added

- Tests for isUrl function

### Changed

- Update to the http basic login system to work with the new Electron version
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

### Versions

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
- Permission for openExternal is now set to "ask" by default instead of the setting "block"

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

### Versions

- Electron 6.1.5 (was 6.0.10)
- Chromium 76.0.3809.146 (unchanged)

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
- Permissions changed to block access by default for most permissions

### Fixed

- Also make Control-BracketLeft reset the repeating digits counter to zero

### Versions

- Electron 6.0.10 (was 6.0.6)
- Chromium 76.0.3809.146 (was 76.0.3809.138)

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
- Increased the default notification duration from 5 to 6 seconds
- More vertical space between headers on the help page

### Fixed

- Location not displaying during load (and staying empty on failed page loads)
- Default settings sometimes displaying in black text on help page
- Buggy favicon on some sites after navigating on the same page

### Versions

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

### Versions

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
- Funding link to my personal ko-fi page: Jelmerro

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
- Strip Vieb and Electron info more reliably from the useragent (should now be similar to Chrome)
- Disable the sharing of local WebRTC ip addresses, only public ip addresses are now shared

### Fixed

- Scrolling to the top or bottom of the page on some pages not working
- Losing focus when switching between certain modes
- Same for possibly losing focus when a website enters fullscreen
- Periodically toggle mouse focus to fully load websites that wait for the mouse to move
- Actually save the recently closed tabs when that setting is on, but tabs.restore is off
- Missing or blurry icons on Windows and some Linux installers

### Versions

- Electron 5.0.6 (was 5.0.2)
- Chromium 73.0.3683.121 (unchanged)

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
- Arrow keys for switching suggestions to the Firefox and Chromium examples

### Changed

- Eslint configuration to more accurately represent the repository style guide
- Allow commands to start with a single ':', which will be ignored
- Allow multiple login popups, one for each opened tab
- Improve the url detection to more accurately follow the domain specification

### Fixed

- The zoom in and zoom out default keybindings in normal mode
- Startup arguments starting with a single dash being opened as a website
- Special pages not being detected on Windows
- Follow mode duplicate key options for a certain amount of links

### Versions

- Electron 5.0.2 (was 5.0.1)
- Chromium 73.0.3683.121 (unchanged)

## [0.2.2](https://github.com/Jelmerro/Vieb/compare/0.2.1...0.2.2) - 2019-05-09

[code diff](https://github.com/Jelmerro/Vieb/compare/0.2.1...0.2.2) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/0.2.2)

### Added

- New alternative shortcuts to go move in history for the current tab

### Fixed

- Preloads on special pages not working on some released builds
- Fix for unsupported 'visibility: collapse' styling

### Versions

- Electron 5.0.1 (was 5.0.0-beta.8)
- Chromium 73.0.3683.121 (was 73.0.3683.104)

## [0.2.1](https://github.com/Jelmerro/Vieb/compare/0.2.0...0.2.1) - 2019-04-07

[code diff](https://github.com/Jelmerro/Vieb/compare/0.2.0...0.2.1) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/0.2.1)

### Changed

- Use path module instead of url modifications for all paths
- Show no output when a search result has zero matches

### Fixed

- Proper focus when entering search mode

### Versions

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
- Improved electron-builder configuration (separate file with much better settings)
- Vieb is now a single window application (single-instance): when already open, new urls will be opened as tabs
- Disable follow mode for iframes again due to a couple of issues with it

### Versions

- Electron 5.0.0-beta.7 (was 4.0.5)
- Chromium 73.0.3683.94 (was 69.0.3497.106)

## [0.1.0](https://github.com/Jelmerro/Vieb/compare/d451d82e40a0842566fd99190faa52129dbdfc70...0.1.0) - 2019-02-17

[code diff](https://github.com/Jelmerro/Vieb/compare/d451d82e40a0842566fd99190faa52129dbdfc70...0.1.0) - [released builds](https://github.com/Jelmerro/Vieb/releases/tag/0.1.0)

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

### Versions

- Electron 4.0.5
- Chromium 69.0.3497.106
