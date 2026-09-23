// Learn more https://docs.expo.dev/guides/customizing-metro
const path = require('node:path')
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// ../shared holds the domain code used by both the web app and this one
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '../shared')]

module.exports = config
