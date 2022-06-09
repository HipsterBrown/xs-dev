import { LitElement, html, css } from 'lit'

export const tagName = 'table-of-contents'

class TableOfContents extends LitElement {
  static properties = {
    headers: { type: Array },
    activeId: { state: true },
  }

  static styles = css`
    h2.heading {
      font-size: 1rem;
      font-weight: 700;
      padding: 0.1rem 1rem;
      text-transform: uppercase;
      margin-bottom: 0.5rem;
    }

    .header-link {
      font-size: 1rem;
      padding: 0.1rem 0 0.1rem 1rem;
      border-left: 4px solid var(--theme-divider);
    }

    .header-link:hover,
    .header-link:focus {
      border-left-color: var(--theme-accent);
      color: var(--theme-accent);
    }
    .header-link:focus-within {
      color: var(--theme-text-light);
      border-left-color: hsla(var(--color-gray-40), 1);
    }
    .header-link svg {
      opacity: 0.6;
    }
    .header-link:hover svg {
      opacity: 0.8;
    }
    .header-link a {
      display: inline-flex;
      gap: 0.5em;
      width: 100%;
      padding: 0.15em 0 0.15em 0;
    }

    .header-link.depth-3 {
      padding-left: 2rem;
    }
    .header-link.depth-4 {
      padding-left: 3rem;
    }

    .header-link a {
      font: inherit;
      color: inherit;
      text-decoration: none;
    }
    ul {
      list-style: none;
      padding: 0;
    }
  `

  constructor() {
    super()
    this.headers = []
    this.activeId = undefined
    this.itemOffsets = []
    this.getItemOffsets = this.getItemOffsets.bind(this)
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('resize', this.getItemOffsets)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    window.removeEventListener('resize', this.getItemOffsets)
  }

  private getItemOffsets() {
    const titles = document.querySelectorAll('article :is(h1, h2, h3, h4)')
    this.itemOffsets = Array.from(titles).map((title) => ({
      id: title.id,
      topOffset: title.getBoundingClientRect().top + window.scrollY,
    }))
  }

  render() {
    const headers = this.headers
      .filter(({ depth }) => depth > 1 && depth < 4)
      .map(
        (header) => html`
          <li
            class="header-link depth-${header.depth} ${this.activeId ===
            header.slug
              ? 'active'
              : ''}"
          >
            <a href="#${header.slug}">${header.text}</a>
          </li>
        `
      )
    return html`
      <h2 class="heading">On this page</h2>
      <ul>
        <li
          class="header-link depth-2 ${this.activeId === 'overview'
            ? 'active'
            : ''}"
        >
          <a href="#overview">Overview</a>
        </li>
        ${headers}
      </ul>
    `
  }
}

customElements.define('table-of-contents', TableOfContents)
