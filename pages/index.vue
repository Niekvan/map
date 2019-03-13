<template>
  <div class="container">
    <svg id="map">
      <g class="container">
        <g class="world">
          <path v-for="(country, index) in world.features" :key="country.properties.sovereignt + index" :d="path(country)" class="country" :class="country.properties.sovereignt" />
        </g>
        <g class="locations">
          <g v-for="(company, index) in sortedLocation" :key="company.domainName + String(index)">
            <!-- <circle
              v-if="company.location"
              :cx="projection([company.location.longitude, company.location.latitude])[0]"
              :cy="projection([company.location.longitude, company.location.latitude])[1]"
              :r="1"
              class="marker"
              :class="company.domainName"
            /> -->
            <circle
              v-if="company.location"
              :cx="projection([company.location.geometry.lng, company.location.geometry.lat])[0]"
              :cy="projection([company.location.geometry.lng, company.location.geometry.lat])[1]"
              :r="1"
              class="marker"
              :class="setClasss(company)"
              @click="showCompany(company)"
            />
            <circle
              v-else
              :cx="index * 2"
              :cy="height - 5"
              :r="1"
              class="marker"
              :class="setClasss(company)"
              @click="showCompany(company)"
            />
            <!-- <text
              v-if="company.location"
              :x="projection([company.location.geometry.lng, company.location.geometry.lat])[0] + 2"
              :y="projection([company.location.geometry.lng, company.location.geometry.lat])[1] + 1"
              class="text"
            >
              {{ company.company }}
            </text> -->
          </g>
        </g>
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
  ...require('d3-collection')
}

export default {
  data() {
    return {
      width: 0,
      height: 0,
      geo: null
    }
  },
  computed: {
    companies() {
      // return require('~/assets/cookies.json')
      return require('~/assets/opencage-3.json').map(item => {
        const company =
          item.registrantOrganization ||
          item.adminOrganization ||
          item.techOrganization
        return {
          company,
          ...item
        }
      })
    },
    sortedLocation() {
      return this.companies.map(company => {
        const reg = /(.+)?((Redacted|Not Disclosed|Non-Public Data|none|00000|private data|Statury Masking Enabled|--|Registrant.+:|masked|n\/a|ATTN)(.+)?,?)|Obfuscated whois Gandi-/gi

        const address = company.registrantStreet || company.adminStreet || null
        const zipCode =
          company.registrantPostalCode || company.adminPostalCode || null
        const city = company.registrantCity || company.adminCity || null
        const state =
          company.registrantStateProvince || company.adminStateProvince || null
        const rawCountry =
          company.registrantCountry || company.adminCountry || ''
        const country = rawCountry.replace(reg, '')
        const data = [address, zipCode, city, state]
          .filter(Boolean)
          .join(', ')
          .replace(reg, '')
        return { ...company, data, country }
      })
    },
    missing() {
      return this.companies.filter(item => !item.location)
    },
    countryLevel() {
      return this.sortedLocation.filter(
        item => item.country && !item.data && item.location
      )
    },
    locations() {
      return this.svg
        .select('g.locations')
        .selectAll('.location')
        .data(this.companies)
    },
    names() {
      return d3
        .nest()
        .key(d => d.company)
        .entries(this.companies)
    },
    path() {
      return d3.geoPath().projection(this.projection)
    },
    projection() {
      return d3
        .geoMercator()
        .scale((this.width / 640) * 100)
        .translate([this.width / 2, this.height / 2])
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
          // console.log(currentEvent) //eslint-disable-line
          this.container.attr('transform', currentEvent.transform)
          // d3.selectAll('circle.marker').attr(
          //   'r',
          //   1 / (currentEvent.transform.k / 2)
          // )
        })
    }
    // ...mapState(['companies'])
  },
  mounted() {
    this.width = window.innerWidth
    this.height = this.width / 2
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
    },
    setClasss(node) {
      return [
        node.domainName,
        { empty: !node.data && !node.country },
        { privacy: node.country && !node.data }
      ]
    }
  }
}
</script>

<style scoped>
.container {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  background: var(--background);
}
#map {
  width: 100%;
  height: 100%;
}
.country {
  fill: var(--map-background);
  stroke: var(--map-border);
  stroke-width: 0.25;
}
.marker {
  fill: var(--marker-background);
  opacity: 0.1;
}
.empty {
  fill: var(--marker-empty);
  transform: translateY(2px);
  opacity: 1;
}
.privacy {
  fill: var(--marker-privacy);
  opacity: 1;
}

.text {
  font-size: 0.25rem;
}
</style>
