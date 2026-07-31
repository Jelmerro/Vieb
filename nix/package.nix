{
  lib,
  stdenv,
  buildNpmPackage,
  electron_43,
  jq,
  makeWrapper,
  makeDesktopItem,
}:

let
  electron = electron_43;
  packageJson = lib.importJSON ../package.json;
  desktopItem = makeDesktopItem {
    name = "vieb";
    exec = "vieb %U";
    icon = "vieb";
    desktopName = "Vieb";
    genericName = "Web Browser";
    comment = "Vim Inspired Electron Browser";
    categories = [
      "Network"
      "WebBrowser"
    ];
    mimeTypes = [
      "text/html"
      "application/xhtml+xml"
      "x-scheme-handler/http"
      "x-scheme-handler/https"
    ];
    startupWMClass = "Vieb";
  };
in
buildNpmPackage {
  pname = "vieb";
  version = packageJson.version;

  src = ./..;

  npmDepsHash = "sha256-QV5JOwQBoP604AasANACXBwrGEtUqVtM8GXQq3lo1wQ=";
  makeCacheWritable = true;

  # Vieb has no "build" npm script; the app is run directly from app/.
  dontNpmBuild = true;

  # Defensive: matches nixpkgs convention for electron apps. Electron 42+
  # removed the env var and the npm postinstall it gated, so it's a no-op
  # on Electron 43, but kept for forward-compat with future electron revisions.
  env.ELECTRON_SKIP_BINARY_DOWNLOAD = 1;

  # Fail loudly if Vieb bumps Electron to a major nixpkgs doesn't ship yet,
  # so the wrapped electron_43 below stays in sync with package.json.
  preBuild = ''
    expectedMajor="$(jq -r '.devDependencies.electron | ltrimstr("^") | split(".") | .[0]' < package.json)"
    actualMajor="${lib.versions.major electron.version}"
    if [ "$expectedMajor" != "$actualMajor" ] 2>/dev/null; then
      echo "ERROR: electron version mismatch between package.json (major $expectedMajor) and nixpkgs (major $actualMajor)"
      exit 1
    fi
  '';

  nativeBuildInputs = [
    makeWrapper
    jq
  ];

  # npmInstallHook (buildNpmPackage's default installPhase) copies the app
  # and node_modules to $out/lib/node_modules/vieb/. The platform-specific
  # bits below only handle the desktop entry and icons.
  postInstall = lib.optionalString stdenv.hostPlatform.isLinux ''
    install -Dm0644 ${desktopItem}/share/applications/vieb.desktop \
      $out/share/applications/vieb.desktop

    pushd $out/lib/node_modules/vieb/app/img/icons
    for file in *.png; do
      install -Dm0644 "$file" \
        "$out/share/icons/hicolor/''${file//.png}/apps/vieb.png"
    done
    popd
  '';

  postFixup = ''
    makeWrapper ${lib.getExe electron} $out/bin/vieb \
      --add-flags $out/lib/node_modules/vieb/app \
      --set npm_package_version ${packageJson.version} \
      --inherit-argv0
  '';

  meta = {
    homepage = "https://vieb.dev/";
    changelog = "https://github.com/Jelmerro/Vieb/releases/tag/v${packageJson.version}";
    description = "Vim Inspired Electron Browser";
    longDescription = ''
      Vieb is a Vim inspired web browser that gives you full control
      of the web with the keyboard, similar to Vim inside the browser.
    '';
    license = lib.licenses.gpl3Plus;
    mainProgram = "vieb";
    platforms = electron.meta.platforms;
    maintainers = with lib.maintainers; [
      "0fflineuser"
    ];
  };
}