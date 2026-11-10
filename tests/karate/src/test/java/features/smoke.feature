Feature: Smoke Test

Background:
  * driver baseUrl

Scenario: Verify LocalOffice application loads in browser
  * waitFor('[data-testid=brand-logo]')
  * match text('[data-testid=brand-logo]') contains 'LocalOffice'
  * match text('[data-testid=status-tab-title]') == 'Document 1'
  * match text('[data-testid=zero-cloud-badge]') contains '100% Local-First'
  * print 'Smoke UI check succeeded!'
