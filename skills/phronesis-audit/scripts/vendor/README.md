# Bundled YAML parser

`yaml.mjs` is yaml 2.9.1, bundled from its browser ESM entry with esbuild 0.27.4.
The ISC license is in `YAML-LICENSE`. No packages need installing to run the audit.
Source and API documentation: https://github.com/eemeli/yaml and https://eemeli.org/yaml/.

Rebuild in a temporary directory with these pinned packages:

```sh
npm install --ignore-scripts --no-audit --no-fund yaml@2.9.1 esbuild@0.27.4
./node_modules/.bin/esbuild node_modules/yaml/browser/index.js --bundle --format=esm --platform=node --target=node18 --charset=ascii --minify --outfile=yaml.mjs
```

Copy the result and yaml's license into this directory. Review dependency changes and
run the repository checks and tests before committing. The bundle is minified to keep
plugin distribution small; the pinned upstream source is the readable implementation.
