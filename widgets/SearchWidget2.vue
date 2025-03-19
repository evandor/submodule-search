<template>
  <q-input
    filled
    type="search"
    ref="searchInputRef"
    placeholder="Filter (for search press enter)"
    class="darkInDarkMode brightInBrightMode q-mx-xs q-mt-xs q-mb-none text-caption k-mini-input"
    @keyup.enter="emits('onEnter')"
    clearable
    v-model="search">
    <template v-slot:prepend>
      <q-icon name="search" size="sm" />
    </template>
    <template v-slot:append>
      <span class="text-caption">{{ searchKeyboardShortcut }}</span>
    </template>
  </q-input>
</template>

<script lang="ts" setup>
import { useQuasar } from 'quasar'
import { useSearchStore } from 'src/search/stores/searchStore'
import { onMounted, ref, watchEffect } from 'vue'

type Props = {
  searchTerm: string
  searchHits?: number
}

const props = withDefaults(defineProps<Props>(), {
  searchTerm: '',
  placeholder: 'Search...',
})

const emits = defineEmits(['onEnter', 'onTermChanged'])

const $q = useQuasar()

const searchStore = useSearchStore()
const search = ref(props.searchTerm)
const searchInputRef = ref<HTMLInputElement | null>(null)
const searchKeyboardShortcut = ref<string | undefined>(undefined)

onMounted(() => {
  setTimeout(() => {
    if (searchInputRef.value) {
      searchInputRef.value?.focus()
    }
  }, 500)
})

watchEffect(() => {
  searchStore.term = search.value
  emits('onTermChanged', { term: search.value })
})

if (chrome && chrome.commands) {
  chrome.commands.getAll().then((cs: chrome.commands.Command[]) => {
    const searchCommand = cs.filter((c: chrome.commands.Command) => c.name === 'search').shift()
    if (searchCommand) {
      searchKeyboardShortcut.value = searchCommand.shortcut
    }
  })
}

if ($q.platform.is.chrome && $q.platform.is.bex) {
  chrome.commands.onCommand.addListener((command) => {
    if (command === 'search') {
      console.debug(`got Command: ${command}`)
      searchInputRef.value!.focus()
    }
  })
}
</script>

<!-- https://stackoverflow.com/questions/78573433/quasar-how-i-can-change-the-height-of-q-select -->
<style>
.k-mini-input .q-field__control,
.k-mini-input .q-field__inner,
.k-mini-input .q-field__marginal,
.k-mini-input .q-field__control input {
  height: 28px !important;
  min-height: 28px !important;
}

.k-mini-input .q-field__control,
.k-mini-input .q-field__native {
  padding: 0 4px;
}

.k-mini-input .q-field__inner {
  min-height: 28px;
}

.k-mini-input .q-field__native {
  min-height: 28px !important;
}
</style>
