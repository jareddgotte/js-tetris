'use strict'

const fs = require('node:fs/promises')
const { test, expect } = require('@playwright/test')

const desktopWidths = [712, 754, 1024]
const narrowWidths = [320, 711]

async function openAt (page, width) {
  await page.setViewportSize({ width, height: 900 })
  await page.goto('/')
  await expect(page).toHaveTitle('js-tetris')
  await expect(page.locator('#tetris-banner')).toBeVisible()
}

async function layoutEvidence (page) {
  return page.evaluate(() => {
    const rect = function (selector) {
      const bounds = document.querySelector(selector).getBoundingClientRect()
      return {
        top: bounds.top,
        right: bounds.right,
        bottom: bounds.bottom,
        left: bounds.left,
        width: bounds.width,
        height: bounds.height
      }
    }

    const canvas = document.querySelector('#canvas')
    return {
      main: rect('#main'),
      controls: rect('#public-controls'),
      canvas: rect('#canvas'),
      scores: rect('#high-scores'),
      canvasIsDirectMainChild: canvas.parentElement.id === 'main',
      hasVisiblePlayPanel: Boolean(document.querySelector('#gameplay'))
    }
  })
}

async function attachEvidence (page, testInfo, width, layout) {
  const evidence = {
    browser: `Chromium ${page.context().browser().version()}`,
    cssViewport: page.viewportSize(),
    devicePixelRatio: await page.evaluate(() => window.devicePixelRatio),
    zoom: '100% (fresh browser context default)',
    visualViewportScale: await page.evaluate(() => window.visualViewport.scale),
    layout
  }

  const evidencePath = testInfo.outputPath('computed-layout.json')
  await fs.writeFile(evidencePath, JSON.stringify(evidence, null, 2))
  await testInfo.attach('computed-layout.json', {
    path: evidencePath,
    contentType: 'application/json'
  })

  if (width === 320 || width === 754 || width === 1024) {
    await page.screenshot({
      path: testInfo.outputPath(`js-tetris-${width}px.png`),
      fullPage: true
    })
  }
}

for (const width of desktopWidths) {
  test(`desktop restores compact Controls, canvas, and High Scores columns at ${width}px`, async ({ page }, testInfo) => {
    await openAt(page, width)
    const layout = await layoutEvidence(page)
    await attachEvidence(page, testInfo, width, layout)

    expect(layout.canvasIsDirectMainChild).toBe(true)
    expect(layout.hasVisiblePlayPanel).toBe(false)
    expect(layout.controls.top).toBe(layout.canvas.top)
    expect(layout.canvas.top).toBe(layout.scores.top)
    expect(layout.controls.left).toBeLessThan(layout.canvas.left)
    expect(layout.canvas.left).toBeLessThan(layout.scores.left)
    expect(layout.controls.width).toBe(254)
    expect(layout.canvas.width).toBe(200)
    expect(layout.scores.width).toBe(254)
    expect(layout.main.width).toBe(712)
  })
}

for (const width of narrowWidths) {
  test(`narrow historical composition is ordered and unclipped at ${width}px`, async ({ page }, testInfo) => {
    await openAt(page, width)
    const layout = await layoutEvidence(page)
    await attachEvidence(page, testInfo, width, layout)

    expect(layout.canvasIsDirectMainChild).toBe(true)
    expect(layout.hasVisiblePlayPanel).toBe(false)
    expect(layout.controls.top).toBeLessThan(layout.canvas.top)
    expect(layout.canvas.top).toBeLessThan(layout.scores.top)

    const clipping = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth
    }))
    expect(clipping.documentWidth).toBeLessThanOrEqual(clipping.viewportWidth)
    expect(layout.controls.left).toBeGreaterThanOrEqual(0)
    expect(layout.scores.right).toBeLessThanOrEqual(width)
  })
}

test('page exposes an honest minimal nonvisual Tetris description without the rejected visible redesign', async ({ page }) => {
  await openAt(page, 754)

  await expect(page.locator('h1')).toHaveAccessibleName('Tetris')
  await expect(page.locator('#canvas')).toHaveAttribute('aria-label', 'Tetris game canvas')
  await expect(page.locator('#canvas')).toHaveAttribute('aria-describedby', 'game-instructions')
  await expect(page.locator('#game-instructions')).toContainText('visual Tetris game')
  await expect(page.locator('#game-instructions')).toContainText('Up Arrow')
  await expect(page.locator('#game-instructions')).toContainText('Space')
  await expect(page.locator('#game-instructions')).toContainText('P or S')
  await expect(page.locator('#game-instructions')).toContainText('R')

  await expect(page.locator('#gameplay, #gameplay-title, .game-actions, #game-fallback, #game-status, #game-live-status')).toHaveCount(0)
  await expect(page.locator('button')).toHaveCount(0)
  await expect(page.locator('[aria-live]')).toHaveCount(0)

  await page.evaluate(() => document.activeElement.blur())
  await page.keyboard.press('Tab')
  await expect(page.locator('#canvas')).toBeFocused()
})
