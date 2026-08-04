'use strict'

const { defineConfig } = require('@playwright/test')

module.exports = defineConfig({
  testDir: './test',
  testMatch: 'layout.spec.js',
  outputDir: 'test-results',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    headless: true
  },
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false
  }
})
