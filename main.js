// Bu dosyayı çalıştırmak için terminalde "npm start" komutunu kullanabilirsiniz.
// Bu dosyayı çalıştırdığınızda index.html dosyası açılacaktır.
// Width ve Height değerlerini değiştirerek pencerenin boyutunu ayarlayabilirsiniz.
// Kullanım isteğine göre değiştirilebilir .html dosyası belirtilmelidir.



const { app, BrowserWindow } = require('electron');
require('./server');

app.whenReady().then(() => {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true
        }
    });

    mainWindow.loadFile('index.html');
});
