#!/bin/sh

set -eu

repository_root=$(git rev-parse --show-toplevel)
cd "$repository_root"

git config core.hooksPath .githooks
printf '%s\n' 'Hooks do Git configurados em .githooks.'
printf '%s\n' 'A validacao local de mensagens de commit esta habilitada.'
