Frequently Asked Questions
==========================

This document contains a list of frequently asked questions.
If your question is not listed, you can find support here:

- [Reddit](https://reddit.com/r/vieb) - r/vieb is the official subreddit
- [Matrix](https://matrix.to/#/#vieb:matrix.org) - #vieb is hosted on matrix.org
- [Telegram](https://t.me/vieb_general) - Chat with other users on Telegram
- Or make a Github issue if you aren't using any of the above

Most general usage information can be found in the help page.
You can open it with the `F1` key or the `:help` command.
Below are questions that are either not explicitly covered in the help page,
or are asked a lot regardless of their existing documentation/explanation.

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
On Windows, you can simply double-click on the ".exe" file to run the program,
though you might need to mark the SmartScreen warning as trusted, more on that [on Wikipedia](https://en.wikipedia.org/wiki/Microsoft_SmartScreen#Criticism).
If you are using Linux, you can download the AppImage to have the same single executable experience.
For most other download options, you need to use your distribution's package manager,
usage should be similar to other packages of the same type.

##### Mac

The mac apps are not signed, you can sign them yourself with `sudo codesign --force --deep --sign - /Applications/Vieb.app`.
This step has become [a required step in recent versions](https://developer.apple.com/documentation/macos-release-notes/macos-big-sur-11_0_1-universal-apps-release-notes#Code-Signing).
For older mac versions you could try [these instructions](https://support.apple.com/guide/mac-help/open-a-mac-app-from-an-unidentified-developer-mh40616/mac) for opening the app as is,
which comes down to disabling app store requirements with `sudo spctl --master-disable`.
If none of these work, you can build the app from source with the [README build instructions](./README.md#building), the final command can also be `npm run buildmac` to just build for mac.
If these instructions do not seem to be followed at all, your issue might be [closed](https://github.com/Jelmerro/Vieb/issues/169),
as it's not Vieb's responsibility to fix your operating system quirks for you.

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

Google block a lot of software that isn't Chrome from accessing their services.
Just a simple [DDG search](https://duckduckgo.com/?q=browser+or+app+may+not+be+secure) reveals that most programs experience this.
Google own your data and they are the ones to decide who may view it and when, for now they chose to only allow mostly Chrome and sometimes Firefox.
Below is a list of known workarounds to circumvent this blocking policy, use them at your own risk.

- You can temporarily use `:set useragent=%firefox` within Vieb to mimic Firefox, which Google allow more often
- Add "Electron" to the useragent setting to make Google aware that you are using a custom Electron browser, which Google condone for now
- Try again after building up some cookies and tracking data, as Google are more likely to allow the login once they know who you are

There are no other known workarounds to allow the sign-in at this point of time.
You are encouraged to open PRs to improve this list of workarounds.
However, opening issues just to announce that you cannot login to your account will be closed,
as it's not something Vieb or any other smaller browser can fix, only Google can.
You, and only you, need to consider if it's worth using services that [can block you any moment](https://www.polygon.com/2021/2/8/22272284/terraria-google-stadia-canceled-developer-locked-out) for [any reason](https://old.reddit.com/r/Android/comments/ai85qf/warn_google_could_suspend_your_account_without/).
For more info about moving away from Google and why, see [r/degoogle](https://reddit.com/r/degoogle/).

#### Why doesn't DRM work (such as Spotify or Netflix)?

Google own Widevine, the one and only DRM solution for Chromium-based browsers.
They are in control of approving and verifying the inclusion of Widevine into a (software) project.
The process is [far from straightforward](https://github.com/electron/electron/issues/12427) and [is blocked for open-source software](https://blog.samuelmaddock.com/posts/google-widevine-blocked-my-browser/).
It's even explained on the [official Wikipedia page of Widevine](https://en.wikipedia.org/wiki/Widevine).
PRs to implement DRM will be rejected on the basis that they need proprietary keys and software to work.
Issues relating to this topic will be closed, as it's not something Vieb or any other smaller browser can fix, only Google can.
You, and only you, need to consider if it's worth using services that require DRM and thus Google approved proprietary software.
For more info on why DRM usually isn't a good idea, see [the GNU website on DRM](https://www.gnu.org/proprietary/proprietary-drm.html) or [Defective by Design](https://www.defectivebydesign.org/).

#### Why do I see ads on some sites (such as Youtube)?

Blocking video ads on Youtube is extremely tricky, and requires continuous updates to keep working.
Even well respected adblocker plugins such as uBlock Origin [do sometimes](https://old.reddit.com/r/uBlockOrigin/comments/n90n2a/not_blocking_youtube_ads/) let [ads through](https://old.reddit.com/r/uBlockOrigin/comments/uekyuk/youtube_ads_are_getting_through/).
Vieb is no different in this case, and relies on blocklists and resource files to be kept up to date.
You can automatically update these on startup by running `:set adblocker=update`,
but even then these lists need to be up to date with the changes Youtube makes to work in the first place.
This means there are a lot of layers that need updating before blocking works again after a Youtube update.
Since version 8.0.0 the blocking resources and methods are identical to plugins like uBlock Origin,
and any issues with blocking content you have in Vieb are therefor caused by one of two things:

- Different blocklists and/or different versions of the lists, either update them or add extra ones
- Issues in the adblocking module that Vieb uses, please report your issues not related to the above [in the relevant repo](https://github.com/ghostery/adblocker)

In both cases, Vieb is not directly involved or the reason that you see ads,
please consider testing various blocklists or opening an issue in the adblocker repo,
unless you are really sure that it's a Vieb specific issue by testing it [with this example usage of their package](https://github.com/ghostery/adblocker/tree/master/packages/adblocker-electron-example).
Finally, it's worth noting that most blocklists work suboptimal if you block autoplay,
which is blocked by default in Vieb, though you can change that using `--autoplay-media=always` on startup.

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

#### Why are prompt, confirm and alert dialogs not working?

In most browsers, these type of dialogs can appear whenever a page wants to.
In Vieb, these are blocked and instead you are notified when a page tries to use them,
as this is less annoying and doesn't interrupt you whenever a page wants your attention.
You can change this behavior using the "dialog" settings: "dialogprompt", "dialogconfirm" and "dialogalert".
If you want them to show like on other browsers, just set their value to "show".
It's worth mentioning that the prompt dialog is custom, as Electron by default doesn't support it, but Vieb does.

#### Why does Vieb block popup windows?

Electron has no support for dynamically allowing or blocking popup windows.
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

#### Will extensions ever be supported?

Highly unlikely, as this has been attempted numerous times in the past, without success.
The results of this were tracked in [this issue](https://github.com/Jelmerro/Vieb/issues/130).
The current approach is to implement common extensions and their features into Vieb directly,
for which the progress can be tracked in [this issue](https://github.com/Jelmerro/Vieb/issues/385).
If you miss a feature in Vieb that you currently use an extension for, please make a new Github issue.
If you think you have what it takes to give Vieb extension support, feel free to make a PR for it.
