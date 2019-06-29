Vieb
====

![icon](app/img/icons/128x128.png)

Vim Inspired Electron Browser - [github](https://github.com/Jelmerro/Vieb)

Vim bindings for the web by design

# Features

- Browse the web with Vim-bindings
- Switch between insert, command, normal mode and more
- Dark theme with custom font size for all UI elements
- Change many other settings, such as history management or download behaviour
- Default to https (and optionally configure Vieb to redirect when https is unavailable)
- Very detailed offline documentation/help always available upon pressing `F1`
- Custom keybindings for most actions
- The paragraphs below will highlight the features separated by mode

## Normal mode

Vieb has a lot of options when in normal mode including, but not limited to:

- Move the page left, down, up and right with `hjkl` respectively
- Navigate to a url with Nav mode, see dedicated paragraph for details
- Go to the top or bottom of the page with `g` and `G`
- Zoom in or out with `ctrl+-` and `ctrl++`, reset the zoom level with `ctrl+0`
- Switch to insert mode with `i`, to interact with the website like usual
- Go back and forward in history for the current tab with `H` and `L`
- Enter command mode with `:`, see dedicated paragraph for details
- Open a new tab with `t` and close the current one with `d`
- Restore a previously closed tab with the `u` key
- Go to the next and previous open tab with `w` and `b` or with `J` and `K`
- Enter search mode with `/`, see dedicated paragraph for details
- Reload the page with `r` and reload without cache using `R`
- Follow links using the keyboard with `f` or `F`, see follow mode for details
- Cursor and visual modes for most mouse cursor actions and selections

By default, both `Escape` and `ctrl+[` will always go back to normal mode,
even when insert mode is active, but this can be changed with custom keybindings.
All modes come with a default binding to `F1` to open the help page,
but this can also be disabled or changed with custom keybindings.
The help page itself contains useful information for all users,
and should be your primary reference for configuring Vieb.

## Insert mode

Insert mode in Vieb is used to allow regular interaction with the website.
When insert mode is active, all keyboard and mouse inputs are sent to the website.
It is the only mode which supports mouse interaction.
Some websites could conflict with the default `Escape` binding to go back to normal mode,
but this can be changed as described in the help page of Vieb (press `F1` in Vieb to go there).

## Command mode

Vieb supports the following commands:

- `:q` or `:quit` will quit Vieb, and is the recommended way to do so
- `:dev` or `:devtools` open the devtools for the current website in a new window
- `:r` or `:reload` will reload the settings from the viebrc.json file
- `:v` or `:version` to display all version and release information
- `:h` or `:help` to display the help documentation,
  a single optional argument can be given to go to a specific section, such as `:help basics`
- `:d` or `:downloads` to view a list of all the downloaded files
- `:history` command will open a webpage with all the visited websites listed
- `:accept` or `:confirm` can be used to start a requested download for the confirm download mode
- `:reject` or `:deny` to reject the latest download request for the confirm download method
- `:set` will change a setting for as long as Vieb is opened

By default, a dropdown menu will open with autocomplete suggestions.
For the set command, all settings can be autocompleted,
including the default option for any given setting.
With the default keybindings, `Tab` and `Shift+Tab` are used to choose a suggestion,
and the `Enter` key is used to select and execute a suggestion.
Suggestions can be disabled with the setting: `"suggestCommands": false`.

## Search mode

To search for a string on the website, press `/` and type the search string.
Vieb will return to normal mode after you press `Enter`.
Now the `n` and `N` keys can be used to search forward and backwards.
By default, all searches are case sensitive.
To change this for the current Vieb session only,
use the following command: `set caseSensitiveSearch false`.
To change this permanently, add `"caseSensitiveSearch": false` to the settings file.
The current search result can be clicked on when in normal mode with `Enter`,
which can be used for quick navigation based on the search results.

## Nav mode

This mode is exclusive to Vieb and is not present in Vim.
In this mode, the user can enter a url or a search request to navigate to.
To enter nav mode, press `e` or open a new tab with `t`.
When in this mode, the navigation bar will change color depending on the entered data.
Cyan means the entered data will directly requested as a website (or a local file using `file://`).
When the navigation bar turns orange, the entered data will be directed to the configured search engine.
The navigation bar also autocompletes from your browsing history,
which can be disabled with the setting: `"history.suggest": false`.
The navigation bar will turn green when a suggestion is selected.
The search engine and history settings can be changed in the viebrc.json file,
see the Vieb help page for details (using the `F1` key or the `:help settings` command).

## Follow mode

This mode is essential for browsing the web using the keyboard.
When entering this mode, all clickable elements, such as buttons or links,
will be outlined and marked with a key next to it.
Upon pressing the key, Vieb will click the element with JavaScript to activate it.
When there are a lot of elements on the page, it might be needed to press two keys.
To follow a link in the current tab, press `f` when in normal mode.
Regular anchor tag links can also be opened in a new tab with `F`.
The selectors are divided in the following colors:

- Blue for regular links, these will be opened normally or in a new tab with `F`
- Green for text-like input fields, choosing any of these will go to insert mode with the field focused
- Red for clickable buttons and boxes, these will be clicked automatically without entering insert mode
- Orange for JavaScript event handlers, these will be clicked to trigger the event

You can modify the font size for all Vieb UI elements using the "fontSize" setting.
To increase the font size to 20 for the current session: `set fontSize 20`.
To make this permanent, edit the viebrc.json configuration file.

## Cursor and visual mode

After pressing `c`, `s` or `v` from normal mode, cursor mode will become active.
In this mode, most regular vim movement options are available,
but some of them are modified to make more sense in a browser context.
For the full list, see the [default settings](app/default-settings.json) or the help page.
Cursor mode can be used to download images, copy or preview urls,
but also to hover the mouse cursor, enter insert mode at a specific location or to enter visual mode.

After pressing `v` again, visual mode will be entered.
When in this mode the cursor can still be moved,
but text will be selected between the old and current position.
You can copy the selection and return to normal mode with `y` or `c`.

# Starting Vieb

To get started with Vieb, download a stable release from the
[github release page](https://github.com/Jelmerro/Vieb/releases).
These releases require no additional software and can be downloaded for a specific platform.

Alternatively you can download/clone the repo and use Vieb like this:

```bash
git clone https://github.com/Jelmerro/Vieb.git
cd Vieb
npm install
npm start
```

Vieb can be started without any required arguments,
but it does support them when needed.
Use the `--help` argument for more information.
When starting Vieb with npm, it's required to enter the arguments like this:

`npm start -- --help`

A possible use case for these arguments would be to open urls on startup,
although this can also be configured in the settings.
The setting name is "tabs.startup", which is an array of urls that will open on every startup.

# Configuring Vieb

To change the keybindings or any other setting of Vieb,
the viebrc.json file should be created and/or changed.
The file should be created in the AppData or .config folder of Vieb:

- Windows - `%APPDATA%\Vieb\viebrc.json`
- Mac - `~/Library/Application Support/Vieb/viebrc.json`
- Linux - `~/.config/Vieb/viebrc.json`

There should be chromium/electron related files in this directory,
if Vieb was started at least once.
It is also the location of the download and browsing history,
but these can be disabled separately in the settings.

Settings can be changed at runtime for the current session using the `:set` command.

Please see the [Default settings](app/default-settings.json) for all options,
the syntax of the viebrc.json is identical to these defaults.
Settings can be changed at runtime with the `:set` command.

There are examples to make Vieb behave more like
[Chromium](examples/chromium.json) and [Firefox](examples/firefox.json).
These examples can be used as the starting point for your own config.
Feel free to change these to your liking, or even make a pull request to improve them.

For more details about settings, usage or anything else,
read the built-in offline documentation using `:help`, `:help settings` or the `F1` key.

# Improving Vieb

Feel free to report issues for feature requests, bugs or any other changes.
If you are interested in contributing code,
make sure to follow these guidelines when working on it:

- Use Vim to edit :)
- Follow the included eslint style guide (using [ALE](https://github.com/w0rp/ale) or similar)
- Use editorconfig (there is a [Vim plugin available](https://github.com/editorconfig/editorconfig-vim))

If you are looking for anything specific to improve,
check the [unassigned issues](https://github.com/Jelmerro/Vieb/issues?q=is%3Aissue+is%3Aopen+no%3Aassignee) or [nice to haves](https://github.com/Jelmerro/Vieb/milestone/2).

# LICENSE

## Program/source

Vieb is created by [Jelmer van Arnhem](https://github.com/Jelmerro) and [contributors](https://github.com/Jelmerro/Vieb/graphs/contributors).
See the source files for individual authors.

You can copy or modify the code/program under the terms of the GPL3.0 or higher.
For more information and legal terms see the LICENSE file.

## Logo

Logo is created by [Jelmer van Arnhem](https://github.com/Jelmerro) and can also be copied/modified as described in the LICENSE file.
It is clearly based on the original Vim logo,
which can be found as an svg file [on Wikipedia](https://en.wikipedia.org/wiki/File:Vimlogo.svg).
As is explained on [the official Vim website](https://www.vim.org/logos.php) the logo consists of a green diamond with the text Vim displayed above it.
The Vieb logo (while based on the Vim logo) contains neither the green diamond nor the Vim text,
and is therefor considered to be sufficiently different from the original Vim logo.
