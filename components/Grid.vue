<template>
  <g class="grid">
    <rect
      v-for="item in rect"
      :key="item.key"
      :x="item.x"
      :y="item.y"
      :width="item.width"
      :height="item.height"
      :class="item.class"
    />
  </g>
</template>

<script>
export default {
  props: {
    rect: {
      type: Array,
      default() {
        return []
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.grid {
  fill: none;
  stroke: var(--grid-lines);
}
</style>
