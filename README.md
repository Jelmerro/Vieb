![icon](app/img/icons/128x128.png)

### Vim bindings for the web by design

[![Website](https://img.shields.io/static/v1?label=website&message=vieb.dev&color=f5002e&style=flat-square)](https://vieb.dev)
[![Download counter](https://img.shields.io/github/downloads/Jelmerro/Vieb/total?style=flat-square)](https://github.com/Jelmerro/Vieb/releases)
[![Latest release](https://img.shields.io/github/v/release/Jelmerro/Vieb?sort=semver&style=flat-square)](https://github.com/Jelmerro/Vieb/releases/latest)
[![License](https://img.shields.io/badge/license-GPL--3.0_or_later-orange?style=flat-square)](https://github.com/Jelmerro/Vieb/blob/master/LICENSE)
[![Support](https://img.shields.io/static/v1?label=github&message=sponsors&color=ea4aaa&logo=github-sponsors&style=flat-square)](https://github.com/sponsors/Jelmerro)
[![Donate](https://img.shields.io/static/v1?label=ko-fi&message=donate&color=red&logo=ko-fi&style=flat-square)](https://ko-fi.com/Jelmerro)

[![Matrix](https://img.shields.io/static/v1?label=matrix&message=space&color=eeeeee&logo=matrix&style=flat-square)](https://matrix.to/#/#vieb:matrix.org)
[![Matrix](https://img.shields.io/static/v1?label=matrix&message=announcements&color=eeeeee&logo=matrix&style=flat-square)](https://matrix.to/#/#vieb-announcements:matrix.org)
[![Matrix](https://img.shields.io/static/v1?label=matrix&message=general&color=eeeeee&logo=matrix&style=flat-square)](https://matrix.to/#/#vieb-general:matrix.org)

[![Reddit](https://img.shields.io/reddit/subreddit-subscribers/vieb?style=social)](https://reddit.com/r/vieb)
[![Telegram](https://img.shields.io/static/v1?label=telegram&message=announcements&color=26A5E4&logo=telegram&style=flat-square)](https://t.me/vieb_announcements)
[![Telegram](https://img.shields.io/static/v1?label=telegram&message=general&color=26A5E4&logo=telegram&style=flat-square)](https://t.me/vieb_general)

### Vieb is the Vim Inspired Electron Browser

## [Homepage](https://vieb.dev/) - [Download](https://vieb.dev/download) - [Changelog](CHANGELOG.md) - [FAQ](FAQ.md)

*Vieb is pronounced like "deep" with a "v" and rhymes with sheep*

# Features

- __Free__, open source, fast and secure
- __Local first__ adblocking, auto-complete, AMP protection, custom redirects and more, all without web requests
- __Privacy__ with strict permission system, navigator overrides, custom useragent, custom WebRTC policy and more
- __Accessible__ with custom themes, full interface & fontsize scaling, page zooming, spellcheck and mouse support
- __Security settings__ with permissions, cache usage, cookie management, (auto-)download settings and more
- __Window splitting__ with buffer, split, Vexplore and Ctrl-w bindings, for multi-window browsing
- __Map commands__ for completely custom keyboard sequences, keystrokes, commands and actions
- __Viebrc__ config file for all custom/Vim/Vieb commands to configure settings permanently
- __Set command__ for runtime setting configuration exactly like Vim
- __Vim-compatible options__: showcmd, timeout, colorscheme, maxmapdepth, spelllang, splitright, smartcase etc.
- __Container tabs__ with colored grouping, auto-clearing, individual cookies and tab restore from containers
- __Ad-blocker__ with cosmetic filtering, optional updater, custom lists and uses easylist/ublock lists by default
- __Tabs__ including audio indicator, a toggle for multi-line tabs, pinned tabs, muted tabs and suspended tabs
- __Offline help documentation__ always available upon pressing __F1__
- __[And much, much more](https://vieb.dev/features)__

[![screenshot](https://vieb.dev/img/1.png)](https://vieb.dev/screenshots)

#### [More screenshots](https://vieb.dev/screenshots)

## Erwic

With the "erwic" startup option, you can "Easily Run Websites In Containers".
The purpose of this option is similar to programs such as Franz, Ferdi or Rambox.
It can also replace other Electron-based desktop apps such as Slack or Discord.
These instances of Vieb can run separately from your existing Vieb.
See [Erwic.md](Erwic.md) for usage and details.

# Download

There are many ways to download and install Vieb.
Besides running from source or making your own builds,
these are the main sources to download Vieb.
For startup help, see the [frequently asked questions](FAQ.md).

### [Vieb.dev](https://vieb.dev/download)

The official Vieb website, where you can download the latest stable release for many platforms.

### [Github](https://github.com/Jelmerro/Vieb/releases)

The same releases that are offered on [vieb.dev](https://vieb.dev/download),
but with release notes and previous versions listed.

### Fedora

I host a custom DNF repository that you can use for Vieb instead of downloading from [vieb.dev](https://vieb.dev/download) or Github.

```bash
sudo dnf config-manager --add-repo https://jelmerro.nl/fedora/jelmerro.repo
sudo dnf install vieb
```

### Third-party

These releases are made by users just like you for their favorite system.
Third-party releases might be outdated (in red) or customized compared to official builds,
but they are probably the simplest way to get started if your system is listed.

[![Third-party releases table](https://repology.org/badge/vertical-allrepos/vieb.svg?minversion=9.7.0&exclude_unsupported=1)](https://repology.org/project/vieb/versions)

# Cheatsheet

Quickly get an overview of the default mappings and basic usage.

[![cheatsheet](app/img/cheatsheet.png)](https://vieb.dev/cheatsheet)

# Contribute

You can help by reporting issues and suggesting new features on the [Github issue tracker](https://github.com/Jelmerro/Vieb/issues).
Another way to help is by supporting Jelmerro on [ko-fi](https://ko-fi.com/Jelmerro) or [github](https://github.com/sponsors/Jelmerro).
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
npm ci
npm start
```

If this runs Vieb as expected, you can generate builds for your platform with `node build`.
To see the full list of run and build options, simply execute `node build --help`.
The base configuration for what to build is stored in the `electron-builder.yml` config file,
in combination with the `build.js` script and the `webpack.config.js`.
The `build.js` script is the starting point for creating custom builds,
you can easily extend the `releases` object in this script with new configurations.

# License

Vieb is created by [Jelmer van Arnhem](https://github.com/Jelmerro) and [contributors](https://github.com/Jelmerro/Vieb/graphs/contributors).
See the source files for individual authors.

You can copy or modify the code/program under the terms of the GPL3.0 or later versions.
For more information and legal terms, see the LICENSE file.
