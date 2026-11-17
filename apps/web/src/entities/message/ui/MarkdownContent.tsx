import { useId } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CopyButton } from '@/shared/ui/copy-button'

const Code = ({ className, children }: React.ComponentProps<'code'>) => {
  const targetId = useId()
  const value = String(children).replace(/\n$/, '')
  if (!className) return <code className="inline-code">{children}</code>
  return (
    <>
      <span className="absolute right-2 top-2">
        <CopyButton text={value} targetId={targetId} />
      </span>
      <code id={targetId} className={className}>
        {value}
      </code>
    </>
  )
}

export const MarkdownContent = ({ text }: { text: string }) => (
  <div className="markdown-body">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      skipHtml
      components={{
        code: Code,
        pre: ({ children }) => (
          <section className="code-region" aria-label="Блок кода">
            <pre className="group/code">{children}</pre>
          </section>
        ),
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noreferrer noopener">
            {children}
          </a>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  </div>
)
