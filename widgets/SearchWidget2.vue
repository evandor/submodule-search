<template>
  <q-input
    dense
    borderless
    type="search"
    ref="searchInputRef"
    placeholder="Search..."
    class="q-mx-md text-caption"
    style="max-height: 28px"
    v-model="search">
  </q-input>
</template>

<script lang="ts" setup>
import { useSearchStore } from 'src/search/stores/searchStore'
import { onMounted, ref, watchEffect } from 'vue'

const props = defineProps({
  searchTerm: { type: String, default: '' },
  searchHits: { type: Number, required: false },
})

const searchStore = useSearchStore()
const search = ref(props.searchTerm)
const searchInputRef = ref<HTMLInputElement | null>(null)
const highlight = ref<string | undefined>(undefined)

onMounted(() => {
  setTimeout(() => {
    if (searchInputRef.value) {
      searchInputRef.value?.focus()
    }
  }, 500)
})

watchEffect(() => {
  searchStore.term = search.value
})

const inputPlaceholder = () => {
  if (highlight.value) {
    return highlight.value
  }
  if (props.searchHits && props.searchHits > 0) {
    return `Found ${props.searchTerm} ${props.searchHits} time(s)`
  }
  return 'Search all tabs and bookmarks'
}
</script>
