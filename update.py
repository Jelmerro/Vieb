# Vieb - Vim Inspired Electron Browser
# Copyright (C) 2021 Jelmer van Arnhem
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


def main():
    with open("package.json") as f:
        package = json.load(f)
    print("\n  = Checking dependencies\n")
    for dep_type in ["devDependencies", "dependencies"]:
        for dep, version in package.get(dep_type, {}).items():
            info = subprocess.run(
                ["npm", "dist-tags", dep], stdout=subprocess.PIPE, check=True)
            info = info.stdout.decode()
            wanted = overrides.get(dep, "latest")
            matches = re.findall(rf"{wanted}:\s+(\d+\.\d+\.\d+)(\s+|$)", info)
            new_version = None if not matches else matches[0][0]
            if new_version:
                if new_version == version:
                    print(f"- {dep} is already up to date")
                else:
                    print(f"- updating {dep} from {version} to {new_version}")
                package[dep_type][dep] = new_version
            else:
                print(f"- failed to find {wanted} version for {dep}")
    with open("package.json", "w") as f:
        json.dump(package, f, indent=2)
        f.write("\n")
    shutil.rmtree(os.path.join(os.path.dirname(
        __file__), "./node_modules"), ignore_errors=True)
    os.remove(os.path.join(os.path.dirname(__file__), "./package-lock.json"))
    print("\n  = Installing modules\n")
    subprocess.run(["npm", "install"], check=False)
    print("\n  = Fixing audit issues\n")
    subprocess.run(["npm", "audit", "fix"], check=False)
    print("\n  = Deduplicating dependencies\n")
    subprocess.run(["npm", "dedup"], check=False)


if __name__ == "__main__":
    main()
