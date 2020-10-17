![icon](app/img/icons/128x128.png)

### Vim bindings for the web by design

[![Website](https://img.shields.io/static/v1?label=website&message=vieb.dev&color=f5002e&style=flat-square)](https://vieb.dev)
[![Download counter](https://img.shields.io/github/downloads/Jelmerro/Vieb/total?style=flat-square)](https://github.com/Jelmerro/Vieb/releases)
[![Latest release](https://img.shields.io/github/v/release/Jelmerro/Vieb?sort=semver&style=flat-square)](https://github.com/Jelmerro/Vieb/releases/latest)
[![Electron version](https://img.shields.io/github/package-json/dependency-version/Jelmerro/Vieb/dev/electron?style=flat-square)](https://github.com/electron/electron)
[![License](https://img.shields.io/github/license/Jelmerro/Vieb?style=flat-square)](https://github.com/Jelmerro/Vieb/blob/master/LICENSE)
[![Donate](https://img.shields.io/static/v1?label=ko-fi&message=donate&color=red&logo=ko-fi&style=flat-square)](https://ko-fi.com/Jelmerro)
[![Reddit](https://img.shields.io/reddit/subreddit-subscribers/vieb?style=social)](https://reddit.com/r/vieb)

### Vieb is the Vim Inspired Electron Browser

## [Homepage](https://vieb.dev/) - [Download](https://vieb.dev/download) - [Changelog](CHANGELOG.md)

# Features

- __Free__, open source, fast and secure
- __Local first__ adblocking, auto-complete, AMP protection, custom redirects and more, all without web requests
- __Privacy__ with strict permission system, navigator overrides, firefox mode, custom WebRTC policy and more
- __Accessible__ with dark theme, full interface & fontsize scaling, page zooming and optional mouse support
- __Security settings__ with permissions, cache usage, cookie management, (auto-)download settings and more
- __Window splitting__ with split, Vexplore and Ctrl-w bindings, for multi-window browsing
- __Map commands__ for completely custom keyboard sequences, keystrokes, commands and actions
- __Viebrc__ config file for all custom/Vim/Vieb commands to configure settings permanently
- __Set command__ for runtime setting configuration exactly like Vim
- __Vim-compatible options__ such as: showcmd, timeout, mouse, maxmapdepth, spelllang, splitright, ignorecase etc.
- __History management__, container tabs, download management and remember previous session
- __Ad-blocker__ with optional updater and custom list support, default to: easylist and easyprivacy
- __Tabs__ including audio indicator, a toggle for multi-line tabs, pinned tabs and a configurable minimal tab width
- __Offline help documentation__ always available upon pressing __F1__
- __[And much, much more](https://vieb.dev/features)__

## Modes

- __Normal__: Plenty of movement and switch options, most of them available by pressing a single key
- __Command__: Access more complex functionality by entering commands with auto-completion
- __Explore__: Enter a search (orange), navigate to websites (cyan) or browse files (yellow) with auto-completion
- __Follow__: Simulate click events on urls, buttons, input fields and more
- __Search__: Enter a search string and easily jump to next and previous matches
- __Pointer__: Move a simulated cursor using the keyboard and execute clicks, hovers, image downloads and more
- __Visual__: Select (and optionally copy) any text on the page using familiar Vim bindings
- __Insert__: Regular interaction with the webpage, mostly used for typing text

Press `F1` at any time when using Vieb to find out more,
or check the full list of Vieb's capabilities on the [website](https://vieb.dev/features).

[![screenshot](https://vieb.dev/img/1.png)](https://vieb.dev/screenshots)

#### [More screenshots](https://vieb.dev/screenshots)

## Erwic

With the "erwic" startup option, you can "Easily Run Websites In Containers".
The purpose of this option is similar to programs such as Franz, Ferdi or Rambox.
It can also replace other Electron-based desktop apps such as Slack or Discord.
These instances of Vieb can run separately from your existing Vieb.
See [Erwic.md](Erwic.md) for usage and details.

# Download

You can download the latest stable release from the [official Vieb website](https://vieb.dev/download).
Alternatively, you can also view the previous releases [on Github](https://github.com/Jelmerro/Vieb/releases).
For Windows and Mac downloads you can simply double-click on the downloaded program.
If you are on Linux, you can download the AppImage to be able to do the same.
Make sure that you download the right architecture for your system,
if unsure, try the Vieb website for a nicer overview.
For most other download options, you need to use your distribution's package manager.

# Contribute

You can help by reporting issues and suggesting new features on the [Github issue tracker](https://github.com/Jelmerro/Vieb/issues).
Another way to help is by supporting Jelmerro on [ko-fi](https://ko-fi.com/Jelmerro).
Donating is completely optional because Vieb will always be free and open source.
If you know how to write Electron applications, you can also help by writing code.
Check the ['help wanted' issues](https://github.com/Jelmerro/Vieb/issues?q=is%3Aissue+is%3Aopen+label%3A"help+wanted") for suggestions on what to work on.
Please try to follow these guidelines while working on Vieb:

- Use Vim to edit :)
- Follow the included eslint style guide
- Use editorconfig for indentation

For an example vimrc that is configured to use these tools, you can check out my personal [vimrc](https://github.com/Jelmerro/vimrc).

# Building

To create your own builds or run Vieb from source, you need to install [Node.js](https://nodejs.org).
The next step is to clone the repository or download the source code.
After downloading, make sure you are in the cloned/extracted Vieb folder and run:

```bash
npm install
npm start
```

If this runs Vieb as expected, you can generate builds for your specific platform with:

```bash
npm ci
npm run build
```

To see the full list of run and build options, simply execute `npm run`.

# License

Vieb is created by [Jelmer van Arnhem](https://github.com/Jelmerro) and [contributors](https://github.com/Jelmerro/Vieb/graphs/contributors).
See the source files for individual authors.

You can copy or modify the code/program under the terms of the GPL3.0 or higher.
For more information and legal terms see the LICENSE file.
