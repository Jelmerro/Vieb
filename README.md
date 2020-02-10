Vieb
====

![icon](app/img/icons/128x128.png)

### Vim Inspired Electron Browser

### [github](https://github.com/Jelmerro/Vieb) - [releases](https://github.com/Jelmerro/Vieb/releases) - [changelog](CHANGELOG.md) - [donate](https://ko-fi.com/Jelmerro)

### Vim bindings for the web by design

![Download counter](https://img.shields.io/github/downloads/Jelmerro/Vieb/total?style=flat-square)
![Latest release](https://img.shields.io/github/v/release/Jelmerro/Vieb?sort=semver&style=flat-square)
![Electron version](https://img.shields.io/github/package-json/dependency-version/Jelmerro/Vieb/dev/electron?style=flat-square)
![Repo size](https://img.shields.io/github/repo-size/Jelmerro/Vieb?color=blue&style=flat-square)
![License](https://img.shields.io/github/license/Jelmerro/Vieb?style=flat-square)
[![Donate](https://img.shields.io/static/v1?label=ko-fi&message=donate&color=red&logo=ko-fi&style=flat-square)](https://ko-fi.com/Jelmerro)

# Features

- Browse the web with Vim-bindings
- Dark theme with custom font size for all UI elements
- Customisable by dozens of settings for permissions, cache, cookies, redirects and more
- History management, container tabs, download management and default to HTTPS
- Fast auto-completion for websites and commands
- Automatically block advertisements and trackers using easylist and easyprivacy
- Very detailed documentation/help always available upon pressing `F1`
- Custom keybindings can be configured for most actions and all commands
- No internet required for: suggestions, adblocker, file browsing and documentation

## Modes

- Normal mode: Plenty of movement and switch options, most of them available by pressing a single key
- Insert mode: Regular interaction with the webpage, only mode with mouse support, also used for typing text
- Command mode: Access more complex functionality by entering commands with auto-completion
- Search mode: Enter a search string and easily jump to next and previous matches
- Nav mode: Enter a search (orange), navigate to websites (cyan) or browse files (yellow) with auto-completion
- Follow mode: Simulate click events on urls, buttons, input fields and more
- Cursor mode: Move a simulated cursor using the keyboard and execute clicks, hovers, image downloads and more
- Visual mode: Select (and optionally copy) any text on the page using familiar Vim bindings

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

The `:set` command can be used to change the settings for the current session.
To change the keybindings or other settings across sessions,
the viebrc.json file should be created and/or changed.
You can create a viebrc using `:mkviebrc`, which stores the current settings.
The location of the viebrc file will be one of these, depending on your OS:

- Windows - `%APPDATA%\Vieb\viebrc.json`
- Mac - `~/Library/Application Support/Vieb/viebrc.json`
- Linux - `~/.config/Vieb/viebrc.json`

This folder is used for all Vieb data.

There are viebrc example files to make Vieb behave more like
[Chromium](examples/chromium.json) and [Firefox](examples/firefox.json).
These examples could be used as the starting point for your own config.
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
