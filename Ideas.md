Ideas for Vieb
==============

This file contains an incomplete list of ideas related to Vieb.
Ideas in this file come in two categories:

- Essential features, which should be included before any release will be considered
- Possible nice to have features, mostly related to a form edit mode and multiple tab window management

When most/all (essential) features described below are implemented,
the remaining ones will be added to the issue tracker.
None of the features in this document are final though,
as they can be changed or dropped at any time.

# Essential features

## General

- Separate command, normal and insert mode, to avoid conflicting shortcuts (e.g. with youtube or webgames)
- A normal mode with a large collection of single key shortcuts to interact with the webpage (when done, this readme will have a list of them)
- An insert mode which allows full interaction with the webpage, except when pressing `escape` or `ctrl+[`
- Vieb should have commands for "complex" functionality and should at minimum include :help and :set commands

## Modes

Just like Vim, Vieb interaction will be separated into modes:

- Insert mode
- Command mode
- Normal mode
- Visual mode
- Search mode

### Insert mode

This is by far the least complex mode in Vieb, because it allows full interaction with the webpage like any normal browser would.
Sites such as youtube have lots of single-key shortcuts on the site,
which could conflict with Vim binding add-ons/plugins.
Vieb should aim to resolve this problem by having a separate Insert mode,
which could be entered by pressing any of the following keys when in Normal mode:

`i, a, I, A`

Exiting back to normal mode will be possible by default with `escape` or the `ctrl+[` combination.
There are not many websites which would not work without `ctrl+[`,
which is recommended over `escape` for that reason.
It should be possible to choose a custom shortcut,
if either of these conflict with a website you regularly visit.

### Command mode

When in normal mode, command mode can be entered after pressing `:`.
These are some of the planned commands:

- `:help` - For ANY/ALL help with using, changing or mastering Vieb
- `:q` - Quit Vieb

### Normal mode

Just like regular Vim, this will be the mode used for most tasks.
It allows the user to navigate pages by entirely using the keyboard.
Most shortcuts should eventually have their own section dedicated in the help pages,
but a summary for each planned key is displayed below:

- f to follow links
- F to open links in a new tab
- hjkl to scroll
- gg top of the page
- G bottom of the page
- v to enter visual mode (for selecting text mainly)

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
