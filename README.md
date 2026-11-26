# Mjeksia Online

An offline study app for Albanian medical students preparing for the state entrance exam
(Biologji, Fizikë, Kimi). It contains the 2 999 questions of the official
[QSHA question bank](https://qsha.gov.al/provimi-i-informatizuar-i-mjekesise/), each with a short
explanation and a detailed, step-by-step reasoning.

> Android is the supported platform. Download the APK from the
> [Releases](https://github.com/mvisi/mjeksia-online/releases) page and sideload it.

## Features

- **Pyetje të çfarëdoshme (Arena):** one question at a time with instant feedback. Prefers questions
  you have not seen yet, and can be filtered by subject or topic.
- **Model testi:** a timed exam that samples every topic in proportion to its share of the bank.
  Flag questions, jump around with the question grid, change answers until you finish.
- **Tests by subject or topic** from the question bank.
- **Resume anytime:** answers are saved as you tap. Leaving a test pauses it; the home screen
  offers to continue. The clock follows the real time, so it can't drift or be paused by
  switching apps.
- **Gabimet e mia:** every question you got wrong, from any mode, until you answer it right twice in
  a row. Test them as a set.
- **Progress:** accuracy, study streak, time studied, average test score, and mastery per
  subject and topic.
- **Search** across questions and options. Diacritics are optional (`pergjigje` finds
  `përgjigje`).
- **Results and review:** score, per-topic breakdown, retest everything or only the misses.
- 8 colour themes, light/dark/system.

## Development

```bash
pnpm install
pnpm start          # Expo dev server (use a development build on Android)
pnpm test           # logic + database tests (Node, no device needed)
pnpm typecheck && pnpm lint
```

Stack: Expo SDK 58 (React Native 0.88, React 19.3, New Architecture, React Compiler),
Expo Router native tabs, NativeWind 4, Drizzle ORM on expo-sqlite.

### Project layout

```
app/                 routes (Expo Router)
components/          ui/ (design system), question/, test/, lists/, settings/
hooks/               useQuery (live DB queries), useCountdown, useStartTest, useAppTheme
lib/                 pure logic: test engine, rich text / TeX parsing, sampling, stats
services/db/         schema, queries and the DatabaseProvider
services/settings/   typed settings stored in expo-sqlite/kv-store
scripts/             content build tools
__tests__/           Jest tests (run against the real question bank)
```

### Data: two databases

| File         | What                                                                | Changes                    |
| ------------ | ------------------------------------------------------------------- | -------------------------- |
| `content.db` | Questions, topics, pre-rendered formulas, search index (read-only). | Replaced on content update |
| `user.db`    | Test sessions and every answer given.                               | Drizzle migrations         |

At startup `services/db/client.ts` copies the bundled `assets/content.db` to
`content-<hash>.db`, `ATTACH`es it to `user.db` and runs migrations. The file name contains a hash
of the content, so shipping corrected questions replaces the user's copy without touching
their history.

### Updating questions

Edit `assets/content.db` (or point the script at a new export), then rebuild it:

```bash
pnpm build:content   # normalises text, renders every formula with MathJax, rebuilds search,
                     # writes constants/content-version.ts
pnpm build:images    # if images in assets/contextImgs changed
pnpm test            # checks every formula and image is present
```

Question text is lightweight Markdown: `**bold**`, numbered/bulleted lists, inline `$…$` and
display `$$…$$` TeX. Formulas are rendered to SVG at build time, with glyph outlines stored
once and shared, so the app needs no math engine and works offline.

### Changing the user schema

Edit `services/db/user-schema.ts`, then run `pnpm db:generate` and review the generated SQL in
`drizzle/` before committing.

## FAQ

**Who is this for?** Medical students in Albania preparing for the state exam.

**Does it need internet?** No. The question bank and your history are stored on the device.

**Where do the questions come from?** The official QSHA question bank. Explanations were written
for this app. If you find a mistake, please report it.

## Contributing

Bug reports and corrections are welcome on the
[issues page](https://github.com/mvisi/mjeksia-online/issues). Please include the subject, topic
and question number (shown above each question) and, if possible, a screenshot.
