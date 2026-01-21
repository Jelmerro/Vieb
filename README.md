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
[![Telegram](https://img.shields.io/static/v1?label=telegram&message=announcements&color=26A5E4&logo=telegram&style=flat-square)](https://t.me/vieb_announcements)
[![Telegram](https://img.shields.io/static/v1?label=telegram&message=general&color=26A5E4&logo=telegram&style=flat-square)](https://t.me/vieb_general)

### Vieb is the Vim Inspired Electron Browser

## [Homepage](https://vieb.dev/) - [Download](https://vieb.dev/download) - [Changelog](CHANGELOG.md) - [FAQ](FAQ.md)

*Vieb is pronounced like "deep" with a "v" and rhymes with sheep*

[![screenshot](https://vieb.dev/img/1.png)](https://vieb.dev/screenshots)

#### Please see [vieb.dev](https://vieb.dev) for [features](https://vieb.dev/features), more [screenshots](https://vieb.dev/screenshots) and the [cheatsheet](https://vieb.dev/cheatsheet)

## Install

These are the main sources to download Vieb.
For startup help, see the [frequently asked questions](FAQ.md).

### [Vieb.dev](https://vieb.dev/download)

The official Vieb website, where you can download the latest stable release for many platforms.

### [Github](https://github.com/Jelmerro/Vieb/releases)

The same releases that are offered on [vieb.dev](https://vieb.dev/download),
but with release notes and previous versions listed.

### [Fedora](https://jelmerro.nl/fedora)

I host a custom Fedora repository that you can use for automatic updates.

```bash
sudo dnf config-manager addrepo --from-repofile=https://jelmerro.nl/fedora/jelmerro.repo
sudo dnf install vieb
```

### Erwic

With the "erwic" startup option, you can "Easily Run Websites In Containers".
The purpose of this option is similar to programs such as Franz, Ferdi or Rambox.
It can also replace other Electron-based desktop apps such as Slack or Discord.
These instances of Vieb can run separately from your existing Vieb.
See [Erwic.md](Erwic.md) for usage and details.

## Contribute

You can support my work on [ko-fi](https://ko-fi.com/Jelmerro) or [Github sponsors](https://github.com/sponsors/Jelmerro).
Another way to help is to report issues or suggest new features.
Please try to follow the linter styling when developing, see `npm run lint`.
For an example vimrc that can auto-format based on the included linters,
you can check out my personal [vimrc](https://github.com/Jelmerro/vimrc).

## Building

To create your own builds or run from source, you need to install [Node.js](https://nodejs.org).
Please clone or download this repo and run `npm ci` then `npm start`.
If you want to use a local datafolder to run Vieb, use `npm run dev`.
You can make your own executable builds using `node build`.
See `node build --help` for other options, the builds will be stored in `dist`.
If you plan to contribute, please follow the included linter, see `npm run lint`.
