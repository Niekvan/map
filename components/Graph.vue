<template>
  <svg id="map">
    <rect class="background" width="100%" height="100%" />
    <g class="container">
      <g v-if="world" class="world">
        <path :d="path(world.countries)" class="countries" />
        <path :d="path(world.borders)" class="borders" />
      </g>
      <g class="locations">
        <g v-for="(company, index) in dotCluster" :key="String(index)" :transform="`translate(${company.x}, ${company.y})`" class="item">
          <circle
            :r="company.values ? clusterScale(company.values.length || 1) : 2"
            class="marker"
            :class="setClass(company)"
          />
          <text
            v-if="company.values && company.values.length"
            dy="0.35em"
            :style="textSize(company)"
            class="counter"
          >{{ company.items }}</text>
        </g>
      </g>
    </g>
  </svg>
</template>

<script>
import { mapState } from 'vuex'
import { event as currentEvent } from 'd3-selection' //eslint-disable-line
const topojson = require('topojson')

const d3 = {
  ...require('d3-geo'),
  ...require('d3-selection'),
  ...require('d3-zoom'),
  ...require('d3-collection'),
  ...require('d3-quadtree'),
  ...require('d3-scale'),
  ...require('d3-geo-projection')
}

export default {
  data() {
    return {
      width: 0,
      height: 0,
      gridRange: 40
    }
  },
  computed: {
    byWebsite() {
      return d3
        .nest()
        .key(d => d.website)
        .key(d => d.company)
        .entries(this.cookies)
    },
    dots() {
      return this.cookies.map((cookie, index) => {
        if (cookie.location) {
          const coordinates = this.projection([
            cookie.location.lng,
            cookie.location.lat
          ])
          return {
            ...cookie,
            x: coordinates[0] + 0.0001 * index,
            y: coordinates[1]
          }
        }
        const coordinates = this.projection([
          66.854435 + 0.0001 * index,
          -21.482163
        ])
        return {
          ...cookie,
          x: coordinates[0],
          y: coordinates[1],
          class: 'undefined'
        }
      })
    },
    dotTree() {
      return d3
        .quadtree()
        .x(d => d.x)
        .y(d => d.y)
        .addAll(this.dots)
    },
    dotCluster() {
      const clusterPoints = []
      for (let x = 0; x < this.width; x += this.gridRange) {
        for (let y = 0; y < this.height; y += this.gridRange) {
          const searched = this.search(
            this.dotTree,
            x,
            y,
            x + this.gridRange,
            y + this.gridRange
          )

          const centerPoint = searched.reduce(
            (prev, current) => {
              return { x: prev.x + current.x, y: prev.y + current.y }
            },
            { x: 0, y: 0 }
          )

          const items = searched.length
          centerPoint.items = items
          centerPoint.x = centerPoint.x / searched.length
          centerPoint.y = centerPoint.y / searched.length
          centerPoint.values = searched

          if (centerPoint.x && centerPoint.y) {
            if (centerPoint.values.length === 1) {
              centerPoint.values = centerPoint.values[0]
            }
            clusterPoints.push(centerPoint)
          }
        }
      }
      return clusterPoints
    },
    world() {
      const world = require('~/assets/world.json')
      const countries = topojson.merge(
        world,
        world.objects.countries.geometries
      )
      const borders = topojson.mesh(
        world,
        world.objects.countries,
        (a, b) => a !== b
      )
      // const simpleWorld = topojson.simplify(topojson.presimplify(world), 0.017)
      // const borders = topojson.mesh(simpleWorld, simpleWorld.objects.countries)
      return {
        countries,
        borders
      }
    },
    path() {
      return d3.geoPath().projection(this.projection)
    },
    projection() {
      return d3
        .geoNaturalEarth1()
        .scale((this.height / 290) * 100)
        .translate([this.width / 2, this.height / 2])
    },
    zoom() {
      return d3
        .zoom()
        .scaleExtent([1, 40])
        .translateExtent([[0, 0], [this.width, this.height]])
        .extent([[0, 0], [this.width, this.height]])
        .on('zoom', () => {
          this.container.attr('transform', currentEvent.transform)
        })
    },
    clusterScale() {
      return d3
        .scaleSqrt()
        .domain([
          Math.min(
            ...this.dotCluster.map(
              item => (item.values.length ? item.values.length : 1)
            )
          ),
          Math.max(
            ...this.dotCluster.map(
              item => (item.values.length ? item.values.length : 1)
            )
          )
        ])
        .rangeRound([3, 15])
    },
    svg() {
      return d3.select('#map')
    },
    container() {
      return this.svg.select('g.container')
    },
    ...mapState(['cookies'])
  },
  mounted() {
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.svg.call(this.zoom)
  },
  methods: {
    setClass(node) {
      return [
        node.domainName,
        { privacy: node.values.map(item => !item.country) },
        { undefined: node.key === '' }
      ]
    },
    textSize(node) {
      return { fontSize: this.clusterScale(node.items) / 1.25 + 'px' }
    },
    search(quadtree, x0, y0, x3, y3) {
      const validData = []
      quadtree.visit(function(node, x1, y1, x2, y2) {
        const p = node.data
        if (p) {
          p.selected = p.x >= x0 && p.x < x3 && p.y >= y0 && p.y < y3
          if (p.selected) {
            validData.push(p)
          }
        }
        return x1 >= x3 || y1 >= y3 || x2 < x0 || y2 < y0
      })
      return validData
    }
  }
}
</script>

<style lang="scss" scoped>
#map {
  grid-row: 2 / 3;
  grid-column: 2 / 3;
  width: 100%;
  height: 100%;
  position: relative;

  .background {
    fill: var(--map-border);
  }

  .countries {
    fill: #fefefe;
  }
  .borders {
    fill: none;
    stroke: var(--map-border);
    stroke-width: 0.75;
  }
  .marker {
    fill: var(--marker-background);

    &:hover {
      cursor: pointer;
    }
  }
  .empty {
    fill: var(--marker-empty);
    opacity: 1;
  }
  .privacy {
    fill: var(--marker-privacy);
    opacity: 1;
  }

  .undefined {
    fill: var(--marker-undefined);

    & + .counter {
      fill: var(--blue-dark);
    }
  }

  .counter {
    pointer-events: none;
    text-anchor: middle;
    fill: var(--marker-text);
  }
}
</style>
