import Fuse, { FuseIndex } from 'fuse.js'
import { defineStore } from 'pinia'
import { uid } from 'quasar'
import { SearchDoc } from 'src/search/models/SearchDoc'
import { ref } from 'vue'

function overwrite(ident: string, doc: SearchDoc, removed: SearchDoc[]) {
  if (!doc[ident as keyof object]) {
    doc[ident as keyof object] = removed[0]![ident as keyof object]
  }
}

/**
 * A pinia store backed by a search engine index (fuse) based on URLs and document types
 *
 * The model for the documents is a SearchDoc with its url and a type as its identity fields.
 */
export const useSearchStore = defineStore('search', () => {
  const term = ref<string>('')

  const searchIndex = ref<FuseIndex<any>>(null as unknown as any)

  const fuse = ref(null as unknown as Fuse<SearchDoc>)

  const stats = ref<Map<string, number>>(new Map())

  const options = ref({
    keys: [
      { name: 'name', weight: 10 },
      { name: 'title', weight: 8 },
      { name: 'tags', weight: 7 },
      { name: 'url', weight: 4 },
      { name: 'description', weight: 3 },
      { name: 'keywords', weight: 2 },
      { name: 'content', weight: 1 },
      { name: 'note', weight: 10 },
    ],
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 3,
    threshold: 0.0,
    // ignoreFieldNorm: true
    ignoreLocation: true,
    useExtendedSearch: true,
  })

  async function init() {
    // console.debug(' ...(re-)initializing searchStore')
    searchIndex.value = Fuse.createIndex(options.value.keys, [])
    fuse.value = new Fuse([], options.value, searchIndex.value)
  }

  // @ts-expect-error TODO
  function getIndex(): Fuse.FuseIndex<SearchDoc> {
    return fuse.value ? fuse.value.getIndex() : null
  }

  function search(term: string, limit: number | undefined = undefined) {
    if (limit) {
      return fuse.value.search(term, { limit })
    }
    return fuse.value ? fuse.value.search(term) : []
  }

  function remove(f: any) {
    fuse.value.remove(f)
  }

  function addObjectToIndex(o: Object) {
    const parsed = JSON.parse(JSON.stringify(o))
    const doc: SearchDoc = Object.assign(new SearchDoc(uid(), '', '', '', '', '', '', '', [], '', ''), parsed)
    if (!doc.url) {
      throw new Error('object to be added to search index does not have an URL field set.')
    }
    return addSearchDocToIndex(doc)
  }

  function upsertObject(o: Object) {
    const parsed = JSON.parse(JSON.stringify(o))
    const doc: SearchDoc = Object.assign(new SearchDoc(uid(), '', '', '', '', '', '', '', [], '', ''), parsed)
    if (!doc.url) {
      throw new Error('object to be added to search index does not have an URL field set.')
    }

    const removed = fuse.value.remove((d: any) => {
      return d.url === doc.url
    })
    if (removed && removed[0]) {
      overwrite('name', doc, removed)
      overwrite('description', doc, removed)
      overwrite('keywords', doc, removed)
      overwrite('content', doc, removed)
      overwrite('tags', doc, removed)
    }
    fuse.value.add(doc)
    return addSearchDocToIndex(doc)
  }

  /**
   * replace when url matches
   */
  function addSearchDocToIndex(doc: SearchDoc) {
    const removed = fuse.value?.remove((d: any) => {
      return d.url === doc.url
    })
    if (removed && removed[0]) {
      overwrite('name', doc, removed)
      overwrite('description', doc, removed)
      overwrite('keywords', doc, removed)
      overwrite('content', doc, removed)
      overwrite('tags', doc, removed)
    }
    fuse.value?.add(doc)
  }

  function update(url: string, key: string, value: string) {
    if (!fuse || !fuse.value) {
      return // called too early?
    }
    const removed: SearchDoc[] = fuse.value.remove((doc: SearchDoc) => doc.url === url)
    console.debug('found removed: ', removed)
    if (removed && removed.length > 0) {
      let newDoc: SearchDoc = removed[0]!
      switch (key) {
        case 'name':
          newDoc.name = value
          break
        case 'note':
          newDoc.note = value
          break
        case 'description':
          newDoc.description = value
          break
        case 'keywords':
          newDoc.keywords = value
          break
        case 'tags':
          newDoc.tags = value
          break
        default:
          console.log('could not update', key)
      }
      console.debug('adding new doc', newDoc)
      fuse.value.add(newDoc)
    }
  }

  // function reindexTabset(tabsetId: string) {
  //   const ts = useTabsetsStore().getTabset(tabsetId)
  //   const values: Tabset[] = ts ? [ts] : []
  //   reindex(values)
  // }

  // async function reindexTab(tab: Tab): Promise<number> {
  //   const window = await chrome.windows.create({focused: true, width: 1024, height: 800})
  //   // @ts-expect-error TODO
  //   if (window) {
  //     // @ts-expect-error TODO
  //     useWindowsStore().screenshotWindow = window.id
  //     // @ts-expect-error TODO
  //     let tabToClose = await chrome.tabs.create({windowId: window.id, url: tab.url})
  //     // @ts-expect-error TODO
  //     if (tabToClose) {
  //       // @ts-expect-error TODO
  //       const promise = dummyPromise(3000, tabToClose.id)
  //       return promise.then((res) => {
  //         return window.id || 0
  //       })
  //     }
  //     return Promise.reject("could not get tab")
  //   }
  //   return Promise.reject("could not get window")
  //
  // }

  // deprecated
  // async function populateFromTabsets() {
  //   // --- add data from tabs directly, like url and title
  //   console.debug(" ...populating search index from tabsets")
  //   const minimalIndex: SearchDoc[] = []
  //   //const res = fuse.value.remove((doc) => true)
  //   _.forEach([...useTabsetsStore().tabsets.values()] as Tabset[], (tabset: Tabset) => {
  //       tabset.tabs.forEach((tab: Tab) => {
  //         if (tab.url) {
  //           if (urlSet.has(tab.url)) {
  //             const existingDocIndex = _.findIndex(minimalIndex, (d: any) => {
  //               return d.url === tab.title
  //             })
  //             if (existingDocIndex >= 0) {
  //               const existingDoc = minimalIndex[existingDocIndex]
  //               if (existingDoc.tabsets.indexOf(tabset.id) < 0) {
  //                 existingDoc.tabsets = existingDoc.tabsets.concat([tabset.id])
  //                 minimalIndex.splice(existingDocIndex, 1, existingDoc)
  //               }
  //             } else {
  //               const doc = new SearchDoc(uid(), tab.name || '', tab.title || '', tab.url, "", "", "", [tabset.id], '', "")
  //               minimalIndex.push(doc)
  //             }
  //           } else {
  //             const doc = new SearchDoc(uid(), tab.name || '', tab.title || '', tab.url, "", "", "", [tabset.id], '', "")
  //             minimalIndex.push(doc)
  //             urlSet.add(tab.url)
  //           }
  //         }
  //       })
  //     }
  //   )
  //
  //   console.debug(` ...populating search index from tabsets with ${minimalIndex.length} entries`)
  //   minimalIndex.forEach((doc: SearchDoc) => {
  //     const removed = fuse.value.remove((d: any) => {
  //       return d.url === doc.url
  //     })
  //     if (removed && removed[0]) {
  //       overwrite('name', doc, removed)
  //       overwrite('description', doc, removed)
  //       overwrite('keywords', doc, removed)
  //       overwrite('content', doc, removed)
  //
  //     }
  //     fuse.value.add(doc)
  //   })
  // }

  // async function populateFromBookmarks() {
  //   // --- add data from bookmarks directly, like url and title
  //   console.debug(" ...populating search index from bookmarks")
  //   const indexFromBookmarks: SearchDoc[] = []
  //   _.forEach(useBookmarksStore().bookmarksLeaves, (bookmark: any) => {
  //       if (bookmark && bookmark.url && !urlSet.has(bookmark.url)) {
  //         urlSet.add(bookmark.url)
  //         const doc = new SearchDoc("", "", bookmark.title || '', bookmark.url, "", "", "", [], bookmark.id, "")
  //         indexFromBookmarks.push(doc)
  //       }
  //     }
  //   )
  //   console.log(` ...populating search index from bookmarks with ${indexFromBookmarks.length} entries`)
  //   indexFromBookmarks.forEach((doc: SearchDoc) => fuse.value.add(doc))
  // }

  /**
   * Initial population of search index when the extension is reloaded (and when run the first time)
   */
  // async function populateFromContent(contentItems: object[]) {
  //   console.debug(" ...populating search index from content", contentItems)
  //   // --- add data from stored content
  //   let count = 0
  //   let countFiltered = 0
  //   let overwritten = 0
  //   // .then(content => {
  //   contentItems.forEach((c: object) => {
  //     if (c.expires === 0 || urlExistsInATabset(c.url)) {
  //       const searchDoc = new SearchDoc(c.id, '', c.title, c.url, c.metas['description'] || '',
  //         '', c.content, c.tabsetIds, '', '')
  //       // if (c.metas && c.metas['description']) {
  //       //   searchDoc.description = c.metas['description']
  //       // }
  //       // if (c.metas && c.metas['keywords']) {
  //       //   searchDoc.keywords = c.metas['keywords']
  //       // }
  //       const removed = fuse.value.remove((doc: any) => {
  //         return doc.url === searchDoc.url
  //       })
  //       overwritten += removed.length
  //       fuse.value.add(searchDoc)
  //       urlSet.add(c.url)
  //       count++
  //     } else {
  //       countFiltered++
  //     }
  //   })
  //   console.debug(` ...populating search index from content with ${count} entries (${overwritten} of which overwritten), ${countFiltered} is/are filtered (not in any tab)`)
  //   stats.value.set("content.count", count)
  //   stats.value.set("content.overwritten", overwritten)
  //   stats.value.set("content.filtered", countFiltered)
  //
  // }

  // function indexTabs(tsId: string, tabs: Tab[]) {
  //   const minimalIndex: SearchDoc[] = []
  //   const urlSet: Set<string> = new Set()
  //   tabs.forEach((tab: Tab) => {
  //     if (tab.url) {
  //       if (!urlSet.has(tab.url)) {
  //         const doc = new SearchDoc("", "", tab.title || '', tab.url, "", "", "", [tsId], '', "")
  //         minimalIndex.push(doc)
  //         urlSet.add(tab.url)
  //       }
  //     }
  //   })
  //   if (fuse.value) {
  //     minimalIndex.forEach((doc: SearchDoc) => fuse.value.add(doc))
  //   }
  // }

  return {
    init,
    //   populateFromContent,
    getIndex,
    // addToIndex,
    remove,
    term,
    search,
    update,
    //reindexTabset,
    //reindexTab,
    stats,
    addObjectToIndex,
    upsertObject,
  }
})
