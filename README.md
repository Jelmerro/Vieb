Vieb
====

![icon](build/icons/128x128.png)

Vim Inspired Electron Browser - [github](https://github.com/Jelmerro/Vieb)

Vim bindings for the web by design

# Features

- Browse the web with Vim-bindings
- Switch between insert, command, normal mode and more
- Dark theme
- Default to https
- Very detailed offline documentation/help always available upon pressing `F1`
- Custom keybindings and other settings, see "Configuring Vieb" for details
- The paragraphs below will highlight the features separated by mode

## Normal mode

- Move the page left, down, up and right with `hjkl` respectively
- Navigate to a url with Nav mode, see dedicated paragraph for details
- Go to the top or bottom of the page with `g` and `G`
- Zoom in or out with `ctrl+-` and `ctrl++`, reset the zoom level with `ctrl+0`
- Switch to insert mode with `i`, to interact with the website like usual
- Go back and forward in history for the current tab with `H` and `L`
- Enter command mode with `:`, see dedicated paragraph for details
- Open a new tab with `t` and close the current one with `d`
- Go to the next and previous open tab with `w` and `b` or with `J` and `K`
- Enter search mode with `/`, see dedicated paragraph for details
- Reload the page with `r` and reload without cache using `R`
- Follow links using the keyboard with `f` or `F`, see follow mode for details

By default, both `Escape` and `ctrl+[` will always go back to normal mode,
even when insert mode is active, but this can be changed with custom keybindings.
All modes come with a default binding to `F1` to open the help page,
this is mostly for new users and can also be disabled or changed with custom keybindings.

## Insert mode

Insert mode in Vieb is used to allow regular interaction with the website.
When insert mode is active, all keyboard and mouse inputs are sent to the website.
It is the only mode which supports mouse interaction.
Some websites could conflict with the default `Escape` binding to go back to normal mode,
but this can be changed as described below in "Configuring Vieb".

## Command mode

Vieb supports the following commands:

- `:q` or `:quit` will quit Vieb, and is the recommended way to do so
- `:dev` or `:devtools` open the devtools for the current website in a new window
- `:r` or `:reload` will reload the settings from the viebrc.json file
- `:v` or `:version` to display all version and release information
- `:h` or `:help` to display the help documentation,
  a single optional argument can be given to go to a specific section, such as `:help basics`
- `:set` will change a setting for as long as Vieb is opened

## Search mode

To search for a string on the website, press `/` and type the search string.
Vieb will return to normal mode after you press `Enter`.
Now the `n` and `N` keys can be used to search forward and backwards.
By default, all searches are case sensitive.
To change this for the current Vieb session only,
use the following command: `set caseSensitiveSearch false`.
To change this permanently, add `"caseSensitiveSearch": false` to the settings file,
see the chapter "Configuring Vieb" for details.

## Nav mode

This mode is exclusive to Vieb and is not present in Vim.
In this mode, the user can enter a url or a search request to navigate to.
To enter search mode, press `e` or open a new tab with `t`.
When in this mode, the navigation bar will change color depending on the entered data.
Cyan means the entered data will directly requested as a website (or a local file using `file://`).
When the navigation bar turns orange, the entered data will be directed to the configured search engine.
The search engine can be changed in the viebrc.json file,
see the chapter "Configuring Vieb" for details.

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

# Starting Vieb

There are two ways to get started with Vieb,
both will be explained below.

## Releases

Stable releases can be found on the [github release page](https://github.com/Jelmerro/Vieb/releases).
These releases require no special setup and can be downloaded for a specific platform.

## From source

The other option is to download/clone the repository and use npm, for example:

```bash
git clone https://github.com/Jelmerro/Vieb.git
cd Vieb
npm install
npm start
```

## Startup

Vieb can be started without any required arguments,
but it does support them when needed.
Running Vieb with `--help` should show the following output:

```
Vieb: Vim Inspired Electron Browser

Usage: Vieb [options] <URLs>

Options:
 --help     Show this help and exit
 --version  Display license and version information and exit
 --debug    Start Vieb with the developer console open
 --console  Same as --debug

All arguments not starting with -- will be opened as a url
```

When starting Vieb with npm, it's required to enter the arguments like this:

`npm start -- --help`

It should be noted that the developer console is not the one linked to any websites,
but is the internal console of the Vieb application.
Opening the developer tools for the current website can be done with the `:dev` command.

# Configuring Vieb

To change the keybindings or any other setting of Vieb,
the viebrc.json file should be created and/or changed.
The file should be created in the AppData or .config folder of Vieb,
on linux this results in `/home/user/.config/Vieb/viebrc.json`.

There should be chromium/electron related files in this directory,
if Vieb was started at least once.

An example viebrc.json that changes most settings could look like this:

```json
{
    "keybindings": {
        "insert": {
            "F1": "",
            "Escape": ""
        },
        "normal": {
            "C-KeyQ": "COMMAND.quit"
        }
    },
    "redirectToHttp": true,
    "search": "https://google.com/search?q=",
    "caseSensitiveSearch": false,
    "notification": {
        "duration": 3000,
        "position": "bottom-left"
    }
}
```

This example results in the following changes:

- The help page can't be accessed directly from insert mode with the `F1` key anymore
- `Escape` can not be used to exit insert mode, but `Ctrl with [` will still work
- `Ctrl with q` can be used to quit Vieb when in normal mode
- Https connections will now be downgraded to http if the server has no certificate
- The search engine will be google instead of the default duckduckgo
- Change the search mode to be case-insensitive
- Reduce the notification duration to 3 seconds instead of 5
- Display the notification in the bottom left instead of the bottom right

The settings file is loaded on startup,
and can be reloaded at anytime with the `:r` or `:reload` command.
All settings in this file are optional and will override the default setting.
Alternatively, settings can be changed for the current session with the `:set` command.
For example, to use system notifications for as long as Vieb is running,
open command mode with `:` and enter this command:

`set notification.system true`

Vieb's set command syntax is different as compared to regular Vim,
and always has the form of `set <setting> <value>`.
The settings file is case sensitive, but the setting argument of the set command isn't.
The keybindings can only be changed with the settings file and not with the set command.
Running the `:reload` command will reset any prior `:set` commands,
because all settings will be reset and reapplied from the settings file.

Please see the [Default settings](app/default-settings.json) for all options,
the syntax of the viebrc.json is identical to these defaults.
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
