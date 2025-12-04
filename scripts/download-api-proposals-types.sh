npx @vscode/dts dev

find . -type f -regex '.*vscode\.proposed.*' -not -path '*/node_modules/*' \
  -exec mv -f {} ./src/types/ \;
