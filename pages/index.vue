<template>
  <svg id="map" :viewBox="`0, 0, ${width}, ${height}`">
    <g class="world">
      <path v-for="(country, index) in world.features" :key="country.properties.sovereignt + index" :d="path(country)" class="country" :class="country.properties.sovereignt" />
    </g>
    <g class="locations">
      <g v-for="(company, index) in companies" :key="company.domainName + String(index)">
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
          :class="company.domainName"
        />
        <circle
          v-else
          :cx="index * 2"
          :cy="height - 5"
          :r="1"
          class="marker"
          :class="[company.domainName, { empty: company.data === '' }]"
        />
      </g>
    </g>
  </svg>
</template>

<script>
// import { mapState, mapActions } from 'vuex'
const d3 = {
  ...require('d3-geo'),
  ...require('d3-selection'),
  ...require('d3-zoom')
}

export default {
  data() {
    return {
      width: 961,
      height: 430,
      geo: null
    }
  },
  computed: {
    // locations() {
    //   const raw = require('~/assets/db.json')
    //   return raw.filter(
    //     item =>
    //       (item.registrantStreet &&
    //         item.registrantStateProvince &&
    //         item.registrantCity) ||
    //       (item.adminStreet && item.adminStateProvince && item.adminCity)
    //   )
    //   // .map(item => {
    //   //   let location = null
    //   //   if (item.registrantStreet) {
    //   //     location = `${item.registrantStreet}, ${item.registrantCity}, ${item.registrantStateProvince}` // eslint-disable-line prettier/prettier
    //   //   } else {
    //   //     location = `${item.adminStreet}, ${item.adminCity}, ${item.adminStateProvince}` // eslint-disable-line prettier/prettier
    //   //   }
    //   //   return location
    //   // })
    // },
    companies() {
      // return require('~/assets/cookies.json')
      return require('~/assets/opencage.json')
    },
    sortedLocation() {
      return (
        this.companies
          // .filter(company => !company.location)
          .map(company => {
            const reg = /.+((Redacted|Not Disclosed|Non-Public Data|none|00000|private data|Statury Masking Enabled|--).+,?)|Obfuscated whois Gandi-/gi

            const address =
              company.registrantStreet || company.adminStreet || null
            const zipCode =
              company.registrantPostalCode || company.adminPostalCode || null
            const city = company.registrantCity || company.adminCity || null
            const state =
              company.registrantStateProvince ||
              company.adminStateProvince ||
              null
            const country =
              company.registrantCountry || company.adminCountry || null
            const data = [address, zipCode, city, state, country]
              .filter(Boolean)
              .join(', ')
              .replace(reg, '')
            return { ...company, data, country }
          })
        // .filter(company => {
        //   const reg = /.+(Redacted|Not Disclosed|Obfuscated whois Gandi-|Non-Public Data|(N|n)one|00000|(P|p)rivate (D|d)ata|Statury Masking Enabled|--).+,?/gi
        //   company = company.data.replace(reg, '')
        //   return company
        // })
      )
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
      return d3.geoMercator()
    },
    svg() {
      return d3.select('#map').call(this.zoom)
    },
    world() {
      return require('~/assets/custom.geo.json')
    },
    zoom() {
      return d3.zoom().on('zoom', function() {
        this.svg.attr('transform', () => {
          return d3.event.transform
        })
      })
    }
    // ...mapState(['companies'])
  },
  async mounted() {
    // const data = await this.getGeo(this.sortedLocation)
    // data[data.length - 1] = data[data.length - 1].data[0]
    // this.geo = data
    // console.log(this.geo) //eslint-disable-line
    // this.width = window.innerWidth - 1
    // this.height = window.innerHeight - 5
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
      if (urlData.data) {
        const url = `https://api.opencagedata.com/geocode/v1/json?key=${encodeURIComponent(
          'd82a04c434f54ef5b684025655c7a026'
        )}&q=${encodeURIComponent(
          urlData.data
        )}&countrycode=${encodeURIComponent(
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
    }
  }
}
</script>

<style>
#map {
  width: 100vw;
}
.country {
  fill: #faad61b3;
  stroke: white;
  stroke-width: 0.25;
}
.marker {
  fill: #eb5324;
}
.empty {
  fill: black;
  transform: translateY(2px);
}
</style>
