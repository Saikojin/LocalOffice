Feature: LocalSheets Spreadsheet Tests

Background:
  * driver baseUrl

Scenario: Verify LocalSheets reactive formulas, grid editing, and workbook management
  * waitFor('[data-testid=brand-logo]')

  # 1. Open New Spreadsheet via Command Palette
  * click('[data-testid=btn-command-palette]')
  * waitFor('[data-testid=command-palette-modal]')
  * waitFor('[data-testid=command-item-new-sheets]')
  * click('[data-testid=command-item-new-sheets]')

  # 2. Verify Workbook Tab and Title
  * waitFor('[data-testid=sheets-title-input]')
  * match value('[data-testid=sheets-title-input]') contains 'Workbook'

  # 3. Verify Default Grid Data & Evaluated Formulas
  * waitFor('[data-testid=cell-A1]')
  * match text('[data-testid=cell-A1]') == 'Item'
  * match text('[data-testid=cell-B1]') == 'Quantity'
  * match text('[data-testid=cell-C1]') == 'Unit Price'
  * match text('[data-testid=cell-D1]') == 'Total'

  * match text('[data-testid=cell-A2]') == 'Laptops'
  * match text('[data-testid=cell-B2]') == '5'
  * match text('[data-testid=cell-C2]') == '899'
  * match text('[data-testid=cell-D2]') == '4495'

  * match text('[data-testid=cell-A5]') == 'Grand Total'
  * match text('[data-testid=cell-D5]') == '6930'

  # 4. Verify Cell Selection & Formula Bar Display
  * click('[data-testid=cell-D5]')
  * match text('[data-testid=sheets-active-cell]') == 'D5'
  * match value('[data-testid=sheets-formula-input]') == '=SUM(D2:D4)'

  # 5. Reactive Formula Recalculation: Change B2 from 5 to 10
  * click('[data-testid=cell-B2]')
  * match text('[data-testid=sheets-active-cell]') == 'B2'
  * clear('[data-testid=sheets-formula-input]')
  * input('[data-testid=sheets-formula-input]', ['10', Key.ENTER])
  
  # Verify dynamic recalculation in D2 (10 * 899 = 8990) and Grand Total in D5 (11425)
  * waitForText('[data-testid=cell-D2]', '8990')
  * waitForText('[data-testid=cell-D5]', '11425')

  # 6. Test AutoSum Function Trigger
  * click('[data-testid=cell-D6]')
  * click('[data-testid=btn-autosum]')

  # 7. Test Sheet Management (Add Sheet2, Switch Back)
  * click('[data-testid=btn-add-sheet]')
  * waitFor('[data-testid=sheet-tab-Sheet2]')
  * click('[data-testid=sheet-tab-Sheet1]')
  * match text('[data-testid=cell-A2]') == 'Laptops'

  # 8. Test Export Actions
  * click('[data-testid=btn-save-xlsx]')
  * click('[data-testid=btn-export-csv]')

  * print 'LocalSheets reactive calculation tests completed successfully.'
