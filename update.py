# Vieb - Vim Inspired Electron Browser
# Copyright (C) 2021-2022 Jelmer van Arnhem
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.
import json
import os
import shutil
import subprocess
import re

overrides = {
    "electron-builder": "next"
}


def find_version(text, version):
    matches = re.findall(rf"{version}:\s+(.+)(\s+|$)", text)
    return version if not matches else matches[0][0]


def main():
    print("\n  = Checking dependencies\n")
    with open("package.json") as f:
        package = json.load(f)
    for dep_type in ["devDependencies", "dependencies"]:
        for dep, version in package.get(dep_type, {}).items():
            info = subprocess.run(
                ["npm", "dist-tags", dep], stdout=subprocess.PIPE, check=True)
            info = info.stdout.decode()
            latest = find_version(info, "latest")
            custom = overrides.get(dep, "latest")
            wanted = find_version(info, custom)
            if wanted and latest:
                if wanted == version:
                    print(
                        f"- {dep} already using the '{custom}' "
                        f"version {version}")
                else:
                    print(f"- updating {dep} from {version} to {wanted}")
                if wanted != latest:
                    print(f"  | the 'latest' version is at {latest}")
                package[dep_type][dep] = wanted
            else:
                print(f"- failed to find {wanted} version for {dep}")
    with open("package.json", "w") as f:
        json.dump(package, f, indent=2)
        f.write("\n")
    shutil.rmtree("./node_modules", ignore_errors=True)
    try:
        os.remove("./package-lock.json")
    except OSError:
        pass
    print("\n  = Installing modules\n")
    subprocess.run(["npm", "install", "--legacy-peer-deps"], check=True)
    print("\n  = Fixing audit issues\n")
    subprocess.run(["npm", "audit", "fix", "--legacy-peer-deps"], check=False)
    print("\n  = Deduplicating dependencies\n")
    subprocess.run(["npm", "dedup", "--legacy-peer-deps"], check=True)
    print("\n  = Fixing package-lock issues\n")
    with open("package-lock.json") as f:
        package_lock = json.load(f)
    for package in package_lock["packages"]:
        if "electron" in package_lock["packages"][package].get("peerDependencies", {}):
            del package_lock["packages"][package]["peerDependencies"]
    with open("package-lock.json", "w") as f:
        json.dump(package_lock, f, indent=2)
        f.write("\n")
    subprocess.run(["npm", "ci"], check=True)


if __name__ == "__main__":
    main()
