<template>
  <section class="stack">
    <stack :data="cookies" />
  </section>
</template>

<script>
import { mapState } from 'vuex'
import Stack from '@/components/Stack.vue'
export default {
  components: {
    Stack
  },
  computed: {
    ...mapState(['cookies'])
  }
}
</script>

<style lang="scss" scoped>
</style>
