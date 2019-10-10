Vieb
====

![icon](app/img/icons/128x128.png)

### Vim Inspired Electron Browser

### [github](https://github.com/Jelmerro/Vieb) - [releases](https://github.com/Jelmerro/Vieb/releases) - [changelog](CHANGELOG.md) - [donate](https://ko-fi.com/Jelmerro)

### Vim bindings for the web by design

# Features

- Browse the web with Vim-bindings
- Dark theme with custom font size for all UI elements
- Customisable by dozens of settings for permissions, cache, cookies, redirects and more
- History management, container tabs, download management and default to HTTPS
- Offline auto-completion for websites and commands
- Automatically block advertisements and trackers using easylist and easyprivacy
- Very detailed offline documentation/help always available upon pressing `F1`
- Custom keybindings can be configured for most actions

## Modes

- Normal mode: Plenty of movement and switch options, most of them available by pressing a single key
- Insert mode: Regular interaction with the webpage, only mode with mouse support, also used for typing text
- Command mode: Access more complex functionality by entering commands with auto-completion
- Search mode: Enter a search string and easily jump to next and previous matches
- Nav mode: Enter a url (blue border) or a search request (orange border) with auto-completion from history
- Follow mode: Simulate click events on urls, buttons, input fields and more
- Cursor mode: Move a simulated cursor using the keyboard and execute clicks, hovers, image downloads and more
- Visual mode: Select any text on the page using familiar Vim bindings

Press `F1` at any time when using Vieb to find out more.

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
