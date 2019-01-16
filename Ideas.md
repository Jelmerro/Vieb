Ideas for Vieb
==============

This file contains an incomplete list of ideas related to Vieb.
Ideas in this file come in two categories:

- Essential features, which should be included before any release will be considered
- Possible nice to have features

When most/all (essential) features described below are implemented,
the remaining ones will be added to the issue tracker.
None of the features in this document are final though,
as they can be changed or dropped at any time.

# Essential features

Some features already have references in the current source code.
You can search for them using `grep -nr TODO app`.

### Insert mode

Both of these features require a working settings module.

- Custom shortcut to enter (and multiple, currently ONLY `i` is used)
- Custom exit shortcut (currently both `Escape` and `ctrl+[` are always active).

### Command mode

These are some of the planned commands:

- `:help` - For ANY/ALL help with using, changing or mastering Vieb (general help also using F1 in normal mode)
- `:set` - To change Vieb settings, similar commands should print a list or reset settings (similar to regular Vim: e.g. `:set expandtab?` to print). Maybe the set command will not be used, but a different command, which can handle custom variables
- `:version` - Display version information about: Vieb, electron, Chromium and such

### Normal mode

These shortcuts are essential to Vieb, but not implemented yet:

- f to follow links
- F to open links in a new tab
- hjkl to scroll
- gg top of the page
- G bottom of the page
- H and L to go forward and backwards in history
- u to open a recently closed tab (requires history management, or settings related to this)

# Nice to haves

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
After pressing `ctrl+w` and pressing `h`, `j`, `k`, or `l` it should between them.

## Visual mode

Selecting text in the browser is almost always done with the mouse.
Vieb should have a visual mode similar to Vim,
which would allow text selection by using the keyboard.

## Optional adblocker/addons

A major drawback of building a custom browser that the user loses the ability to install custom addons.
One of the most used addons is an adblocker.
Therefor Vieb should have it's own adblocker integrated as an OPTIONAL feature.
Alternatively, Vieb could allow the user to install existing addons for Chromium or similar.
