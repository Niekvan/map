<template>
  <div class="container">
    <div class="header">
      <span class="header__bar">
        /I Consent
      </span>
      <span class="header__plugin" />
    </div>
    <div class="sidebar">
      <div class="sidebar__header">
        Domains per company
      </div>
      <div class="sibebar__content">
        <ul v-if="detailCluster.length" class="company-list">
          <li v-for="item in detailCluster" :key="item.key" class="company-list__company">
            {{ item.key }}
            <ul v-for="domain in item.values" :key="domain.domainName" class="company-list__domain">
              <li v-for="sub in domain.subs" :key="sub.key" class="company-list__subdomain">
                {{ sub.key }}
              </li>
            </ul>
          </li>
        </ul>
        <ul v-else class="company-list">
          <li class="company-list__company">
            {{ activeNode.values.domainName }}
          </li>
          <li v-for="domain in activeNode.values.subs" :key="`${domain.key}-detail`" class="company-list__subdomain">
            {{ domain.key }}
          </li>
        </ul>
        <!-- <ul class="name-list">
          <li v-for="name in companyNames" :key="name" class="name-list__item" @click="updateDots(name)">
            {{ name }}
          </li>
        </ul> -->
      </div>
    </div>
    <svg id="map">
      <g class="container">
        <g class="world">
          <path v-for="(country, index) in world.features" :key="country.properties.sovereignt + index" :d="path(country)" class="country" :class="country.properties.sovereignt" />
        </g>
        <g class="locations">
          <g v-for="(company, index) in clusterPoints" :key="company.domainName + String(index)" :transform="`translate(${company.x}, ${company.y})`" class="item" @click="showCompany(company)">
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
        <!-- <g class="grid">
          <rect
            v-for="item in rect"
            :key="item.key"
            :x="item.x"
            :y="item.y"
            :width="item.width"
            :height="item.height"
            :class="item.class"
          />
        </g> -->
      </g>
    </svg>
  </div>
</template>

<script>
// import { mapState, mapActions } from 'vuex'
import { event as currentEvent } from 'd3-selection' //eslint-disable-line
const d3 = {
  ...require('d3-geo'),
  ...require('d3-selection'),
  ...require('d3-zoom'),
  ...require('d3-collection'),
  ...require('d3-quadtree'),
  ...require('d3-scale')
}

export default {
  data() {
    return {
      width: 0,
      height: 0,
      geo: null,
      gridRange: 25,
      styles: {
        fontSize: '5px'
      },
      activeNode: null,
      activeCompany: null,
      dots: null
    }
  },
  computed: {
    companies() {
      // return require('~/assets/cookies.json')
      return require('~/assets/opencage-3.json')
        .map(item => {
          const company =
            item.registrantOrganization ||
            item.adminOrganization ||
            item.techOrganization ||
            undefined
          return {
            company,
            ...item
          }
        })
        .map(company => {
          const reg = /(.+)?((Redacted|Not Disclosed|Non-Public Data|none|00000|private data|Statury Masking Enabled|--|Registrant.+:|masked|n\/a|ATTN)(.+)?,?)|Obfuscated whois Gandi-/gi

          const address =
            company.registrantStreet || company.adminStreet || null
          const zipCode =
            company.registrantPostalCode || company.adminPostalCode || null
          const city = company.registrantCity || company.adminCity || null
          const state =
            company.registrantStateProvince ||
            company.adminStateProvince ||
            null
          const rawCountry =
            company.registrantCountry || company.adminCountry || ''
          const country = rawCountry.replace(reg, '')
          const data = [address, zipCode, city, state]
            .filter(Boolean)
            .join(', ')
            .replace(reg, '')
          return { ...company, data, country }
        })
        .map((item, index) => {
          if (item.company === undefined) {
            item.company = 'undefined'
          }
          if (item.location) {
            const coordinates = this.projection([
              item.location.geometry.lng,
              item.location.geometry.lat
            ])
            return {
              ...item,
              x: coordinates[0] + 0.001 * index,
              y: coordinates[1]
            }
          }
          const coordinates = this.projection([
            66.854435 + 0.001 * index,
            -21.482163
          ])
          return {
            ...item,
            x: coordinates[0],
            y: coordinates[1],
            class: 'undefined'
          }
        })
    },
    missing() {
      return this.companies.filter(item => !item.location)
    },
    byCountry() {
      const nest = d3
        .nest()
        .key(item => item.country.toUpperCase())
        .entries(this.companies)

      nest.forEach(item => {
        const centerPoint = item.values.reduce((prev, current) => {
          return {
            x: prev.x + current.x,
            y: prev.y + current.y
          }
        })
        centerPoint.x = centerPoint.x / item.values.length
        centerPoint.y = centerPoint.y / item.values.length
        item.x = centerPoint.x
        item.y = centerPoint.y
        item.items = item.values.length || 1
      })

      return nest
    },
    byCompany() {
      const nest = d3
        .nest()
        .key(d => d.company)
        .entries(this.companies)

      return nest
        .map(company => {
          let items = 0
          let x = 0
          let y = 0
          company.values.forEach(domain => {
            items += domain.subs.length
          })
          const centerPoint = company.values.reduce((prev, current) => {
            return {
              x: prev.x + current.x,
              y: prev.y + current.y
            }
          })
          centerPoint.x = centerPoint.x / company.values.length
          centerPoint.y = centerPoint.y / company.values.length
          x = centerPoint.x
          y = centerPoint.y
          return {
            ...company,
            items,
            x,
            y
          }
        })
        .sort((a, b) => b.items - a.items)
    },
    companyNames() {
      return this.byCompany.map(item => item.key.toLowerCase()).sort()
    },
    detailCluster() {
      if (this.activeNode) {
        const nest = d3
          .nest()
          .key(item => item.company)
          .entries(this.activeNode.values)

        return nest
          .map(company => {
            let items = 0
            company.values.forEach(domain => {
              items += domain.subs.length
            })
            return {
              ...company,
              items
            }
          })
          .sort((a, b) => b.items - a.items)
      } else {
        return this.byCompany
      }
    },
    quadtree() {
      return d3
        .quadtree()
        .x(d => d.x)
        .y(d => d.y)
        .addAll(this.companies)
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
          let items = 0
          searched.forEach(domain => {
            items += domain.subs.length
          })
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
    grid() {
      const grid = []
      for (let x = 0; x < this.width; x += this.gridRange) {
        for (let y = 0; y < this.height; y += this.gridRange) {
          grid.push({
            x: x,
            y: y,
            width: this.gridRange,
            height: this.gridRange,
            class: 'grid',
            key: Math.random()
              .toString(36)
              .replace('0.', '')
          })
        }
      }
      return grid
    },
    rect() {
      return this.nodes(this.quadtree)
    },
    clusterPoints() {
      const clusterPoints = []
      for (let x = 0; x < this.width; x += this.gridRange) {
        for (let y = 0; y < this.height; y += this.gridRange) {
          const searched = this.search(
            this.quadtree,
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

          centerPoint.x = centerPoint.x / searched.length
          centerPoint.y = centerPoint.y / searched.length
          centerPoint.values = searched

          if (centerPoint.x && centerPoint.y) {
            centerPoint.items = centerPoint.values.length
            if (centerPoint.values.length === 1) {
              centerPoint.values = centerPoint.values[0]
            }
            clusterPoints.push(centerPoint)
          }
        }
      }
      return clusterPoints
    },
    clusterScale() {
      return d3
        .scaleSqrt()
        .domain([
          Math.min(
            ...this.clusterPoints.map(
              item => (item.values.length ? item.values.length : 1)
            )
          ),
          Math.max(
            ...this.clusterPoints.map(
              item => (item.values.length ? item.values.length : 1)
            )
          )
        ])
        .rangeRound([3, 15])
    },
    locations() {
      return this.svg
        .select('g.locations')
        .selectAll('.location')
        .data(this.companies)
    },
    path() {
      return d3.geoPath().projection(this.projection)
    },
    projection() {
      return d3
        .geoMercator()
        .scale((this.height / 550) * 100)
        .translate([this.width / 2.5, this.height / 1.75])
    },
    svg() {
      return d3.select('#map')
    },
    container() {
      return this.svg.select('g.container')
    },
    world() {
      return require('~/assets/custom.geo.json')
    },
    zoom() {
      return d3
        .zoom()
        .scaleExtent([1, 40])
        .translateExtent([[0, 0], [this.width, this.height]])
        .extent([[0, 0], [this.width, this.height]])
        .on('zoom', () => {
          this.container.attr('transform', currentEvent.transform)
          // const currentScale = this.projection.scale()
          // const newScale = currentScale - 2 * event.deltaY
          // const currentTrans = this.projection.translate()
          // const coords = this.projection.invert([event.offsetX, event.offsetY])
          // this.projection.scale(newScale)
          // const newPos = this.projection(coords)
          // this.projection.translate([
          //   currentTrans[0] + (event.offsetX - newPos[0]),
          //   currentTrans[1] + (event.offsetY - newPos[1])
          // ])
        })
    }
    // ...mapState(['companies'])
  },
  created() {
    this.dots = this.companies
  },
  mounted() {
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.svg.call(this.zoom)
    // const data = await this.getGeo(this.companies)
    // data[data.length - 1] = data[data.length - 1].data[0]
    // this.geo = data
    // console.log(this.geo) //eslint-disable-line
    // await this.setCompanies()
  },
  methods: {
    // ...mapActions(['setCompanies'])
    async getLocations() {
      const { data } = await this.$axios.$post('/api/locations', {
        location: this.companies[0],
        options: {
          thumbMaps: false
        }
      })
      this.geoLocations = data
    },
    async getUrl(urlData, index, length) {
      if (urlData.data && urlData.data.length) {
        const url = `https://api.opencagedata.com/geocode/v1/json?key=${encodeURIComponent(
          'd82a04c434f54ef5b684025655c7a026'
        )}&q=${encodeURIComponent(
          urlData.data
        )}&countrycode=${encodeURIComponent(
          urlData.country
        )}&language=en&pretty=1&no_annotations=1&no_record=1&limit=1`
        const { results: data } = await this.$axios.$get(url)
        if (!data[0]) {
          const q = this.$store.getters.getCountry(urlData.country)
          if (q) {
            const newUrl = `https://api.opencagedata.com/geocode/v1/json?key=${encodeURIComponent(
              'd82a04c434f54ef5b684025655c7a026'
            )}&q=${encodeURIComponent(q)}&countrycode=${encodeURIComponent(
              urlData.country
            )}&language=en&pretty=1&no_annotations=1&no_record=1&limit=1`
            const { results: newData } = await this.$axios.$get(newUrl)
            data[0] = newData[0]
          }
        }
        return {
          data: [
            {
              ...urlData,
              location: data[0]
            }
          ],
          nextPage: length > index ? index + 1 : null
        }
      } else if (urlData.country && urlData.country.length) {
        const q = this.$store.getters.getCountry(urlData.country)
        const url = `https://api.opencagedata.com/geocode/v1/json?key=${encodeURIComponent(
          'd82a04c434f54ef5b684025655c7a026'
        )}&q=${encodeURIComponent(q)}&countrycode=${encodeURIComponent(
          urlData.country
        )}&language=en&pretty=1&no_annotations=1&no_record=1&limit=1`

        const { results: data } = await this.$axios.$get(url)
        return {
          data: [
            {
              ...urlData,
              location: data[0]
            }
          ],
          nextPage: length > index ? index + 1 : null
        }
      }
      return {
        data: [
          {
            ...urlData,
            location: undefined
          }
        ],
        nextPage: length > index ? index + 1 : null
      }
    },
    async getGeo(data, index = 0) {
      const length = data.length - 1
      console.log(index, (index / length * 100).toFixed(2) + '%') //eslint-disable-line
      const geo = await this.getUrl(data[index], index, length)
      if (geo.nextPage) {
        return geo.data.concat(await this.getGeo(data, geo.nextPage))
      } else {
        return geo
      }
    },
    showCompany(company) {
      console.log(company) //eslint-disable-line
      this.activeNode = this.activeNode === company ? null : company
    },
    setClass(node) {
      return [
        node.domainName
        // { empty: !node.values.data && !node.values.country },
        // { privacy: node.values.country && !node.values.data },
        // { undefined: node.key === '' }
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
    },
    nodes(quadtree) {
      const nodes = []
      quadtree.visit(function(node, x1, y1, x2, y2) {
        nodes.push({
          x: x1,
          y: y1,
          width: x2 - x1,
          height: y2 - y1
        })
      })
      return nodes
    },
    updateDots(company) {
      this.company = this.company === company ? null : company
      if (this.company) {
        this.dots = this.companies.filter(
          item => item.company.toLowerCase() === company
        )
      } else {
        this.dots = this.companies
      }
    }
  }
}
</script>

<style lang="scss" scoped>
::-webkit-scrollbar {
  width: 12px;
}

::-webkit-scrollbar-track {
  background: var(--blue-light);
}

::-webkit-scrollbar-thumb {
  background: var(--blue-dark);
  transition: all 0.3s;

  &:hover {
    background: var(--yellow);
  }
}
.container {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  font-family: 'bennet-text-one', serif;
  background: var(--background);

  display: grid;
  grid-template-rows: 4rem 1fr;
  grid-template-columns: 22% 1fr;
}
.header {
  grid-row: 1 / 2;
  grid-column: 1 / -1;
  height: 4rem;
  display: flex;

  &__bar {
    flex-grow: 1;
    font-size: 3em;
    box-sizing: border-box;
    padding-left: 0.5em;
    padding-top: 0.1em;
  }

  &__plugin {
    width: 4em;
    height: 4em;
    background: var(--violet);
  }
}

.sidebar {
  grid-row: 2 / -1;
  grid-column: 1 / 2;
  height: calc(100vh - 4rem);
  overflow-y: auto;

  &__header {
    font-size: 2rem;
    padding-left: 1rem;
    padding-top: 0.5rem;
  }

  .company-list {
    padding: 0;
    margin: 0;
    list-style-type: none;
    padding: 1rem;

    &__company {
      font-weight: 700;
    }

    &__domain {
      list-style-type: none;
      padding: 0;
      font-weight: normal;
    }

    &__subdomain {
      padding-left: 1rem;
    }
  }

  .name-list {
    &__item {
      list-style-type: none;
      &:hover {
        cursor: pointer;
      }
    }
  }
}

#map {
  grid-row: 2 / 3;
  grid-column: 2 / 3;
  width: 100%;
  height: 100%;
  position: relative;
}
.country {
  fill: var(--map-background);
  stroke: var(--map-border);
  stroke-width: 0.25;
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
}

.grid {
  fill: none;
  stroke: var(--grid-lines);
}
.counter {
  text-anchor: middle;
  fill: var(--cluster-text);
}
</style>
