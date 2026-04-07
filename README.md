# ProtonDB Status

Show ProtonDB compatibility directly in the game details stats row (next to Play Time / Achievements) in Steam Desktop mode.

![ProtonDB Status Screenshot](images/screenshot.png)

## Features

- Shows ProtonDB tier (Platinum/Gold/Silver/Bronze/Borked)
- Badge appears only when a valid ProtonDB rating exists
- Click badge to open the game ProtonDB page

## Requirements

- Millennium installed
- Steam desktop client

## Install (Marketplace)

Working on getting it added

## Install (Releases)

1. Download the latest release.
2. Extract it into your Millennium plugins directory so this path exists:

Linux path:

```bash
~/.local/share/millennium/plugins/protondb-status
```

Windows path:

```text
%MILLENNIUM_PATH%\plugins\protondb-status
```

3. Restart Steam, then enable the plugin from Millennium plugins settings.

Notes:

- The zip is prebuilt and includes `.millennium`, so users do not need Node.js/npm.
- If you extract and end up with a nested folder like `protondb-status/protondb-status`, move the inner folder up one level.

## Releases

This repo includes a GitHub Actions workflow that:

- installs dependencies
- builds the plugin
- packages a local-install zip with the correct folder layout
- uploads the zip to GitHub Releases when you push a tag like `v1.0.1`

Tag and push example:

```bash
git tag v1.0.1
git push origin v1.0.1
```

## Notes

- Frontend changes usually apply after rebuild/reload.
- Backend Lua changes may require a full Steam restart.
- Make sure your screenshot exists at `images/screenshot.png` for README rendering on steambrew.app.
