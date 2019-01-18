Ideas for Vieb
==============

This file contains an incomplete list of ideas related to Vieb.
Ideas in this file come in two categories:

- Essential features, which should be included before any release will be considered
- Nice to have features

When most/all (essential) features described below are implemented,
the remaining ones will be added to the issue tracker.
None of the features in this document are final though,
as they can be changed or dropped at any time.

# Essential features

Some features already have references in the current source code.
You can search for them using `grep -nr TODO app`.

## Settings module

To view, modify and reset settings.
It should also allow the user to modify the keybindings,
by overwriting the existing ones.
This way new custom ones can be added,
while at the same time allowing existing ones to be disabled (by setting the action to undefined).

Maybe it would also be cool to configure all settings using some sort of .viebrc file.
The syntax would probably be json, but I haven't given this option much thought yet.

## More commands

- `:help` - For ANY/ALL help with using, changing or mastering Vieb (general help also using F1 in normal mode)
- `:version` - Display version information about: Vieb, electron, Chromium and such

## Normal mode shortcuts

- u to open a recently closed tab (requires history management, or settings related to this)

# Nice to haves

None of these features are planned for the near future,
but some of these will probably be added to Vieb eventually.

## Possible form edit mode

Another idea is to introduce a separate mode for editing forms elements, such as text input fields.
The `I` or `A` key could be set up to enter this mode,
or another key might be more appropriate.
Maybe it will be possible to have a normal mode and edit mode specifically for input fields,
which could also be triggered by a command instead of a keypress.
The form edit mode should show letters next to all input fields,
similar to the `f` key will do to follow links.
The difference being that a special vim-like input field edit mode will be entered,
after picking an input field by pressing the letter next to it.
This form mode will be especially useful for large textfields,
but it's not planned to be implemented in Vieb anytime soon.

## Possible multiple tab window mode

It could be nice to display multiple tabs next to each other, similar to using separate windows in Vim.
Opening new windows could be done by changing the F key to open a link in a new window instead of a new tab.
Additionally, a new window could be opened after entering commands, similar to using `:Vex` in Vim.
After pressing `ctrl+w` and pressing `h`, `j`, `k`, or `l` it should switch between them.

## Visual mode

Selecting text in the browser is almost always done with the mouse.
Vieb could have a visual mode similar to Vim,
which would allow text selection by using the keyboard.

## Optional adblocker/addons

A major drawback of building a custom browser, is that the user loses the ability to install custom addons.
One of the most used addons is an adblocker.
Therefor Vieb should have it's own adblocker integrated as an OPTIONAL feature.
Alternatively, Vieb could allow the user to install existing addons for Chromium or similar.
The first option could be achieved by optionally filtering the domains with [this](https://github.com/Kikobeats/is-tracking-domain) or a proper adblocker such as [this one](https://github.com/brave/ad-block/).

## Select link mode or Url preview option

It could be nice to have a modified version of the `f` shortcut,
possibly mapped to `s`, with the following differences:

- It will NOT open links DIRECTLY after picking a link
- It WILL show the complete url for the chosen link
- Give the user the CHOICE to open the link after looking at the complete url
- It WILL trigger the hover of the link/element, so no mouse is needed to activate that

To make this possible, a hover needs to be simulated with javascript, this has two required steps:
- Call the mouseenter/mouseleave functions
- Copy the :hover css and apply it temporarily to the chosen element
OR figure out if it's possible with [this electron API](https://electronjs.org/docs/api/web-contents#contentssendinputeventevent).

Additionally, maybe the url could be shown in the bottom left on hover when in insert mode,
similar to existing browsers.

## Devtools with Vim bindings

This is probably twice if not triple the work of the entire Vieb project,
but it would be really nice to have.
An example of a webview based devtools implementation can be found [here](https://github.com/electron/electron/blob/master/docs/api/web-contents.md#contentssetdevtoolswebcontentsdevtoolswebcontents).
