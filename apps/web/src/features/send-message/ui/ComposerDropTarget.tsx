import { Paperclip } from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { testId, testIds } from '@/shared/lib/test-ids'

const hasFiles = (event: DragEvent | React.DragEvent) =>
  Array.from(event.dataTransfer?.types ?? []).includes('Files')

export const ComposerDropTarget = ({
  children,
  onFiles,
}: {
  children: ReactNode
  onFiles: (files: File[]) => void
}) => {
  const { t } = useTranslation()
  const [active, setActive] = useState(false)
  const depth = useRef(0)

  useEffect(() => {
    const preventFileNavigation = (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault()
    }
    window.addEventListener('dragover', preventFileNavigation)
    window.addEventListener('drop', preventFileNavigation)
    return () => {
      window.removeEventListener('dragover', preventFileNavigation)
      window.removeEventListener('drop', preventFileNavigation)
    }
  }, [])

  return (
    <fieldset
      {...testId(testIds.chat.composer.dropTarget)}
      className="relative m-0 min-w-0 border-0 p-0"
      aria-label={t('upload:dropFiles')}
      onDragEnter={(event) => {
        if (!hasFiles(event)) return
        event.preventDefault()
        depth.current += 1
        setActive(true)
      }}
      onDragOver={(event) => {
        if (!hasFiles(event)) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
      }}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1)
        if (depth.current === 0) setActive(false)
      }}
      onDrop={(event) => {
        if (!hasFiles(event)) return
        event.preventDefault()
        depth.current = 0
        setActive(false)
        onFiles(Array.from(event.dataTransfer.files))
      }}
    >
      {children}
      {active ? (
        <div
          {...testId(testIds.chat.composer.dropOverlay)}
          className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-3xl border-2 border-dashed border-primary bg-background/95 text-sm font-medium text-primary"
        >
          <span className="flex items-center gap-2">
            <Paperclip aria-hidden="true" className="size-4" />
            {t('upload:dropFiles')}
          </span>
        </div>
      ) : null}
    </fieldset>
  )
}
