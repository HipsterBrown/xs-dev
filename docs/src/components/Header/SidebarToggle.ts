import {
  LitElement,
  css,
  html,
  PropertyDeclarations,
  CSSResultGroup,
  PropertyValueMap,
} from 'lit'

export const tagName = 'menu-toggle'

class MenuToggle extends LitElement {
  static properties: PropertyDeclarations = {
    sidebarShown: { state: true, type: Boolean },
  }

  static styles?: CSSResultGroup = css`
    button {
      display: flex;
      align-items: center;
      justify-items: center;
      gap: 0.25em;
      padding: 0.33em 0.67em;
      border: 0;
      background: var(--theme-bg);
      font-size: 1rem;
      border-radius: 99em;
      color: var(--theme-text);
      background-color: var(--theme-bg);
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }
  `

  constructor() {
    super()
    this.sidebarShown = false
  }

  protected updated(
    _changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    if (_changedProperties.has('sidebarShown')) {
      const body = document.getElementsByTagName('body')[0]
      if (this.sidebarShown) {
        body.classList.add('mobile-sidebar-toggle')
      } else {
        body.classList.remove('mobile-sidebar-toggle')
      }
    }
  }

  render() {
    return html`
      <button
        type="button"
        aria-pressed=${this.sidebarShown ? 'true' : 'false'}
        id="menu-toggle"
        @click=${() => (this.sidebarShown = !this.sidebarShown)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="1em"
          height="1em"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
        <span class="sr-only">Toggle sidebar</span>
      </button>
    `
  }
}

customElements.define(tagName, MenuToggle)
