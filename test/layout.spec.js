'use strict'

const fs = require('node:fs/promises')
const { test, expect } = require('@playwright/test')

const desktopWidths = [798, 800, 1024]
const narrowWidths = [320, 768, 797]

async function openAt (page, width) {
  await page.setViewportSize({ width, height: 900 })
  await page.goto('/')
  await expect(page).toHaveTitle('js-tetris')
  await expect(page.locator('#tetris-banner')).toBeVisible()
  await expect(page.locator('#game-start-pause')).toBeVisible()
  await expect(page.locator('#game-restart')).toBeVisible()
  await expect(page.locator('#game-status-state')).toHaveText('Paused')
  await expect(page.locator('#game-live-status')).toHaveAttribute('aria-live', 'polite')
}

async function panelRects (page) {
  return page.evaluate(() => {
    const rect = function (selector) {
      const bounds = document.querySelector(selector).getBoundingClientRect()
      return {
        top: bounds.top,
        right: bounds.right,
        bottom: bounds.bottom,
        left: bounds.left,
        width: bounds.width
      }
    }

    return {
      controls: rect('#public-controls'),
      gameplay: rect('#gameplay'),
      scores: rect('#high-scores')
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

  if (width === 320 || width === 1024) {
    await page.screenshot({
      path: testInfo.outputPath(`js-tetris-${width}px.png`),
      fullPage: true
    })
  }
}

for (const width of desktopWidths) {
  test(`desktop keeps Controls, Play, and High Scores in one row at ${width}px`, async ({ page }, testInfo) => {
    await openAt(page, width)
    const layout = await panelRects(page)
    await attachEvidence(page, testInfo, width, layout)

    expect(layout.controls.top).toBe(layout.gameplay.top)
    expect(layout.gameplay.top).toBe(layout.scores.top)
    expect(layout.controls.left).toBeLessThan(layout.gameplay.left)
    expect(layout.gameplay.left).toBeLessThan(layout.scores.left)
    expect(layout.gameplay.right).toBeLessThanOrEqual(layout.scores.left)
  })
}

for (const width of narrowWidths) {
  test(`narrow layout is ordered, unclipped, and keyboard reachable at ${width}px`, async ({ page }, testInfo) => {
    await openAt(page, width)
    const layout = await panelRects(page)
    await attachEvidence(page, testInfo, width, layout)

    expect(layout.controls.top).toBeLessThan(layout.gameplay.top)
    expect(layout.gameplay.top).toBeLessThan(layout.scores.top)

    const clipping = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      panelFlexBasis: Array.from(document.querySelectorAll('.panel'), panel => window.getComputedStyle(panel).flexBasis)
    }))
    expect(clipping.documentWidth).toBeLessThanOrEqual(clipping.viewportWidth)
    expect(clipping.panelFlexBasis).toEqual(['100%', '100%', '100%'])

    await page.evaluate(() => document.activeElement.blur())
    await page.keyboard.press('Tab')
    await expect(page.locator('#game-start-pause')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.locator('#game-restart')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.locator('#canvas')).toBeFocused()
  })
}
