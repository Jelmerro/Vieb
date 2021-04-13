Default app scripts
===================

This folder contains Windows related tools to set a default app.
Vieb uses this as part of the `:makedefault` command,
which you can run to make Vieb the default browser of your OS.
For these scripts the original license is also stored, which includes author info.
The `windows.bat` script is called in "app/renderer/command.js" from the "makedefault" function,
though most systems don't require external scripts and just call a native tool directly.

### Undo of makedefault command for Windows

For most operating systems, all that is done is changing the default program.
So to undo the changes, simply set a different browser as the default to undo all changes.
For Windows, also execute the `clearwindows.reg` command to clean the registry.
This will remove any changes made by the makedefault command.
