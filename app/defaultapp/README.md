Default app scripts
===================

In this folder a collection of scripts and tools are stored to set a default app.
Vieb uses this as part of the `:makedefault` command,
which you can run to make Vieb the default browser of your OS.
Everyone is encouraged to improve these scripts for wider OS support.
For all scripts the original license is also stored, which includes author info.
These scripts are called from "js/command.js" in the "makedefault" function,
though some systems don't require external scripts and just call a native tool directly.

### Undo of makedefault command

For most operating systems, all that is done is changing the default program.
So to undo the changes, simply set a different browser as the default to undo all changes.
For Windows, also execute the "clearwindows.reg" command to clean the registry.
This will remove any changes made by the makedefault command.
