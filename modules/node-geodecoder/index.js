import path from 'path'

export default function geocoder(moduleOptions) {
  const options = Object.assign({}, this.options.geocoder, moduleOptions)

  this.addPlugin({
    src: path.resolve(__dirname, 'plugin.js'),
    options
  })
}
