const { app, nativeImage } = require('electron')
const { join } = require('path')
app.whenReady().then(() => {
  const path = join(__dirname, 'release/mac-arm64/EasyTerminal.app/Contents/Resources/app.asar/dist/icon.png')
  const img = nativeImage.createFromPath(path)
  console.log('Is Empty:', img.isEmpty())
  app.quit()
})
