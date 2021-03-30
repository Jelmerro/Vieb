Frequently Asked Questions
==========================

This document contains a list of frequently asked questions.
If you question is not listed or properly answered below, you can ask your question on
[r/vieb](https://reddit.com/r/vieb) or via [a github issue](https://github.com/Jelmerro/Vieb/issues/new/choose).
Feel free to ask questions on the subreddit or on github if you can't figure it out.

## Startup

#### Which release should I download?

On Windows you would download releases ending in `.exe` or `win.zip`.
On Linux you download either the AppImage or your distribution's native format (e.g. deb for Debian/Ubuntu and so on).
For Mac, there are two zipped Apps, one for x64 and one for ARM64.
Vieb releases are offered in two different architectures:

- ARM64, for Silicon macbooks, Raspberry Pi's, micro-computers etc. (suffixed aarch64 for rpm and pacman builds)
- x64, for pretty much all other regular devices (also suffixed with amd64, x86_64 or no suffix at all)

It's important to make sure that you download the right architecture for your system.

#### How do I start Vieb?

If it's a zip/tar.gz archive that you downloaded, you can extract it and double-click the executable.
On Windows, you can simply double-click on the ".exe" file to run the program.
If you are using Linux, you can download the AppImage to be able to do the same.
For most other download options, you need to use your distribution's package manager,
usage should be similar to other packages of the same type.

##### Mac

You can disable app store requirements with `sudo spctl --master-disable`. If you need a signed app, you can sign it yourself with `sudo codesign --force --deep --sign - /Applications/Vieb.app`.
Or you can try [these instructions](https://support.apple.com/guide/mac-help/open-a-mac-app-from-an-unidentified-developer-mh40616/mac) for opening the app as is.

#### Why can't I start Vieb?

This could be due to a number of things, if using Linux, you probably need to enable unprivileged containers.
There are instructions [on the arch wiki](https://wiki.archlinux.org/index.php/Linux_Containers#Enable_support_to_run_unprivileged_containers_(optional)) how to enable this.
If this doesn't help, try starting Vieb from a terminal or cmd window, to check for startup errors.
Also, you can start Vieb with "vieb --debug" to view the internal debugging tools of Vieb.

## Usage

Most general usage information can be found in the help page.
You can open it with the `F1` key or the `:help` command.
Below are questions that are either not explicitly covered in the help page,
or asked a lot regardless of their existing documentation/explanation.

#### How does it compare to other plugins and browsers?

Vieb is Chromium/Electron based and implements a wide range of features aimed to FEEL like Vim.
For a list of features, see the [homepage](https://vieb.dev/features).
See [this issue for my motivation](https://github.com/Jelmerro/Vieb/issues/83) of starting Vieb.
Proper comparisons and migration guides haven't been made yet,
but there are [example viebrc files](https://github.com/Jelmerro/Vieb/tree/master/app/examples).

#### Why can't I sign in to Google?

Google blocks a lot of software that isn't Chrome from accessing their services.
Even users of [Google's](https://archive.is/1baul) own [Chrome](https://archive.is/aRQEW), are sometimes getting blocked.
Fortunately, for the time being a workaround exists for all this, which is to set a Firefox useragent.
You can use `:set firefoxmode=google` within Vieb to mimic Firefox when visiting Google pages.
Keep in mind that while this works, it's entirely possible for them to block Firefox as well in the future.
See [this issue](https://github.com/Jelmerro/Vieb/issues/50) for more background information.

Another thing you might encounter, is that strict site isolation is required for your session to be preserved.
You can enable this on startup with "--strict-site-isolation", though this will block Vieb from accessing iframes in follow mode.
If you rely heavily on Google services it might be worth the trade-off to use this startup option,
which offers for more reliable Google logins at the cost of a limited follow mode implementation.
For Vieb to have strict site isolation without the follow mode limitation [this Electron issue](https://github.com/electron/electron/issues/22582) needs to be fixed.

#### Can I make Vieb my default browser?

Yes, there is a command for that named `:makedefault`.
For details, see the help page using `:h makedefault` and the
[defaultapp script directory](https://github.com/Jelmerro/Vieb/tree/master/app/defaultapp).

#### How do I quit Vieb?

Same as Vim. From normal mode, type `:qa` then Enter. (This assumes the default mappings and commands.)
See [this issue](https://github.com/Jelmerro/Vieb/issues/65) for the rationale and other options.
If you just want to use your regular shortcut to quit, use any of these commands to map the keys:

```vim
:map <A-F4> <:qa>
:map <M-q> <:qa>
:map <C-q> <:qa>
```

You don't need all three, you can simply execute the ones you would like,
optionally followed by `:mkv` to save the config to disk for the next Vieb session.
You can find more details about mappings with the help command: `:help map` or `:h mappings`.

#### Why do I need to enter Insert mode to type text?

Same as Vim, there is a strong mode separation.
Basically, it allows you to use the keyboard more efficiently,
by making keys available that are otherwise reserved for typing.
It achieves this by separating functionality into different modes,
which is exactly what Vim does, and was a big reason for starting Vieb.
See also: [my answer to remove this separation](https://github.com/Jelmerro/Vieb/issues/63)
and [this thread for my lengthy motivation for creating Vieb](https://github.com/Jelmerro/Vieb/issues/83).

#### Does Vieb automatically update? / How do I update Vieb?

No, Vieb does not automatically update, nor does it check for any of that in the background.
Vieb will ONLY make requests when opened pages fetch new resources
OR when you specifically ask it to (either via navigation or with custom settings).
Checking for updates can be done by opening the `:version` page and specifically clicking "Check for updates".
Alternatively, you can watch the [github repository](https://github.com/Jelmerro/Vieb)
or subscribe to the official [Vieb subreddit](https://reddit.com/r/vieb) to be notified of new releases.
Lastly, if your system has a [third-party package](https://repology.org/project/vieb/versions), you could use that as well.
These packages might be customized or updated at a later date, but they get updates the same way you are used to from your operating system.
