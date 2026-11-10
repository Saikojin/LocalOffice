Feature: LocalWriter Document Editor Tests

Background:
  * driver baseUrl

Scenario: Verify LocalWriter rich text editing and formatting
  * waitFor('[data-testid=brand-logo]')
  
  # 1. Verify Document Title
  * waitFor('[data-testid=writer-title-input]')
  * clear('[data-testid=writer-title-input]')
  * input('[data-testid=writer-title-input]', 'Karate QA Specification')
  * match value('[data-testid=writer-title-input]') == 'Karate QA Specification'

  # 2. Verify Editor Canvas & Word Count
  * waitFor('[data-testid=writer-editor-container]')
  * waitFor('.ProseMirror')
  * match text('[data-testid=writer-word-count]') contains 'words'

  # 3. Test Toolbar Formatting Actions
  * click('[data-testid=btn-bold]')
  * click('[data-testid=btn-italic]')
  * click('[data-testid=btn-code]')
  * click('[data-testid=btn-h1]')
  * click('[data-testid=btn-h2]')
  * click('[data-testid=btn-h3]')
  * click('[data-testid=btn-bullet-list]')
  * click('[data-testid=btn-ordered-list]')
  * click('[data-testid=btn-task-list]')

  # 4. Insert Table (3x3)
  * click('[data-testid=btn-insert-table]')
  * waitFor('.ProseMirror table')
  * match exists('.ProseMirror table') == true

  # 5. Insert Horizontal Rule Divider
  * click('[data-testid=btn-horizontal-rule]')
  * waitFor('.ProseMirror hr')
  * match exists('.ProseMirror hr') == true

  # 6. Test Undo / Redo
  * click('[data-testid=btn-undo]')
  * click('[data-testid=btn-redo]')

  # 7. Test Export Actions
  * waitFor('[data-testid=btn-save-docx]')
  * click('[data-testid=btn-save-docx]')
  
  * waitFor('[data-testid=btn-export-md]')
  * click('[data-testid=btn-export-md]')

  * print 'LocalWriter rich text tests completed successfully.'
