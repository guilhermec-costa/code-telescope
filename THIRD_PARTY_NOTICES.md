# Third-party notices

## wasmdoom

The packaged `ui/vendor/doom/wasmdoom.wasm` and
`ui/vendor/doom/wasmdoom.music.wasm` binaries are the unmodified artifacts
published by [`theMagicalKarp/wasmdoom`](https://github.com/theMagicalKarp/wasmdoom)
in release [`v0.0.2`](https://github.com/theMagicalKarp/wasmdoom/releases/tag/v0.0.2).
The release tag resolves to commit
[`3edb40afadefe6b2d2955e02fa83b74f1b89bc7f`](https://github.com/theMagicalKarp/wasmdoom/tree/3edb40afadefe6b2d2955e02fa83b74f1b89bc7f).
The corresponding source is available from that tag and its
[source archive](https://github.com/theMagicalKarp/wasmdoom/archive/refs/tags/v0.0.2.tar.gz).

The engine is licensed under the GNU General Public License, version 2. A
verbatim copy is included at `ui/vendor/doom/LICENSE-wasmdoom.txt`.

- `wasmdoom.wasm` SHA-256: `caa3d9152830738325d0b0b2b1448c4cef25edeed1e3a5f979f6c7bbfada1683`
- `wasmdoom.music.wasm` SHA-256: `09f1c044366c65fb3981906854951b5efb076018274d7589fe4edbf6d67de338`

Both artifacts have GitHub/Sigstore build provenance for the release workflow.
They can also be reproduced byte-for-byte from the tagged source with Zig
0.16.0 when the GitHub Actions source path is normalized.

## DOOM shareware data

`ui/vendor/doom/doom1.wad` is the unmodified DOOM Shareware 1.9 episode,
extracted from id Software's historical `doom19s.zip` distribution. It is
redistributed without charge under the Limited Use Software License Agreement
and remains copyright id Software. A copy of the shareware terms is included at
`ui/vendor/doom/LICENSE-doom-shareware.txt`. No registered or commercial DOOM
IWAD is included.

Packaged WAD SHA-256: `1d7d43be501e67d927e415e0b8f3e29c3bf33075e859721816f652a526cac771`.

The complete machine-readable provenance and artifact sizes are recorded in
`ui/vendor/doom/manifest.json`. Run `npm run verify:doom-assets` to verify the
packaged files before building or publishing the extension.
