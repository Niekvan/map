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
