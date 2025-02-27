<template>
  <q-input
    dense
    borderless
    type="search"
    ref="searchInputRef"
    :placeholder="props.placeholder"
    class="q-mx-md text-caption"
    style="max-height: 28px"
    @keyup.enter="emits('onEnter')"
    v-model="search">
  </q-input>
</template>

<script lang="ts" setup>
import { useSearchStore } from 'src/search/stores/searchStore'
import { onMounted, ref, watchEffect } from 'vue'

type Props = {
  searchTerm: string
  searchHits?: number
  placeholder: string | undefined
}

const props = withDefaults(defineProps<Props>(), {
  searchTerm: '',
  placeholder: 'Search...',
})

const emits = defineEmits(['onEnter'])

const searchStore = useSearchStore()
const search = ref(props.searchTerm)
const searchInputRef = ref<HTMLInputElement | null>(null)

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
</script>
