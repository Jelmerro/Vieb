Frequently Asked Questions
==========================

## Startup

#### Which release should I download?

On Windows you would download releases ending in `.exe` or `win.zip`.
On Linux you download either the AppImage or your distribution's native format (e.g. deb for Debian/Ubuntu and so on).
For Mac, there is only a zipped App.
Finally, make sure that you download the right architecture for your system.
If it's a Raspberry Pi or similar, pick ARM64 for your distribution,
otherwise, you probably need the regular release (AMD64, x86_64 or simply no suffix).

#### How do I start Vieb?

If it an zip/tar.gz archive that you downloaded, you can extract it and double-click the executable.
On Windows, you can simply double-click on the ".exe" file to run the program.
If you are using Linux, you can download the AppImage to be able to do the same.
For most other download options, you need to use your distribution's package manager,
usage should be similar to other packages of the same type.
See [these instructions](https://support.apple.com/guide/mac-help/open-a-mac-app-from-an-unidentified-developer-mh40616/mac) for opening on Mac.

#### Why can't I start Vieb?

This could be due to a number of things, if using Linux, you probably need to enable unprivileged containers.
There are instructions [on the arch wiki](https://wiki.archlinux.org/index.php/Linux_Containers#Enable_support_to_run_unprivileged_containers_(optional)) how to enable this.
If this doesn't help, try starting Vieb from a terminal or cmd window, to check for startup errors.
Also, you can start Vieb with "vieb --debug" to view the internal debugging tools of Vieb.

## Usage

#### How does it compare to other plugins and browsers?

Vieb is Chromium/Electron based and implements a wide range of features aimed to FEEL like Vim.
For a list of features, see the [homepage](https://vieb.dev/features).
See [this issue for my motivation](https://github.com/Jelmerro/Vieb/issues/83) of starting Vieb.
A proper comparison and migration guides haven't been made yet.

#### Where can I enable the mouse?

As you probably noticed, by default Vieb does not have any mouse support outside of Insert mode.
In Vieb, you can do everything with the keyboard, even things you normally would need to use the mouse for.
However, you can enable the mouse across Vieb with the `:set mouse` command.
This should bring back most of the familiar mouse movements on the page and the tabs,
but Vieb still requires using the keyboard for most actions.
If you're new to Vieb or Vim in general, using the mouse can help,
but it's no substitute for reading the `:help` page and learning to use Vieb (or Vim for that matter) properly.
Finally, if you plan to keep using the mouse, you might as well save that setting to disk using "mkviebrc" (see `:h mkviebrc` for help).

#### Why can't I sign in to Google?

See [this issue](https://github.com/Jelmerro/Vieb/issues/50) for more background information,
basically Google blocks everything that isn't Chrome or Firefox.
You can use `:set firefoxmode=google` within Vieb to mimic Firefox when visiting Google pages,
most people that I heard back from reported that it works with firefoxmode enabled.

#### How do I quit Vieb?

Same as Vim. From normal mode, type `:qa` then Enter. (This assumes the default mappings and commands.)
See [this issue](https://github.com/Jelmerro/Vieb/issues/65) for the rationale and other options.

#### Why do I need to enter Insert mode to type text?

Same as Vim, there is a strong mode separation.
See [this issue for my answer to a similar question](https://github.com/Jelmerro/Vieb/issues/63).

#### Does Vieb automatically update? / How do I update Vieb?

No, Vieb does not automatically update, nor does it check for any of that in the background.
Vieb will ONLY make requests when opened pages fetch new resources
OR when you specifically ask it to (either via navigation or with custom settings).
Checking for updates can be done by opening the `:version` page and specifically clicking "Check for updates".
Alternatively, you can watch the [github repository](https://github.com/Jelmerro/Vieb)
or subscribe to the official [Vieb subreddit](https://reddit.com/r/vieb).
