export const getCountry = state => countryCode => {
  if (state.isoCountries.hasOwnProperty(countryCode)) {
    return state.isoCountries[countryCode]
  } else {
    return null
  }
}
