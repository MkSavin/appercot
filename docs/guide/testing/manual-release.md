# Manual release checklist

Automated browser projects do not replace physical devices or screen readers. Record the release commit, device, OS, browser version, and result for every required row. Do not mark a row from emulation alone.

## Environment

| Field                        | Value        |
| ---------------------------- | ------------ |
| Release/commit               | Not recorded |
| Server URL and configuration | Not recorded |
| Tester and date              | Not recorded |

## Physical devices and installed PWA

| Platform                         | Required checks                                                                                                                                                                                   | Result and version |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| iPhone Safari and installed PWA  | Add to Home Screen, reopen, 320/375/390 px layouts, landscape, virtual keyboard, safe areas, history/composer scrolling, Back, file picker, reconnect, same-origin push deep link where supported | Not run            |
| Android Chrome and installed PWA | Install/reopen, background/foreground, virtual keyboard, safe areas, file picker, reconnect, same-origin push deep link                                                                           | Not run            |
| Desktop installed PWA            | Reload/reconnect, window focus, light/dark/system theme, 200% zoom, update/reload flow                                                                                                            | Not run            |

For every platform, verify denied and reset notification permission, long RU/EN labels, CJK filenames, emoji, and no page-level horizontal overflow. External push URLs must remain rejected.

## Screen readers

| Screen reader            | Required checks                                                                                                                                                                                                                                                         | Result and version |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| VoiceOver + Safari       | Landmarks/headings, current navigation, dialog names and focus, chat `role=log` without rereading all history, moderate incoming announcements, upload progress without live-region spam, queued/failed/mute/search counts, token warning/copy status, field validation | Not run            |
| NVDA + Firefox or Chrome | The same critical login, chat, upload, notification, search, catalog, settings, and token-dialog flow                                                                                                                                                                   | Not run            |

Also complete a keyboard-only pass: logical Tab order, visible focus, no positive `tabindex`, dialog trap/initial focus/Escape/return focus, menu arrows/Escape/focus return, history scrolling, search activation, and shortcuts during IME and RU/EN keyboard layouts.

## Visual review

Check light, dark, and system themes at desktop and mobile widths and at 200% browser zoom. Review semantic-token contrast in addition to axe. Verify reduced motion, long translations, primary actions, code blocks, tables, dynamic image/video heights, and empty/error/loading states. Attach targeted screenshots only for concrete layout findings.

Record discovered issues and platform limitations in the release notes or issue tracker. This checklist is a template until its result cells contain real versions and outcomes.
