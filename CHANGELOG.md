# Changelog

## [0.11.1](https://github.com/hesedcasa/jira/compare/v0.11.0...v0.11.1) (2026-08-11)


### ♻️ Chores

* upgrade ESLint and fix TypeScript compilation errors ([#116](https://github.com/hesedcasa/jira/issues/116)) ([20056e3](https://github.com/hesedcasa/jira/commit/20056e395a9fb3059720e8a96b8fdbadf385ba35))

## [0.11.0](https://github.com/hesedcasa/jira/compare/v0.10.3...v0.11.0) (2026-07-30)


### 🎉 Features

* add HTTP/HTTPS proxy support for Jira and Agile API clients ([#108](https://github.com/hesedcasa/jira/issues/108)) ([d8fb6f5](https://github.com/hesedcasa/jira/commit/d8fb6f58e5bb64b5c7f1c67be4bd721c120985f7))
* upgrade @hesed/plugin-lib to 0.11.0 ([18a22df](https://github.com/hesedcasa/jira/commit/18a22df0f7954b0d68a83a2317687a49739c6e32))
* upgrade @hesed/plugin-lib to 0.12.0 ([d05cf3d](https://github.com/hesedcasa/jira/commit/d05cf3dab8769d9ed565a199a7c9fb9f94617d73))

## [0.10.3](https://github.com/hesedcasa/jira/compare/v0.10.2...v0.10.3) (2026-06-26)


### ♻️ Chores

* rename command files to index.ts and add topic descriptions ([#95](https://github.com/hesedcasa/jira/issues/95)) ([2a8f196](https://github.com/hesedcasa/jira/commit/2a8f196bbc8e286633f7acbaad9c14c086f85ea3))

## [0.10.2](https://github.com/hesedcasa/jira/compare/v0.10.1...v0.10.2) (2026-06-25)


### ♻️ Chores

* introduce BaseCommand to centralize run() return and JSON output ([#89](https://github.com/hesedcasa/jira/issues/89)) ([6ac7539](https://github.com/hesedcasa/jira/commit/6ac7539f4f0088db7ee14e36996eadea8e675fa9))

## [0.10.1](https://github.com/hesedcasa/jira/compare/v0.10.0...v0.10.1) (2026-06-05)


### 🛠️ Fixes

* pass jira-config.json to createProfileManager in all commands ([f9284e2](https://github.com/hesedcasa/jira/commit/f9284e2d5171f4e3861fc647c46ea31f24fa0794))

## [0.10.0](https://github.com/hesedcasa/jira/compare/v0.9.0...v0.10.0) (2026-06-04)


### 🎉 Features

* upgrade @hesed/plugin-lib to v0.9.0 and pass configFile to auth commands ([7143a2d](https://github.com/hesedcasa/jira/commit/7143a2d23d54493bfc8884a81c9bbd605135699d))

## [0.9.0](https://github.com/hesedcasa/jira/compare/v0.8.1...v0.9.0) (2026-05-27)


### 🎉 Features

* add auth delete command to clear saved credentials ([#73](https://github.com/hesedcasa/jira/issues/73)) ([7d5319a](https://github.com/hesedcasa/jira/commit/7d5319a9cc325c3d7e5860264d998785d9cbeb47))


### ♻️ Chores

* migrate auth commands and format to @hesed/plugin-lib ([#72](https://github.com/hesedcasa/jira/issues/72)) ([e0b496d](https://github.com/hesedcasa/jira/commit/e0b496d8be51f5a75adda8bec1b5e88657f1f742))

## [0.8.1](https://github.com/hesedcasa/jira/compare/v0.8.0...v0.8.1) (2026-05-14)


### 🛠️ Fixes

* use outputJSON instead of writeJSON to create missing directories ([#66](https://github.com/hesedcasa/jira/issues/66)) ([c007561](https://github.com/hesedcasa/jira/commit/c0075619136004ec32a661d6c66a6da69cb87fb6))

## [0.8.0](https://github.com/hesedcasa/jira/compare/v0.7.1...v0.8.0) (2026-05-11)


### 🎉 Features

* add --parent flag to comment command for threaded replies ([#64](https://github.com/hesedcasa/jira/issues/64)) ([04df65d](https://github.com/hesedcasa/jira/commit/04df65d38351dc959ffd586947674856fe0cdb92))

## [0.7.1](https://github.com/hesedcasa/jira/compare/v0.7.0...v0.7.1) (2026-05-10)


### 🛠️ Fixes

* validate profile exists in auth update and consolidate eslint config ([#62](https://github.com/hesedcasa/jira/issues/62)) ([37533ba](https://github.com/hesedcasa/jira/commit/37533bac5d9e4a9754128c53834a6914b6d3251a))

## [0.7.0](https://github.com/hesedcasa/jira/compare/v0.6.1...v0.7.0) (2026-05-10)


### 🎉 Features

* add multi-profile authentication support ([#60](https://github.com/hesedcasa/jira/issues/60)) ([030d8f5](https://github.com/hesedcasa/jira/commit/030d8f5227f8db191a284c78195a86bca05b444d))

## [0.6.1](https://github.com/hesedcasa/jira/compare/v0.6.0...v0.6.1) (2026-04-28)


### 🛠️ Fixes

* correct command examples with wrong argument order and missing arguments ([#50](https://github.com/hesedcasa/jira/issues/50)) ([37c6373](https://github.com/hesedcasa/jira/commit/37c6373201698cd00d7f5d0164a290a47dcdb8b1))

## [0.6.0](https://github.com/hesedcasa/jira/compare/v0.5.0...v0.6.0) (2026-04-22)


### 🎉 Features

* support OAuth2 access token authentication alongside basic auth ([#43](https://github.com/hesedcasa/jira/issues/43)) ([3e57b6c](https://github.com/hesedcasa/jira/commit/3e57b6c683245cd7dec0b3d0b3a346b3ee9366cf))

## [0.5.0](https://github.com/hesedcasa/jira/compare/v0.4.0...v0.5.0) (2026-03-30)


### 🎉 Features

* add issue dev command to fetch development detail from Jira ([#29](https://github.com/hesedcasa/jira/issues/29)) ([865ca12](https://github.com/hesedcasa/jira/commit/865ca1234939c28d61389880b62c5157068961b4))

## [0.4.0](https://github.com/hesedcasa/jira/compare/v0.3.0...v0.4.0) (2026-03-27)


### 🎉 Features

* dynamically detect ADF fields when updating issues ([#27](https://github.com/hesedcasa/jira/issues/27)) ([a8c7dbe](https://github.com/hesedcasa/jira/commit/a8c7dbe30da71f99dd2623e7bbf906e552d581fa))

## [0.3.0](https://github.com/hesedcasa/jira/compare/v0.2.1...v0.3.0) (2026-03-19)


### 🎉 Features

* add --attach flag to issue comment command for inline media ([#16](https://github.com/hesedcasa/jira/issues/16)) ([c6bf86b](https://github.com/hesedcasa/jira/commit/c6bf86bdd01ed54e068794d650dbbcfec54cf2b0))

## [0.2.1](https://github.com/hesedcasa/jira/compare/v0.2.0...v0.2.1) (2026-03-04)


### 🛠️ Fixes

* remove unused oclif plugin ([bba39ee](https://github.com/hesedcasa/jira/commit/bba39ee1277419f26b5132b3a5a6bf50097ffab8))

## [0.2.0](https://github.com/hesedcasa/jira/compare/v0.1.0...v0.2.0) (2026-02-27)


### 🎉 Features

* initial commit ([8897fcd](https://github.com/hesedcasa/jira/commit/8897fcd106308fda545af023813e3752b8ca0265))

## Changelog


All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
