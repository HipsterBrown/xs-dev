import { type Component, createSignal, onMount, onCleanup } from 'solid-js';
import type { MarkdownHeading } from 'astro'

const TableOfContents: Component<{ headings: MarkdownHeading[] }> = ({
  headings = [],
}) => {
  let itemOffsets = []
  const [activeId] = createSignal<string>(undefined)
  const getItemOffsets = () => {
    const titles = document.querySelectorAll('article :is(h1, h2, h3, h4)')
    itemOffsets = Array.from(titles).map((title) => ({
      id: title.id,
      topOffset: title.getBoundingClientRect().top + window.scrollY,
    }))
  }
  onMount(() => {
    getItemOffsets()
    window.addEventListener('resize', getItemOffsets)
  })

  onCleanup(() => {
    if (typeof window !== 'undefined' && 'removeEventListener' in window) {
      window.removeEventListener('resize', getItemOffsets)
    }
  })

  return (
    <>
      <h2 class="heading">On this page</h2>
      <ul>
        <li
          class={`header-link depth-2 ${activeId() === 'overview' ? 'active' : ''
            }`.trim()}
        >
          <a href="#overview">Overview</a>
        </li>
        {headings
          .filter(({ depth }) => depth > 1 && depth < 4)
          .map((header) => (
            <li
              class={`header-link depth-${header.depth} ${activeId() === header.slug ? 'active' : ''
                }`.trim()}
            >
              <a href={`#${header.slug}`}>{header.text}</a>
            </li>
          ))}
      </ul>
    </>
  )
}

export default TableOfContents
