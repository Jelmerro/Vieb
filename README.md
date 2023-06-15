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

# Download

These are the main sources to download Vieb.
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

[![Third-party releases table](https://repology.org/badge/vertical-allrepos/vieb.svg?minversion=10.0.0&exclude_unsupported=1)](https://repology.org/project/vieb/versions)

### Erwic

With the "erwic" startup option, you can "Easily Run Websites In Containers".
The purpose of this option is similar to programs such as Franz, Ferdi or Rambox.
It can also replace other Electron-based desktop apps such as Slack or Discord.
These instances of Vieb can run separately from your existing Vieb.
See [Erwic.md](Erwic.md) for usage and details.

# Contribute

You can support my work on [ko-fi](https://ko-fi.com/Jelmerro) or [Github sponsors](https://github.com/sponsors/Jelmerro).
Donating is completely optional because Vieb will always be free and open source.
Another way to help is to report issues or suggest new features,
either via [Github discussions](https://github.com/Jelmerro/Vieb/discussions) or [Github issues](https://github.com/Jelmerro/Vieb/issues).
If you know how to write Electron applications, you can also help by writing code.
Check the ['help wanted' issues](https://github.com/Jelmerro/Vieb/issues?q=is%3Aissue+is%3Aopen+label%3A"help+wanted") for suggestions on what to work on.
Please try to follow the linter styling when developing, see `npm run lint`.
For an example vimrc that can auto-format based on the included linters,
you can check out my personal [vimrc](https://github.com/Jelmerro/vimrc).

# Building

To create your own builds or run Vieb from source, you need to install [Node.js](https://nodejs.org).
The next step is to clone the repository or download the source code,
which can be done with the green "Code" button at the top of the page.
After downloading, make sure you are in the cloned/extracted Vieb folder,
then run `npm ci` to install the dependencies, you only need to do so once.
You can now run Vieb from this folder from source with `npm start`.
If you want to use a local datafolder to run Vieb, use `npm run dev`.
You can do `git pull` and then another `npm ci` to update if you cloned the repo,
or you can repeat these steps in a new folder if you downloaded a zip.
Finally, you can generate builds for your platform with `node build`,
or execute `node build --help` to see the full list of options.

# License

Vieb is created by [Jelmer van Arnhem](https://github.com/Jelmerro) and [contributors](https://github.com/Jelmerro/Vieb/graphs/contributors).
See the source files for individual authors.

You can copy or modify the code/program under the terms of the GPL3.0 or later versions.
For more information and legal terms, see the LICENSE file.
