# Shatterhymn

A one-thumb browser game. Hold to pick a colour. Let go when it matches a crystal to shatter every crystal of that colour. Stop crystals reaching the bell — three cracks and the run ends.

## How to play

1. Hold anywhere. The dial moves through colours.
2. Let go when the dial matches the crystals you want to break. More of one colour at once scores far more.
3. Keep crystals off the bell. Three cracks end the run. Chase your personal best, daily seed and unlocks.

## Development

```sh
npm install
npm run dev
npm run check
```

The production build is in `dist/`. The GitHub Pages workflow deploys it on pushes to `main` or by manual dispatch. Enable GitHub Pages with GitHub Actions as the source; relative asset paths support both a repository path and a root domain.

See [CREDITS.md](CREDITS.md) for audio, fonts, libraries and full credits. Inspirations include *Rez* and Tetsuya Mizuguchi, *Peggle*, *Wordle*, and the freeze-frame and hit-flash timings of *Celeste* and *Hollow Knight*.

The code is licensed under the [MIT License](LICENSE).
