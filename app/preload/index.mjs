/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2025 Jelmer van Arnhem
*
* This program is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

// Always load follow mode JavaScript
import("./follow.js")
import {pathToSpecialPageName} from "../preloadutil.js"
const specialPage = pathToSpecialPageName(window.location.href)
const skipProtocols = ["sourceviewer:", "readerview:", "markdownviewer:"]
if (specialPage?.name) {
    // Load the special page specific JavaScript
    import(`./${specialPage.name}.js`)
} else if (!skipProtocols.some(p => window.location.href.startsWith(p))) {
    // Load the privacy related fixes for nonspecial pages
    import("./privacy.js")
    // Load the failed page information handler for nonspecial pages
    import("./failedload.js")
    // Load the local directory browser for nonspecial pages
    import("./filebrowser.js")
    // Load optional plugins and extensions
    import("./extensions.js")
}
// Always load the misc action functions (such as scrolling before page loads)
import("./actions.js")
// Load the custom styling such as colors, fontsizes and darkreader
import("./styling.js")
