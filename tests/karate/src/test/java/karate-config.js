function fn() {
  var baseUrl = karate.properties['baseUrl'] || 'http://127.0.0.1:3000';
  var isHeadless = karate.properties['headless'] !== 'false';

  var config = {
    baseUrl: baseUrl,
    isHeadless: isHeadless
  };

  var osName = java.lang.System.getProperty('os.name').toLowerCase();
  var chromePath = null;
  if (osName.indexOf('win') >= 0) {
    var possiblePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    for (var i = 0; i < possiblePaths.length; i++) {
      var file = new java.io.File(possiblePaths[i]);
      if (file.exists()) {
        chromePath = possiblePaths[i];
        break;
      }
    }
  }

  var driverConfig = {
    type: 'chrome',
    showDriverLog: false,
    headless: isHeadless,
    addOptions: [
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--window-size=1440,900'
    ]
  };

  if (chromePath) {
    driverConfig.executable = chromePath;
  }

  karate.configure('driver', driverConfig);

  return config;
}
