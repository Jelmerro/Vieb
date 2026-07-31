{
  description = "Vieb - Vim Inspired Electron Browser";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];
      for_each_system = nixpkgs.lib.genAttrs systems;
    in
    {
      packages = for_each_system (
        system: rec {
          default = vieb;
          vieb = nixpkgs.legacyPackages.${system}.callPackage ./nix/package.nix { };
        }
      );
    };
}