Feature: LocalPDF Studio Tests

Background:
  * driver baseUrl

Scenario: Verify LocalPDF Studio vector rendering, annotations, whiteout, and reflow editing
  * waitFor('[data-testid=brand-logo]')

  # 1. Open PDF Studio Canvas via Command Palette
  * click('[data-testid=btn-command-palette]')
  * waitFor('[data-testid=command-palette-modal]')
  * waitFor('[data-testid=command-item-new-pdf]')
  * click('[data-testid=command-item-new-pdf]')

  # 2. Verify PDF Canvas and Thumbnails
  * waitFor('[data-testid=pdf-canvas-container]')
  * waitFor('[data-testid=pdf-main-canvas]')
  * waitFor('[data-testid=pdf-thumbnail-1]')
  * match text('[data-testid=pdf-page-indicator]') contains '1 /'

  # 3. Test Zoom Controls
  * click('[data-testid=btn-pdf-zoom-in]')
  * match text('[data-testid=pdf-zoom-level]') contains '%'
  * click('[data-testid=btn-pdf-zoom-out]')

  # 4. Add In-Place Text Annotation
  * click('[data-testid=btn-pdf-add-text]')
  * waitFor('[data-testid=pdf-tool-banner]')
  * click('[data-testid=pdf-canvas-container]')
  
  # Wait for inline input, clear placeholder, enter custom text and commit
  * waitFor('[data-testid=pdf-annotation-input]')
  * clear('[data-testid=pdf-annotation-input]')
  * input('[data-testid=pdf-annotation-input]', ['Verified by Karate Framework', Key.ENTER])
  
  # Verify placed text annotation
  * waitFor('[data-testid=pdf-annotation-display]')
  * match text('[data-testid=pdf-annotation-display]') == 'Verified by Karate Framework'

  # 5. Select Annotation and Test Toolbar (Whiteout, Font Size, Color)
  * click('[data-testid=pdf-annotation-display]')
  * waitFor('[data-testid=pdf-annotation-toolbar]')
  * click('[data-testid=btn-pdf-whiteout-toggle]')
  * click('[data-testid=btn-pdf-fontsize-18]')
  * click('[data-testid=btn-pdf-color-blue]')

  # 6. Save PDF
  * click('[data-testid=btn-save-pdf]')

  # 7. Convert PDF into LocalWriter for Reflow Editing
  * click('[data-testid=btn-pdf-edit-in-writer]')
  * waitFor('.ProseMirror')
  * match text('[data-testid=status-tab-title]') contains '(Editable)'

  * print 'LocalPDF Studio vector and annotation tests completed successfully.'
