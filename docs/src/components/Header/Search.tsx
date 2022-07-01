import type { FunctionalComponent } from 'preact'
import { h, Fragment } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import Fuse from 'fuse.js'
import './Search.css'

const SearchForm: FunctionalComponent = () => {
  const fuse = useRef(null)
  const [results, setResults] = useState([])

  const searchContent = (event: SubmitEvent) => {
    event.preventDefault()
    const data = Object.fromEntries(
      new FormData(event.currentTarget as HTMLFormElement)
    )
    const result = fuse.current.search(data.search)
    setResults(result.map(({ item }) => item))
  }

  useEffect(() => {
    fetch('/xs-dev/search-index.json')
      .then((res) => res.json())
      .then((content) => {
        const options = { keys: ['title', 'description', 'content'] }
        fuse.current = new Fuse(content, options)
      })
  }, [])

  return (
    <div class="flex flex-column" id="search-container">
      <form method="GET" id="search-form" onSubmit={searchContent}>
        <div role="search" class="flex flex-row">
          <input
            type="search"
            id="search"
            name="search"
            aria-label="search documentation content"
            placeholder="search documentation content"
          />
          <button type="submit">Search</button>
        </div>
      </form>
      <ul
        class={results.length > 0 ? 'has-results' : undefined}
        aria-live="assertive"
        aria-atomic="true"
      >
        {results.map((result) => (
          <li>
            <a href={result.url}>{result.title}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default SearchForm
