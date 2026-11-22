
{ pkgs ? import <nixpkgs> {} }:

(pkgs.buildFHSEnv {
  name = "electron-fhs";

  targetPkgs = pkgs: with pkgs; [
    # Core runtime
    glib
    stdenv.cc.cc
    zlib
    expat

    # GTK and accessibility
    gtk3
    gtk4
    atk
    at-spi2-atk
    at-spi2-core
    pango
    cairo
    gdk-pixbuf
    dbus
    cups

    # Security and certificates
    nss
    nspr

    # X11
    libx11
    libxcb
    libxext
    libxrender
    libxrandr
    libxfixes
    libxcursor
    libxi
    libxdamage
    libxcomposite
    libxshmfence
    libxkbfile
    libxkbcommon
    libxtst

    # Graphics / GPU
    mesa
    libgbm
    libdrm
    libGL
    libglvnd
    vulkan-loader
    pciutils

    # Audio
    alsa-lib
    libpulseaudio
    pipewire

    # Other Electron runtime dependencies
    systemd
    libnotify
    libsecret
    speechd-minimal

    # Desktop integration
    udev
    fontconfig
    freetype
    curl
  ];

  multiPkgs = pkgs: with pkgs; [
    glib
    stdenv.cc.cc
    zlib
    libx11
    libxcb
    libgbm
    libGL
    alsa-lib
  ];

  profile = ''
    export LD_LIBRARY_PATH="/run/opengl-driver/lib:/run/opengl-driver-32/lib''${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
  '';

  runScript = "bash";
}).env

