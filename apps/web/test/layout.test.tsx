import '../src/shared/config/i18n'
import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { ContextPanel } from '../src/shared/ui/context-panel'
import { PagePlaceholder } from '../src/shared/ui/page-placeholder'
import { SettingsField } from '../src/shared/ui/settings-field'
import { SettingsSection } from '../src/shared/ui/settings-section'
import { WorkspaceHeader } from '../src/shared/ui/workspace-header'

test('provides shared context, workspace and settings layouts', () => {
  const panel = renderToStaticMarkup(
    <ContextPanel title="Чаты" search={<input aria-label="Поиск" />}>
      <nav>Разделы</nav>
    </ContextPanel>,
  )
  expect(panel).toContain('<aside')
  expect(panel).toContain('Чаты')
  expect(panel).toContain('Поиск')

  const workspace = renderToStaticMarkup(<WorkspaceHeader>Каталог</WorkspaceHeader>)
  expect(workspace).toContain('<header')
  expect(workspace).toContain('<h1')

  const settings = renderToStaticMarkup(
    <SettingsSection title="Профиль">
      <SettingsField name="name" label="Имя" description="Подсказка">
        <input id="name" />
      </SettingsField>
    </SettingsSection>,
  )
  expect(settings).toContain('for="name"')
  expect(settings).toContain('id="name-hint"')
})

test('shows stable page-shaped placeholders instead of spinners', () => {
  const markup = renderToStaticMarkup(<PagePlaceholder variant="catalog" />)
  expect(markup).toContain('aria-busy="true"')
  expect(markup).toContain('data-slot="skeleton"')
  expect(markup).not.toContain('animate-spin')
})
