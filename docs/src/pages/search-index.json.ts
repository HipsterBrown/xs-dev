export async function get() {
  const pagesMeta = import.meta.glob('./en/**/*.md')
  const pages = await Promise.all(
    Object.values(pagesMeta).map(async (getInfo) => {
      const { rawContent, url, frontmatter } = await getInfo()
      return {
        content: rawContent(),
        url,
        ...frontmatter,
      }
    })
  )
  const json = JSON.stringify(pages)

  return {
    body: json,
  }
}
