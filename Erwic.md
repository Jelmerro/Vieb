Erwic - Easily Run Websites In Containers
=========================================

Vieb offers a way to start a fixed set of pages in a separate instance.
The name of this option is called "Erwic" which is short for "Easily Run Websites In Containers".

# Why

This mode is inspired by (and aims to replace) programs such as Franz, Ferdi or Rambox.
It can also be used to replace "desktop" apps of Slack, Discord and other Electron apps.
These programs are nice but Vieb (and thus Erwic mode) has the following advantages:

- Use all of Vieb's features in combination with all messaging services and websites
- Up to date with the latest Electron releases
- Free and open source (unlike those for Discord, Slack and many other messaging apps)
- History management including downloads and permissions
- Reproducible configuration using JSON config file option (--erwic)
- Use a custom application name, app icon and data location
- Specify a custom script to be executed once a page loads

# How

The browsing data of each tab is stored in it's own location based on the name.
The difference with containertabs is the custom name and the persistent storage.
Another difference is that the configured pages can't be opened or closed while running.
Finally, permissions for microphone, notifications, media devices and camera are now allowed by default.
If desired, these permissions can be changed with the viebrc in the datafolder or with `:set`,
these are only changes to the default value of the settings.

## Multiple pages

Configuration for this is is done with a settings JSON file.
You can open a config file with Vieb using the "--erwic" option.
Below is an example of how to make a fixed instance for Discord and Slack named "Erwic".

```json
{
    "name": "Erwic",
    "icon": "./example-icon.png",
    "datafolder": "~/.config/Erwic",
    "apps": [
        {
            "name": "discord",
            "url": "https://discord.com/app"
        },
        {
            "name": "slack",
            "url": "https://example.slack.com",
            "script": "./example-script.js"
        }
    ]
}
```

The required fields are the list of apps and the datafolder.
Additionally you can specify a custom name and icon for Vieb to use,
with the default being the regular Vieb defaults.
Each app should have a name and url to open, and optionally a JavaScript file to execute on page load.
The path of the icon and scripts can be relative to the config file or absolute.
Custom icons aren't very reliable in Electron especially on Linux,
so please check their issue tracker first if things don't work out.
Apps can also share the same name to use the same data location for multiple pages.
If the name of an app starts with "container", all of it's browsing data will be deleted on quit.

## Electron apps

It is of course also possible to replace "desktop" clients of messaging apps with Vieb's Erwic mode.
For example, you could name the instance "Discord", give it a discord icon and open only `discord.com`:

```json
{
    "name": "Discord",
    "icon": "/path/to/discord.png",
    "datafolder": "~/.config/Discord",
    "apps": [
        {
            "name": "discord",
            "url": "https://discord.com/app"
        }
    ]
}
```

If the JSON above would be stored as "discord.json" in for example the home directory,
you can start Vieb's version of discord with `vieb --erwic ~/discord.json`.
As long as the path to the data folder is different for each Vieb/Erwic instance,
you can create as many as you like to replace all kinds of Electron/web-based apps.
The datafolder can be stored at any local location and can be relocated as well.

## Shortcuts

Because it's a separate instance of the same application,
you will need to make a separate startup shortcut.
The approach is operating system specific, but it's usually done in one of two ways.

### Context menu option

Right-click on your desktop and create a shortcut to the "Vieb" executable,
and set `--erwic /path/to/config/file.json` as the startup arguments of the program.
Usually you can also set a custom icon for the shortcut,
which you can also provide as an option the Erwic config file (can be the same or different).

### Desktop file

On Linux you can manually add a .desktop file to the applications folder.
Usually this folder is located at `/usr/share/applications/`.
There are also user specific application folders, such as `~/.local/share/applications/`.
In either of these folders (or your distro specific folder) you can add a .desktop shortcut.
Below is an example to add Vieb with Erwic mode enabled (and named Erwic) to your start menu.

```desktop
[Desktop Entry]
Name=Erwic
Exec=/usr/bin/vieb --erwic /path/to/config/file.json
Terminal=false
Type=Application
Icon=/path/to/icon.png
Comment=Easily Run Websites In Containers
Categories=Network;WebBrowser;
```
