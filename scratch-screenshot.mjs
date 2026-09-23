import { chromium } from 'playwright'

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(process.argv[2] || 'http://127.0.0.1:5173')
await page.waitForTimeout(500)
await page.screenshot({ path: process.argv[3] || '/tmp/claude-0/-home-user-ferias-out/0ff7ee32-c98d-5125-879c-a69d0eaf4147/scratchpad/shot.png', fullPage: true })
await browser.close()
