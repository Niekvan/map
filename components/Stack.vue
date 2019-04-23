<template>
  <div class="stack__wrapper">
    <!-- <ul class="stack__list">
      <li v-for="datum in data" :key="`${datum.cookie}${datum.value}`" class="stack__item">
        {{ datum.value }}
      </li>
    </ul> -->
    <div ref="rendererContainer" class="stack__render" />
  </div>
</template>

<script>
import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  Geometry,
  BufferGeometry,
  BufferAttribute,
  Vector3,
  ShaderMaterial,
  Color,
  TextureLoader,
  Points,
  AxesHelper,
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
  Face3
} from 'three'
export default {
  props: {
    data: {
      type: Array,
      default() {
        return []
      }
    }
  },
  data() {
    return {
      renderer: null,
      scene: new Scene(),
      camera: null,
      width: null,
      height: null,
      plane: null
    }
  },
  computed: {
    vertexShader() {
      return `
        attribute float size;
        attribute vec3 customColor;
        varying vec3 vColor;
        void main() {
          vColor = customColor;
          vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
          gl_PointSize = size * ( 300.0 / -mvPosition.z );
          gl_Position = projectionMatrix * mvPosition;
        }
      `
    },
    fragmentShader() {
      return `
        uniform vec3 color;
        uniform sampler2D texture;
        varying vec3 vColor;
        void main() {
          gl_FragColor = vec4( color * vColor, 1.0 );
          gl_FragColor = gl_FragColor * texture2D( texture, gl_PointCoord );
          if ( gl_FragColor.a < ALPHATEST ) discard;
        }
      `
    }
  },
  mounted() {
    this.init()
    this.animate()
    window.addEventListener('resize', this.handleResize)
  },
  methods: {
    init() {
      this.width = this.$refs.rendererContainer.clientWidth
      this.height = this.$refs.rendererContainer.clientHeight

      this.renderer = new WebGLRenderer({ antialiased: true, alpha: true })
      this.renderer.setSize(this.width, this.height)
      this.renderer.setClearColor(0x000000, 0)
      this.renderer.setPixelRatio(window.devicePixelRatio)
      this.$refs.rendererContainer.appendChild(this.renderer.domElement)

      this.camera = new PerspectiveCamera(
        100,
        this.width / this.height,
        0.1,
        3000
      )
      this.camera.position.z = 160
      this.camera.position.x = 0
      this.camera.position.y = 90
      this.camera.lookAt(0, 0, 0)

      const positions = new Float32Array(this.data.length * 3)
      const colors = new Float32Array(this.data.length * 3)
      const sizes = new Float32Array(this.data.length)
      const color = new Color()

      const width = 125
      const space = 20

      this.data.forEach((cookie, index) => {
        let y = Math.floor(Math.random() * space * 7)
        y = y % space ? Math.floor(y / space) * space : y
        const z = Math.floor(Math.random() * width) - width / 2
        const x = Math.floor(Math.random() * width) - width / 2
        const vertex = new Vector3(x, y, z)
        vertex.toArray(positions, index * 3)

        color.setHex(0x2619d1)
        color.toArray(colors, index * 3)
        sizes[index] = 2
      })

      const geometry = new BufferGeometry()
      geometry.addAttribute('position', new BufferAttribute(positions, 3))
      geometry.addAttribute('size', new BufferAttribute(sizes, 1))
      geometry.addAttribute('customColor', new BufferAttribute(colors, 3))
      geometry.computeBoundingSphere()

      // const material = new PointsMaterial({ color: 0x0000ff })

      const material = new ShaderMaterial({
        uniforms: {
          color: { value: new Color(0xffffff) },
          texture: {
            value: new TextureLoader().load(require(`~/assets/img/disc.png`))
          }
        },
        vertexShader: this.vertexShader,
        fragmentShader: this.fragmentShader,
        alphaTest: 0.9
      })

      const points = new Points(geometry, material)
      /* eslint-disable */
      const plane = new Geometry()
      plane.vertices.push(
        new Vector3(0, 0, 0),
        new Vector3(0, 0, 15),
        new Vector3(15, 0, 0),
        new Vector3(15, 0, 15),

        new Vector3(0, 2, 0),
        new Vector3(0, 2, 15),
        new Vector3(15, 2, 0),
        new Vector3(15, 2, 15),

        new Vector3(0, 4, 0),
        new Vector3(0, 4, 15),
        new Vector3(15, 4, 0),
        new Vector3(15, 4, 15),

        new Vector3(0, 6, 0),
        new Vector3(0, 6, 15),
        new Vector3(15, 6, 0),
        new Vector3(15, 6, 15),

        new Vector3(0, 8, 0),
        new Vector3(0, 8, 15),
        new Vector3(15, 8, 0),
        new Vector3(15, 8, 15),

        new Vector3(0, 10, 0),
        new Vector3(0, 10, 15),
        new Vector3(15, 10, 0),
        new Vector3(15, 10, 15),

        new Vector3(0, 12, 0),
        new Vector3(0, 12, 15),
        new Vector3(15, 12, 0),
        new Vector3(15, 12, 15)
      )

      plane.faces.push(
        new Face3(0, 1, 2),
        new Face3(1, 2, 3),

        new Face3(4, 5, 6),
        new Face3(5, 6, 7),

        new Face3(8, 9, 10),
        new Face3(9, 10, 11),

        new Face3(12, 13, 14),
        new Face3(13, 14, 15),

        new Face3(16, 17, 18),
        new Face3(17, 18, 19),

        new Face3(20, 21, 22),
        new Face3(21, 22, 23),

        new Face3(24, 25, 26),
        new Face3(25, 26, 27)
      )

      const outline = new EdgesGeometry(plane)
      const mat = new LineBasicMaterial({ color: 0x000000, linewidth: 1 })
      const rect = new LineSegments(outline, mat)

      this.scene.add(points)
      this.scene.add(new AxesHelper(20))
      // this.scene.add(rect)

      this.renderer.render(this.scene, this.camera)
    },
    animate() {
      requestAnimationFrame(this.animate)
      this.scene.rotation.y += 0.0025
      this.renderer.render(this.scene, this.camera)
    },
    handleResize() {
      this.width = window.innerWidth
      this.height = window.innerHeight
      this.camera.aspect = this.width / this.height
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(this.width, this.height)
    }
  }
}
</script>

<style lang="scss" scoped>
.stack {
  &__render {
    box-sizing: border-box;
    width: 100%;
    height: 100vh;
  }
}
</style>
