import { type Component, createSignal, For, onMount } from 'solid-js';
import Fuse from 'fuse.js'
import './Search.css'

const SearchForm: Component = () => {
  let fuse: null | Fuse<{ url: string, title: string }> = null;
  const [results, setResults] = createSignal([]);

  const searchContent = (event: SubmitEvent) => {
    event.preventDefault()
    const { search } = Object.fromEntries(
      new FormData(event.currentTarget as HTMLFormElement)
    )
    const result = fuse.search(search as string)
    setResults(result.map(({ item }) => item))
  }

  onMount(async () => {
    const content = await fetch('/search-index.json')
      .then((res) => res.json())
    const options = { keys: ['title', 'description', 'content'] }
    fuse = new Fuse(content, options)
  })

  return (
    <div class="flex flex-column SearchContainer">
      <form method="get" id="search-form" onSubmit={searchContent}>
        <div role="search" class="flex flex-row">
          <input
            type="search"
            id="search"
            name="search"
            aria-label="search documentation content"
            placeholder="search documentation content"
            class="SearchContainer-input"
          />
          <button type="submit" class="SearchContainer-button">
            Search
          </button>
        </div>
      </form>
      <ul
        classList={{ 'SearchContainer-list': true, 'has-results': results().length > 0 }}
        aria-live="assertive"
        aria-atomic="true"
      >
        <For each={results()}>
          {(result) => (
            <li class="SearchContainer-list_item">
              <a href={result.url} class="SearchContainer-link">
                {result.title}
              </a>
            </li>
          )}
        </For>
      </ul>
    </div>
  )
}

export default SearchForm
