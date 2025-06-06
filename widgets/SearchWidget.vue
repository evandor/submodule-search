<template>
  <div class="q-gutter-md row items-start fit">
    <q-select
      dense
      rounded
      outlined
      autofocus
      :placeholder="inputPlaceholder()"
      class="fit q-mx-md"
      :model-value="search"
      ref="searchBox"
      hide-dropdown-icon
      @update:model-value="(val) => updateSearch(val)"
      @keydown.enter.prevent="submitSearch()"
      use-input
      :options="options"
      @filter="filterFn">
      <template v-slot:no-option>
        <q-item>
          <q-item-section class="text-grey"> No results </q-item-section>
        </q-item>
        <q-item>
          <q-item-section class="text-grey"> Mark hits in documents </q-item-section>
        </q-item>
      </template>

      <template v-slot:prepend>
        <q-icon v-if="highlight" name="flashlight_on" />
        <q-icon v-else-if="!searchStore.term" name="search" />
        <q-icon v-else name="clear" class="cursor-pointer" size="12px" @click="clearSearch" />
      </template>

      <!--      <template v-slot:append>-->
      <!--        <q-avatar v-if="searchStore.term && route.fullPath === '/sidepanel'">-->
      <!--          <q-icon-->
      <!--            name="o_filter_alt"-->
      <!--            size="18px"-->
      <!--            :color="useUiStore().tabsFilter ? 'red' : 'black'"-->
      <!--            class="cursor-pointer"-->
      <!--            @click="filterNotSearch()" />-->
      <!--          <q-tooltip v-if="useUiStore().tabsFilter" class="tooltip">Click again to remove filter</q-tooltip>-->
      <!--          <q-tooltip v-else class="tooltip">Filter for '{{ searchStore.term }}' instead of searching</q-tooltip>-->
      <!--        </q-avatar>-->
      <!--      </template>-->

      <template v-slot:option="scope">
        <q-item v-bind="scope.itemProps" class="bg-grey-2">
          <q-item-section avatar>
            <q-icon v-if="scope.opt.id === 'highlight'" name="flashlight_on" color="black" />
            <q-icon v-else-if="scope.opt.id.startsWith('tabset|')" name="o_tab" color="black" />
            <q-img v-else :src="scope.opt.favIconUrl" />
          </q-item-section>
          <q-item-section>
            <q-item-label v-if="scope.opt.id === 'highlight'" class="text-subtitle2">highlight in page </q-item-label>
            <q-item-label v-else-if="scope.opt.id.startsWith('tabset|')" class="text-subtitle2">
              {{ tabsetName(scope.opt.id) }}
            </q-item-label>
            <q-item-label v-else class="text-subtitle2">{{ scope.opt.title }}</q-item-label>

            <q-item-label caption class="text-accent">{{ scope.opt.url }}</q-item-label>
            <q-rating
              v-if="scope.opt.id !== 'highlight' && !scope.opt.id.startsWith('tabset|')"
              :model-value="Math.round(scope.opt.score / 18)"
              size="13px"
              color="warning"
              readonly />
          </q-item-section>
        </q-item>
      </template>
    </q-select>
  </div>
</template>

<script lang="ts" setup>
import { SearchIndexQuery } from 'src/core/domain/queries/SearchIndexQuery'
import { useCommandExecutor } from 'src/core/services/CommandExecutor'
import JsUtils from 'src/core/utils/JsUtils'
import { Hit } from 'src/search/models/Hit'
import { useSearchStore } from 'src/search/stores/searchStore'
import NavigationService from 'src/services/NavigationService'
import { useQueryExecutor } from 'src/services/QueryExecutor'
import { SelectTabsetCommand } from 'src/tabsets/commands/SelectTabsetCommand'
import { useTabsetsStore } from 'src/tabsets/stores/tabsetsStore'
import { useUiStore } from 'src/ui/stores/uiStore'
import { ref, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const props = defineProps({
  fromPanel: { type: Boolean, default: false },
  searchTerm: { type: String, default: '' },
  searchHits: { type: Number, required: false },
})

const searchStore = useSearchStore()
const search = ref(props.searchTerm)
const theHits = ref<Hit[]>([])
const moreHits = ref<boolean>(false)
const router = useRouter()
const route = useRoute()
const typedOrSelected = ref<any>()
const searchBox = ref(null)
const highlight = ref<string | undefined>(undefined)

watchEffect(() => {
  console.log('search', search.value)
})

function submitSearch() {
  setTimeout(() => {
    console.log('submitting search', searchStore, typedOrSelected.value)
    if (searchStore.term === '') {
      searchStore.term = typedOrSelected.value
    }
    if (props.fromPanel) {
      if (route.fullPath === '/sidepanel/search') {
        //router.go(0)
      } else {
        router.push('/sidepanel/search')
      }
    } else {
      if (route.path === '/search') {
        runSearch(searchStore.term)
      } else {
        router.push('/search')
      }
    }
  }, 200)
}

const options = ref<Hit[]>([])

const runSearch = (term: string) => {
  if (term && term.trim().length > 2) {
    searchStore.term = term
    useQueryExecutor()
      .queryFromUi(new SearchIndexQuery(term))
      .then((res) => {
        console.log('search res', res)
        theHits.value = res.result.hits
        moreHits.value = res.result.moreHits
      })
  }
}

const filterFn = (val: string, update: any, abort: any) => {
  console.log('filterFn', val)
  search.value = ''
  if (val === '/') {
    //search.value = ""
    return
  }
  runSearch(val)
  highlight.value = undefined
  useUiStore().highlightTerm = undefined

  setTimeout(() => {
    update(() => {
      //options.value = moreHits ? theHits.value.concat(new Hit()) : theHits.value
      let tabsetsAsHit: Hit[] = []
      const tabsets = [...useTabsetsStore().tabsets.values()]
      tabsets.forEach((ts) => {
        if (ts.name.toLowerCase().indexOf(val.toLowerCase()) >= 0) {
          const pseudoHit = new Hit(
            'tabset|' + ts.name,
            //null as unknown as chrome.tabs.Tab,
            '',
            '',
            '',
            0,
            0,
            0,
            [ts.id],
            ts.spaces,
            [],
            '',
            '',
          )
          tabsetsAsHit.push(pseudoHit)
        }
      })
      options.value = tabsetsAsHit
      options.value = options.value.concat(theHits.value)
    })
  }, 100)
}

const updateSearch = (val: any) => {
  if (val === null) {
    search.value = ''
  }
  typedOrSelected.value = val
  console.log('updateSearch', typedOrSelected.value)
  if (val?.chromeTab) {
    searchStore.term = ''
    NavigationService.openOrCreateTab([val.url])
  } else if (val?.id === 'highlight') {
    console.log('setting highlight', val.name)
    highlight.value = val.name
    useUiStore().setHighlightTerm(val.name)
    JsUtils.runCssHighlight()
  } else if (val && val.id?.startsWith('tabset|')) {
    const tsId = val.tabsets[0]
    console.log('got tsid', tsId)
    if (tsId) {
      useCommandExecutor()
        .execute(new SelectTabsetCommand(tsId))
        .then(() => {})
    }
  }
}

const inputPlaceholder = () => {
  if (highlight.value) {
    return highlight.value
  }
  // if (Math.random() < 0.1) {
  //   return "use the key '/' for quick access to search"
  // }
  if (props.searchHits && props.searchHits > 0) {
    return `Found ${props.searchTerm} ${props.searchHits} time(s)`
  }
  return `Search in all tabs and bookmarks`
}

const clearSearch = () => {
  searchStore.term = ''
  typedOrSelected.value = null
}

const tabsetName = (id: string) => id.split('|')[1] || '???'

const filterNotSearch = () => {
  console.log('filtering1', searchStore.term)

  const useValue = searchStore.term && searchStore.term.trim().length > 0 ? searchStore.term.trim() : undefined
  //useUiStore().tabsFilter = useValue
  useUiStore().setHighlightTerm(useValue)
  JsUtils.runCssHighlight()
}
</script>
