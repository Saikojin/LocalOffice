Feature: Shell and Navigation Tests

Background:
  * driver baseUrl

Scenario: Verify tab management, Command Palette, and theme switching
  * waitFor('[data-testid=brand-logo]')

  # 1. Multi-Tab Management
  * waitFor('[data-testid=tabs-container]')
  * match text('[data-testid=status-tab-title]') == 'Document 1'
  
  # Create a new tab via "+" button
  * click('[data-testid=btn-new-tab]')
  * waitForText('[data-testid=status-tab-title]', 'Document 2')
  
  # Switch back to Document 1
  * click('[data-testid=tab-1]')
  * waitForText('[data-testid=status-tab-title]', 'Document 1')

  # 2. Command Palette Modal & Filtering
  * click('[data-testid=btn-command-palette]')
  * waitFor('[data-testid=command-palette-modal]')
  * waitFor('[data-testid=command-palette-input]')
  
  # Search for Theme in Command Palette
  * input('[data-testid=command-palette-input]', 'Theme')
  * waitFor('[data-testid=command-item-toggle-theme]')
  * click('[data-testid=btn-command-palette-close]')
  * waitUntil("!document.querySelector('[data-testid=command-palette-modal]')")

  # 3. Theme Toggle (Dark / Light Mode)
  * waitFor('[data-testid=app-root]')
  * def rootClass1 = attribute('[data-testid=app-root]', 'class')
  * match rootClass1 contains 'dark'

  # Switch to Light Theme
  * click('[data-testid=btn-theme-toggle]')
  * def rootClass2 = attribute('[data-testid=app-root]', 'class')
  * match rootClass2 !contains 'dark'

  # Switch back to Dark Theme
  * click('[data-testid=btn-theme-toggle]')
  * def rootClass3 = attribute('[data-testid=app-root]', 'class')
  * match rootClass3 contains 'dark'

  # 4. Command Palette Action Execution
  * click('[data-testid=btn-command-palette]')
  * waitFor('[data-testid=command-palette-modal]')
  * input('[data-testid=command-palette-input]', 'Spreadsheet')
  * waitFor('[data-testid=command-item-new-sheets]')
  * click('[data-testid=command-item-new-sheets]')
  * waitFor('[data-testid=sheets-grid-viewport]')

  * print 'Shell and navigation tests completed successfully.'
