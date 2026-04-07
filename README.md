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

- If you extract and end up with a nested folder like `protondb-status/protondb-status`, move the inner folder up one level.
