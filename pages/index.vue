<template>
  <svg id="map" :viewBox="`0, 0, ${width}, ${height}`">
    <g class="world">
      <path v-for="(country, index) in world.features" :key="country.properties.sovereignt + index" :d="path(country)" class="country" :class="country.properties.sovereignt" />
    </g>
    <g class="locations">
      <g v-for="(company, index) in companies" :key="company.domainName + index">
        <circle
          v-if="company.location"
          :cx="projection([company.location.longitude, company.location.latitude])[0]"
          :cy="projection([company.location.longitude, company.location.latitude])[1]"
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
          :class="company.domainName"
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
      height: 430
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
      return require('~/assets/domains.json')
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
  mounted() {
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
</style>
