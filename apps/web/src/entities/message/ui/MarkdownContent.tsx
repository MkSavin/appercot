import { Children, useId } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CopyButton } from '@/shared/ui/copy-button'
import { CommandText, type CommandTextProps } from './CommandText'

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

export const MarkdownContent = ({
  text,
  commands,
  onCommand,
}: CommandTextProps & { text: string }) => {
  const makeTag =
    (
      Tag:
        | 'p'
        | 'li'
        | 'strong'
        | 'em'
        | 'del'
        | 'td'
        | 'th'
        | 'h1'
        | 'h2'
        | 'h3'
        | 'h4'
        | 'h5'
        | 'h6',
    ) =>
    ({
      children,
      className,
      style,
    }: Pick<React.ComponentProps<'p'>, 'children' | 'className' | 'style'>) => (
      <Tag className={className} style={style}>
        {Children.map(children, (child) =>
          typeof child === 'string' ? (
            <CommandText text={child} commands={commands} onCommand={onCommand} />
          ) : (
            child
          ),
        )}
      </Tag>
    )
  const textTags: Components = {
    p: makeTag('p'),
    li: makeTag('li'),
    strong: makeTag('strong'),
    em: makeTag('em'),
    del: makeTag('del'),
    td: makeTag('td'),
    th: makeTag('th'),
    h1: makeTag('h1'),
    h2: makeTag('h2'),
    h3: makeTag('h3'),
    h4: makeTag('h4'),
    h5: makeTag('h5'),
    h6: makeTag('h6'),
  }
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          ...textTags,
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
}
