set -ex

rm -r dist
pnpm run build
cp package.json ./dist
cp readme.md ./dist

cd dist
pnpm publish --access public --git-checks false