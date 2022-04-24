Frequently Asked Questions
==========================

This document contains a list of frequently asked questions.
If your question is not listed, you can find support here:

- [Reddit](https://reddit.com/r/vieb) - r/vieb is the official subreddit
- [Matrix](https://matrix.to/#/#vieb:matrix.org) - #vieb is hosted on matrix.org
- [Telegram](https://t.me/vieb_general) - Chat with other users on Telegram
- Or make a Github issue if you aren't using any of the above

## Startup

#### Which release should I download?

On Windows you would download releases ending in `.exe` or `win.zip`.
On Linux you download either the AppImage or your distribution's native format (e.g. deb for Debian/Ubuntu and so on).
For Mac, there are two zipped Apps, one for x64 and one for ARM64.
Vieb releases are offered in two different architectures:

- ARM64, for Silicon macs, Raspberry Pi's, micro-computers etc. (suffixed aarch64 for rpm and pacman builds)
- x64, for pretty much all other regular devices (also suffixed with amd64, x86_64 or no suffix at all)

It's important to make sure that you download the right architecture for your system.

#### How do I start Vieb?

If it's a zip/tar.gz archive that you downloaded, you can extract it and double-click the executable.
On Windows, you can simply double-click on the ".exe" file to run the program.
If you are using Linux, you can download the AppImage to be able to do the same.
For most other download options, you need to use your distribution's package manager,
usage should be similar to other packages of the same type.

##### Mac

The mac apps are not signed, you can sign them yourself with `sudo codesign --force --deep --sign - /Applications/Vieb.app`.
Or you can try [these instructions](https://support.apple.com/guide/mac-help/open-a-mac-app-from-an-unidentified-developer-mh40616/mac) for opening the app as is,
which comes down to disabling app store requirements with `sudo spctl --master-disable`.
If you use a Silicon device, signing the app with the first command is required, as explained [here](https://developer.apple.com/documentation/macos-release-notes/macos-big-sur-11_0_1-universal-apps-release-notes#Code-Signing).
If none of these work, you can build the app from source with the [README build instructions](./README.md#building), the final command can also be `npm run buildmac` to just build for mac.
If these instructions do not seem to be followed at all, your issue might be [closed](https://github.com/Jelmerro/Vieb/issues/169),
as it's not Vieb's responsibility to fix your operating system quirks for you.

#### Why can't I start Vieb?

Try starting Vieb from a terminal or cmd window, to check for startup errors or other logging.
You can start Vieb with "vieb --debug" to view the internal debugging tools of Vieb, which should also be checked for errors.
If using mac, see the startup info above this one.
If you get a weird sandbox error on Linux, you probably need to enable unprivileged containers.
There are instructions [on the arch wiki](https://wiki.archlinux.org/index.php/Linux_Containers#Enable_support_to_run_unprivileged_containers_(optional)) how to enable this.

## Usage

Most general usage information can be found in the help page.
You can open it with the `F1` key or the `:help` command.
Below are questions that are either not explicitly covered in the help page,
or are asked a lot regardless of their existing documentation/explanation.

#### How does it compare to other plugins and browsers?

Vieb is Chromium/Electron based and implements a wide range of features aimed to FEEL like Vim.
For a list of features, see the [homepage](https://vieb.dev/features).
See [this issue for my motivation](https://github.com/Jelmerro/Vieb/issues/83) of starting Vieb.
Proper comparisons and migration guides haven't been made yet,
but there are [example viebrc files](https://github.com/Jelmerro/Vieb/tree/master/app/examples) for popular desktop browsers and Vim browser extensions.
If you already have Vieb, you can view and save the examples to disk from the offline help page: `:h examples`.

#### The page doesn't scroll with hjkl, should I report a bug?

The answer is probably no.
This is because strictly speaking some pages aren't actually scrollable at all,
even though they have a scrollbar on the right side.
There is usually a part of that page that can be scrolled, but not the page itself.
If that scrollable section is large enough, it's fairly easy to confuse the two.
If the page isn't scrollable, Vieb will not be able to scroll it using the global scroll options,
but you will have to use pointer mode to execute a scroll action at a specific position.
This is because the global scroll actions wouldn't know which of the scrollable sections to scroll,
and the page itself isn't actually scrollable, so you have to be explicit about it using the pointer.
You can even map the pointer scroll actions to normal mode if you want to,
but you will still execute the scrolling at the pointer position.
This distinction and other differences between the two types of scrolling are explained in `:h scrolling`.

#### Why can't I sign in to Google?

Google blocks a lot of software that isn't Chrome from accessing their services.
Just a simple [DDG search](https://duckduckgo.com/?q=browser+or+app+may+not+be+secure) reveals that most programs experience this.
Google owns your data and they are the ones to decide who may view it and when, for now they chose to only allow Chrome and Firefox.
Below is a list of known workarounds to circumvent this blocking policy, use them at your own risk.

- You can use `:set firefoxmode=google` within Vieb to mimic Firefox when visiting Google pages.
- You can temporarily allow `""Less secure app access""` in your [Google account dashboard](https://myaccount.google.com/security).

There are no other known workarounds to allow the sign-in at this point of time.
You are encouraged to open PRs to improve this list of workarounds.
However, opening issues just to announce that you cannot login to your account will be closed,
as it's not something Vieb or any other browser can fix, only Google can.

#### I want my tabs to be numbered, how do I do this?

You can achieve this by using custom colorschemes.
You can find help on this inside Vieb, with: `:help datafolder` and `:help :colorscheme`.
Inside the datafolder, create a "colors" folder, and inside it create a CSS file "name.css".
The "name" will be the name of the colorscheme, and you can set it with ":colorscheme name".
The contents of the file should look like this:

```css
#tabs, #navbar {counter-reset: tab-counter -1;}
#tabs > ::before {counter-increment: tab-counter 1;content: counter(tab-counter) ". ";margin: auto 0;}
#tabs .pinned {min-width: 3em !important;}
```

Colorschemes can do much more, there are a couple of them included by default,
for which you can find the source code [here](https://github.com/Jelmerro/Vieb/tree/master/app/colors).
You can also look for more themes or share yours on [Github discussions](https://github.com/Jelmerro/Vieb/discussions).
Finally, you can also copy the tab number CSS code above and use it together with other themes.

#### Can I make Vieb my default browser?

Yes, there is a command for that named `:makedefault`.
For details, see the help page using `:h makedefault` and the
[defaultapp script directory](https://github.com/Jelmerro/Vieb/tree/master/app/defaultapp).

#### Why do I need to enter Insert mode to type text?

Same as Vim, there is a strong mode separation.
Basically, it allows you to use the keyboard more efficiently,
by making keys available that are otherwise reserved for typing.
It achieves this by separating functionality into different modes,
which is exactly what Vim does, and was a big reason for starting Vieb.
See also: [my answer to remove this separation](https://github.com/Jelmerro/Vieb/issues/63)
and [this thread for my lengthy motivation for creating Vieb](https://github.com/Jelmerro/Vieb/issues/83).

#### Why can't I hover using the pointer and/or why are my pointer mouse actions unreliable?

This is because mouse simulations are not send correctly to subframes in Electron,
so Vieb has some workarounds to attempt to execute the event manually.
These are less reliable, and as such can't hover most menus inside iframes,
along with some other weird mouse action related quirks.
This can all be properly implemented once [this Electron issue](https://github.com/electron/electron/issues/20333) is fixed.

#### Why does Vieb block popups?

Electron has no support for dynamically allowing or blocking popups.
You either enable them globally, or block all of them.
Even if globally allowed, the popup windows can not be interacted with like the regular Vieb window.
No custom code can be ran in them, and you would need to use the mouse to interact with it.
All new windows are opened in a new tab when using Vieb for these reasons.
Finally, popups are bad for usability and should no longer be relied upon.
Also see [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/open#usability_issues) for a list of reasons against using popups (or `window.open` in general, which is the JavaScript api for opening custom windows).
I encourage users who run into sites still using popups today to get in touch with the site authors about this.

#### Does Vieb automatically update? / How do I update Vieb?

No, Vieb does not automatically update, nor does it check for any of that in the background.
Vieb will ONLY make requests when opened pages fetch new resources
OR when you specifically ask it to (either via navigation or with custom settings).
Checking for updates can be done by opening the `:version` page and specifically clicking "Check for updates".
Alternatively, you can watch the [Github repository](https://github.com/Jelmerro/Vieb)
or subscribe to the official [Vieb subreddit](https://reddit.com/r/vieb) to be notified of new releases.
You can also check out the official [Matrix space](https://matrix.to/#/#vieb:matrix.org) and it's [announcements chat](https://matrix.to/#/#vieb-announcements:matrix.org),
or visit the [Telegram announcements](https://t.me/vieb_announcements) and [the general chat on Telegram](https://t.me/vieb_general).
Lastly, if your system has a [third-party package](https://repology.org/project/vieb/versions), you could use that as well.
These packages might be customized or updated at a later date, but they get updates the same way you are used to from your operating system.
