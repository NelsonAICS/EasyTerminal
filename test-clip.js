const { app, clipboard } = require('electron');

app.whenReady().then(() => {
  console.log("Current clipboard:", clipboard.readText());
  setTimeout(() => app.quit(), 500);
});
