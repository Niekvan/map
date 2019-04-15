import * as types from './mutation-types'

export const setCompanies = async function({ commit }) {
  commit(types.SET_PENDING, true)
  const raw = require('~/assets/cookies.json').filter(
    item =>
      (item.registrantStreet &&
        item.registrantStateProvince &&
        item.registrantCity) ||
      (item.adminStreet && item.adminStateProvince && item.adminCity)
  )
  const companies = await this.$axios.$post('/api/locations', { domain: raw })
  commit(types.SET_COMPANIES, companies)
  commit(types.SET_PENDING, false)
}

export const nuxtServerInit = async function({ commit, state }, { app }) {
  const cookie = app.$cookies.get('map-identifier')
  if (cookie) {
    commit(types.SET_ID, cookie)
  } else {
    const newId =
      Math.random()
        .toString(36)
        .substr(2, 15) +
      Math.random()
        .toString(36)
        .substr(2, 15)
    app.$cookies.set('map-identifier', newId)
    commit(types.SET_ID, newId)
  }
  const { data } = await app.$axios.$get('http://localhost:8080/api/cookies', {
    headers: {
      'access-token': process.env.LOCAL_API_KEY,
      'map-identifier': state.ID
    }
  })
  data.map(item => {
    if (item.latitude && item.longtitude) {
      item.location = {
        lat: item.latitude,
        lng: item.longtitude
      }
    }
    if (item.country === null) {
      item.country = 'undefined'
    }
    return item
  })
  commit(types.SET_COOKIES, data)
}
